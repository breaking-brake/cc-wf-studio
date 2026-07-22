/**
 * Read a workflow JSON file from disk and parse it.
 *
 * Used by every subcommand that takes a `<file>` argument. Errors are wrapped
 * so commander can surface a stable exit code (2) with a friendly stderr line
 * instead of a raw stack trace.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Workflow } from '@cc-wf-studio/core';

export class WorkflowLoadError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 2
  ) {
    super(message);
    this.name = 'WorkflowLoadError';
  }
}

/**
 * Minimal shape check — every workflow carries a `nodes` array. Full
 * validation stays in `ccwf validate`; this only exists so downstream
 * generators never dereference `undefined`.
 */
function looksLikeWorkflow(value: unknown): value is Workflow {
  return (
    typeof value === 'object' && value !== null && Array.isArray((value as Partial<Workflow>).nodes)
  );
}

export async function loadWorkflowFromFile(filePath: string): Promise<{
  workflow: Workflow;
  absolutePath: string;
}> {
  const absolutePath = path.resolve(filePath);
  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new WorkflowLoadError(`File not found: ${absolutePath}`);
    }
    throw new WorkflowLoadError(
      `Failed to read ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new WorkflowLoadError(
      `Invalid JSON in ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (looksLikeWorkflow(parsed)) {
    return { workflow: parsed, absolutePath };
  }
  // Sample/share files wrap the workflow: { meta: {...}, workflow: {...} }
  const wrapped =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { workflow?: unknown }).workflow
      : undefined;
  if (looksLikeWorkflow(wrapped)) {
    return { workflow: wrapped, absolutePath };
  }
  throw new WorkflowLoadError(
    `${absolutePath} does not look like a workflow file: expected a top-level "nodes" array or a { meta, workflow } wrapper`
  );
}
