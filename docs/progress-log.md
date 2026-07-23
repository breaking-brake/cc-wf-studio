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

## 2026-07-23 — `ccwf export --json` for machine-readable export results
- **User value**: a user can now script `ccwf export` in CI or wrapper
  tooling by parsing stable JSON — which files were written / already up to
  date / in conflict, the slash-command name, and target-compatibility
  warnings — instead of scraping human-formatted text; parity with
  `ccwf validate --json`.
- **Issue/PR**: #917 / PR from `claude/sleepy-curie-8gdi3g`
- **Outcome**: done — `--json` works in both modes: a real run prints
  `{ok: true, root, agent, written, upToDate, slashName, warnings}` (exit 0)
  or `{ok: false, …, conflicts, warnings}` (exit 1) on conflict without
  `--overwrite`; `--dry-run --json` prints `{ok, dryRun: true, root, agent,
  files: [{path, status}], warnings}` where `status` is the raw
  new/up-to-date/conflict classification and `ok` mirrors the exit code
  (honouring `--overwrite`). Paths are root-relative. In JSON mode warnings
  move into the payload instead of stderr (validate's convention); human
  mode is byte-identical, including `ccwf run` — internally the conflict
  `process.exit` in `runExport` became a typed `ExportConflictError` that
  export (human/JSON) and run render via a shared `reportExportConflict`.
  Load errors keep their stderr + exit-code contract in `--json` mode.
  Docs: cli README (subcommand table + export section) and ccwf-cli
  SKILL.md. E2E: 14 cases against the built CLI (fresh/idempotent JSON
  runs, conflict JSON exit 1 with clean stderr, human conflict text
  unchanged, dry-run JSON with/without `--overwrite`, warnings in payload
  with 0 stderr bytes + parity diff against human warning lines, codex
  real-run JSON, `--overwrite` repair, missing-file exit 2, human
  export/run success output unchanged). Issue #917 could not be locked
  (no `gh`, no MCP lock tool — known limitation, noted in the issue).
- **Next proposals**:
  - `ccwf export --agent all` (or repeatable `--agent`) to materialise a
    workflow for several agents in one run — per-agent conflict/summary
    design needed; JSON shape now has a natural per-agent extension.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.

## 2026-07-23 — `ccwf export --dry-run` previews the plan without writing
- **User value**: a user can now see exactly which files `ccwf export` would
  create or overwrite — and whether the export would fail on conflicts —
  before anything touches disk, instead of discovering conflicts by running
  the export and hitting the error.
- **Issue/PR**: #915 / PR from `claude/sleepy-curie-lq5l6o`
- **Outcome**: done — `--dry-run` lists every planned file in plan order with
  its status: `new`, `up to date`, or `conflict: exists with different
  content` (`would overwrite` when combined with `--overwrite`). Exit code
  mirrors a real run: 0 = export would succeed, 1 = it would stop on
  conflicts (stderr `error: export would fail: …`); load errors keep their
  usual exit codes. Target-compatibility warnings still print to stderr.
  Internally the real run's conflict check and the preview share one
  `classifyPlan` helper so they can never disagree; `ccwf run` is untouched.
  Docs: cli README (subcommand table + export section) and ccwf-cli
  SKILL.md. E2E: 9 cases against the built CLI (fresh-dir all-new with
  zero files written, idempotent up-to-date, conflict exit 1 with disk
  untouched, `--overwrite` preview exit 0, codex agent path + warnings
  parity, bad agent name, missing file exit 2, real export still repairs
  with `--overwrite`, 7-file cursor plan mixing new/conflict/up-to-date in
  one listing). Also verified this round: canvas arrow-key node movement
  already ships via React Flow v11 keyboard a11y (no `disableKeyboardA11y`
  anywhere) — the carried nudge proposal is dropped as already-present.
  Issue #915 could not be locked (no `gh`, no MCP lock tool — known
  limitation, noted in the issue).
- **Next proposals**:
  - `ccwf export --agent all` (or repeatable `--agent`) to materialise a
    workflow for several agents in one run — needs a per-agent
    conflict/summary design now that dry-run exists.
  - `--json` on `ccwf export` (incl. `--dry-run`) for scripting parity with
    `ccwf validate --json`.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.

## 2026-07-23 — MCP `validate_workflow` preflights several agents at once
- **User value**: an AI agent editing a workflow via the MCP server can now
  preflight target compatibility for every export target in a single
  `validate_workflow` call — `agent: "all"` or `agent: ["codex", "gemini"]` —
  matching `ccwf validate --agent all`, instead of one tool call per target.
