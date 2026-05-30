/**
 * Debounced filesystem watcher for `ccwf preview --watch`.
 *
 * Wraps `fs.watch` (no extra dependency) with a small trailing debounce so that
 * editors that write atomically (rename-replace, write-truncate-then-fill) only
 * trigger one downstream callback per save. `fs.watch` is famously inconsistent
 * across platforms — we keep this conservative: ignore filename mismatches,
 * tolerate transient ENOENT during the rename, and re-arm the watcher on its
 * own `close`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WorkflowWatcherOptions {
  /** Absolute path to the workflow file to watch. */
  filePath: string;
  /** Trailing debounce in ms before invoking onChange. */
  debounceMs?: number;
  /** Invoked after each debounced change. */
  onChange(): void;
}

export interface WorkflowWatcherHandle {
  close(): void;
}

export function watchWorkflowFile(options: WorkflowWatcherOptions): WorkflowWatcherHandle {
  const filePath = path.resolve(options.filePath);
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const debounceMs = options.debounceMs ?? 100;

  let closed = false;
  let watcher: fs.FSWatcher | null = null;
  let pendingTimer: NodeJS.Timeout | null = null;

  const trigger = (): void => {
    if (closed) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (!closed) options.onChange();
    }, debounceMs);
  };

  const arm = (): void => {
    if (closed) return;
    try {
      watcher = fs.watch(dir, { persistent: false }, (_event, changedName) => {
        // Some platforms return `null` for `filename`; treat that as a
        // potential match rather than ignoring the event (better than missing
        // a save).
        if (changedName === null || changedName === basename) {
          trigger();
        }
      });
      watcher.on('error', () => {
        try {
          watcher?.close();
        } catch {
          // ignore
        }
        watcher = null;
        if (!closed) {
          // Re-arm after a short delay; editors that rmdir + recreate a
          // workdir would otherwise leave us stuck.
          setTimeout(arm, 250);
        }
      });
      watcher.on('close', () => {
        watcher = null;
        if (!closed) {
          setTimeout(arm, 250);
        }
      });
    } catch (error) {
      // Watching is a best-effort optimisation; if the directory is gone, just
      // log and stop trying.
      console.warn(
        `[ccwf preview] Failed to watch ${dir}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  arm();

  return {
    close() {
      closed = true;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      try {
        watcher?.close();
      } catch {
        // ignore
      }
      watcher = null;
    },
  };
}
