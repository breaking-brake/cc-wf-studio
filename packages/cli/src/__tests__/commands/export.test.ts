/**
 * S4 — the `ccwf export` write contract (issue #1008).
 *
 * Subject: **where and whether files are written**, never what is inside them
 * (that boundary belongs to #995). Every case therefore asserts on the set of
 * paths on disk and on the bytes of files the command must NOT have touched.
 *
 * The load-bearing case is section B: `runExport` refuses to overwrite and
 * exits 1, and the refusal sweeps the whole plan *before* the write loop
 * starts. If that guard regresses, `ccwf export` silently replaces a
 * hand-edited `.claude/agents/*.md` and still prints `✓ Wrote N file(s)`.
 *
 * Determinism: one `mkdtemp` per test, removed in `afterEach`; nothing outside
 * it is written. Fixtures are built inline rather than read from
 * `fixtures/sample-workflow.json`, which has no `subAgent` nodes and so cannot
 * exercise the multi-file plan at all.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  NodeType,
  type BranchSessionNode,
  type SubAgentNode,
  type Workflow,
  type WorkflowNode,
} from '@cc-wf-studio/core';
import { InvalidArgumentError } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowLoadError } from '../../utils/load-workflow.js';
import { asSupportedAgent, runExport } from '../../commands/export.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXED_EPOCH = new Date(0);
const position = { x: 0, y: 0 };

function subAgentNode(
  id: string,
  name: string,
  extra: Partial<SubAgentNode['data']> = {}
): SubAgentNode {
  return {
    id,
    type: NodeType.SubAgent,
    name,
    position,
    data: {
      description: `${name} description`,
      agentDefinition: `${name} definition`,
      prompt: `Do the ${name} work`,
      outputPorts: 1,
      ...extra,
    },
  };
}

function branchSessionNode(id: string): BranchSessionNode {
  return {
    id,
    type: NodeType.BranchSession,
    name: 'Checkpoint',
    position,
    data: { label: 'Review together', outputPorts: 1 },
  };
}

/** `name` is deliberately mixed-case with a space so the slug rule is visible. */
function makeWorkflow(nodes: WorkflowNode[], name = 'Sample Workflow'): Workflow {
  return {
    id: 'workflow-1',
    name,
    version: '1.0.0',
    nodes,
    connections: [],
    createdAt: FIXED_EPOCH,
    updatedAt: FIXED_EPOCH,
  };
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

let tmpRoot: string;
/** Output root handed to `runExport` as `cwd`. Starts empty. */
let outDir: string;
/** Holds the workflow JSON, so it never pollutes the walked output set. */
let inDir: string;
let exitSpy: ReturnType<typeof vi.spyOn>;
let stderrChunks: string[];
const originalCwd = process.cwd();

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-export-'));
  outDir = path.join(tmpRoot, 'out');
  inDir = path.join(tmpRoot, 'in');
  await fs.mkdir(outDir);
  await fs.mkdir(inDir);

  stderrChunks = [];
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderrChunks.push(String(chunk));
    return true;
  });

  // A no-op mock would let execution fall straight through into the write
  // loop, so the conflict tests would assert the opposite of real behavior.
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitError(code);
  }) as never);
});

afterEach(async () => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

function stderr(): string {
  return stderrChunks.join('');
}

/** Write a workflow to `inDir` and return its path. */
async function writeWorkflowFile(workflow: Workflow, fileName = 'workflow.json'): Promise<string> {
  const file = path.join(inDir, fileName);
  await fs.writeFile(file, JSON.stringify(workflow), 'utf-8');
  return file;
}

/**
 * Every file under `dir`, as `/`-separated paths relative to it, sorted.
 *
 * Used for set-equality assertions rather than per-file `exists` checks: a
 * stray write has to fail the test, and only equality catches that.
 */
async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  async function recurse(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await recurse(abs);
      } else {
        found.push(path.relative(dir, abs).split(path.sep).join('/'));
      }
    }
  }
  await recurse(dir);
  return found.sort();
}

// ---------------------------------------------------------------------------
// A. The write set (claude-code)
// ---------------------------------------------------------------------------

