/**
 * Commentary AI - JSONL File Watcher
 *
 * Watches Claude Code JSONL session files for new events
 * and notifies callbacks with filtered meaningful events.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { log } from '../extension';

/** Event types we care about for commentary */
export type CommentaryEventType = 'assistant' | 'tool_use' | 'error';

/** Parsed JSONL event */
export interface CommentaryEvent {
  type: CommentaryEventType;
  content: string;
  timestamp: string;
}

export type CommentaryEventCallback = (events: CommentaryEvent[]) => void;

/**
 * Resolve the JSONL file path for a given session ID.
 * Claude CLI stores session data at ~/.claude/projects/{encoded-path}/{sessionId}.jsonl
 */
function resolveJsonlPath(sessionId: string, workspacePath: string): string {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  const jsonlFilename = `${sessionId}.jsonl`;

  // Search all project directories for the JSONL file by session ID (unique).
  // This avoids guessing Claude CLI's path encoding rules.
  try {
    const dirs = fs.readdirSync(projectsDir);
    for (const dir of dirs) {
      const candidate = path.join(projectsDir, dir, jsonlFilename);
      if (fs.existsSync(candidate)) {
        log('DEBUG', 'Found JSONL file by scan', { dir, candidate });
        return candidate;
      }
    }
  } catch {
    // Fall through to best-guess path
  }

  // Fallback: best-guess encoding (replace / and _ with -)
  const encodedPath = workspacePath.replace(/[/_]/g, '-');
  return path.join(projectsDir, encodedPath, jsonlFilename);
}

/**
 * Watch a JSONL file for new lines and filter meaningful events
 */
export class CommentaryJsonlWatcher {
  private interval: ReturnType<typeof setInterval> | null = null;
  private byteOffset = 0;
  private resolvedJsonlPath: string | null = null;
  private readonly sessionId: string;
  private readonly workspacePath: string;
  private readonly callback: CommentaryEventCallback;
  private readonly pollIntervalMs: number;

  constructor(
    sessionId: string,
    workspacePath: string,
    callback: CommentaryEventCallback,
    pollIntervalMs = 500
  ) {
    this.sessionId = sessionId;
    this.workspacePath = workspacePath;
    this.callback = callback;
    this.pollIntervalMs = pollIntervalMs;

    log('INFO', 'CommentaryJsonlWatcher initialized', {
      sessionId,
    });
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    log('INFO', 'CommentaryJsonlWatcher started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    log('INFO', 'CommentaryJsonlWatcher stopped');
  }

  private getJsonlPath(): string | null {
    if (this.resolvedJsonlPath && fs.existsSync(this.resolvedJsonlPath)) {
      return this.resolvedJsonlPath;
    }
    // Re-scan for the file (it may have been created since last check)
    this.resolvedJsonlPath = resolveJsonlPath(this.sessionId, this.workspacePath);
    if (fs.existsSync(this.resolvedJsonlPath)) {
      log('INFO', 'CommentaryJsonlWatcher found JSONL file', {
        path: this.resolvedJsonlPath,
      });
      return this.resolvedJsonlPath;
    }
    return null;
  }

  private poll(): void {
    try {
      const jsonlPath = this.getJsonlPath();
      if (!jsonlPath) return;

      const stat = fs.statSync(jsonlPath);
      if (stat.size <= this.byteOffset) return;

      // Read new bytes
      const fd = fs.openSync(jsonlPath, 'r');
      const buffer = Buffer.alloc(stat.size - this.byteOffset);
      fs.readSync(fd, buffer, 0, buffer.length, this.byteOffset);
      fs.closeSync(fd);

      this.byteOffset = stat.size;

      // Parse new lines
      const newLines = buffer.toString('utf-8').split('\n').filter(Boolean);
      const events: CommentaryEvent[] = [];

      for (const line of newLines) {
        try {
          const parsed = JSON.parse(line);
          const event = this.filterEvent(parsed);
          if (event) events.push(event);
        } catch {
          // Skip malformed lines
        }
      }

      if (events.length > 0) {
        log('DEBUG', 'CommentaryJsonlWatcher detected events', {
          count: events.length,
          types: events.map((e) => e.type),
        });
        this.callback(events);
      }
    } catch (error) {
      // File may not exist yet; ignore
      log('DEBUG', 'CommentaryJsonlWatcher poll error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Filter and extract meaningful events from JSONL entries
   */
  private filterEvent(entry: Record<string, unknown>): CommentaryEvent | null {
    const type = entry.type as string | undefined;
    const timestamp = new Date().toISOString();

    if (type === 'assistant') {
      // Extract text from assistant message
      const message = entry.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (typeof content === 'string' && content.trim()) {
        return { type: 'assistant', content: content.substring(0, 2000), timestamp };
      }
      // Content may be an array of content blocks
      if (Array.isArray(content)) {
        const textBlocks = content
          .filter(
            (block: Record<string, unknown>) =>
              block.type === 'text' && typeof block.text === 'string'
          )
          .map((block: Record<string, unknown>) => block.text as string)
          .join('\n');
        if (textBlocks.trim()) {
          return { type: 'assistant', content: textBlocks.substring(0, 2000), timestamp };
        }
        // Check for tool_use blocks
        const toolBlocks = content.filter(
          (block: Record<string, unknown>) => block.type === 'tool_use'
        );
        if (toolBlocks.length > 0) {
          const toolDescriptions = toolBlocks
            .map((block: Record<string, unknown>) => {
              const name = block.name as string;
              const input = block.input as Record<string, unknown> | undefined;
              if (!input) return name;

              switch (name) {
                case 'Bash':
                  return input.description
                    ? `${name}: ${input.description}`
                    : input.command
                      ? `${name}: ${(input.command as string).substring(0, 200)}`
                      : name;
                case 'Read':
                  return input.file_path ? `${name}: ${input.file_path}` : name;
                case 'Glob':
                case 'Grep':
                  return input.pattern ? `${name}: ${input.pattern}` : name;
                case 'Edit':
                case 'Write':
                  return input.file_path ? `${name}: ${input.file_path}` : name;
                case 'Agent':
                  return input.description
                    ? `${name}(${input.subagent_type || 'general'}): ${input.description}`
                    : name;
                default:
                  return name;
              }
            })
            .join('\n');
          return { type: 'tool_use', content: toolDescriptions, timestamp };
        }
      }
    }

    if (type === 'error') {
      const errorMsg =
        typeof entry.error === 'string'
          ? entry.error
          : (entry.error as Record<string, unknown>)?.message;
      if (typeof errorMsg === 'string') {
        return { type: 'error', content: errorMsg.substring(0, 300), timestamp };
      }
    }

    return null;
  }
}
