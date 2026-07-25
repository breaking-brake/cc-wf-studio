import { describe, expect, it } from 'vitest';
import {
  type ExportProvider,
  escapeLabel,
  generateExecutionInstructions,
  generateMermaidFlowchart,
  sanitizeNodeId,
} from './workflow-prompt-generator.js';
import {
  askUserQuestionNode,
  branchSessionNode,
  codexNode,
  connect,
  endNode,
  groupNode,
  ifElseNode,
  inGroup,
  makeWorkflow,
  mcpNode,
  promptNode,
  skillNode,
  startNode,
  subAgentNode,
  switchNode,
} from './__fixtures__/workflows.js';

/**
 * Suite S2, items 1 and 2 — the Mermaid flowchart and the Markdown execution
 * instructions produced by `workflow-prompt-generator.ts`.
 *
 * These two artifacts are the entire product of an export: the agent reads the
 * diagram to know the shape of the workflow and the instructions to know what
 * to actually run. They reach users through `ccwf render`, the MCP
 * `render_workflow` tool, the canvas "Copy as Markdown" action, and every one
 * of the seven export targets — so a regression here is both wide and silent.
 * It is invisible on the user's own machine: the damage surfaces wherever the
 * agent later runs.
 *
 * The suite asserts load-bearing rules rather than snapshotting whole
 * documents. A pure snapshot fails uninformatively on every intentional
 * wording change, which trains people to re-record it without reading.
 */

// ---------------------------------------------------------------------------
// Node ID sanitization
// ---------------------------------------------------------------------------

describe('sanitizeNodeId', () => {
  it('rewrites ids that collide with Mermaid reserved words', () => {
    // `end-1` unrewritten is parsed by Mermaid as the `end` keyword followed
    // by `-1`, which terminates the enclosing block and corrupts the rest of
    // the diagram.
    expect(sanitizeNodeId('end-1')).toBe('end_1');
    expect(sanitizeNodeId('subgraph_2')).toBe('subgraph_2');
    expect(sanitizeNodeId('classDef-a')).toBe('classDef_a');
  });

  it('leaves hyphens alone in ids that do not start with a reserved word', () => {
    // Node ids are hyphenated by default (`prompt-1`); rewriting them all
    // would churn every generated diagram for no benefit.
    expect(sanitizeNodeId('prompt-1')).toBe('prompt-1');
    expect(sanitizeNodeId('sub_agent-42')).toBe('sub_agent-42');
  });

  it('replaces characters Mermaid treats as syntax', () => {
    expect(sanitizeNodeId('node.a:b/c')).toBe('node_a_b_c');
  });

  it('is a function of the id alone, so definitions and edges always agree', () => {
    // The real failure mode is divergence: if a node line and the edge that
    // references it sanitize differently, Mermaid renders an orphan node and
    // the agent loses that step. Pinned end to end below in
    // "wires edges to the same sanitized id used by the node definition".
    expect(sanitizeNodeId('end-1')).toBe(sanitizeNodeId('end-1'));
  });
});