- **Issue/PR**: #913 / PR from `claude/sleepy-curie-x5rcx9`
- **Outcome**: done — the `agent` param is now a union: single agent name
  (result byte-identical to before, stable `warnings: string[]` shape),
  `"all"` (expands to `WORKFLOW_TARGET_AGENTS`), or a non-empty array
  (de-duped, first-mention order; a one-element array collapses to the
  single-agent shape, same rule as the CLI). Several agents return
  `warningsByAgent: { <agent>: string[] }`, the CLI's multi-agent JSON key.
  Warnings still only collected for schema-valid drafts; invalid drafts
  return `validationErrors` with no warning keys. Tool description text
  updated in both canvas and file modes; docs: mcp README tool table,
  ccwf-cli SKILL.md, ai-editing-skill-template.md. E2E: 11 cases through
  the real MCP SDK stdio client against the built `ccwf-mcp` server
  (baseline no-agent, legacy string, one-element array parity, duplicate
  array dedupe + key order, `"all"` with all 7 targets, claude-code
  self-check empty, invalid draft suppression, bad name / bad name in
  array / empty array all rejected at the schema layer), plus CLI-parity
  check that MCP and `ccwf validate --agent codex --json` emit identical
  warning strings. Issue #913 could not be locked (no `gh`, no MCP lock
  tool — known limitation, noted in the issue).
- **Next proposals**:
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — `ccwf validate --strict` gates CI on compatibility warnings
- **User value**: a user can now make CI fail when a workflow carries
  target-compatibility warnings — `ccwf validate ./workflows --agent all
  --strict` — instead of warnings scrolling past with exit 0 and only
  schema validity gating the pipeline.
- **Issue/PR**: #911 / PR from `claude/sleepy-curie-q7n03u`
- **Outcome**: done — `--strict` turns any collected warning into exit 1
  (schema-invalid still 1, unreadable files still win with 2). `--strict`
  without `--agent` would collect no warnings and silently pass, so it
  aborts with a usage error (exit 2), matching validate's "a typo can
  never produce a false-green CI" philosophy. A final
  `error: N target-compatibility warning(s) treated as errors (--strict).`
  stderr line explains the nonzero exit in both human and `--json` mode;
  JSON stdout shapes (single-file stable contract, multi-file
  `{valid, files}`) are byte-identical — the multi-file top-level `valid`
  already mirrors the exit code, so it reflects strict failures
  automatically. Docs: cli README + ccwf-cli SKILL.md. E2E: 12 cases
  against the built CLI (baseline no-strict exit 0, strict-without-agent
  usage error, warning/clean single agent, `--agent all`, JSON shape +
  stderr notice, schema-invalid suppression (empty warnings, no notice),
  directory batch human/JSON, unreadable-beats-strict exit 2). Issue #911
  could not be locked (no `gh`, no MCP lock tool — known limitation,
  noted in the issue).
- **Next proposals**:
  - MCP `validate_workflow` parity: accept `agent: "all"` (or an array)
    so AI agents can preflight every target in one call like the CLI.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — `ccwf validate --agent` repeatable + `--agent all`
- **User value**: a user exporting a workflow to several AI agents can now
  preflight target compatibility for all of them in one command —
  `ccwf validate wf.json --agent all` (or `--agent codex --agent gemini`) —
  instead of re-running validate once per target.
- **Issue/PR**: #909 / PR from `claude/sleepy-curie-mgigph`
- **Outcome**: done — `--agent` uses a commander accumulator: repeatable,
  de-duped, first-mention order; `all` expands to `WORKFLOW_TARGET_AGENTS`
  (7 targets). With exactly one agent every output — human lines and the
  single-file `--json` `warnings` array — is byte-identical to before.
  With several agents, warning lines gain a `[agent]` prefix, each clean
  target still prints `✓ No target-compatibility warnings for <agent>.`,
  and `--json` reports carry `warningsByAgent: { <agent>: string[] }`
  instead of `warnings`. Warnings still never affect the exit code; invalid
  workflows suppress warning collection (empty arrays per agent). Bad agent
  names get a clean commander error listing the vocabulary plus `all`.
  Docs: cli README + ccwf-cli SKILL.md (which had never documented
  `validate --agent`). E2E: 11 cases against the built CLI (legacy
  single-agent human/JSON, `all`, repeat+dedupe, no-agent, bad name,
  directory batch with unreadable file, multi-agent JSON, invalid-schema
  suppression, exit codes 0/1/2). Issue #909 could not be locked (no `gh`,
  no MCP lock tool — known limitation, noted in the issue).
