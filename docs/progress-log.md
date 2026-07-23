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

## 2026-07-23 — Security interrupt: patch vulnerable transitive dependencies
- **User value**: a user no longer installs/bundles known-vulnerable code —
  the 3 high-severity advisories (`brace-expansion` DoS, `fast-uri` host
  confusion ×2) and 2 low ones (`body-parser` DoS, `dompurify` sanitize
  bypass — the latter shipping inside the extension/CLI webview bundle via
  mermaid) are gone from the lockfile.
- **Issue/PR**: #879 / PR from `claude/fix-vulnerable-transitive-deps`
- **Outcome**: done — interrupt round (security outranks invention; flagged
  by the previous iteration's push). Verified with `pnpm audit`: 7 advisories
  before, 1 after. Fix is lockfile-only in-range bumps via
  `pnpm update --recursive --depth Infinity brace-expansion fast-uri
  dompurify body-parser`. The remaining moderate advisory
  (`@hono/node-server` <2.0.5, Windows-only path traversal in serve-static)
  is NOT fixable in-range: latest `@modelcontextprotocol/sdk` 1.29.0 still
  declares `^1.19.9` and the patch exists only in 2.x — tracked in #879,
  do not burn iterations re-checking until the SDK moves. Changeset: patch
  for `cc-wf-studio` + `@cc-wf-studio/cli` (their built bundles embed
  dompurify via mermaid). Guard step also closed #877 (merged as #878).
- **Next proposals**:
  - `CommentaryOptionsDropdown` has no i18n at all (section labels, error
    strings, "Loading..." all hardcoded) — localize the whole component as
    its own scoped task.
  - Sample gallery could show each sample's `difficulty` badge (metadata
    already ships in `SampleWorkflowMeta`; `ccwf samples list` shows it).
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.

## 2026-07-22 — Localize the canvas start menu and sample gallery strings
- **User value**: a user running VSCode in Japanese, Korean, or Chinese now
  sees the first screen of the canvas — the empty-state start menu ("New",
  "Load", "Recent", "Sample Workflow") — and the sample gallery's remaining
  strings ("Loading...", "No samples available.", "Preview") in their display
  language, instead of hardcoded English mixed into an otherwise fully
  localized UI.
- **Issue/PR**: #877 / PR from `claude/sleepy-curie-x5ftgw`
- **Outcome**: done — `StartMenu.tsx` was the only first-run surface bypassing
  i18n entirely; new `startMenu.*` keys plus `sample.dialog.previewButton` /
  `sample.dialog.empty` added to `translation-keys.ts` and all 5 locale files
  (wording reused from the established `toolbar.load` / `toolbar.loading` /
  `dialog.diffPreview.previewOverview` translations); `WhatsNewDialog`'s
  hardcoded "Loading..." now reuses the existing generic `loading` key
  (`{t('loading')}...`, same pattern as `SlackShareDialog`). Product name
  "CC Workflow Studio" intentionally stays English per the translation rules.
  Also this round: verified #875 (empty-state "start from an example") against
  the code and closed it as premise-false — `StartMenu` + `SampleWorkflowDialog`
  already provide exactly that affordance.
- **Next proposals**:
  - **Interrupt candidate for next round**: at push time GitHub reported
    3 Dependabot vulnerabilities on the default branch (2 high, 1 low) —
    check https://github.com/breaking-brake/cc-wf-studio/security/dependabot
    and fix if actionable (security interrupts outrank invention).
  - `CommentaryOptionsDropdown` has no i18n at all (section labels, error
    strings, "Loading..." all hardcoded) — localize the whole component as
    its own scoped task.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - Sample gallery could show each sample's `difficulty` badge (metadata
    already ships in `SampleWorkflowMeta`; `ccwf samples list` shows it).

## 2026-07-22 — Name the offending node in workflow validation errors
- **User value**: a user running `ccwf validate` (and an AI agent getting
  `apply_workflow`/`update_workflow` errors back, and the extension's export
  dialog) now sees *which* node each validation error refers to by its canvas
  name — e.g. `Switch node "Check status" must have branches array` — instead
  of anonymous messages or opaque `node-…` ids buried in field paths.
- **Issue/PR**: #874 / PR from `claude/sleepy-curie-2g0zwe`
- **Outcome**: done — new core helper `getNodeDisplayName(node)`
  (`data.label` → `name` → `id`, safe on corrupted `data`), reused by
  `describeClaudeCodeOnlyNodes` (was an inline copy of the same logic);
  every node-scoped message in `validate-workflow.ts` (schema pass, Switch,
  Skill, MCP incl. mode-config, SubAgent, SubAgentFlow node, Group,
  name/type/position/parentId/data, self/Start/End/Group connection rules)
  now embeds the display name. Error codes and `field` paths unchanged, so
  `--json` consumers and code keyed on codes are unaffected. E2E-verified on
  the built CLI: broken workflow shows named errors with id fallback for an
  unlabeled group; bundled sample still validates clean. Also filed #875
  (canvas empty-state "start from an example") as the runner-up idea.