describe('runExport — the claude-code write set', () => {
  it('writes exactly one agent file per inline sub-agent plus the workflow SKILL.md', async () => {
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), subAgentNode('n2', 'Second Agent')])
    );

    await runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir });

    expect(await walk(outDir)).toEqual([
      '.claude/agents/first-agent.md',
      '.claude/agents/second-agent.md',
      '.claude/skills/sample-workflow/SKILL.md',
    ]);
  });

  it('creates the nested output directories from an empty root', async () => {
    const file = await writeWorkflowFile(makeWorkflow([subAgentNode('n1', 'Solo Agent')]));
    // Precondition: the tree really does not exist yet, so the assertion below
    // is about mkdir recursion and not about a directory the harness made.
    expect(await fs.readdir(outDir)).toEqual([]);

    await runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir });

    expect(await walk(outDir)).toEqual([
      '.claude/agents/solo-agent.md',
      '.claude/skills/sample-workflow/SKILL.md',
    ]);
  });

  it('reports absolute written paths under the resolved root, and the slug of the workflow name', async () => {
    const file = await writeWorkflowFile(makeWorkflow([subAgentNode('n1', 'Solo Agent')]));
    // Pass an unresolved path to prove rootDir is resolved, not echoed.
    const unresolved = path.join(outDir, '..', 'out');

    const result = await runExport({
      file,
      agent: 'claude-code',
      overwrite: false,
      cwd: unresolved,
    });

    expect(result.rootDir).toBe(path.resolve(outDir));
    expect(result.writtenPaths).toHaveLength(2);
    for (const written of result.writtenPaths) {
      expect(path.isAbsolute(written)).toBe(true);
      expect(written.startsWith(`${result.rootDir}${path.sep}`)).toBe(true);
    }
    // Stated as the literal slug rather than via nodeNameToFileName: routing
    // the expectation through the function under test would assert nothing.
    expect(result.slashName).toBe('sample-workflow');
  });

  it.each([
    ['commandFilePath', { commandFilePath: '.claude/agents/linked-agent.md' }],
    ['pluginName', { pluginName: 'with-me' }],
    ['builtInType', { builtInType: 'general-purpose' as const }],
  ])(
    'writes no agent file for a sub-agent the user already maintains (%s)',
    async (_label, extra) => {
      const file = await writeWorkflowFile(
        makeWorkflow([
          subAgentNode('n1', 'Inline Agent'),
          subAgentNode('n2', 'Linked Agent', extra as Partial<SubAgentNode['data']>),
        ])
      );

      await runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir });

      // The externally-maintained node must not cause a write to its own name.
      expect(await walk(outDir)).toEqual([
        '.claude/agents/inline-agent.md',
        '.claude/skills/sample-workflow/SKILL.md',
      ]);
    }
  );
});

// ---------------------------------------------------------------------------
// B. Conflict refusal
// ---------------------------------------------------------------------------

describe('runExport — conflict refusal', () => {
  const SENTINEL = 'hand-written by the user; must survive\n';
  /** Last entry in the claude-code plan, so a missing guard writes the rest. */
  const CONFLICT_REL = '.claude/skills/sample-workflow/SKILL.md';

  async function seedConflict(): Promise<string> {
    const conflicting = path.join(outDir, ...CONFLICT_REL.split('/'));
    await fs.mkdir(path.dirname(conflicting), { recursive: true });
    await fs.writeFile(conflicting, SENTINEL, 'utf-8');
    return conflicting;
  }

  it('exits 1 and leaves every planned path untouched when a file already exists', async () => {
    const conflicting = await seedConflict();
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), subAgentNode('n2', 'Second Agent')])
    );

    await expect(
      runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir })
    ).rejects.toThrow(ProcessExitError);

    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy.mock.calls[0]?.[0]).toBe(1);
    expect(stderr()).toContain('error: 1 file(s) already exist');
    expect(stderr()).toContain(conflicting);

    // The all-or-nothing part: the pre-existing file is byte-for-byte intact
    // AND the non-conflicting agent files were never created, because the
    // sweep completes before the write loop begins.
    expect(await fs.readFile(conflicting, 'utf-8')).toBe(SENTINEL);
    expect(await walk(outDir)).toEqual([CONFLICT_REL]);
  });

  it('replaces the conflicting file and writes the rest with overwrite: true', async () => {
    const conflicting = await seedConflict();
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), subAgentNode('n2', 'Second Agent')])
    );

    await runExport({ file, agent: 'claude-code', overwrite: true, cwd: outDir });

    expect(exitSpy).not.toHaveBeenCalled();
    expect(await walk(outDir)).toEqual([
      '.claude/agents/first-agent.md',
      '.claude/agents/second-agent.md',
      CONFLICT_REL,
    ]);
    expect(await fs.readFile(conflicting, 'utf-8')).not.toBe(SENTINEL);
  });

  it('detects conflicts against cwd, not against process.cwd()', async () => {
    // A same-named file inside the *process* working directory must not make
    // an export into a clean root refuse. Pins resolvePlanned against
    // regressing to a cwd-relative resolve, which would also make exports
    // write into whatever directory the caller happens to sit in.
    const processDir = path.join(tmpRoot, 'process-cwd');
    const decoy = path.join(processDir, ...CONFLICT_REL.split('/'));
    await fs.mkdir(path.dirname(decoy), { recursive: true });
    await fs.writeFile(decoy, SENTINEL, 'utf-8');

    const file = await writeWorkflowFile(makeWorkflow([subAgentNode('n1', 'Solo Agent')]));
    process.chdir(processDir);

    await runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir });

    expect(exitSpy).not.toHaveBeenCalled();
    expect(await walk(outDir)).toEqual([
      '.claude/agents/solo-agent.md',
      '.claude/skills/sample-workflow/SKILL.md',
    ]);
    // Nothing was written through process.cwd().
    expect(await fs.readFile(decoy, 'utf-8')).toBe(SENTINEL);
    expect(await walk(processDir)).toEqual([CONFLICT_REL]);
  });
});

