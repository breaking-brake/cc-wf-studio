import { describe, expect, it } from 'vitest';
import { generateOverviewMarkdown } from '../../services/workflow-overview-formatter.js';
import { sanitizeNodeId } from '../../services/workflow-prompt-generator.js';
import {
  askUserQuestionNode,
  connect,
  endNode,
  groupNode,
  ifElseNode,
  inGroup,
  makeWorkflow,
  promptNode,
  startNode,
  subAgentNode,
  switchNode,
} from './__fixtures__/workflows.js';

/**
 * Suite S2, item 2 — the human-readable Markdown behind Overview Mode's right
 * pane and the canvas "Copy as Markdown" action.
 *
 * This is the document a person reads to understand a whole workflow without
 * clicking through every node, and the one they paste into a review or a
 * ticket. Two things make it load-bearing: the reading order has to reflect
 * the real execution order (an out-of-order document quietly misrepresents
 * what the workflow does), and node content has to survive intact (a prompt
 * that breaks the surrounding Markdown takes the rest of the document with
 * it).
 *
 * Distinct from `generateExecutionInstructions`, which targets an AI agent.
 */

describe('generateOverviewMarkdown', () => {
  it('leads with the workflow name and description', () => {
    const md = generateOverviewMarkdown(
      makeWorkflow([startNode('start-1')], [], {
        name: 'Release Flow',
        description: 'Ship a release',
      })
    );
    expect(md.startsWith('# Release Flow')).toBe(true);
    expect(md).toContain('> Ship a release');
  });

  it('heads each node section with the id the scroll-sync keys off', () => {
    // `InstructionsPanel` matches `## <sanitizedId>(<title>)` to sync the
    // document with the canvas selection. A changed heading shape silently
    // breaks click-to-scroll in both directions.
    const md = generateOverviewMarkdown(
      makeWorkflow([promptNode('prompt-1', 'Summarize', { label: 'Summarize' })])
    );
    expect(md).toContain('## prompt-1(Summarize)');
  });

  it('sanitizes ids in headings and links the same way the diagram does', () => {
    // The overview and the Mermaid diagram are read side by side; an id that
    // reads `end-1` in one and `end_1` in the other is not recognisably the
    // same node.
    const md = generateOverviewMarkdown(
      makeWorkflow([startNode('start-1'), endNode('end-1')], [connect('start-1', 'end-1')])
    );
    expect(md).toContain(`## ${sanitizeNodeId('end-1')}(End)`);
    expect(md).toContain('](#overview-section-end_1)');
  });

  describe('ordering', () => {
    it('places a merge point after every one of its predecessors', () => {
      // A naive breadth-first walk pulls the merge node forward along the
      // shorter path, so the reader sees a step before the work it depends
      // on. The document then describes an order the workflow never runs.
      //
      //   start → a → b ─┐
      //     └────────────→ merge
      //
      // `merge` is declared *before* `b` so that emitting nodes in
      // declaration order would fail this test — otherwise the fixture would
      // pass without any ordering logic at all.
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [
            startNode('start-1'),
            promptNode('a', 'A', {}, 'A'),
            promptNode('merge', 'M', {}, 'M'),
            promptNode('b', 'B', {}, 'B'),
          ],
          [
            connect('start-1', 'a'),
            connect('a', 'b'),
            connect('b', 'merge'),
            connect('start-1', 'merge'),
          ]
        )
      );
      expect(md.indexOf('## b(')).toBeLessThan(md.indexOf('## merge('));
      expect(md.indexOf('## a(')).toBeLessThan(md.indexOf('## b('));
    });

    it('starts from the Start node even when it is declared last', () => {
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [promptNode('orphan', 'Detached', {}, 'Detached'), startNode('start-1')],
          []
        )
      );
      expect(md.indexOf('## start-1(')).toBeLessThan(md.indexOf('## orphan('));
    });

    it('emits every node exactly once when the workflow contains a cycle', () => {
      // A retry loop is a legitimate workflow shape. The formatter has to
      // terminate and still show each node, rather than hanging or dropping
      // the members of the cycle.
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [
            startNode('start-1'),
            promptNode('a', 'A', {}, 'A'),
            promptNode('b', 'B', {}, 'B'),
            endNode('end-1'),
          ],
          [
            connect('start-1', 'a'),
            connect('a', 'b'),
            connect('b', 'a'), // back edge
            connect('b', 'end-1'),
          ]
        )
      );
      for (const id of ['start-1', 'a', 'b', 'end_1']) {
        expect(md.match(new RegExp(`^## ${id}\\(`, 'gm')), id).toHaveLength(1);
      }
    });

    it('still renders a node nothing connects to', () => {
      // Losing an unreachable node would hide exactly the mistake the reader
      // opened the overview to find.
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [startNode('start-1'), endNode('end-1'), promptNode('stray', 'Stray', {}, 'Stray')],
          [connect('start-1', 'end-1')]
        )
      );
      expect(md).toContain('## stray(Stray)');
    });
  });

  it('renders groups flat, without a section of their own', () => {
    // Groups are a canvas-layout device; a section for one would describe a
    // step that never executes.
    const md = generateOverviewMarkdown(
      makeWorkflow([groupNode('group-1', 'Setup'), inGroup(promptNode('p-1', 'x'), 'group-1')])
    );
    expect(md).not.toContain('## group-1(');
    expect(md).toContain('## p-1(');
  });

  describe('content preservation', () => {
    it('fences a prompt so that a prompt containing a code block survives', () => {
      // Prompt bodies routinely contain triple-backtick blocks. A three-tick
      // fence would close on the first one and dump the rest of the document
      // out of the code block.
      const prompt = 'Run this:\n```bash\nnpm test\n```\nThen report.';
      const md = generateOverviewMarkdown(makeWorkflow([promptNode('p-1', prompt)]));
      expect(md).toContain('````\nRun this:\n```bash\nnpm test\n```\nThen report.\n````');
    });

    it('escapes Markdown specials in inline text', () => {
      // Question text lands inside a bold span and, elsewhere, inside table
      // and link contexts. An unescaped `|` or `[` corrupts the enclosing
      // construct rather than showing as a character.
      const md = generateOverviewMarkdown(
        makeWorkflow([askUserQuestionNode('ask-1', { questionText: 'Use [a] or `b`?' })])
      );
      expect(md).toContain('**Question**: Use \\[a\\] or \\`b\\`?');
    });

    it('collapses a multi-line inline value onto one line', () => {
      const md = generateOverviewMarkdown(
        makeWorkflow([ifElseNode('if-1', { evaluationTarget: 'first\nsecond' })])
      );
      expect(md).toContain('**Evaluation target**: first second');
    });
  });

  describe('next-step links', () => {
    it('names the single successor of a linear step', () => {
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [promptNode('p-1', 'x', { label: 'One' }), promptNode('p-2', 'y', { label: 'Two' })],
          [connect('p-1', 'p-2')]
        )
      );
      expect(md).toContain('→ **Next**: [`p-2(Two)`](#overview-section-p-2)');
    });

    it('labels each outgoing branch of a decision node', () => {
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [
            switchNode('switch-1'),
            promptNode('small', 'x', { label: 'Small path' }),
            promptNode('large', 'y', { label: 'Large path' }),
          ],
          [connect('switch-1', 'small', 'branch-0'), connect('switch-1', 'large', 'branch-1')]
        )
      );
      expect(md).toContain('→ **Small**: [`small(Small path)`]');
      expect(md).toContain('→ **Large**: [`large(Large path)`]');
    });

    it('orders branches by port so the reader sees them as laid out', () => {
      const md = generateOverviewMarkdown(
        makeWorkflow(
          [ifElseNode('if-1'), endNode('yes'), endNode('no')],
          // Declared out of order on purpose.
          [connect('if-1', 'no', 'branch-1'), connect('if-1', 'yes', 'branch-0')]
        )
      );
      expect(md.indexOf('**True**')).toBeLessThan(md.indexOf('**False**'));
    });

    it('falls back to the raw id when an edge points at a missing node', () => {
      // A dangling edge is a corrupt workflow; the overview should show it
      // rather than crash while rendering.
      const md = generateOverviewMarkdown(
        makeWorkflow([promptNode('p-1', 'x')], [connect('p-1', 'ghost')])
      );
      expect(md).toContain('→ **Next**: `ghost`');
    });
  });

  it('shows the node content a reader needs to review the workflow', () => {
    const md = generateOverviewMarkdown(
      makeWorkflow([
        subAgentNode('agent-1', 'Reviewer', {
          description: 'Reviews the diff',
          prompt: 'Review carefully',
          model: 'opus',
          tools: 'Read, Grep',
        }),
      ])
    );
    expect(md).toContain('**Type**: SUB-AGENT');
    expect(md).toContain('> Reviews the diff');
    expect(md).toContain('Review carefully');
    expect(md).toContain('Model: `opus`');
    expect(md).toContain('Tools: `Read, Grep`');
  });

  it('produces identical output for the same workflow', () => {
    const workflow = makeWorkflow(
      [startNode('start-1'), ifElseNode('if-1'), endNode('end-1')],
      [connect('start-1', 'if-1'), connect('if-1', 'end-1', 'branch-0')]
    );
    expect(generateOverviewMarkdown(workflow)).toBe(generateOverviewMarkdown(workflow));
  });
});
