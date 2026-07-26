/**
 * Suite S6 (fourth slice) — group membership on node drag-stop (issue #1033).
 *
 * `onNodeDragStop` is the **only** writer of `parentId` from canvas
 * interaction, and `parentId` is what every downstream artifact reads to
 * decide which group a node belongs to:
 *
 * - `serializeWorkflow` writes it into the saved file
 *   (`services/workflow-service.ts:50`);
 * - `generateExecutionInstructions` builds its `childParentMap` from it
 *   (`workflow-prompt-generator.ts:130`) to emit both the Mermaid `subgraph`
 *   blocks (`:256`) and the Group Node Execution Tracking table (`:705`).
 *
 * So the failure this suite guards against is a *silent divergence*: the user
 * drags a node into a group, the canvas draws it inside, and the saved
 * workflow plus every generated artifact describe a different structure than
 * the one on screen. Nothing on the user's machine reports it — the damage
 * surfaces wherever the agent is later run.
 *
 * Three notes on how these tests are written:
 *
 * 1. **Fixtures are installed with `setState` rather than through
 *    `setCanvas`.** That is deliberate and is the one place this file departs
 *    from the "drive everything through public actions" convention of its
 *    sibling suites. `setCanvas` applies `sortNodesParentFirst` to whatever it
 *    is handed (`workflow-store.ts:966`), and array order is itself under test
 *    here (sections A3, D12, E) — letting a second call site rewrite the
 *    fixture would make those assertions test the wrong function. The three
 *    other `sortNodesParentFirst` call sites are a separate slice per #1033.
 * 2. **The action is given the node as React Flow reports it**, i.e. with a
 *    `position` relative to its current parent, which is what
 *    `WorkflowEditor.tsx:287` passes straight through. The absolute/relative
 *    conversions in sections B and C exist precisely because of that.
 * 3. Group fixtures mirror what `NodePalette.tsx:132` actually creates —
 *    `style: { width: 400, height: 300 }` — so the hit box under test is the
 *    one a real group has.
 */

import type { Node } from 'reactflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkflowStore } from './workflow-store';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const store = () => useWorkflowStore.getState();
const nodes = () => store().nodes;
const ids = () => nodes().map((n) => n.id);
const byId = (id: string) => nodes().find((n) => n.id === id);

/**
 * A group as `NodePalette` creates it: size carried on `style`.
 *
 * `g('g-1', 100, 100)` therefore covers x ∈ [100, 500] and y ∈ [100, 400] —
 * the box every coordinate in this file is chosen against.
 */
function g(id: string, x: number, y: number, size: Partial<Node> = {}): Node {
  return {
    id,
    type: 'group',
    position: { x, y },
    data: { label: id },
    style: { width: 400, height: 300 },
    zIndex: -1001,
    ...size,
  };
}

/** A plain (non-group) canvas node. `parentId` omitted means "not grouped". */
function n(id: string, x: number, y: number, parentId?: string): Node {
  return {
    id,
    type: 'sub-agent',
    position: { x, y },
    data: { label: id },
    ...(parentId && { parentId }),
  };
}

function setNodes(list: Node[]) {
  useWorkflowStore.setState({ nodes: list, edges: [] });
}

/**
 * Drag `id` to `position` and hand the store the node exactly as React Flow
 * would: the node's own record, with the post-drag position substituted.
 * Returns the `nodes` array reference from *before* the action, so a test can
 * assert that nothing was written at all.
 */
function drag(id: string, position: { x: number; y: number }): Node[] {
  const before = nodes();
  const target = before.find((node) => node.id === id);
  if (!target) throw new Error(`fixture error: no node ${id}`);
  store().onNodeDragStop({ ...target, position });
  return before;
}

beforeEach(() => {
  setNodes([]);
});

// ---------------------------------------------------------------------------
// A. Early returns — nothing is written
// ---------------------------------------------------------------------------

/**
 * Every `set()` this action skips is also an undo entry that
 * `handleNodeDragStop` (`WorkflowEditor.tsx:284`) would otherwise record, so
 * "writes nothing" is asserted by array identity, not just by value equality.
 */
