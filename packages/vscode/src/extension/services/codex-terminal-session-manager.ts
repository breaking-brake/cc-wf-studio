import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ExecutionSessionPayload } from '../../shared/types/messages';

type JsonObject = Record<string, unknown>;

/** Links a workflow run card to Codex's terminal and observes turn lifecycle only. */
export class CodexTerminalSessionManager {
  private terminal: vscode.Terminal | null = null;
  private terminalDisposable: vscode.Disposable | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private baseline = new Set<string>();
  private workspacePath = '';
  private sessionFile: string | null = null;
  private byteOffset = 0;
  private trailingLine = '';
  private webview: vscode.Webview | null = null;
  private state: ExecutionSessionPayload | null = null;

  snapshotSessionFiles(): Set<string> {
    return new Set(this.listSessionFiles());
  }

  start(
    workflowName: string,
    workspacePath: string,
    baseline: Set<string>,
    webview: vscode.Webview,
    terminal: vscode.Terminal
  ): string {
    this.stop(false);
    this.terminal = terminal;
    this.workspacePath = workspacePath;
    this.baseline = baseline;
    this.webview = webview;
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();
    this.state = {
      runId,
      sessionId: terminal.name,
      workflowName,
      provider: 'codex',
      status: 'waiting',
      startedAt: now,
      updatedAt: now,
    };
    this.postUpdate();
    this.interval = setInterval(() => this.poll(), 500);
    this.terminalDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) this.stop(true);
    });
    return runId;
  }

  focus(runId: string): void {
    if (this.state?.runId === runId && this.state.status !== 'ended') {
      this.terminal?.show(false);
    }
  }

  stop(markEnded = true): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.terminalDisposable?.dispose();
    this.terminalDisposable = null;
    this.terminal = null;
    this.sessionFile = null;
    this.byteOffset = 0;
    this.trailingLine = '';
    if (markEnded && this.state) {
      this.state = {
        ...this.state,
        status: 'ended',
        updatedAt: new Date().toISOString(),
      };
      this.postUpdate();
    }
    if (!markEnded) this.state = null;
  }

  dispose(): void {
    this.stop(false);
    this.webview = null;
  }

  private poll(): void {
    try {
      if (!this.sessionFile) this.detectNewSession();
      if (this.sessionFile) this.readNewEvents();
    } catch {
      // Codex creates and appends the transcript asynchronously.
    }
  }

  private detectNewSession(): void {
    const candidates = this.listSessionFiles()
      .filter((file) => !this.baseline.has(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    for (const candidate of candidates) {
      const firstLine = this.readFirstLine(candidate);
      if (!firstLine) continue;
      const entry = JSON.parse(firstLine) as JsonObject;
      const payload = entry.payload as JsonObject | undefined;
      if (entry.type !== 'session_meta' || payload?.cwd !== this.workspacePath) continue;
      this.sessionFile = candidate;
      if (this.state) {
        this.state = {
          ...this.state,
          sessionId: String(payload.id ?? path.basename(candidate, '.jsonl')),
          updatedAt: new Date().toISOString(),
        };
        this.postUpdate();
      }
      return;
    }
  }

  private listSessionFiles(): string[] {
    const files: string[] = [];
    for (const daysAgo of [0, 1]) {
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const directory = path.join(
        os.homedir(),
        '.codex',
        'sessions',
        String(date.getFullYear()),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      );
      if (!fs.existsSync(directory)) continue;
      for (const name of fs.readdirSync(directory)) {
        if (name.endsWith('.jsonl')) files.push(path.join(directory, name));
      }
    }
    return files;
  }

  private readFirstLine(file: string): string | null {
    const fd = fs.openSync(file, 'r');
    const chunks: Buffer[] = [];
    let position = 0;
    try {
      while (position < 1024 * 1024) {
        const buffer = Buffer.alloc(4096);
        const bytes = fs.readSync(fd, buffer, 0, buffer.length, position);
        if (bytes === 0) break;
        const chunk = buffer.subarray(0, bytes);
        const newline = chunk.indexOf(10);
        if (newline >= 0) {
          chunks.push(chunk.subarray(0, newline));
          return Buffer.concat(chunks).toString('utf8');
        }
        chunks.push(chunk);
        position += bytes;
      }
      return null;
    } finally {
      fs.closeSync(fd);
    }
  }

  private readNewEvents(): void {
    if (!this.sessionFile) return;
    const stat = fs.statSync(this.sessionFile);
    if (stat.size <= this.byteOffset) return;
    const fd = fs.openSync(this.sessionFile, 'r');
    const buffer = Buffer.alloc(stat.size - this.byteOffset);
    try {
      fs.readSync(fd, buffer, 0, buffer.length, this.byteOffset);
    } finally {
      fs.closeSync(fd);
    }
    this.byteOffset = stat.size;
    const lines = (this.trailingLine + buffer.toString('utf8')).split('\n');
    this.trailingLine = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as JsonObject;
        const payload = entry.payload as JsonObject | undefined;
        if (entry.type !== 'event_msg' || !payload) continue;
        if (payload.type === 'task_started') this.updateStatus('running');
        else if (payload.type === 'task_complete') this.updateStatus('waiting');
        else if (payload.type === 'turn_aborted') this.updateStatus('aborted');
        else if (payload.type === 'agent_message' && typeof payload.message === 'string') {
          this.updateLastActivity(payload.message);
        }
      } catch {
        // Ignore unknown transcript entries.
      }
    }
  }

  private updateStatus(status: ExecutionSessionPayload['status']): void {
    if (!this.state) return;
    this.state = {
      ...this.state,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'running' ? { lastActivity: undefined } : {}),
    };
    this.postUpdate();
  }

  private updateLastActivity(message: string): void {
    if (!this.state) return;
    const summary = message.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!summary) return;
    this.state = {
      ...this.state,
      updatedAt: new Date().toISOString(),
      lastActivity: { type: 'assistant', summary },
    };
    this.postUpdate();
  }

  private postUpdate(): void {
    if (this.state) {
      this.webview?.postMessage({ type: 'EXECUTION_SESSION_UPDATED', payload: this.state });
    }
  }
}

export const codexTerminalSessionManager = new CodexTerminalSessionManager();
