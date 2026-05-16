/**
 * `ccwf export <file> [--agent <name>]` — materialise a workflow as
 * agent-skill files in `cwd`.
 *
 * `--agent claude-code` (default) uses the canonical `planWorkflowExportFiles`
 * (Sub-Agent files under `.claude/agents/` + workflow entry at
 * `.claude/skills/<workflow>.md`). Other agents (antigravity / codex /
 * copilot / cursor / gemini / roo-code) use `planAgentSkillFiles`, which
 * emits the provider's own `<root>/skills/<workflow>/SKILL.md` (plus
 * `.cursor/agents/*.md` for Cursor).
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type AgentSkillProvider,
  type PlannedExportFile,
  nodeNameToFileName,
  planAgentSkillFiles,
  planWorkflowExportFiles,
} from '@cc-wf-studio/core';
import { Command, InvalidArgumentError } from 'commander';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

const CLAUDE_CODE_AGENT = 'claude-code' as const;
const SUPPORTED_AGENTS = [
  CLAUDE_CODE_AGENT,
  'antigravity',
  'codex',
  'copilot',
  'cursor',
  'gemini',
  'roo-code',
] as const;
type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

export interface ExportRunOptions {
  /** Path to the workflow JSON. */
  file: string;
  /** Default `'claude-code'`. */
  agent: SupportedAgent;
  /** Overwrite existing files. */
  overwrite: boolean;
  /** Output root. Defaults to `process.cwd()`. */
  cwd?: string;
}

export interface ExportRunResult {
  /** Absolute paths of every file written. */
  writtenPaths: string[];
  /** Slash command name (used for the `run` follow-up hint). */
  slashName: string;
  /** Project root used. */
  rootDir: string;
}

function parseAgentOption(value: string): SupportedAgent {
  if ((SUPPORTED_AGENTS as readonly string[]).includes(value)) {
    return value as SupportedAgent;
  }
  // InvalidArgumentError is commander's signal for "render this as a clean
  // CLI error, not an uncaught exception with a stack trace".
  throw new InvalidArgumentError(`Expected one of: ${SUPPORTED_AGENTS.join(', ')}.`);
}

function resolvePlanned(rootDir: string, file: PlannedExportFile): string {
  return path.join(rootDir, ...file.relativePath.split('/'));
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/**
 * Shared implementation invoked by both `ccwf export` and `ccwf run`.
 *
 * Throws `WorkflowLoadError` for `<file>` issues. Calls `process.exit(1)` on
 * a write conflict (without `--overwrite`) — the caller doesn't need to
 * handle either case explicitly.
 */
export async function runExport(options: ExportRunOptions): Promise<ExportRunResult> {
  const { workflow } = await loadWorkflowFromFile(options.file);
  const rootDir = path.resolve(options.cwd ?? process.cwd());

  const plan =
    options.agent === CLAUDE_CODE_AGENT
      ? planWorkflowExportFiles(workflow)
      : planAgentSkillFiles(workflow, options.agent as AgentSkillProvider);

  if (!options.overwrite) {
    const conflicts: string[] = [];
    for (const planned of plan) {
      const absPath = resolvePlanned(rootDir, planned);
      if (await pathExists(absPath)) {
        conflicts.push(absPath);
      }
    }
    if (conflicts.length > 0) {
      process.stderr.write(
        `error: ${conflicts.length} file(s) already exist. Pass --overwrite to replace them:\n`
      );
      for (const absPath of conflicts) {
        process.stderr.write(`  - ${absPath}\n`);
      }
      process.exit(1);
    }
  }

  const writtenPaths: string[] = [];
  const ensuredDirs = new Set<string>();
  for (const planned of plan) {
    const absPath = resolvePlanned(rootDir, planned);
    const dir = path.dirname(absPath);
    if (!ensuredDirs.has(dir)) {
      await fs.mkdir(dir, { recursive: true });
      ensuredDirs.add(dir);
    }
    await fs.writeFile(absPath, planned.contents, 'utf-8');
    writtenPaths.push(absPath);
  }

  return {
    writtenPaths,
    slashName: nodeNameToFileName(workflow.name),
    rootDir,
  };
}

/** Resolve an option spec into a `SupportedAgent`, throwing if unknown. */
export function asSupportedAgent(value: string): SupportedAgent {
  return parseAgentOption(value);
}

interface CommanderExportOptions {
  agent: SupportedAgent;
  overwrite: boolean;
  cwd?: string;
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description(
      'Materialise a workflow as agent-skill files (.claude/agents + .claude/skills for Claude Code, <root>/skills for other agents).'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option<SupportedAgent>(
      '--agent <name>',
      `Target agent. One of: ${SUPPORTED_AGENTS.join(', ')}.`,
      parseAgentOption,
      CLAUDE_CODE_AGENT
    )
    .option('--overwrite', 'Overwrite existing files instead of erroring.', false)
    .option(
      '--cwd <dir>',
      'Output root. Defaults to process.cwd(). Useful for tests / scripted runs.'
    )
    .action(async (file: string, options: CommanderExportOptions) => {
      try {
        const result = await runExport({
          file,
          agent: options.agent,
          overwrite: options.overwrite,
          cwd: options.cwd,
        });

        process.stdout.write(`✓ Wrote ${result.writtenPaths.length} file(s):\n`);
        for (const writtenPath of result.writtenPaths) {
          process.stdout.write(`  - ${path.relative(result.rootDir, writtenPath)}\n`);
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
