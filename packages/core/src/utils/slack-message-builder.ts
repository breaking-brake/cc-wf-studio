/**
 * Slack Block Kit Message Builder
 *
 * Builds rich message blocks for Slack using Block Kit format.
 * Used for displaying workflow metadata in Slack channels.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

/**
 * Supported editors for workflow import
 * Each editor uses a custom URI scheme for deep linking
 */
const SUPPORTED_EDITORS = [
  { name: 'VS Code', scheme: 'vscode' },
  { name: 'Cursor', scheme: 'cursor' },
  { name: 'Windsurf', scheme: 'windsurf' },
  { name: 'Kiro', scheme: 'kiro' },
  { name: 'Antigravity', scheme: 'antigravity' },
] as const;

/**
 * Extension ID for the workflow studio extension
 */
const EXTENSION_ID = 'breaking-brake.cc-wf-studio';

/**
 * Builds an import URI for a specific editor
 *
 * @param scheme - The URI scheme for the editor (e.g., 'vscode', 'cursor')
 * @param block - The workflow message block containing import parameters
 * @returns The complete import URI
 */
function buildImportUri(scheme: string, block: WorkflowMessageBlock): string {
  const params = new URLSearchParams({
    workflowId: block.workflowId,
    fileId: block.fileId,
    workspaceId: block.workspaceId || '',
    channelId: block.channelId || '',
    messageTs: block.messageTs || '',
  });

  // Add workspace name as Base64-encoded parameter for display in error dialogs
  if (block.workspaceName) {
    params.set('workspaceName', Buffer.from(block.workspaceName, 'utf-8').toString('base64'));
  }

  return `${scheme}://${EXTENSION_ID}/import?${params.toString()}`;
}

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
  /** Node count */
  nodeCount: number;
  /** File ID (after upload) */
  fileId: string;
  /** Workspace ID (for deep link) */
  workspaceId?: string;
  /** Workspace name (for display in error dialogs, Base64 encoded in URI) */
  workspaceName?: string;
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
 * - Metadata fields (Date)
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
    // Import links section
    ...(block.workspaceId && block.channelId && block.messageTs && block.fileId
      ? [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📥 *Import to:*  ${SUPPORTED_EDITORS.map(
                  (editor) => `<${buildImportUri(editor.scheme, block)}|${editor.name}>`
                ).join(' · ')}`,
              },
            ],
          },
        ]
      : [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_Import link will be available after file upload_',
              },
            ],
          },
        ]),
  ];
}
