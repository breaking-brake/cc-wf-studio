import { describe, expect, it } from 'vitest';
import {
  deriveAskUserQuestionUpdate,
  deriveBranchUpdate,
  deriveIfElseUpdate,
  deriveSwitchUpdate,
} from '../index.js';

/**
 * Suite S1 (`docs/quality/03-assurance-map.md`) — the *behavior* half.
 *
 * The four `derive<X>Update(data, patch)` functions are the property panel's
 * cross-field normalizers. `.claude/rules/schema-driven-panels.md` deliberately
 * keeps cross-field effects out of `FieldMeta` ("No side-effect meta") and puts
 * them in hand-written pure functions co-located with the schema — so these are
 * imperative code implementing rules stated nowhere else, not a declarative
 * schema a test could only restate.
 *
 * Call site: `SchemaPropertyPanel.tsx:76` —
 * `updateNodeData(node.id, derive ? derive(data, patch) : patch)`, where
 * `patch` is always a **single field** (`{ [fieldName]: value }`, line 74) and
 * `data` is the node's full current data. Every case below therefore passes a
 * single-key patch, matching what the panel actually produces.
 *
 * If these break, the user edits one field of a branching node and a
 * *different* field is silently rewritten: a Switch node's default case stops
 * sorting last (so the exported instructions tell the agent to evaluate the
 * fallback ahead of the specific conditions it was meant to follow), or
 * toggling AI suggestions off wipes the options the user typed. The panel shows
 * the value that was written, so nothing reports it — the divergence surfaces
 * wherever the agent later runs.
 *
 * Two verified facts shape what is asserted here:
 *
 * - **`outputPorts` is bookkeeping for these node types.** Its only read sites
 *   (`validate-workflow.ts:515/687/821`) cover SubAgentFlow / Skill / MCP only;
 *   the canvas renders handles from `data.branches` / `data.options` directly
 *   (`SwitchNode.tsx:130`, `AskUserQuestionNode.tsx:173`). The sync is asserted
 *   because it is a stated contract and cheap — not because a handle disappears.
 * - **Switch handle ids are positional** — `SwitchNode.tsx:134` renders
 *   `id={`branch-${i}`}`. Branch *order* decides which edge routes to which
 *   case, which is what makes `deriveSwitchUpdate`'s reordering load-bearing.
 *
 * Assertions prefer `toEqual` on the whole returned object: the failure mode is
 * a dropped or extra key, and a case that checks one field in isolation still
 * passes once the function starts adding keys it shouldn't.
 *
 * Every function is driven through the `@cc-wf-studio/core` schema entry point
 * (`schema/index.ts` re-exports each `./nodes/*-schema.js`), i.e. the same
 * surface the webview imports.
 */

/** A Switch/Branch/IfElse condition as the objectArray editor stores it. */
const cond = (label: string, extra: Record<string, unknown> = {}) => ({
  id: `c-${label}`,
  label,
  condition: `x === '${label}'`,
  ...extra,
});

/** An AskUserQuestion option as the objectArray editor stores it. */
const opt = (label: string) => ({ id: `o-${label}`, label, description: `${label} desc` });

describe('deriveSwitchUpdate', () => {
  it('moves the default branch last, preserving the order of the regular cases', () => {
    const a = cond('a');
    const dflt = cond('default', { isDefault: true });
    const b = cond('b');

    expect(deriveSwitchUpdate({}, { branches: [a, dflt, b] })).toEqual({
      branches: [a, b, dflt],
      outputPorts: 3,
    });
  });

  it('moves every default to the end, keeping their relative order', () => {
    const a = cond('a');
    const d1 = cond('d1', { isDefault: true });
    const d2 = cond('d2', { isDefault: true });

    expect(deriveSwitchUpdate({}, { branches: [d1, a, d2] })).toEqual({
      branches: [a, d1, d2],
      outputPorts: 3,
    });
  });

  it('leaves the order unchanged when no branch is a default', () => {
    const branches = [cond('a'), cond('b'), cond('c')];

    expect(deriveSwitchUpdate({}, { branches })).toEqual({
      branches: [branches[0], branches[1], branches[2]],
      outputPorts: 3,
    });
  });

  it('syncs outputPorts to the ordered branch count', () => {
    const branches = [cond('a'), cond('b'), cond('default', { isDefault: true })];

    expect(deriveSwitchUpdate({}, { branches }).outputPorts).toBe(3);
  });

  it('passes an unrelated field through with no branches or outputPorts key', () => {
    const result = deriveSwitchUpdate({ branches: [cond('a')] }, { evaluationTarget: 'x' });

    expect(result).toEqual({ evaluationTarget: 'x' });
    expect('branches' in result).toBe(false);
    expect('outputPorts' in result).toBe(false);
  });

  it('returns a non-array branches patch as-is without throwing', () => {
    // The Array.isArray guard (switch-schema.ts:66). Without it, `.filter`
    // throws a TypeError inside the panel's change handler.
    expect(deriveSwitchUpdate({}, { branches: undefined })).toEqual({ branches: undefined });
    expect(deriveSwitchUpdate({}, { branches: 'not-an-array' })).toEqual({
      branches: 'not-an-array',
    });
  });

  it('does not sort the caller-owned array in place', () => {
    const a = cond('a');
    const dflt = cond('default', { isDefault: true });
    const b = cond('b');
    const input = [a, dflt, b];

    deriveSwitchUpdate({}, { branches: input });

    expect(input).toEqual([a, dflt, b]);
  });
});

