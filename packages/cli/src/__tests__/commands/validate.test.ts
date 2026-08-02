/**
 * S4 — the `ccwf validate` exit-code and stream contract (issue #1036).
 *
 * Subject: **the exit code and which stream each line lands on**, never the
 * content of the validation errors themselves (that is #994's subject, which
 * covers `validateAIGeneratedWorkflow` directly). Every case here asserts on
 * `process.exit`'s argument and on stdout/stderr as two separate buffers.
 *
 * The load-bearing case is C4: `--json` on an invalid workflow still exits 1.
 * The exit code is the entire machine-readable surface of this command — a
 * regression that returns early after the JSON branch, or that keys the exit
 * code off `options.json`, turns `ccwf validate --json` in CI into a gate that
 * always passes and the broken workflow ships.
 *
 * Harness notes:
 * - `validate`'s action closure is not exported, so every case drives it
 *   through commander with `{ from: 'user' }` (no node/script argv is passed).
 * - `process.exit` is stubbed to **throw**, not to no-op. A no-op mock lets
 *   execution fall through past the exit, and the case then asserts the
 *   opposite of what really happens (recorded for #1006/#1008).
 * - stdout and stderr are captured **separately**: `ccwf validate x.json >
 *   out.txt` in CI captures the success line but not the error list, so a
 *   regression that moves the `✗` block to stdout is user-visible and would
 *   pass a combined-output assertion.
 *
 * Determinism: one `mkdtemp` per test, removed in `afterEach`. The only path
 * read outside it is the committed, read-only `fixtures/sample-workflow.json`.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeType, type Workflow } from '@cc-wf-studio/core';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerValidateCommand } from '../../commands/validate.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXED_EPOCH = new Date(0);
const position = { x: 0, y: 0 };

/**
 * A workflow that passes `validateAIGeneratedWorkflow`.
 *
 * The name is deliberately lowercase: `VALIDATION_RULES.WORKFLOW.NAME_PATTERN`
 * is `/^[a-z0-9_-]+$/`, so `export.test.ts`'s `makeWorkflow` helper (which
 * names its workflow `Sample Workflow`) produces input that is *invalid* here.
 */
function validWorkflow(): Workflow {
  return {
    id: 'workflow-1',
    name: 'sample-workflow',
    description: 'A workflow that validates.',
    version: '1.0.0',
    nodes: [
      { id: 'start-1', type: NodeType.Start, name: 'start', position, data: {} },
      {
        id: 'prompt-1',
        type: NodeType.Prompt,
        name: 'greet-user',
        position,
        data: { prompt: 'Say hello.', outputPorts: 1 },
      },
      { id: 'end-1', type: NodeType.End, name: 'end', position, data: {} },
    ],
    connections: [
      { id: 'c-1', from: 'start-1', to: 'prompt-1' },
      { id: 'c-2', from: 'prompt-1', to: 'end-1' },
    ],
    createdAt: FIXED_EPOCH,
    updatedAt: FIXED_EPOCH,
  } as Workflow;
}

/**
 * Two independent violations, so the `N error(s)` count is observable as a
 * number greater than one. Both errors carry a `field`.
 */
function invalidWorkflow(): Workflow {
  const workflow: Record<string, unknown> = { ...validWorkflow() };
  workflow.id = undefined;
  workflow.name = 'Name With Spaces';
  return workflow as unknown as Workflow;
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Thrown by the `process.exit` stub so control does not fall through. */
class ProcessExitError extends Error {
  constructor(readonly code: number | string | null | undefined) {
    super(`process.exit(${String(code)})`);
    this.name = 'ProcessExitError';
  }
}

let tmpDir: string;
let stdoutChunks: string[];
let stderrChunks: string[];

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-validate-'));
  stdoutChunks = [];
  stderrChunks = [];

  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    stdoutChunks.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderrChunks.push(String(chunk));
    return true;
  });
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitError(code);
  }) as never);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function stdout(): string {
  return stdoutChunks.join('');
}

function stderr(): string {
  return stderrChunks.join('');
}

/**
 * Drive `ccwf validate` through commander.
 *
 * Returns the code handed to `process.exit`. `validate` exits on every path,
 * so a returned `undefined` means the command fell through without exiting —
 * itself a contract violation, and asserted as such where it matters.
 */
async function runValidate(...args: string[]): Promise<number | string | null | undefined> {
  const program = new Command();
  registerValidateCommand(program);
  try {
    await program.parseAsync(['validate', ...args], { from: 'user' });
    return undefined;
  } catch (error) {
    if (error instanceof ProcessExitError) {
      return error.code;
    }
    throw error;
  }
}

/** Write JSON (or arbitrary text) into the temp dir and return its path. */
async function writeFile(contents: unknown, fileName = 'workflow.json'): Promise<string> {
  const file = path.join(tmpDir, fileName);
  const body = typeof contents === 'string' ? contents : JSON.stringify(contents);
  await fs.writeFile(file, body, 'utf-8');
  return file;
}

// ---------------------------------------------------------------------------
// A. The human-readable path
// ---------------------------------------------------------------------------

