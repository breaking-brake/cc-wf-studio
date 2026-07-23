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
 *
 * `--agent` is repeatable and accepts `all` (every supported target). With
 * exactly one agent, all output — human, `--json`, `--dry-run` — is
 * byte-identical to the historical single-agent behaviour. With several,
 * the run is atomic across agents (any conflict without `--overwrite`
 * aborts before anything is written), human lines are `[agent]`-prefixed,
 * and JSON payloads carry `resultsByAgent` instead of the single-agent keys.
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
  /** Target-compatibility warnings collected for the requested agent. */
  warnings: string[];
}

/**
 * Thrown by `runExport` when planned files already exist with different
 * content and `--overwrite` was not passed. Carries everything a caller
 * needs to render the failure (human or JSON) and exit 1.
 */
export class ExportConflictError extends Error {
  /** Absolute paths of the conflicting files, in plan order. */
  readonly conflictPaths: string[];
  /** Project root used. */
  readonly rootDir: string;
  /** Target-compatibility warnings collected before the conflict check. */
  readonly warnings: string[];

  constructor(conflictPaths: string[], rootDir: string, warnings: string[]) {
    super(
      `${conflictPaths.length} file(s) already exist with different content. Pass --overwrite to replace them.`
    );
    this.name = 'ExportConflictError';
    this.conflictPaths = conflictPaths;
    this.rootDir = rootDir;
    this.warnings = warnings;
  }
}

/**
 * Print `runExport`'s conflict failure exactly as it has always appeared on
 * stderr, then exit 1. Shared by `ccwf export` and `ccwf run`.
 */
export function reportExportConflict(error: ExportConflictError): never {
  process.stderr.write(
    `error: ${error.conflictPaths.length} file(s) already exist with different content. Pass --overwrite to replace them:\n`
  );
  for (const absPath of error.conflictPaths) {
    process.stderr.write(`  - ${absPath}\n`);
  }
  process.exit(1);
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
  /** Target-compatibility warnings collected for the requested agent. */
  warnings: string[];
}

function parseAgentOption(value: string): SupportedAgent {
  if ((SUPPORTED_AGENTS as readonly string[]).includes(value)) {
    return value as SupportedAgent;
  }
  // InvalidArgumentError is commander's signal for "render this as a clean
  // CLI error, not an uncaught exception with a stack trace".
  throw new InvalidArgumentError(`Expected one of: ${SUPPORTED_AGENTS.join(', ')}.`);
}

/**
 * Repeatable `--agent` accumulator shared by `ccwf export` and `ccwf
 * validate`: each occurrence appends one agent, `all` appends every
 * supported target. De-duped, first-mention order preserved.
 */
export function collectAgentListOption(
  value: string,
  previous: SupportedAgent[] | undefined
): SupportedAgent[] {
  if (value !== 'all' && !(SUPPORTED_AGENTS as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(`Expected one of: ${SUPPORTED_AGENTS.join(', ')}, all.`);
  }
  const parsed = value === 'all' ? SUPPORTED_AGENTS : [value as SupportedAgent];
  const next = previous ? [...previous] : [];
  for (const agent of parsed) {
    if (!next.includes(agent)) {
      next.push(agent);
    }
  }
  return next;
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
  options: Omit<ExportRunOptions, 'overwrite'>,
  emitWarnings = true
): Promise<ExportPreviewResult> {
  const { workflow } = await loadWorkflowFromFile(options.file);
  const rootDir = path.resolve(options.cwd ?? process.cwd());

  const warnings = collectAgentCompatibilityWarnings(workflow, options.agent);
  if (emitWarnings) {
    for (const warning of warnings) {
      process.stderr.write(`warning: ${warning}\n`);
    }
  }

  const plan =
    options.agent === CLAUDE_CODE_AGENT
      ? planWorkflowExportFiles(workflow)
      : planAgentSkillFiles(workflow, options.agent as AgentSkillProvider);

  return { entries: await classifyPlan(rootDir, plan), rootDir, warnings };
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
    process.stdout.write(
      `  - ${path.relative(preview.rootDir, entry.absPath)} (${previewNote(entry.status, overwrite)})\n`
    );
  }
  if (conflictCount > 0 && !overwrite) {
    process.stderr.write(
      `error: export would fail: ${conflictCount} file(s) already exist with different content. Pass --overwrite to replace them.\n`
    );
    process.exit(1);
  }
}