- **Next proposals**:
  - `ccwf validate --strict` (or `--fail-on-warnings`) so CI can gate on
    target-compatibility warnings, not just schema validity.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — ccwf validate accepts multiple files and directories
- **User value**: a user can now validate an entire workflows folder in one
  command — `ccwf validate ./workflows` or `ccwf validate a.json b.json` —
  with a per-file report, a summary line, and a single exit code, instead of
  writing a shell loop around single-file invocations in CI (which also
  stopped at the first unreadable file instead of reporting them all).
- **Issue/PR**: #907 / PR from `claude/sleepy-curie-dx1emm`
- **Outcome**: done — `validate`'s argument is now variadic `<paths...>`;
  directories expand recursively to `*.json` (skipping `node_modules` and
  dot-directories, deterministic sort, de-duped). Nonexistent paths and
  empty directory expansions abort the whole run (exit 2) so a typo can
  never produce a false-green CI result. Every file is validated even when
  earlier ones fail; load errors are reported per file. Exit code: 2 if any
  file unreadable, else 1 if any invalid, else 0. Multi-input `--json`
  prints `{ valid, files: [...] }`; the single-file shape (raw
  ValidationResult + `warnings` with `--agent`) is byte-identical to
  before, as is all single-file human output. `--agent` warnings print per
  file. README and ccwf-cli SKILL.md updated. E2E: 10 cases against the
  built CLI (legacy single-file ×4, mixed directory, aggregate JSON,
  multi-file, empty dir, per-file `--agent codex` warnings, dedupe).
  Guard step this round closed #905 (merged as #906). Issue #907 could not
  be locked (no `gh`, no MCP lock tool — known limitation, noted in issue).
- **Next proposals**:
  - `--agent all` (or repeatable `--agent`) on `ccwf validate` to preflight
    every target at once — natural follow-up now that multi-file works.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in
    ja/ko/zh; `validate_workflow` via MCP Inspector in both modes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — Add a validate_workflow MCP tool (side-effect-free draft check)
- **User value**: an AI agent editing a workflow through the MCP server can
  now check a draft — schema validity plus, with the new optional `agent`
  param, the same target-compatibility warnings `ccwf validate --agent`
  prints — without touching the user's canvas or workflow file; previously
  the only way to discover validation errors was attempting `apply_workflow`,
  which in canvas mode auto-creates sub-agent `.md` files *before*
  validation runs, so a failed apply could leave stray files behind.
- **Issue/PR**: #905 / PR from `claude/sleepy-curie-1zwq4u`
- **Outcome**: done — new `validate_workflow` tool in
  `packages/mcp/src/tools.ts` (registered in both canvas and file modes with
  mode-specific descriptions; pure function, no adapter IO). Invalid drafts
  return a normal `{valid: false, validationErrors}` result (not `isError`)
  so agents iterate cheaply. The warning logic moved to core as
  `collectAgentCompatibilityWarnings` + `WORKFLOW_TARGET_AGENTS`
  (`schema/warnings.ts`); `ccwf export/run/validate --agent` now consume the
  shared helper (CLI re-exports it, byte-identical warnings). Discoverability:
  `cc-workflow-ai-editor` skill template gained a validate-before-apply step,
  `ccwf-cli` SKILL.md and the mcp README tool lists updated to 7 tools.
  Supersedes the parked "apply_workflow compat warnings" proposal — that was
  judged too thin because `apply_workflow` has no target parameter; the
  explicit `agent` param here is what makes ignored-field warnings usable.
  Issue #905 could not be locked (no `gh`, no MCP lock tool — known
  limitation, noted in the issue).
- **Next proposals**:
  - `ccwf validate` accepting multiple files / a directory (per-file report,
    single exit code) so CI can validate a workflows folder without a shell
    loop.
  - Manual E2E queue (carried): align/distribute + context menu +
    copy/cut/paste in real webviews; localized Claude API dialog in ja/ko/zh;
    now also `validate_workflow` via MCP Inspector in both modes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — Align and distribute selected nodes from the context menu
- **User value**: a user can now tidy a messy workflow layout in one click —
  align the selected nodes to an edge or center (left / horizontal centers /
  right / top / vertical centers / bottom) or space 3+ nodes out evenly —
  instead of pixel-dragging each node into line. The canvas previously had
  no alignment or layout tooling at all.
