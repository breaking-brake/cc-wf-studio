/**
 * S4 (issue #1008) — the `<file>` load error contract.
 *
 * `loadWorkflowFromFile` is shared by every subcommand that takes a `<file>`
 * argument, so its error shape *is* the CLI's exit-code contract: commander
 * turns a `WorkflowLoadError` into a clean stderr line and `exitCode`, and
 * anything else into a raw stack trace. If the wrapping regresses, a user who
 * mistypes a path gets a stack trace instead of "File not found".
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkflowLoadError, loadWorkflowFromFile } from '../../utils/load-workflow.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-load-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/** Assert the rejection is a WorkflowLoadError and hand it back. */
async function expectLoadError(filePath: string): Promise<WorkflowLoadError> {
  let caught: unknown;
  try {
    await loadWorkflowFromFile(filePath);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(WorkflowLoadError);
  return caught as WorkflowLoadError;
}

describe('loadWorkflowFromFile', () => {
  it('reports a missing file with exit code 2 and the absolute path', async () => {
    // A relative path in, an absolute path out: the input is resolved before
    // the read, so the user is told which file was actually looked for.
    const relative = path.join('ccwf-load-does-not-exist', 'workflow.json');

    const error = await expectLoadError(relative);

    expect(error.exitCode).toBe(2);
    expect(error.message.startsWith('File not found: ')).toBe(true);
    expect(error.message).toContain(path.resolve(relative));
    expect(path.isAbsolute(error.message.slice('File not found: '.length))).toBe(true);
  });

  it('reports malformed JSON with exit code 2', async () => {
    const broken = path.join(tmpDir, 'broken.json');
    await fs.writeFile(broken, '{ "name": ', 'utf-8');

    const error = await expectLoadError(broken);

    expect(error.exitCode).toBe(2);
    expect(error.message.startsWith('Invalid JSON in ')).toBe(true);
    expect(error.message).toContain(broken);
  });

  it('returns the parsed workflow and the absolute path it was read from', async () => {
    const workflow = {
      id: 'workflow-1',
      name: 'Sample Workflow',
      version: '1.0.0',
      nodes: [],
      connections: [],
    };
    const file = path.join(tmpDir, 'workflow.json');
    await fs.writeFile(file, JSON.stringify(workflow), 'utf-8');

    const loaded = await loadWorkflowFromFile(file);

    expect(loaded.absolutePath).toBe(path.resolve(file));
    expect(loaded.workflow.name).toBe('Sample Workflow');
  });
});
