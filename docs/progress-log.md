# Progress Log

Append-only memory of the autonomous value-creation loop. The `next-task`
skill appends one entry per iteration (newest first) and reads recent
entries to avoid repeating finished or abandoned work. Humans may annotate
entries but should not rewrite history.

Entry format:

```markdown
## YYYY-MM-DD — <short task title>
- **User value**: <one sentence — "a user can now X" / "no longer suffers Y">
- **Issue/PR**: #NN / #MM
- **Outcome**: done | abandoned (<why>) | blocked (<on what>)
- **Next proposals**: <0–3 bullets for the following iteration>
```

---

## 2026-07-22 — `ccwf validate --agent <target>` preflight compatibility check
- **User value**: a user can now answer "will this workflow survive export to
  codex/gemini/... intact?" before writing any files — `ccwf validate
  --agent <name>` reports Claude Code-only nodes and every configured field
  that target ignores; with `--json` the report lands in a `warnings` array.
- **Issue/PR**: #853 / PR from `claude/sleepy-curie-3vbc9v`
- **Outcome**: done — extracted the warning block `runExport` printed
  (Claude Code-only check + `collectIgnoredFieldWarnings`) into a shared
  `collectAgentCompatibilityWarnings` in `export.ts`, so `export`/`run`
  and `validate --agent` can never drift; warnings never affect
  `validate`'s exit code (a `--strict` promotion stays an open question on
  #853). Compatibility is only checked when the workflow is schema-valid.
- **Next proposals**:
  - #852 (surface ignored-field warnings in the VSCode export flow) is still
    open — needs a UX decision (notification vs. dialog) + i18n.
  - `load-workflow.ts` surfaces raw `JSON.parse` errors (byte offset, no
    line/col) for every command — a shared line/col translator would fix all
    commands at once.
  - GitHub reports Dependabot alerts on the default branch (2 high, 1 low at
    push time); this loop has no alert-read access (no `gh`, no MCP tool) —
    needs a human to review the Dependabot tab.

## 2026-07-22 — Ignored-field warnings in `ccwf export` / `ccwf run`
- **User value**: exporting a workflow to a non-Claude agent now warns exactly
  which configured node fields (e.g. Sub-Agent model/tools/memory) the target
  ignores, instead of silently dropping them.
- **Issue/PR**: #803 (schema layer, previously unwired) / PR from
  `claude/blissful-lamport-8ijgoh`
- **Outcome**: done — wired `collectIgnoredFieldWarnings` (built in #803 but
  never called by any exporter) into the CLI's shared `runExport`, so both
  `ccwf export` and `ccwf run` emit per-field `warning:` lines on stderr
  before writing files; verified E2E for codex/gemini (warns) and
  claude-code (silent).
- **Next proposals**:
  - Surface the same ignored-field warnings in the VSCode extension's export
    flow (filed as an `idea` issue) — the sub-agent panel comment already
    promises "reported as ignored by other targets at export time".
  - `ccwf validate --agent <target>` preflight target-compatibility check
    (filed as an `idea` issue).

## 2026-07-22 — `ccwf run --launch` supports codex/copilot/gemini, not just claude-code
- **User value**: a user running `ccwf run <file> --agent codex --launch` (or
  `copilot` / `gemini`) now gets that agent's CLI launched interactively,
  instead of a warning saying `--launch` only works with claude-code.
- **Issue/PR**: (opened this iteration)
- **Outcome**: done — extracted the agent bin/label map `ccwf tour` already
  had (`LAUNCHERS`) into a shared `packages/cli/src/utils/agent-launchers.ts`
  (`LAUNCHABLE_AGENTS`), and had `run.ts`'s `--launch` path use it instead of
  a hardcoded `agent !== 'claude-code'` bail-out. `tour.ts` now composes the
  shared map with its own prompt-args builder, so the two commands can't
  drift apart on which agents are launchable again.
- **Next proposals**:
  - CLI commands (`validate`, `render`, `export`, `canvas`, `preview`, `tour`)
    surface raw `JSON.parse` errors (byte offset, not line/col) on malformed
    workflow JSON via `load-workflow.ts` — a shared line/col translator there
    would fix this for every command at once.
  - `ccwf export`'s "Claude Code-only node" warning is a single aggregate
    line; it never names which node ids are affected, so a user targeting
    `--agent cursor` can't tell what will silently break without opening the
    JSON.
  - Canvas: no way to duplicate a configured node (subAgent/prompt) — cloning
    one currently means manually recreating every field by hand.

## 2026-07-22 — Validate `ccwf tour` output before declaring success
- **User value**: a user running `ccwf tour` no longer gets a false "success"
  when the launched AI agent writes a malformed `tour` field or references
  node ids that don't exist — the command now re-validates the file and
  reports the failure immediately instead of leaving it to surface later as
  a confusing `ccwf preview` break.
- **Issue/PR**: (opened this iteration)
- **Outcome**: done — `verifyTour()` re-loads the file after the launched
  agent exits 0, runs `validateAIGeneratedWorkflow`, checks the `tour` field
  is present and non-empty, and checks every `tour[].nodeIds` entry resolves
  to a real node id, printing a clear pass/fail with a nonzero exit on
  failure.
- **Next proposals**:
  - MCP tool descriptions/error text (`packages/mcp/src/tools.ts`) hard-code
    VSCode-canvas language ("open the workflow in CC Workflow Studio",
    "review mode" diff preview) even when served by `FileWorkflowAdapter`
    (`ccwf mcp --file`), which has no review/diff concept — misleads
    AI agents driving the CLI MCP server.
  - `ccwf export`/`ccwf run` treat any pre-existing output file as a hard
    conflict requiring `--overwrite`, even when its content is already
    byte-identical to what would be written — false-positive conflicts on
    every no-op re-run.

## 2026-07-22 — Sub-Agent Flow property panel surfaces broken links
- **User value**: a user who opens the property panel for a Sub-Agent Flow
  reference node whose linked flow no longer exists (e.g. after opening an
  externally edited or hand-crafted workflow file — `validateWorkflowFile`
  does not check `subAgentFlowId` references, only `validateAIGeneratedWorkflow`
  does) now sees a "Sub-Agent Flow not found" message in the panel instead of
  a header that silently renders nothing (no description, no edit button, no
  explanation) while the rest of the panel's fields still edit normally.
- **Issue/PR**: (opened this iteration)
- **Outcome**: done — `sub-agent-flow-panel.tsx`'s `SubAgentFlowHeader` now
  renders the existing `node.subAgentFlow.subAgentFlowNotFound` i18n string
  (already used by the canvas node's own warning badge, so no new
  translations needed) when `subAgentFlowId` is set but unresolved.
- **Next proposals**:
  - `apply_workflow`'s MCP tool description says SubAgent `.md` files are
    "auto-created" during apply; both adapters return `[]` at apply time and
    actually materialise the file later at export/run. The claim is
    functionally accurate but the timing is unclear from the description —
    low priority, reconsider only if an agent is observed acting on the
    apply-time assumption.
  - `ccwf validate`: several error messages embed `node.id` (e.g.
    `Node "${node.id}" ...`) but node ids are often opaque
    (`group-<timestamp>` etc.) with no shared "display name" accessor across
    node types in core — before adding a label, first design a
    `getNodeDisplayName(node)` helper (data shape differs per node type:
    `label` for Group, `name` for Skill, etc.).
  - Walk the canvas → export → share flow as a user and propose the top
    friction fix (still not done despite being proposed 3 times).

## 2026-07-22 — Friendly error when `ccwf canvas`/`ccwf preview` port is taken
- **User value**: a user who runs `ccwf canvas --port <n>` or `ccwf preview
  --port <n>` against a port already in use now gets "port <n> is already in
  use ... Try a different --port, or omit --port to bind an ephemeral one"
  instead of a raw Node `EADDRINUSE` stack-shaped message with no next step.
- **Issue/PR**: (opened this iteration)
- **Outcome**: done — new `packages/cli/src/utils/server-start-error.ts`
  (`formatServerStartError`) used by both commands' catch blocks; verified
  manually by occupying a port and running each command against it, and that
  the pre-existing invalid `--port` (`NaN`) message is unchanged.
- **Next proposals**:
  - `apply_workflow`'s MCP tool description claims SubAgent `.md` files are
    "auto-created" during apply, but both adapters
    (`packages/mcp/src/file-adapter.ts:128`,
    `packages/vscode/.../mcp-server-service.ts:438`) always return `[]` by
    design — clarify the tool description so AI agents don't expect
    `autoCreatedFiles` in the apply response.
  - `ccwf validate`: include the node label alongside the node id in error
    output so users can find the offending node on the canvas faster
    (verify what `ValidationError` carries first).
  - Note: closed stale GitHub issues #816 and #826 this iteration — both were
    already fixed on `auto-dev` in prior iterations, but merging into
    `auto-dev` (not `main`) means `Closes #NN` never auto-closed them. Worth
    remembering this loop's PRs should double-check issue state manually
    rather than trusting auto-close until `auto-dev` is promoted.

