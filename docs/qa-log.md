# QA Log

Append-only memory of the quality-assurance loop (`next-qa`). One entry per
iteration, newest first. Kept separate from `docs/progress-log.md` on
purpose: the QA and feature tracks are promoted to `main` independently, so
sharing a log file would make every promotion conflict.

Entry format:

```markdown
## YYYY-MM-DD — <short task title>
- **Protects**: <one sentence — "if this breaks, a user would hit X">
- **Issue/PR**: #NN / #MM
- **Outcome**: done | abandoned (<why>) | blocked (<on what>)
- **Bugs filed**: <#NN, or none — issues opened for failures this test found>
```

---

## 2026-07-25 — S2: the core generators (Mermaid, Markdown, agent skills)
- **Protects**: if this breaks, every export surface — `ccwf render`, the MCP
  `render_workflow` tool, the canvas "Copy as Markdown", and all six
  non-Claude skill targets — silently emits a diagram or instruction document
  that is wrong or unparseable, and the user only finds out wherever the agent
  later runs.
- **Issue/PR**: #995 / PR from `claude/qa-core-generators`
- **Outcome**: done — three suites in `packages/core/src/services/`, plus
  shared fixtures in `__fixtures__/workflows.ts`:
  - `workflow-prompt-generator.test.ts` (items 1 + 2, the AI-facing half):
    id sanitization against Mermaid reserved words and the end-to-end
    invariant that node definitions and edges sanitize identically; label
    escaping for every character that closes a shape; **node shapes asserted
    against the vocabulary the execution instructions use** ("Rectangle nodes
    (Sub-Agent: ...)", "Diamond nodes (AskUserQuestion:...)", …) — a contract
    between two artifacts this module generates, so a shape change without a
    prose change is caught; branch/option edge labelling including the
    deliberately-unlabelled AI-suggestion and multi-select cases; group
    subgraphs with no duplicate definitions; prompt-body verbatim
    preservation; Codex shell-command quote escaping; group-table pipe
    escaping; built-in `subagent_type` and CC-only model omission per
    provider; determinism.
  - `workflow-overview-formatter.test.ts` (item 2, the human-facing half):
    topological order at a merge point, cycle tolerance (each node exactly
    once), unreachable nodes still rendered, groups flattened, the
    `## <sanitizedId>(<title>)` heading the scroll-sync keys off, 4-backtick
    fencing so a prompt containing a code block survives, inline escaping, and
    branch-ordered next-step links.
  - `agent-skill-export.test.ts` (item 4): all six providers produce a
    structurally sound SKILL.md from one generator; Cursor is the only
    provider that mirrors Sub-Agent files; planned paths are relative,
    forward-slashed and contain no `..`; and **both directions of agreement
    with the README's "Supported Agents" table** — every provider is
    documented, every SKILL.md lands under a documented directory, and every
    documented directory actually receives a file.
  - Verified the suites bite by hand-mutating six things: the sub-agent node
    shape, the prompt label's `escapeLabel` call, Cursor's `agentsDir`, the
    Codex `skillsDir` (README divergence), the overview's 4-backtick fence,
    and the topological sort. Each made a named assertion fail. The
    merge-point fixture was restrung after mutation 6 showed declaration
    order satisfied it by accident.
- **Bugs filed**: **#1009** — `generateAgentSkillContent` interpolates the
  workflow description into the SKILL.md frontmatter unescaped, while
  `generateSlashCommandFile` in the same package routes the identical value
  through `escapeYamlString`. A description containing `:` (or a newline)
  therefore produces invalid YAML for all six non-Claude targets and the skill
  silently never loads. Test landed **skipped** naming the issue; the fix is
  the feature loop's, since it touches `packages/core/src`.
- **Residual scope on #995**: item 3 (Claude Code export artifacts checked
  against `packages/vscode/specs/001-cc-wf-studio/spec.md`) is **not** in this
  PR — the issue itself gates it on a human first updating that spec, which is
  still stale (it lists sub-agent models as `sonnet`/`opus`/`haiku` while
  `CC_ONLY_MODELS` now carries `haiku`/`fable`). Items 1, 2 and 4 all landed
  here. #995 stays open for item 3.

