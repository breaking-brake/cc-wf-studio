/**
 * Suite S7 — `extractVariables`, the `{{var}}` detector behind the Prompt node
 * (issue #1066).
 *
 * `extractVariables` is the only thing in the product that reads a prompt's
 * text and reports which placeholder variables it contains. It runs on every
 * render, at two sites:
 *
 * - `components/nodes/PromptNode.tsx:33` — drives the canvas node's variable
 *   chips.
 * - `components/property/panels/prompt-panel.tsx:16` — drives the property
 *   panel's "Detected variables" section, which returns `null` when the array
 *   is empty. An under-detection therefore makes the whole section *vanish*
 *   rather than show an error.
 *
 * That is what these tests protect: if this breaks, the user writes
 * `{{language}}` in a Prompt node and the product simply stops telling them
 * the variable is there. Nothing fails — the export still succeeds, and the
 * exported instruction document's **Available variables** block is generated
 * from a different source (`node.data.variables`), so the two silently
 * disagree about what the prompt actually uses. The user ships a workflow
 * whose documented variable list does not match its own prompt text, and it
 * surfaces wherever the agent later runs.
 *
 * Every expected value below was verified by executing the function, not read
 * off the regex.
 *
 * **Out of scope, deliberately.** `substituteVariables` (`:69`),
 * `getUndefinedVariables` (`:92`) and `isFullyDefined` (`:118`) are not tested
 * here. They have zero consumers repo-wide — the substitution half of the
 * feature is unwired — so testing them would be a transcription of the code
 * rather than a check of a behaviour a user can reach. Whether to wire them up
 * is a product question for the feature track; this was established in the
 * #1063 iteration (`docs/qa-log.md`, *Residual scope on #1063*) and
 * re-verified for #1066. Do not re-litigate it by adding cases here.
 */

import {
  generateExecutionInstructions,
  NodeType,
  type PromptNode,
  type Workflow,
} from '@cc-wf-studio/core';
import { describe, expect, it } from 'vitest';
import { extractVariables, VARIABLE_PATTERN } from '../../utils/template-utils';

// ---------------------------------------------------------------------------
// A. What is detected — the contract the chips and the panel depend on
// ---------------------------------------------------------------------------

