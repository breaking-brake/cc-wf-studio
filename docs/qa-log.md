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

## 2026-07-26 — S6 (fourth slice): group membership on node drag-stop
- **Protects**: if this breaks, the user drags a node into a group and the
  canvas draws it inside, but `parentId` is never set — or is set to the wrong
  group — so the saved `workflow.json`, the Mermaid `subgraph` blocks, and the
  Group Node Execution Tracking table all describe **a different structure than
  the canvas shows**. Nothing on the user's machine reports it; the divergence
  surfaces wherever the agent is later run.
- **Issue/PR**: #1033 / PR from `claude/qa-drag-group-membership`
- **Outcome**: done — 26 passing cases (the issue's 14, expanded by `it.each`
  over the hit-test edges and the three size-source shapes) in a new
  `packages/vscode/src/webview/src/stores/workflow-store-groups.test.ts`.
  **No product source changed.** Notes on what the cases pin:
  - No new infrastructure: third store suite under the webview
    `vitest.config.ts` that landed with #1014. `workflow-store.ts` imports
    `@cc-wf-studio/core` through its `dist`, so `pnpm build` must precede
    `pnpm test` on a fresh checkout (already recorded under #1020).
  - `onNodeDragStop` is the **only** writer of `parentId` from canvas
    interaction and had **no** test before this. `workflow-store-history.test.ts`
    section E reproduces the pause/resume half of the drag contract by writing
    positions with `setState` and never invokes the action, so the group logic
    was entirely untouched.
  - Fixtures are installed with `setState`, not `setCanvas` — the one departure
    from the sibling suites' "drive everything through public actions" rule,
    and documented in the file header. `setCanvas` applies
    `sortNodesParentFirst` itself (`workflow-store.ts:966`), and array order is
    under test in sections A3/D12/E, so letting a second call site rewrite the
    fixture would have tested the wrong function.
  - **Section A** asserts the four early returns by **array identity**
    (`toBe`), not value equality: every `set()` this action skips is also an
    undo entry `handleNodeDragStop` (`WorkflowEditor.tsx:284`) would otherwise
    record, so "wrote nothing" is the actual contract.
  - **B/C** assert `parentId` **and** `position` together — a case checking
    only `parentId` still passes while the node renders 100px off its drop
    point. B6 covers group→group, where the conversion runs twice and a sign
    error hides. C9 pins that `parentId` is written as `undefined` rather than
    the key being deleted; the two are indistinguishable today because
    `serializeWorkflow` spreads `...(node.parentId && { parentId })`, but
    pinning what is written keeps the two modules in step.
  - **D** gives each of the four inclusive edges, both corners and all four
    one-pixel misses its own named case, since `>=` vs `>` is a one-character
    regression. D12 pins the overlapping-group winner as **observed**: the loop
    `break`s on the first match in **array order, not z-index** — not what a
    user would predict, and a refactor dropping the `break` changes it
    silently.
  - **E14** pins the other observed-not-designed behaviour:
    `sortNodesParentFirst` partitions on "is some node's parent", not "is a
    group" (`:190`), so a group that loses its last child leaves the `parents`
    partition and is reordered behind a still-parent group — an **untouched**
    node moving, which is exactly what a rewrite would change without noticing.
    It takes two groups to observe; with one, the partition change is invisible
    in the output order.
  - Verified the suite bites by hand-mutating and reverting exactly the five
    things the issue names: the `targetGroup.id !== currentParentId` guard (1
    named failure), the `>=` on the hit test's left edge (2), the `?? 400`
    width fallback (1 — correctly only the no-size-at-all case, since the
    React-Flow-`width` shape never reaches the fallback), the subtraction in
    the move-in conversion (2), and the `[...parents, ...others]` order (2).
    Each made a **named** assertion fail.
- **Bugs filed**: none — all 14 cases landed passing, as the issue predicted.
- **Out of scope, per the issue**: the nested-ordering flaw in
  `sortNodesParentFirst` is already recorded in **#1015** and is unreachable
  through this action anyway (line 590 returns before a group can nest). The
  other three `sortNodesParentFirst` call sites (`:873`, `:923`, `:966` —
  `addGeneratedWorkflow` / `updateWorkflow` / `setCanvas`) are a separate slice
  and #1033 stays closed on this one; whether the drag *renders* correctly
  stays on manual E2E per `docs/quality/03-assurance-map.md` §5.

## 2026-07-26 — S7: the agent `.md` frontmatter parser behind sub-agent import
- **Protects**: if this breaks, the user picks an existing `.claude/agents/*.md`
  from the Sub-Agent creation dialog and the node that lands on the canvas
  carries the **wrong model, the wrong tools, and an `agentDefinition` that
  still has the raw `---` block inside it** — so every artifact generated from
  that workflow describes a different agent than the file they chose, and the
  divergence surfaces wherever the agent is later run.
- **Issue/PR**: #1030 / PR from `claude/qa-agent-frontmatter`
- **Outcome**: done — 17 passing cases in a new
  `packages/vscode/src/webview/src/utils/agent-frontmatter.test.ts`.
  **No product source changed.** Notes on what the cases pin:
  - No new infrastructure: the module has zero imports, so it runs under the
    webview `vitest.config.ts` that landed with #1014, next to
    `workflow-diff.test.ts`. Section F imports `@cc-wf-studio/core` through its
    `dist`, so `pnpm build` must precede `pnpm test` on a fresh checkout
    (already recorded under #1020).
  - Both call sites (`SubAgentCreationDialog.tsx:125`, `NodePalette.tsx:207`)
    parse the **same content independently** and both fall back on a falsy
    value (`|| 'sonnet'`, `|| ''`), so a failed parse never fails loudly. That
    is why the empty-value case pins `''` rather than `undefined`: today both
    take the same branch, and a change there changes which one runs.
  - Nested-structure cases assert with `toEqual` on the **whole** frontmatter
    object, because an inner line of a `hooks:` block leaking to the top level
    — a nested config silently becoming agent metadata — is the failure the
    code comment's "skip complex nested structures" claim is about.
  - Section F is a **contract between two independently maintained modules**:
    `generateSubAgentFile` writes the file, `parseAgentFrontmatter` reads it
    back. It is the only part of the suite that is not a check of the parser
    against its own regex.
  - Verified the suite bites by hand-mutating four things and reverting each:
    the non-greedy `*?`, the `\n?` after the closing fence, the `[\w-]` in the
    key pattern, and the `.trim()` on the body. Each made exactly one **named**
    assertion fail.
- **Bugs filed**: **#1031** — the fence pattern hardcodes `\n`, so a **CRLF**
  agent file does not match at all: `model` falls back to `sonnet` whatever the
  file said, `tools` and `memory` are dropped, and `agentDefinition` becomes the
  whole file including the raw fences. Reachable on Windows, where the
  extension ships. Per the issue, the case is landed **passing against the
  current (wrong) behaviour** and named `CURRENT BEHAVIOUR (bug #1031)` rather
  than skipped — so it goes red when the feature loop fixes it, which is the
  intended signal to update it.
- **Second finding, not filed separately**: `generateSubAgentFile` interpolates
  `description: ${data.description || name}` with no `escapeYamlString`, unlike
  the slash-command path in the same file. A description containing a newline
  therefore **injects extra frontmatter lines** (`description: line one\nmodel:
  haiku`) and does not survive the round trip — the parsed description is
  `'line one'`. This is the same family as the already-filed **#1009**, so per
  #1030's own instruction it is recorded here rather than filed a second time
  in one run. Pinned as observed in section F.

## 2026-07-26 — S1 (behavior half): the cross-field derive normalizers
- **Protects**: if this breaks, the user edits one field of a branching node in
  the property panel and a **different** field is silently rewritten — a Switch
  node's default case stops sorting last, so the exported instructions tell the
  agent to evaluate the fallback ahead of the specific conditions it was meant
  to follow; or toggling AI suggestions off on an AskUserQuestion node wipes the
  options the user typed. Nothing reports it: the panel shows the value that was
  written, and the divergence surfaces wherever the agent later runs.
- **Issue/PR**: #1028 / PR from `claude/qa-derive-normalizers`
- **Outcome**: done — 24 passing cases in a new
  `packages/core/src/schema/nodes/derive-updates.test.ts`, one `describe` per
  function, all driven through the `@cc-wf-studio/core` schema entry point.
  **No product source changed.** Notes on what the cases pin:
  - These four functions are **not** a declarative schema, so covering them is
    an inspection rather than a transcription: `.claude/rules/schema-driven-panels.md`
    deliberately keeps cross-field effects out of `FieldMeta` ("No side-effect
    meta") and puts them in hand-written pure functions co-located with the
    schema. They implement rules stated nowhere else.
  - Every patch is a **single key**, matching what the call site actually
    produces (`SchemaPropertyPanel.tsx:74-76` builds `{ [fieldName]: value }`).
  - Assertions are `toEqual` on the **whole** returned object, because the
    failure mode is a dropped or extra key — a case checking one field in
    isolation still passes once the function starts adding keys it shouldn't.
    The pass-through cases additionally assert the *absence* of `outputPorts`.
  - **`deriveSwitchUpdate`**: default-last ordering with the regular cases'
    relative order preserved, two defaults keeping their own order, no-default
    left untouched, the `outputPorts` sync, pass-through, the `Array.isArray`
    guard (`switch-schema.ts:66` — without it `.filter` throws a TypeError
    inside the panel's change handler), and **purity** (the caller's array must
    not be sorted in place).
  - **`deriveAskUserQuestionUpdate`**: enabling AI suggestions clears options;
    **disabling preserves them** — the doc comment calls out that disabling does
    not restore defaults, and a regression that clears here instead is the
    silent-data-loss case this suite exists for. Plus both `multiSelect` arms,
    the option count read **from `data`, not the patch**, the absent-`options`
    paths, and arm **precedence** (`useAiSuggestions` wins over a same-patch
    `options`) pinned as observed so reordering the arms fails by name.
  - **`deriveBranchUpdate`** (legacy): the >2 → first-two trim pinned as
    observed (it discards the user's 3rd+ branches; the doc comment states this
    is deliberate), the exactly-two no-op, `switch` not trimming, the count
    sync, and the absent-`data.branches` path.
  - **`deriveIfElseUpdate`**: `outputPorts: 2` regardless of array length —
    enforcing `.length(2)` is the zod schema's job, not this function's.
  - Verified the suite bites by hand-mutating and reverting exactly the five
    things the issue names: the `[...regular, ...defaults]` concatenation order
    (2 named failures), the `Array.isArray` guard (1), the `enabled ? [] :
    options` ternary (3), `data.options` → `patch.options` in the `multiSelect`
    arm (1), and `branches.length > 2` (1). Each made a **named** assertion fail.
- **Bugs filed**: none — all four functions behave as their doc comments state.
- **Out of scope, per the issue**: `NODE_DERIVE_FNS`
  (`node-schema-registry.ts:65`) has **no consumers** — the panels import each
  derive function directly rather than looking it up. A "registry agrees with
  the panel configs" test would either assert dead code or import the webview's
  React panel modules. If that panel/registry drift is worth closing, it is a
  feature-track question, not a test.

## 2026-07-25 — S2 (fourth slice): the MCP tool node execution instructions
- **Protects**: if this breaks, the user configures an MCP node in the canvas
  and the exported skill / slash command / `ccwf render` output describes a
  **different tool call than the one they configured** — the wrong server, a
  dropped parameter, a lost constraint, or the wrong execution strategy
  entirely (telling the agent to call a fixed tool when the user asked the AI
  to pick one). Nothing on the user's machine reports it; the damage happens
  wherever the agent later runs. `docs/quality/02-feature-map.md` rates the
  MCP node **A** with exactly this failure.
- **Issue/PR**: #1024 / PR from `claude/qa-mcp-execution-instructions`
- **Outcome**: done — 31 passing cases and 2 deliberately skipped, appended as
  a `describe` block to the existing
  `packages/core/src/services/workflow-prompt-generator.test.ts` so the
  `mcpNode` fixture and `makeWorkflow` helper are shared. All three formatters
  are module-private, so every case drives them through the exported
  `generateExecutionInstructions`; **no product source changed**. Sections:
  - **A. Mode dispatch** — the load-bearing half, since picking the wrong
    formatter changes the execution strategy the agent is told to use. All
    three modes, plus both fallbacks (`mode` absent — the shape every
    pre-mode workflow file on disk has — and an unrecognised string).
    Each dispatch case matches the **whole heading line**: the manual heading
    is a prefix of the AI Parameter Config heading, so a `toContain` on it
    would pass on AI-mode output and the case would succeed for the wrong
    reason.
  - **B. Manual parameter config** — typed rendering of configured values, an
    untyped value with no matching schema entry (a dropped parameter here is
    the A-rated failure), `JSON.stringify` for object/array values rather
    than `[object Object]`, both empty-section guards, required/optional
    labels with the description fallback, the `MCP Tool` / empty-string
    placeholders instead of printing `undefined`, and server + validation
    status.
  - **C. AI parameter config** — the metadata comment is extracted and
    `JSON.parse`d rather than string-matched: it is a machine-readable
    contract with the consuming agent and nothing in the repo parses it
    today, so a malformed payload is otherwise invisible. Plus
    `parameterSchema` mirroring in order, and **constraint rendering
    parameterised over all six `validation` keys** — one case per key, so
    dropping any single clause fails a case that names the missing
    constraint.
  - **D. AI tool selection** — metadata carries the server and intent and
    **nothing else** (`toEqual`, not `toMatchObject`, so a leaked `toolName`
    fails), the server id embedded verbatim in the execution sentence, and
    the case that matters most: a `toolName`/`parameters` left over on the
    node data from a previous manual configuration must **not** be emitted,
    or the agent is told to call that specific tool in the mode that exists
    to let it choose one.
  - **E. Provider dependence** — `getAgentName` per provider including
    `roo-code` → **Zoo Code** (the #801 rename is exactly the kind of thing
    that regresses back), and the manual mode asserted provider-**independent**
    by comparing two providers' output directly.
  - **F.** Two nodes in different modes, each with its own subsection in
    workflow node order under a single `## MCP Tool Nodes` heading.
  - Verified the suite bites by hand-mutating and reverting the five things
    the issue names — the `default:` arm of the mode switch (2 named
    failures), the `paramSchema` type annotation (1), the
    `Object.keys(parameterValues).length > 0` guard (1), the `maxLength`
    constraint clause (1), and `getAgentName`'s `roo-code` arm (1). Each made
    a **named** assertion fail.
- **Bugs filed**: **#1025** and **#1026** — both found by this suite, both
  verified in the code before filing:
  - **#1025 — legacy `mode` values export as manual parameter config.**
    `normalizeMcpNodeData` (`types/mcp-node.ts:261`) exists to migrate the v1
    names, but its only two callers are `addGeneratedWorkflow` /
    `updateWorkflow` in the webview store. Nothing in `deserializeWorkflow`,
    `packages/cli` or `packages/mcp` calls it, so a file on disk carrying
    `mode: 'fullNaturalLanguage'` misses all three `case` arms and is exported
    as manual config — the wrong execution strategy, silently. Per the #1018
    precedent this is **pinned as observed in a passing case named after the
    issue**, not skipped; the case says to update it once the fix lands.
  - **#1026 — user-typed text breaks the exported markup.** `JSON.stringify`
    does not escape `>`, so a `-->` in the free-text description ends the
    `MCP_NODE_METADATA` comment mid-JSON and the remainder leaks into the
    document as visible text. Same root cause: the User Intent block opens
    with three backticks, so a description containing its own fence closes it
    early and the intended closing fence opens a new one that swallows
    `**Execution Method**` — `workflow-overview-formatter` already uses four
    backticks for exactly this reason. Both cases **land skipped**, asserting
    the intended contract, so they un-skip unchanged once #1026 is fixed.
- **Residual scope on #1024**: none — all 27 cases the issue names landed,
  which completes the MCP slice of S2. #995's item 3 (Claude Code artifacts
  vs `spec.md`) remains blocked on a human revising that spec, unchanged by
  this PR. The `export-metadata.schema.json` contract the issue calls out as
  a trap was deliberately **not** tested against: it is written to the v1
  mode names, requires an `instructions` key the generator never emits, and
  types `parameterSchema` as an object where the generator emits an array.

## 2026-07-25 — S6 (third slice): undo/redo history in the canvas store
- **Protects**: if this breaks, the user presses Ctrl+Z after an AI agent's
  `apply_workflow` rewrote their canvas and their work does not come back —
  undo is the canvas's only recovery path, and most edits carry no
  confirmation. In the other direction, a regressed `clear()` makes Ctrl+Z on
  a freshly opened workflow pull in the *previous* workflow's nodes, which the
  next save then writes into the wrong file.
- **Issue/PR**: #1022 / PR from `claude/qa-canvas-undo-redo-history`
- **Outcome**: done — 18 passing cases in a new sibling suite,
  `packages/vscode/src/webview/src/stores/workflow-store-history.test.ts`,
  covering all 17 cases the issue names, driven through the store's public
  actions and `useWorkflowStore.temporal.getState()`. A **sibling file** rather
  than an addition to `workflow-store.test.ts` on purpose: vitest gives each
  file its own module registry, so the module-global temporal stack here cannot
  perturb that file's module-global revision counter. No new test
  infrastructure — the `localStorage` setup file that landed with #1020 was
  the only thing needed. Sections:
  - **A. What is and is not an undoable step** — `addNode`, `onConnect`
    (exactly one entry, though it rewrites every node with `selected: false`)
    and `updateNodeData` each record one, and `undo()` restores the prior
    value; selection and React Flow `dimensions` changes record **none** (the
    load-bearing half — without both the `partialize` strip and the `equality`
    dedupe, the user's real edit sits further from Ctrl+Z than it looks); and
    `setCanvas` with identical content in fresh arrays records none, since
    `equality` compares content, not array identity. Each "records nothing"
    case first asserts the change actually landed, so the zero cannot pass
    vacuously.
  - **B. Redo** — `undo()` → `redo()` round-trips and drains `futureStates`;
    a fresh edit after an `undo()` drops the redo stack, which is what disables
    the button at `UndoRedoControls.tsx:24`.
  - **C. The 50-entry cap** — 60 distinct changes leave `pastStates.length`
    at 50, and 50 undos land on `v10`, not the `v0` the canvas started from.
    Asserting the exact label is what distinguishes "the oldest were dropped"
    from "the newest were".
  - **D. History clearing** — all five `clear()` sites: `clearWorkflow`,
    `addGeneratedWorkflow`, `setActiveWorkflow` by default,
    `setActiveSubAgentFlowId` on entering sub-agent flow editing, and
    `cancelSubAgentFlowEditing` with a snapshot — plus its early return, so a
    stray Escape on the main canvas does not cost the undo stack. **And the
    case the issue exists for**: `setActiveWorkflow(w, { clearHistory: false })`
    preserves history, reproducing `App.tsx:317-321` verbatim
    (`deserializeWorkflow` → `setCanvas` → `setWorkflowName` →
    `setActiveWorkflow`) and asserting the pre-apply canvas comes back on a
    single `undo()`. The count is pinned at exactly 1, so the user's work
    cannot end up buried behind no-op entries from the pair writing the same
    content twice.
  - **E. The drag pause/resume contract** — reproduces
    `WorkflowEditor.tsx:279-301`'s exact sequence (pause, four per-mouse-move
    position writes, revert to pre-drag, resume, apply final) and asserts it
    yields exactly one entry that undoes to the pre-drag position. The
    component's single-entry-per-drag trick is a contract with zundo's
    `pause`/`resume`, so a zundo upgrade could silently turn one drag into zero
    entries or one per mouse-move and nothing else would notice.
  - Verified the suite bites by hand-mutating and reverting five things — the
    four the issue names plus one more: dropping `selected` from the
    `partialize` strip (2 named failures), replacing `equality` with
    `() => false` (4), making the `options?.clearHistory !== false` guard
    unconditional (1), lowering `limit` to 20 (1), and neutering the `clear()`
    in `clearWorkflow` and `cancelSubAgentFlowEditing` (2).
- **Case 7 (`partialize`'d fields on restore), resolved as observed**: what
  `undo()` hands back carries no `selected` / `width` / `height` key, since
  `partialize` strips them before the entry is stored. Asserted as observed and
  **not** filed as a bug: React Flow re-measures on the next render and
  re-applies selection from its own state, so the missing keys are not known to
  be user-visible. The case says so in place and tells whoever proves otherwise
  to file a `bug` and update it rather than assert a different answer.
- **Bugs filed**: none — every clear site, the `clearHistory` guard, the cap
  and the dedupe behave as the code claims.
- **Residual scope on #1022**: none — all 17 cases landed, which closes S6.
  `updateWorkflow` (`workflow-store.ts:921`) remains deliberately uncovered per
  the issue: its only callers are the frozen chat-UI refinement path.
- **Noted, not acted on**: `tsc` in the webview build compiles this test file
  (it surfaced an unused-import error before vitest ever ran). That is the same
  packaging shape #1011 describes for `core`/`mcp`/`cli`; the webview is not
  published, so it costs only build time. Left for #1011 rather than widened
  here.

## 2026-07-25 — S6 (second slice): the canvas change-detection gate
- **Protects**: if this breaks, an external AI agent's `apply_workflow`
  overwrites the edits a user made *after* the agent fetched the workflow and
  nothing tells them — or, in the other direction, every apply carrying an
  `expectedRevision` is rejected and MCP-driven editing silently stops working.
- **Issue/PR**: #1020 / PR from `claude/qa-canvas-change-detection`
- **Outcome**: done — 25 passing cases in
  `packages/vscode/src/webview/src/stores/workflow-store.test.ts`, covering all
  23 cases the issue names, driven entirely through the store's public actions:
  - **A. The revision increments on content changes** — `addNode`,
    `confirmDeleteNodes`, `onConnect`, `updateNodeData`, a `position` change,
    and `setCanvas` with different content. `onConnect` gets its own case
    because it also rewrites every node with `selected: false`, so the correct
    answer is exactly 1, not 2.
  - **B. The revision ignores noise** — the load-bearing half, since a false
    increment kills every `apply_workflow` that carries an `expectedRevision`:
    `select` changes, `setCanvas` with fresh array identities but identical
    content (the fingerprint comparison, not the reference fast path, is what
    has to hold), a **staged** delete before `confirmDeleteNodes`, and
    unrelated store fields (`setWorkflowName`, `setSelectedNodeId`).
  - **C / D. `hasUnsavedChanges`** — the pristine-canvas heuristic with no
    `activeWorkflow` (boot state, extra node, edge present, renamed, two nodes
    that are not start+end), and the field-by-field comparison against a loaded
    workflow (node/edge count, name, an id the saved workflow lacks, a moved
    node, edited data, a rewired edge).
  - Verified the suite bites by hand-mutating and reverting the four things the
    issue names: dropping the `selected`/`width`/`height` strip in
    `contentFingerprint` (2 named failures), inverting the reference fast path
    (6), removing the node-position clause of the `activeWorkflow` comparison
    (1), and neutering the `nodes.length !== 2` pristine check (1).
- **Test infrastructure** (both questions the issue flagged, answered):
  - **`localStorage` stub** — needed, and it must be a `setupFiles` entry:
    the store reads `localStorage` while `create()` runs, i.e. at import time,
    so a per-test `vi.stubGlobal` is too late. Landed as
    `src/test/setup-browser-globals.ts` (in-memory `Storage`, also stubs
    `sessionStorage`), wired into the webview `vitest.config.ts` so every
    future store suite inherits it.
  - **`reactflow` under `environment: 'node'`** — works, no DOM needed. The
    store imports `applyNodeChanges` / `applyEdgeChanges` / `addEdge` from the
    `reactflow` barrel and they import cleanly, so **no `jsdom` devDependency
    was added and the shared node environment was left alone**. `@shared` is
    imported type-only and erases, so no alias config was needed either.
  - Note for future suites: `pnpm build` must run before the webview tests on a
    fresh checkout — they resolve `@cc-wf-studio/core` through its `dist`.
- **Case 11 (`dimensions`), resolved empirically**: React Flow v11 writes only
  `width` / `height` for that change type, both of which `contentFingerprint`
  strips, so the delta is **+0** — no over-report and no bug. The case asserts
  the node's key set alongside the delta, so if a future React Flow writes the
  measurement to a field the fingerprint does not strip, the test fails and
  says which field rather than passing for the wrong reason.
- **Bugs filed**: none new. Case 23 (the port-default disagreement at
  `workflow-store.ts:1503`) is asserted **as observed** and recorded as a third
  instance of **#1018** rather than a new issue, per that issue's own guidance.
  It is reachable: a workflow whose connection omits `fromPort` loads with
  `sourceHandle: undefined`, which `hasUnsavedChanges` reads back as
  `'default'` and compares against the saved `undefined` — so an
  agent-authored workflow reports unsaved changes the moment it loads, and the
  next sample-workflow load prompts the user to discard edits they never made.
  Severity is a spurious dialog, not data loss. Commented on #1018.
- **Residual scope on #1020**: none — sections A-D all landed. The undo/redo
  half of S6 (`partialize` / `equality` / `limit: 50` and the history clears in
  `clearWorkflow` / `setActiveWorkflow`) is explicitly out of scope in the
  issue and still wants its own issue; the `localStorage` setup file landed
  here unblocks it.

## 2026-07-25 — S6 (first slice): the MCP apply_workflow review gate
- **Protects**: if this breaks, the user approves an AI's rewrite of their
  canvas from a summary that does not match what is about to be written — a
  removed node missing from the list, or "no changes" shown for an apply that
  replaces three nodes. `computeWorkflowDiff` is the only thing that describes
  an incoming `apply_workflow` before it lands.
- **Issue/PR**: #1017 / PR from `claude/qa-workflow-diff-review-gate`
- **Outcome**: done — 25 passing cases in
  `packages/vscode/src/webview/src/utils/workflow-diff.test.ts`, covering the
  issue's 16 named cases. No new config: the module's only imports are
  `import type`, so it runs under the webview `vitest.config.ts` that landed
  with #1014 with no alias resolution, no DOM, no React. Sections:
  - **A. Node classification** — added / removed / modified asserted as the
    **whole three lists**, so a node landing in two categories fails; an
    unchanged node absent from all three; the `data.description || node.id`
    name fallback asserted on **both** sides, because it is written twice
    (`getNodeName` for canvas nodes, an inline expression for incoming ones)
    and a refactor may update only one; and the deliberate asymmetry where a
    typeless removed node reads `'unknown'` while a typeless added node passes
    `undefined` straight through.
  - **B. Connection counting** — matching sets count zero; a genuine add and a
    genuine remove count once each; duplicate parallel wires collapse to one
    key because both sides are `Set`s.
  - **C. `isNewWorkflow`** — the flag that switches the dialog heading
    (`DiffPreviewDialog.tsx:89`): true for an empty canvas and for the default
    start + end, but **false once the user has wired start → end**, since any
    edge at all disqualifies it.
  - **D. `totalChanges` / `nameChange`** — parameterised one scenario per term
    of the sum, so dropping any single term fails a case that names the missing
    term; plus the all-categories sum, the no-op apply (`totalChanges === 0` is
    what `DiffPreviewDialog.tsx:144` keys its "no changes" message off), and
    `nameChange` null versus `{ from, to }`.
  - Verified the suite bites by hand-mutating the four things the issue names
    and reverting each: dropping the `nameChange` term from `totalChanges`
    (2 named failures), inverting the `currentEdgeKeys.has` check (8),
    removing the `|| 'unknown'` type fallback (1), and relaxing
    `isNewWorkflow`'s `currentEdges.length === 0` clause (1).
- **Bugs filed**: #1018 — the diff compares serialized form rather than
  meaning, in two places, and both make the dialog **overstate** an incoming
  apply. (a) The two edge-key builders disagree on the port default
  (`sourceHandle ?? ''` vs `fromPort` verbatim, while `serializeWorkflow`
  normalizes null to `'output'`/`'input'`), so one unchanged wire counts as
  1 added + 1 removed. This is not just the null case: handle ids differ per
  node component (`StartNode` emits `out`, `SubAgentNode` emits
  `input`/`output`) while the authoring guide tells agents to write
  `"fromPort": "output"`, so a `start → subAgent` wire — the most common in
  the product — diffs as a change on every apply. (b) `modifiedNodes`
  compares `JSON.stringify(data)`, so a different key order reads as modified,
  and an `askUserQuestion` node reads as modified whenever an agent omits the
  option ids that `ensureNodeDataItemIds` generates on load.
- **Judgment — asserted as observed, not skipped**: four cases pin (a) and (b)
  as the code behaves today and therefore pass. Skipping them would have left
  the module's most-used path uncovered while the feature track decides;
  instead the cases are named after the mismatch and #1018 asks whoever fixes
  it to update them rather than work around them. Nothing here is a data
  defect — the diff is a summary and the apply itself is unaffected — so the
  cost is trust in the review gate, not a corrupted file.
- **Residual scope on #1017**: none — all 16 cases landed. The store half of
  S6 (undo/redo, `clearWorkflow`, unsaved-change detection) was sliced out of
  #1017 on purpose and still wants its own issue: `workflow-store.ts` reads
  `localStorage` at store-creation time (lines 342–359) and needs a stub this
  module does not.

## 2026-07-25 — S3: the canvas serialization round-trip
- **Protects**: if this breaks, the user opens a workflow in the canvas,
  presses save, and the file comes back different from what they had — a
  group's children detach and render outside it, a branch edge loses the
  condition that routed it, or the slash-command `model` / `allowedTools`
  they configured silently disappear from `workflow.json`.
- **Issue/PR**: #1014 / PR from `claude/qa-canvas-serialization-round-trip`
- **Outcome**: done — the **first tests in the webview package**, 41 passing
  + 1 skipped in `src/services/workflow-service.test.ts`, plus a minimal
  `vitest.config.ts` (node environment, `src/**/*.{test,spec}.ts`) so the
  suite does not inherit the React plugin from `vite.config.ts`. Sections:
  - **A. `deserializeWorkflow`** — parent-first ordering when the file
    declares children before their group (the load-bearing case: AI-authored
    files and `patch_workflow` output have no reason to declare a group
    first); `parentId` / `style` present only when the source node has them;
    `connections` → `edges` renames with `data` set to `{ condition }` only
    when a condition exists; load-time id backfill for `askUserQuestion`
    options and `branch`/`switch` branches, including the **identity** case
    (unchanged data returns the same reference, which is what stops needless
    re-renders); and the `ifElse` repair — 0 or 1 branch padded to two with
    the English `True`/`False` fallbacks **and `outputPorts: 2`**, versus a
    well-formed node returned untouched *without* `outputPorts`.
  - **B. `serializeWorkflow`** — name falling back to the node id; `style`
    narrowed to `width`/`height` with the key omitted entirely when neither
    is set; edge handles defaulting to `output`/`input`; and the
    `slashCommandOptions` block parameterised over all six options, so
    dropping any single clause of `hasNonDefaultOptions` fails a named case.
    Also `tour` only when non-empty, and the pass-through payloads.
  - **C. Round-trip** — one fixture (group + two grouped children + an
    `askUserQuestion` with labelled option edges + an `ifElse`) asserted as
    **whole node and edge arrays**, so a dropped field fails rather than
    slipping between field-by-field checks; plus a second round-trip.
  - Verified the suite bites by hand-mutating five things and reverting each:
    removing the parent-first sort, dropping the `allowedTools` clause from
    `hasNonDefaultOptions`, setting `edge.data` unconditionally, copying
    `node.style` wholesale instead of narrowing it, and dropping the
    `outputPorts: 2` from the `ifElse` repair in core. Each made a named
    assertion fail (2–4 tests each).
- **Bugs filed**: #1015 — `deserializeWorkflow`'s sort comparator is correct
  pairwise but is **not a transitive ordering**, so a nested group can be
  emitted before the group that contains it (observed: parent at index 2,
  nested child at index 0). Section D of the issue landed as `it.skip`
  naming #1015. Reachable only from an AI-authored or hand-edited file — the
  canvas never creates nested groups (`workflow-store.ts:591`) — hence
  moderate, not high. The bug notes the second, independent implementation
  of the same invariant (`sortNodesParentFirst`, `workflow-store.ts:189`)
  for the same fix pass.
- **Deliberately not filed as a bug**: `serializeWorkflow` mints a fresh
  `id` and resets `createdAt` on every save (lines 87, 93–94). Per the
  issue, this was judged rather than assumed: nothing in the product reads
  either field back (`createdAt` is only ever written — `refinement-service`
  preserves it defensively, no UI or exporter reads it), so it is dead
  metadata, not a user-visible defect. The suite asserts the **observed**
  behaviour and says so, rather than claiming preservation.
- **Note for the next iteration**: `sortNodesParentFirst` and the rest of
  `workflow-store.ts` remain uncovered — that is S6 and wants its own issue.
  `validateWorkflow` in the same module stays out of scope as a
  transcription of S1's ground.

## 2026-07-25 — S4: the `ccwf export` write contract
- **Protects**: if this breaks, `ccwf export` (and `ccwf run`, which shares
  `runExport`) overwrites the user's hand-edited `.claude/agents/*.md` or
  `.claude/skills/<workflow>/SKILL.md` without asking — silently and
  irreversibly, while still printing `✓ Wrote N file(s)`.
- **Issue/PR**: #1008 / PR from `claude/qa-cli-export-write-contract`
- **Outcome**: done — the **first tests in `packages/cli`** (its vitest config
  existed but the suite was empty). Two suites, 21 tests:
  - `src/commands/export.test.ts` (sections A–D). Every case asserts the
    **complete set of files** found by walking a temp output root, not a series
    of `exists` checks, so a stray write fails the test. Section A: the
    claude-code plan materialised from an empty root, nested dirs created,
    `writtenPaths` absolute under a *resolved* `rootDir`, and — parameterised
    over all three markers (`commandFilePath`, `pluginName`, `builtInType`) —
    **no agent file for a sub-agent the user already maintains**. Section B,
    the load-bearing one: a pre-existing sentinel refuses with `process.exit(1)`
    and leaves the sentinel byte-for-byte intact **and the non-conflicting
    agent files uncreated**, because the sweep completes before the write loop
    starts; `--overwrite` writes everything; and conflict detection keys off
    `cwd`, not `process.cwd()`. Section C: plan selection (codex writes nothing
    under `.claude/`, cursor mirrors sub-agents) and the Claude Code-only
    warning in both directions. Section D: `asSupportedAgent` rejecting with
    commander's `InvalidArgumentError` naming every agent, and `runExport`
    propagating a `WorkflowLoadError` while **writing nothing**.
  - `src/utils/load-workflow.test.ts` (section D, the exit-code half): missing
    file and malformed JSON each become a `WorkflowLoadError` with
    `exitCode === 2`, and a relative path in produces an **absolute** path in
    the message — this module is the `<file>` error contract every subcommand
    shares, so a regression here turns a typo into a raw stack trace.
- **On stubbing `process.exit`**: mocked to *throw*, per the issue. A no-op
  mock lets execution fall through into the write loop, so the conflict tests
  would have asserted the opposite of what really happens; the assertion is on
  the recorded call argument, not the thrown message.
- **Verified the suites bite** by hand-mutating six things and restoring each:
  the `!options.overwrite` conflict condition (1 test), the plan-selection
  ternary (13), `resolvePlanned` regressed to a cwd-relative `path.resolve`
  (1), the Claude Code-only warning (1), core's `commandFilePath` skip (1), and
  `path.resolve` in `loadWorkflowFromFile` (1). Each made a named assertion
  fail. The cwd-relative mutation was exercised only under the test that
  `chdir`s into a temp dir, so no mutation run could write into the repo.
- **Bugs filed**: none — the write path behaved as specified in every case.
  The two product-behaviour oddities #1008 flagged (a JSON file that parses but
  is not a workflow crashes with a `TypeError` stack trace; two sub-agent names
  that normalise to the same file name silently collide) are **still not
  filed** — the issue deliberately left them unasserted as feature-track
  questions, and this loop files at most one issue per run.
- **Residual scope on #1008**: none — all 14 named cases landed. The issue's
  own out-of-scope list (multi-agent atomicity, dry-run/JSON output, the
  `{meta, workflow}` wrapper, `--launch`) stays with `auto-dev`.

## 2026-07-25 — S5 (write half): the MCP write path and optimistic locking
- **Protects**: if this breaks, an external AI agent's `apply_workflow` /
  `update_nodes` call silently overwrites or corrupts the user's
  `workflow.json` — the only path in the product where an outside agent writes
  to the user's file — and nothing tells them until they reopen the canvas and
  find their edits gone.
- **Issue/PR**: #1006 / PR from `claude/qa-mcp-write-path`
- **Outcome**: done — two suites in `packages/mcp/src/`, plus shared fixtures
  in `__fixtures__/workflows.ts` (26 tests):
  - `file-adapter.test.ts` (section A): the four locking states — matching
    revision writes and reports the *new* hash, stale revision refuses with
    the *current* hash and **leaves the file byte-for-byte unchanged**, an
    absent `expectedRevision` writes unconditionally (the lock is opt-in), and
    a supplied revision against a missing file writes rather than conflicting
    (the `currentRevision !== null &&` guard). Plus `getCurrentWorkflow` on a
    missing file, the atomic write leaving no `.tmp` sibling, parent-directory
    creation, and the revision being sha256 over the content **including the
    trailing newline** — asserted against the newline-less hash explicitly,
    since that is the variant a regression would produce.
  - `tools.test.ts` (sections B + C): every case pairs the reply assertion with
    a file-on-disk assertion, because the failure that hurts is a write that
    happened when it should not have. `apply_workflow` — malformed JSON,
    validation refusal (validation treated as a black box), the success shape
    with `autoCreatedFiles` **absent** rather than empty, and the case worth
    naming: **a stale revision surfaces as `success: false` but NOT as
    `isError`**, because the handler wraps the adapter result in `ok()`, so a
    caller keying off `isError` alone would read a refused write as a success.
    `update_nodes` — batch atomicity (one unknown id in a batch writes
    nothing, not even the valid half), shallow merge, explicit-null deletion,
    the three type-change branches, and the destructive `parentId` pair:
    explicit `null` un-groups, an absent key leaves the grouping alone.
- **On the read→write race**: the first attempt at the revision-passthrough
  case asserted nothing — a mutation dropping the `revision ?? current.revision`
  fallback at `tools.ts:349` left the suite green, because with
  `expectedRevision: undefined` the adapter writes unconditionally and still
  reports success. The handler's read and write are back-to-back, so no test
  driving it from outside can get between them. Fixed with a test-only
  `RacingAdapter` that delegates to `FileWorkflowAdapter` and lands a
  concurrent write inside `getCurrentWorkflow`; the mutation is now caught.
  Recorded because the weak version looked correct and passed.
- **Verified the suites bite** by hand-mutating eight things and restoring each:
  the `currentRevision !== null` guard, the `'parentId' in update` guard, the
  `missingIds` atomicity check, the type-change replace branch, the revision
  fallback, the type-change-without-data refusal, the null-delete loop, and the
  trailing newline in the hash. Each made a named assertion fail.
- **Bugs filed**: none in `packages/*/src` — the write path behaved as
  specified in every case. Filed **#1011** (`qa`, not `bug`): `pnpm build`
  compiles test files and fixtures into `packages/core/dist`, which is in the
  published `files` list, so 29 test artifacts importing `vitest` ship to npm.
  Low severity (nothing reachable from the entry points imports them) but it is
  a regression this loop introduced and it grows with each suite. Not fixed
  here — the fix touches `packages/*/tsconfig.json`, build config the feature
  loop also owns, and it is unrelated to #1006.
- **Residual scope on #1006**: none — the issue is the write half of S5 and all
  18 named cases landed. The read/discovery half (`list_available_agents`,
  `get_workflow_schema`) is deferred by the issue itself: both reach outside a
  temp dir (`os.homedir()`, `import.meta.resolve`) with no injection point, so
  making them deterministic is a feature-track change, not a QA one.

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
