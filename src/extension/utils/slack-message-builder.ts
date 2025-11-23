/**
 * Slack Block Kit Message Builder
 *
 * Builds rich message blocks for Slack using Block Kit format.
 * Used for displaying workflow metadata in Slack channels.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

/**
 * Workflow message block (Block Kit format)
 */
export interface WorkflowMessageBlock {
  /** Workflow ID */
  workflowId: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Workflow version */
  version: string;
  /** Author name */
  authorName: string;
  /** Node count */
  nodeCount: number;
  /** Created timestamp (ISO 8601) */
  createdAt: string;
  /** File ID (after upload) */
  fileId: string;
  /** Workspace ID (for deep link) */
  workspaceId?: string;
  /** Channel ID (for deep link) */
  channelId?: string;
  /** Message timestamp (for deep link) */
  messageTs?: string;
}

/**
 * Builds Block Kit blocks for workflow message
 *
 * Creates a rich message card with:
 * - Header with workflow name
 * - Metadata fields (Author, Version, Nodes, Created date)
 * - Description section (if provided)
 * - Import button with deep link to VS Code
 *
 * @param block - Workflow message block
 * @returns Block Kit blocks array
 */
export function buildWorkflowMessageBlocks(
  block: WorkflowMessageBlock
): Array<Record<string, unknown>> {
  return [
    // Header
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🔧 Workflow: ${block.name}`,
      },
    },
    // Metadata fields
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Author:*\n${block.authorName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Version:*\n${block.version}`,
        },
        {
          type: 'mrkdwn',
          text: `*Nodes:*\n${block.nodeCount}`,
        },
        {
          type: 'mrkdwn',
          text: `*Created:*\n${new Date(block.createdAt).toLocaleDateString()}`,
        },
      ],
    },
    // Description (if provided)
    ...(block.description
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: block.description,
            },
          },
        ]
      : []),
    // Import link (using section with markdown to avoid interactivity URL requirement)
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          block.workspaceId && block.channelId && block.messageTs && block.fileId
            ? `📥 <vscode://cc-wf-studio/import?workflowId=${encodeURIComponent(block.workflowId)}&fileId=${encodeURIComponent(block.fileId)}&workspaceId=${encodeURIComponent(block.workspaceId)}&channelId=${encodeURIComponent(block.channelId)}&messageTs=${encodeURIComponent(block.messageTs)}|Import to VS Code>`
            : '_Import link will be available after file upload_',
      },
    },
  ];
}
