# Feature Map

> **Status: draft, authored by an agent for a human to revise.**
> The implemented features hung off the four pillars defined in
> `docs/quality/01-product-value.md` (layer 1). The inventory was built by reading the
> code at `origin/auto-dev`. **The grouping and the failure judgments are
> interpretation** — rearrange what doesn't fit.
>
> Start with [`README.md`](./README.md) for the three-layer overview.

## What this document is for

```text
[Layer 1] Product value    docs/quality/01-product-value.md
    ↓
[Layer 2] Features         ← this file
    ↓
[Layer 3] Assurance        docs/quality/03-assurance-map.md
```

## How to read the tables

| Column | Meaning |
|---|---|
| Feature | The unit as the user sees it |
| Implementation | Main package / module |
| How failure appears | What the user experiences when it breaks |
| Verdict | One of the three below |

**The basis for the verdict** — the axis is not importance, it is **whether
the user can notice the failure and whether they can recover from it.**

| Mark | Meaning | Rationale |
|---|---|---|
| **A** | Automated test required | Unnoticeable, or unrecoverable. Human review does not catch it either |
| **B** | Automated test recommended | Hard to notice, or already too late once noticed. Priority after A |
| **C** | Manual E2E is enough | Noticed at once and easy to work around; automation costs more than it protects |

**The ◇ mark** means the feature exists on `auto-dev` but has not been
promoted to `main`. **It is out of scope for now and excluded from the
counts.** The inventory rows stay in the tables for later, so they can be
folded back in the moment `auto-dev` is promoted.

The reason for excluding them: the quality-assurance track (`auto-qa`)
branches from `main`, so code that isn't on `main` cannot be tested at all.
Listing items layer 3 cannot act on would only defer decisions.

---

## Pillar 1 — Close the gap between design and execution

Everything that turns what you drew on the canvas into an executable
artifact. **The A verdicts cluster here**, because an error in the generated
artifact is invisible on the user's own machine and only surfaces wherever
the agent later runs.

