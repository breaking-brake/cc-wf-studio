/**
 * Shared schema-validation reporting for the subcommands that consume a
 * workflow file.
 *
 * `ccwf validate` has always printed a `  - [CODE] message (field: x)` line
 * per error; `ccwf export` / `ccwf run` gate their writes on the same check,
 * so the formatter lives here and every command prints identical lines.
 */

import { type ValidationError, type Workflow, validateAIGeneratedWorkflow } from '@cc-wf-studio/core';

/** One human-readable line for a single validation error. */
export function formatValidationError(err: ValidationError): string {
  const fieldSuffix = err.field ? ` (field: ${err.field})` : '';
  return `  - [${err.code}] ${err.message}${fieldSuffix}`;
}

/**
 * Thrown by the export path when the workflow fails schema validation and
 * `--no-validate` was not passed. Carries everything the caller needs to
 * render the failure (human or JSON) and exit 1.
 */
export class WorkflowInvalidError extends Error {
  /** Every schema error, in validator order. */
  readonly errors: ValidationError[];
  /** Absolute path (or `<stdin>`) the workflow came from. */
  readonly sourceLabel: string;

  constructor(errors: ValidationError[], sourceLabel: string) {
    super(`${sourceLabel} has ${errors.length} validation error(s).`);
    this.name = 'WorkflowInvalidError';
    this.errors = errors;
    this.sourceLabel = sourceLabel;
  }
}

/**
 * Throw {@link WorkflowInvalidError} unless `workflow` passes schema
 * validation. Called before anything is planned or written, so an invalid
 * workflow can never leave half-broken skill files behind.
 */
export function assertWorkflowValid(workflow: Workflow, sourceLabel: string): void {
  const result = validateAIGeneratedWorkflow(workflow);
  if (!result.valid) {
    throw new WorkflowInvalidError(result.errors, sourceLabel);
  }
}

/**
 * Print a validation failure the way `ccwf validate` prints it, plus the line
 * explaining that nothing was written, then exit 1.
 */
export function reportWorkflowInvalid(error: WorkflowInvalidError): never {
  process.stderr.write(`✗ ${error.sourceLabel} has ${error.errors.length} error(s):\n`);
  for (const err of error.errors) {
    process.stderr.write(`${formatValidationError(err)}\n`);
  }
  process.stderr.write(
    'error: refusing to write files for an invalid workflow. Fix the errors above (see `ccwf validate`), or pass --no-validate to export anyway.\n'
  );
  process.exit(1);
}
