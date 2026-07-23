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
 * Warnings never affect the exit code — only schema validity does.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type ValidationError, validateAIGeneratedWorkflow } from '@cc-wf-studio/core';
import { Command } from 'commander';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';
import {
  SUPPORTED_AGENTS,
  type SupportedAgent,
  asSupportedAgent,
  collectAgentCompatibilityWarnings,
} from './export.js';

interface ValidateOptions {
  json?: boolean;
  agent?: SupportedAgent;
}

type FileReport =
  | {
      file: string;
      valid: boolean;
      errors: ValidationError[];
      warnings?: string[];
    }
  | {
      file: string;
      valid: false;
      loadError: string;
    };

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

async function validateFile(file: string, agent: SupportedAgent | undefined): Promise<FileReport> {
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
  const warnings =
    agent && result.valid ? collectAgentCompatibilityWarnings(workflow, agent) : undefined;
  return {
    file,
    valid: result.valid,
    errors: result.errors,
    ...(agent ? { warnings: warnings ?? [] } : {}),
  };
}

function printHumanReport(report: FileReport, agent: SupportedAgent | undefined): void {
  if ('loadError' in report) {
    process.stderr.write(`error: ${report.loadError}\n`);
    return;
  }
  if (report.valid) {
    process.stdout.write(`✓ ${report.file} is valid.\n`);
    if (agent) {
      const warnings = report.warnings ?? [];
      if (warnings.length === 0) {
        process.stdout.write(`✓ No target-compatibility warnings for ${agent}.\n`);
      } else {
        for (const warning of warnings) {
          process.stderr.write(`warning: ${warning}\n`);
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
    .option<SupportedAgent>(
      '--agent <name>',
      `Also preflight target compatibility for an agent (one of: ${SUPPORTED_AGENTS.join(', ')}): report which configured fields that target ignores, without writing files. Warnings do not affect the exit code.`,
      (value) => asSupportedAgent(value)
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

      const reports: FileReport[] = [];
      for (const file of files) {
        reports.push(await validateFile(file, options.agent));
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
        printHumanReport(report, options.agent);
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
