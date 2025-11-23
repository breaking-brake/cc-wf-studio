/**
 * Slack Integration Message Passing Types
 *
 * Defines message contracts between Webview UI and Extension Host.
 * Based on specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import type {
  SensitiveDataFinding,
  SharedWorkflowMetadata,
  SlackChannel,
} from './slack-integration-types';

// ============================================================================
// Common Message Format
// ============================================================================

/**
 * Generic message wrapper for Webview ↔ Extension Host communication
 */
export interface WebviewMessage<T = unknown> {
  type: string;
  payload: T;
}

// ============================================================================
// 1. Webview → Extension Host (Commands)
// ============================================================================

/**
 * SLACK_CONNECT
 *
 * Initiates Slack workspace connection (OAuth flow).
 */
export interface SlackConnectCommand {
  type: 'SLACK_CONNECT';
  payload: Record<string, never>; // Empty object
}

/**
 * SLACK_DISCONNECT
 *
 * Disconnects from Slack workspace (removes token).
 */
export interface SlackDisconnectCommand {
  type: 'SLACK_DISCONNECT';
  payload: Record<string, never>;
}

/**
 * GET_SLACK_CHANNELS
 *
 * Retrieves list of Slack channels.
 */
export interface GetSlackChannelsCommand {
  type: 'GET_SLACK_CHANNELS';
  payload: {
    /** Include private channels (default: true) */
    includePrivate?: boolean;
    /** Only channels user is a member of (default: true) */
    onlyMember?: boolean;
  };
}

/**
 * SHARE_WORKFLOW_TO_SLACK
 *
 * Shares workflow to Slack channel.
 */
export interface ShareWorkflowToSlackCommand {
  type: 'SHARE_WORKFLOW_TO_SLACK';
  payload: {
    /** Workflow ID to share */
    workflowId: string;
    /** Workflow name */
    workflowName: string;
    /** Target Slack channel ID */
    channelId: string;
    /** Workflow description (optional) */
    description?: string;
    /** Override sensitive data warning (default: false) */
    overrideSensitiveWarning?: boolean;
  };
}

/**
 * IMPORT_WORKFLOW_FROM_SLACK
 *
 * Imports workflow from Slack message.
 */
export interface ImportWorkflowFromSlackCommand {
  type: 'IMPORT_WORKFLOW_FROM_SLACK';
  payload: {
    /** Workflow ID to import */
    workflowId: string;
    /** Slack file ID */
    fileId: string;
    /** Slack message timestamp */
    messageTs: string;
    /** Slack channel ID */
    channelId: string;
    /** Overwrite existing file (default: false) */
    overwriteExisting?: boolean;
  };
}

/**
 * SEARCH_SLACK_WORKFLOWS
 *
 * Searches for workflows previously shared to Slack.
 */
export interface SearchSlackWorkflowsCommand {
  type: 'SEARCH_SLACK_WORKFLOWS';
  payload: {
    /** Search keyword (optional) */
    query?: string;
    /** Filter by channel ID (optional) */
    channelId?: string;
    /** Filter by author name (optional) */
    authorName?: string;
    /** Filter by start date (ISO 8601) (optional) */
    fromDate?: string;
    /** Filter by end date (ISO 8601) (optional) */
    toDate?: string;
    /** Result limit (default: 20, max: 100) */
    limit?: number;
  };
}

/**
 * Union type of all Webview → Extension Host commands
 */
export type WebviewToExtensionCommand =
  | SlackConnectCommand
  | SlackDisconnectCommand
  | GetSlackChannelsCommand
  | ShareWorkflowToSlackCommand
  | ImportWorkflowFromSlackCommand
  | SearchSlackWorkflowsCommand;

// ============================================================================
// 2. Extension Host → Webview (Events)
// ============================================================================

/**
 * SLACK_CONNECT_SUCCESS
 *
 * Sent when Slack connection succeeds.
 */
export interface SlackConnectSuccessEvent {
  type: 'SLACK_CONNECT_SUCCESS';
  payload: {
    workspaceId: string;
    workspaceName: string;
    userId: string;
    authorizedAt: string; // ISO 8601
  };
}

/**
 * SLACK_CONNECT_FAILED
 *
 * Sent when Slack connection fails.
 */
export interface SlackConnectFailedEvent {
  type: 'SLACK_CONNECT_FAILED';
  payload: {
    errorCode: 'USER_CANCELLED' | 'OAUTH_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
    errorMessage: string;
  };
}

/**
 * SLACK_DISCONNECT_SUCCESS
 *
 * Sent when Slack disconnection succeeds.
 */
export interface SlackDisconnectSuccessEvent {
  type: 'SLACK_DISCONNECT_SUCCESS';
  payload: Record<string, never>;
}

/**
 * SLACK_DISCONNECT_FAILED
 *
 * Sent when Slack disconnection fails.
 */