- **Issue/PR**: #903 / PR from `claude/sleepy-curie-j6xhnc`
- **Outcome**: done — two new store actions (`alignSelection` with 6 modes,
  `distributeSelection` with 2 axes), each a single `set()` → one undo
  entry. Geometry runs in absolute coordinates (groups never nest, one
  parent hop); deltas apply to `position` directly since a target's parent
  never moves, so group-relative children stay correct. Children whose
  selected group is also selected ride along and are excluded from the
  math; sizes come from explicit `style` (groups) or React Flow's measured
  `width`/`height` with fallbacks. Distribute keeps the outermost nodes
  fixed and equalizes edge-to-edge gaps (ties broken by node id for a
  deterministic order). Surface: `CanvasContextMenu` gained a generic
  icon-row entry kind (icon-only buttons with tooltip + aria-label);
  `WorkflowEditor` shows an align row (6 lucide icons) and a distribute
  row (2 icons, disabled below 3 nodes) when ≥2 alignable nodes are
  selected. 8 new `contextMenu.*` keys in all 5 locales. Guard step this
  round closed #901 (merged as #902). Issue #903 could not be locked (no
  `gh`, no MCP lock tool, API proxied — known limitation, noted in issue).
- **Next proposals**:
  - Manual E2E queue (carried): copy/cut/paste DOM events, canvas context
    menu, localized Claude API dialog in ja/ko/zh — and now align/distribute
    on mixed selections (incl. a group + loose nodes).
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.
  - The model list in the API Test dialog is hardcoded in two `<select>`s
    in `ClaudeApiUploadDialog.tsx` — extract to a single constant (and
    consider sourcing from the shared model catalog) so new models appear
    in both tabs consistently.

## 2026-07-23 — Localize the Claude API upload dialog
- **User value**: a user running VSCode in Japanese, Korean, or Chinese no
  longer sees the entire Claude API skill upload & test flow in English —
  the API-key screens, skill list, upload confirmation (MCP/dependent-skill
  warnings), success/error screens, MCP auth guidance, and the API Test
  chat panel are now fully localized. Bonus for English users: the "MCP
  server URL or token is missing" validation message was hardcoded
  Japanese and now renders in the UI language.
- **Issue/PR**: #901 / PR from `claude/sleepy-curie-j8pdhh`
- **Outcome**: done — 88 new `claudeApi.*` keys added to
  `translation-keys.ts` and all 5 locale files (en/ja/ko/zh-CN/zh-TW) per
  `.claude/rules/translation.md`; `ClaudeApiUploadDialog.tsx` (incl. the
  `AuthCodeSnippet` / `McpServerUrlForm` sub-components and both
  `ConfirmDialog`s) switched from hardcoded strings to `t(...)`, reusing
  `common.cancel`/`common.close`. Sentences with inline links/`<code>`
  markup use `.before`/`.after` key pairs so translators control word
  order. Product terms kept English everywhere: Claude API, Claude
  Platform, MCP, MCP Inspector, PulseMCP, OAuth, Bearer, `access_token`,
  `sk-ant-...`, model names, curl/Python/TypeScript. Error-message
  fallbacks (`Failed to load skills`, `Upload failed`, …) localized too.
  No behavior or schema changes. Issue #901 could not be locked (no `gh`,
  no MCP lock tool, API proxied — known limitation, noted in the issue).
- **Next proposals**:
  - Manual E2E queue (carried): verify copy/cut/paste DOM events + the
    canvas context menu, and now the localized Claude API dialog in ja/ko/zh.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.
  - The model list in the API Test dialog (Haiku 4.5 … Opus 4.6) is
    hardcoded in two `<select>`s in `ClaudeApiUploadDialog.tsx` — extract
    to a single constant (and consider sourcing from the shared model
    catalog) so new models appear in both tabs consistently.

## 2026-07-23 — Right-click context menu on the canvas
- **User value**: a user can now right-click a node, a multi-selection, or
  the empty canvas to Copy, Cut, Paste, Duplicate, or Delete (plus Select
  All) — the clipboard verbs shipped in #890–#896 were keyboard-only and
  invisible to mouse-first users; pasting via the canvas menu now lands the
  nodes at the click point instead of the fixed +40/+40 offset.