## 2026-07-25 — S1: validator behavior and authoring-guide ↔ zod consistency
- **Protects**: if this breaks, an AI agent follows
  `resources/workflow-schema.json`, authors a workflow the validator then
  rejects, and gets an error that does not say which node is at fault — so
  the agent cannot repair it and the user's edit never lands.
- **Issue/PR**: #994 / PR from `claude/qa-validator-and-schema-consistency`
- **Outcome**: done — two suites in `packages/core`:
  - `src/schema/authoring-guide-consistency.test.ts` relates the two
    independently maintained representations of a node's properties (the
    hand-written AI-authoring guide and the zod schemas). Asserts the
    guide → zod direction: node-type coverage in both directions against a
    documented exception list (`start`/`end` have no zod schema; `branch` is
    legacy and deliberately not offered to AI), field coverage against a
    hand-validated allowlist (`outputPorts` everywhere, SubAgent
    `commandFilePath`/`commandScope`), **every enum value and default the
    guide advertises is accepted by the zod field**, and every example
    workflow embedded in the guide passes `validateAIGeneratedWorkflow`.
  - `src/utils/validate-workflow.test.ts` covers the validator's behavior
    rather than the schema's content: errors name the offending node and
    field, one error per offending node, absent fields are skipped (old
    files keep loading), `visibleWhen`-inactive fields are skipped, corrupt
    input (null / array / string node data, non-object workflow) becomes a
    structured error instead of a TypeError, and the `maxNodes` boundary.
  - Verified the suites bite by hand-mutating four things: adding an
    undocumented node type to the guide, adding a `model` enum value zod
    rejects, dropping the node id from the schema-violation `field`, and
    disabling the `visibleWhen` skip. Each made a named assertion fail.
- **Bugs filed**: none — the guide and the zod schemas agree today, and all
  three embedded examples validate.
- **Residual scope on #994**: items 3 (generator coverage against the
  schema) and 4 (regression pinning) are not in this PR. Item 3 needs the
  generators and belongs with #995 (S2); item 4 is reactive and there is no
  defect to pin yet. The issue's own "Done when" clause covers only items
  1 and 2, both of which landed here.

## 2026-07-25 — S0: vitest foundation and the CI test gate
- **Protects**: nothing on its own — it is the gate every other suite needs.
  Until this landed, CI proved only that the code compiled, so a behavioral
  regression could merge unopposed on `auto-dev` and `auto-qa`.
- **Issue/PR**: #993 / PR from `claude/qa-vitest-foundation`
- **Outcome**: done — `vitest.config.ts` + the `vitest` devDependency added to
  `core`, `cli`, and `mcp`; every `test` script (including the webview's) set
  to `vitest run --passWithNoTests` so an empty suite doesn't fail the run;
  `pnpm test` added to `ci.yml` after `pnpm check`.
  Also wired the **pre-existing MCP smoke test** into CI — it was a real
  behavioral check that no workflow ever executed, so connecting it was the
  cheapest assurance available.
  Verified the gate actually bites: breaking an assertion by hand makes the
  run exit 1.
- **Bugs filed**: none
- **Note for the next iteration**: the first test
  (`packages/core/src/services/workflow-export.test.ts`, covering
  `nodeNameToFileName`) exists to prove the wiring, not to cover S2. It is
  deliberately checked against the naming rule written in
  `packages/vscode/specs/001-cc-wf-studio/spec.md`, not against the
  implementation — per `docs/quality/03-assurance-map.md`, a test read off
  the code it tests is a transcription, not a check.

## 2026-07-25 — Bootstrap the quality-assurance track
- **Protects**: nothing yet — this is the machinery that will.
- **Issue/PR**: (this bootstrap PR)
- **Outcome**: done — `auto-qa` integration branch, `next-qa` skill,
  CI trigger for `auto-qa`, testing-policy change in `CLAUDE.md` and
  `IMPLEMENTATION_PLAN.md`, and a seeded `qa` backlog.
- **Bugs filed**: none
