/**
 * `ccwf tour <file>` — generate a guided tour for a workflow by launching an
 * AI agent that reads the JSON, produces a `tour` array, and writes it back
 * into the same file.
 *
 * Unlike the VSCode flow (which edits the live canvas via the MCP server), the
 * CLI works directly on the file: the agent uses its own read/write tools, so
 * no MCP server is needed. The contract mirrors `ccwf run` (`<file>`,
 * `--agent`). When `--agent` is omitted and the terminal is interactive, the
 * user is prompted to choose among the agent CLIs found on PATH.
 */

import { spawn } from 'node:child_process';
import * as readline from 'node:readline';
import { Command } from 'commander';
import { findBinaryInPath } from '../utils/find-binary.js';
import { loadWorkflowFromFile, WorkflowLoadError } from '../utils/load-workflow.js';

interface CommanderTourOptions {
  agent?: string;
}

interface Launcher {
  label: string;
  bin: string;
  args: (prompt: string) => string[];
}

/**
 * Agents that can be launched from a terminal with an inline prompt. IDE-only
 * agents (antigravity / cursor / roo-code) have no headless CLI and are not
 * supported here. Order matters: it is the picker order and the
 * non-interactive preference order (Claude Code first).
 */
const LAUNCHERS: Record<string, Launcher> = {
  'claude-code': { label: 'Claude Code', bin: 'claude', args: (p) => [p] },
  codex: { label: 'Codex CLI', bin: 'codex', args: (p) => [p] },
  copilot: { label: 'Copilot CLI', bin: 'copilot', args: (p) => ['-i', p, '--allow-all-tools'] },
  gemini: { label: 'Gemini CLI', bin: 'gemini', args: (p) => ['-i', p] },
};

const SUPPORTED = Object.keys(LAUNCHERS).join(' | ');

function buildTourPrompt(absolutePath: string): string {
  return [
    'Add a guided "tour" to the CC Workflow Studio workflow JSON file at:',
    `  ${absolutePath}`,
    '',
    'Steps:',
    '1. Read the file. It contains "nodes" and "connections".',
    '2. Understand the flow: the start node, the main path through "connections", branches (ifElse / switch / single-select askUserQuestion), sub-agent / skill / mcp steps, the core output step(s), and the end node(s).',
    '3. Add a top-level "tour" array (a sibling of "nodes" / "connections"). Each entry is:',
    '   { "order": 1, "title": "...", "description": "what these nodes do and why", "nodeIds": ["start-1"], "languageLesson": "optional concept note" }',
    '   - Scale the step count to the workflow size: roughly one step per meaningful node or tightly-coupled group of nodes. Small workflows (<=6 nodes) -> about one step per node; larger workflows -> group related nodes so the tour stays around 8-15 steps.',
    '   - "order" is 1-based and sequential; every "nodeIds" entry MUST be a real node id from this file.',
    '   - Start with an overview step, follow the main path (important branches and sub-agents, the core output step), and end at completion.',
    "   - Write title / description / languageLesson in the workflow's language (match the existing node text).",
    '4. Write the file back with the "tour" field added (or replaced if one already exists), preserving everything else (nodes, connections, metadata) unchanged. Keep it valid JSON.',
    `5. Report how many tour steps you added, and that the tour can be played with:  ccwf preview "${absolutePath}"`,
  ].join('\n');
}

/** Resolve which supported agent CLIs are actually installed (in LAUNCHERS order). */
async function detectInstalledAgents(): Promise<string[]> {
  const entries = await Promise.all(
    Object.entries(LAUNCHERS).map(async ([key, l]) => ((await findBinaryInPath(l.bin)) ? key : null))
  );
  return entries.filter((k): k is string => k !== null);
}

/** Interactive numbered picker over the given agent keys. */
async function promptAgent(keys: string[]): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write('Select an AI agent to generate the tour:\n');
    keys.forEach((k, i) => process.stdout.write(`  ${i + 1}) ${LAUNCHERS[k].label}\n`));
    const answer = await new Promise<string>((resolve) =>
      rl.question(`Choice [1-${keys.length}] (default 1): `, resolve)
    );
    const trimmed = answer.trim();
    if (!trimmed) return keys[0];
    const n = Number.parseInt(trimmed, 10);
    if (Number.isInteger(n) && n >= 1 && n <= keys.length) return keys[n - 1];
    if (keys.includes(trimmed)) return trimmed;
    process.stdout.write(`Invalid choice; using ${LAUNCHERS[keys[0]].label}.\n`);
    return keys[0];
  } finally {
    rl.close();
  }
}

/** Resolve the agent to use: explicit flag, interactive prompt, or sole installed. */
async function resolveAgent(explicit: string | undefined): Promise<string> {
  if (explicit) {
    if (!LAUNCHERS[explicit]) {
      process.stderr.write(
        `error: --agent ${explicit} is not launchable from the CLI. Supported: ${SUPPORTED}.\n`
      );
      process.exit(2);
    }
    return explicit;
  }

  const installed = await detectInstalledAgents();
  if (installed.length === 0) {
    process.stderr.write(
      `error: none of the supported agent CLIs were found on PATH (${SUPPORTED}). Install one, or pass --agent.\n`
    );
    process.exit(127);
  }
  if (installed.length === 1) {
    process.stdout.write(`Using ${LAUNCHERS[installed[0]].label} (the only agent CLI found on PATH).\n`);
    return installed[0];
  }
  if (!process.stdin.isTTY) {
    // Non-interactive (piped / CI): pick the first installed without prompting.
    process.stdout.write(`Non-interactive; using ${LAUNCHERS[installed[0]].label}. Pass --agent to override.\n`);
    return installed[0];
  }
  return promptAgent(installed);
}

export function registerTourCommand(program: Command): void {
  program
    .command('tour')
    .description(
      'Generate a guided tour for a workflow by launching an AI agent that writes a `tour` field back into the file.'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option('--agent <name>', `Agent CLI to launch (${SUPPORTED}). Prompts if omitted.`)
    .action(async (file: string, options: CommanderTourOptions) => {
      try {
        // Fail fast if the file is missing or not a parseable workflow.
        const { absolutePath } = await loadWorkflowFromFile(file);

        const agentName = await resolveAgent(options.agent);
        const launcher = LAUNCHERS[agentName];

        const bin = await findBinaryInPath(launcher.bin);
        if (!bin) {
          process.stderr.write(
            `error: \`${launcher.bin}\` was not found on PATH. Install it or pick a different --agent (${SUPPORTED}).\n`
          );
          process.exit(127);
        }

        const prompt = buildTourPrompt(absolutePath);
        process.stdout.write(`\nLaunching ${launcher.label} to generate a tour for ${absolutePath}\n\n`);

        const child = spawn(bin, launcher.args(prompt), { stdio: 'inherit', shell: false });
        await new Promise<void>((resolve) => {
          child.on('exit', (code) => {
            if (typeof code === 'number' && code !== 0) {
              process.exitCode = code;
            }
            resolve();
          });
          child.on('error', (error) => {
            process.stderr.write(`error: failed to launch ${launcher.bin}: ${error.message}\n`);
            process.exitCode = 1;
            resolve();
          });
        });
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
