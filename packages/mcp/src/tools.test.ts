/**
 * Suite S5 (write half), sections B and C — the `apply_workflow` and
 * `update_nodes` tool handlers.
 *
 * These are the two tools an external AI agent uses to write the user's
 * workflow file. Every case below pairs the reply assertion with a
 * *file-on-disk* assertion, because the failure mode that hurts is not a
 * wrong reply — it is a write that happened when it should not have.
 *
 * Handlers are driven through a stub server that captures each registered
 * handler by name. Boundary to be aware of: a stub bypasses zod parsing, so
 * this suite covers handler logic, not the argument schemas — a default like
 * `includeContent ?? false` is not exercised here.
 *
 * Determinism: one `fs.mkdtemp` per test against a real `FileWorkflowAdapter`,
 * removed in `afterEach`. No network, no wall clock, no filesystem state
 * outside the temp directory.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeType, type Workflow } from '@cc-wf-studio/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileWorkflowAdapter } from './file-adapter.js';
import { registerWorkflowTools } from './tools.js';
import type { WorkflowIoAdapter } from './types.js';
import {
  connect,
  endNode,
  groupNode,
  makeWorkflow,
  promptNode,
  serialize,
  startNode,
  subAgentNode,
  validWorkflow,
} from './__fixtures__/workflows.js';

type ToolReply = { content: { type: 'text'; text: string }[]; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolReply>;

/**
 * Delegating adapter that lets a test land a concurrent write in the window
 * between `update_nodes`' internal read and its write-back.
 *
 * This is the only way to exercise the read→write race deterministically:
 * the two calls are back-to-back inside the handler, so nothing a test does
 * from the outside can get between them. Test-only — no product change.
 */
class RacingAdapter implements WorkflowIoAdapter {
  constructor(
    private readonly inner: FileWorkflowAdapter,
    private readonly afterRead: () => Promise<void>
  ) {}

  async getCurrentWorkflow() {
    const result = await this.inner.getCurrentWorkflow();
    await this.afterRead();
    return result;
  }

  applyWorkflow(...args: Parameters<WorkflowIoAdapter['applyWorkflow']>) {
    return this.inner.applyWorkflow(...args);
  }

  highlightGroupNode(...args: Parameters<WorkflowIoAdapter['highlightGroupNode']>) {
    return this.inner.highlightGroupNode(...args);
  }

  getWorkflowSchemaToon() {
    return this.inner.getWorkflowSchemaToon();
  }

  listAvailableAgents(...args: Parameters<WorkflowIoAdapter['listAvailableAgents']>) {
    return this.inner.listAvailableAgents(...args);
  }

  planAndPersistSubAgentFiles(
    ...args: Parameters<WorkflowIoAdapter['planAndPersistSubAgentFiles']>
  ) {
    return this.inner.planAndPersistSubAgentFiles(...args);
  }
}

let tmpDir: string;
let filePath: string;
let handlers: Map<string, ToolHandler>;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccwf-mcp-tools-'));
  filePath = path.join(tmpDir, 'workflow.json');

  handlers = buildHandlers(new FileWorkflowAdapter({ filePath, projectRoot: tmpDir }));
});

/** Register the tools against `adapter` and capture each handler by name. */
function buildHandlers(adapter: WorkflowIoAdapter): Map<string, ToolHandler> {
  const captured = new Map<string, ToolHandler>();
  const stubServer = {
    tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
      captured.set(name, handler);
    },
  };
  registerWorkflowTools(stubServer as unknown as McpServer, adapter);
  return captured;
}

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function call(tool: string, args: Record<string, unknown>) {
  const handler = handlers.get(tool);
  if (!handler) throw new Error(`tool not registered: ${tool}`);
  const reply = await handler(args);
  return {
    isError: reply.isError,
    payload: JSON.parse(reply.content[0].text) as Record<string, unknown>,
  };
}

async function seed(workflow: Workflow = validWorkflow()): Promise<string> {
  await fs.writeFile(filePath, serialize(workflow), 'utf-8');
  return serialize(workflow);
}

/** Read the raw bytes, or `null` when nothing was ever written. */
async function readOrNull(): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function nodeById(id: string) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const workflow = JSON.parse(raw) as Workflow;
  return workflow.nodes.find((n) => n.id === id) as
    | (Workflow['nodes'][number] & { data: Record<string, unknown> })
    | undefined;
}

