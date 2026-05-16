/**
 * `ccwf validate <file>` — schema-check a workflow JSON file.
 *
 * Default output is a human-readable error list on stderr; exit 0 on pass,
 * exit 1 on validation failure. `--json` prints the raw `ValidationResult`
 * to stdout for CI scripting (still exit 0/1 by `valid` flag).
 */

import { Command } from 'commander';
import { type ValidationError, validateAIGeneratedWorkflow } from '@cc-wf-studio/core';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

interface ValidateOptions {
  json?: boolean;
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
    .action(async (file: string, options: ValidateOptions) => {
      try {
        const { workflow, absolutePath } = await loadWorkflowFromFile(file);
        const result = validateAIGeneratedWorkflow(workflow);

        if (options.json) {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else if (result.valid) {
          process.stdout.write(`✓ ${absolutePath} is valid.\n`);
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
