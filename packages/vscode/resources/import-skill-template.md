---
name: import-skill
description: Import a published Agent Skill (SKILL.md) into CC Workflow Studio as a visual workflow. Reads a procedural skill, maps its steps/branches/tool calls to workflow nodes using the schema, and renders it on the canvas via the built-in MCP server. Use when the user wants to turn an existing Claude Code / Agent Skill into an editable cc-wf-studio workflow.
---

You convert a **published Agent Skill** into a CC Workflow Studio workflow and render it on the canvas. The user's CC Workflow Studio canvas is connected via the `cc-workflow-studio` MCP server.

## Steps

1. **Choose the source skill.** Ask the user which published Skill they want to import (by name, or a path to a `SKILL.md` / command `.md`). If they already named one, skip the question. Resolve it from the available Skills list or the given path.

2. **Read the skill.** Read the full `SKILL.md` (frontmatter + body). Note its `name`, `description`, the ordered steps, any branches ("if X / otherwise", "depending on", numbered phases), user prompts (questions), and tool / sub-agent / MCP invocations.

3. **Judge whether it is procedural.** Only skills that describe an *ordered procedure* map cleanly to a workflow.
   - If the skill is a **reference / knowledge skill** (a pattern library, a style guide, pure documentation with no steps), STOP and tell the user it is not a procedural flow and therefore is not a good fit for a workflow — do not force it.
   - Otherwise continue.

4. **Get the schema.** Call `get_workflow_schema` via the `cc-workflow-studio` MCP server. Call `get_current_workflow` to see the current canvas (usually empty for a fresh import).

5. **Map the skill to nodes.** Translate the procedure into workflow nodes, choosing each node type by its role in the schema:
   - Sequential instruction / "do X" step → `prompt`
   - A question to the user with choices → `askUserQuestion` (single-select → one output port per option `branch-0..N`; multi-select / AI-suggested → single `output` port)
   - Conditional split ("if / else") → `ifElse`; multi-way ("depending on …") → `switch` (last branch `isDefault: true`)
   - Delegating to a sub-agent / `Task` → `subAgent` (prefer a `builtInType` of `explore` / `plan` / `general-purpose`)
   - Invoking another Skill → `skill`; invoking an MCP tool → `mcp`
   - Always start with exactly one `start` node and finish at one or more `end` nodes.
   Keep node `name` fields as ASCII slugs (`a-z0-9-_`); put human-readable Japanese (or the user's language) text in `data.label`, `questionText`, `description`, and `prompt`. Lay nodes out left-to-right (increase `x` per step; offset `y` for branches). Ensure every conditional output port has exactly one outgoing connection, and every non-start node has an input connection.

6. **Generate a guided tour.** Add a `tour` array to the workflow JSON (a top-level field alongside `nodes`/`connections`) that walks a reader through the workflow in execution order. Each entry is:
   ```json
   { "order": 1, "title": "短いタイトル", "description": "このステップのノードが何を・なぜするかの解説", "nodeIds": ["start-1", "ask-scope"], "languageLesson": "任意: ここで登場する概念/パターンの補足" }
   ```
   - Scale the step count to the workflow size: aim for roughly one step per meaningful node or tightly-coupled group of nodes. Small workflows (≤6 nodes) → about one step per node; larger workflows → group related nodes so the tour stays around 8–15 steps. `order` is 1-based and sequential; every `nodeIds` entry must be a real node id from this workflow.
   - Start with an overview step, then follow the main path (branches, sub-agents, the core output step), ending at completion.
   - Write `title` / `description` / `languageLesson` in the user's language (match the source skill / conversation language).

7. **Apply to the canvas.** Send the workflow (including the `tour` array) via `apply_workflow`. Fix any validation errors it returns and re-apply until valid. The canvas shows a "Start tour" button once the tour is present.

8. **Report.** Summarize the imported workflow: how many nodes, the main branches, the number of tour steps, and anything in the source skill that did not map cleanly (and was approximated or dropped). Invite the user to refine it on the canvas and to play the tour.

## Notes

- The goal is a faithful, **human-reviewable** reconstruction — it does not need to be a perfect round-trip. The canvas is where the user fixes the approximation.
- Preserve the source skill's intent and wording in node prompts so the workflow stays runnable as a Claude Code Skill after editing.
- See the schema's node-type role descriptions for `data` field requirements per type before emitting nodes.