describe('apply_workflow', () => {
  it('rejects malformed JSON without writing anything', async () => {
    const { isError, payload } = await call('apply_workflow', {
      workflow: '{ not json at all',
    });

    expect(isError).toBe(true);
    expect(payload.error).toBe('Invalid JSON: Failed to parse workflow string');
    expect(await readOrNull()).toBeNull();
  });

  it('rejects a workflow that fails validation and leaves the file unchanged', async () => {
    const before = await seed();
    // No Start node → MISSING_START_NODE. Validation is treated as a black
    // box here; this suite asserts "invalid input → refused, file untouched",
    // not which rules the validator implements.
    const invalid = makeWorkflow([promptNode('prompt-1'), endNode()], []);

    const { isError, payload } = await call('apply_workflow', {
      workflow: JSON.stringify(invalid),
    });

    expect(isError).toBe(true);
    expect(payload.error).toBe('Validation failed');
    expect(Array.isArray(payload.validationErrors)).toBe(true);
    expect((payload.validationErrors as unknown[]).length).toBeGreaterThan(0);
    expect(await readOrNull()).toBe(before);
  });

  it('writes a valid workflow, echoes the revision, and omits autoCreatedFiles', async () => {
    const workflow = validWorkflow();

    const { isError, payload } = await call('apply_workflow', {
      workflow: JSON.stringify(workflow),
    });

    expect(isError).toBeUndefined();
    expect(payload.success).toBe(true);
    expect(payload.revision).toMatch(/^sha256:[0-9a-f]{64}$/);
    // File mode defers sub-agent auto-creation, so there are no planned files
    // and the key must be absent rather than an empty array.
    expect('autoCreatedFiles' in payload).toBe(false);
    expect(await readOrNull()).toBe(serialize(workflow));
  });

  it('surfaces a stale revision as success:false but NOT as isError', async () => {
    const before = await seed();

    const { isError, payload } = await call('apply_workflow', {
      workflow: JSON.stringify(validWorkflow({ name: 'agent-version' })),
      revision: 'sha256:' + '0'.repeat(64),
    });

    // The handler wraps the adapter result in ok(), so the refusal rides on
    // `success` alone. A caller keying off `isError` would read this refused
    // write as a success — worth pinning explicitly.
    expect(isError).toBeUndefined();
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Revision conflict');
    expect(await readOrNull()).toBe(before);
  });
});