/** Human annotation for one planned file in a `--dry-run` listing. */
function previewNote(status: PlannedFileStatus, overwrite: boolean): string {
  return status === 'new'
    ? 'new'
    : status === 'up-to-date'
      ? 'up to date'
      : overwrite
        ? 'would overwrite'
        : 'conflict: exists with different content';
}

/**
 * Shared implementation invoked by both `ccwf export` and `ccwf run`.
 *
 * Throws `WorkflowLoadError` for `<file>` issues and `ExportConflictError`
 * on a write conflict (without `--overwrite`) — callers render those via
 * their usual error paths (`reportExportConflict` for the historical
 * stderr + exit 1 behaviour).
 */
export async function runExport(
  options: ExportRunOptions,
  emitWarnings = true
): Promise<ExportRunResult> {
  const { workflow } = await loadWorkflowFromFile(options.file);
  const rootDir = path.resolve(options.cwd ?? process.cwd());

  const warnings = collectAgentCompatibilityWarnings(workflow, options.agent);
  if (emitWarnings) {
    for (const warning of warnings) {
      process.stderr.write(`warning: ${warning}\n`);
    }
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
      throw new ExportConflictError(conflicts, rootDir, warnings);
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
    warnings,
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

/** One agent's slice of a multi-agent export: its warnings and planned files. */
interface AgentPlanBundle {
  agent: SupportedAgent;
  warnings: string[];
  plan: PlannedExportFile[];
}

/**
 * Load the workflow once and plan every requested agent's file set.
 * Cross-agent path collisions cannot occur: each provider plans under its
 * own root (`.claude/`, `.codex/`, `.github/skills/`, `.cursor/`,
 * `.gemini/`, `.roo/`, `.agent/`).
 */
async function planForAgents(
  file: string,
  agents: SupportedAgent[],
  cwd: string | undefined,
  emitWarnings: boolean
): Promise<{ slashName: string; rootDir: string; bundles: AgentPlanBundle[] }> {
  const { workflow } = await loadWorkflowFromFile(file);
  const rootDir = path.resolve(cwd ?? process.cwd());
  const bundles: AgentPlanBundle[] = agents.map((agent) => ({
    agent,
    warnings: collectAgentCompatibilityWarnings(workflow, agent),
    plan:
      agent === CLAUDE_CODE_AGENT
        ? planWorkflowExportFiles(workflow)
        : planAgentSkillFiles(workflow, agent as AgentSkillProvider),
  }));
  if (emitWarnings) {
    for (const bundle of bundles) {
      for (const warning of bundle.warnings) {
        process.stderr.write(`warning: [${bundle.agent}] ${warning}\n`);
      }
    }
  }
  return { slashName: nodeNameToFileName(workflow.name), rootDir, bundles };
}

/**
 * `--dry-run` with several agents: per-agent file listing (human) or a
 * per-agent `resultsByAgent` payload (`--json`). Exit code mirrors a real
 * run, exactly like the single-agent preview.
 */
async function previewMultiExport(
  file: string,
  agents: SupportedAgent[],
  options: CommanderExportOptions
): Promise<void> {
  const { rootDir, bundles } = await planForAgents(file, agents, options.cwd, !options.json);
  const classified: { bundle: AgentPlanBundle; entries: ClassifiedPlanEntry[] }[] = [];
  for (const bundle of bundles) {
    classified.push({ bundle, entries: await classifyPlan(rootDir, bundle.plan) });
  }
  const conflictCount = classified.reduce(
    (sum, c) => sum + c.entries.filter((e) => e.status === 'conflict').length,
    0
  );
  const ok = conflictCount === 0 || options.overwrite;

  if (options.json) {
    printJson({
      ok,
      dryRun: true,
      root: rootDir,
      agents,
      resultsByAgent: Object.fromEntries(
        classified.map((c) => [
          c.bundle.agent,
          {
            files: c.entries.map((entry) => ({
              path: path.relative(rootDir, entry.absPath),
              status: entry.status,
            })),
            warnings: c.bundle.warnings,
          },
        ])
      ),
    });
    if (!ok) {
      process.exit(1);
    }
    return;
  }

  const totalFiles = classified.reduce((sum, c) => sum + c.entries.length, 0);
  process.stdout.write('Dry run — no files were written.\n');
  process.stdout.write(
    `Would export ${totalFiles} file(s) for ${agents.length} agent(s) into ${rootDir}:\n`
  );
  for (const c of classified) {
    process.stdout.write(`[${c.bundle.agent}]\n`);
    for (const entry of c.entries) {
      process.stdout.write(
        `  - ${path.relative(rootDir, entry.absPath)} (${previewNote(entry.status, options.overwrite)})\n`
      );
    }
  }
  if (!ok) {
    process.stderr.write(
      `error: export would fail: ${conflictCount} file(s) already exist with different content. Pass --overwrite to replace them.\n`
    );
    process.exit(1);
  }
}

/**
 * Real export for several agents. Atomic across agents: every agent's plan
 * is classified before anything is written, so a conflict in any target
 * (without `--overwrite`) aborts the whole run with zero files touched.
 */
async function runMultiExport(
  file: string,
  agents: SupportedAgent[],
  options: CommanderExportOptions
): Promise<void> {
  const { slashName, rootDir, bundles } = await planForAgents(
    file,
    agents,
    options.cwd,
    !options.json
  );

  // Same contract as the single-agent run: --overwrite skips classification
  // entirely and rewrites every planned file.
  const unchangedByAgent = new Map<SupportedAgent, Set<string>>();
  if (!options.overwrite) {
    const conflicts: { agent: SupportedAgent; absPath: string }[] = [];
    for (const bundle of bundles) {
      const classified = await classifyPlan(rootDir, bundle.plan);
      unchangedByAgent.set(
        bundle.agent,
        new Set(classified.filter((e) => e.status === 'up-to-date').map((e) => e.absPath))
      );
      for (const entry of classified) {
        if (entry.status === 'conflict') {
          conflicts.push({ agent: bundle.agent, absPath: entry.absPath });
        }
      }
    }
    if (conflicts.length > 0) {
      if (options.json) {
        printJson({
          ok: false,
          root: rootDir,
          agents,
          resultsByAgent: Object.fromEntries(
            bundles.map((bundle) => [
              bundle.agent,
              {
                conflicts: conflicts
                  .filter((c) => c.agent === bundle.agent)
                  .map((c) => path.relative(rootDir, c.absPath)),
                warnings: bundle.warnings,
              },
            ])
          ),
        });
        process.exit(1);
      }
      process.stderr.write(
        `error: ${conflicts.length} file(s) already exist with different content. Pass --overwrite to replace them:\n`
      );
      for (const conflict of conflicts) {
        process.stderr.write(`  - [${conflict.agent}] ${conflict.absPath}\n`);
      }
      process.exit(1);
    }
  }

  const ensuredDirs = new Set<string>();
  const perAgent: {
    agent: SupportedAgent;
    written: string[];
    upToDate: string[];
    warnings: string[];
  }[] = [];
  for (const bundle of bundles) {
    const unchanged = unchangedByAgent.get(bundle.agent) ?? new Set<string>();
    const written: string[] = [];
    for (const planned of bundle.plan) {
      const absPath = resolvePlanned(rootDir, planned);
      if (unchanged.has(absPath)) continue;
      const dir = path.dirname(absPath);
      if (!ensuredDirs.has(dir)) {
        await fs.mkdir(dir, { recursive: true });
        ensuredDirs.add(dir);
      }
      await fs.writeFile(absPath, planned.contents, 'utf-8');
      written.push(absPath);
    }
    perAgent.push({
      agent: bundle.agent,
      written,
      upToDate: [...unchanged],
      warnings: bundle.warnings,
    });
  }

  if (options.json) {
    printJson({
      ok: true,
      root: rootDir,
      agents,
      resultsByAgent: Object.fromEntries(
        perAgent.map((result) => [
          result.agent,
          {
            written: toRootRelative(rootDir, result.written),
            upToDate: toRootRelative(rootDir, result.upToDate),
            warnings: result.warnings,
          },
        ])
      ),
      slashName,
    });
    return;
  }

  let totalWritten = 0;
  let totalUpToDate = 0;
  for (const result of perAgent) {
    totalWritten += result.written.length;
    totalUpToDate += result.upToDate.length;
    if (result.written.length > 0 || result.upToDate.length === 0) {
      process.stdout.write(`[${result.agent}] ✓ Wrote ${result.written.length} file(s):\n`);
      for (const writtenPath of result.written) {
        process.stdout.write(`  - ${path.relative(rootDir, writtenPath)}\n`);
      }
      if (result.upToDate.length > 0) {
        process.stdout.write(`  (${result.upToDate.length} file(s) already up to date)\n`);
      }
    } else {
      process.stdout.write(
        `[${result.agent}] ✓ All ${result.upToDate.length} file(s) already up to date; nothing to write.\n`
      );
    }
  }
  const upToDateSuffix = totalUpToDate > 0 ? `, ${totalUpToDate} already up to date` : '';
  process.stdout.write(
    `✓ Exported for ${agents.length} agent(s) into ${rootDir}: ${totalWritten} file(s) written${upToDateSuffix}.\n`
  );
}

interface CommanderExportOptions {
  agent?: SupportedAgent[];
  overwrite: boolean;
  dryRun: boolean;
  json: boolean;
  cwd?: string;
}

function toRootRelative(rootDir: string, absPaths: string[]): string[] {
  return absPaths.map((absPath) => path.relative(rootDir, absPath));
}

function printJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * `--dry-run --json` report. Statuses are the raw classification
 * (`conflict` stays `conflict` even with `--overwrite`); `ok` mirrors the
 * exit code, i.e. whether a real export would succeed.
 */
function reportExportPreviewJson(
  preview: ExportPreviewResult,
  agent: SupportedAgent,
  overwrite: boolean
): void {
  const conflictCount = preview.entries.filter((e) => e.status === 'conflict').length;
  const ok = conflictCount === 0 || overwrite;
  printJson({
    ok,
    dryRun: true,
    root: preview.rootDir,
    agent,
    files: preview.entries.map((entry) => ({
      path: path.relative(preview.rootDir, entry.absPath),
      status: entry.status,
    })),
    warnings: preview.warnings,
  });
  if (!ok) {
    process.exit(1);
  }
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description(
      'Materialise a workflow as agent-skill files (.claude/agents + .claude/skills for Claude Code, <root>/skills for other agents).'
    )
    .argument('<file>', 'Path to a workflow JSON file.')
    .option<SupportedAgent[]>(
      '--agent <name>',
      `Target agent(s) (repeatable; one of: ${SUPPORTED_AGENTS.join(', ')}, or 'all' for every target). Defaults to claude-code. roo-code targets Zoo Code, the maintained fork of the sunset Roo Code.`,
      collectAgentListOption
    )
    .option('--overwrite', 'Overwrite existing files instead of erroring.', false)
    .option(
      '--dry-run',
      'Preview every planned file (new / up to date / conflict) without writing anything. Exit 1 if the export would fail on conflicts.',
      false
    )
    .option(
      '--json',
      'Print the machine-readable result JSON to stdout (works with --dry-run too). Warnings move into the payload instead of stderr.',
      false
    )
    .option(
      '--cwd <dir>',
      'Output root. Defaults to process.cwd(). Useful for tests / scripted runs.'
    )
    .action(async (file: string, options: CommanderExportOptions) => {
      const agents = options.agent ?? [CLAUDE_CODE_AGENT];
      const singleAgent = agents.length === 1 ? agents[0] : undefined;
      try {
        // More than one agent: dedicated per-agent reporting. Exactly one
        // agent keeps the historical single-agent output, byte-identical.
        if (singleAgent === undefined) {
          if (options.dryRun) {
            await previewMultiExport(file, agents, options);
          } else {
            await runMultiExport(file, agents, options);
          }
          return;
        }

        if (options.dryRun) {
          const preview = await previewExport(
            {
              file,
              agent: singleAgent,
              cwd: options.cwd,
            },
            !options.json
          );
          if (options.json) {
            reportExportPreviewJson(preview, singleAgent, options.overwrite);
          } else {
            reportExportPreview(preview, options.overwrite);
          }
          return;
        }

        const result = await runExport(
          {
            file,
            agent: singleAgent,
            overwrite: options.overwrite,
            cwd: options.cwd,
          },
          !options.json
        );

        if (options.json) {
          printJson({
            ok: true,
            root: result.rootDir,
            agent: singleAgent,
            written: toRootRelative(result.rootDir, result.writtenPaths),
            upToDate: toRootRelative(result.rootDir, result.unchangedPaths),
            slashName: result.slashName,
            warnings: result.warnings,
          });
          return;
        }

        reportExportOutcome(result);
      } catch (error) {
        if (error instanceof ExportConflictError) {
          if (options.json) {
            printJson({
              ok: false,
              root: error.rootDir,
              agent: singleAgent,
              conflicts: toRootRelative(error.rootDir, error.conflictPaths),
              warnings: error.warnings,
            });
            process.exit(1);
          }
          reportExportConflict(error);
        }
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
