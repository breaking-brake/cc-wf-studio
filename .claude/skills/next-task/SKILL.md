---
name: next-task
description: Run one unattended iteration of the autonomous value-creation loop — invent an improvement that users of cc-wf-studio would notice, judge it against an explicit value bar, implement it on a branch off auto-dev, open a PR that squash-merges on green CI, and log the outcome. Use when the user says "次のタスク", "next task", "何か進めて", "続きをやって", or wants autonomous progress without specifying what to do.
---

# Next Task — the value-invention loop

One invocation = one iteration:
**guard → interrupts → invent → judge → build & record (only if a proposal passes)**.

The default activity of this loop is **invention**: conceiving improvements
that a user of cc-wf-studio (the VSCode extension, the `ccwf` CLI, or the MCP
server) would actually notice. Maintenance exists only as an interrupt.
Housekeeping — dependency bumps, TODO-comment cleanup, docs reshuffling,
refactors with no user-observable effect, speculative metrics — **is not
work**; never fall back to it to look busy.

The human steers by editing `IMPLEMENTATION_PLAN.md` (North Star + value
axes); this skill reads it every iteration. Loop mechanics and safety rails
live in `docs/task-automation.md`.

Designed to run fully unattended (fired by scheduled routines as well as
invoked manually). In remote/unattended sessions the `gh` CLI may be absent —
use the GitHub MCP tools instead (create PR, enable auto-merge, merge,
list/create issues); commands below name `gh` for brevity.

## 0. Serialization guard — one in-flight task at a time

The loop may fire every 30 minutes, so iterations can overlap. **The idea
queue is GitHub Issues; execution is serial with capacity 1.** Before
anything else, check for an open agent PR: `gh pr list --base auto-dev --state open`.

- **If one exists, do NOT start a new task.** Become its steward instead:
  squash-merge it if CI is green; fix and re-push if red (counting toward its
  3-attempt limit); re-arm a ~15 min `send_later` check-in if CI is still
  running. Then end the iteration — advancing the in-flight PR IS this
  round's contribution.
- If none exists, continue below. Always branch from freshly fetched
  `origin/auto-dev` so each task builds on everything already merged.

## 1. Interrupts — the ONLY maintenance this loop does

Check, in order. If one fires, skip invention this round and fix it via the
Build steps below; then it's done — next round returns to inventing.

1. **Broken**: red CI on `auto-dev`, or open `ci-failure` issues
2. **Security**: actionable vulnerability findings (Snyk / advisories)
3. **Human-reported bugs**: issues labeled `bug` not authored by automation

Nothing else is maintenance. No interrupt → invent.

## 2. Invent → judge → select ONE improvement

Orient first (in parallel): `IMPLEMENTATION_PLAN.md` (North Star, value
axes, not-value list), `docs/progress-log.md` (never repeat done/abandoned
work), open issues labeled `idea` (proposals from earlier iterations),
`git status` (unfinished local work beats new work).

### Invent (3–5 proposals)

Think like a user, not a maintainer: walk the extension's canvas flow, run
`ccwf` commands, drive the MCP tools — where does it disappoint, confuse, or
stop short? Propose improvements nobody has filed yet; open `idea` issues
are candidates too, but your own fresh proposals are the point of this loop.

### Judge — the value bar (ALL must hold)

1. Serves a **value axis** in `IMPLEMENTATION_PLAN.md`
2. **A user would notice**: stateable as "a user can now X" or "a user no
   longer suffers Y" — if the sentence needs the word "internal", it fails
3. Shippable in one iteration: one PR, reviewable as a unit
4. Safe: reversible, no breaking API/schema change, not on the not-value
   list, not a release action
5. Verified: you read the relevant code and confirmed the premise is true
   (never build from pattern-matching alone)

### Select

Take the passing proposal with the best value-to-effort ratio. A large
architectural idea fails bar #3 — file it as an `idea` issue with a design
outline and take the next one.

**If NOTHING passes: build nothing.** File the most promising proposals as
issues (max 3, labels `idea` + `auto-generated`; create labels with
`gh label create <name> --force`), log the iteration, end. An empty
iteration is a valid outcome; filler and housekeeping are not.

State the winning proposal and its one-sentence user value **before**
building.

## 3. Build & Record

Agent work flows through the **`auto-dev` integration branch**, never
straight at `main`:

1. **Sync the integration branch**: `git fetch origin main auto-dev`. If
   `auto-dev` is behind `main`, merge `origin/main` into it and push — a
   rotten integration branch produces unmergeable promotion PRs. If the sync
   merge conflicts, stop and ask a human.
2. Branch from it: `git checkout -b claude/<slug> origin/auto-dev`
3. Implement the single selected task — resist scope creep; adjacent ideas
   become `idea` issues, not extra commits
4. **Record before committing**: append an entry to `docs/progress-log.md`
   (see the format at the top of that file): date, what shipped, the
   one-sentence user value, outcome (optimistically `done`), and proposal(s)
   for the next iteration. This log is the loop's memory — an iteration
   that doesn't log didn't happen. It must ride in the same commit as the
   change, BEFORE the PR opens; once auto-merge is armed, the branch can
   merge and disappear at any moment.
5. Quality gates from the repo root: `pnpm build && pnpm check` (build first —
   `packages/mcp`'s type-check needs core's built dist on a fresh checkout)
6. Changeset per CLAUDE.md (`pnpm changeset`, or `add --empty` for
   CI/docs-only), commit per the commit-message guidelines
7. Open the PR **with base `auto-dev`** (`gh pr create --base auto-dev`).
   Follow the pr-to-main skill's title/body conventions (`<type>(<scope>):`
   title, English, changeset noted) — but do NOT let it target `main`.
   Reference the issue with `Closes #NN` when one exists.
8. **Squash-merge on green CI only** — never merge red, never merge without
   CI having run. In order of preference:
   - `gh pr merge <num> --squash --auto` (or the GitHub MCP
     `enable_pr_auto_merge` tool): merges automatically the moment CI goes
     green. Requires "Allow auto-merge" in repo settings.
   - If auto-merge is unavailable: schedule a self check-in (`send_later`,
     ~15 min). When it fires, check the PR's CI status via the GitHub MCP
     tools; squash-merge if green, re-arm the check-in if still running.
   - If CI fails: fix and re-push; after 3 failed attempts, leave the PR
     open, label it `needs-attention`, amend the progress-log entry's
     outcome to `blocked` in a final push, and stop instead of forcing it.

## Boundaries

- One task per invocation. **Never push to `main`, never open or merge a PR
  whose base is `main`.** Agent merges are allowed only into `auto-dev`, only
  via a PR, and only with CI green. Promotion of `auto-dev` into `main` is a
  human-only action.
- Never perform release actions (Release PR, publish dispatch) — human-only
  per CLAUDE.md.
- Don't modify the North Star / value axes in `IMPLEMENTATION_PLAN.md`;
  propose changes to it as an issue instead.
- If genuinely blocked (ambiguous requirements, missing credentials, a
  decision only the human can make), stop and ask rather than guessing —
  and log the blockage in the progress log so the next iteration skips it.