- **Issue/PR**: #899 / PR from `claude/canvas-context-menu`
- **Outcome**: done — new `CanvasContextMenu` component (VSCode dropdown
  tokens, lucide icons, platform-aware shortcut hints, edge clamping,
  closes on outside click/Escape/pan/zoom); `WorkflowEditor` wires React
  Flow's `onNodeContextMenu`/`onSelectionContextMenu`/`onPaneContextMenu`
  (right-click selects an unselected node exclusively, keeps a
  multi-selection). Menu actions reuse the existing store verbs and
  policies (Start/End exclusions, delete-confirm flow, pendingDelete
  guard). Paste tries `navigator.clipboard.readText()` (menu click is a
  user gesture) and falls back to an in-window mirror of the last
  copied/cut payload — set by both keyboard and menu copy/cut — so
  same-window right-click paste works even where webview clipboard read is
  denied; system-clipboard non-payload text correctly no-ops. Ctrl+A logic
  extracted to a shared `selectAllOnCanvas`. `pasteSelection` gained an
  optional target position (top-left of the payload's bounding box lands
  at the cursor). 6 new `contextMenu.*` keys in all 5 locales. Issue #899
  could not be locked (no `gh`, no MCP lock tool, API proxied — known
  limitation, noted in the issue body).
- **Next proposals**:
  - Full localization of `ClaudeApiUploadDialog` visible text — biggest
    remaining unlocalized surface (~3600 lines, one `t()` call); the
    `claudeApi.*` namespace from #897 is the landing zone.
  - Manual E2E queue: verify copy/cut/paste DOM events and the new
    context menu (incl. clipboard-read fallback path) in real webviews on
    all three OSes.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — Localize remaining hardcoded English strings in active UI
- **User value**: a user running VSCode in Japanese, Korean, or Chinese no
  longer hits stray English strings in otherwise-localized surfaces: the
  toolbar's "Stop MCP Server" tooltip, the What's New "View changes on
  GitHub" tooltip, the Codex dialog "Open documentation" tooltip, the four
  canvas toggle switch aria-labels, the shared tag-input "Required" lock
  label, wizard step navigation, the Sub-Agent Flow editor dialog label,
  and the Claude API upload dialog's tooltips/placeholders — screen-reader
  users get these in their UI language too.
- **Issue/PR**: #897 / PR from `claude/localize-active-ui-sweep`
- **Outcome**: done — 18 new keys added to `translation-keys.ts` and all 5
  locale files (en/ja/ko/zh-CN/zh-TW) per `.claude/rules/translation.md`
  (product terms MCP / PulseMCP / Claude Platform / Sub-Agent Flow /
  access_token kept English); 11 components switched from hardcoded
  attributes to `t(...)`. Guard step this round closed #895 (merged as
  #896). Deliberately out of scope: `McpServerSection.tsx` (discontinued
  chat panel, maintain-only), `SkillCreationDialog`'s tool-name example
  placeholder and `CommentaryOptionsDropdown`'s `placeholder="English"`
  (both are literal example values), and the full localization of
  `ClaudeApiUploadDialog` — discovered this round to be almost entirely
  unlocalized visible text (~3600 lines, one `t()` call); only its
  attribute-level strings were covered here.
- **Next proposals**:
  - Full localization of `ClaudeApiUploadDialog` visible text (headings,
    buttons, confirm dialogs, status messages) — big but mechanical;
    the `claudeApi.*` namespace started this round is the landing zone.
  - Right-click context menu on canvas nodes/pane exposing the now-complete
    clipboard verbs (Copy/Cut/Paste/Duplicate/Delete) — discoverability for
    mouse-first users; React Flow `onNodeContextMenu`/`onPaneContextMenu`.
  - Manual E2E still queued: verify `copy`/`cut`/`paste` DOM events fire in
    webviews on all three OSes.

## 2026-07-23 — Cut the canvas selection with Ctrl/Cmd+X
- **User value**: a user can now cut the selected nodes (with the edges
  between them) and paste them elsewhere — including into a different
  workflow's canvas — moving a sub-flow in two keystrokes instead of
  copy → delete → confirmation dialog. Completes the clipboard triad
  (copy/paste shipped in #893/#894); previously Ctrl+X silently did nothing.
- **Issue/PR**: #895 / PR from `claude/sleepy-curie-zj2g8c`
- **Outcome**: done — new `cutSelection(nodeIds)` store action delegates to
  `serializeSelection` (same inclusion policy: Start/End excluded, groups
  bring children, internal edges in the payload), then removes exactly the
  serialized node set plus every edge touching it (boundary edges must not
  dangle) in a single `set()` → one undo entry; selected edges between two
  surviving nodes are kept (cut only removes what the clipboard holds).
  DOM `cut` handler sits beside the existing `copy`/`paste` handlers with
  the same editable-target and text-selection guards; it checks
  `event.clipboardData` **before** mutating (never delete without a
  clipboard to write to) and skips while the delete-confirmation dialog is
  open. No confirmation dialog by design: cut is undoable and the content
  lives on the clipboard — Delete/Backspace keeps its confirm flow. No new
  i18n strings, no schema changes.
- **Next proposals**:
  - Localization mini-sweep (re-verified this round): `Toolbar.tsx`
    "Stop MCP Server" tooltip, `WhatsNewDialog` "View changes on GitHub",
    `CodexNodeDialog` "Open documentation" are hardcoded English in active
    UI (the `McpServerSection.tsx` occurrences are discontinued-chat-panel
    only — maintain-only, skip them).
  - Manual E2E: verify the `cut` event fires in webviews on all three OSes
    alongside the queued copy/paste check.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y); only add grid-step nudging if
    actually missing.

