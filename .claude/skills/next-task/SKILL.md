---
name: next-task
description: Run one unattended iteration of the autonomous dev loop — creatively propose value improvements for this repo, judge them against an explicit value bar, implement the winner on a branch off auto-dev, open a PR that squash-merges on green CI, and log the outcome. Use when the user says "次のタスク", "next task", "何か進めて", "続きをやって", or wants continuous autonomous progress without specifying what to do.
---

# Next Task (Ralph loop)

One invocation = one loop iteration:
**orient → propose → judge → execute (only if a proposal passes) → record**.
The human steers by editing `IMPLEMENTATION_PLAN.md` (the North Star and
priorities), not by picking individual tasks. Guardrails live in
`docs/task-automation.md`.

This skill is designed to run **fully unattended** (fired by a scheduled
routine as well as invoked manually). In remote/unattended sessions the `gh`
CLI may be absent — use the GitHub MCP tools instead (create PR, enable
auto-merge, merge, list/create issues); commands below name `gh` for brevity.

## 1. Orient (run in parallel)

- `IMPLEMENTATION_PLAN.md` — North Star, current priorities, Not Doing list
- `docs/progress-log.md` — recent iterations; **never repeat a task marked
  done or abandoned there**
- Backlog: `gh issue list --state open --limit 200 --json number,title,labels`
- Health: `gh issue list --state open --label ci-failure` and open Dependabot
  PRs (`gh pr list --author "app/dependabot"`)
- `git status` / current branch — if a previous iteration left unfinished
  work, finishing or unblocking it beats starting anything new.

## 2. Propose → judge → select ONE task

This loop is **generative, not just a queue consumer**: each iteration
produces its own slate of value proposals, then judges them.

### Propose (3–5 candidates)

Mix two sources:

- **Backlog**: open issues worth doing now
- **Your own ideas**: read the code with the North Star in mind and propose
  improvements nobody has filed yet — DX friction you noticed, a small
  feature that serves the priorities, polish, docs that drifted. Idea seeds
  when nothing jumps out:
  - Docs: sync `docs/architecture.md` / README with reality
  - Schema audit: zod schemas vs `workflow-schema.json` cross-reference
    (see the workflow-schema-tuning skill before touching the JSON)
  - Translation completeness audit (`.claude/rules/translation.md`)
  - Run the `backlog-scan` skill to replenish the backlog
  - Measure something: bundle size, activation time, CLI startup — file the
    numbers as an issue so future iterations can act on them

### Judge — the value bar (ALL must hold to pass)

1. Serves the North Star or a current priority in `IMPLEMENTATION_PLAN.md`,
   or fixes something broken
2. The value is concrete — stateable in one sentence ("users get X",
   "contributors stop hitting Y")
3. Completable in this iteration: one PR, small enough to review as a unit
4. Safe: reversible, no breaking API/schema change, not on the Not Doing
   list, not a release action
5. Verified: you read the relevant code and confirmed the premise is true
   (never implement from pattern-matching alone)

### Select

Among passing candidates, pick by this priority order (higher wins), then by
value-to-effort ratio:

1. **Broken beats new**: open `ci-failure` issues, red CI
2. **Security**: actionable vulnerability findings
3. **Human-reported bugs**: issues labeled `bug` not authored by automation
4. **North Star advancement**: including your own passing proposals
5. **Triage**: issues labeled `needs-triage` — validate, refine, or close them

**If the best candidate is a large architectural change, it fails the bar** —
write a design outline as an issue instead and take the next candidate.

**If NOTHING passes: implement nothing.** File the most promising ideas as
issues (max 3, labels `auto-generated` + `needs-triage`), log the iteration,
and end. An empty iteration is a valid outcome; shipping filler to look busy
is not.

State the winning proposal, its one-sentence value, and why it beat the
alternatives in 2–3 sentences **before** executing.

## 3. Execute

Agent work flows through the **`auto-dev` integration branch**, never straight
at `main` (two-stage flow — see `docs/task-automation.md`):

1. **Sync the integration branch**: `git fetch origin main auto-dev`. If
   `auto-dev` is behind `main`, merge `origin/main` into it and push — a
   rotten integration branch produces unmergeable promotion PRs. If the sync
   merge conflicts, stop and ask a human.
2. Branch from it: `git checkout -b claude/<slug> origin/auto-dev`
3. Implement the single selected task — resist scope creep; adjacent findings
   become new issues (one `gh issue create` each), not extra commits
4. Quality gates from the repo root: `pnpm check && pnpm build`
5. Changeset per CLAUDE.md (`pnpm changeset`, or `add --empty` for
   CI/docs-only), commit per the commit-message guidelines
6. Open the PR **with base `auto-dev`** (`gh pr create --base auto-dev`).
   Follow the pr-to-main skill's title/body conventions (`<type>(<scope>):`
   title, English, changeset noted) — but do NOT let it target `main`.
   Reference the issue with `Closes #NN` when one exists.
7. **Squash-merge on green CI only** — never merge red, never merge without
   CI having run. In order of preference:
   - `gh pr merge <num> --squash --auto` (or the GitHub MCP
     `enable_pr_auto_merge` tool): merges automatically the moment CI goes
     green. Requires "Allow auto-merge" in repo settings.
   - If auto-merge is unavailable: schedule a self check-in (`send_later`,
     ~15 min). When it fires, check the PR's CI status via the GitHub MCP
     tools; squash-merge if green, re-arm the check-in if still running.
   - If CI fails: fix and re-push; after 3 failed attempts, leave the PR
     open, label it `needs-triage`, and log the blockage instead of
     forcing it.

## 4. Record

Append an entry to `docs/progress-log.md` (see the format at the top of that
file) **in the same PR**: date, task, why it was chosen, outcome, and
candidate(s) for the next iteration. This log is the loop's memory — an
iteration that doesn't log didn't happen.

## Boundaries

- One task per invocation. **Never push to `main`, never open or merge a PR
  whose base is `main`.** Agent merges are allowed only into `auto-dev`, only
  via a PR, and only with CI green. Promotion of `auto-dev` into `main` is a
  human-only action.
- Never perform release actions (Release PR, publish dispatch) — human-only
  per CLAUDE.md.
- Don't modify the North Star / priorities in `IMPLEMENTATION_PLAN.md`;
  propose changes to it as an issue or PR comment instead.
- If genuinely blocked (ambiguous requirements, missing credentials, a
  decision only the human can make), stop and ask rather than guessing —
  and log the blockage in the progress log so the next iteration skips it.
