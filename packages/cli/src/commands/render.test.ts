/**
 * S4 — the `ccwf render` format-dispatch and composition contract (issue #1036).
 *
 * Subject: **which sections the command assembles and in what order**, never
 * what the generators put inside them — the Mermaid and execution-instruction
 * content is #995's / #1024's subject in `packages/core`. What is under test
 * here is the CLI-level composition: format dispatch, section order, the
 * title/description fallbacks, and the streams and exit codes.
 *
 * The trap this suite is written around: the two formats **share a prefix**,
 * so a bare `toContain('```mermaid')` passes on the `md` bundle too and the
 * mermaid-only case would succeed for the wrong reason (recorded for #1024's
 * mode-dispatch cases). Section A therefore asserts the mermaid output by
 * equality *and* asserts the execution heading is absent.
 *
 * Harness notes match `validate.test.ts`: commander with `{ from: 'user' }`,
 * `process.exit` stubbed to **throw** rather than no-op, stdout and stderr
 * captured separately. Unlike `validate`, `render` exits only on failure — the
 * success paths return normally, which the helper reports as `undefined`.
 *
 * Determinism: one `mkdtemp` per test, removed in `afterEach`; nothing outside
 * it is read or written.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeType, type Workflow, generateMermaidFlowchart } from '@cc-wf-studio/core';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerRenderCommand } from './render.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXED_EPOCH = new Date(0);
const position = { x: 0, y: 0 };

/** The heading the execution-instruction bundle always opens with. */
const EXECUTION_HEADING = '## Workflow Execution Guide';

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'workflow-1',
    name: 'sample-workflow',
    description: 'A workflow used to check section order.',
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
    ...overrides,
  } as Workflow;
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-render-'));
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
 * Drive `ccwf render` through commander.
 *
 * Returns the code handed to `process.exit`, or `undefined` when the command
 * completed without exiting — which is the success contract for `render`.
 * Errors that are not a `process.exit` (case F) propagate to the caller.
 */
async function runRender(...args: string[]): Promise<number | string | null | undefined> {
  const program = new Command();
  registerRenderCommand(program);
  try {
    await program.parseAsync(['render', ...args], { from: 'user' });
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
// A. `--format mermaid` — the piping format
// ---------------------------------------------------------------------------

describe('ccwf render --format mermaid', () => {
  it('emits the fenced block and nothing else', async () => {
    const workflow = makeWorkflow();
    const file = await writeFile(workflow);

    expect(await runRender(file, '--format', 'mermaid')).toBeUndefined();

    // Equality, not containment: this output is piped into mermaid-cli, so a
    // single stray line breaks the consumer. The expected block comes from the
    // generator because its *content* is #995's subject, not this suite's —
    // what is asserted here is that render adds exactly one newline and stops.
    expect(stdout()).toBe(`${generateMermaidFlowchart(workflow)}\n`);
    expect(stderr()).toBe('');
  });

  it('omits the execution instructions entirely', async () => {
    const file = await writeFile(makeWorkflow());

    await runRender(file, '--format', 'mermaid');

    // Asserted explicitly because the md bundle also contains a ```mermaid
    // fence: without this, a regression that drops the early `return` and
    // falls through to the bundle still passes every containment check above.
    expect(stdout()).not.toContain(EXECUTION_HEADING);
  });
});

// ---------------------------------------------------------------------------
// B. The default `md` bundle
// ---------------------------------------------------------------------------

describe('ccwf render — default md bundle', () => {
  it('defaults to md when no --format is given, in title → description → diagram → instructions order', async () => {
    const workflow = makeWorkflow();
    const file = await writeFile(workflow);

    expect(await runRender(file)).toBeUndefined();

    const out = stdout();
    const title = out.indexOf('# sample-workflow');
    const description = out.indexOf('A workflow used to check section order.');
    const diagram = out.indexOf('```mermaid');
    const instructions = out.indexOf(EXECUTION_HEADING);

    // Relative order by index, not mere presence: a reordering regression
    // leaves every section present and would pass a containment-only check.
    expect(title).toBeGreaterThanOrEqual(0);
    expect(description).toBeGreaterThan(title);
    expect(diagram).toBeGreaterThan(description);
    expect(instructions).toBeGreaterThan(diagram);
  });

  it('produces the same bundle when md is passed explicitly', async () => {
    const file = await writeFile(makeWorkflow());
    await runRender(file);
    const implicit = stdout();

    stdoutChunks = [];
    await runRender(file, '--format', 'md');

    expect(stdout()).toBe(implicit);
  });
});

// ---------------------------------------------------------------------------
// C. Title and description fallbacks
// ---------------------------------------------------------------------------

describe('ccwf render — header fallbacks', () => {
  it('emits no stray text and no "undefined" when the workflow has no description', async () => {
    const workflow = makeWorkflow();
    (workflow as { description?: string }).description = undefined;
    const file = await writeFile(workflow);

    await runRender(file);

    const out = stdout();
    // The ternary's falsy arm is a bare newline; the literal string
    // "undefined" in a rendered document is the visible symptom of losing it.
    expect(out).not.toContain('undefined');
    expect(out.indexOf('```mermaid')).toBeGreaterThan(out.indexOf('# sample-workflow'));
  });

  it.each([
    ['an absent name', undefined],
    ['an empty name', ''],
  ])('falls back to "# Workflow" for %s', async (_label, name) => {
    const workflow = makeWorkflow();
    (workflow as { name?: string }).name = name;
    const file = await writeFile(workflow);

    await runRender(file);

    expect(stdout().startsWith('# Workflow\n')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D. The option parser
// ---------------------------------------------------------------------------

describe('ccwf render — --format validation', () => {
  it('rejects an unknown format before the action runs, writing nothing to stdout', async () => {
    const file = await writeFile(makeWorkflow());

    await runRender(file, '--format', 'svg');

    expect(stderr()).toContain("Expected 'mermaid' or 'md'.");
    // The parser runs before the action, so no part of the document is emitted.
    expect(stdout()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// E. Load failures map to exit 2
// ---------------------------------------------------------------------------

describe('ccwf render — load failures', () => {
  it('exits 2 with a stderr line when the file does not exist', async () => {
    const missing = path.join(tmpDir, 'absent.json');

    expect(await runRender(missing)).toBe(2);

    expect(stderr()).toContain(`error: File not found: ${path.resolve(missing)}`);
    expect(stdout()).toBe('');
  });

  it('exits 2 with a stderr line when the file is not valid JSON', async () => {
    const file = await writeFile('{ "name": ', 'broken.json');

    expect(await runRender(file)).toBe(2);

    expect(stderr()).toContain('error: Invalid JSON in ');
    expect(stdout()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// F. Observed, not designed
// ---------------------------------------------------------------------------

describe('ccwf render — a JSON file that parses but is not a workflow', () => {
  it('OBSERVED (not desired): dies with a raw TypeError instead of a clean exit 2', async () => {
    const file = await writeFile({ id: 'not-a-workflow' });

    // `generateMermaidFlowchart` reaches `nodes.filter` on `undefined`, so the
    // error is neither a WorkflowLoadError nor caught by the action's `catch`;
    // it escapes to cli.ts's generic handler, which prints a stack and exits 1.
    // `ccwf validate` handles the identical input gracefully.
    //
    // Deliberately NOT filed as a bug: #1008 already flagged the identical
    // shape on the `export` path and left it as a feature-track question.
    await expect(runRender(file)).rejects.toThrow(TypeError);

    expect(stdout()).toBe('');
  });
});
