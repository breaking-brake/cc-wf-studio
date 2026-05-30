/**
 * `ccwf preview <file>` — open a read-only viewer of <file> in a local browser.
 *
 * Lighter sibling of `ccwf canvas`: serves only the bundled `overview.html`
 * (Mermaid + Markdown panes), with no WebSocket and no message-channel
 * emulation. The workflow JSON is injected into the page at boot, and the
 * server watches the file on disk — any change pushes a Server-Sent Events
 * reload to the open tabs.
 *
 * Use cases: remote SSH, GitHub Codespaces terminals, CI environments where
 * you just want to look at a workflow without VSCode.
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateWorkflow } from '@cc-wf-studio/core';
import { Command } from 'commander';
import { startPreviewServer } from '../preview/server.js';
import { watchWorkflowFile } from '../preview/watcher.js';
import { reachabilityNote } from '../utils/host-warning.js';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

interface PreviewOptions {
  port?: string;
  host?: string;
  keepAlive?: boolean;
}

const AUTO_SHUTDOWN_AFTER_MS = 30_000;

async function resolveWebviewDistDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // Compiled location: <pkg>/dist/commands/preview.js → ../webview/
  // Dev (tsx) location: <pkg>/src/commands/preview.ts → ../../../vscode/src/webview/dist/
  const candidates = [
    path.resolve(moduleDir, '../webview'),
    path.resolve(moduleDir, '../../../vscode/src/webview/dist'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, 'overview.html'));
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(
    `Could not find the bundled webview overview. Looked in:\n${candidates
      .map((c) => `  - ${c}`)
      .join('\n')}\nRun \`pnpm -F @cc-wf-studio/cli build\` first to populate dist/webview.`
  );
}

function openInBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  let args: string[];
  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {
      // Browser launch failed; the URL is already printed so the user can copy it.
    });
    child.unref();
  } catch {
    // Same as above — silent.
  }
}

async function readMigratedWorkflow(workflowPath: string): Promise<unknown> {
  const { workflow } = await loadWorkflowFromFile(workflowPath);
  return migrateWorkflow(workflow);
}

export function registerPreviewCommand(program: Command): void {
  program
    .command('preview')
    .description(
      'Open a read-only viewer for <file> (Mermaid + Markdown panes) in a local browser.'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option('--port <number>', 'Preferred port (default: ephemeral / 0).')
    .option('--host <address>', 'Bind host. Default 127.0.0.1; do not change for public networks.')
    .option(
      '--keep-alive',
      'Keep the server running after the browser tab is closed. By default the server shuts down 30s after the last viewer disconnects.',
      false
    )
    .action(async (file: string, options: PreviewOptions) => {
      try {
        const workflowAbsPath = path.resolve(file);
        const initialWorkflow = await readMigratedWorkflow(workflowAbsPath);

        const webviewDistDir = await resolveWebviewDistDir();
        const portOption = options.port ? Number(options.port) : 0;
        if (Number.isNaN(portOption)) {
          process.stderr.write(`error: --port must be a number, got '${options.port}'\n`);
          process.exit(2);
        }
        const locale = (process.env.LANG?.split('.')[0] ?? 'en').trim() || 'en';
        const autoShutdownAfterMs = options.keepAlive ? 0 : AUTO_SHUTDOWN_AFTER_MS;

        const server = await startPreviewServer({
          webviewDistDir,
          bootstrap: { workflow: initialWorkflow, locale },
          host: options.host,
          port: portOption,
          autoShutdownAfterMs,
          onAutoShutdown: () => {
            process.stdout.write(
              `\n[ccwf preview] Browser closed; auto-shutdown after ${AUTO_SHUTDOWN_AFTER_MS / 1000}s idle. Pass --keep-alive to disable.\n`
            );
            process.exit(0);
          },
        });

        // The SSE channel powers both auto-reload on file change and the
        // disconnect-detection that drives auto-shutdown. The page subscribes
        // unconditionally; both behaviours are baked in.
        const sseUrl = `http://${server.host}:${server.port}/${server.sessionId}/events`;
        server.setBootstrap({ workflow: initialWorkflow, locale, sseUrl });

        const watcher = watchWorkflowFile({
          filePath: workflowAbsPath,
          onChange: async () => {
            try {
              const next = await readMigratedWorkflow(workflowAbsPath);
              server.setBootstrap({ workflow: next, locale, sseUrl });
              server.broadcastWorkflowChanged();
              process.stdout.write(`[ccwf preview] Reloaded ${workflowAbsPath}\n`);
            } catch (error) {
              process.stderr.write(
                `[ccwf preview] Skipped reload (read failed): ${error instanceof Error ? error.message : String(error)}\n`
              );
            }
          },
        });

        const banner = [
          `ccwf preview listening at ${server.url}`,
          `  workflow:        ${workflowAbsPath}`,
          `  bind:            ${server.host}:${server.port}`,
          options.keepAlive
            ? `  auto-shutdown:   off (--keep-alive)`
            : `  auto-shutdown:   on (${AUTO_SHUTDOWN_AFTER_MS / 1000}s after last viewer leaves)`,
          '',
          'Read-only — saves in this view are disabled by design (use `ccwf canvas` for editing).',
          'Browser auto-reloads when the workflow file changes on disk.',
          reachabilityNote(server.host),
          'Press Ctrl+C to stop.',
        ].join('\n');
        process.stdout.write(`${banner}\n`);

        openInBrowser(server.url);

        // Coalesce repeated signals. Terminals deliver SIGINT to the whole
        // process group on Ctrl+C, and tooling that wraps the CLI (pnpm,
        // tsx, …) forwards SIGINT to its children too — so without a guard
        // the handler fires twice and we get a duplicated banner plus a
        // doomed second `server.close()` racing with the in-flight one.
        let shuttingDown = false;
        const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
          if (shuttingDown) return;
          shuttingDown = true;
          process.stdout.write(`\nReceived ${signal}, shutting down ccwf preview…\n`);
          watcher.close();
          try {
            await server.close();
          } catch (error) {
            process.stderr.write(
              `Shutdown error: ${error instanceof Error ? error.message : String(error)}\n`
            );
          }
          process.exit(0);
        };
        process.on('SIGINT', () => {
          void shutdown('SIGINT');
        });
        process.on('SIGTERM', () => {
          void shutdown('SIGTERM');
        });

        // Keep the process alive until a signal arrives.
        await new Promise<void>(() => {
          /* never resolves */
        });
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });
}
