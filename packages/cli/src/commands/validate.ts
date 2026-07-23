/**
 * `ccwf validate <paths...>` — schema-check one or more workflow JSON files.
 *
 * Accepts any mix of files and directories; a directory expands to every
 * `*.json` under it (recursive, skipping `node_modules` and dot-directories).
 * Default output is a per-file report (errors on stderr) plus a summary line
 * when more than one file is checked; exit 0 when every file passes, 1 on
 * validation failure, 2 when a file cannot be read/parsed. `--json` prints a
 * machine-readable result to stdout for CI scripting (same exit codes). With
 * a single file the output — including the `--json` shape — is identical to
 * what earlier single-file versions printed.
 *
 * `--agent <name>` additionally preflights target compatibility: it reports
 * the same warnings `ccwf export --agent <name>` would print (Claude
 * Code-only nodes, fields the target ignores) without writing any files.
 * The flag is repeatable (`--agent codex --agent gemini`) and accepts `all`
 * to expand to every supported target; with more than one agent, human
 * warning lines are prefixed `[agent]` and the JSON report carries
 * `warningsByAgent` instead of `warnings`. Warnings never affect the exit
 * code — only schema validity does.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type ValidationError, validateAIGeneratedWorkflow } from '@cc-wf-studio/core';
import { Command, InvalidArgumentError } from 'commander';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';
import {
  SUPPORTED_AGENTS,
  type SupportedAgent,
  collectAgentCompatibilityWarnings,
} from './export.js';

interface ValidateOptions {
  json?: boolean;
  agent?: SupportedAgent[];
}

type FileReport =
  | {
      file: string;
      valid: boolean;
      errors: ValidationError[];
      /** Present when exactly one agent was requested (stable single-agent shape). */
      warnings?: string[];
      /** Present when more than one agent was requested. */
      warningsByAgent?: Record<string, string[]>;
    }
  | {
      file: string;
      valid: false;
      loadError: string;
    };

/**
 * Repeatable `--agent` accumulator: each occurrence appends one agent, `all`
 * appends every supported target. De-duped, first-mention order preserved.
 */
function parseValidateAgent(
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

function formatError(err: ValidationError): string {
  const fieldSuffix = err.field ? ` (field: ${err.field})` : '';
  return `  - [${err.code}] ${err.message}${fieldSuffix}`;
}

const SKIPPED_DIR_NAMES = new Set(['node_modules']);

async function collectJsonFiles(dir: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      await collectJsonFiles(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(full);
    }
  }
}

/**
 * Resolve the command's path arguments to a concrete file list. Nonexistent
 * paths and directories with no `*.json` under them are usage errors — they
 * abort the whole run (exit 2) rather than shrink it, so a typo can never
 * turn into a false-green CI result.
 */
async function expandPaths(inputs: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const input of inputs) {
    const absolute = path.resolve(input);
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(absolute);
    } catch {
      throw new WorkflowLoadError(`File not found: ${absolute}`);
    }
    if (stats.isDirectory()) {
      const found: string[] = [];
      await collectJsonFiles(absolute, found);
      if (found.length === 0) {
        throw new WorkflowLoadError(`No .json files found under ${absolute}`);
      }
      files.push(...found);
    } else {
      files.push(absolute);
    }
  }
  return [...new Set(files)];
}

async function validateFile(file: string, agents: SupportedAgent[]): Promise<FileReport> {
  let workflow: Awaited<ReturnType<typeof loadWorkflowFromFile>>['workflow'];
  try {
    ({ workflow } = await loadWorkflowFromFile(file));
  } catch (error) {
    if (error instanceof WorkflowLoadError) {
      return { file, valid: false, loadError: error.message };
    }
    throw error;
  }
  const result = validateAIGeneratedWorkflow(workflow);
  // Compatibility warnings only for a schema-valid workflow —
  // malformed node data would produce garbage reports.
  const collect = (agent: SupportedAgent): string[] =>
    result.valid ? collectAgentCompatibilityWarnings(workflow, agent) : [];
  return {
    file,
    valid: result.valid,
    errors: result.errors,
    // Exactly one agent keeps the stable single-agent `warnings` shape;
    // several agents get a per-agent map instead.
    ...(agents.length === 1 ? { warnings: collect(agents[0]) } : {}),
    ...(agents.length > 1
      ? { warningsByAgent: Object.fromEntries(agents.map((agent) => [agent, collect(agent)])) }
      : {}),
  };
}

function printHumanReport(report: FileReport, agents: SupportedAgent[]): void {
  if ('loadError' in report) {
    process.stderr.write(`error: ${report.loadError}\n`);
    return;
  }
  if (report.valid) {
    process.stdout.write(`✓ ${report.file} is valid.\n`);
    for (const agent of agents) {
      // Single-agent lines are the historical format; with several agents
      // each warning is prefixed so the target stays identifiable.
      const warnings =
        (agents.length === 1 ? report.warnings : report.warningsByAgent?.[agent]) ?? [];
      if (warnings.length === 0) {
        process.stdout.write(`✓ No target-compatibility warnings for ${agent}.\n`);
      } else {
        const prefix = agents.length > 1 ? `[${agent}] ` : '';
        for (const warning of warnings) {
          process.stderr.write(`warning: ${prefix}${warning}\n`);
        }
      }
    }
  } else {
    process.stderr.write(`✗ ${report.file} has ${report.errors.length} error(s):\n`);
    for (const err of report.errors) {
      process.stderr.write(`${formatError(err)}\n`);
    }
  }
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description(
      'Validate workflow JSON files against the cc-wf-studio schema. Accepts files and/or directories (directories are searched recursively for *.json).'
    )
    .argument('<paths...>', 'Workflow JSON files and/or directories containing them.')
    .option('--json', 'Print the machine-readable result JSON to stdout.', false)
    .option<SupportedAgent[]>(
      '--agent <name>',
      `Also preflight target compatibility for one or more agents (repeatable; one of: ${SUPPORTED_AGENTS.join(', ')}, or 'all' for every target): report which configured fields each target ignores, without writing files. Warnings do not affect the exit code.`,
      parseValidateAgent
    )
    .action(async (paths: string[], options: ValidateOptions) => {
      let files: string[];
      try {
        files = await expandPaths(paths);
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }

      const agents = options.agent ?? [];
      const reports: FileReport[] = [];
      for (const file of files) {
        reports.push(await validateFile(file, agents));
      }

      const unreadable = reports.filter((r) => 'loadError' in r).length;
      const failed = reports.filter((r) => !('loadError' in r) && !r.valid).length;
      const passed = reports.length - unreadable - failed;
      const exitCode = unreadable > 0 ? 2 : failed > 0 ? 1 : 0;

      if (options.json) {
        if (files.length === 1) {
          // Single-file shape is a stable contract: the raw ValidationResult
          // (plus `warnings` with --agent), exactly as earlier versions printed.
          const report = reports[0];
          if ('loadError' in report) {
            process.stderr.write(`error: ${report.loadError}\n`);
          } else {
            const { file: _file, ...payload } = report;
            process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
          }
        } else {
          const payload = { valid: exitCode === 0, files: reports };
          process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        }
        process.exit(exitCode);
      }

      for (const report of reports) {
        printHumanReport(report, agents);
      }
      if (files.length > 1) {
        const parts = [`${passed} passed`, `${failed} failed`];
        if (unreadable > 0) {
          parts.push(`${unreadable} unreadable`);
        }
        const summary = `${parts.join(', ')} (${files.length} files checked).\n`;
        (exitCode === 0 ? process.stdout : process.stderr).write(summary);
      }
      process.exit(exitCode);
    });
}