## 2026-07-23 — Copy/paste the canvas selection with Ctrl/Cmd+C / Ctrl/Cmd+V
- **User value**: a user can now copy the selected nodes (with the edges
  between them) and paste them — including into a **different workflow's
  canvas** in another editor window — instead of rebuilding sub-flows by
  hand. Completes the selection story queued by the last two iterations
  (select-all #889, multi-duplicate #891); previously Ctrl+C/V did nothing.
- **Issue/PR**: #893 / PR from `claude/sleepy-curie-7t2atg`
- **Outcome**: done — implemented via DOM `copy`/`paste` events
  (permission-free in VSCode webviews, unlike `navigator.clipboard.readText`)
  with the existing editable-target guard; a non-collapsed text selection
  keeps the native copy, and paste only intercepts text that parses as a
  versioned `cc-wf-studio/selection` JSON payload. `serializeSelection`
  reuses the duplicateSelection inclusion policy (Start/End excluded,
  groups bring children, edges with both endpoints inside); children copied
  without their group are made self-contained (parentId dropped, position
  made absolute). `pasteSelection` inserts with fresh ids (shared
  `makeUniqueNodeId`/`makeUniqueEdgeId` helpers extracted from
  duplicateSelection), +40/+40 offset, deep-copied data, pasted nodes
  become the selection, single `set()` → one undo entry. Malformed payloads
  are shape-checked and rejected. No new i18n strings, no schema changes.
- **Next proposals**:
  - Localization mini-sweep: `Toolbar.tsx` "Stop MCP Server",
    `McpServerSection.tsx` "Open documentation"/"Stop MCP Server (Port …)",
    `WhatsNewDialog` "View changes on GitHub", `CodexNodeDialog` "Open
    documentation" are still hardcoded English (verified this round).
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow v11 keyboard a11y is enabled — `disableKeyboardA11y`
    is not set); only add grid-step nudging if it's actually missing.
  - Manual E2E: confirm webview `copy`/`paste` events fire on all three
    OSes (Linux webviews historically quirky) — if paste is unreliable,
    fall back to Ctrl+V keydown + `navigator.clipboard.readText()`.

## 2026-07-23 — Duplicate a multi-node selection with Ctrl/Cmd+D
- **User value**: a user can now select several nodes (Ctrl/Cmd+A,
  rubber-band, or shift-click) and press Ctrl/Cmd+D to duplicate the whole
  sub-flow at once — the copies keep the edges between each other.
  Previously the shortcut was gated on `selectedNodeId` (set only when
  exactly one node is selected), so duplicate on a multi-selection silently
  did nothing.
- **Issue/PR**: #891 / PR from `claude/multi-select-duplicate`
- **Outcome**: done — generalized `duplicateNode` into a new
  `duplicateSelection(nodeIds)` store action (`duplicateNode` now delegates
  to it): same id-remapping convention, deep-copied `data`, single `set()`
  → one undo entry. Start/End filtered out; a selected group brings its
  children even if unselected (existing policy); a selected child whose
  group is outside the set stays in its original group with the +40/+40
  offset applied to its group-relative position. Edges with both endpoints
  copied are duplicated and remapped; boundary-crossing edges are not
  (matches group duplication). Selection moves wholly to the copies
  (original nodes AND edges deselected); `selectedNodeId`/auto-focus pan
  follow the exactly-one rule so multi-copies keep the viewport still. The
  `mod+D` handler now reads the `selected` flags instead of
  `selectedNodeId`. Guard step this round closed #889 (merged as #890).
- **Next proposals**:
  - Localization mini-sweep: `Toolbar.tsx` "Stop MCP Server" tooltip and
    WhatsNewDialog "View changes on GitHub" are still hardcoded English.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - Clipboard copy/paste (Ctrl+C/V) of selections — would enable pasting
    across workflows; needs a serialization format + paste-position design.

