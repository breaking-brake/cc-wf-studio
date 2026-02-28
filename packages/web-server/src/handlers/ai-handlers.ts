/**
 * AI Handlers - Web Server
 *
 * Handles AI refinement, name/description generation, AI editing skill service.
 * Ported from src/extension/commands/workflow-refinement.ts,
 * workflow-name-generation.ts, and ai-editing-skill-service.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { type AiEditingProvider, log, type McpServerManager } from '@cc-wf-studio/core';
import type { WebSocketMessageTransport } from '../adapters/ws-message-transport.js';

type Reply = (type: string, payload?: unknown) => void;
type Send = (message: { type: string; requestId?: string; payload?: unknown }) => void;

// Track active refinement processes for cancellation
const activeProcesses = new Map<string, { kill: () => void }>();

/**
 * Handle REFINE_WORKFLOW
 */
export async function handleRefineWorkflowWeb(
  payload: Record<string, unknown>,
  workspacePath: string,
  requestId: string | undefined,
  reply: Reply,
  send: Send
): Promise<void> {
  try {
    const instruction = payload.instruction as string;
    const workflow = payload.workflow as Record<string, unknown>;
    const provider = (payload.provider as string) || 'claude-code';

    // Build refinement prompt
    const prompt = buildRefinementPrompt(instruction, workflow);

    // Execute via CLI with streaming
    const result = await executeClaudeWithStreaming(
      prompt,
      workspacePath,
      requestId,
      send,
      provider
    );

    if (result.cancelled) {
      reply('REFINEMENT_CANCELLED', {
        reason: 'user_cancelled',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Try to parse the AI output as a workflow
    try {
      const refinedWorkflow = parseWorkflowFromOutput(result.output, workflow);
      reply('REFINEMENT_SUCCESS', {
        workflow: refinedWorkflow,
        conversationHistory: [],
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // AI might be asking for clarification
      reply('REFINEMENT_CLARIFICATION', {
        message: result.output,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    reply('REFINEMENT_FAILED', {
      error: {
        code: 'REFINEMENT_ERROR',
        message: error instanceof Error ? error.message : 'Refinement failed',
      },
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle CANCEL_REFINEMENT
 */
export async function handleCancelRefinementWeb(
  payload: Record<string, unknown>,
  requestId: string | undefined,
  reply: Reply
): Promise<void> {
  const targetId = (payload.targetRequestId as string) || requestId;
  if (targetId) {
    const process = activeProcesses.get(targetId);
    if (process) {
      process.kill();
      activeProcesses.delete(targetId);
    }
  }
  reply('REFINEMENT_CANCELLED', {
    reason: 'user_cancelled',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle CLEAR_CONVERSATION
 */
export async function handleClearConversationWeb(
  _payload: Record<string, unknown>,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  reply('CONVERSATION_CLEARED', {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle GENERATE_WORKFLOW_NAME
 */
export async function handleGenerateWorkflowNameWeb(
  payload: Record<string, unknown>,
  workspacePath: string,
  requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const workflow = payload.workflow as Record<string, unknown>;
    const prompt = buildNamePrompt(workflow);

    const result = await executeClaudeCommand(prompt, workspacePath, requestId);

    if (result.cancelled) {
      reply('GENERATE_WORKFLOW_NAME_CANCELLED', {});
      return;
    }

    // Parse name from output
    const name = parseName(result.output);

    reply('GENERATE_WORKFLOW_NAME_SUCCESS', {
      name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('GENERATE_WORKFLOW_NAME_FAILED', {
      errorMessage: error instanceof Error ? error.message : 'Failed to generate name',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Cancel a generation process
 */
export async function handleCancelGenerationWeb(targetRequestId: string): Promise<void> {
  const process = activeProcesses.get(targetRequestId);
  if (process) {
    process.kill();
    activeProcesses.delete(targetRequestId);
  }
}

/**
 * Handle RUN_AI_EDITING_SKILL
 */
export async function handleRunAiEditingSkillWeb(
  payload: { provider: string },
  workspacePath: string,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    // Generate the AI editing skill and run it
    const { provider } = payload;

    // Find the skill file path
    const skillPath = path.join(workspacePath, '.claude', 'skills', 'cc-workflow-ai-editor.md');

    // Execute the skill
    const cliCommand = getCliForProvider(provider);
    if (!cliCommand) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    spawn(cliCommand, ['--skill', skillPath], {
      cwd: workspacePath,
      shell: true,
      stdio: 'ignore',
      detached: true,
    }).unref();

    reply('RUN_AI_EDITING_SKILL_SUCCESS', {
      provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('RUN_AI_EDITING_SKILL_FAILED', {
      errorMessage: error instanceof Error ? error.message : 'Failed to run AI editing skill',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle LAUNCH_AI_AGENT — one-click: start server → write config → launch skill
 */
export async function handleLaunchAiAgentWeb(
  payload: { provider: string },
  existingManager: McpServerManager | null,
  transport: WebSocketMessageTransport,
  workspacePath: string,
  requestId: string | undefined,
  reply: Reply,
  send: Send
): Promise<McpServerManager | null> {
  const { provider } = payload;

  try {
    // 1. Start MCP server if needed
    let manager = existingManager;
    if (!manager || !manager.isRunning()) {
      const { handleStartMcpServerWeb } = await import('./mcp-handlers.js');
      manager = await handleStartMcpServerWeb(
        existingManager,
        transport,
        workspacePath,
        { configTargets: [provider] },
        requestId,
        // Suppress the MCP_SERVER_STATUS reply — we'll send our own
        () => {}
      );
    }

    // 2. Send MCP_SERVER_STATUS
    if (manager) {
      send({
        type: 'MCP_SERVER_STATUS',
        payload: {
          running: true,
          port: manager.getPort(),
          configsWritten: [],
          reviewBeforeApply: manager.getReviewBeforeApply(),
        },
      });

      manager.setCurrentProvider(provider as AiEditingProvider);
    }

    // 3. Run AI editing skill
    await handleRunAiEditingSkillWeb({ provider }, workspacePath, requestId, () => {});

    reply('LAUNCH_AI_AGENT_SUCCESS', {
      provider,
      timestamp: new Date().toISOString(),
    });

    return manager;
  } catch (error) {
    log('ERROR', 'Failed to launch AI agent', {
      error: error instanceof Error ? error.message : String(error),
    });
    reply('LAUNCH_AI_AGENT_FAILED', {
      errorMessage: error instanceof Error ? error.message : 'Failed to launch AI agent',
      timestamp: new Date().toISOString(),
    });
    return existingManager;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

function buildRefinementPrompt(instruction: string, workflow: Record<string, unknown>): string {
  return [
    'You are a workflow refinement assistant.',
    'Given the following workflow JSON and user instruction, output a refined workflow JSON.',
    '',
    '## Current Workflow',
    '```json',
    JSON.stringify(workflow, null, 2),
    '```',
    '',
    '## User Instruction',
    instruction,
    '',
    '## Output',
    'Output ONLY the refined workflow JSON, nothing else.',
  ].join('\n');
}

function buildNamePrompt(workflow: Record<string, unknown>): string {
  const nodes = (workflow.nodes as Array<Record<string, unknown>>) || [];
  const nodeLabels = nodes
    .map((n) => (n.data as Record<string, unknown>)?.label)
    .filter(Boolean)
    .join(', ');

  return [
    'Generate a concise kebab-case workflow name (e.g., "deploy-api", "lint-and-test").',
    `Nodes: ${nodeLabels || 'none'}`,
    `Description: ${workflow.description || 'none'}`,
    'Output ONLY the name, nothing else.',
  ].join('\n');
}

function parseName(output: string): string {
  // Clean and format as kebab-case
  const cleaned = output
    .trim()
    .replace(/['"]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase()
    .slice(0, 50);

  return cleaned || 'untitled-workflow';
}

function parseWorkflowFromOutput(
  output: string,
  originalWorkflow: Record<string, unknown>
): Record<string, unknown> {
  // Try to extract JSON from the output
  const jsonMatch = output.match(/```json\s*([\s\S]*?)```/) || output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in output');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const parsed = JSON.parse(jsonStr);

  // Merge with original to preserve any missing fields
  return {
    ...originalWorkflow,
    ...parsed,
    id: originalWorkflow.id, // Preserve original ID
    version: originalWorkflow.version, // Preserve version
  };
}

async function executeClaudeWithStreaming(
  prompt: string,
  cwd: string,
  requestId: string | undefined,
  send: Send,
  provider: string
): Promise<{ output: string; cancelled: boolean; executionTimeMs: number }> {
  const startTime = Date.now();
  const command = getCliForProvider(provider) || 'claude';

  return new Promise((resolve) => {
    let output = '';
    let cancelled = false;

    const child = spawn(command, ['--print', prompt], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (requestId) {
      activeProcesses.set(requestId, {
        kill: () => {
          cancelled = true;
          child.kill('SIGTERM');
        },
      });
    }

    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      send({
        type: 'REFINEMENT_PROGRESS',
        requestId,
        payload: { chunk },
      });
    });

    child.stderr?.on('data', (data) => {
      log('WARN', `CLI stderr: ${data.toString()}`);
    });

    child.on('close', () => {
      if (requestId) activeProcesses.delete(requestId);
      resolve({
        output,
        cancelled,
        executionTimeMs: Date.now() - startTime,
      });
    });

    child.on('error', (_error) => {
      if (requestId) activeProcesses.delete(requestId);
      resolve({
        output: '',
        cancelled: false,
        executionTimeMs: Date.now() - startTime,
      });
    });
  });
}

async function executeClaudeCommand(
  prompt: string,
  cwd: string,
  requestId: string | undefined
): Promise<{ output: string; cancelled: boolean }> {
  return new Promise((resolve) => {
    let output = '';
    let cancelled = false;

    const child = spawn('claude', ['--print', prompt], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (requestId) {
      activeProcesses.set(requestId, {
        kill: () => {
          cancelled = true;
          child.kill('SIGTERM');
        },
      });
    }

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', () => {
      if (requestId) activeProcesses.delete(requestId);
      resolve({ output, cancelled });
    });

    child.on('error', () => {
      if (requestId) activeProcesses.delete(requestId);
      resolve({ output: '', cancelled: false });
    });
  });
}

function getCliForProvider(provider: string): string | null {
  const cliMap: Record<string, string> = {
    'claude-code': 'claude',
    copilot: 'copilot',
    codex: 'codex',
    gemini: 'gemini',
    cursor: 'cursor',
    antigravity: 'antigravity',
    'roo-code': 'roo',
  };
  return cliMap[provider] || null;
}
