/**
 * Slack Integration Data Models
 *
 * This file defines TypeScript types for Slack integration feature.
 * Based on specs/001-slack-workflow-sharing/data-model.md
 */

// ============================================================================
// 1. SlackWorkspaceConnection
// ============================================================================

/**
 * Slack workspace connection information
 *
 * Manages workspace connections using Bot User OAuth Tokens.
 * Access tokens are stored in VSCode Secret Storage (encrypted).
 */
export interface SlackWorkspaceConnection {
  /** Slack Workspace ID (e.g., T01234ABCD) */
  workspaceId: string;

  /** Workspace display name */
  workspaceName: string;

  /** Slack Team ID */
  teamId: string;

  /** Bot User OAuth Token (stored in VSCode Secret Storage only) */
  accessToken: string;

  /** User OAuth Token for user-specific operations like channel listing (xoxp-...) */
  userAccessToken?: string;

  /** Token scopes (e.g., ['chat:write', 'files:write']) - Optional for manual token input */
  tokenScope?: string[];

  /** Authenticated user's Slack User ID (e.g., U01234EFGH) */
  userId: string;

  /** Bot User ID for membership check (e.g., U01234ABCD) */
  botUserId?: string;

  /** Authorization timestamp (ISO 8601) */
  authorizedAt: Date;

  /** Last token validation timestamp (ISO 8601) */
  lastValidatedAt?: Date;
}

// ============================================================================
// 2. SensitiveDataFinding & SensitiveDataType
// ============================================================================

/**
 * Types of sensitive data that can be detected
 */
export enum SensitiveDataType {
  AWS_ACCESS_KEY = 'AWS_ACCESS_KEY',
  AWS_SECRET_KEY = 'AWS_SECRET_KEY',
  API_KEY = 'API_KEY',
  TOKEN = 'TOKEN',
  SLACK_TOKEN = 'SLACK_TOKEN',
  GITHUB_TOKEN = 'GITHUB_TOKEN',
  PRIVATE_KEY = 'PRIVATE_KEY',
  PASSWORD = 'PASSWORD',
  CUSTOM = 'CUSTOM', // User-defined pattern
}

/**
 * Sensitive data detection result
 *
 * Contains masked values and severity information.
 * Original values are never stored.
 */
export interface SensitiveDataFinding {
  /** Type of sensitive data detected */
  type: SensitiveDataType;

  /** Masked value (first 4 + last 4 chars only, e.g., 'AKIA...X7Z9') */
  maskedValue: string;

  /** Character offset in file */
  position: number;

  /** Surrounding context (max 100 chars) */
  context?: string;

  /** Severity level (high = AWS keys, medium = API keys, low = passwords) */
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// 3. SlackChannel
// ============================================================================

/**
 * Slack channel information
 *
 * Retrieved from Slack API conversations.list
 */
export interface SlackChannel {
  /** Channel ID (e.g., C01234ABCD) */
  id: string;

  /** Channel name (e.g., 'general', 'team-announcements') */
  name: string;

  /** Whether channel is private */
  isPrivate: boolean;

  /** Whether user is a member of the channel */
  isMember: boolean;

  /** Number of members in the channel */
  memberCount?: number;

  /** Channel purpose (max 250 chars) */
  purpose?: string;

  /** Channel topic (max 250 chars) */
  topic?: string;
}

// ============================================================================
// 4. SharedWorkflowMetadata
// ============================================================================

/**
 * Metadata for workflows shared to Slack
 *
 * Embedded in Slack message block kit as metadata.
 * Used for workflow search and import.
 */
export interface SharedWorkflowMetadata {
  /** Workflow unique ID (UUID v4) */
  id: string;

  /** Workflow name (1-100 chars) */
  name: string;

  /** Workflow description (max 500 chars) */
  description?: string;

  /** Semantic versioning (e.g., '1.0.0') */
  version: string;

  /** Author's name (from VS Code settings) */
  authorName: string;

  /** Author's email address (optional) */
  authorEmail?: string;

  /** Timestamp when shared to Slack (ISO 8601) */
  sharedAt: Date;

  /** Slack channel ID where shared */
  channelId: string;

  /** Slack channel name (for display) */
  channelName: string;

  /** Slack message timestamp (e.g., '1234567890.123456') */
  messageTs: string;

  /** Slack file ID (e.g., F01234ABCD) */
  fileId: string;

  /** Slack file download URL (private URL) */
  fileUrl: string;

  /** Number of nodes in workflow */
  nodeCount: number;

  /** Tags for search (max 10 tags, each max 30 chars) */
  tags?: string[];

  /** Whether sensitive data was detected */
  hasSensitiveData: boolean;

  /** Whether user overrode sensitive data warning */
  sensitiveDataOverride?: boolean;
}

// ============================================================================
// 5. WorkflowImportRequest & ImportStatus
// ============================================================================

/**
 * Workflow import status
 */
export enum ImportStatus {
  PENDING = 'pending', // Import queued
  DOWNLOADING = 'downloading', // Downloading file from Slack
  VALIDATING = 'validating', // Validating file format
  WRITING = 'writing', // Writing file to disk
  COMPLETED = 'completed', // Import completed
  FAILED = 'failed', // Import failed
}

/**
 * Workflow import request
 *
 * Tracks the state of importing a workflow from Slack.
 */
export interface WorkflowImportRequest {
  /** Workflow ID to import (UUID v4) */
  workflowId: string;

  /** Source Slack message timestamp */
  sourceMessageTs: string;

  /** Source Slack channel ID */
  sourceChannelId: string;

  /** Slack file ID to download */
  fileId: string;

  /** Target directory (absolute path, e.g., '/Users/.../workflows/') */
  targetDirectory: string;

  /** Whether to overwrite existing file */
  overwriteExisting: boolean;

  /** Request timestamp (ISO 8601) */
  requestedAt: Date;

  /** Current import status */
  status: ImportStatus;

  /** Error message (only when status === 'failed') */
  errorMessage?: string;
}