export interface SlackDisconnectFailedEvent {
  type: 'SLACK_DISCONNECT_FAILED';
  payload: {
    errorCode: string;
    errorMessage: string;
  };
}

/**
 * GET_SLACK_CHANNELS_SUCCESS
 *
 * Sent when channel list retrieval succeeds.
 */
export interface GetSlackChannelsSuccessEvent {
  type: 'GET_SLACK_CHANNELS_SUCCESS';
  payload: {
    channels: SlackChannel[];
  };
}

/**
 * GET_SLACK_CHANNELS_FAILED
 *
 * Sent when channel list retrieval fails.
 */
export interface GetSlackChannelsFailedEvent {
  type: 'GET_SLACK_CHANNELS_FAILED';
  payload: {
    errorCode: string;
    errorMessage: string;
  };
}

/**
 * SENSITIVE_DATA_WARNING
 *
 * Sent when sensitive data is detected (requires user confirmation).
 */
export interface SensitiveDataWarningEvent {
  type: 'SENSITIVE_DATA_WARNING';
  payload: {
    workflowId: string;
    findings: SensitiveDataFinding[];
  };
}

/**
 * SHARE_WORKFLOW_SUCCESS
 *
 * Sent when workflow sharing succeeds.
 */
export interface ShareWorkflowSuccessEvent {
  type: 'SHARE_WORKFLOW_SUCCESS';
  payload: {
    workflowId: string;
    channelId: string;
    channelName: string;
    messageTs: string;
    fileId: string;
    permalink: string; // Direct link to Slack message
  };
}

/**
 * SHARE_WORKFLOW_FAILED
 *
 * Sent when workflow sharing fails.
 */
export interface ShareWorkflowFailedEvent {
  type: 'SHARE_WORKFLOW_FAILED';
  payload: {
    workflowId: string;
    errorCode:
      | 'NOT_AUTHENTICATED'
      | 'CHANNEL_NOT_FOUND'
      | 'NOT_IN_CHANNEL'
      | 'FILE_TOO_LARGE'
      | 'RATE_LIMITED'
      | 'NETWORK_ERROR'
      | 'UNKNOWN_ERROR';
    errorMessage: string;
  };
}

/**
 * IMPORT_WORKFLOW_CONFIRM_OVERWRITE
 *
 * Sent when existing file is found (requires user confirmation).
 */
export interface ImportWorkflowConfirmOverwriteEvent {
  type: 'IMPORT_WORKFLOW_CONFIRM_OVERWRITE';
  payload: {
    workflowId: string;
    existingFilePath: string;
  };
}

/**
 * IMPORT_WORKFLOW_SUCCESS
 *
 * Sent when workflow import succeeds.
 */
export interface ImportWorkflowSuccessEvent {
  type: 'IMPORT_WORKFLOW_SUCCESS';
  payload: {
    workflowId: string;
    filePath: string;
    workflowName: string;
    /** Workflow data for loading into canvas */
    workflow: import('../../shared/types/workflow-definition').Workflow;
  };
}

/**
 * IMPORT_WORKFLOW_FAILED
 *
 * Sent when workflow import fails.
 */
export interface ImportWorkflowFailedEvent {
  type: 'IMPORT_WORKFLOW_FAILED';
  payload: {
    workflowId: string;
    errorCode: string;
    errorMessage: string;
  };
}

/**
 * SEARCH_SLACK_WORKFLOWS_SUCCESS
 *
 * Sent when workflow search succeeds.
 */
export interface SearchSlackWorkflowsSuccessEvent {
  type: 'SEARCH_SLACK_WORKFLOWS_SUCCESS';
  payload: {
    workflows: SharedWorkflowMetadata[];
    total: number;
  };
}

/**
 * SEARCH_SLACK_WORKFLOWS_FAILED
 *
 * Sent when workflow search fails.
 */
export interface SearchSlackWorkflowsFailedEvent {
  type: 'SEARCH_SLACK_WORKFLOWS_FAILED';
  payload: {
    errorCode: string;
    errorMessage: string;
  };
}

/**
 * Union type of all Extension Host → Webview events
 */
export type ExtensionToWebviewEvent =
  | SlackConnectSuccessEvent
  | SlackConnectFailedEvent
  | SlackDisconnectSuccessEvent
  | SlackDisconnectFailedEvent
  | GetSlackChannelsSuccessEvent
  | GetSlackChannelsFailedEvent
  | SensitiveDataWarningEvent
  | ShareWorkflowSuccessEvent
  | ShareWorkflowFailedEvent
  | ImportWorkflowConfirmOverwriteEvent
  | ImportWorkflowSuccessEvent
  | ImportWorkflowFailedEvent
  | SearchSlackWorkflowsSuccessEvent
  | SearchSlackWorkflowsFailedEvent;