## 2026-07-23 — Add Ctrl/Cmd+A select-all to the workflow canvas
- **User value**: a user can now press Ctrl/Cmd+A on the canvas to select
  every node and edge at once — then move the whole workflow, or delete it
  through the existing multi-delete confirmation flow. Previously the only
  multi-select was the rubber-band drag in selection mode; there was no
  keyboard path at all.
- **Issue/PR**: #889 / PR from `claude/sleepy-curie-2ldj9j`
- **Outcome**: done — added a `mod+A` branch to `WorkflowEditor`'s existing
  keydown handler (same editable-target guard as Ctrl+Z/Y/D), marking all
  nodes/edges `selected: true` via `setNodes`/`setEdges` and syncing
  `selectedNodeId` with `handleNodesChange`'s rule (exactly one node → its
  id, else null). Verified selection state is excluded from undo history
  (`partialize`) and canvas-revision tracking, so select-all neither
  dirties the workflow nor pollutes undo. Security-interrupt check this
  round: the previous iteration's flagged Dependabot alerts did not
  reproduce — `pnpm audit` shows only the known unfixable moderate
  `@hono/node-server` advisory tracked in #879. Rejected this round:
  Escape-to-deselect (would clear a selection the user still wants when
  dismissing dialogs, e.g. canceling the delete confirm).
- **Next proposals**:
  - Multi-node copy/paste or multi-select Ctrl+D duplicate — now more
    valuable with select-all in place; needs id remapping + group handling
    design pass.
  - Toolbar.tsx "Stop MCP Server" tooltip and WhatsNewDialog "View changes
    on GitHub" are still hardcoded English — small localization sweep.
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.

## 2026-07-23 — Localize the Workflow Tour UI, Overview zoom controls, and remaining canvas tooltips
- **User value**: a user running VSCode in Japanese, Korean, or Chinese now
  sees the Workflow Tour feature (Start/Generate pills and popover,
  Prev/Next/Finish controls, regenerate/end tooltips), the Overview's zoom
  controls (Zoom in/out, Fit to view, Follow active node, Layout toggle),
  and the node/edge delete tooltips in their display language — previously
  all hardcoded English inside an otherwise fully localized canvas.
- **Issue/PR**: #887 / PR from `claude/sleepy-curie-5qv0ox`
- **Outcome**: done — verified `GenerateTourPopover`, `StartTourButton`,
  `TourPanel`, `TourStepCard`, `MermaidDiagram`, `InstructionsPanel`,
  `DeleteButton`, `DeletableEdge`, `FeatureAnnouncementBanner`, and
  `ResizeHandle` had zero `useTranslation` usage. Added `workflowTour.*`,
  `overview.*` (zoom/layout/splitter), and canvas-tooltip/a11y keys to
  `translation-keys.ts` and all 5 locales; reused existing keys where
  wording matched (`tour.button.next`/`.finish` for the tour nav,
  `dialog.deleteNode.confirm` for the delete icon title). Tour step
  content (AI-generated titles/descriptions) is workflow data and stays
  untouched. Out of scope: discontinued chat-UI components and
  `ClaudeApiUploadDialog` (its own large surface). Guard step this round
  also closed #885 (merged as #886, the previous iteration's close call
  didn't stick).
