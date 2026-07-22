/**
 * `ccwf validate <file>` — schema-check a workflow JSON file.
 *
 * Default output is a human-readable error list on stderr; exit 0 on pass,
 * exit 1 on validation failure. `--json` prints the raw `ValidationResult`
 * to stdout for CI scripting (still exit 0/1 by `valid` flag).
 *
 * `--agent <name>` additionally preflights target compatibility: it reports
 * the same warnings `ccwf export --agent <name>` would print (Claude
 * Code-only nodes, fields the target ignores) without writing any files.
 * Warnings never affect the exit code — only schema validity does.
 */

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

function formatError(err: ValidationError): string {
  const fieldSuffix = err.field ? ` (field: ${err.field})` : '';
  return `  - [${err.code}] ${err.message}${fieldSuffix}`;
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate a workflow JSON file against the cc-wf-studio schema.')
    .argument('<file>', 'Path to a workflow JSON file.')
    .option('--json', 'Print the raw ValidationResult JSON to stdout.', false)
    .option<SupportedAgent>(
      '--agent <name>',
      `Also preflight target compatibility for an agent (one of: ${SUPPORTED_AGENTS.join(', ')}): report which configured fields that target ignores, without writing files. Warnings do not affect the exit code.`,
      (value) => asSupportedAgent(value)
    )
    .action(async (file: string, options: ValidateOptions) => {
      try {
        const { workflow, absolutePath } = await loadWorkflowFromFile(file);
        const result = validateAIGeneratedWorkflow(workflow);
        // Compatibility warnings only for a schema-valid workflow —
        // malformed node data would produce garbage reports.
        const warnings =
          options.agent && result.valid
            ? collectAgentCompatibilityWarnings(workflow, options.agent)
            : [];

        if (options.json) {
          const payload = options.agent ? { ...result, warnings } : result;
          process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        } else if (result.valid) {
          process.stdout.write(`✓ ${absolutePath} is valid.\n`);
          if (options.agent) {
            if (warnings.length === 0) {
              process.stdout.write(`✓ No target-compatibility warnings for ${options.agent}.\n`);
            } else {
              for (const warning of warnings) {
                process.stderr.write(`warning: ${warning}\n`);
              }
            }
          }
        } else {
          process.stderr.write(`✗ ${absolutePath} has ${result.errors.length} error(s):\n`);
          for (const err of result.errors) {
            process.stderr.write(`${formatError(err)}\n`);
          }
        }

        process.exit(result.valid ? 0 : 1);
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