- **Next proposals**:
  - #875: canvas empty-state "start from an example" backed by the bundled
    samples.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - MCP `apply_workflow` could also return target-compatibility warnings
    (reuse `collectAgentCompatibilityWarnings`) so agents learn about
    Claude Code-only nodes at edit time, not at export time.

## 2026-07-22 — Duplicate a group node including its child nodes
- **User value**: a user who built a phase group containing several configured
  nodes can now duplicate the whole structure — group, child nodes, and the
  connections between them — with the Duplicate button or Ctrl/Cmd+D, instead
  of recreating it node by node (group duplication was explicitly excluded in
  #861/#869 as a deferred follow-up, filed as #871).
- **Issue/PR**: Closes #871 / PR from `claude/sleepy-curie-jfe161`
- **Outcome**: done — `duplicateNode` in `workflow-store.ts` now handles
  groups: collects direct children by `parentId` (groups never nest, per
  `onNodeDragStop`), deep-copies group + children through an id-remap table,
  re-links copied `parentId`s, copies only edges whose source AND target are
  both inside the group (boundary-crossing edges are dropped — same policy as
  single-node duplication, which copies no edges), offsets the group copy
  +40/+40 while children keep group-relative positions, selects the new group,
  and commits everything in one `set()` → one undo entry. `GroupNode` now
  renders `DuplicateButton`, and the Ctrl/Cmd+D branch in `WorkflowEditor.tsx`
  lifts the group exclusion.
- **Next proposals**:
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - `ccwf samples` could back a canvas empty-state "start from an example"
    action in `ccwf canvas` / preview.
  - `ccwf validate`: design a `getNodeDisplayName(node)` core helper so error
    messages can show a human label alongside opaque node ids.

## 2026-07-22 — `ccwf samples` — discover and scaffold bundled example workflows
- **User value**: a user who installs `@cc-wf-studio/cli` from npm can now run
  `ccwf samples list` to see the bundled example workflows (id, difficulty,
  node count, tags, locales) and `ccwf samples copy <id> [--locale] [--output]`
  to scaffold one locally for `preview`/`run` — previously the CLI shipped
  zero examples (the samples only existed inside the VSCode extension), which
  is exactly the gap open question #448 asks about.
- **Issue/PR**: #870 / PR from `claude/sleepy-curie-wjt035`
- **Outcome**: done — new `sync:samples` build step copies
  `packages/vscode/resources/samples/` into the CLI's `dist/samples/`
  (same precedent as `sync:webview`/`sync:skills`, shipped automatically via
  `files: ["dist"]`); new `samples` command groups locale variants
  (`<id>.<locale>.json`) under one id, defaults to `en`, refuses to overwrite
  an existing destination without `--overwrite`, and prints next-step hints.
  README + ccwf-cli SKILL.md updated. Also filed #871 (group duplication with
  children, the #861 follow-up) as the runner-up idea. Rejected this round:
  file-mode sub-agent auto-creation (contradicts the deliberate "apply never
  writes files" safety design — canvas mode also returns `[]`) and arrow-key
  node nudge (React Flow v11's built-in keyboard a11y likely already covers
  it; needs live-webview verification first).
- **Next proposals**:
  - #871: duplicate a group node including its children.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - `ccwf samples` could back a canvas empty-state "start from an example"
    action in `ccwf canvas` / preview.

## 2026-07-22 — Ctrl/Cmd+D keyboard shortcut to duplicate the selected node
- **User value**: a user who prefers the keyboard can now clone the selected
  canvas node with Ctrl+D (Cmd+D on macOS) — same exclusions (Start/End/Group),
  same single-undo-entry behavior as the Duplicate button from #863 — instead
  of reaching for the mouse; the Duplicate button's tooltip now advertises the
  shortcut.
- **Issue/PR**: #865 / PR from `claude/duplicate-node-shortcut`
- **Outcome**: done — extended the existing global keydown handler in
  `WorkflowEditor.tsx` (the one owning Ctrl/Cmd+Z/Y undo/redo, sharing its
  input/textarea/contenteditable guard) with a Ctrl/Cmd+D branch that calls
  the `duplicateNode` store action when exactly one duplicatable node is
  selected (`selectedNodeId` is non-null only for single selection) and
  prevents the browser/webview default for the chord only when it acts.
  Tooltip hint follows the `UndoRedoControls` isMac pattern.
- **Next proposals**:
  - Group duplication including children (deferred follow-up of #861).
  - File mode returns `plannedFiles: []` silently — sub-agent auto-creation
    in `FileWorkflowAdapter` for canvas/file parity.
  - Arrow-key nudge of the selected node (move by grid step, Shift for
    larger steps) to complete keyboard-first canvas editing.

## 2026-07-22 — Accept `{meta, workflow}` wrapper files in `ccwf`
- **User value**: a user who points `ccwf render/export/run/preview/validate`
  at one of the bundled sample workflows (all of `resources/samples/*.json`
  ship as `{meta, workflow}` wrappers) no longer gets a raw
  `TypeError: Cannot read properties of undefined (reading 'filter')` — the
  CLI unwraps the wrapper automatically, and any other non-workflow JSON
  fails with a clear `error: ... does not look like a workflow file` (exit 2)
  instead of a stack trace.
- **Issue/PR**: #867 / PR from `claude/sleepy-curie-pc87jz`
- **Outcome**: done — `loadWorkflowFromFile` now shape-checks the parsed JSON
  (`nodes` array = workflow; `{ workflow: {...nodes...} }` = wrapper,
  unwrapped; anything else = `WorkflowLoadError`). All seven `<file>`
  commands share the loader, so one change covers them all; `ccwf validate`
  on a wrapper now validates the inner workflow instead of reporting
  misleading `MISSING_FIELD` errors. E2E-verified on the built CLI: wrapper
  sample renders + validates, bare workflow unchanged, `{"foo":1}` and
  `[1,2,3]` produce the clear error.
- **Next proposals**:
  - #865: Ctrl/Cmd+D keyboard shortcut for the node Duplicate action.
  - Group duplication including children (deferred follow-up of #861).
  - File mode returns `plannedFiles: []` silently — sub-agent auto-creation
    in `FileWorkflowAdapter` for canvas/file parity.

## 2026-07-22 — Idempotent `ccwf export` / `ccwf run` re-runs
- **User value**: a user re-running `ccwf export` / `ccwf run` on an unchanged
  workflow no longer gets a false `error: N file(s) already exist. Pass
  --overwrite` — files whose on-disk content is byte-identical to the plan are
  reported as up to date and skipped (exit 0); only files with *different*
  content are conflicts that still require `--overwrite`.
- **Issue/PR**: #864 / PR from `claude/sleepy-curie-5fdbib`
- **Outcome**: done — `runExport` compares existing files' content against the
  planned contents (read failures count as conflicts, never crashes), returns
  a new `unchangedPaths` alongside `writtenPaths`, and a shared
  `reportExportOutcome` keeps `export`/`run` stdout in sync ("N file(s)
  already up to date" / "All N file(s) already up to date"). `--overwrite`
  unchanged. E2E-verified: fresh export, no-op re-run (both commands),
  drifted-file conflict (exit 1, message now says "with different content"),
  `--overwrite` rewrite, and a mixed 3-written/1-up-to-date cursor export.
  Also filed #865 (Ctrl/Cmd+D duplicate shortcut) as the runner-up idea.
- **Next proposals**:
  - `ccwf` crashes with a raw `TypeError ... reading 'filter'` when given a
    `{meta, workflow}` wrapper file (the shape of `resources/samples/*.json`)
    — `load-workflow.ts` should unwrap or reject it with a clear message.
  - #865: Ctrl/Cmd+D keyboard shortcut for the node Duplicate action.
  - Group duplication including children (deferred follow-up of #861).

## 2026-07-22 — Duplicate button for configured canvas nodes
- **User value**: a user who has carefully configured a node (Sub-Agent with
  model/tools, a long Prompt, an MCP node, ...) can now clone it with one
  click — a Duplicate button next to the delete button creates a copy with a
  fresh id, +40/+40 offset, same parent group, and all data fields intact —
  instead of recreating every field by hand.
- **Issue/PR**: #861 / PR from `claude/sleepy-curie-emspxx`
- **Outcome**: done — new `duplicateNode` store action (deep-copies `data`,
  keeps the palette's `<prefix>-<timestamp>` id convention, moves React Flow's
  visual selection to the copy, sets `lastAddedNodeId` so the canvas
  auto-centers on it; single `set` = single undo entry) plus a
  `DuplicateButton` component rendered in the 11 duplicatable node components.
  Start/End/Group excluded (group-with-children duplication left as a
  follow-up per the issue). Edges are not copied.
- **Next proposals**:
  - Group duplication including children (the follow-up #861 explicitly
    deferred).
  - File mode returns `plannedFiles: []` silently — implement sub-agent
    auto-creation in `FileWorkflowAdapter` for canvas/file parity.
  - Keyboard shortcut (Ctrl/Cmd+D) for duplicating the selected node, wired
    to the same store action.

## 2026-07-22 — Mode-aware MCP tool text for file mode
- **User value**: an AI agent editing a workflow through `ccwf mcp --file` or
  the `ccwf-mcp` stdio bin is no longer told to "open a workflow in CC
  Workflow Studio first" or promised a review-dialog diff preview and
  auto-created sub-agent `.md` files that don't exist in file mode — tool
  descriptions and errors now describe the workflow file, sha256-revision
  conflict detection, and the "set commandFilePath yourself" rule, so agents
  stop giving users wrong advice.
- **Issue/PR**: #860 / PR from `claude/sleepy-curie-ralz5b`
- **Outcome**: done — `registerWorkflowTools`/`createWorkflowMcpServer` gained
  a `mode: 'canvas' | 'file'` option (default `'canvas'`); a per-mode text
  table in `tools.ts` keeps the canvas strings byte-for-byte identical
  (verified against the built dist) while both file-mode entry points
  (`ccwf mcp`, `ccwf-mcp`) pass `mode: 'file'`. E2E-verified over stdio:
  tools/list shows file-oriented descriptions and a missing file now says
  "Use apply_workflow to create it". Also filed #861 (duplicate-node canvas
  action) as the runner-up idea. Locking #860/#861 remains impossible in
  this session (no `gh` CLI, no MCP lock tool) — noted in the issue bodies.
- **Next proposals**:
  - #861: Duplicate button for configured canvas nodes (store action +
    button next to DeleteButton; skip start/end/group initially).
  - File mode returns `plannedFiles: []` silently — consider implementing
    sub-agent auto-creation in `FileWorkflowAdapter` so file-mode parity
    with the canvas grows instead of being documented away.
  - Give the loop a supported way to lock its idea issues (e.g. `gh` in the
    session image or an MCP lock tool).

## 2026-07-22 — Name the affected nodes in Claude Code-only warnings
- **User value**: a user exporting, running, or preflighting a workflow for a
  non-Claude agent now sees exactly which nodes that agent cannot execute —
  `"Branch Session Work" (branchSession)` — instead of the vague
  `(e.g. branchSession)` hint, in `ccwf export/run/validate --agent` and the
  VSCode export-warning notification alike.
- **Issue/PR**: #857 / PR from `claude/sleepy-curie-6j9vke`
- **Outcome**: done — new core helper `describeClaudeCodeOnlyNodes` (prefers
  the node's canvas `data.label`, then `name`, then id) replaces the
  hard-coded phrasing in both the CLI's `collectAgentCompatibilityWarnings`
  and the extension's `collectTargetCompatibilityWarnings`, so the two
  surfaces cannot drift. E2E-verified: codex/gemini warn with the node
  label, claude-code stays silent, `validate --json` carries the richer
  string. Also judged-and-dropped this round: the thrice-proposed JSON
  line/col translator for `load-workflow.ts` — Node 22+ already appends
  `(line N column M)` to `JSON.parse` errors, so the value is marginal on
  supported runtimes. Note: the loop could not lock issue #857 (no `gh`
  CLI, no MCP lock tool, direct GitHub API blocked by the session proxy) —
  flagged in the issue body instead.
- **Next proposals**:
  - MCP tool descriptions/error text (`packages/mcp/src/tools.ts`) hard-code
    VSCode-canvas language ("open the workflow in CC Workflow Studio",
    "review mode" diff preview) even when served by `FileWorkflowAdapter`
    (`ccwf mcp --file`) — misleads AI agents driving the CLI MCP server.
  - Canvas: no way to duplicate a configured node (subAgent/prompt) —
    cloning one means recreating every field by hand.
  - Give the loop a supported way to lock its idea issues (e.g. an MCP lock
    tool or `gh` in the session image) — currently the lock step of
    `next-task` cannot be honored.

## 2026-07-22 — Target-compatibility warnings in the VSCode export/run flows
- **User value**: exporting or running a workflow for Codex / Copilot /
  Gemini / Cursor / Zoo Code / Antigravity from the canvas now shows a
  warning notification naming how many configured settings that agent
  ignores, with a "Show Details" button listing every dropped field —
  instead of the extension silently writing a lossy export.
- **Issue/PR**: #852 / PR from `claude/sleepy-curie-rd0zcn`
- **Outcome**: done — new `export-warning-service.ts` mirrors the CLI's
  compatibility report (Claude Code-only nodes + `collectIgnoredFieldWarnings`)
  and is called from all 14 non-Claude export/run handler paths. UX decision:
  non-modal notification + output channel (matches the CLI's warn-but-proceed
  behavior); no i18n needed since extension-side notifications are uniformly
  English (the webview i18n rules don't apply to `vscode.window` messages).
- **Next proposals**:
  - `load-workflow.ts` still surfaces raw `JSON.parse` errors (byte offset,
    no line/col) for every CLI command — a shared line/col translator would
    fix all commands at once.
  - The CLI's "Claude Code-only node" warning is aggregate-only; naming the
    affected node ids would tell users what exactly breaks on export.

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