## 2026-07-22 — Add `-o/--output` to `ccwf render`
- **User value**: a user running `ccwf render` can now write the Mermaid/Markdown
  output directly to a file (`-o <path>`) instead of manually redirecting stdout,
  matching the file-write pattern `ccwf export` already uses.
- **Issue/PR**: (opened this iteration)
- **Outcome**: done
- **Next proposals**:
  - `ccwf canvas --port`/`ccwf preview --port` surface a raw `EADDRINUSE` Node
    error with no hint to try a different port or omit `--port` for an
    ephemeral one (`packages/cli/src/commands/canvas.ts`, `preview.ts`).
  - `apply_workflow`'s MCP tool description claims SubAgent `.md` files are
    "auto-created" during apply, but both adapters
    (`packages/mcp/src/file-adapter.ts:128`,
    `packages/vscode/.../mcp-server-service.ts:438`) always return `[]` —
    creation actually happens later at export/run time. Worth clarifying the
    tool description so AI agents don't expect `autoCreatedFiles` in the
    apply response.
  - `sub-agent-flow-panel.tsx` renders an empty panel with no indicator when
    a SubAgentFlow node's `linkedSubAgentFlow` can't be found (e.g. the
    referenced flow was deleted) — no broken-link feedback for the user.

## 2026-07-22 — SubAgent edit no longer desyncs node from agent file on failed write
- **User value**: a user editing a command-linked SubAgent whose agent-file
  write fails no longer gets a canvas node silently out of sync with the
  file — the edit dialog stays open with a visible error, and the node only
  updates once the write succeeds.