describe('update_nodes', () => {
  it('reports no active workflow when the file does not exist', async () => {
    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', name: 'Renamed' }],
    });

    expect(payload.success).toBe(false);
    expect(payload.error).toContain('No active workflow');
    expect(await readOrNull()).toBeNull();
  });

  it('writes nothing when any id in the batch is unknown', async () => {
    const before = await seed();

    const { payload } = await call('update_nodes', {
      nodes: [
        { id: 'prompt-1', name: 'Valid-Rename' },
        { id: 'ghost-node', name: 'Does-Not-Exist' },
      ],
    });

    expect(payload.success).toBe(false);
    expect(payload.error).toMatch(/^Nodes not found: /);
    expect(payload.error).toContain('ghost-node');
    // Atomicity is the point: the valid half of the batch must not land.
    expect(await readOrNull()).toBe(before);
  });

  it('shallow-merges data into the existing node data', async () => {
    await seed(
      makeWorkflow(
        [startNode(), promptNode('prompt-1', 'Original prompt', { model: 'opus' }), endNode()],
        [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')]
      )
    );

    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', data: { prompt: 'Replaced prompt' } }],
    });

    expect(payload.success).toBe(true);
    const node = await nodeById('prompt-1');
    expect(node?.data.prompt).toBe('Replaced prompt');
    // Untouched keys survive the merge.
    expect(node?.data.model).toBe('opus');
    expect(node?.data.outputPorts).toBe(1);
  });

  it('deletes a field when the update sets it to null', async () => {
    await seed(
      makeWorkflow(
        [
          startNode(),
          subAgentNode('agent-1', 'Reviewer', {
            commandFilePath: '.claude/agents/reviewer.md',
            commandScope: 'project',
          }),
          endNode(),
        ],
        [connect('start-1', 'agent-1'), connect('agent-1', 'end-1')]
      )
    );

    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'agent-1', data: { commandFilePath: null } }],
    });

    expect(payload.success).toBe(true);
    const node = await nodeById('agent-1');
    expect('commandFilePath' in (node?.data ?? {})).toBe(false);
    expect(node?.data.commandScope).toBe('project');
  });

  it('refuses a type change that arrives without data, without writing', async () => {
    const before = await seed();

    const { isError, payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', type: NodeType.SubAgent }],
    });

    expect(payload.success).toBe(false);
    expect(payload.error).toContain('prompt-1');
    // Deliberately a soft failure — the caller is expected to retry with data.
    expect(isError).toBe(false);
    expect(await readOrNull()).toBe(before);
  });

  it('replaces rather than merges data when the type changes', async () => {
    await seed(
      makeWorkflow(
        [startNode(), promptNode('prompt-1', 'Original', { model: 'opus' }), endNode()],
        [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')]
      )
    );

    const { payload } = await call('update_nodes', {
      nodes: [
        {
          id: 'prompt-1',
          type: NodeType.SubAgent,
          data: {
            description: 'Reviewer description',
            agentDefinition: 'Reviewer definition',
            prompt: 'Review the diff',
            outputPorts: 1,
          },
        },
      ],
    });

    expect(payload.success).toBe(true);
    const node = await nodeById('prompt-1');
    expect(node?.type).toBe(NodeType.SubAgent);
    expect(node?.data.description).toBe('Reviewer description');
    // `model` came from the old Prompt data and must NOT survive a replace.
    expect('model' in (node?.data ?? {})).toBe(false);
  });

  it('merges data when the supplied type equals the current type', async () => {
    await seed(
      makeWorkflow(
        [startNode(), promptNode('prompt-1', 'Original', { model: 'opus' }), endNode()],
        [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')]
      )
    );

    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', type: NodeType.Prompt, data: { prompt: 'Merged prompt' } }],
    });

    expect(payload.success).toBe(true);
    const node = await nodeById('prompt-1');
    expect(node?.data.prompt).toBe('Merged prompt');
    // typeChanged is false, so this is a merge and `model` stays.
    expect(node?.data.model).toBe('opus');
  });

  describe('parentId — the destructive pair', () => {
    function groupedWorkflow() {
      const child = promptNode('prompt-1');
      (child as { parentId?: string }).parentId = 'group-1';
      return makeWorkflow(
        [startNode(), groupNode('group-1'), child, endNode()],
        [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')]
      );
    }

    it('un-groups the node when parentId is explicitly null', async () => {
      await seed(groupedWorkflow());

      const { payload } = await call('update_nodes', {
        nodes: [{ id: 'prompt-1', parentId: null }],
      });

      expect(payload.success).toBe(true);
      expect((await nodeById('prompt-1')) as { parentId?: string }).not.toHaveProperty('parentId');
    });

    it('leaves parentId untouched when the key is absent from the update', async () => {
      await seed(groupedWorkflow());

      // A rename-only update. If a regression made an absent key take the
      // delete branch, every such call would silently rip the node out of its
      // group and rewrite the file — the user loses their grouping and is
      // never told.
      const { payload } = await call('update_nodes', {
        nodes: [{ id: 'prompt-1', name: 'Renamed-Step' }],
      });

      expect(payload.success).toBe(true);
      const node = await nodeById('prompt-1');
      expect(node?.name).toBe('Renamed-Step');
      expect((node as { parentId?: string })?.parentId).toBe('group-1');
    });
  });

  it('refuses a caller-supplied stale revision', async () => {
    const before = await seed();

    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', name: 'Agent-Rename' }],
      revision: 'sha256:' + '0'.repeat(64),
    });

    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Revision conflict');
    expect(await readOrNull()).toBe(before);
  });

  it('refuses to clobber a write that lands between the internal read and the write', async () => {
    await seed();

    // The user saves on the canvas in the window after `update_nodes` reads
    // the workflow and before it writes back. The handler passes its own
    // fetched revision as expectedRevision precisely so this is refused —
    // without that fallback the agent writes unconditionally and the user's
    // save is gone with no warning.
    const concurrent = validWorkflow({ name: 'saved-by-the-user' });
    let landed = false;
    const racing = new RacingAdapter(
      new FileWorkflowAdapter({ filePath, projectRoot: tmpDir }),
      async () => {
        if (landed) return;
        landed = true;
        await fs.writeFile(filePath, serialize(concurrent), 'utf-8');
      }
    );

    const handler = buildHandlers(racing).get('update_nodes') as ToolHandler;
    const reply = await handler({ nodes: [{ id: 'prompt-1', name: 'Agent-Rename' }] });
    const payload = JSON.parse(reply.content[0].text) as Record<string, unknown>;

    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Revision conflict');
    expect(await readOrNull()).toBe(serialize(concurrent));
  });

  it('uses the internally fetched revision when the caller omits one', async () => {
    await seed();

    const { payload } = await call('update_nodes', {
      nodes: [{ id: 'prompt-1', name: 'Agent-Rename' }],
    });

    // The fetch and the write are back-to-back with nothing in between, so the
    // fallback revision matches and the write succeeds.
    expect(payload.success).toBe(true);
    expect((await nodeById('prompt-1'))?.name).toBe('Agent-Rename');
  });
});
