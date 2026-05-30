/**
 * Commentary Session Manager
 *
 * Orchestrates the JSONL watcher and Commentary AI service.
 * Manages the lifecycle of commentary sessions.
 */

import * as fs from 'node:fs';
import * as vscode from 'vscode';
import type {
  CommentaryErrorPayload,
  CommentaryHistoryEntry,
  CommentaryProvider,
  CommentarySessionPayload,
  CommentaryUpdatePayload,
  CopilotModel,
} from '../../shared/types/messages';
import { log } from '../extension';
import { CommentaryAiService } from './commentary-ai-service';
import { CommentaryJsonlWatcher } from './commentary-jsonl-watcher';

export class CommentarySessionManager {
  private watcher: CommentaryJsonlWatcher | null = null;
  private aiService: CommentaryAiService | null = null;
  private terminalDisposable: vscode.Disposable | null = null;
  private currentSessionId: string | null = null;
  private webview: vscode.Webview | null = null;

  /**
   * Start a commentary session
   */
  async startCommentary(
    sessionId: string,
    workflowName: string,
    workspacePath: string,
    webview: vscode.Webview,
    terminal?: vscode.Terminal,
    provider?: CommentaryProvider,
    copilotModel?: CopilotModel,
    language?: string,
    slashCommandPath?: string
  ): Promise<void> {
    // Stop any existing session
    this.stopCommentary();

    this.currentSessionId = sessionId;
    this.webview = webview;

    log('INFO', 'Starting commentary session', {
      sessionId,
      workflowName,
      provider: provider ?? 'claude-code',
    });

    // Create AI service with provider
    this.aiService = new CommentaryAiService(
      (text, eventType) => {
        this.postMessage<CommentaryUpdatePayload>('COMMENTARY_UPDATE', {
          text,
          timestamp: new Date().toISOString(),
          eventType,
        });
      },
      provider ?? 'claude-code',
      copilotModel,
      language,
      (isProcessing) => {
        this.postMessage<{ isProcessing: boolean }>('COMMENTARY_PROCESSING', { isProcessing });
      }
    );

    // Create JSONL watcher
    this.watcher = new CommentaryJsonlWatcher(sessionId, workspacePath, (events) => {
      if (this.aiService) {
        this.aiService.sendEvents(events);
      }
    });

    // Watch for terminal close
    if (terminal) {
      this.terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === terminal) {
          log('INFO', 'Terminal closed, stopping commentary');
          this.stopCommentary();
        }
      });
    }

    // Read slash command content if path is provided
    let workflowContext: string | undefined;
    if (slashCommandPath) {
      try {
        workflowContext = fs.readFileSync(slashCommandPath, 'utf-8');
      } catch {
        log('WARN', 'Failed to read slash command file for commentary context', {
          path: slashCommandPath,
        });
      }
    }

    // Start AI session first, then start watching
    try {
      await this.aiService.startSession(workflowName, workflowContext);
      this.watcher.start();

      // Notify webview only after startup succeeds
      this.postMessage<CommentarySessionPayload>('COMMENTARY_SESSION_STARTED', {
        sessionId,
        workflowName,
      });
    } catch (error) {
      this.currentSessionId = null;
      log('ERROR', 'Failed to start commentary', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.postMessage<CommentaryErrorPayload>('COMMENTARY_ERROR', {
        message: error instanceof Error ? error.message : 'Failed to start commentary',
      });
    }
  }

  /**
   * Stop the current commentary session
   */
  stopCommentary(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }

    if (this.aiService) {
      this.aiService.stopSession();
      this.aiService = null;
    }

    if (this.terminalDisposable) {
      this.terminalDisposable.dispose();
      this.terminalDisposable = null;
    }

    if (this.currentSessionId) {
      this.postMessage<void>('COMMENTARY_SESSION_ENDED', undefined);
      this.currentSessionId = null;
    }
  }

  /**
   * Get the conversation history from the current AI service
   */
  getHistory(): CommentaryHistoryEntry[] {
    return this.aiService?.getHistory() ?? [];
  }

  /**
   * Check if a commentary session is active
   */
  isActive(): boolean {
    return this.currentSessionId !== null;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stopCommentary();
    this.webview = null;
  }

  private postMessage<T>(type: string, payload: T): void {
    try {
      this.webview?.postMessage({ type, payload });
    } catch (error) {
      log('ERROR', 'Failed to post commentary message', {
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
