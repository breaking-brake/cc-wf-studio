/**
 * Commentary AI Service
 *
 * Sends JSONL event batches to Claude (haiku) for real-time commentary.
 * Uses `claude -p --model haiku --output-format json` for initial prompt,
 * then `--resume` for subsequent events.
 */

import nanoSpawn from 'nano-spawn';
import { log } from '../extension';
import { getClaudeSpawnCommand } from './claude-cli-path';
import type { CommentaryEvent } from './commentary-jsonl-watcher';

const SYSTEM_PROMPT = `You are a workflow commentary AI. You observe real-time events from an AI agent executing a workflow and provide brief commentary. Rules:
- Respond in the user's configured language
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

  constructor(onCommentary: (text: string, eventType: CommentaryEvent['type']) => void) {
    this.onCommentary = onCommentary;
  }

  /**
   * Start a new commentary session with workflow context
   */
  async startSession(workflowName: string): Promise<void> {
    this.stopped = false;
    this.commentarySessionId = null;

    const prompt = `${SYSTEM_PROMPT}\n\nWorkflow name: "${workflowName}"\nSay a single short sentence announcing that you are starting commentary for this workflow.`;

    try {
      const result = await this.callClaude(prompt);
      if (result.sessionId) {
        this.commentarySessionId = result.sessionId;
      }
      if (result.text) {
        this.onCommentary(result.text, 'assistant');
      }
      log('INFO', 'Commentary AI session started', {
        sessionId: this.commentarySessionId,
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
      const result = await this.callClaude(prompt);
      if (result.sessionId && !this.commentarySessionId) {
        this.commentarySessionId = result.sessionId;
      }
      if (result.text) {
        this.onCommentary(result.text, primaryType);
      }
    } catch (error) {
      log('ERROR', 'Commentary AI call failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async callClaude(prompt: string): Promise<{ text: string; sessionId?: string }> {
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
}
