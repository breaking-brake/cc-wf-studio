/**
 * Export & Run Handlers - Web Server
 *
 * Handles multi-agent export and run operations for all supported AI platforms:
 * Claude Code, Copilot, Codex, Roo Code, Gemini, Antigravity, Cursor.
 *
 * Ported from src/extension/commands/*-handlers.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { type FileService, log } from '@cc-wf-studio/core';

type Reply = (type: string, payload?: unknown) => void;
type Send = (message: { type: string; requestId?: string; payload?: unknown }) => void;

/**
 * Handle RUN_AS_SLASH_COMMAND — export + execute via CLI
 */
export async function handleRunAsSlashCommandWeb(
  fileService: FileService,
  workflow: Record<string, unknown>,
  workspacePath: string,
  requestId: string | undefined,
  reply: Reply,
  send: Send
): Promise<void> {
  try {
    // First, export the workflow
    const { handleExportWorkflowWeb } = await import('./workflow-handlers.js');
    let exportSuccess = false;
    const exportReply = (type: string, _payload?: unknown) => {
      if (type === 'EXPORT_SUCCESS') exportSuccess = true;
    };
    await handleExportWorkflowWeb(fileService, { workflow }, requestId, exportReply);

    if (!exportSuccess) {
      reply('ERROR', {
        code: 'EXPORT_FAILED',
        message: 'Failed to export workflow before execution',
      });
      return;
    }

    // Execute the slash command via CLI
    const workflowName = workflow.name as string;
    executeCliCommand('claude', [workflowName], workspacePath, send, requestId);

    reply('RUN_AS_SLASH_COMMAND_SUCCESS', {
      workflowName,
      terminalName: `Claude: ${workflowName}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('ERROR', {
      code: 'RUN_FAILED',
      message: error instanceof Error ? error.message : 'Failed to run workflow',
    });
  }
}

/**
 * Handle all agent export operations (EXPORT_FOR_*)
 */
export async function handleAgentExportWeb(
  messageType: string,
  fileService: FileService,
  payload: { workflow: Record<string, unknown> },
  workspacePath: string,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  const { workflow } = payload;
  const workflowName = workflow.name as string;

  // Map message type to agent config
  const agentConfig = getAgentConfig(messageType);
  if (!agentConfig) {
    reply('ERROR', { code: 'UNKNOWN_AGENT', message: `Unknown export type: ${messageType}` });
    return;
  }

  try {
    // Create target skills directory
    const skillsDir = path.join(workspacePath, agentConfig.skillsDir);
    await fileService.createDirectory(skillsDir);

    // Generate skill file
    const skillContent = generateSkillContent(workflow);
    const skillPath = path.join(skillsDir, `${workflowName}.md`);
    await fileService.writeFile(skillPath, skillContent);

    const successType = agentConfig.successType;
    reply(successType, {
      exportedFiles: [skillPath],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const failType = agentConfig.failType;
    reply(failType, {
      errorCode: 'EXPORT_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to export',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle all agent run operations (RUN_FOR_*)
 */
export async function handleAgentRunWeb(
  messageType: string,
  fileService: FileService,
  payload: { workflow: Record<string, unknown> },
  workspacePath: string,
  requestId: string | undefined,
  reply: Reply,
  send: Send
): Promise<void> {
  const { workflow } = payload;
  const workflowName = workflow.name as string;

  const agentConfig = getAgentConfig(messageType.replace('RUN_FOR_', 'EXPORT_FOR_'));
  if (!agentConfig) {
    reply('ERROR', { code: 'UNKNOWN_AGENT', message: `Unknown run type: ${messageType}` });
    return;
  }

  try {
    // First export
    const skillsDir = path.join(workspacePath, agentConfig.skillsDir);
    await fileService.createDirectory(skillsDir);
    const skillContent = generateSkillContent(workflow);
    const skillPath = path.join(skillsDir, `${workflowName}.md`);
    await fileService.writeFile(skillPath, skillContent);

    // Then run via CLI if command is available
    if (agentConfig.cliCommand) {
      executeCliCommand(
        agentConfig.cliCommand,
        agentConfig.cliArgs ? agentConfig.cliArgs(workflowName) : [workflowName],
        workspacePath,
        send,
        requestId
      );
    }

    const successType = agentConfig.runSuccessType || agentConfig.successType;
    reply(successType, {
      workflowName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const failType = agentConfig.runFailType || agentConfig.failType;
    reply(failType, {
      errorCode: 'RUN_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to run',
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Agent configuration
// ============================================================================

interface AgentConfig {
  skillsDir: string;
  successType: string;
  failType: string;
  runSuccessType?: string;
  runFailType?: string;
  cliCommand?: string;
  cliArgs?: (workflowName: string) => string[];
}

function getAgentConfig(messageType: string): AgentConfig | null {
  const configs: Record<string, AgentConfig> = {
    EXPORT_FOR_COPILOT: {
      skillsDir: '.github/prompts',
      successType: 'EXPORT_FOR_COPILOT_SUCCESS',
      failType: 'EXPORT_FOR_COPILOT_FAILED',
      runSuccessType: 'RUN_FOR_COPILOT_SUCCESS',
      runFailType: 'RUN_FOR_COPILOT_FAILED',
    },
    EXPORT_FOR_COPILOT_CLI: {
      skillsDir: '.github/skills',
      successType: 'EXPORT_FOR_COPILOT_CLI_SUCCESS',
      failType: 'EXPORT_FOR_COPILOT_CLI_FAILED',
      runSuccessType: 'RUN_FOR_COPILOT_CLI_SUCCESS',
      runFailType: 'RUN_FOR_COPILOT_CLI_FAILED',
      cliCommand: 'copilot',
      cliArgs: (name) => [':task', name],
    },
    EXPORT_FOR_CODEX_CLI: {
      skillsDir: '.codex/skills',
      successType: 'EXPORT_FOR_CODEX_CLI_SUCCESS',
      failType: 'EXPORT_FOR_CODEX_CLI_FAILED',
      runSuccessType: 'RUN_FOR_CODEX_CLI_SUCCESS',
      runFailType: 'RUN_FOR_CODEX_CLI_FAILED',
      cliCommand: 'codex',
      cliArgs: (name) => [':task', name],
    },
    EXPORT_FOR_ROO_CODE: {
      skillsDir: '.roo/skills',
      successType: 'EXPORT_FOR_ROO_CODE_SUCCESS',
      failType: 'EXPORT_FOR_ROO_CODE_FAILED',
      runSuccessType: 'RUN_FOR_ROO_CODE_SUCCESS',
      runFailType: 'RUN_FOR_ROO_CODE_FAILED',
    },
    EXPORT_FOR_GEMINI_CLI: {
      skillsDir: '.gemini/skills',
      successType: 'EXPORT_FOR_GEMINI_CLI_SUCCESS',
      failType: 'EXPORT_FOR_GEMINI_CLI_FAILED',
      runSuccessType: 'RUN_FOR_GEMINI_CLI_SUCCESS',
      runFailType: 'RUN_FOR_GEMINI_CLI_FAILED',
      cliCommand: 'gemini',
      cliArgs: (name) => [':task', name],
    },
    EXPORT_FOR_ANTIGRAVITY: {
      skillsDir: '.agent/skills',
      successType: 'EXPORT_FOR_ANTIGRAVITY_SUCCESS',
      failType: 'EXPORT_FOR_ANTIGRAVITY_FAILED',
      runSuccessType: 'RUN_FOR_ANTIGRAVITY_SUCCESS',
      runFailType: 'RUN_FOR_ANTIGRAVITY_FAILED',
    },
    EXPORT_FOR_CURSOR: {
      skillsDir: '.cursor/skills',
      successType: 'EXPORT_FOR_CURSOR_SUCCESS',
      failType: 'EXPORT_FOR_CURSOR_FAILED',
      runSuccessType: 'RUN_FOR_CURSOR_SUCCESS',
      runFailType: 'RUN_FOR_CURSOR_FAILED',
    },
  };

  return configs[messageType] || null;
}

// ============================================================================
// Helpers
// ============================================================================

function generateSkillContent(workflow: Record<string, unknown>): string {
  const name = workflow.name as string;
  const description = (workflow.description as string) || '';
  const nodes = (workflow.nodes as Array<Record<string, unknown>>) || [];

  const lines: string[] = [`# ${name}`];
  if (description) {
    lines.push('', description);
  }
  lines.push('', '## Instructions', '');

  for (const node of nodes) {
    const data = node.data as Record<string, unknown>;
    if (!data) continue;
    const label = (data.label as string) || '';
    const content = (data.content as string) || (data.prompt as string) || '';

    if (label && label !== 'Start' && label !== 'End') {
      lines.push(`### ${label}`);
      if (content) {
        lines.push('', content, '');
      }
    }
  }

  return lines.join('\n');
}

function executeCliCommand(
  command: string,
  args: string[],
  cwd: string,
  send: Send,
  requestId?: string
): void {
  try {
    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      send({
        type: 'CLI_OUTPUT',
        requestId,
        payload: { stream: 'stdout', data: data.toString() },
      });
    });

    child.stderr?.on('data', (data) => {
      send({
        type: 'CLI_OUTPUT',
        requestId,
        payload: { stream: 'stderr', data: data.toString() },
      });
    });

    child.on('close', (code) => {
      send({
        type: 'CLI_EXIT',
        requestId,
        payload: { code },
      });
    });

    child.on('error', (error) => {
      log('ERROR', `CLI command failed: ${command}`, { error: error.message });
    });
  } catch (error) {
    log('ERROR', `Failed to spawn CLI: ${command}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