describe('deriveAskUserQuestionUpdate', () => {
  it('clears options and forces one port when AI suggestions are enabled', () => {
    const data = { options: [opt('yes'), opt('no')] };

    expect(deriveAskUserQuestionUpdate(data, { useAiSuggestions: true })).toEqual({
      useAiSuggestions: true,
      outputPorts: 1,
      options: [],
    });
  });

  it('preserves the stored options when AI suggestions are disabled', () => {
    // The doc comment (ask-user-question-schema.ts:65) calls out that disabling
    // does NOT restore defaults. A regression that clears here instead is the
    // silent-data-loss case this suite exists for.
    const options = [opt('yes'), opt('no')];

    expect(deriveAskUserQuestionUpdate({ options }, { useAiSuggestions: false })).toEqual({
      useAiSuggestions: false,
      outputPorts: 1,
      options,
    });
  });

  it('yields an empty options array when data carries no options', () => {
    expect(deriveAskUserQuestionUpdate({}, { useAiSuggestions: false })).toEqual({
      useAiSuggestions: false,
      outputPorts: 1,
      options: [],
    });
  });

  it('forces one port when multiSelect is turned on', () => {
    const data = { options: [opt('a'), opt('b'), opt('c')] };

    expect(deriveAskUserQuestionUpdate(data, { multiSelect: true })).toEqual({
      multiSelect: true,
      outputPorts: 1,
    });
  });

  it('takes the option count from data, not the patch, when multiSelect is turned off', () => {
    // A regression reading `patch.options` here yields `undefined`.
    const data = { options: [opt('a'), opt('b'), opt('c')] };

    expect(deriveAskUserQuestionUpdate(data, { multiSelect: false })).toEqual({
      multiSelect: false,
      outputPorts: 3,
    });
  });

  it('reports zero ports when multiSelect is turned off and data has no options', () => {
    expect(deriveAskUserQuestionUpdate({}, { multiSelect: false })).toEqual({
      multiSelect: false,
      outputPorts: 0,
    });
  });

  it('syncs outputPorts to the option count on an options patch', () => {
    const options = [opt('a'), opt('b')];

    expect(deriveAskUserQuestionUpdate({ options: [] }, { options })).toEqual({
      options,
      outputPorts: 2,
    });
  });

  it('gives useAiSuggestions precedence over options in the same patch', () => {
    // Pinned as observed: `useAiSuggestions` is the first `if`, so a patch
    // carrying both takes that arm and the patch's own options are discarded.
    // Reordering the three arms fails this case by name.
    const patch = { useAiSuggestions: true, options: [opt('a'), opt('b')] };

    expect(deriveAskUserQuestionUpdate({ options: [opt('stored')] }, patch)).toEqual({
      useAiSuggestions: true,
      outputPorts: 1,
      options: [],
    });
  });

  it('passes an unrelated field through with no outputPorts key', () => {
    const result = deriveAskUserQuestionUpdate(
      { options: [opt('a'), opt('b')] },
      { questionText: 'Which one?' },
    );

    expect(result).toEqual({ questionText: 'Which one?' });
    expect('outputPorts' in result).toBe(false);
  });
});

describe('deriveBranchUpdate (legacy node)', () => {
  it('trims to the first two branches when switching to conditional', () => {
    // Pinned as observed: this discards the user's 3rd+ branches, which the
    // doc comment (branch-schema.ts:54) states is deliberate.
    const branches = [cond('a'), cond('b'), cond('c')];

    expect(deriveBranchUpdate({ branches }, { branchType: 'conditional' })).toEqual({
      branchType: 'conditional',
      branches: [branches[0], branches[1]],
      outputPorts: 2,
    });
  });

  it('leaves an exactly-two-branch node untouched when switching to conditional', () => {
    const branches = [cond('a'), cond('b')];
    const result = deriveBranchUpdate({ branches }, { branchType: 'conditional' });

    expect(result).toEqual({ branchType: 'conditional' });
    expect('branches' in result).toBe(false);
    expect('outputPorts' in result).toBe(false);
  });

  it('does not trim when switching to switch', () => {
    const branches = [cond('a'), cond('b'), cond('c')];
    const result = deriveBranchUpdate({ branches }, { branchType: 'switch' });

    expect(result).toEqual({ branchType: 'switch' });
    expect('branches' in result).toBe(false);
  });

  it('syncs outputPorts to the branch count on a branches patch', () => {
    const branches = [cond('a'), cond('b'), cond('c')];

    expect(deriveBranchUpdate({}, { branches })).toEqual({ branches, outputPorts: 3 });
  });

  it('returns a branchType patch unchanged when data carries no branches', () => {
    expect(deriveBranchUpdate({}, { branchType: 'conditional' })).toEqual({
      branchType: 'conditional',
    });
  });

  it('passes an unrelated field through unchanged', () => {
    expect(deriveBranchUpdate({ branches: [cond('a')] }, { label: 'Route' })).toEqual({
      label: 'Route',
    });
  });
});

describe('deriveIfElseUpdate', () => {
  it('sets outputPorts to 2 on a branches patch regardless of the array length', () => {
    // Enforcing `.length(2)` is the zod schema's job, not this function's.
    const two = [cond('then'), cond('else')];
    const three = [cond('then'), cond('else'), cond('extra')];

    expect(deriveIfElseUpdate({}, { branches: two })).toEqual({
      branches: two,
      outputPorts: 2,
    });
    expect(deriveIfElseUpdate({}, { branches: three })).toEqual({
      branches: three,
      outputPorts: 2,
    });
  });

  it('passes a patch without branches through with no outputPorts key', () => {
    const result = deriveIfElseUpdate({ branches: [cond('then'), cond('else')] }, {
      evaluationTarget: 'status',
    });

    expect(result).toEqual({ evaluationTarget: 'status' });
    expect('outputPorts' in result).toBe(false);
  });
});