### 1-1. Authoring (drawing)

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Add / delete nodes | `vscode/webview` NodePalette, nodes/* | Can't place or remove from the palette. Obvious at once | C |
| Create / delete connections | `webview` WorkflowEditor, edges/DeletableEdge | Won't connect. Obvious at once | C |
| Connection validity check | `webview` WorkflowEditor `isValidConnection` | **Permits an invalid connection, so a broken workflow gets saved** | B |
| Duplicate node / selection | `webview` DuplicateButton, store | Properties or child nodes are dropped on duplication. **Hard to notice** | B |
| Clipboard (copy / cut / paste) ◇ | `webview` store `serializeSelection`/`pasteSelection` | Nodes or edges go missing on paste. **Hard to notice** | B |
| Group / ungroup ◇ | `webview` GroupNode, store `groupSelection` | Child coordinates jump, or parent-child links break, on ungroup | B |
| Align & distribute ◇ | `webview` store `alignSelection` | Doesn't line up. Visible | C |
| Arrow-key nudge ◇ | `webview` store `nudgeSelection` | Nothing moves. Obvious at once | C |
| Auto layout ◇ | `webview` utils/auto-layout | Layout comes out wrong. Visible | C |
| Undo / Redo | `webview` store (zundo temporal) | **A state you undid does not come back. Unrecoverable** | A |
| Edge-drop node creation ◇ | `webview` WorkflowEditor | Nothing is created / not connected. Obvious at once | C |
| Insert node into an edge (splice) ◇ | `webview` store `insertNodeOnEdge` | The original edge is duplicated or lost on insert. **Hard to notice** | B |
| Inline node rename | `webview` EditableNameField | Can't rename. Obvious at once | C |

### 1-2. Persistence (saving)

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Save workflow | `vscode/extension` save-workflow | **Reports a failed write as a success; leaves a corrupt file** | A |
| Load workflow | `vscode/extension` load-workflow | **Drops fields on load** | A |
| `{meta, workflow}` wrapper handling ◇ | `cli` utils/load-workflow | **Fails to unwrap and loses the contents** | A |
| Unsaved-changes guard | `webview` useUnsavedChangesGuard | Work disappears with no warning. **Unrecoverable** | A |
| New / reset workflow | `webview` store `clearWorkflow` | Clears without confirmation. **Unrecoverable** | A |
| Max-node limit setting | `extension` workflow-settings-service | The limit has no effect. Minor | C |

### 1-3. Artifacts (emitting)

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Agent skill / command generation | `core` generators + each `*-skill-export-service` | **The artifact disagrees with the canvas; the agent behaves differently** | A |
| Mermaid diagram generation | `core` generators | **The diagram misrepresents the actual flow** | A |
| Markdown (execution instructions) generation | `core` generators | **The instructions disagree with the actual flow** | A |
| Slash-command frontmatter options | `webview` SlashCommandOptionsDropdown | model / allowed-tools / hooks are emitted with values other than intended | A |
| Multi-agent export atomicity ◇ | `cli` export | **A half-written state is left behind** | A |
| Skip byte-identical files ◇ | `cli` export | Unnecessary writes happen. Minor | C |
| Dry-run / JSON output ◇ | `cli` export | The preview and the actual writes disagree | B |
| Run / agent launch | `extension` claude-code-service etc. | Doesn't launch. Obvious at once | C |
| Execution session status | `webview` ExecutionSessionPanel | Status display drifts. Minor | C |
| Live AI commentary during runs | `extension` commentary-* | Narration missing or off. Minor | C |

### 1-4. Validation (checking)

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Workflow schema validation | `core` validators | **Reports an invalid workflow as valid (a false success)** | A |
| Validation errors name the offending node | `core` node-display-name ◇ | You can't tell which node is wrong, so you can't fix it | B |
| Target-compatibility warnings | `extension` export-warning-service ◇ / `cli` validate --agent ◇ | **Misses an unsupported node; it breaks only at run time** | A |
| Claude-Code-only node guard | `webview` Toolbar `guardClaudeCodeOnly` | Exports to another agent with no warning | B |
| Problems panel / problem-node marking ◇ | `webview` WorkflowProblemsPanel | Doesn't show up in the list. Visible in the panel | C |
| CLI exit codes | `cli` validate / export | **Exit 0 stops meaning success; CI stops protecting anything** | A |

---

## Pillar 2 — Design agentic work, not just flowcharts

Everything covering the 13 node types and their settings. **Dropped
properties are A** — a setting that silently fails to save produces an
artifact that is quietly wrong.

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Schema-driven property panel | `webview` SchemaPropertyPanel, control-registry | **The value you typed isn't saved, or lands in a different field** | A |
| Per-node-type panels (12 kinds) | `webview` property/panels/* | Type-specific settings don't take effect | A |
| Variable (`{{var}}`) detection & substitution | `webview` utils/template-utils | **Substitutes wrongly, so a different value arrives at run time** | A |
| Branch node (ifElse / switch) conditions | `webview` if-else-panel, switch-panel | **Conditions are emitted wrongly, so a different path runs** | A |
| Sub-agent creation & selection | `webview` SubAgentCreationDialog, utils/agent-frontmatter | Frontmatter breaks and the agent can't read it | A |
| Sub-agent flow (nested) editing | `webview` SubAgentFlowDialog, store | **Nested-flow contents don't propagate correctly to the parent** | A |
| Skill node (browse / create / validate) | `extension` skill-service, skill-file-generator | Referenced skill missing, or the generated file is invalid | A |
| MCP node (server/tool pick, parameters) | `webview` McpNodeDialog, `extension` mcp-sdk-client | **Parameters are emitted wrongly, so an external tool is called wrongly** | A |
| MCP server/tool discovery & cache | `extension` mcp-cli-service, mcp-cache-service | Doesn't appear in the list. Visible in the dialog | C |
| MCP bearer-token management | `extension` SAVE/DELETE_MCP_BEARER_TOKEN | Can't authenticate. Obvious at once | C |
| Codex node settings (model / sandbox / reasoning) | `webview` CodexNodeDialog | Settings don't apply and it runs in the wrong mode | A |
| Human-in-the-loop nodes (askUserQuestion / branchSession) | `webview` ask-user-question-panel etc. | Options go missing; execution doesn't pause | A |
| Reference existing commands / agents | `extension` command-service | Doesn't appear in the list. Obvious at once | C |

---

## Pillar 3 — Neither the entry point nor the agent locks you in

Everything supporting "one `workflow.json`, three equivalent entry points,
eight export targets". **Divergence between entry points is A** — "passes in
the CLI, won't open in the extension" breaks the pillar's own premise.

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| `workflow.json` interoperability | `core` types + each entry point's loader | **Entry points interpret it differently. Passes in the CLI, won't open in the extension** | A |
| `ccwf render` | `cli` commands/render | Output disagrees with the actual flow | A |
| `ccwf validate` (multi-file / directory) ◇ | `cli` commands/validate | **Returns success having examined zero target files** (known defect #996) | A |
| `ccwf validate --strict` ◇ | `cli` commands/validate | CI can't detect warnings | A |
| `ccwf export` | `cli` commands/export | Same as the pillar-1 artifact row | A |
| `ccwf run` | `cli` commands/run | Doesn't launch. Obvious at once | C |
| `ccwf preview` | `cli` preview | Doesn't display, or the contents drift | B |
| `ccwf canvas` (editable) ◇ | `cli` canvas/* | **A save corrupts the file; an external change discards unsaved edits** | A |
| `ccwf samples` ◇ | `cli` commands/samples | Can't fetch a sample. Obvious at once | C |
| Read from stdin ◇ | `cli` render / validate | Breaks when piped | B |
| `ccwf install-skills` / `uninstall-skills` | `cli` commands | The skill isn't installed. Obvious at once | C |
| Export to 8 targets | `extension` each `*-skill-export-service` | Target-specific format comes out wrong | A |
| Agent CLI path auto-detection | `extension` cli-path-detector | Not found. Obvious at once | C |
| Operation as an MCP (stdio) server | `mcp` server + file-adapter | See pillar 4 | A |

---

## Pillar 4 — The AI can take part in the design

Everything resting on **handing the user's file to an AI**. One experience of
getting it back broken stops them using it forever, so every write path is A.

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| `get_current_workflow` / `get_workflow_schema` | `mcp` tools | The AI edits from a mistaken picture of the current state | A |
| `apply_workflow` (validate + persist) | `mcp` tools | **Corrupts the user's file** | A |
| `update_nodes` (partial update) | `mcp` tools | **Overwrites a node it shouldn't** | A |
| `patch_workflow` (structural edits) ◇ | `mcp` tools | **Node loss, broken group parenting, hang on a cycle** (known #997) | A |
| `validate_workflow` ◇ | `mcp` tools | Returns a false success to the AI | A |
| `export_workflow` ◇ | `mcp` tools | Same as the pillar-1 artifact row | A |
| `render_workflow` ◇ | `mcp` tools | The diagram is wrong, so the AI keeps editing on a false premise | A |
| Optimistic lock (`expectedRevision`) | `mcp` tools | **Concurrent edits silently drop one side's changes** | A |
| MCP server lifecycle (start / stop / port) | `extension` mcp-server-service | Doesn't start. Visible on the badge | C |
| Per-agent MCP config auto-writing | `extension` mcp-server-config-writer etc. | Config breaks and the agent can't connect | B |
| AI agent launching (8 providers) | `extension` ai-editing-skill-service | Doesn't launch. Obvious at once | C |
| Review-before-apply diff | `webview` DiffPreviewDialog, utils/workflow-diff | **The diff disagrees with the actual change, so you approve the wrong thing** | A |
| AI name / description / tour generation | `extension` workflow-name-generation etc. | Nothing is generated. Obvious at once | C |
| Skill import (reverse generation) | `extension` IMPORT_SKILL | Reconstruction is inaccurate. A human can see it | C |

---

## Features that don't hang off any pillar

These are implemented but don't connect cleanly to any of the four pillars.
Everything left in this table is a B or a C, so treating them as peripheral
rather than adding a pillar seems right.

| Feature | Implementation | How failure appears | Verdict |
|---|---|---|---|
| Copy as Markdown ◇ | `webview` Toolbar | Contents drift | B |
| Save as image (PNG) ◇ | `webview` utils/canvas-image | Nothing output / parts missing. Visible | C |
| In-canvas search ◇ | `webview` NodeSearchPanel | Doesn't find it. Obvious at once | C |
| Minimap / view modes / focus mode | `webview` MinimapContainer etc. | Display breaks. Obvious at once | C |
| Overview (read) mode | `webview` overview/* | The diagram drifts from reality | B |
| Workflow tour (play / generate) | `webview` TourPanel, Tour | Doesn't advance. Obvious at once | C |
| Start menu / sample gallery | `webview` StartMenu, SampleWorkflowDialog | The list doesn't appear. Obvious at once | C |
| What's New / announcement banner | `webview` WhatsNewDialog | Doesn't appear. No real harm | C |
| 5-language UI (en/ja/ko/zh-CN/zh-TW) | `extension/i18n`, `webview/i18n` | Untranslated strings appear. Visible | C |
| Theme following / responsive / panel handling | `webview` hooks/* | Display breaks. Obvious at once | C |
| Keyboard shortcut cheat sheet ◇ | `webview` KeyboardShortcutsDialog | Doesn't appear. Obvious at once | C |

---

## Frozen features (out of assurance scope)

Features declared **maintenance-only, no new work**. "Frozen" means what
CLAUDE.md already means for chat-UI AI editing: the code stays and ships,
but receives no investment. **They are therefore also out of scope for
automated tests** — writing tests for a feature you have decided not to
touch contradicts the decision to freeze it.

| Feature | Implementation | Reason for freezing |
|---|---|---|
| Share workflow to Slack | `extension` slack-share-workflow | Thin value |
| Sensitive-data scan before sharing | `extension` sensitive-data-detector | Follows the above (its only caller is Slack share) |
| Slack OAuth / token management | `extension` slack-oauth-service | Follows the above |
| Import from Slack (deep link) | `extension` slack-import-workflow | Follows the above |
| Upload skill to Claude API | `extension` claude-api-upload-service | Thin value |
| Edit-with-AI chat panel | `webview` RefinementChatPanel | Already maintenance-only (CLAUDE.md) |
| AI workflow generation dialog | `webview` AiGenerationDialog | Already maintenance-only (CLAUDE.md) |

**On the sensitive-data scan**: adding "the user's secrets never leave
unintentionally" to layer 1's *ground* was considered, but **freezing Slack
and the Claude API upload removed the basis for it.**

The reason is that the remaining outbound paths are different in kind. The
two frozen features sent content outward without the user thinking of it as
"sharing". What remains after the freeze is AI editing, AI generation, and
commentary — where **handing the content to an AI is the whole point**
(pillar 4), and doing so is not a defect. The shape of what needs protecting
is different, so stating it as a general rule in the ground would overreach.

**One open gap is worth stating plainly.** The Claude API upload never ran
through the sensitive-data scan at all — the detector's only call site is
`slack-share-workflow.ts:55` — so workflow content, including free-text
prompt fields where users are known to paste credentials, goes to the
Anthropic API unscanned.

**Freezing does not close this.** Frozen means no investment; the code still
ships and users can still invoke it, so the gap is live rather than deferred.
It is lower severity than the Slack case (the destination is the user's own
account, not a shared channel), but the secret still lands on an external
service and persists.

The resolution is a product decision rather than an assurance one, and it is
recorded as accepted risk in CLAUDE.md. Note the asymmetry: **adding a scan
means investing in a feature just declared thin value, whereas removing the
entry point is the option consistent with the freeze.**

---

## Totals and handoff to layer 3

**The current scope is features on `main` only** (◇ unpromoted rows excluded).

| Verdict | Count (main) | Handling in layer 3 |
|---|---|---|
| **A** Automated test required | **31** | Check each for existing coverage in the assurance map; file a `qa` issue where there is none |
| **B** Automated test recommended | 6 | The second wave, after A is worked through |
| **C** Manual E2E is enough | 23 | Deliberately not automated. **Recording that decision is the point** |
| — Frozen | 7 | Out of scope. No tests for features we won't touch |

For reference, the ◇ unpromoted rows are A=10 / B=7 / C=10, 27 in total.
Promoting `auto-dev` adds them on top: **A goes from 31 to 41, about 1.3×.**
Worth being aware that the promotion brings assurance debt along with the
features.

C rows are written out to keep a record of what we decided **not** to
protect. Without it, "why isn't this tested?" has to be re-answered every
time, and the answer eventually drifts to "let's just test everything".

**The distribution of A is clearly skewed.** Most of the 31 sit in artifact
correctness (pillar 1), dropped properties (pillar 2), cross-entry-point
agreement (pillar 3), and AI-mediated writes (pillar 4). All of those live in
`packages/core` and in each entry point's pure transforms — **layers that can
be tested without driving the UI.** Layer 1's decision to leave webview
rendering on manual E2E is consistent with this distribution.

Layer 3 (the assurance map) takes these 31 A rows, checks what currently
protects them (nothing), and converts the result into the `qa` backlog.
