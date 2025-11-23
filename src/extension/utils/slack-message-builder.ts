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
 * - Description section (if provided)
 * - Metadata fields (Author, Date)
 * - Import link with deep link to VS Code
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
        text: block.name,
      },
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
          { type: 'divider' },
        ]
      : [{ type: 'divider' }]),
    // Metadata fields
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Author:* ${block.authorName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Date:* ${new Date(block.createdAt).toLocaleDateString()}`,
        },
      ],
    },
    // Import link footer
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text:
            block.workspaceId && block.channelId && block.messageTs && block.fileId
              ? `📥 <vscode://breaking-brake.cc-wf-studio/import?workflowId=${encodeURIComponent(block.workflowId)}&fileId=${encodeURIComponent(block.fileId)}&workspaceId=${encodeURIComponent(block.workspaceId)}&channelId=${encodeURIComponent(block.channelId)}&messageTs=${encodeURIComponent(block.messageTs)}|Import to VS Code>\n_Note: Please open your target VS Code workspace before clicking the import link_`
              : '_Import link will be available after file upload_',
        },
      ],
    },
  ];
}
