import * as vscode from 'vscode';
import type { ExecutionSessionPayload } from '../../shared/types/messages';
import { CommentaryJsonlWatcher } from './commentary-jsonl-watcher';

/**
 * Minimal execution-observability PoC.
 *
 * Claude Code is launched with a known session id. Its local JSONL transcript
 * supplies activity while VS Code terminal lifecycle supplies the coarse run
 * lifecycle. This intentionally does not claim node-level completion.
 */
export class ExecutionSessionManager {
  private watcher: CommentaryJsonlWatcher | null = null;
  private terminalDisposable: vscode.Disposable | null = null;
  private session: ExecutionSessionPayload | null = null;
  private webview: vscode.Webview | null = null;
  private terminal: vscode.Terminal | null = null;

  start(
    runId: string,
    sessionId: string,
    workflowName: string,
    workspacePath: string,
    webview: vscode.Webview,
    terminal: vscode.Terminal
  ): void {
    this.stop(false);
    this.webview = webview;
    this.terminal = terminal;
    const now = new Date().toISOString();
    this.session = {
      runId,
      sessionId,
      workflowName,
      provider: 'claude-code',
      status: 'running',
      startedAt: now,
      updatedAt: now,
    };
    this.postUpdate();

    this.watcher = new CommentaryJsonlWatcher(
      sessionId,
      workspacePath,
      (events) => {
        const latest = events.at(-1);
        if (!latest || !this.session) return;
        this.session = {
          ...this.session,
          updatedAt: latest.timestamp,
          lastActivity: {
            type: latest.type,
            summary: latest.content.replace(/\s+/g, ' ').slice(0, 160),
          },
        };
        this.postUpdate();
      },
      500,
      (status, timestamp) => {
        if (!this.session || this.session.status === 'ended') return;
        this.session = {
          ...this.session,
          status,
          updatedAt: timestamp,
          ...(status === 'running' ? { lastActivity: undefined } : {}),
        };
        this.postUpdate();
      }
    );
    this.watcher.start();

    this.terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) this.stop(true);
    });
  }

  focus(runId: string): void {
    if (this.session?.runId === runId && this.session.status !== 'ended') {
      this.terminal?.show(false);
    }
  }

  stop(markEnded = true): void {
    this.watcher?.stop();
    this.watcher = null;
    this.terminalDisposable?.dispose();
    this.terminalDisposable = null;
    if (markEnded && this.session) {
      this.session = {
        ...this.session,
        status: 'ended',
        updatedAt: new Date().toISOString(),
      };
      this.postUpdate();
    }
    this.terminal = null;
    if (!markEnded) this.session = null;
  }

  dispose(): void {
    this.stop(false);
    this.webview = null;
  }

  private postUpdate(): void {
    if (this.session) {
      this.webview?.postMessage({ type: 'EXECUTION_SESSION_UPDATED', payload: this.session });
    }
  }
}