- **Next proposals**:
  - **Interrupt candidate for next round**: at push time GitHub reported
    3 Dependabot vulnerabilities on the default branch (2 high, 1 low) —
    check https://github.com/breaking-brake/cc-wf-studio/security/dependabot
    (the 2026-07-23 security round left only 1 known moderate advisory, so
    these may be new).
  - `Toolbar.tsx` still has a hardcoded "Stop MCP Server" tooltip and
    `WhatsNewDialog` a "View changes on GitHub" one — small follow-up sweep.
  - Ctrl+A select-all on the canvas (pairs naturally with the new
    multi-delete confirm flow from #885).
  - Multi-node copy/paste or multi-select duplicate — needs its own design
    pass (id remapping + group handling).

## 2026-07-23 — Fix canvas keyboard deletion (Delete key + edge loss on cancel)
- **User value**: a user can now delete the selected nodes/edges with the
  Delete key (previously only Backspace was bound — the standard delete key
  on Windows/Linux did nothing), and canceling the delete-confirmation
  dialog no longer silently removes the node's connected edges.
- **Issue/PR**: #885 / PR from `claude/sleepy-curie-e5jbnc`
- **Outcome**: done — verified React Flow v11's `deleteElements` emits
  connected-edge remove-changes *before* node remove-changes; the store
  applied edge removals unconditionally while node removal waited behind
  the confirm dialog, so cancel stranded the node without its edges.
  Replaced the built-in handler (`deleteKeyCode={null}`) with explicit
  Delete/Backspace handling in `WorkflowEditor`'s existing keydown handler
  (skips inputs/contentEditable and modifier combos): selected non-start
  nodes go through the confirm flow with a new `requestDeleteSelection`
  action (`pendingDeleteEdgeIds` defers explicitly selected edges with
  them); edge-only selections delete immediately (parity with the edge ✕
  button). Side effect: keyboard-deleting a group now releases its children
  (matches the group's ✕ button) instead of React Flow's delete-children
  behavior. No new i18n strings. Guard step this round also closed #883
  (merged as #884).
- **Next proposals**:
  - Localize the hardcoded node/edge action tooltips (`"Delete node"` in
    `DeleteButton.tsx`, `"Delete connection"` in `DeletableEdge.tsx`).
  - Multi-node copy/paste (or multi-select duplicate) — only single-node
    Ctrl+D duplicate exists today; needs id remapping + group handling,
    likely its own design pass.
  - MCP `apply_workflow` compat warnings — still parked until more
    Claude-Code-only node types land.

## 2026-07-23 — Show difficulty and tags on sample gallery cards
- **User value**: a user browsing the canvas sample gallery can now see each
  sample's difficulty level (localized badge) and topic tags (slug chips)
  before loading it, instead of judging a sample only by its name and node
  count — parity with `ccwf samples list`, which already prints
  `difficulty · nodes · tags` for the same bundled files.
- **Issue/PR**: #883 / PR from `claude/sleepy-curie-7ziuc1`
- **Outcome**: done — `SampleWorkflowMeta` always shipped `difficulty` and
  `tags` and `listSampleWorkflows` already posts the full meta to the
  webview; `SampleWorkflowDialog.tsx` simply dropped both. Added a
  BetaBadge-styled difficulty badge next to the sample name (new
  `sample.difficulty.beginner/intermediate/advanced` keys in all 5 locales:
  初級/中級/上級, 초급/중급/고급, 初级/中级/高级, 初級/中級/高級) with raw-string
  fallback for unknown values, and untranslated tag chips (slug identifiers,
  same presentation policy as the CLI). Guard step this round also closed
  #881 (merged as #882). Rejected this round: confirm-before-replacing-canvas
  on sample load (premise false — `handleLoadSample` already routes through
  the unsaved-changes confirm at `App.tsx:304`).
- **Next proposals**:
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - MCP `apply_workflow` compat warnings — still parked until more
    Claude-Code-only node types land.

## 2026-07-23 — Localize the Commentary options dropdown
- **User value**: a user running VSCode in Japanese, Korean, or Chinese no
  longer sees hardcoded English chrome ("Commentary options", "Provider",
  "Language", "Model", "Loading...", "No models available") inside the
  Commentary AI settings dropdown — the last toolbar surface bypassing i18n
  entirely in an otherwise fully localized UI.
- **Issue/PR**: #881 / PR from `claude/sleepy-curie-9no943`
- **Outcome**: done — `CommentaryOptionsDropdown.tsx` had zero
  `useTranslation` usage; added `commentary.options.*` keys (title,
  provider, language, model, noModels) to `translation-keys.ts` and all 5
  locale files, wording aligned with the established conventions
  (プロバイダー/프로바이더/提供商, モデル/모델/模型); loading state reuses the
  generic `loading` key (`{t('loading')}...`, same as `SampleWorkflowDialog`).
  Kept untranslated by design: product names ("Claude Code", "Copilot"),
  model names, and the language input's `English` placeholder (it documents
  the literal default `language || 'English'` fed to the commentary prompt
  in `commentary-ai-service.ts`). Out of scope: `modelsError` prop text and
  the discontinued chat-UI `SettingsDropdown` (maintain-only).
- **Next proposals**:
  - Sample gallery could show each sample's `difficulty` badge (metadata
    already ships in `SampleWorkflowMeta`; `ccwf samples list` shows it,
    the canvas dialog does not — verified this round).
  - Verify in a live webview whether arrow keys already move the focused
    node (React Flow a11y); if not, add grid-step nudging.
  - MCP `apply_workflow` compat warnings judged too thin this round (only
    `branchSession` is Claude-Code-only and ignored-field warnings need a
    target agent) — revisit if more Claude-Code-only node types land.

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
