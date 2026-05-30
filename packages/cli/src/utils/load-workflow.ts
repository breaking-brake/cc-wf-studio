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
  return { workflow: parsed as Workflow, absolutePath };
}
