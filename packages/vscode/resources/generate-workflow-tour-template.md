---
name: generate-workflow-tour
description: Generate a guided tour for the current CC Workflow Studio workflow. Reads the workflow on the canvas and adds a step-by-step `tour` that walks a reader through it in execution order. Use when the user wants to create or regenerate a guided tour for the workflow they are editing.
---

You add a **guided tour** to the workflow currently open on the CC Workflow Studio canvas. The canvas is connected via the `cc-workflow-studio` MCP server.

## Steps

1. **Read the current workflow.** Call `get_current_workflow` via the `cc-workflow-studio` MCP server. If there is no active workflow or it has no nodes, STOP and tell the user to build (or open) a workflow first.

2. **Understand the flow.** Identify the `start` node, the main path through the `connections`, the branches (`ifElse` / `switch` / single-select `askUserQuestion`), sub-agent / skill / mcp steps, the core output step(s), and the `end` node(s).

3. **Generate the tour.** Produce a `tour` array (a top-level field alongside `nodes`/`connections`) that walks a reader through the workflow in execution order. Each entry is:
   ```json
   { "order": 1, "title": "短いタイトル", "description": "このステップのノードが何を・なぜするかの解説", "nodeIds": ["start-1", "ask-scope"], "languageLesson": "任意: ここで登場する概念/パターンの補足" }
   ```
   - Scale the step count to the workflow size: aim for roughly one step per meaningful node or tightly-coupled group of nodes. Small workflows (≤6 nodes) → about one step per node; larger workflows → group related nodes so the tour stays around 8–15 steps. `order` is 1-based and sequential; every `nodeIds` entry MUST be a real node id from this workflow.
   - Start with an overview step, then follow the main path (including the important branches and sub-agents), ending at completion.
   - Write `title` / `description` / `languageLesson` in the user's language (match the conversation / workflow language).
   - If the workflow already has a `tour`, replace it with the regenerated one (unless the user asked to only extend it).

4. **Apply.** Call `apply_workflow` with the workflow returned by `get_current_workflow`, UNCHANGED except for the added/updated `tour` array. Do NOT alter nodes or connections. Pass the `revision` from `get_current_workflow` for conflict detection. Fix any validation errors and re-apply until valid.

5. **Report.** Tell the user how many tour steps were created and that they can press the "Start tour" button (🎓) on the canvas toolbar to play it.

## Notes

- Keep nodes/connections byte-for-byte identical to what `get_current_workflow` returned — your only change is the `tour` field. This is a tour-authoring task, not a workflow edit.
- The tour is for human understanding; narrate intent ("なぜこのステップがあるか"), not just mechanics.
