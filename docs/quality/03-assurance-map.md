# Assurance Map

> **Status: draft, authored by an agent for a human to revise.**
> For every feature rated **A (automated test required)** in
> `docs/quality/02-feature-map.md` (layer 2), this reconciles what currently
> protects it against what should, and converts the result into a test-suite
> design and an order of work.

## What this document is for

```
[Layer 1] Product value   docs/quality/01-product-value.md
[Layer 2] Features        docs/quality/02-feature-map.md   → A=31 / B=6 / C=23 / frozen=7
[Layer 3] Assurance       ← this file
```

The scope is **the 31 A-rated features on `main`** (the ◇ rows still on
`auto-dev` are out of scope for now).

---

## 1. What protects the code today

Rather than assuming nothing exists, this is what is actually running.

| Mechanism | What it is | What it genuinely protects | What it does not |
|---|---|---|---|
| Type check (`pnpm check`) | `tsc --noEmit` + Biome | Type mismatches, syntax, formatting | **All behavior.** An error that type-checks passes straight through |
| Build (`pnpm build`) | Compiling every package | That it compiles | Same as above |
| MCP smoke test | `packages/mcp/scripts/smoke.mts` | That the tools are exposed, a `get_current_workflow` round-trip, that `highlight_group_node` is a no-op | The **write results** of `apply_workflow` / `update_nodes`, optimistic locking, interaction with validation |
| Manual E2E | A human using the extension | Failures you can see | **Failures you cannot see** (which is the definition of A) |
| Automated tests | **none** | — | — |

### What the survey turned up

**There is not a single automated test on `main`** (zero `*.test.ts` /
`*.spec.ts`). Every package's `test` script is still
`echo '... no tests yet'`.

**The MCP smoke test exists but CI never runs it.** `ci.yml` contains no
reference to `smoke`; it only runs when someone types
`pnpm --filter @cc-wf-studio/mcp run smoke` by hand. So today **the one
executable behavioral check in the repository is one nobody executes.** It is
the cheapest thing to pick up while building the foundation.

### Conclusion

**Of the 31 A-rated features, effectively zero are automatically protected.**
The smoke test's `get_current_workflow` round-trip is the sole exception, and
since it doesn't run in CI it has no power to stop a regression.

---

## 2. The assurance design

Turning 31 features into 31 tasks does not work. The design is **per test
suite, where one suite protects several features at once.**

