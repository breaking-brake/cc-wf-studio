/**
 * Workflow Handlers - Web Server
 *
 * Handles workflow CRUD operations (save, load, list, export)
 * Ported from src/extension/commands/save-workflow.ts, load-workflow.ts, etc.
 */

import path from 'node:path';
import type { FileService } from '@cc-wf-studio/core';

type Reply = (type: string, payload?: unknown) => void;

/**
 * Handle EXPORT_WORKFLOW message
 * Exports workflow to .claude format (agents/*.md and commands/*.md)
 */
export async function handleExportWorkflowWeb(
  fileService: FileService,
  payload: { workflow: Record<string, unknown>; overwriteExisting?: boolean },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { workflow } = payload;
    const workspacePath = fileService.getWorkspacePath();

    // Get workflow nodes for export
    const nodes = (workflow.nodes as Array<Record<string, unknown>>) || [];
    const exportedFiles: string[] = [];

    // Export SlashCommand (main workflow) to .claude/commands/
    const commandsDir = path.join(workspacePath, '.claude', 'commands');
    await fileService.createDirectory(commandsDir);

    // Generate command file content
    const workflowName = workflow.name as string;
    // Simple export: create a command file with workflow instructions
    const commandContent = generateCommandContent(workflow, nodes);
    const commandPath = path.join(commandsDir, `${workflowName}.md`);
    await fileService.writeFile(commandPath, commandContent);
    exportedFiles.push(commandPath);

    // Export Sub-Agent nodes as .md files to .claude/agents/
    const subAgentNodes = nodes.filter((n) => n.type === 'subAgentFlow' || n.type === 'branch');
    if (subAgentNodes.length > 0) {
      const agentsDir = path.join(workspacePath, '.claude', 'agents');
      await fileService.createDirectory(agentsDir);

      for (const node of subAgentNodes) {
        const data = node.data as Record<string, unknown>;
        const agentName = (data.label as string) || `agent-${node.id}`;
        const agentContent = generateAgentContent(data);
        const agentPath = path.join(agentsDir, `${agentName}.md`);
        await fileService.writeFile(agentPath, agentContent);
        exportedFiles.push(agentPath);
      }
    }

    reply('EXPORT_SUCCESS', {
      exportedFiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('ERROR', {
      code: 'EXPORT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to export workflow',
    });
  }
}

function generateCommandContent(
  workflow: Record<string, unknown>,
  nodes: Array<Record<string, unknown>>
): string {
  const lines: string[] = [];
  const description = (workflow.description as string) || '';

  lines.push(`# ${workflow.name}`);
  if (description) {
    lines.push('');
    lines.push(description);
  }
  lines.push('');
  lines.push('## Instructions');
  lines.push('');

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    const label = (data.label as string) || '';
    const content = (data.content as string) || (data.prompt as string) || '';

    if (label) {
      lines.push(`### ${label}`);
    }
    if (content) {
      lines.push('');
      lines.push(content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateAgentContent(data: Record<string, unknown>): string {
  const label = (data.label as string) || 'Agent';
  const description = (data.description as string) || '';
  const content = (data.content as string) || (data.prompt as string) || '';

  const lines = [`# ${label}`];
  if (description) {
    lines.push('', description);
  }
  if (content) {
    lines.push('', '## Instructions', '', content);
  }
  return lines.join('\n');
}