describe('escapeLabel', () => {
  it('escapes every character that would terminate a Mermaid label early', () => {
    // Brackets, braces and parens close the node shape; `|` opens an edge
    // label; `"` closes a quoted string. Any of them raw truncates the
    // diagram at that point. They are replaced by Mermaid entity codes, which
    // are introduced by `#` — so `#` itself is escaped first, and a bare `#`
    // must not survive except as the head of an entity.
    const escaped = escapeLabel('a[b]c(d)e{f}g"h|i<j>k#l');
    for (const raw of ['[', ']', '(', ')', '{', '}', '"', '|', '<', '>']) {
      expect(escaped, raw).not.toContain(raw);
    }
    expect(escaped).toBe('a#91;b#93;c#40;d#41;e#123;f#125;g#quot;h#124;i#60;j#62;k#35;l');
    // Every `#` left in the output opens an entity; none is a literal hash.
    expect(escaped.replace(/#(35|91|93|40|41|123|125|60|62|124|quot);/g, '')).not.toContain('#');
  });

  it('leaves ordinary prose untouched', () => {
    expect(escapeLabel('Summarize the report')).toBe('Summarize the report');
  });
});

// ---------------------------------------------------------------------------
// Mermaid flowchart
// ---------------------------------------------------------------------------

describe('generateMermaidFlowchart', () => {
  it('emits a fenced mermaid block with the requested direction', () => {
    const chart = generateMermaidFlowchart({
      nodes: [startNode('start-1')],
      connections: [],
    });
    expect(chart.startsWith('```mermaid\nflowchart TD')).toBe(true);
    expect(chart.endsWith('```')).toBe(true);

    const lr = generateMermaidFlowchart({
      nodes: [startNode('start-1')],
      connections: [],
      direction: 'LR',
    });
    expect(lr).toContain('flowchart LR');
  });

  it('wires edges to the same sanitized id used by the node definition', () => {
    // The end-to-end version of the sanitizer invariant above. `end-1` is
    // rewritten to `end_1`; if only one of the two sites applied the rule the
    // diagram would reference a node that does not exist.
    const chart = generateMermaidFlowchart({
      nodes: [startNode('start-1'), endNode('end-1')],
      connections: [connect('start-1', 'end-1')],
    });
    expect(chart).toContain('end_1([End])');
    expect(chart).toContain('start-1 --> end_1');
    expect(chart).not.toContain('--> end-1');
  });

  /**
   * The shape vocabulary is a contract between the two artifacts this module
   * generates: `generateExecutionInstructions` tells the agent "Rectangle
   * nodes (Sub-Agent: ...)", "Diamond nodes (AskUserQuestion:...)" and so on.
   * If a node's shape changes without the prose changing, the instructions
   * become a lie and the agent executes the wrong step. Asserting the pairing
   * relates two independently edited places rather than restating one.
   */
  describe('node shapes match the vocabulary the execution instructions use', () => {
    const cases: { label: string; node: ReturnType<typeof promptNode> | ReturnType<typeof startNode>; open: string; close: string }[] = [
      { label: 'start is a stadium', node: startNode('start-1'), open: '([', close: '])' },
      { label: 'end is a stadium', node: endNode('finish-1'), open: '([', close: '])' },
      {
        label: 'sub-agent is a rectangle',
        node: subAgentNode('agent-1', 'Reviewer'),
        open: '[',
        close: ']',
      },
      {
        label: 'prompt is a rectangle',
        node: promptNode('prompt-1', 'Summarize'),
        open: '[',
        close: ']',
      },
      {
        label: 'branch-session is a rectangle',
        node: branchSessionNode('bs-1'),
        open: '[',
        close: ']',
      },
      {
        label: 'ask-user-question is a diamond',
        node: askUserQuestionNode('ask-1'),
        open: '{',
        close: '}',
      },
      { label: 'if/else is a diamond', node: ifElseNode('if-1'), open: '{', close: '}' },
      { label: 'switch is a diamond', node: switchNode('switch-1'), open: '{', close: '}' },
      { label: 'skill is a subroutine', node: skillNode('skill-1'), open: '[[', close: ']]' },
      { label: 'mcp is a subroutine', node: mcpNode('mcp-1'), open: '[[', close: ']]' },
      { label: 'codex is a subroutine', node: codexNode('codex-1'), open: '[[', close: ']]' },
    ];

    for (const { label, node, open, close } of cases) {
      it(label, () => {
        const chart = generateMermaidFlowchart({ nodes: [node], connections: [] });
        const line = chart.split('\n').find((l) => l.trim().startsWith(sanitizeNodeId(node.id)));
        expect(line).toBeDefined();
        const body = (line as string).trim().slice(sanitizeNodeId(node.id).length);
        expect(body.startsWith(open)).toBe(true);
        expect(body.endsWith(close)).toBe(true);
      });
    }
  });

  it('escapes user text before it reaches a label', () => {
    // A prompt is free text. Unescaped brackets there close the node shape
    // and everything after them leaks into the diagram as syntax.
    const chart = generateMermaidFlowchart({
      nodes: [promptNode('prompt-1', 'Check [config] (v2)')],
      connections: [],
    });
    const line = chart.split('\n').find((l) => l.includes('prompt-1')) as string;
    expect(line).toContain('#91;config#93;');
    expect(line).toContain('#40;v2#41;');
  });

  it('truncates a long prompt label so the diagram stays readable', () => {
    const long = 'A'.repeat(60);
    const chart = generateMermaidFlowchart({
      nodes: [promptNode('prompt-1', long)],
      connections: [],
    });
    expect(chart).toContain(`prompt-1[${'A'.repeat(27)}...]`);
  });

  it('uses only the first line of a multi-line prompt', () => {
    const chart = generateMermaidFlowchart({
      nodes: [promptNode('prompt-1', 'First line\nSecond line')],
      connections: [],
    });
    // A raw newline inside a label breaks the flowchart definition outright.
    expect(chart).toContain('prompt-1[First line]');
    expect(chart).not.toContain('Second line');
  });

  describe('branch edge labels', () => {
    it('labels if/else, switch and legacy branch edges with the branch label', () => {
      const chart = generateMermaidFlowchart({
        nodes: [ifElseNode('if-1'), endNode('yes'), endNode('no')],
        connections: [connect('if-1', 'yes', 'branch-0'), connect('if-1', 'no', 'branch-1')],
      });
      expect(chart).toContain('-->|True| yes');
      expect(chart).toContain('-->|False| no');
    });

    it('labels single-select question edges with the option label', () => {
      const chart = generateMermaidFlowchart({
        nodes: [askUserQuestionNode('ask-1'), endNode('a'), endNode('b')],
        connections: [connect('ask-1', 'a', 'branch-0'), connect('ask-1', 'b', 'branch-1')],
      });
      expect(chart).toContain('-->|Staging| a');
      expect(chart).toContain('-->|Production| b');
    });

    it('leaves question edges unlabelled when the options are not fixed', () => {
      // With AI suggestions or multi-select the options do not exist until
      // runtime, so a label read off the stored array would be fiction.
      for (const data of [{ useAiSuggestions: true }, { multiSelect: true }]) {
        const chart = generateMermaidFlowchart({
          nodes: [askUserQuestionNode('ask-1', data), endNode('a')],
          connections: [connect('ask-1', 'a', 'branch-0')],
        });
        expect(chart).toContain('ask-1 --> a');
        expect(chart).not.toContain('-->|');
      }
    });

    it('falls back to a plain arrow when the port has no matching branch', () => {
      // A workflow edited down to fewer branches can leave an edge pointing at
      // a port that no longer exists. The edge must still render, not vanish
      // or throw.
      const chart = generateMermaidFlowchart({
        nodes: [ifElseNode('if-1'), endNode('a')],
        connections: [connect('if-1', 'a', 'branch-7')],
      });
      expect(chart).toContain('if-1 --> a');
    });
  });

  describe('groups', () => {
    it('renders group members inside a subgraph and never twice', () => {
      // A node defined both inside the subgraph and at top level is a
      // duplicate definition; Mermaid renders it in the wrong place.
      const chart = generateMermaidFlowchart({
        nodes: [
          groupNode('group-1', 'Setup'),
          inGroup(promptNode('prompt-1', 'Inside'), 'group-1'),
          promptNode('prompt-2', 'Outside'),
        ],
        connections: [],
      });
      expect(chart).toContain('subgraph group-1["Setup"]');
      expect(chart.match(/prompt-1\[/g)).toHaveLength(1);
      expect(chart.match(/prompt-2\[/g)).toHaveLength(1);

      const lines = chart.split('\n');
      const subgraphAt = lines.findIndex((l) => l.includes('subgraph group-1'));
      const insideAt = lines.findIndex((l) => l.includes('prompt-1['));
      const endAt = lines.findIndex((l, i) => i > subgraphAt && l.trim() === 'end');
      expect(insideAt).toBeGreaterThan(subgraphAt);
      expect(insideAt).toBeLessThan(endAt);
    });

    it('does not emit a node line for the group itself', () => {
      const chart = generateMermaidFlowchart({
        nodes: [groupNode('group-1', 'Setup')],
        connections: [],
      });
      expect(chart).toContain('subgraph group-1["Setup"]');
      expect(chart).not.toContain('group-1[Setup]');
    });
  });

  describe('label modes', () => {
    it('shows the node title rather than the prompt body in concise mode', () => {
      const chart = generateMermaidFlowchart({
        nodes: [promptNode('prompt-1', 'A very long prompt body that would be truncated', {
          label: 'Summarize',
        })],
        connections: [],
        labelMode: 'concise',
      });
      expect(chart).toContain('prompt-1[PROMPT: Summarize]');
    });

    it('prefers data.label over the node name for the title', () => {
      const chart = generateMermaidFlowchart({
        nodes: [askUserQuestionNode('ask-1', { label: 'Pick env' } as never)],
        connections: [],
        labelMode: 'concise',
      });
      expect(chart).toContain('Pick env');
    });
  });

  it('produces byte-identical output for the same input', () => {
    // Determinism is what makes a generated artifact reviewable in a diff:
    // re-exporting an unchanged workflow must not churn the file.
    const source = {
      nodes: [
        startNode('start-1'),
        subAgentNode('agent-1', 'Reviewer'),
        ifElseNode('if-1'),
        endNode('end-1'),
      ],
      connections: [
        connect('start-1', 'agent-1'),
        connect('agent-1', 'if-1'),
        connect('if-1', 'end-1', 'branch-0'),
      ],
    };
    expect(generateMermaidFlowchart(source)).toBe(generateMermaidFlowchart(source));
  });

  it('emits nodes in declaration order', () => {
    const chart = generateMermaidFlowchart({
      nodes: [promptNode('p-a', 'A'), promptNode('p-b', 'B'), promptNode('p-c', 'C')],
      connections: [],
    });
    expect(chart.indexOf('p-a[')).toBeLessThan(chart.indexOf('p-b['));
    expect(chart.indexOf('p-b[')).toBeLessThan(chart.indexOf('p-c['));
  });
});

// ---------------------------------------------------------------------------
// Execution instructions
// ---------------------------------------------------------------------------

const ALL_PROVIDERS: ExportProvider[] = [
  'claude-code',
  'copilot',
  'copilot-cli',
  'codex',
  'gemini',
  'roo-code',
  'antigravity',
  'cursor',
];

describe('generateExecutionInstructions', () => {
  it('describes each node shape the Mermaid generator actually emits', () => {
    // The other half of the shape contract asserted above.
    const instructions = generateExecutionInstructions(makeWorkflow([]), {
      provider: 'claude-code',
    });
    expect(instructions).toContain('**Rectangle nodes (Sub-Agent: ...)**');
    expect(instructions).toContain('**Diamond nodes (AskUserQuestion:...)**');
    expect(instructions).toContain('**Diamond nodes (Branch/Switch:...)**');
    expect(instructions).toContain('**Rectangle nodes (Prompt nodes)**');
    expect(instructions).toContain('**Rectangle nodes (Branch-Session: ...)**');
  });

  it('produces instructions for every supported provider', () => {
    // `ExportProvider` is a union with exhaustive switches behind it; adding a
    // member without extending those switches throws at export time, which
    // the type checker cannot catch for a value chosen at runtime.
    for (const provider of ALL_PROVIDERS) {
      const out = generateExecutionInstructions(
        makeWorkflow([subAgentNode('agent-1', 'Reviewer'), codexNode('codex-1')]),
        { provider }
      );
      expect(out, provider).toContain('## Workflow Execution Guide');
      expect(out, provider).toContain('Sub-Agent Node Details');
    }
  });

  it('reproduces the user prompt verbatim', () => {
    // The prompt body is the thing the agent actually executes. Any
    // transformation of it — trimming, escaping, re-wrapping — changes what
    // runs on the user's behalf.
    const prompt = 'Line one\n\n  indented line\nBackticks: `code` and "quotes" & <tags>';
    const out = generateExecutionInstructions(
      makeWorkflow([subAgentNode('agent-1', 'Reviewer', { prompt })]),
      { provider: 'claude-code' }
    );
    expect(out).toContain(`\`\`\`\n${prompt}\n\`\`\``);
  });

  describe('section presence follows the nodes present', () => {
    it('omits a detail section when no node of that type exists', () => {
      // An empty heading tells the agent a step exists with no content.
      const out = generateExecutionInstructions(
        makeWorkflow([promptNode('prompt-1', 'Do it')]),
        { provider: 'claude-code' }
      );
      expect(out).toContain('### Prompt Node Details');
      expect(out).not.toContain('## Sub-Agent Node Details');
      expect(out).not.toContain('## Skill Nodes');
      expect(out).not.toContain('## MCP Tool Nodes');
      expect(out).not.toContain('## Codex Agent Nodes');
      expect(out).not.toContain('### AskUserQuestion Node Details');
      expect(out).not.toContain('### Branch Session Node Details');
    });

    it('gives every executable node a section keyed by its sanitized id', () => {
      // The ids in the diagram and the ids in the details are how the agent
      // maps one to the other. If they diverge the instructions are unusable.
      const nodes = [
        subAgentNode('agent-1', 'Reviewer'),
        promptNode('prompt-1', 'Summarize'),
        skillNode('skill-1'),
        codexNode('end-1'), // deliberately reserved-word-prefixed
        branchSessionNode('bs-1'),
        askUserQuestionNode('ask-1'),
        ifElseNode('if-1'),
        switchNode('switch-1'),
      ];
      const out = generateExecutionInstructions(makeWorkflow(nodes), {
        provider: 'claude-code',
      });
      for (const node of nodes) {
        expect(out, node.id).toContain(`#### ${sanitizeNodeId(node.id)}(`);
      }
      expect(out).toContain('#### end_1(');
    });
  });

  describe('group execution tracking', () => {
    it('lists the groups the agent must highlight', () => {
      const out = generateExecutionInstructions(
        makeWorkflow([groupNode('group-1', 'Setup'), inGroup(promptNode('p-1', 'x'), 'group-1')]),
        { provider: 'claude-code' }
      );
      expect(out).toContain('### Group Node Execution Tracking');
      expect(out).toContain('| group-1 | Setup |');
    });

    it('escapes pipes in a group label so the table survives', () => {
      // A `|` in a label splits the row into extra cells and the agent reads
      // the wrong group id.
      const out = generateExecutionInstructions(
        makeWorkflow([groupNode('group-1', 'Build | Test')]),
        { provider: 'claude-code' }
      );
      expect(out).toContain('| group-1 | Build \\| Test |');
    });

    it('omits the section when highlight tracking is switched off', () => {
      const out = generateExecutionInstructions(makeWorkflow([groupNode('group-1', 'Setup')]), {
        provider: 'claude-code',
        highlightEnabled: false,
      });
      expect(out).not.toContain('### Group Node Execution Tracking');
    });
  });

  describe('codex nodes', () => {
    it('escapes single quotes in the generated shell command', () => {
      // The prompt is embedded in a single-quoted shell argument. An
      // unescaped apostrophe ends the quote early, so the shell executes a
      // command the user never wrote.
      const out = generateExecutionInstructions(
        makeWorkflow([codexNode('codex-1', { prompt: "don't break; rm -rf /" })]),
        { provider: 'claude-code' }
      );
      expect(out).toContain("'don'\\''t break; rm -rf /'");
    });

    it('includes the sandbox flag only when a sandbox is configured', () => {
      const withSandbox = generateExecutionInstructions(
        makeWorkflow([codexNode('codex-1', { sandbox: 'read-only' })]),
        { provider: 'claude-code' }
      );
      expect(withSandbox).toContain('-s read-only ');
      expect(withSandbox).toContain('**Sandbox Mode**: read-only');

      const withoutSandbox = generateExecutionInstructions(makeWorkflow([codexNode('codex-1')]), {
        provider: 'claude-code',
      });
      expect(withoutSandbox).toContain('**Sandbox Mode**: (default - not specified)');
      expect(withoutSandbox).not.toContain('-s ');
    });
  });

  describe('sub-agent details', () => {
    it('qualifies a plugin agent with its plugin name', () => {
      // Claude Code resolves plugin agents as `plugin:agent`; the bare name
      // does not resolve, so the step fails to launch.
      const out = generateExecutionInstructions(
        makeWorkflow([subAgentNode('agent-1', 'reviewer', { pluginName: 'with-me' })]),
        { provider: 'claude-code' }
      );
      expect(out).toContain('#### agent-1(Sub-Agent: with-me:reviewer)');
    });

    it('emits subagent_type for a built-in agent on Claude Code only', () => {
      const workflow = makeWorkflow([
        subAgentNode('agent-1', 'Explorer', { builtInType: 'explore' }),
      ]);
      expect(
        generateExecutionInstructions(workflow, { provider: 'claude-code' })
      ).toContain('**subagent_type**: explore');
      expect(generateExecutionInstructions(workflow, { provider: 'codex' })).not.toContain(
        '**subagent_type**'
      );
    });

    it('omits a Claude-Code-only model from a non-Claude export', () => {
      // `haiku` means nothing to Codex or Gemini; naming it would make the
      // target agent reject the definition.
      const workflow = makeWorkflow([
        subAgentNode('agent-1', 'Explorer', { builtInType: 'explore', model: 'haiku' }),
      ]);
      expect(generateExecutionInstructions(workflow, { provider: 'claude-code' })).toContain(
        '**Model**: haiku'
      );
      expect(generateExecutionInstructions(workflow, { provider: 'codex' })).not.toContain(
        '**Model**: haiku'
      );
    });

    it('treats an inherited model as no model at all', () => {
      const out = generateExecutionInstructions(
        makeWorkflow([subAgentNode('agent-1', 'Reviewer', { model: 'inherit' })]),
        { provider: 'claude-code' }
      );
      expect(out).not.toContain('**Model**:');
    });
  });

  describe('question details', () => {
    it('lists the fixed options for a single-select question', () => {
      const out = generateExecutionInstructions(makeWorkflow([askUserQuestionNode('ask-1')]), {
        provider: 'claude-code',
      });
      expect(out).toContain('**Selection mode:** Single Select');
      expect(out).toContain('- **Staging**: Deploy to staging');
      expect(out).toContain('- **Production**: Deploy to production');
    });

    it('does not list stored options when the AI generates them', () => {
      // Listing them would tell the agent to offer options the workflow
      // intends it to invent.
      const out = generateExecutionInstructions(
        makeWorkflow([askUserQuestionNode('ask-1', { useAiSuggestions: true })]),
        { provider: 'claude-code' }
      );
      expect(out).toContain('**Selection mode:** AI Suggestions');
      expect(out).not.toContain('- **Staging**');
    });
  });

  it('carries every branch condition into the instructions', () => {
    // The condition text is the only thing telling the agent which way to go.
    const out = generateExecutionInstructions(
      makeWorkflow([ifElseNode('if-1', { evaluationTarget: 'the test results' })]),
      { provider: 'claude-code' }
    );
    expect(out).toContain('**Evaluation Target**: the test results');
    expect(out).toContain('- **True**: the check passed');
    expect(out).toContain('- **False**: the check failed');
  });

  it('produces identical output for the same workflow', () => {
    const workflow = makeWorkflow(
      [startNode('start-1'), subAgentNode('agent-1', 'Reviewer'), endNode('end-1')],
      [connect('start-1', 'agent-1'), connect('agent-1', 'end-1')]
    );
    const options = { provider: 'claude-code' as const };
    expect(generateExecutionInstructions(workflow, options)).toBe(
      generateExecutionInstructions(workflow, options)
    );
  });
});