describe('onNodeDragStop — early returns', () => {
  it('A1: a dragged group node is never nested into another group', () => {
    setNodes([g('g-1', 100, 100), g('g-2', 900, 900)]);

    const before = drag('g-2', { x: 150, y: 150 });

    expect(nodes()).toBe(before);
    expect(byId('g-2')?.parentId).toBeUndefined();
  });

  it('A2: writes nothing when the canvas has no group nodes', () => {
    setNodes([n('n-1', 0, 0)]);

    const before = drag('n-1', { x: 150, y: 150 });

    expect(nodes()).toBe(before);
    expect(byId('n-1')?.parentId).toBeUndefined();
  });

  it('A3: dragging within the group it is already in writes nothing and leaves array order alone', () => {
    // Child first, group second: if a `set()` ran, `sortNodesParentFirst`
    // would hoist `g-1` to the front, so order is the tell.
    setNodes([n('n-1', 10, 10, 'g-1'), g('g-1', 100, 100)]);

    const before = drag('n-1', { x: 50, y: 50 }); // absolute (150, 150) — still inside g-1

    expect(nodes()).toBe(before);
    expect(ids()).toEqual(['n-1', 'g-1']);
    expect(byId('n-1')?.parentId).toBe('g-1');
    expect(byId('n-1')?.position).toEqual({ x: 10, y: 10 });
  });

  it('A4: dragging outside every group while already parentless writes nothing', () => {
    setNodes([g('g-1', 100, 100), n('n-1', 0, 0)]);

    const before = drag('n-1', { x: 800, y: 800 });

    expect(nodes()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// B. Moving in — parentId plus the absolute→relative conversion
// ---------------------------------------------------------------------------

describe('onNodeDragStop — moving into a group', () => {
  it('B5: sets parentId and rewrites the position relative to the group', () => {
    setNodes([g('g-1', 100, 100), n('n-1', 0, 0)]);

    drag('n-1', { x: 150, y: 150 });

    // Both halves matter: asserting only `parentId` still passes while the
    // node renders 100px off its drop point.
    expect(byId('n-1')?.parentId).toBe('g-1');
    expect(byId('n-1')?.position).toEqual({ x: 50, y: 50 });
  });

  it('B6: group → group converts twice, relative to the old parent then the new one', () => {
    // g-2 covers x ∈ [600, 1000], y ∈ [100, 400].
    setNodes([g('g-1', 100, 100), g('g-2', 600, 100), n('n-1', 10, 10, 'g-1')]);

    // React Flow reports (550, 50) relative to g-1, which is still the parent
    // when the action runs → absolute (650, 150) → inside g-2.
    drag('n-1', { x: 550, y: 50 });

    expect(byId('n-1')?.parentId).toBe('g-2');
    expect(byId('n-1')?.position).toEqual({ x: 50, y: 50 });
  });

  it('B7: no other node is touched', () => {
    const sibling = n('n-2', 20, 20, 'g-1');
    setNodes([g('g-1', 100, 100), n('n-1', 0, 0), sibling]);
    const groupBefore = byId('g-1');

    drag('n-1', { x: 150, y: 150 });

    // Reference equality, so a sibling whose `position` or `parentId` was
    // rewritten — even to an equal value — fails here.
    expect(byId('n-2')).toBe(sibling);
    expect(byId('g-1')).toBe(groupBefore);
    expect(nodes()).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// C. Moving out — parentId cleared plus the relative→absolute conversion
// ---------------------------------------------------------------------------

describe('onNodeDragStop — moving out of a group', () => {
  it('C8: clears parentId and rewrites the position as absolute', () => {
    setNodes([g('g-1', 100, 100), n('n-1', 10, 10, 'g-1')]);

    // (450, 50) relative to g-1 → absolute (550, 150), past g-1's right edge.
    drag('n-1', { x: 450, y: 50 });

    expect(byId('n-1')?.parentId).toBeUndefined();
    expect(byId('n-1')?.position).toEqual({ x: 550, y: 150 });
  });

  it('C9: writes parentId as undefined rather than deleting the key', () => {
    setNodes([g('g-1', 100, 100), n('n-1', 10, 10, 'g-1')]);

    drag('n-1', { x: 450, y: 50 });

    const moved = byId('n-1') as Node;
    // Indistinguishable today — `serializeWorkflow` spreads
    // `...(node.parentId && { parentId })` either way — but pinning what is
    // actually written keeps the two modules in step.
    expect(Object.keys(moved)).toContain('parentId');
    expect(moved.parentId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// D. The hit test
// ---------------------------------------------------------------------------

/**
 * The test is on the dragged node's **top-left corner only** and is inclusive
 * on all four edges (`workflow-store.ts:620-627`). `>=` vs `>` is a
 * one-character regression, so each edge gets its own named case.
 */
describe('onNodeDragStop — group hit test boundaries', () => {
  // g-1 covers x ∈ [100, 500], y ∈ [100, 400].
  beforeEach(() => {
    setNodes([g('g-1', 100, 100), n('n-1', 0, 0)]);
  });

  const inside: Array<[string, number, number]> = [
    ['exactly on the left edge', 100, 200],
    ['exactly on the top edge', 200, 100],
    ['exactly on the right edge', 500, 200],
    ['exactly on the bottom edge', 200, 400],
    ['exactly on the top-left corner', 100, 100],
    ['exactly on the bottom-right corner', 500, 400],
  ];

  const outside: Array<[string, number, number]> = [
    ['one pixel left of the left edge', 99, 200],
    ['one pixel above the top edge', 200, 99],
    ['one pixel right of the right edge', 501, 200],
    ['one pixel below the bottom edge', 200, 401],
  ];

  it.each(inside)('D10: %s is inside the group', (_label, x, y) => {
    drag('n-1', { x, y });
    expect(byId('n-1')?.parentId).toBe('g-1');
  });

  it.each(outside)('D10: %s is outside the group', (_label, x, y) => {
    drag('n-1', { x, y });
    expect(byId('n-1')?.parentId).toBeUndefined();
  });
});

describe('onNodeDragStop — group size fallback chain', () => {
  /**
   * `group.style?.width ?? group.width ?? 400` (`workflow-store.ts:616-617`).
   * All three shapes are reachable: a group loaded from disk carries only
   * `style` (`workflow-service.ts:151`), a resized one may carry React Flow's
   * own `width`. Picking the wrong source makes the hit box disagree with
   * what is drawn.
   */
  const shapes: Array<[string, Partial<Node>]> = [
    ['style.width / style.height', { style: { width: 400, height: 300 } }],
    ['the React Flow width / height fields', { style: undefined, width: 400, height: 300 }],
    ['neither — the 400x300 default', { style: undefined }],
  ];

  it.each(shapes)('D11: sizes the hit box from %s', (_label, shape) => {
    setNodes([g('g-1', 100, 100, shape), n('n-1', 0, 0)]);

    drag('n-1', { x: 500, y: 400 }); // the far corner of a 400x300 box at (100,100)
    expect(byId('n-1')?.parentId).toBe('g-1');

    drag('n-1', { x: 501, y: 400 }); // one pixel past it
    expect(byId('n-1')?.parentId).toBeUndefined();
  });
});

describe('onNodeDragStop — overlapping groups', () => {
  /**
   * Pinned as observed: the loop `break`s on the first match
   * (`workflow-store.ts:625`), and "first" is **array order, not z-index** —
   * not what a user would predict, and a refactor dropping the `break`
   * silently changes which group claims the node.
   */
  it('D12: the first group in nodes order wins', () => {
    setNodes([g('g-1', 100, 100), g('g-2', 150, 150), n('n-1', 0, 0)]);

    drag('n-1', { x: 200, y: 200 }); // inside both

    expect(byId('n-1')?.parentId).toBe('g-1');
  });

  it('D12: reversing nodes order reverses which group claims the node', () => {
    setNodes([g('g-2', 150, 150), g('g-1', 100, 100), n('n-1', 0, 0)]);

    drag('n-1', { x: 200, y: 200 }); // the same point, inside both

    expect(byId('n-1')?.parentId).toBe('g-2');
  });
});

// ---------------------------------------------------------------------------
// E. sortNodesParentFirst, as applied by this action
// ---------------------------------------------------------------------------

describe('onNodeDragStop — parent-first ordering', () => {
  it('E13: after a move-in the group precedes its new child', () => {
    // Child first: React Flow requires the parent to come first, and the S3
    // suite documents what breaks when the invariant is violated on load.
    setNodes([n('n-1', 0, 0), g('g-1', 100, 100)]);

    drag('n-1', { x: 150, y: 150 });

    expect(ids()).toEqual(['g-1', 'n-1']);
  });

  it('E14: a group that loses its last child is reordered even though it was not dragged', () => {
    // `sortNodesParentFirst` partitions on "is some node's parent", not "is a
    // group" (`workflow-store.ts:190`), so g-1 leaves the parents partition
    // the moment n-1 moves out — and g-2, still a parent, is hoisted past it.
    setNodes([
      g('g-1', 100, 100),
      g('g-2', 1000, 1000),
      n('n-1', 10, 10, 'g-1'),
      n('n-2', 10, 10, 'g-2'),
    ]);

    drag('n-1', { x: 450, y: 50 }); // absolute (550, 150) — outside both groups

    expect(byId('n-1')?.parentId).toBeUndefined();
    // Reordering an untouched node is exactly what a rewrite would change
    // without noticing, so it is pinned as observed.
    expect(ids()).toEqual(['g-2', 'g-1', 'n-1', 'n-2']);
  });
});
