/**
 * Commentary AI Service
 *
 * Sends JSONL event batches to Claude (haiku) for real-time commentary.
 * Uses `claude -p --model haiku --output-format json` for initial prompt,
 * then `--resume` for subsequent events.
 *
 * Supports two providers:
 * - 'claude-code': Uses Claude CLI with --resume for session management
 * - 'copilot': Uses VS Code LM API with full history replay each turn
 */

import * as vscode from 'vscode';
import type {
  CommentaryHistoryEntry,
  CommentaryProvider,
  CopilotModel,
} from '../../shared/types/messages';
import { log } from '../extension';
import { getClaudeSpawnCommand } from './claude-cli-path';
import type { CommentaryEvent } from './commentary-jsonl-watcher';
import { selectCopilotModel } from './vscode-lm-service';

// Lazy import nano-spawn to avoid issues
let nanoSpawnModule: typeof import('nano-spawn') | null = null;
async function getNanoSpawn() {
  if (!nanoSpawnModule) {
    nanoSpawnModule = await import('nano-spawn');
  }
  return nanoSpawnModule.default;
}

const SYSTEM_PROMPT = `You are a workflow commentary AI. You observe real-time events from an AI agent executing a workflow and provide brief commentary. Rules:
- Respond in {LANGUAGE}
- Provide 1-2 sentence commentary for each batch of events
- Explain what the agent is currently doing and why
- Be concise and informative
- Output only the commentary text, no JSON wrapping
- Do NOT ask for events or input — events are sent to you automatically`;

const DEBOUNCE_MS = 3000;

export class CommentaryAiService {
  private commentarySessionId: string | null = null;
  private pendingEvents: CommentaryEvent[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onCommentary: (text: string, eventType: CommentaryEvent['type']) => void;
  private stopped = false;
  private history: CommentaryHistoryEntry[] = [];
  private provider: CommentaryProvider;
  private copilotModel?: CopilotModel;
  private language: string;

  constructor(
    onCommentary: (text: string, eventType: CommentaryEvent['type']) => void,
    provider: CommentaryProvider = 'claude-code',
    copilotModel?: CopilotModel,
    language?: string
  ) {
    this.onCommentary = onCommentary;
    this.provider = provider;
    this.copilotModel = copilotModel;
    this.language = language || 'English';
  }

  /**
   * Start a new commentary session with workflow context
   */
  async startSession(workflowName: string, workflowContext?: string): Promise<void> {
    this.stopped = false;
    this.commentarySessionId = null;
    this.history = [];

    const systemPrompt = SYSTEM_PROMPT.replace('{LANGUAGE}', this.language);
    const contextSection = workflowContext
      ? `\n\nWorkflow definition (slash command that the agent is executing):\n---\n${workflowContext}\n---`
      : '';
    const prompt = `${systemPrompt}\n\nWorkflow name: "${workflowName}"${contextSection}\nSay a single short sentence announcing that you are starting commentary for this workflow.`;

    try {
      const result = await this.callAi(prompt);
      if (result.sessionId) {
        this.commentarySessionId = result.sessionId;
      }

      // Record history
      this.history.push({
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      });
      if (result.text) {
        this.history.push({
          role: 'assistant',
          content: result.text,
          timestamp: new Date().toISOString(),
        });
        this.onCommentary(result.text, 'assistant');
      }

      log('INFO', 'Commentary AI session started', {
        sessionId: this.commentarySessionId,
        provider: this.provider,
      });
    } catch (error) {
      log('ERROR', 'Failed to start commentary AI session', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Queue events for commentary (debounced)
   */
  sendEvents(events: CommentaryEvent[]): void {
    if (this.stopped) return;

    this.pendingEvents.push(...events);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushEvents();
    }, DEBOUNCE_MS);
  }

  /**
   * Stop the commentary session
   */
  stopSession(): void {
    this.stopped = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingEvents = [];
    this.commentarySessionId = null;
    log('INFO', 'Commentary AI session stopped');
  }

  /**
   * Get the conversation history
   */
  getHistory(): CommentaryHistoryEntry[] {
    return [...this.history];
  }

  private async flushEvents(): Promise<void> {
    if (this.stopped || this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    // Determine primary event type
    const primaryType =
      events.find((e) => e.type === 'error')?.type ??
      events.find((e) => e.type === 'tool_use')?.type ??
      'assistant';

    // Build prompt from events
    const eventSummary = events.map((e) => `[${e.type}] ${e.content}`).join('\n');

    const prompt = `Agent activity update:\n${eventSummary}\n\nProvide brief commentary.`;

    try {
      const result = await this.callAi(prompt);
      if (result.sessionId && !this.commentarySessionId) {
        this.commentarySessionId = result.sessionId;
      }

      // Record history
      this.history.push({
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      });
      if (result.text) {
        this.history.push({
          role: 'assistant',
          content: result.text,
          timestamp: new Date().toISOString(),
        });
        this.onCommentary(result.text, primaryType);
      }
    } catch (error) {
      log('ERROR', 'Commentary AI call failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Route AI call to the appropriate provider
   */
  private async callAi(prompt: string): Promise<{ text: string; sessionId?: string }> {
    if (this.provider === 'copilot') {
      return this.callVsCodeLm(prompt);
    }
    return this.callClaude(prompt);
  }

  /**
   * Call Claude CLI with --resume support
   */
  private async callClaude(prompt: string): Promise<{ text: string; sessionId?: string }> {
    const nanoSpawn = await getNanoSpawn();
    const args = ['-p', '-', '--model', 'haiku', '--output-format', 'json'];

    if (this.commentarySessionId) {
      args.push('--resume', this.commentarySessionId);
    }

    const spawnCmd = await getClaudeSpawnCommand(args);

    const subprocess = nanoSpawn(spawnCmd.command, spawnCmd.args, {
      timeout: 30000,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const result = await subprocess;

    // Parse JSON output
    try {
      const parsed = JSON.parse(result.stdout);
      return {
        text: parsed.result ?? parsed.content ?? result.stdout.trim(),
        sessionId: parsed.session_id ?? this.commentarySessionId ?? undefined,
      };
    } catch {
      // If not JSON, use raw output
      return { text: result.stdout.trim() };
    }
  }

  /**
   * Call VS Code LM API with full history replay
   */
  private async callVsCodeLm(prompt: string): Promise<{ text: string; sessionId?: string }> {
    const model = await selectCopilotModel(this.copilotModel);
    if (!model) {
      throw new Error('Copilot model not available for commentary');
    }

    // Build messages from history
    // System prompt is passed as the first User message (LM API has no System message type)
    const messages: vscode.LanguageModelChatMessage[] = [];

    for (const entry of this.history) {
      if (entry.role === 'user') {
        messages.push(vscode.LanguageModelChatMessage.User(entry.content));
      } else {
        messages.push(vscode.LanguageModelChatMessage.Assistant(entry.content));
      }
    }

    // Add current prompt
    messages.push(vscode.LanguageModelChatMessage.User(prompt));

    const cts = new vscode.CancellationTokenSource();
    const timeoutId = setTimeout(() => cts.cancel(), 30000);

    try {
      const response = await model.sendRequest(messages, {}, cts.token);

      let accumulatedText = '';
      for await (const fragment of response.text) {
        if (cts.token.isCancellationRequested) break;
        accumulatedText += fragment;
      }

      return { text: accumulatedText.trim() };
    } finally {
      clearTimeout(timeoutId);
      cts.dispose();
    }
  }
}
