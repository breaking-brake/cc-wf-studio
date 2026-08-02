import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import type { SubAgentFlow, SubAgentFlowNode } from '../../types/workflow-definition.js';
import {
  connect,
  endNode,
  makeSubAgentFlow,
  makeWorkflow,
  promptNode,
  startNode,
  subAgentFlowNode,
} from './__fixtures__/workflows.js';
import {
  generateSubAgentFlowAgentFile,
  planWorkflowExportFiles,
  validateClaudeFileFormat,
} from '../../services/workflow-export.js';

/**
 * Suite S2 — the Sub-Agent Flow agent file written on every Claude Code
 * export (issue #1057).
 *
 * `generateSubAgentFlowAgentFile` (`workflow-export.ts:121`) builds its YAML
 * frontmatter by hand from two sources: the `SubAgentFlow` definition and the
 * `SubAgentFlowNode` that references it. If any of it is wrong the user builds
 * a Sub-Agent Flow, exports, and the `.claude/agents/{workflow}_{flow}.md`
 * that lands on disk either describes a different agent than the canvas holds
 * — wrong model, missing tools — or carries a frontmatter block Claude Code
 * cannot parse, in which case the nested agent **silently never loads**.
 * Nothing on the user's machine reports it: the export succeeds, the file is
 * written, and the failure surfaces wherever the agent is later run.
 *
 * The property under test is deliberately not "the generator emits these
 * lines" — that would be a second copy of the generator and would pass on
 * every defect in section B. What is checked instead relates two independent
 * representations of the same fact, the same property #1044 used for the
 * sibling slash-command path:
 *
 *   > The emitted frontmatter must parse as YAML, and parsing it must yield
 *   > back the values the `SubAgentFlow` and its referencing node declared.
 *
 * Input objects on one side, parsed tree on the other — an inspection rather
 * than a transcription (`docs/quality/03-assurance-map.md` §2).
 *
 * Section B pins defects that are live today, filed as **bug #1058**:
 * `description` and `tools` are interpolated raw, so ordinary values produce a
 * document that does not parse. Those cases are written to pass against the
 * current behaviour and named `CURRENT BEHAVIOUR (bug #1058)`, per the
 * #1018 / #1031 / #1039 / #1042 / #1047 precedent, so the suite stays green now
 * and goes red the moment the feature loop fixes it.
 *
 * Sections C and D stop at this function's own contract: the internals of
 * `generateMermaidFlowchart` and `generateExecutionInstructions` belong to
 * #995, so what is asserted here is only that this function feeds them the
 * *flow's* data and concatenates the three parts in order.
 */

/** Extract the frontmatter body using the same fence pattern the shipped
 * validator uses (`workflow-export.ts:272`), so the suite and
 * `validateClaudeFileFormat` agree on where the block ends. */
function frontmatterOf(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`generated file has no YAML frontmatter:\n${content.slice(0, 200)}`);
  }
  return match[1];
}

/** Generate, extract, and parse — the happy path used by most cases. */
function parsedFrontmatter(
  flowOverrides: Partial<SubAgentFlow> = {},
  nodeData?: Partial<SubAgentFlowNode['data']>,
  agentFileName = 'parent-flow_input-validation'
): Record<string, unknown> {
  const raw = frontmatterOf(
    generateSubAgentFlowAgentFile(
      makeSubAgentFlow(flowOverrides),
      agentFileName,
      nodeData ? subAgentFlowNode('ref-1', nodeData) : undefined
    )
  );
  return YAML.parse(raw) as Record<string, unknown>;
}

