/**
 * `ccwf run <file>` — for now, a thin wrapper over `ccwf export`.
 *
 * Today this just calls `runExport` and appends a "next step" hint pointing
 * the user at Claude Code (or the chosen agent). In a later phase, `run` will
 * spawn `claude` itself and let the agent perform the skill export +
 * execution. The contract for `<file>` and the flags (`--agent`, `--cwd`,
 * `--overwrite`) is intentionally identical to `ccwf export` so the future
 * change is backward-compatible.
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { Command } from 'commander';
import { findBinaryInPath } from '../utils/find-binary.js';
import { WorkflowLoadError } from '../utils/load-workflow.js';
import { asSupportedAgent, runExport } from './export.js';

interface CommanderRunOptions {
  agent: string;
  overwrite: boolean;
  cwd?: string;
  launch: boolean;
}

/**
 * Next-step hints, one per agent. Format is intentionally uniform:
 *   "<how to invoke the skill> in <AgentName>. If the skill isn't found,
 *    restart <AgentName> to pick up the new file."
 *
 * Most agents pick up skill files added under `<root>/skills/` automatically
 * — Claude Code documents live change detection, the CLI-based agents
 * re-read their skill directory on each invocation. The restart fallback
 * covers the case where the top-level skills directory didn't exist when
 * the agent started (Claude Code's documented gotcha) or the agent caches
 * its skill listing across sessions.
 */
const NEXT_STEP_HINTS: Record<string, (slash: string) => string> = {
  'claude-code': (slash) =>
    `run \`/${slash}\` in Claude Code. If the skill isn't found, restart Claude Code to pick up the new file.`,
  antigravity: (slash) =>
    `trigger the "${slash}" skill in Antigravity. If the skill isn't found, restart Antigravity to pick up the new file.`,
  codex: (slash) =>
    `run \`$${slash}\` in Codex CLI. If the skill isn't found, restart Codex CLI to pick up the new file.`,
  copilot: (slash) =>
    `run \`/${slash}\` in Copilot CLI. If the skill isn't found, restart Copilot CLI to pick up the new file.`,
  cursor: (slash) =>
    `trigger the "${slash}" skill in Cursor. If the skill isn't found, restart Cursor to pick up the new file.`,
  gemini: (slash) =>
    `run \`${slash}\` in Gemini CLI. If the skill isn't found, restart Gemini CLI to pick up the new file.`,
  'roo-code': (slash) =>
    `run \`/${slash}\` in Zoo Code. If the skill isn't found, restart Zoo Code to pick up the new file.`,
};

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description(
      'Materialise the workflow (same as ccwf export) and print follow-up instructions for the target agent.'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option(
      '--agent <name>',
      'Target agent (claude-code | antigravity | codex | copilot | cursor | gemini | roo-code). roo-code targets Zoo Code, the maintained fork of the sunset Roo Code.',
      'claude-code'
    )
    .option('--overwrite', 'Overwrite existing files instead of erroring.', false)
    .option(
      '--cwd <dir>',
      'Output root. Defaults to process.cwd(). Useful for tests / scripted runs.'
    )
    .option(
      '--launch',
      'After writing files, also spawn the agent CLI (best-effort, claude-code only for now).',
      false
    )
    .action(async (file: string, options: CommanderRunOptions) => {
      try {
        const agent = asSupportedAgent(options.agent);
        const result = await runExport({
          file,
          agent,
          overwrite: options.overwrite,
          cwd: options.cwd,
        });

        process.stdout.write(`✓ Wrote ${result.writtenPaths.length} file(s):\n`);
        for (const writtenPath of result.writtenPaths) {
          process.stdout.write(`  - ${path.relative(result.rootDir, writtenPath)}\n`);
        }

        const hint = NEXT_STEP_HINTS[agent](result.slashName);
        // Each hint ends in its own period; no trailing dot here.
        process.stdout.write(`\nNext: in ${result.rootDir}, ${hint}\n`);

        if (options.launch) {
          if (agent !== 'claude-code') {
            process.stderr.write(
              `warn: --launch is currently only supported for --agent claude-code. Skipping launch.\n`
            );
            return;
          }
          const claudeBin = await findBinaryInPath('claude');
          if (!claudeBin) {
            process.stderr.write(
              `warn: --launch requested but \`claude\` was not found on PATH. Files were written; please launch Claude Code manually and run /${result.slashName}.\n`
            );
            return;
          }
          process.stdout.write(`\nLaunching: ${claudeBin} (cwd ${result.rootDir})\n`);
          const child = spawn(claudeBin, [], {
            cwd: result.rootDir,
            stdio: 'inherit',
            shell: false,
          });
          await new Promise<void>((resolve) => {
            child.on('exit', (code) => {
              if (typeof code === 'number' && code !== 0) {
                process.exitCode = code;
              }
              resolve();
            });
            child.on('error', (error) => {
              process.stderr.write(`error: failed to launch claude: ${error.message}\n`);
              process.exitCode = 1;
              resolve();
            });
          });
        }
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
