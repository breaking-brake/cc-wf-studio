# Implementation Plan

The steering file for autonomous task selection. The `next-task` skill reads
this on every iteration to decide "the most valuable next step"; the
`backlog-scan` skill reads it to decide what is worth filing. **Humans edit
this file; agents read it** (agents propose changes via issues/PR comments,
never edit directly). See `docs/task-automation.md` for the full pipeline.

## North Star

> Continuously improve the workflow-authoring DX for both humans (canvas UI)
> and AI agents (MCP server + schema), so that creating and editing Claude
> Code workflows stays fast, safe, and predictable.

<!-- Edit the North Star above to redirect the loop. Keep it one sentence-ish:
     broad enough to generate tasks, narrow enough to rank them. -->

## Current Priorities (ordered)

1. Keep the pipeline healthy: green CI on main, no open `ci-failure` issues,
   Dependabot PRs triaged.
2. AI-authoring quality: keep the zod schemas
   (`packages/core/src/schema/nodes/`) and the AI-authoring guide
   (`packages/core/resources/workflow-schema.json`) consistent and effective.
3. Reduce friction in the edit→preview→export loop (CLI and extension).
4. Documentation that matches reality (`docs/architecture.md`, README,
   `.claude/rules/*`).

## Not Doing

- New features for the discontinued Chat-UI AI editing paths
  (RefinementChatPanel, AiGenerationDialog) — maintain-only per CLAUDE.md.
- Release/publish operations — human-only, always.
- Automated test-suite buildout: the repo's testing policy is manual E2E
  (CLAUDE.md). Do not file or pick "add unit tests" tasks unless a human
  changes this policy here first.
- Large-scale architectural rewrites without a human-approved design issue.

## How the loop runs

- Backlog lives in **GitHub Issues** (single source of truth for tasks).
- Discovery: Actions file mechanical findings; `backlog-scan` files judged
  findings; humans file anything.
- Execution: run the `next-task` skill (manually, or via a scheduled Claude
  session). Each iteration appends to `docs/progress-log.md`.
