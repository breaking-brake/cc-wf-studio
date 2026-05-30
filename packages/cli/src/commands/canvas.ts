/**
 * `ccwf canvas <file>` — open the full editable cc-wf-studio canvas in a browser.
 *
 * Starts a localhost HTTP + WebSocket server that serves the bundled webview
 * and emulates the VSCode message channel for the single workflow file passed
 * on the command line. The browser-side workflow can be edited and saved; the
 * CLI process persists changes back to the same file through the WebSocket
 * bridge.
 *
 * Status: experimental — the long-running mirror of the VSCode extension's
 * editor. Most VSCode-API-bound features (Slack share, Claude API upload,
 * external IDE export buttons, MCP server management) deliberately return
 * `CANVAS_UNSUPPORTED` because they have no analogue on a plain browser /
 * Node.js process. For "just view a workflow" use `ccwf preview` (lighter,
 * read-only, planned in a follow-up).
 *
 * Security model: 127.0.0.1 only + UUID path slug. NOT designed for network
 * exposure — the warning is printed on startup.
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { createCanvasHandlers } from '../canvas/handlers.js';
import { startCanvasServer } from '../canvas/server.js';
import { reachabilityNote } from '../utils/host-warning.js';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

interface CanvasOptions {
  port?: string;
  host?: string;
}

/**
 * Resolve the directory that contains the bundled webview (`index.html` +
 * `assets/*`). When `ccwf` is invoked from a tarball install the webview lives
 * at `dist/webview/` next to the compiled CLI; when invoked via `tsx src/cli.ts`
 * during development the build script syncs it to the same place.
 */
async function resolveWebviewDistDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // The compiled entry lives at `<pkg>/dist/commands/canvas.js`, so the
  // webview is two levels up: `<pkg>/dist/webview/`.
  const candidates = [
    path.resolve(moduleDir, '../webview'),
    // Development fallback: when running via tsx, the dist might not have
    // been synced yet. Reach into packages/vscode/src/webview/dist directly.
    path.resolve(moduleDir, '../../../vscode/src/webview/dist'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, 'index.html'));
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(
    `Could not find the bundled webview. Looked in:\n${candidates.map((c) => `  - ${c}`).join('\n')}\nRun \`pnpm -F @cc-wf-studio/cli build\` first to populate dist/webview.`
  );
}

function openInBrowser(url: string): void {
  // Cross-platform browser launch without depending on the `open` package.
  // Failures are non-fatal: we just print the URL and let the user click it.
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

export function registerCanvasCommand(program: Command): void {
  program
    .command('canvas')
    .description(
      'Open the full editable cc-wf-studio canvas for <file> in a local browser (experimental). Saves write back to the same file.'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option('--port <number>', 'Preferred port (default: ephemeral / 0).')
    .option('--host <address>', 'Bind host. Default 127.0.0.1; do not change for public networks.')
    .action(async (file: string, options: CanvasOptions) => {
      try {
        // Validate the file is parseable JSON up-front so the user gets a clear
        // error instead of a confused empty canvas in the browser.
        await loadWorkflowFromFile(file);

        const webviewDistDir = await resolveWebviewDistDir();
        const handlers = createCanvasHandlers({ workflowPath: file });
        const portOption = options.port ? Number(options.port) : 0;
        if (Number.isNaN(portOption)) {
          process.stderr.write(`error: --port must be a number, got '${options.port}'\n`);
          process.exit(2);
        }
        const server = await startCanvasServer({
          webviewDistDir,
          handlers,
          host: options.host,
          port: portOption,
          bootstrapConfig: { locale: process.env.LANG?.split('.')[0] ?? 'en' },
        });

        const banner = [
          `ccwf canvas server listening at ${server.url}`,
          `  workflow: ${path.resolve(file)}`,
          `  bind:     ${server.host}:${server.port}`,
          '',
          'Save buttons in the canvas will write back to the workflow file.',
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
          process.stdout.write(`\nReceived ${signal}, shutting down ccwf canvas…\n`);
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