| # | Suite | Where | A-rated features covered | Prereq |
|---|---|---|---|---|
| **S0** | Test infrastructure + CI gate | all packages / `ci.yml` | (none directly — the prerequisite for every other suite) | — |
| **S1** | Workflow validation | `core` schema/ + `resources/workflow-schema.json` | Validator behavior, consistency between the two schema representations, errors naming the offending node (**not the schema's own correctness — see below**) | S0 |
| **S2** | Artifacts | `core` generators + export services | Mermaid diagrams, Markdown instructions, Claude Code artifacts (against the spec), internal consistency of the shared 7-target generator, `ccwf render` | S0 |
| **S3** | Input/output round-trip | `core` types + each loader | `workflow.json` interoperability, load, save (the serialization half) | S0 |
| **S4** | CLI contract | `cli` commands | Exit codes, `ccwf export` write planning | S0, S3 |
| **S5** | MCP tool contract | `mcp` tools + file-adapter | `get_*`, `apply_workflow`, `update_nodes`, optimistic locking, stdio server responses | S0, S1 |
| **S6** | Canvas state transitions | `webview` stores | Undo/Redo, new/reset, unsaved-change detection, diff computation for review | S0 |
| **S7** | Variable substitution | `webview` utils/template-utils | `{{var}}` detection and substitution | S0 |

On S6: this does not change layer 1's decision to leave canvas **rendering**
on manual E2E. The target is the zustand store's state-transition logic,
which should be verifiable as plain functions without rendering React
(whether it runs standalone under vitest gets confirmed in S0).

### The limit of S2 — "specification" means different things per target

**The 8 targets are not symmetric.** The survey found this asymmetry:

| Target | Independent spec? | Reality |
|---|---|---|
| Claude Code | **Yes** | `packages/vscode/specs/001-cc-wf-studio/spec.md` — a pre-implementation spec-kit document specifying each frontmatter field and the naming rules in detail |
| The other 7 (Copilot / Codex / Cursor / Gemini / Antigravity / Zoo Code / Copilot CLI) | **No** | `core/services/agent-skill-export.ts`'s `generateAgentSkillContent` is a single generator applying one identical format (Mermaid + instructions + YAML frontmatter `SKILL.md`) to all of them |

**Even on the Claude Code side, taking the spec as ground truth is unsafe.**
Comparing `spec.md` against the current schema turned up a mismatch in the
allowed values of the `model` field (the spec lists only
`sonnet`/`opus`/`haiku`, while the schema now carries `CC_ONLY_MODELS` —
`haiku`, `fable`). **The spec has not kept up with the implementation.** Using
it as the expected answer would reproduce the same problem as S1: pinning
something wrong in place, wrongly.

S2 therefore splits in two.

**Claude Code artifacts (checked against `spec.md`)**: on the assumption the
spec may be behind, **a human must bring `spec.md` up to date before the
tests are written.** Against a revised spec, checking the generator is
meaningful.

**The other 7 targets (internal consistency of the shared generator)**: with
no independent spec, whether the format matches what each tool actually
expects **cannot be verified from inside this repository** (doing so would
need integration tests that run each tool, or transcribing each vendor's
official documentation into a spec — both separate projects). Only two things
are testable here:

1. **Internal consistency of the shared generator** — that every target
   produces a structurally sound `SKILL.md` from the same input (valid YAML
   frontmatter), and that per-target differences (only Cursor also emits
   Sub-Agent files, etc.) apply as intended.
2. **Agreement with the paths the README claims** — that files actually land
   in the output directories listed in the README's target table
   (`.github/skills/`, `.codex/skills/`, …). The README is maintained
   separately from the generator code, so a divergence there is a genuine
   defect by the same reasoning as S1.

"Whether each tool truly understands this format" falls squarely under the
boundary in section 5 (the behavior of the consuming agent is out of reach).

### The limit of S1 — the schema's "correctness" cannot be verified

**A schema is the specification itself, so its validity cannot be confirmed
by tests.** Write tests by reading the schema and you have transcribed the
spec. A test asserting "a prompt node requires a `prompt` field" exists
because the schema says so — **and if the schema itself is wrong, the test
passes while being just as wrong.** It is a mirror, not an inspection.
Whether a field *should* be required is a design decision; the answer lies in
actual usage and human review.

What *can* be detected is the **divergence between two independently
maintained representations**, because a divergence is a defect regardless of
which side is right.

| Representation | Location | Role |
|---|---|---|
| zod schemas | `packages/core/src/schema/nodes/` | Runtime validation, property-panel SSoT |
| Authoring guide | `packages/core/resources/workflow-schema.json` | For AI agents. **Hand-written, not generated from code** |

CLAUDE.md states a cross-reference rule ("update `workflow-schema.json` when
you add a zod field, and vice versa"), but **the only thing enforcing it is
human discipline** — the classic setup for silent drift.

Comparing them, differences already exist:

| Node type | zod registry | Authoring guide |
|---|---|---|
| `branch` (legacy) | present | absent |
| `start` / `end` | absent | present |

These look **intentional** (legacy types shouldn't be authored by AI;
`start`/`end` carry no configurable fields). So **a naive "the two must
match" test fails immediately on legitimate differences.**

The property that carries meaning is one-directional:

> **Every node type and field described in the authoring guide is accepted by
> zod.**

That direction is the dangerous one. A field present in the guide but
rejected by the validator means **an AI trusts it, generates a workflow, and
the workflow fails validation** — a direct hit on pillar 4. The reverse (zod
accepts something the guide omits) is harmless; the AI simply never uses it.
Known intentional differences go in an explicit allowlist, and anything not
on that list fails.

**S1 therefore assures these four things**, and not the schema's own validity:

1. **Authoring guide → zod containment** (the one-way property above;
   intentional differences allowlisted)
2. **Validator behavior** (the implementation, not the schema's content —
   enum and boundary handling, and that errors name the offending node)
3. **Generator coverage against the schema** (every node type and field the
   schema permits is handled without being dropped)
4. **Regression pinning for defects that actually occurred** (reactive, but
   legitimate)

### Features that cannot be fully automated

Pillar 2's property-editing features (the schema-driven panel, the 12
per-type panels, sub-agent creation, sub-agent flow editing, and the Skill /
MCP / Codex dialogs) can only be **partially** automated:

| Layer | What it is | Assurance |
|---|---|---|
| Schema definition | zod schemas in `core` | **Covered by S1** |
| Schema → form-control mapping | `webview` control-registry | Verifiable in the same frame as S1 |
| Input value → node-data write-back | `webview` stores | **Covered by S6** |
| Actual rendering and interaction | React components | Left to manual E2E |

The basis for the A verdict was "the value you typed isn't saved, or lands in
a different field". **That risk lives in the upper three layers, not in the
rendering layer.** So S1 and S6 contain the real damage, which is consistent
with leaving rendering to manual E2E. This split re-applies layer 1's
"webview rendering stays on manual E2E" decision **per layer** rather than
per feature.

By the same reasoning, the extension-side save/load (`extension` save/load)
needs VSCode API mocks, but **the actual risk is in serialization, not in the
API call.** S3 covers the substance, so the VSCode-dependent parts (target
path, overwrite confirmation) stay on manual E2E.

---

## 3. Order of work

| Order | Suite | Why here |
|---|---|---|
| 1 | **S0** | Prerequisite for everything. Also connect the existing MCP smoke test to CI |
| 2 | **S1** | Cheapest and broadest. A false success (validation lying) does the most damage |
| 3 | **S2** | Artifact errors are invisible on the user's machine and surface wherever the agent ran |
| 4 | **S5** | The path where files are handed to an AI. Trust breaks most easily here (pillar 4) |
| 5 | **S3** | Divergence between entry points. Also a prerequisite for S4 |
| 6 | **S4** | Users wire exit codes into CI, so a lying exit code cascades |
| 7 | **S6** | The "unrecoverable" class, such as undo not undoing |
| 8 | **S7** | Small and standalone. Fits between other work |

The principle is **prerequisite → size of damage → difficulty of detection.**
S1 comes before S2 because if validation lies, artifact errors stop being
detectable too — the error compounds.

---

## 4. Reconciling the existing `qa` backlog

The five issues filed earlier, judged against this design:

| Issue | Subject | Handling |
|---|---|---|
| #993 | vitest foundation + CI gate | **Matches S0.** Add connecting the MCP smoke test to CI |
| #994 | core workflow validation | **Corresponds to S1 but needed rewriting.** The original text ("each node type accepts its valid shape and rejects the wrong one") was a transcription of the schema. Replaced with S1's four points |
| #995 | core Mermaid / Markdown generation | **Part of S2 but needed rewriting.** Generation stays in scope, but the claim to assure "the 8 target formats" was wrong (no means of verification). Split into the Claude Code path (gated on revising `spec.md`) and the other 7 (internal consistency + README path agreement) |
| #999 | `ccwf validate` discovery and exit codes | **Out of scope.** Its subject (multi-file discovery, `--strict`) is an `auto-dev` feature. Only the exit-code contract moves to S4 |
| #1000 | `patch_workflow` structural edits | **Out of scope.** `patch_workflow` itself is an `auto-dev` feature. Revive on promotion |

**Actions taken**: #999 and #1000 were closed with rationale, to be re-filed
when `auto-dev` is promoted (leaving them open makes every implementation
iteration pick them up and reject them at premise verification, burning a run
each time). #994 and #995 were rewritten to the scopes above.

**Prerequisite**: before starting the Claude Code half of #995, a human must
revise the Export Format Details section of
`packages/vscode/specs/001-cc-wf-studio/spec.md` (the allowed `model` values,
among others) to match the current schema. Writing tests against a stale spec
pins the stale spec as the answer.

New issues are needed for S3, S4, S5, S6 and S7 — five in all. But the `qa`
queue's back-pressure limit is three, so they don't all get filed at once.
S0 → S1 → S2 stay at the head, and the ideation loop (`next-qa-idea`) refills
as they are worked off.

---

## 5. What this design decides not to protect

Recorded explicitly. **No automated tests will be written for the
following.**

- **The schema's own validity** (whether a field should be required, whether
  a node type's semantics are right) — it is the specification itself, so
  tests would only transcribe it. What is verifiable is the **consistency**
  between the two schema representations; the merits of the content are for
  usage and human review to judge (see "The limit of S1" in section 2)
- **Whether the 7 non-Claude target formats match what each tool expects** —
  no independent specification exists anywhere in the repository. What can be
  protected ends at the shared generator's internal consistency; conformance
  with the external tool cannot be guaranteed (see "The limit of S2")
- **Rendering and interaction** (canvas appearance, dragging, panel
  open/close, minimap, search UI, onboarding, i18n strings) — noticed at once
  and recoverable
- **VSCode-host dependencies** (command registration, webview messaging,
  save-path resolution) — mocking costs more than it protects. S3 holds the
  substance
- **Frozen features** (the Slack share set, Claude API upload, chat-UI AI
  editing) — writing tests for a feature you have decided not to touch
  contradicts the decision to freeze it
- **The actual behavior of external agents** (whether Claude Code interprets
  a generated skill correctly) — outside our control. What can be assured
  ends at "emitting the format the specification calls for"

That last point matters as a boundary. **What this product can guarantee ends
at the artifact matching its specification; the behavior of the agent
consuming it is beyond reach.** Blur that line and the scope of assurance
expands without limit.

---

## 6. Direction after the suites are complete — consolidate into the schema

**As the next phase after S0–S7**, the policy is to move every piece of logic
that can live in a schema definition into one. The repository already holds
this design in `.claude/rules/schema-driven-panels.md`, so this is not a new
direction but following it through.

### Why the number of tests drops

Moving a constraint into the schema changes it from **behavior** into
**specification**. The validator applies it automatically, the property panel
derives from it, the generator can assume it — the hand-written checks
disappear, and so do the tests guarding those checks.

What is easy to miss is that **the failure mode disappears along with the
testability**. "The schema's correctness cannot be tested" (section 2) still
holds, but a constraint written once and applied mechanically **cannot drift
between call sites** — and drift is exactly what those tests were catching.
The assurance burden shifts from tests to **schema design review**. Not a bad
trade, but it should be made deliberately.

### This policy raises the weight of S1

The more you consolidate, the closer the schema gets to a **single point of
failure**. The blast radius of a divergence between zod and the authoring
guide grows, so **S1's first item (the two-representation consistency check)
becomes more important the more you consolidate**, not less. What shrinks is
per-logic testing, not the consistency check.

### The boundary of what can be consolidated

Schemas are good at **structure** (shape, type, requiredness, enums, simple
dependencies). They are bad at the following, and forcing them in means
writing code inside `.refine()` — **which is behavior again, and needs
tests**:

- Cross-node invariants (exactly one `start`, no cycles, …)
- Constraints depending on external state (whether a referenced skill file
  exists)
- Temporal or ordering properties (the semantics of undo)

**"Consolidate everything into the schema" only relocates the problem unless
this boundary is stated.** Decide it before starting.

### Why this order is right

Building the tests first is what makes the refactor safe: **they are the
safety net.** Moving structure without assurance is precisely the work that
needs the net being built now.

There is a bonus, too. **By the time S0–S7 are written, "where did we end up
writing the most tests?" is a map of where the schema isn't pulling its
weight.** The features that needed the most individual test cases are the
best candidates for consolidation, so the distribution can set the priority
order when the work starts.
