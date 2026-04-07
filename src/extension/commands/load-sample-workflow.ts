/**
 * Claude Code Workflow Studio - Load Sample Workflow Command
 *
 * Lists available sample workflows and loads a specific sample workflow
 * from the resources/samples/ directory bundled with the extension.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import type {
  SampleWorkflowListPayload,
  SampleWorkflowLoadedPayload,
} from '../../shared/types/messages';
import type { SampleWorkflowFile } from '../../shared/types/sample-workflow';

/**
 * List all available sample workflows and send metadata to webview
 *
 * @param extensionPath - Extension installation path
 * @param webview - Webview to send response to
 * @param requestId - Request ID for response matching
 */
export async function listSampleWorkflows(
  extensionPath: string,
  webview: vscode.Webview,
  requestId?: string
): Promise<void> {
  try {
    const samplesDir = path.join(extensionPath, 'resources', 'samples');

    let files: string[] = [];
    try {
      files = fs.readdirSync(samplesDir);
    } catch (error) {
      console.log('No samples directory or empty:', error);
      files = [];
    }

    const samples = [];
    for (const filename of files) {
      if (!filename.endsWith('.json')) {
        continue;
      }

      try {
        const filePath = path.join(samplesDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed: SampleWorkflowFile = JSON.parse(content);

        if (parsed.meta) {
          samples.push(parsed.meta);
        }
      } catch (error) {
        console.error(`Failed to parse sample workflow file ${filename}:`, error);
      }
    }

    const payload: SampleWorkflowListPayload = { samples };
    webview.postMessage({
      type: 'SAMPLE_WORKFLOW_LIST',
      requestId,
      payload,
    });

    console.log(`Sample workflow list loaded: ${samples.length} samples`);
  } catch (error) {
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load sample workflow list',
        details: error,
      },
    });
  }
}

/**
 * Load a specific sample workflow and send it to webview
 *
 * @param extensionPath - Extension installation path
 * @param webview - Webview to send response to
 * @param sampleId - Sample workflow ID (filename without .json extension)
 * @param requestId - Request ID for response matching
 */
export async function loadSampleWorkflow(
  extensionPath: string,
  webview: vscode.Webview,
  sampleId: string,
  requestId?: string
): Promise<void> {
  try {
    const filePath = path.join(extensionPath, 'resources', 'samples', `${sampleId}.json`);

    if (!fs.existsSync(filePath)) {
      webview.postMessage({
        type: 'ERROR',
        requestId,
        payload: {
          code: 'LOAD_FAILED',
          message: `Sample workflow "${sampleId}" not found`,
        },
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed: SampleWorkflowFile = JSON.parse(content);

    const payload: SampleWorkflowLoadedPayload = { workflow: parsed.workflow };
    webview.postMessage({
      type: 'SAMPLE_WORKFLOW_LOADED',
      requestId,
      payload,
    });

    console.log(`Sample workflow loaded: ${sampleId}`);
  } catch (error) {
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load sample workflow',
        details: error,
      },
    });
  }
}