describe('ccwf validate — human-readable output', () => {
  it('exits 0 and reports success on stdout, writing nothing to stderr', async () => {
    const file = await writeFile(validWorkflow());

    expect(await runValidate(file)).toBe(0);

    expect(stdout()).toBe(`✓ ${path.resolve(file)} is valid.\n`);
    expect(stderr()).toBe('');
  });

  it('exits 1 and reports failures on stderr, writing nothing to stdout', async () => {
    const file = await writeFile(invalidWorkflow());

    expect(await runValidate(file)).toBe(1);

    expect(stderr()).toContain(`✗ ${path.resolve(file)} has `);
    expect(stderr()).toContain('error(s):');
    // The failure list must not leak onto stdout: a CI job redirecting stdout
    // to a file would otherwise capture the errors and drop the success line.
    expect(stdout()).toBe('');
  });

  it('prints exactly as many error lines as the header claims', async () => {
    const file = await writeFile(invalidWorkflow());

    expect(await runValidate(file)).toBe(1);

    // The count in the header is computed from `result.errors.length`, the
    // lines from a separate loop; a header saying 3 while printing 2 is the
    // silent case this asserts against.
    const claimed = Number(/has (\d+) error\(s\):/.exec(stderr())?.[1]);
    const printed = stderr()
      .split('\n')
      .filter((line) => line.startsWith('  - [')).length;
    expect(claimed).toBeGreaterThan(1);
    expect(printed).toBe(claimed);
  });
});

// ---------------------------------------------------------------------------
// B. The `field` suffix, both directions
// ---------------------------------------------------------------------------

describe('ccwf validate — error line formatting', () => {
  it('appends the field name when the error carries one', async () => {
    const file = await writeFile(invalidWorkflow());

    await runValidate(file);

    // `MISSING_FIELD` on the workflow id is the canonical field-carrying error.
    expect(stderr()).toContain('[MISSING_FIELD]');
    expect(stderr()).toContain('(field: id)');
  });

  it('appends no suffix when the error carries no field', async () => {
    // A JSON document that parses but is not an object: the validator's
    // top-level `INVALID_TYPE` is produced without a `field`.
    const file = await writeFile('"not a workflow at all"');

    expect(await runValidate(file)).toBe(1);

    expect(stderr()).toContain('[INVALID_TYPE]');
    expect(stderr()).not.toContain('(field:');
  });
});

// ---------------------------------------------------------------------------
// C. The `--json` machine-readable path
// ---------------------------------------------------------------------------

describe('ccwf validate --json', () => {
  it('writes a parseable ValidationResult to stdout and exits 0 when valid', async () => {
    const file = await writeFile(validWorkflow());

    expect(await runValidate(file, '--json')).toBe(0);

    // Parsed, not string-matched: the payload is the machine-readable
    // contract, and a malformed one is otherwise invisible.
    const parsed = JSON.parse(stdout());
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toEqual([]);
  });

  it('still exits 1 when the workflow is invalid', async () => {
    const file = await writeFile(invalidWorkflow());

    const exitCode = await runValidate(file, '--json');

    // Both halves in one case on purpose: a regression that returns early
    // after writing the JSON, or that keys the exit code off `options.json`,
    // leaves the payload correct while the CI gate goes green regardless.
    const parsed = JSON.parse(stdout());
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(exitCode).toBe(1);
  });

  it('writes nothing to stderr when the workflow is invalid', async () => {
    const file = await writeFile(invalidWorkflow());

    await runValidate(file, '--json');

    // The `if / else if / else` chain makes the JSON and human-readable
    // outputs mutually exclusive; a regression to a plain `if` emits both and
    // a consumer piping stderr sees a duplicate report.
    expect(stderr()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// D. Load failures map to exit 2
// ---------------------------------------------------------------------------

describe('ccwf validate — load failures', () => {
  it('exits 2 with a stderr line when the file does not exist', async () => {
    const missing = path.join(tmpDir, 'absent.json');

    expect(await runValidate(missing)).toBe(2);

    expect(stderr()).toContain(`error: File not found: ${path.resolve(missing)}`);
    expect(stdout()).toBe('');
  });

  it('exits 2 with a stderr line when the file is not valid JSON', async () => {
    const file = await writeFile('{ "name": ', 'broken.json');

    // 2 rather than 1 is the point: without the `catch`'s `error.exitCode`,
    // the rejection escapes to cli.ts's generic handler, which exits 1 and
    // makes a broken file indistinguishable from a failed validation.
    expect(await runValidate(file)).toBe(2);

    expect(stderr()).toContain('error: Invalid JSON in ');
    expect(stdout()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// E. The shipped example
// ---------------------------------------------------------------------------

describe('ccwf validate — committed fixture', () => {
  it('accepts fixtures/sample-workflow.json, the workflow the README examples use', async () => {
    // Read-only, and the one path this suite touches outside its temp dir.
    // Pins a user-facing claim: the example shipped with the CLI validates.
    const fixture = fileURLToPath(new URL('../../../fixtures/sample-workflow.json', import.meta.url));

    expect(await runValidate(fixture, '--json')).toBe(0);

    expect(JSON.parse(stdout()).valid).toBe(true);
  });
});