// ---------------------------------------------------------------------------
// C. Agent selection
// ---------------------------------------------------------------------------

describe('runExport — agent selection', () => {
  it('materialises the codex plan and nothing under .claude/', async () => {
    const file = await writeWorkflowFile(makeWorkflow([subAgentNode('n1', 'First Agent')]));

    await runExport({ file, agent: 'codex', overwrite: false, cwd: outDir });

    // Paths named only to prove the plan-selection branch took the non-Claude
    // planner; the per-provider path table itself is #995's subject.
    expect(await walk(outDir)).toEqual(['.codex/skills/sample-workflow/SKILL.md']);
  });

  it('mirrors sub-agent files for cursor, the only provider with an agents dir', async () => {
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), subAgentNode('n2', 'Second Agent')])
    );

    await runExport({ file, agent: 'cursor', overwrite: false, cwd: outDir });

    expect(await walk(outDir)).toEqual([
      '.cursor/agents/first-agent.md',
      '.cursor/agents/second-agent.md',
      '.cursor/skills/sample-workflow/SKILL.md',
    ]);
  });

  it('warns on stderr when a Claude Code-only node is exported for another agent', async () => {
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), branchSessionNode('n2')])
    );

    await runExport({ file, agent: 'codex', overwrite: false, cwd: outDir });

    expect(stderr()).toContain('warning: this workflow contains Claude Code-only node(s)');
    expect(stderr()).toContain('branchSession');
    // The warning is advisory: the export still happens.
    expect(await walk(outDir)).toEqual(['.codex/skills/sample-workflow/SKILL.md']);
  });

  it('does not warn about Claude Code-only nodes when targeting claude-code', async () => {
    const file = await writeWorkflowFile(
      makeWorkflow([subAgentNode('n1', 'First Agent'), branchSessionNode('n2')])
    );

    await runExport({ file, agent: 'claude-code', overwrite: false, cwd: outDir });

    expect(stderr()).not.toContain('Claude Code-only node(s)');
  });
});

// ---------------------------------------------------------------------------
// D. Argument and load error contract
// ---------------------------------------------------------------------------

describe('asSupportedAgent', () => {
  it('rejects an unknown agent with commander’s clean-error signal', () => {
    // InvalidArgumentError is what makes commander print a CLI error instead
    // of an uncaught stack trace, so the error *type* is the contract.
    expect(() => asSupportedAgent('windsurf')).toThrow(InvalidArgumentError);
  });

  it('names every supported agent in the rejection message', () => {
    let message = '';
    try {
      asSupportedAgent('windsurf');
    } catch (error) {
      message = (error as Error).message;
    }
    for (const agent of [
      'claude-code',
      'antigravity',
      'codex',
      'copilot',
      'cursor',
      'gemini',
      'roo-code',
    ]) {
      expect(message).toContain(agent);
    }
  });

  it('returns a supported agent unchanged', () => {
    expect(asSupportedAgent('roo-code')).toBe('roo-code');
  });
});

describe('runExport — load failures', () => {
  it('propagates WorkflowLoadError and writes nothing', async () => {
    const missing = path.join(inDir, 'absent.json');

    await expect(
      runExport({ file: missing, agent: 'claude-code', overwrite: false, cwd: outDir })
    ).rejects.toThrow(WorkflowLoadError);

    expect(await walk(outDir)).toEqual([]);
  });

  it('propagates a malformed-JSON failure and writes nothing', async () => {
    const broken = path.join(inDir, 'broken.json');
    await fs.writeFile(broken, '{ "name": ', 'utf-8');

    await expect(
      runExport({ file: broken, agent: 'claude-code', overwrite: false, cwd: outDir })
    ).rejects.toThrow(WorkflowLoadError);

    expect(await walk(outDir)).toEqual([]);
  });
});
