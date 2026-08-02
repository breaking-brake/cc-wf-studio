import { describe, expect, it } from 'vitest';
import {
  type ExportProvider,
  escapeLabel,
  generateExecutionInstructions,
  generateMermaidFlowchart,
  sanitizeNodeId,
} from '../../services/workflow-prompt-generator.js';
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

// ---------------------------------------------------------------------------
// MCP Tool Nodes section (issue #1024)
// ---------------------------------------------------------------------------

/**
 * The `## MCP Tool Nodes` body — three modes, ~200 lines — was asserted only by
 * its *absence* by the suite above. It is the highest-stakes section in the
 * document: `docs/quality/02-feature-map.md` rates the MCP node **A** because a
 * regression here means the exported skill / slash command describes a
 * different tool call than the user configured — the wrong server, a dropped
 * parameter, a lost constraint, or the wrong execution strategy entirely. The
 * damage lands wherever the agent later runs, not on the user's machine.
 *
 * All three formatters are module-private, so every case drives them through
 * the exported `generateExecutionInstructions`.
 */
describe('generateExecutionInstructions — MCP Tool Nodes', () => {
  /** The section body, so a heading assertion cannot match elsewhere. */
  function mcpSection(node: ReturnType<typeof mcpNode>, provider: ExportProvider = 'claude-code') {
    const out = generateExecutionInstructions(makeWorkflow([node]), { provider });
    const start = out.indexOf('## MCP Tool Nodes');
    expect(start, 'the MCP section is missing entirely').toBeGreaterThan(-1);
    return out.slice(start);
  }

  /** Pull the JSON out of the `MCP_NODE_METADATA` comment and parse it. */
  function parseMetadata(section: string): Record<string, unknown> {
    const match = section.match(/<!-- MCP_NODE_METADATA: (.*) -->/);
    expect(match, 'no MCP_NODE_METADATA comment was emitted').not.toBeNull();
    return JSON.parse((match as RegExpMatchArray)[1]) as Record<string, unknown>;
  }

  // -- A. Mode dispatch -----------------------------------------------------
  //
  // The load-bearing half: picking the wrong formatter changes the execution
  // strategy the agent is told to use, which is the A-rated failure.
  //
  // Trap: the manual heading `#### mcp-1(get_forecast)` is a *prefix* of the
  // AI Parameter Config heading, so `toContain` on the manual heading also
  // passes on AI-mode output. Every dispatch case matches the whole line.
  describe('mode dispatch', () => {
    const MANUAL_HEADING = '#### mcp-1(get_forecast)\n';

    it('routes manualParameterConfig to the manual formatter', () => {
      const section = mcpSection(mcpNode('mcp-1', { mode: 'manualParameterConfig' }));
      expect(section).toContain(MANUAL_HEADING);
      expect(section).not.toContain('AI Parameter Config Mode');
      expect(section).not.toContain('AI Tool Selection Mode');
    });

    it('routes aiParameterConfig to the AI parameter formatter', () => {
      const section = mcpSection(mcpNode('mcp-1', { mode: 'aiParameterConfig' }));
      expect(section).toContain('#### mcp-1(get_forecast) - AI Parameter Config Mode\n');
    });

    it('routes aiToolSelection to the AI tool-selection formatter', () => {
      const section = mcpSection(mcpNode('mcp-1', { mode: 'aiToolSelection' }));
      expect(section).toContain('#### mcp-1(MCP Auto-Selection) - AI Tool Selection Mode\n');
    });

    it('defaults to manual parameter config when mode is absent', () => {
      // Every workflow file written before the mode field existed has this
      // shape, so the `|| 'manualParameterConfig'` default is what keeps them
      // exporting at all.
      const section = mcpSection(mcpNode('mcp-1'));
      expect(section).toContain(MANUAL_HEADING);
      expect(section).not.toContain('AI Parameter Config Mode');
      expect(section).not.toContain('AI Tool Selection Mode');
    });

    it('falls back to manual parameter config for an unrecognised mode', () => {
      const section = mcpSection(mcpNode('mcp-1', { mode: 'somethingElse' as never }));
      expect(section).toContain(MANUAL_HEADING);
      expect(section).not.toContain('AI Parameter Config Mode');
      expect(section).not.toContain('AI Tool Selection Mode');
    });

    it('falls back to manual parameter config for a legacy `mode` value — see #1025', () => {
      // Pinned as the code behaves today, not as it should. `fullNaturalLanguage`
      // is the v1 name for `aiToolSelection`, and `normalizeMcpNodeData`
      // (types/mcp-node.ts:261) exists to migrate it — but its only callers are
      // two webview-store methods, so a workflow loaded from disk arrives here
      // un-normalised and is exported with the *wrong execution strategy*:
      // "call this fixed tool" instead of "pick a tool at runtime".
      //
      // Filed as #1025. When that is fixed on auto-dev, this case must be
      // updated to assert the AI Tool Selection heading.
      const section = mcpSection(mcpNode('mcp-1', { mode: 'fullNaturalLanguage' as never }));
      expect(section).toContain(MANUAL_HEADING);
      expect(section).not.toContain('AI Tool Selection Mode');
    });
  });

  // -- B. Manual parameter config mode --------------------------------------
  describe('manual parameter config mode', () => {
    it('renders every configured parameter with the type from its schema', () => {
      const section = mcpSection(
        mcpNode('mcp-1', {
          parameters: [
            { name: 'region', type: 'string', required: true },
            { name: 'days', type: 'number', required: false },
          ],
          parameterValues: { region: 'us-east-1', days: 3 },
        })
      );
      expect(section).toContain('- `region` (string): us-east-1');
      expect(section).toContain('- `days` (number): 3');
    });

    it('renders a configured value with no matching schema entry, untyped', () => {
      // A dropped parameter here is the exact A-rated failure: the tool is
      // called without a value the user set.
      const section = mcpSection(
        mcpNode('mcp-1', {
          parameters: [{ name: 'region', type: 'string', required: true }],
          parameterValues: { region: 'us-east-1', undocumented: 'kept' },
        })
      );
      expect(section).toContain('- `undocumented`: kept');
    });

    it('serializes object and array values as JSON rather than [object Object]', () => {
      const section = mcpSection(
        mcpNode('mcp-1', { parameterValues: { filter: { a: 1 }, tags: ['x', 'y'] } })
      );
      expect(section).toContain('- `filter`: {"a":1}');
      expect(section).toContain('- `tags`: ["x","y"]');
      expect(section).not.toContain('[object Object]');
    });

    it('omits Configured Parameters entirely when there are none', () => {
      // An empty heading tells the agent a step exists with no content.
      expect(mcpSection(mcpNode('mcp-1'))).not.toContain('**Configured Parameters**');
      expect(mcpSection(mcpNode('mcp-1', { parameterValues: {} }))).not.toContain(
        '**Configured Parameters**'
      );
    });

    it('omits Available Parameters entirely when there are none', () => {
      expect(mcpSection(mcpNode('mcp-1'))).not.toContain('**Available Parameters**');
      expect(mcpSection(mcpNode('mcp-1', { parameters: [] }))).not.toContain(
        '**Available Parameters**'
      );
    });

    it('labels each available parameter required or optional, with a description fallback', () => {
      const section = mcpSection(
        mcpNode('mcp-1', {
          parameters: [
            { name: 'region', type: 'string', required: true, description: 'Region code' },
            { name: 'days', type: 'number', required: false },
          ],
        })
      );
      expect(section).toContain('- `region` (string) (required): Region code');
      expect(section).toContain('- `days` (number) (optional): No description available');
    });

    it('falls back to placeholders rather than printing undefined', () => {
      const section = mcpSection(
        mcpNode('mcp-1', { toolName: undefined, toolDescription: undefined })
      );
      expect(section).toContain('#### mcp-1(MCP Tool)\n');
      expect(section).toContain('**Tool Name**: \n');
      expect(section).toContain('**Description**: \n');
      expect(section).not.toContain('undefined');
    });

    it('names the server and the validation status', () => {
      // The server id is the only thing connecting the instruction to a
      // concrete endpoint.
      const section = mcpSection(mcpNode('mcp-1', { validationStatus: 'missing' }));
      expect(section).toContain('**MCP Server**: weather');
      expect(section).toContain('**Validation Status**: missing');
    });
  });

  // -- C. AI parameter config mode ------------------------------------------
  describe('AI parameter config mode', () => {
    const aiNode = (extra: Parameters<typeof mcpNode>[1] = {}) =>
      mcpNode('mcp-1', { mode: 'aiParameterConfig', ...extra });

    it('emits a metadata payload that round-trips as JSON', () => {
      // Nothing in this repository parses this comment, so a malformed payload
      // is invisible here and only fails in the consuming agent.
      const metadata = parseMetadata(
        mcpSection(
          aiNode({
            aiParameterConfig: { description: 'the east region', timestamp: 't' },
          })
        )
      );
      expect(metadata).toMatchObject({
        mode: 'aiParameterConfig',
        serverId: 'weather',
        toolName: 'get_forecast',
        userIntent: 'the east region',
      });
      expect(metadata.parameterSchema).toEqual([]);
    });

    it('mirrors each parameter into parameterSchema, in order', () => {
      const metadata = parseMetadata(
        mcpSection(
          aiNode({
            parameters: [
              {
                name: 'region',
                type: 'string',
                required: true,
                description: 'Region code',
                validation: { minLength: 2 },
              },
              { name: 'days', type: 'number', required: false },
            ],
          })
        )
      );
      expect(metadata.parameterSchema).toEqual([
        {
          name: 'region',
          type: 'string',
          required: true,
          description: 'Region code',
          validation: { minLength: 2 },
        },
        { name: 'days', type: 'number', required: false, description: '' },
      ]);
    });

    it.skip('round-trips the metadata when the payload contains "-->" — blocked on #1026', () => {
      // `JSON.stringify` does not escape `>`, and an HTML comment ends at the
      // first `-->`. The description is free text the user types, so this is
      // reachable: the comment closes mid-JSON and the remainder leaks into
      // the document as visible text. Asserted to the intended contract so
      // this un-skips unchanged once #1026 is fixed.
      const metadata = parseMetadata(
        mcpSection(aiNode({ aiParameterConfig: { description: 'use --> east', timestamp: 't' } }))
      );
      expect(metadata.userIntent).toBe('use --> east');
    });

    describe('constraint rendering', () => {
      // One case per validation key, so dropping any single clause fails a
      // case that names the missing constraint rather than a generic blob.
      const cases: [string, Record<string, unknown>, string][] = [
        ['minLength', { minLength: 2 }, 'minLength: 2'],
        ['maxLength', { maxLength: 10 }, 'maxLength: 10'],
        ['minimum', { minimum: 0 }, 'minimum: 0'],
        ['maximum', { maximum: 99 }, 'maximum: 99'],
        ['pattern', { pattern: '^[a-z]+$' }, 'pattern: ^[a-z]+$'],
        ['enum', { enum: ['a', 'b'] }, 'enum: a, b'],
      ];

      for (const [key, validation, expected] of cases) {
        it(`renders the ${key} constraint`, () => {
          const section = mcpSection(
            aiNode({
              parameters: [{ name: 'region', type: 'string', required: true, validation }],
            })
          );
          expect(section).toContain(`  - Constraints: ${expected}`);
        });
      }

      it('omits the Constraints line when the parameter has no validation', () => {
        const section = mcpSection(
          aiNode({ parameters: [{ name: 'region', type: 'string', required: true }] })
        );
        expect(section).toContain('- `region` (string) (required):');
        expect(section).not.toContain('Constraints:');
      });
    });

    it('includes the User Intent block only when a description is set', () => {
      const withIntent = mcpSection(
        aiNode({ aiParameterConfig: { description: 'the east region', timestamp: 't' } })
      );
      expect(withIntent).toContain('**User Intent (Natural Language Parameter Description)**');
      expect(withIntent).toContain('```\nthe east region\n```');

      expect(mcpSection(aiNode())).not.toContain('**User Intent');
    });

    it.skip('keeps the User Intent fence intact around a fenced description — blocked on #1026', () => {
      // The block opens with three backticks, so a description containing its
      // own fence closes it early and the intended closing fence opens a new
      // one that swallows **Execution Method**. `workflow-overview-formatter`
      // uses four backticks for exactly this reason.
      const description = 'like ```js\ncode\n```';
      const section = mcpSection(aiNode({ aiParameterConfig: { description, timestamp: 't' } }));
      const intent = section.slice(section.indexOf('**User Intent'));
      expect(intent).toContain(`\`\`\`\`\n${description}\n\`\`\`\``);
    });
  });

  // -- D. AI tool selection mode --------------------------------------------
  describe('AI tool selection mode', () => {
    const selectionNode = (extra: Parameters<typeof mcpNode>[1] = {}) =>
      mcpNode('mcp-1', { mode: 'aiToolSelection', ...extra });

    it('emits metadata carrying only the server and the intent', () => {
      // This mode deliberately carries less: naming a tool would contradict
      // the whole point of letting the agent choose one.
      const metadata = parseMetadata(
        mcpSection(
          selectionNode({
            aiToolSelectionConfig: { taskDescription: 'find the weather', timestamp: 't' },
          })
        )
      );
      expect(metadata).toEqual({
        mode: 'aiToolSelection',
        serverId: 'weather',
        userIntent: 'find the weather',
      });
    });

    it('embeds the server id in the execution method verbatim', () => {
      // The agent has nothing else to connect to at runtime.
      const section = mcpSection(selectionNode({ serverId: 'aws-knowledge-mcp' }));
      expect(section).toContain('query the MCP server "aws-knowledge-mcp" at runtime');
    });

    it('includes the User Intent block only when a task description is set', () => {
      const withIntent = mcpSection(
        selectionNode({
          aiToolSelectionConfig: { taskDescription: 'find the weather', timestamp: 't' },
        })
      );
      expect(withIntent).toContain('**User Intent (Natural Language Task Description)**');
      expect(withIntent).toContain('```\nfind the weather\n```');

      expect(mcpSection(selectionNode())).not.toContain('**User Intent');
    });

    it('does not emit a tool name or parameters left over on the node data', () => {
      // Switching a node to this mode preserves the old manual config on the
      // data. Emitting it would tell the agent to call that specific tool.
      const section = mcpSection(
        selectionNode({
          toolName: 'get_forecast',
          parameters: [{ name: 'region', type: 'string', required: true }],
          parameterValues: { region: 'us-east-1' },
        })
      );
      expect(section).not.toContain('get_forecast');
      expect(section).not.toContain('region');
    });
  });

  // -- E. Provider dependence -----------------------------------------------
  describe('provider dependence', () => {
    it.each([
      ['claude-code', 'Claude Code'],
      ['codex', 'Codex CLI'],
      // The Roo Code -> Zoo Code rename (#801) is exactly the kind of thing
      // that regresses back on an unrelated edit.
      ['roo-code', 'Zoo Code'],
    ] as [ExportProvider, string][])('names %s as %s in the AI modes', (provider, agentName) => {
      const aiParam = mcpSection(mcpNode('mcp-1', { mode: 'aiParameterConfig' }), provider);
      expect(aiParam).toContain(`${agentName} should interpret the natural language description`);

      const selection = mcpSection(mcpNode('mcp-1', { mode: 'aiToolSelection' }), provider);
      expect(selection).toContain(`${agentName} should analyze the task description`);
    });

    it('keeps the manual mode closing sentence provider-independent', () => {
      const node = mcpNode('mcp-1', { parameterValues: { region: 'us-east-1' } });
      expect(mcpSection(node, 'claude-code')).toBe(mcpSection(node, 'roo-code'));
    });
  });

  // -- F. Multiple nodes ----------------------------------------------------
  it('gives each MCP node its own subsection, in workflow node order', () => {
    const out = generateExecutionInstructions(
      makeWorkflow([
        mcpNode('mcp-1', { mode: 'aiToolSelection' }),
        mcpNode('mcp-2', { mode: 'manualParameterConfig' }),
      ]),
      { provider: 'claude-code' }
    );
    expect(out.match(/## MCP Tool Nodes/g)).toHaveLength(1);

    const first = out.indexOf('#### mcp-1(MCP Auto-Selection) - AI Tool Selection Mode');
    const second = out.indexOf('#### mcp-2(get_forecast)\n');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });
});

// ---------------------------------------------------------------------------
// User-text fences and the Prompt node variables block (issue #1063)
// ---------------------------------------------------------------------------

/**
 * The prompt body is the payload of the whole export: it is the text the
 * consuming agent actually executes. `generateExecutionInstructions` embeds it
 * inside a Markdown fence at three sites — the Sub-Agent `**Prompt**`, the
 * Codex `**Prompt**`, and the Prompt node body — and the containment of that
 * fence is what keeps the rest of the instruction document intact.
 *
 * The property asserted below is deliberately *not* a transcription of the
 * `sections.push` sequence: a test that spells out `` ```\n${prompt}\n``` ``
 * passes on the very defect this section exists to catch (see the existing
 * "reproduces the user prompt verbatim" case, which uses single backticks).
 * Instead each case asks the question a reader of the document would:
 * **which lines are outside every fence?** A prompt line that surfaces there
 * is prose the agent will act on; a heading that stops surfacing there is a
 * node the agent will never see.
 */

/**
 * The lines of `doc` that sit outside every fenced code block.
 *
 * A small CommonMark-faithful scanner: a fence opens on a line whose first
 * non-space run is three or more backticks, and closes on the first later line
 * whose backtick run is at least as long as the opener's and which carries no
 * info string. That closing rule is the whole reason a nested ` ```bash ` does
 * not close its parent while a bare ` ``` ` does.
 */
function topLevelLines(doc: string): string[] {
  const outside: string[] = [];
  let openFenceLength = 0;
  for (const line of doc.split('\n')) {
    const fence = /^ {0,3}(`{3,})(.*)$/.exec(line);
    if (openFenceLength === 0) {
      if (fence) {
        openFenceLength = fence[1].length;
        continue;
      }
      outside.push(line);
    } else if (fence && fence[1].length >= openFenceLength && fence[2].trim() === '') {
      openFenceLength = 0;
    }
  }
  return outside;
}

/**
 * One embedding site: a document carrying the prompt under test on its first
 * node, plus a second node of the same type whose heading is the canary for
 * "the rest of the document survived".
 */
interface FenceSite {
  site: string;
  render: (prompt: string) => string;
  /** Heading of the second node's subsection. */
  nextHeading: string;
}

const FENCE_SITES: FenceSite[] = [
  {
    site: 'Prompt node body',
    render: (prompt) =>
      generateExecutionInstructions(
        makeWorkflow([promptNode('p1', prompt), promptNode('p2', 'second body')]),
        { provider: 'claude-code' }
      ),
    nextHeading: '#### p2(second body)',
  },
  {
    site: 'Sub-Agent **Prompt**',
    render: (prompt) =>
      generateExecutionInstructions(
        makeWorkflow([
          subAgentNode('a1', 'One', { prompt }),
          subAgentNode('a2', 'Two', { prompt: 'second body' }),
        ]),
        { provider: 'claude-code' }
      ),
    nextHeading: '#### a2(Sub-Agent: Two)',
  },
  {
    site: 'Codex **Prompt**',
    render: (prompt) =>
      generateExecutionInstructions(
        makeWorkflow([
          codexNode('c1', { prompt }),
          codexNode('c2', { prompt: 'second body', label: 'Second' }),
        ]),
        { provider: 'claude-code' }
      ),
    nextHeading: '#### c2(Second)',
  },
];

describe.each(FENCE_SITES)('generateExecutionInstructions — fence containment: $site', (site) => {
  it('keeps an ordinary prompt inside the fence and the next node visible', () => {
    // The positive control. It must hold both today and after bug #1064 is
    // fixed, so a fix that widens every fence cannot quietly change the shape
    // of ordinary output.
    const top = topLevelLines(site.render('Analyse the module\nand report back'));
    expect(top).not.toContain('Analyse the module');
    expect(top).not.toContain('and report back');
    expect(top).toContain(site.nextHeading);
  });

  it('CURRENT BEHAVIOUR (bug #1064): a code block in the prompt escapes the fence', () => {
    // A prompt that contains its own ``` block closes the enclosing 3-backtick
    // fence early, so the tail of the prompt lands at document top level and
    // the agent reads it as instructions to the *document*, not as prompt text.
    // This case is expected to go red when #1064 is fixed — that is its job.
    const top = topLevelLines(site.render('before\n```bash\nls -la\n```\nafter'));
    expect(top, 'the tail of the prompt has escaped the fence').toContain('after');
  });

  it('CURRENT BEHAVIOUR (bug #1064): a prompt ending in a fence swallows the next node', () => {
    // No code block needed — a trailing ``` alone is enough. The generator's
    // own closing fence then *opens* a block that runs to the end of the
    // document, so the following node's entire subsection disappears from the
    // agent's view while the export still reports success.
    const top = topLevelLines(site.render('text\n```'));
    expect(top, 'the next node was swallowed by an unclosed fence').not.toContain(
      site.nextHeading
    );
  });

  it('CURRENT BEHAVIOUR (bug #1064, boundary): four backticks defeat a four-backtick fence too', () => {
    // Recorded rather than demanded: the sibling `workflow-overview-formatter`
    // fixes the common case by opening with four backticks, and this input
    // defeats that fix exactly the way three backticks defeat the current
    // code. Whoever closes #1064 should know the robust form measures the
    // longest backtick run in the text and opens with one more.
    const top = topLevelLines(site.render('a\n````\nb\n````\nc'));
    expect(top).toContain('b');
    expect(top).not.toContain(site.nextHeading);
  });
});

describe('generateExecutionInstructions — Codex execution command', () => {
  it('CURRENT BEHAVIOUR (bug #1064): a fenced prompt also breaks the ```bash command block', () => {
    // The fourth exposure of the same input: the prompt is interpolated into
    // the `codex exec … '<prompt>'` argument inside a ```bash block. The shell
    // escaping at workflow-prompt-generator.ts:866 handles `'` and nothing
    // else, so the command the user is told to run is unfenced *and* wrong.
    const out = generateExecutionInstructions(
      makeWorkflow([codexNode('c1', { prompt: 'before\n```bash\nls -la\n```\nafter' })]),
      { provider: 'claude-code' }
    );
    expect(topLevelLines(out), 'the codex exec command line has escaped its block').toContain(
      "after'"
    );
  });
});

/**
 * `PromptNode.data.variables` is live and AI-authorable — a zod field, part of
 * the AI authoring guide, and seeded as `{}` on every Prompt node the palette
 * creates — but had no test reference anywhere in the repository.
 * `docs/quality/02-feature-map.md:123` rates the feature **A** with the failure
 * mode "substitutes wrongly, so a different value arrives at run time".
 */
describe('generateExecutionInstructions — Prompt node variables block', () => {
  function promptSection(variables?: Record<string, string>) {
    const out = generateExecutionInstructions(
      makeWorkflow([promptNode('p1', 'body', variables ? { variables } : {})]),
      { provider: 'claude-code' }
    );
    const start = out.indexOf('### Prompt Node Details');
    expect(start, 'the Prompt Node Details section is missing entirely').toBeGreaterThan(-1);
    return out.slice(start);
  }

  it('omits the block entirely when no variables are declared', () => {
    expect(promptSection()).not.toContain('**Available variables:**');
  });

  it('omits the block for an empty variables map', () => {
    // The common shape: NodePalette seeds `variables: {}` on every new Prompt
    // node, so without the length guard every exported document would carry an
    // empty heading.
    expect(promptSection({})).not.toContain('**Available variables:**');
  });

  it('lists a declared variable with its mustache placeholder and value', () => {
    const section = promptSection({ lang: 'TypeScript' });
    expect(section).toContain('**Available variables:**');
    expect(section).toContain('- `{{lang}}`: TypeScript');
  });

  it('preserves declaration order across several variables', () => {
    // Insertion order is what the user sees in the property panel; a reordering
    // makes two exports of the same workflow differ for no reason.
    const section = promptSection({ lang: 'TypeScript', target: 'node', style: 'concise' });
    const order = ['lang', 'target', 'style'].map((k) => section.indexOf(`- \`{{${k}}}\`:`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('renders an unset value as (not set) rather than as an empty line', () => {
    // A declared-but-empty variable is the state a user leaves the panel in
    // most often; silently emitting a blank tells the agent nothing.
    expect(promptSection({ region: '' })).toContain('- `{{region}}`: (not set)');
  });

  it('CURRENT BEHAVIOUR (bug #1064): a newline in a value breaks the list item apart', () => {
    // The value is interpolated raw into a Markdown list item, so its second
    // line stops being part of the item and becomes document prose. Same root
    // cause as the fences above; recorded here so a fix to #1064 that only
    // widens fences is visibly incomplete.
    const section = promptSection({ note: 'first\nsecond' });
    expect(section).toContain('- `{{note}}`: first');
    expect(topLevelLines(section)).toContain('second');
  });

  it('CURRENT BEHAVIOUR: a backtick or a pipe in a value is emitted raw', () => {
    // Observed, not demanded. A backtick unbalances the inline code span that
    // renders the placeholder, and a pipe would split the row if this block
    // ever became a table. Neither corrupts the document today.
    const section = promptSection({ tick: 'x`y', pipe: 'a|b' });
    expect(section).toContain('- `{{tick}}`: x`y');
    expect(section).toContain('- `{{pipe}}`: a|b');
  });

  it('CURRENT BEHAVIOUR: advertises a key the placeholder syntax cannot match', () => {
    // The zod field is `z.record(z.string(), z.string())`, so any key is
    // accepted, but the webview's placeholder detector
    // (packages/vscode/src/webview/src/utils/template-utils.ts:14,
    // `/\{\{(\w+)\}\}/g`) only ever matches `\w`-only names. So the exported
    // document can advertise `{{my-var}}` as available while nothing in the
    // product can ever bind it. A consistency gap, pinned rather than judged.
    expect(promptSection({ 'my-var': 'value' })).toContain('- `{{my-var}}`: value');
  });
});
