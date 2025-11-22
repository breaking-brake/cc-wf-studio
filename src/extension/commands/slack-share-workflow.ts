/**
 * Slack Share Workflow Command Handler
 *
 * Handles SHARE_WORKFLOW_TO_SLACK messages from Webview.
 * Implements workflow sharing with sensitive data detection and warning flow.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import type * as vscode from 'vscode';
import type { ShareWorkflowToSlackPayload, Workflow } from '../../shared/types/messages';
import { log } from '../extension';
import type { FileService } from '../services/file-service';
import type { SlackApiService } from '../services/slack-api-service';
import type {
  SensitiveDataWarningEvent,
  ShareWorkflowFailedEvent,
  ShareWorkflowSuccessEvent,
} from '../types/slack-messages';
import { detectSensitiveData } from '../utils/sensitive-data-detector';
import { handleSlackError } from '../utils/slack-error-handler';
import type { WorkflowMessageBlock } from '../utils/slack-message-builder';

/**
 * Handle workflow sharing to Slack
 *
 * @param payload - Share workflow request
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param fileService - File service instance
 * @param slackApiService - Slack API service instance
 */
export async function handleShareWorkflowToSlack(
  payload: ShareWorkflowToSlackPayload,
  webview: vscode.Webview,
  requestId: string,
  fileService: FileService,
  slackApiService: SlackApiService
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'Slack workflow sharing started', {
    requestId,
    workflowId: payload.workflowId,
    channelId: payload.channelId,
  });

  try {
    // Step 1: Load workflow file
    const filePath = fileService.getWorkflowFilePath(payload.workflowId);
    const exists = await fileService.fileExists(filePath);

    if (!exists) {
      log('ERROR', 'Workflow file not found', { requestId, workflowId: payload.workflowId });
      sendShareFailed(
        webview,
        requestId,
        payload.workflowId,
        'UNKNOWN_ERROR',
        `Workflow "${payload.workflowId}" not found`
      );
      return;
    }

    // Step 2: Read and parse workflow file
    const workflowContent = await fileService.readFile(filePath);
    let workflow: Workflow;

    try {
      workflow = JSON.parse(workflowContent);
    } catch (parseError) {
      log('ERROR', 'Failed to parse workflow JSON', { requestId, error: parseError });
      sendShareFailed(
        webview,
        requestId,
        payload.workflowId,
        'UNKNOWN_ERROR',
        'Invalid workflow file format'
      );
      return;
    }

    // Step 3: Detect sensitive data (if not overriding warning)
    if (!payload.overrideSensitiveWarning) {
      const findings = detectSensitiveData(workflowContent);

      if (findings.length > 0) {
        log('WARN', 'Sensitive data detected in workflow', {
          requestId,
          findingsCount: findings.length,
          types: findings.map((f) => f.type),
        });

        // Send warning to user
        const warningEvent: SensitiveDataWarningEvent = {
          type: 'SENSITIVE_DATA_WARNING',
          payload: {
            workflowId: payload.workflowId,
            findings,
          },
        };

        webview.postMessage({
          ...warningEvent,
          requestId,
        });

        log('INFO', 'Sensitive data warning sent to user', { requestId });
        return; // Stop here, wait for user confirmation
      }
    }

    log('INFO', 'No sensitive data detected or warning overridden', { requestId });

    // Step 4: Extract workflow metadata
    const authorName = workflow.metadata?.author || 'Unknown';
    const nodeCount = workflow.nodes.length;
    const createdAt =
      typeof workflow.createdAt === 'string'
        ? workflow.createdAt
        : new Date(workflow.createdAt).toISOString();

    // Step 5: Upload workflow file to Slack
    log('INFO', 'Uploading workflow file to Slack', { requestId });

    const filename = `${payload.workflowName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    const uploadResult = await slackApiService.uploadWorkflowFile({
      content: workflowContent,
      filename,
      title: payload.workflowName,
      channelId: payload.channelId,
      initialComment: payload.description,
    });

    log('INFO', 'Workflow file uploaded successfully', {
      requestId,
      fileId: uploadResult.fileId,
    });

    // Step 6: Post rich message card to channel
    log('INFO', 'Posting workflow message card to Slack', { requestId });

    const messageBlock: WorkflowMessageBlock = {
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      authorName,
      nodeCount,
      createdAt,
      fileId: uploadResult.fileId,
    };

    const messageResult = await slackApiService.postWorkflowMessage(
      payload.channelId,
      messageBlock
    );

    log('INFO', 'Workflow message card posted successfully', {
      requestId,
      messageTs: messageResult.messageTs,
      permalink: messageResult.permalink,
    });

    // Step 7: Send success response
    const successEvent: ShareWorkflowSuccessEvent = {
      type: 'SHARE_WORKFLOW_SUCCESS',
      payload: {
        workflowId: payload.workflowId,
        channelId: payload.channelId,
        channelName: '', // TODO: Resolve channel name from channelId
        messageTs: messageResult.messageTs,
        fileId: uploadResult.fileId,
        permalink: messageResult.permalink,
      },
    };

    webview.postMessage({
      ...successEvent,
      requestId,
    });

    log('INFO', 'Workflow sharing completed successfully', {
      requestId,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorInfo = handleSlackError(error);

    log('ERROR', 'Workflow sharing failed', {
      requestId,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
      executionTimeMs: Date.now() - startTime,
    });

    sendShareFailed(webview, requestId, payload.workflowId, errorInfo.code, errorInfo.message);
  }
}

/**
 * Send share workflow failed event to Webview
 */
function sendShareFailed(
  webview: vscode.Webview,
  requestId: string,
  workflowId: string,
  errorCode: string,
  errorMessage: string
): void {
  const failedEvent: ShareWorkflowFailedEvent = {
    type: 'SHARE_WORKFLOW_FAILED',
    payload: {
      workflowId,
      errorCode: errorCode as ShareWorkflowFailedEvent['payload']['errorCode'],
      errorMessage,
    },
  };

  webview.postMessage({
    ...failedEvent,
    requestId,
  });
}