- **Issue/PR**: Closes #826
- **Outcome**: done — `sub-agent-panel.tsx` now awaits `createSubAgent`
  before `updateNodeData`; `SubAgentFormDialog` awaits `onSubmit`, shows a
  submit error (new `subAgent.form.error.saveFailed` i18n key, all 5
  locales), and guards against double-submit. The creation path gets the
  same error feedback through the shared dialog.
- **Next proposals**:
  - Walk the canvas → export → share flow as a user and propose the top
    friction fix.
  - `ccwf validate`: include the node label alongside the node id in error
    output so users can find the offending node on the canvas faster
    (verify what `ValidationError` carries first).

## 2026-07-21 — Fix SubAgent creation from existing agent discarding form edits
- **User value**: a user editing Color/Model/Tools/Memory in the SubAgent
  form before adding an existing agent to the canvas no longer has those
  edits silently discarded — the created node now matches what they typed.
- **Issue/PR**: Closes #816
- **Outcome**: done — `handleSelectCommand` in `NodePalette.tsx` now builds
  node data from the submitted `formData` (model/tools/memory/color)
  instead of re-parsing the agent file's frontmatter, matching the
  "+ Create New" and node-edit paths.
- **Next proposals**:
  - #826: SubAgent edit dialog commits node state before the agent file
    write succeeds (fix ordering so failed writes don't desync the node).
  - Walk the canvas → export → share flow as a user and propose the top
    friction fix.

## 2026-07-21 — Bootstrap the value-creation loop
- **User value**: none directly — this is the machine that will produce it.
- **Issue/PR**: (this setup PR)
- **Outcome**: done — next-task skill (invention-centric), auto-dev two-stage
  flow, CI gate, unattended-failure detection, 30-min scheduled routines.
- **Next proposals**:
  - First real iteration: walk the canvas → export → share flow as a user
    and propose the top friction fix.