describe('extractVariables — detection', () => {
  it('returns every distinct variable in a prompt', () => {
    expect(extractVariables('Generate a {{language}} function that {{description}}')).toEqual([
      'language',
      'description',
    ]);
  });

  it('deduplicates a variable used more than once', () => {
    // The panel renders one chip per variable, not one per occurrence.
    expect(extractVariables('Hello {{name}}! Welcome {{name}}!')).toEqual(['name']);
  });

  it('preserves first-occurrence order rather than sorting', () => {
    // Asserted with `toEqual` on the whole array, not `toContain`: the chips
    // are rendered in this order, and `Set` dedup preserving insertion order
    // is the load-bearing detail. A `toContain`-only case would pass on a
    // sort regression.
    expect(extractVariables('{{z}} {{a}} {{z}} {{m}}')).toEqual(['z', 'a', 'm']);
  });

  it('detects adjacent placeholders with no separator', () => {
    expect(extractVariables('{{a}}{{b}}')).toEqual(['a', 'b']);
  });

  it('detects placeholders across newlines', () => {
    expect(extractVariables('line1 {{a}}\nline2 {{b}}')).toEqual(['a', 'b']);
  });

  it('admits leading underscores and leading digits', () => {
    // `\w` is broader than the "英数字とアンダースコア" identifier the doc
    // comment describes — `1a` is not a plausible identifier but is detected.
    expect(extractVariables('{{_x}} {{a1}} {{1a}}')).toEqual(['_x', 'a1', '1a']);
  });

  it('returns an empty array for text with no placeholders', () => {
    expect(extractVariables('No variables here')).toEqual([]);
    expect(extractVariables('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// B. What is silently NOT detected
//
// Each case returns `[]`. These are the shapes a real user types and gets no
// feedback about at all — the panel section disappears instead of reporting
// that the placeholder was not understood.
// ---------------------------------------------------------------------------

describe('extractVariables — silently undetected shapes', () => {
  it.each([
    ['a hyphen in the name', 'Use {{my-var}} here'],
    ['a dot in the name', 'Use {{user.name}} here'],
    // The most likely thing a real user types.
    ['whitespace inside the braces', 'Use {{ name }} here'],
    // In a product whose UI ships five locales.
    ['a non-ASCII name', 'Use {{名前}} here'],
    ['single braces', 'Use {name} here'],
    ['an unclosed placeholder', '{{oops'],
  ])('detects nothing for %s', (_label, input) => {
    expect(extractVariables(input)).toEqual([]);
  });

  it('CURRENT BEHAVIOUR: triple braces do match, by backtracking one character', () => {
    // Observed, not obviously desired, and nothing else in the repo records
    // it. Pinned so a change to the pattern has to decide about it on purpose.
    expect(extractVariables('Use {{{name}}} here')).toEqual(['name']);
  });
});

// ---------------------------------------------------------------------------
// C. The cross-representation divergence
//
// The detector and the exporter disagree about what counts as a variable, in
// one direction, and neither side reports it. Driven on a single fixture so
// the asymmetry itself is the thing under test and neither half can pass
// alone.
// ---------------------------------------------------------------------------

describe('the detector and the exported variables block disagree', () => {
  it('CURRENT BEHAVIOUR: a non-\\w key is advertised as available but can never be detected', () => {
    const prompt = 'Use {{my-var}} here';
    const node: PromptNode = {
      id: 'p1',
      type: NodeType.Prompt,
      name: 'Prompt Step',
      position: { x: 0, y: 0 },
      data: { prompt, variables: { 'my-var': 'a hyphenated key' } },
    };
    const workflow: Workflow = {
      id: 'workflow-1',
      name: 'Sample Workflow',
      version: '1.0.0',
      nodes: [node],
      connections: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    // Detector side: `\w+` only, so the webview shows the user nothing.
    expect(extractVariables(prompt)).toEqual([]);

    // Exporter side: `workflow-prompt-generator.ts:939-945` iterates
    // `Object.entries(node.data.variables)` with no pattern check, and
    // `promptPropertySchema.variables` is `z.record(z.string(), z.string())`,
    // so any key validates. The consuming agent is told `{{my-var}}` is an
    // available placeholder.
    const instructions = generateExecutionInstructions(workflow, { provider: 'claude-code' });
    expect(instructions).toContain('**Available variables:**');
    expect(instructions).toContain('- `{{my-var}}`: a hyphenated key');

    // Which side is wrong — widen the pattern, or validate the keys on entry —
    // is a product decision, deliberately not filed as a bug (issue #1066).
    // This case goes red the moment either side is changed to agree with the
    // other, which is exactly when someone should look at it.
  });
});

// ---------------------------------------------------------------------------
// D. Global-regex statefulness — the regression this suite exists to catch
//
// `VARIABLE_PATTERN` is a module-level `const` carrying the `g` flag, shared by
// every caller. This is safe today only because `matchAll` clones the regex —
// which is not obvious from reading the call site. A plausible
// "simplification" to a `while ((m = re.exec(s)))` loop, or any use of
// `VARIABLE_PATTERN.test(...)`, leaks `lastIndex` across calls; and because
// both consumers call this once per node per render, the *second* Prompt node
// on the canvas would show the wrong chips while the first looks fine. Manual
// E2E does not exercise that.
// ---------------------------------------------------------------------------

describe('extractVariables — repeated calls are independent', () => {
  it('returns the same result when called twice on the same input', () => {
    const input = 'Generate a {{language}} function that {{description}}';
    expect(extractVariables(input)).toEqual(['language', 'description']);
    expect(extractVariables(input)).toEqual(['language', 'description']);
  });

  it('is not disturbed by an intervening call on different input', () => {
    const x = 'first {{alpha}}';
    const y = 'second {{beta}} {{gamma}}';
    expect(extractVariables(x)).toEqual(['alpha']);
    expect(extractVariables(y)).toEqual(['beta', 'gamma']);
    expect(extractVariables(x)).toEqual(['alpha']);
  });

  it('leaves VARIABLE_PATTERN.lastIndex at 0 after a call that matched', () => {
    extractVariables('{{a}} {{b}}');
    expect(VARIABLE_PATTERN.lastIndex).toBe(0);
  });
});
