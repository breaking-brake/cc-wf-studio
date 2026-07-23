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
  WORKFLOW_TARGET_AGENTS,
  type WorkflowTargetAgent,
  collectAgentCompatibilityWarnings,
  nodeNameToFileName,
  planAgentSkillFiles,
  planWorkflowExportFiles,
} from '@cc-wf-studio/core';
import { Command, InvalidArgumentError } from 'commander';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

const CLAUDE_CODE_AGENT = 'claude-code' as const;
export const SUPPORTED_AGENTS = WORKFLOW_TARGET_AGENTS;
export type SupportedAgent = WorkflowTargetAgent;
export { collectAgentCompatibilityWarnings };

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
  /** Absolute paths of planned files skipped because their on-disk content already matched. */
  unchangedPaths: string[];
  /** Slash command name (used for the `run` follow-up hint). */
  slashName: string;
  /** Project root used. */
  rootDir: string;
}

/** On-disk classification of a single planned export file. */
export type PlannedFileStatus = 'new' | 'conflict' | 'up-to-date';

export interface ClassifiedPlanEntry {
  /** Absolute path the file would be written to. */
  absPath: string;
  status: PlannedFileStatus;
}

export interface ExportPreviewResult {
  /** Every planned file in plan order with its on-disk classification. */
  entries: ClassifiedPlanEntry[];
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
 * Sort every planned file into new / conflicting / already up to date,
 * without writing anything. Shared by `runExport`'s conflict check and
 * `--dry-run`'s preview so the two can never disagree.
 */
async function classifyPlan(
  rootDir: string,
  plan: PlannedExportFile[]
): Promise<ClassifiedPlanEntry[]> {
  const entries: ClassifiedPlanEntry[] = [];
  for (const planned of plan) {
    const absPath = resolvePlanned(rootDir, planned);
    if (!(await pathExists(absPath))) {
      entries.push({ absPath, status: 'new' });
    } else if (await matchesPlannedContents(absPath, planned.contents)) {
      entries.push({ absPath, status: 'up-to-date' });
    } else {
      entries.push({ absPath, status: 'conflict' });
    }
  }
  return entries;
}

/**
 * `--dry-run` implementation: load the workflow, emit the same
 * target-compatibility warnings as a real export, and classify the planned
 * files against the disk — but never write.
 *
 * Throws `WorkflowLoadError` for `<file>` issues, like `runExport`.
 */
export async function previewExport(
  options: Omit<ExportRunOptions, 'overwrite'>
): Promise<ExportPreviewResult> {
  const { workflow } = await loadWorkflowFromFile(options.file);
  const rootDir = path.resolve(options.cwd ?? process.cwd());

  for (const warning of collectAgentCompatibilityWarnings(workflow, options.agent)) {
    process.stderr.write(`warning: ${warning}\n`);
  }

  const plan =
    options.agent === CLAUDE_CODE_AGENT
      ? planWorkflowExportFiles(workflow)
      : planAgentSkillFiles(workflow, options.agent as AgentSkillProvider);

  return { entries: await classifyPlan(rootDir, plan), rootDir };
}

/**
 * Print the `--dry-run` report. The exit code mirrors what a real run would
 * do: exits 1 when the export would stop on conflicts (i.e. conflicting
 * files present and no `--overwrite`), so exit 0 always means "the export
 * would succeed".
 */
export function reportExportPreview(preview: ExportPreviewResult, overwrite: boolean): void {
  const conflictCount = preview.entries.filter((e) => e.status === 'conflict').length;
  process.stdout.write('Dry run — no files were written.\n');
  process.stdout.write(`Would export ${preview.entries.length} file(s) into ${preview.rootDir}:\n`);
  for (const entry of preview.entries) {
    const note =
      entry.status === 'new'
        ? 'new'
        : entry.status === 'up-to-date'
          ? 'up to date'
          : overwrite
            ? 'would overwrite'
            : 'conflict: exists with different content';
    process.stdout.write(`  - ${path.relative(preview.rootDir, entry.absPath)} (${note})\n`);
  }
  if (conflictCount > 0 && !overwrite) {
    process.stderr.write(
      `error: export would fail: ${conflictCount} file(s) already exist with different content. Pass --overwrite to replace them.\n`
    );
    process.exit(1);
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

  for (const warning of collectAgentCompatibilityWarnings(workflow, options.agent)) {
    process.stderr.write(`warning: ${warning}\n`);
  }

  const plan =
    options.agent === CLAUDE_CODE_AGENT
      ? planWorkflowExportFiles(workflow)
      : planAgentSkillFiles(workflow, options.agent as AgentSkillProvider);

  const unchangedPaths: string[] = [];
  if (!options.overwrite) {
    const classified = await classifyPlan(rootDir, plan);
    const conflicts = classified.filter((e) => e.status === 'conflict').map((e) => e.absPath);
    unchangedPaths.push(
      ...classified.filter((e) => e.status === 'up-to-date').map((e) => e.absPath)
    );
    if (conflicts.length > 0) {
      process.stderr.write(
        `error: ${conflicts.length} file(s) already exist with different content. Pass --overwrite to replace them:\n`
      );
      for (const absPath of conflicts) {
        process.stderr.write(`  - ${absPath}\n`);
      }
      process.exit(1);
    }
  }

  const unchanged = new Set(unchangedPaths);
  const writtenPaths: string[] = [];
  const ensuredDirs = new Set<string>();
  for (const planned of plan) {
    const absPath = resolvePlanned(rootDir, planned);
    if (unchanged.has(absPath)) continue;
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
    unchangedPaths,
    slashName: nodeNameToFileName(workflow.name),
    rootDir,
  };
}

/**
 * Whether the file at `absPath` already holds exactly `contents`. Any read
 * failure (directory in the way, permissions, ...) counts as "not matching"
 * so it is reported as a conflict rather than crashing or silently skipping.
 */
async function matchesPlannedContents(absPath: string, contents: string): Promise<boolean> {
  try {
    return (await fs.readFile(absPath, 'utf-8')) === contents;
  } catch {
    return false;
  }
}

/**
 * Print the written/up-to-date summary for a completed `runExport`. Shared by
 * `ccwf export` and `ccwf run` so their output cannot drift.
 */
export function reportExportOutcome(result: ExportRunResult): void {
  if (result.writtenPaths.length > 0 || result.unchangedPaths.length === 0) {
    process.stdout.write(`✓ Wrote ${result.writtenPaths.length} file(s):\n`);
    for (const writtenPath of result.writtenPaths) {
      process.stdout.write(`  - ${path.relative(result.rootDir, writtenPath)}\n`);
    }
    if (result.unchangedPaths.length > 0) {
      process.stdout.write(`  (${result.unchangedPaths.length} file(s) already up to date)\n`);
    }
  } else {
    process.stdout.write(
      `✓ All ${result.unchangedPaths.length} file(s) already up to date; nothing to write.\n`
    );
  }
}

/** Resolve an option spec into a `SupportedAgent`, throwing if unknown. */
export function asSupportedAgent(value: string): SupportedAgent {
  return parseAgentOption(value);
}

interface CommanderExportOptions {
  agent: SupportedAgent;
  overwrite: boolean;
  dryRun: boolean;
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
      `Target agent. One of: ${SUPPORTED_AGENTS.join(', ')}. roo-code targets Zoo Code, the maintained fork of the sunset Roo Code.`,
      parseAgentOption,
      CLAUDE_CODE_AGENT
    )
    .option('--overwrite', 'Overwrite existing files instead of erroring.', false)
    .option(
      '--dry-run',
      'Preview every planned file (new / up to date / conflict) without writing anything. Exit 1 if the export would fail on conflicts.',
      false
    )
    .option(
      '--cwd <dir>',
      'Output root. Defaults to process.cwd(). Useful for tests / scripted runs.'
    )
    .action(async (file: string, options: CommanderExportOptions) => {
      try {
        if (options.dryRun) {
          const preview = await previewExport({
            file,
            agent: options.agent,
            cwd: options.cwd,
          });
          reportExportPreview(preview, options.overwrite);
          return;
        }

        const result = await runExport({
          file,
          agent: options.agent,
          overwrite: options.overwrite,
          cwd: options.cwd,
        });

        reportExportOutcome(result);
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