/** Same, but reports whether the block parses at all rather than throwing. */
function frontmatterParses(
  flowOverrides: Partial<SubAgentFlow> = {},
  nodeData?: Partial<SubAgentFlowNode['data']>
): boolean {
  const raw = frontmatterOf(
    generateSubAgentFlowAgentFile(
      makeSubAgentFlow(flowOverrides),
      'parent-flow_input-validation',
      nodeData ? subAgentFlowNode('ref-1', nodeData) : undefined
    )
  );
  try {
    YAML.parse(raw);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// A. Frontmatter round-trip — what the canvas declared must come back out
// ---------------------------------------------------------------------------

describe('generateSubAgentFlowAgentFile — frontmatter round-trip', () => {
  it('emits only name, description and model when there is no referencing node', () => {
    // The absence half matters as much as the presence half: a regression that
    // emits every key unconditionally satisfies a presence-only check.
    expect(parsedFrontmatter()).toEqual({
      name: 'parent-flow_input-validation',
      description: 'Input Validation',
      model: 'sonnet',
    });
  });

  it('uses the agentFileName argument verbatim, sanitizing nothing itself', () => {
    // The contract is that the *caller* pre-sanitizes (`:118`, and
    // `planWorkflowExportFiles:375` is the caller that does it). Nothing
    // inside the function sanitizes, so pin that division of labour: if a
    // future caller forgets, the breakage belongs to the caller, not here.
    expect(parsedFrontmatter({}, undefined, 'Parent Flow_Input Validation')).toMatchObject({
      name: 'Parent Flow_Input Validation',
    });
  });

  it("takes description from the flow definition's own description", () => {
    expect(parsedFrontmatter({ description: 'Check every input field' })).toMatchObject({
      description: 'Check every input field',
    });
  });

  it('falls back to the flow name when the flow has no description', () => {
    expect(parsedFrontmatter({ name: 'Preflight', description: undefined })).toMatchObject({
      description: 'Preflight',
    });
  });

  it("prefers the flow's description over the referencing node's", () => {
    // Both objects carry a `description` and only one reaches the file. The
    // node's copy is a store-maintained mirror of the flow's — the panel never
    // lets the user edit it (`sub-agent-flow-schema.ts:24` declares no
    // `control`, so it is data-only, and `workflow-store.ts:1249,1274` copies
    // the flow's value in on save). The flow winning is therefore correct, and
    // worth pinning: if the precedence flipped, the file would carry a stale
    // mirror of a description the user has since changed.
    expect(
      parsedFrontmatter({ description: 'from the flow' }, { description: 'from the node' })
    ).toMatchObject({ description: 'from the flow' });
  });

  it('always emits model, defaulting to sonnet when the node declares none', () => {
    // `model` is the one key with no conditional guard (`:144`), and
    // `validateClaudeFileFormat` requires it for a subAgent file (`:288`).
    expect(parsedFrontmatter({}, {})).toMatchObject({ model: 'sonnet' });
    expect(parsedFrontmatter()).toMatchObject({ model: 'sonnet' });
  });

  it.each(['sonnet', 'opus', 'haiku', 'fable'] as const)(
    'passes the model %s through unmodified',
    (model) => {
      // `haiku` and `fable` are `CC_ONLY_MODELS` (`sub-agent-schema.ts:24`).
      // Unlike `generateSubAgentFile`, this generator has no `omitModel`
      // escape hatch (`:83` vs `:144`) — it is only ever reached on the Claude
      // Code path. Pinned so a future reuse for a non-Claude provider fails
      // here rather than silently emitting a model that provider rejects.
      expect(parsedFrontmatter({}, { model })).toMatchObject({ model });
    }
  );

  it('emits tools only when the node sets a non-empty value', () => {
    // Asserted absent, not empty: `tools: ` with no value parses as null and
    // reads to the consumer as "this agent has no tools at all".
    expect(parsedFrontmatter({}, { tools: 'Read, Bash' })).toMatchObject({ tools: 'Read, Bash' });
    expect(parsedFrontmatter({}, { tools: '' })).not.toHaveProperty('tools');
    expect(parsedFrontmatter({}, {})).not.toHaveProperty('tools');
  });

  it('emits color only when the node sets one', () => {
    expect(parsedFrontmatter({}, { color: 'blue' })).toMatchObject({ color: 'blue' });
    expect(parsedFrontmatter({}, {})).not.toHaveProperty('color');
  });

  it('emits memory only when the node sets one', () => {
    expect(parsedFrontmatter({}, { memory: 'project' })).toMatchObject({ memory: 'project' });
    expect(parsedFrontmatter({}, {})).not.toHaveProperty('memory');
  });

  it('round-trips every referencing-node field at once', () => {
    // The four node-sourced keys are emitted by four separate branches; this
    // is the only case that proves they compose rather than overwrite.
    expect(
      parsedFrontmatter(
        { description: 'Check every input field' },
        { model: 'opus', tools: 'Read, Grep', color: 'cyan', memory: 'user' }
      )
    ).toEqual({
      name: 'parent-flow_input-validation',
      description: 'Check every input field',
      model: 'opus',
      tools: 'Read, Grep',
      color: 'cyan',
      memory: 'user',
    });
  });
});

// ---------------------------------------------------------------------------
// B. YAML-significant free text — what is broken today
// ---------------------------------------------------------------------------

describe('generateSubAgentFlowAgentFile — escaping of user-typed values', () => {
  it('CURRENT BEHAVIOUR (bug #1058): a colon-space in the description makes the frontmatter unparseable', () => {
    // `description` is interpolated raw (`:137`) while `generateSlashCommandFile`
    // 50 lines below routes its own description through `escapeYamlString`
    // (`:191`). A colon followed by a space opens a nested mapping, and the
    // frontmatter is one block — so the whole agent file fails to load, not
    // just its description.
    //
    // "Validate: input then output" is ordinary phrasing for a flow named
    // "Input Validation", not a contrived string.
    //
    // Asserted as *does not parse*. When #1058 is fixed this goes red; replace
    // it with a round-trip assertion at that point.
    expect(frontmatterParses({ description: 'Validate: input then output' })).toBe(false);
  });

  it('a description with a colon but no following space survives — by luck, not by escaping', () => {
    // Kept beside the failing case so the fix for #1058 is visibly a widening
    // of what works rather than a change in behaviour here.
    expect(parsedFrontmatter({ description: 'Validate:input' })).toMatchObject({
      description: 'Validate:input',
    });
  });

  it('CURRENT BEHAVIOUR (bug #1058): a newline in the description makes the frontmatter unparseable', () => {
    // The second line lands in the frontmatter as its own implicit key
    // (`YAMLParseError: Implicit keys need to be on a single line`). The
    // closing `---` still comes after it, so the fence-based extraction and
    // `validateClaudeFileFormat` both see a well-formed block — the damage is
    // invisible until something actually parses it.
    expect(frontmatterParses({ description: 'Line one\nLine two' })).toBe(false);
  });

  it('CURRENT BEHAVIOUR (bug #1058): a colon-space in tools makes the frontmatter unparseable', () => {
    // Same root cause at `:141`. `tools` is free text in the panel
    // (`sub-agent-flow-schema.ts:40`, a bare `z.string()`), so nothing stops a
    // user typing this shape.
    expect(frontmatterParses({}, { tools: 'Bash: git diff' })).toBe(false);
    // The comma-separated form the placeholder suggests has no space after its
    // colon, which is the only reason the common case works.
    expect(frontmatterParses({}, { tools: 'Bash(git diff:*), Read' })).toBe(true);
  });

  it('CURRENT BEHAVIOUR (bug #1058): the validator passes files no YAML parser can read', () => {
    // This is why the defect ships silently. `validateClaudeFileFormat` is
    // called on every file before writing (`export-workflow.ts:109,254`) but
    // only checks the `---` fences and greps for `name:` / `description:` /
    // `model:` — it never parses the block. Pinned so the gap is visible in
    // the suite, not only in the issue.
    for (const description of ['Validate: input then output', 'Line one\nLine two']) {
      const content = generateSubAgentFlowAgentFile(
        makeSubAgentFlow({ description }),
        'parent-flow_input-validation'
      );
      expect(frontmatterParses({ description })).toBe(false);
      expect(() => validateClaudeFileFormat(content, 'subAgent')).not.toThrow();
    }
  });

  it('accepts every well-formed generated file', () => {
    // The agreement half: `validateClaudeFileFormat` is a second,
    // independently maintained statement of this contract, and it is live.
    const cases: [Partial<SubAgentFlow>, Partial<SubAgentFlowNode['data']> | undefined][] = [
      [{}, undefined],
      [{}, {}],
      [{ description: 'Check every input field' }, { model: 'haiku' }],
      [{}, { model: 'opus', tools: 'Read, Grep', color: 'cyan', memory: 'user' }],
    ];

    for (const [flowOverrides, nodeData] of cases) {
      const content = generateSubAgentFlowAgentFile(
        makeSubAgentFlow(flowOverrides),
        'parent-flow_input-validation',
        nodeData ? subAgentFlowNode('ref-1', nodeData) : undefined
      );
      expect(() => validateClaudeFileFormat(content, 'subAgent')).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// C. Body composition — the flow's own graph, in order, deterministically
// ---------------------------------------------------------------------------

describe('generateSubAgentFlowAgentFile — document composition', () => {
  it('places the closing fence, then the Mermaid diagram, then the instructions', () => {
    // The body is `${frontmatter}${mermaid}\n\n${executionLogic}` (`:181`).
    // Order is the whole contract: a file whose diagram lands after the
    // instructions still validates and still parses, and still misleads.
    const content = generateSubAgentFlowAgentFile(
      makeSubAgentFlow(),
      'parent-flow_input-validation'
    );

    const closingFence = content.indexOf('\n---\n');
    const mermaid = content.indexOf('```mermaid');
    const instructions = content.indexOf('## Workflow Execution Guide');

    expect(closingFence).toBeGreaterThanOrEqual(0);
    expect(mermaid).toBeGreaterThan(closingFence);
    expect(instructions).toBeGreaterThan(mermaid);
  });

  it("renders the flow's own nodes, not the parent workflow's", () => {
    // The generator is handed the flow, never the parent — but it is reached
    // through `planWorkflowExportFiles`, which holds both. If the wrong graph
    // were passed the file would describe the entire parent workflow to a
    // nested agent whose job is one step of it.
    const flow = makeSubAgentFlow();
    const parent = makeWorkflow(
      [
        startNode('parent-start'),
        promptNode('parent-step', 'Deploy to production', {}, 'Deploy'),
        subAgentFlowNode('parent-ref'),
        endNode('parent-end'),
      ],
      [
        connect('parent-start', 'parent-step'),
        connect('parent-step', 'parent-ref'),
        connect('parent-ref', 'parent-end'),
      ],
      { name: 'Parent Flow', subAgentFlows: [flow] }
    );

    const agentFile = planWorkflowExportFiles(parent).find((f) => f.kind === 'subAgentFlow');
    expect(agentFile).toBeDefined();
    const contents = agentFile?.contents ?? '';

    expect(contents).toContain('flow-step');
    expect(contents).toContain('Validate the input');
    expect(contents).not.toContain('parent-step');
    expect(contents).not.toContain('Deploy to production');
  });

  it('leaks none of the pseudo-workflow placeholder values', () => {
    // `:165-174` fabricates a `Workflow` around the flow to satisfy the
    // downstream formatter's type, with `version: '1.0.0'` and `new Date(0)`
    // as placeholders. The comment at `:162` claims only name / description /
    // nodes / connections are read downstream; this asserts that instead of
    // trusting the comment.
    const content = generateSubAgentFlowAgentFile(
      makeSubAgentFlow(),
      'parent-flow_input-validation'
    );

    expect(content).not.toContain('1.0.0');
    expect(content).not.toContain('1970');
  });

  it('is deterministic across calls with no clock stubbing', () => {
    // The fabricated timestamps are a fixed epoch, so byte-equality must hold
    // with no fake timers. If it ever does not, something in the chain reads
    // the real clock and every export becomes a spurious diff in the user's
    // repository.
    const flow = makeSubAgentFlow({ description: 'Check every input field' });
    const node = subAgentFlowNode('ref-1', { model: 'opus', tools: 'Read', color: 'blue' });

    expect(generateSubAgentFlowAgentFile(flow, 'a_b', node)).toBe(
      generateSubAgentFlowAgentFile(flow, 'a_b', node)
    );
  });
});

// ---------------------------------------------------------------------------
// D. Behaviours that exist only at the planner level
// ---------------------------------------------------------------------------

describe('planWorkflowExportFiles — Sub-Agent Flow entries', () => {
  it('names the file <parent>_<flow>, both segments sanitized', () => {
    // The `{parent}_{flow}` convention is what `agentFileName` documents
    // (`:118`) and it is stated nowhere else. `nodeNameToFileName` (`:26`)
    // lowercases, hyphenates spaces, and drops the rest.
    const parent = makeWorkflow([startNode('s'), endNode('e')], [connect('s', 'e')], {
      name: 'Parent Flow',
      subAgentFlows: [makeSubAgentFlow()],
    });

    const agentFile = planWorkflowExportFiles(parent).find((f) => f.kind === 'subAgentFlow');
    expect(agentFile?.relativePath).toBe('.claude/agents/parent-flow_input-validation.md');
    // `sourceName` keeps the display name, unsanitized — it is what the UI
    // reports back to the user.
    expect(agentFile?.sourceName).toBe('Input Validation');
  });

  it('takes model, tools, color and memory from the node that references the flow by id', () => {
    // The lookup is by `subAgentFlowId` (`:376-378`), not by position. With
    // two reference nodes present, matching on the wrong one would give this
    // flow's agent file the other flow's execution settings.
    const flow = makeSubAgentFlow();
    const parent = makeWorkflow(
      [
        startNode('s'),
        subAgentFlowNode('ref-other', { subAgentFlowId: 'flow-other', model: 'haiku' }),
        subAgentFlowNode('ref-mine', { subAgentFlowId: 'flow-1', model: 'opus', tools: 'Read' }),
        endNode('e'),
      ],
      [connect('s', 'e')],
      { name: 'Parent Flow', subAgentFlows: [flow] }
    );

    const agentFile = planWorkflowExportFiles(parent).find((f) => f.kind === 'subAgentFlow');
    expect(YAML.parse(frontmatterOf(agentFile?.contents ?? ''))).toMatchObject({
      model: 'opus',
      tools: 'Read',
    });
  });

  it('CURRENT BEHAVIOUR: an orphan flow definition still gets an agent file, with default settings', () => {
    // The planner iterates `workflow.subAgentFlows` (`:373`) and the
    // referencing-node lookup may find nothing, so a definition that no node
    // points at is still written — as a sonnet agent with no tools. This is
    // reachable: #1051 records that validation never reports an orphan
    // definition. Pinned as observed, not asserted as correct; whether the
    // file should be written at all is a product decision.
    const parent = makeWorkflow([startNode('s'), endNode('e')], [connect('s', 'e')], {
      name: 'Parent Flow',
      subAgentFlows: [makeSubAgentFlow()],
    });

    const agentFile = planWorkflowExportFiles(parent).find((f) => f.kind === 'subAgentFlow');
    expect(agentFile).toBeDefined();
    expect(YAML.parse(frontmatterOf(agentFile?.contents ?? ''))).toEqual({
      name: 'parent-flow_input-validation',
      description: 'Input Validation',
      model: 'sonnet',
    });
  });

  it('CURRENT BEHAVIOUR: two flow names that sanitize alike plan the same path twice', () => {
    // `nodeNameToFileName` drops everything outside `[a-z0-9-_]`, so
    // "Input Validation" and "Input: Validation" both become
    // `input-validation`. The planner emits two entries with an identical
    // `relativePath` (`:375,380`) and the second write wins on disk, silently
    // — the user loses one of two flows they can see side by side on the
    // canvas.
    //
    // The same collision was flagged for sub-agent names during the #1008
    // iteration and left unfiled; per #1057 it is pinned here as observed and
    // not filed as a separate bug.
    const parent = makeWorkflow([startNode('s'), endNode('e')], [connect('s', 'e')], {
      name: 'Parent Flow',
      subAgentFlows: [
        makeSubAgentFlow(),
        makeSubAgentFlow({ id: 'flow-2', name: 'Input: Validation' }),
      ],
    });

    const paths = planWorkflowExportFiles(parent)
      .filter((f) => f.kind === 'subAgentFlow')
      .map((f) => f.relativePath);

    expect(paths).toEqual([
      '.claude/agents/parent-flow_input-validation.md',
      '.claude/agents/parent-flow_input-validation.md',
    ]);
    // Stated explicitly so the intent is unmistakable: this asserts the
    // collision exists, not that colliding is acceptable.
    expect(new Set(paths).size).toBe(1);
  });

  it('plans no Sub-Agent Flow entries for a workflow that declares none', () => {
    const parent = makeWorkflow([startNode('s'), endNode('e')], [connect('s', 'e')], {
      name: 'Parent Flow',
    });

    expect(planWorkflowExportFiles(parent).filter((f) => f.kind === 'subAgentFlow')).toEqual([]);
    expect(planWorkflowExportFiles(parent).map((f) => f.kind)).toEqual(['slashCommand']);
  });
});
