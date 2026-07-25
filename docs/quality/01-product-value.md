# Product Value

> **Status: draft, authored by an agent for a human to revise.**
> The facts below are drawn from the README, `IMPLEMENTATION_PLAN.md`, and
> the implementation (node definitions, CLI subcommands, MCP tools); the
> decomposition into pillars is interpretation. **How the pillars are cut is
> the substance of this document** — rearrange freely.
>
> Start with [`README.md`](./README.md) for the three-layer overview.

## What this document is for

The top of a three-layer, top-down definition of what quality assurance must
protect.

```
[Layer 1] Product value    ← this file. Why it exists, what it promises
    ↓
[Layer 2] Features         which features deliver that value
    ↓
[Layer 3] Assurance        what proves those features still work
```

Layers 2 and 3 live in separate documents. **If layer 1 stays vague, the
lower layers drift into "test whatever is easy to test"**, so this one gets
settled first.

---

## 1. Why this product exists

### The problem it solves

Getting an AI coding agent to do something complex means designing the
procedure, and that design work degenerates into prompt-guessing. The root
cause is a mismatch of representation: **humans think visually, agents read
Markdown.**

Turning "do A, then B or C depending on the result, and hand B to a separate
agent" directly into prose carries three costs:

- You write without seeing the whole, so missing branches and dependencies
  go unnoticed
- You cannot tell whether what you wrote behaves as intended until you run it
- Switching agents means rewriting everything for the new format

### The value it delivers, in one sentence

> **A workflow you design visually on a canvas becomes, without any
> guesswork in between, an artifact an AI agent understands and executes.**

This restates the README's tagline — "You think visually. AI thinks in
`.md`. CC Workflow Studio speaks both." — in this document's terms.

---

## 2. The pillars of value

Product value decomposed into four pillars. **The layer 2 feature map hangs
off these pillars.**

Each pillar states what is lost when it breaks, because that is what sets the
priority order for layer 3.

### Pillar 1 — Close the gap between design and execution

**The promise**: the structure you draw on the canvas becomes an artifact the
agent can execute (skill and agent files under `.claude/`, `.codex/`,
`.cursor/`, and so on) with no interpretation step in between.

**Why it is wanted**: design and implementation are one and the same
artifact, so "the diagram is right but the prompt is wrong" cannot happen by
construction.

**What is lost when it breaks**: if the generated artifact disagrees with the
canvas, the reason to use this product evaporates. The user does not notice
the disagreement and runs it anyway, so **the damage surfaces not on their
desk but wherever the agent ran.**

### Pillar 2 — Design agentic work, not just flowcharts

**The promise**: the building blocks are the ones AI agent orchestration
actually needs. There are currently 13 node types, grouped by role:

| Group | Nodes | Purpose |
|---|---|---|
| Control | `start` `end` `ifElse` `switch` | Execution order and branching |
| Executor | `prompt` `subAgent` `subAgentFlow` `codex` | Run in the main session, or delegate to an isolated sub-agent |
| Capability | `skill` `mcp` | Invoke a Claude Code Skill or an external MCP tool |
| Human in the loop | `askUserQuestion` `branchSession` | Offer choices; pause for human confirmation |
| Organization | `group` | Visual grouping with no effect on execution |

**Why it is wanted**: delegation to sub-agents, skill invocation, and human
checkpoints are available as vocabulary from the start, so the designer can
spend their attention on composing them.

**What is lost when it breaks**: losing expressiveness means real workflows
cannot be expressed, and the user falls back to hand-written prompts — which
is the motivation for using the product at all.

### Pillar 3 — Neither the entry point nor the agent locks you in

**The promise**: one `workflow.json`, three equivalent entry points, eight
export targets.

| Entry point | Used for |
|---|---|
| VSCode extension | Designing visually. The most ergonomic entry point |
| CLI (`ccwf`) | Terminal, CI, SSH, Codespaces — render / validate / export / run / preview / canvas |
| MCP server (`ccwf-mcp`) | Letting an external AI client read and edit workflows |

Export targets: Claude Code, GitHub Copilot Chat, Copilot CLI, OpenAI Codex
CLI, Zoo Code, Gemini CLI, Antigravity, Cursor.

**Why it is wanted**: the absence of a VSCode-only path is itself the value.
The file you drew in the canvas is the file the CLI renders and the file an
external Claude Code edits over MCP. **Your workflows survive a change of
agent**, so no vendor captures them.

**What is lost when it breaks**: if the entry points diverge in how they
interpret a workflow, the premise collapses. "Validated fine in the CLI but
won't open in the extension" damages trust directly.

### Pillar 4 — The AI can take part in the design

**The promise**: through the MCP server, an AI agent can read, write, and
validate a workflow. "Add a branch here" works as a sentence.

Tools provided: `get_workflow`, `apply_workflow`, `patch_workflow`,
`validate_workflow`, `export_workflow`, `render_workflow`.

**Why it is wanted**: the design itself becomes something the AI can help
with, lowering the cost of both starting from nothing and improving what
exists. This is what value axis 2 of `IMPLEMENTATION_PLAN.md`
("AI-editing quality") points at.

**What is lost when it breaks**: this pillar rests on the user **handing
their file to an AI**. One experience of getting it back broken is enough to
stop them using AI editing forever. It is the pillar where trust is easiest
to destroy.

---

## 3. The ground every pillar stands on

Properties that are a precondition for all four pillars, independent of any
one feature. Layer 3 should treat these as the highest priority.

**The user's workflow file is the user's property.**
Canvas save, `ccwf export`, MCP writes — whichever path is taken, it must
leave either a valid file or an explicit failure, and never a broken file
left behind in silence. Every other failure is an inconvenience; this one
destroys something the user cannot get back.

**A reported success is true.**
When validation says valid and a command exits 0, it must actually be so.
**A false success is more harmful than a false failure**, because the user
acts on it.

---

## 4. What this product is deliberately not

A definition of value only acquires an outline once you say what is out of
scope.

- **Not a general-purpose workflow engine.** The subject is orchestration of
  AI coding agents, not general job execution for business systems.
- **Not an execution platform.** Execution belongs to the agent; this product
  covers design and artifact generation (`run` goes as far as launching the
  agent).
- **Chat-UI AI editing is discontinued.** `RefinementChatPanel` and
  `AiGenerationDialog` are maintenance-only; MCP-based editing is the
  supported path (see CLAUDE.md).

---

## 5. How the lower layers attach

Layer 2 (the feature map) enumerates features per pillar in this shape:

| Column | Content |
|---|---|
| Feature | The unit as the user sees it |
| Implementation | Package and module |
| Pillar | Which of pillars 1–4 it serves |
| How failure appears | What the user experiences when it breaks — **can they notice it, and can they recover?** |

That last column is the input to layer 3: **failures the user cannot notice
or cannot recover from get automated tests; failures they notice instantly
and can work around stay on manual E2E.**

Two rows to show the intended shape (one from pillar 1, one from pillar 3):

| Feature | Implementation | Pillar | How failure appears |
|---|---|---|---|
| Workflow export | `packages/core` generators + `packages/cli` export | 1 | Generated artifact disagrees with the canvas. **Unnoticeable, unrecoverable** → automated test required |
| Keyboard shortcuts | `packages/vscode` webview | 3 (ergonomics) | The key does nothing. **Noticed at once, easy to work around** → manual E2E is enough |

Whether that sorting rule is the right one is worth deciding together with
layer 1.
