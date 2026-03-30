/**
 * Commentary Session Manager
 *
 * Orchestrates the JSONL watcher and Commentary AI service.
 * Manages the lifecycle of commentary sessions.
 */

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
    language?: string
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
      language
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

    // Notify webview that session started
    this.postMessage<CommentarySessionPayload>('COMMENTARY_SESSION_STARTED', {
      sessionId,
      workflowName,
    });

    // Start AI session first, then start watching
    try {
      await this.aiService.startSession(workflowName);
      this.watcher.start();
    } catch (error) {
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
