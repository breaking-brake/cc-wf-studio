/**
 * Read a workflow JSON file from disk (or stdin) and parse it.
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

function parseWorkflowSource(raw: string, sourceLabel: string): Workflow {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new WorkflowLoadError(
      `Invalid JSON in ${sourceLabel}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (looksLikeWorkflow(parsed)) {
    return parsed;
  }
  // Sample/share files wrap the workflow: { meta: {...}, workflow: {...} }
  const wrapped =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { workflow?: unknown }).workflow
      : undefined;
  if (looksLikeWorkflow(wrapped)) {
    return wrapped;
  }
  throw new WorkflowLoadError(
    `${sourceLabel} does not look like a workflow file: expected a top-level "nodes" array or a { meta, workflow } wrapper`
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
  return { workflow: parseWorkflowSource(raw, absolutePath), absolutePath };
}

/** Label used wherever a file path would appear in reports and error messages. */
export const STDIN_LABEL = '<stdin>';

/**
 * Read a workflow JSON document from stdin (the `-` argument convention).
 *
 * Refuses to read from an interactive terminal — a bare `ccwf validate -`
 * with nothing piped in would otherwise hang waiting for input forever.
 */
export async function loadWorkflowFromStdin(): Promise<{
  workflow: Workflow;
  absolutePath: string;
}> {
  if (process.stdin.isTTY) {
    throw new WorkflowLoadError(
      `No input on stdin: '-' expects workflow JSON piped in (e.g. \`cat wf.json | ccwf validate -\`).`
    );
  }
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } catch (error) {
    throw new WorkflowLoadError(
      `Failed to read stdin: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (raw.trim() === '') {
    throw new WorkflowLoadError('No input on stdin: received an empty stream.');
  }
  return { workflow: parseWorkflowSource(raw, STDIN_LABEL), absolutePath: STDIN_LABEL };
}
