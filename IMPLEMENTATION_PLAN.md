# Implementation Plan

The steering file for the autonomous value-creation loop. The `next-task`
skill reads this on every iteration to decide what to invent next. **Humans
edit this file; agents read it** (agents propose changes to it via issues,
never edit it directly). Loop mechanics live in `docs/task-automation.md`.

## North Star

> Continuously improve what users of cc-wf-studio can do and how it feels:
> authoring workflows on the canvas, driving them from the `ccwf` CLI, and
> editing them through AI agents via the MCP server.

<!-- Edit the North Star to redirect the loop. Keep it one sentence-ish:
     broad enough to generate proposals, narrow enough to rank them. -->

## Value Axes (ordered)

Every iteration's proposal must serve one of these. "A user would notice"
is the test — users of the product, not maintainers of the repo.

1. **Canvas / extension UX** — fewer steps to a working workflow, clearer
   errors and empty states, smoother edit → preview → export → share flow
2. **AI-editing quality** — the MCP tools and authoring schema guide agents
   to generate correct, idiomatic workflows on the first try
3. **CLI experience** — `ccwf` commands that are predictable, well-messaged,
   and cover real usage gaps

## What does NOT count as value — do not spend iterations on these

- Dependency version bumps (unless fixing a real, actionable vulnerability)
- Housekeeping for its own sake: TODO-comment cleanup, docs reorganization,
  refactors with no user-observable effect, metrics nobody asked for
- New features for the discontinued Chat-UI AI editing paths
  (RefinementChatPanel, AiGenerationDialog) — maintain-only per CLAUDE.md
- Automated test-suite buildout — **not this loop's job**, and no longer
  forbidden repo-wide: it belongs to the quality-assurance loop (`next-qa`
  skill, `auto-qa` branch, queue = Issues labeled `qa`). A feature PR is not
  expected to ship tests; it must never delete or skip an existing one
- Release/publish operations — human-only, always
- Large architectural rewrites without a human-approved design issue

## Maintenance policy

Broken beats new: red CI, open `ci-failure` issues, and actionable security
findings are **interrupts** — the loop fixes them first, then returns to
inventing. Everything else maintenance-shaped belongs on the list above.
