/**
 * Suite S5 (write half), section A — `FileWorkflowAdapter` optimistic locking
 * and the atomic write.
 *
 * This is the only code path in the product where an external AI agent writes
 * to the user's `workflow.json`. A defect here is destructive rather than
 * cosmetic, and it is invisible on the user's machine until they reopen the
 * canvas and find their edits gone — so the assertions that matter most are
 * the negative ones: *the file on disk is byte-for-byte unchanged*.
 *
 * Determinism: one `fs.mkdtemp` per test, removed in `afterEach`. Nothing
 * outside the temp directory is read or written; no network, no wall clock.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileWorkflowAdapter } from '../file-adapter.js';
import { promptNode, serialize, validWorkflow } from './__fixtures__/workflows.js';

let tmpDir: string;
let filePath: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-mcp-adapter-'));
  filePath = path.join(tmpDir, 'workflow.json');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeAdapter(target = filePath): FileWorkflowAdapter {
  return new FileWorkflowAdapter({ filePath: target, projectRoot: tmpDir });
}

function sha256(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/** Seed the target file and return the revision the adapter should compute for it. */
async function seed(workflow = validWorkflow()): Promise<string> {
  const content = serialize(workflow);
  await fs.writeFile(filePath, content, 'utf-8');
  return sha256(content);
}

describe('FileWorkflowAdapter.applyWorkflow — optimistic locking', () => {
  it('writes when expectedRevision matches, and reports the new revision', async () => {
    const currentRevision = await seed();
    const next = validWorkflow({ name: 'renamed-workflow' });

    const result = await makeAdapter().applyWorkflow(next, {
      expectedRevision: currentRevision,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const onDisk = await fs.readFile(filePath, 'utf-8');
    expect(onDisk).toBe(serialize(next));
    // The reported revision describes the file that now exists, not the one
    // that was replaced — a caller uses it as the expectedRevision of its next
    // write, so a stale value here would make every subsequent write conflict.
    expect(result.revision).toBe(sha256(onDisk));
  });

  it('refuses a stale expectedRevision and leaves the file byte-for-byte unchanged', async () => {
    const staleRevision = await seed();
    // Somebody else writes in between — the user editing on the canvas.
    const concurrent = validWorkflow({ name: 'edited-by-the-user' });
    await fs.writeFile(filePath, serialize(concurrent), 'utf-8');
    const bytesBefore = await fs.readFile(filePath);

    const result = await makeAdapter().applyWorkflow(validWorkflow({ name: 'agent-version' }), {
      expectedRevision: staleRevision,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Revision conflict');
    // The *current* hash comes back, so the caller can re-read and retry.
    expect(result.revision).toBe(sha256(serialize(concurrent)));
    expect(result.revision).not.toBe(staleRevision);

    // The load-bearing assertion: the concurrent edit survived intact.
    const bytesAfter = await fs.readFile(filePath);
    expect(bytesAfter.equals(bytesBefore)).toBe(true);
  });

  it('writes unconditionally when no expectedRevision is supplied', async () => {
    await seed();
    const next = validWorkflow({ name: 'unconditional-write' });

    const result = await makeAdapter().applyWorkflow(next, {});

    // The lock is opt-in by design. Pinned so a change to that default is
    // deliberate rather than accidental.
    expect(result.success).toBe(true);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(serialize(next));
  });

  it('creates the file when expectedRevision is supplied but nothing exists yet', async () => {
    const next = validWorkflow();

    const result = await makeAdapter().applyWorkflow(next, {
      expectedRevision: sha256('whatever the caller thinks is there'),
    });

    // `currentRevision !== null &&` guards the comparison, so a missing file
    // bypasses the conflict check entirely rather than reporting a conflict.
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(await fs.readFile(filePath, 'utf-8')).toBe(serialize(next));
  });
});

describe('FileWorkflowAdapter.getCurrentWorkflow', () => {
  it('reports no workflow — not an error — when the file does not exist', async () => {
    const result = await makeAdapter().getCurrentWorkflow();

    expect(result.workflow).toBeNull();
    expect('revision' in result ? result.revision : undefined).toBeUndefined();
  });

  it('round-trips a workflow and reports the revision of the bytes it read', async () => {
    const workflow = validWorkflow();
    const revision = await seed(workflow);

    const result = await makeAdapter().getCurrentWorkflow();

    expect(result.workflow).toEqual(workflow);
    expect('revision' in result ? result.revision : undefined).toBe(revision);
  });
});

describe('FileWorkflowAdapter — atomic write', () => {
  it('leaves no temp-file sibling behind', async () => {
    await makeAdapter().applyWorkflow(validWorkflow(), {});

    const entries = await fs.readdir(tmpDir);
    expect(entries).toEqual(['workflow.json']);
    expect(entries.some((e) => e.endsWith('.tmp'))).toBe(false);
  });

  it('creates missing parent directories', async () => {
    const nested = path.join(tmpDir, 'deeply', 'nested', 'dir', 'workflow.json');
    const workflow = validWorkflow();

    const result = await makeAdapter(nested).applyWorkflow(workflow, {});

    expect(result.success).toBe(true);
    expect(await fs.readFile(nested, 'utf-8')).toBe(serialize(workflow));
    expect(await fs.readdir(path.dirname(nested))).toEqual(['workflow.json']);
  });

  it('computes the revision over the serialized content including the trailing newline', async () => {
    const result = await makeAdapter().applyWorkflow(validWorkflow(), {});

    expect(result.revision).toMatch(/^sha256:[0-9a-f]{64}$/);

    const onDisk = await fs.readFile(filePath, 'utf-8');
    expect(onDisk.endsWith('}\n')).toBe(true);
    expect(result.revision).toBe(sha256(onDisk));
    // Explicitly *not* the hash of the content without the newline — the two
    // differ, and hashing the wrong one would make every read-then-write cycle
    // report a spurious conflict.
    expect(result.revision).not.toBe(sha256(onDisk.trimEnd()));
  });

  it('is idempotent: the same workflow written twice yields the same revision', async () => {
    const workflow = validWorkflow({
      nodes: [...validWorkflow().nodes, promptNode('prompt-2', 'Second step')],
    });
    const adapter = makeAdapter();

    const first = await adapter.applyWorkflow(workflow, {});
    const second = await adapter.applyWorkflow(workflow, {
      expectedRevision: first.revision,
    });

    expect(second.success).toBe(true);
    expect(second.revision).toBe(first.revision);
  });
});
