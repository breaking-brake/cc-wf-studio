---
name: next-task
description: Autonomously pick and execute the single most valuable next task for this repo — read IMPLEMENTATION_PLAN.md, the progress log, and the open-issue backlog, choose one task, implement it on a branch, open a PR, and log the outcome. Use when the user says "次のタスク", "next task", "何か進めて", "続きをやって", or wants continuous autonomous progress without specifying what to do.
---

# Next Task (Ralph loop)

One invocation = one loop iteration: **orient → select → execute → record**.
The human steers by editing `IMPLEMENTATION_PLAN.md` (the North Star and
priorities), not by picking individual tasks. Guardrails live in
`docs/task-automation.md`.

## 1. Orient (run in parallel)

- `IMPLEMENTATION_PLAN.md` — North Star, current priorities, Not Doing list
- `docs/progress-log.md` — recent iterations; **never repeat a task marked
  done or abandoned there**
- Backlog: `gh issue list --state open --limit 200 --json number,title,labels`
- Health: `gh issue list --state open --label ci-failure` and open Dependabot
  PRs (`gh pr list --author "app/dependabot"`)
- `git status` / current branch — if a previous iteration left unfinished
  work, finishing or unblocking it beats starting anything new.

## 2. Select ONE task

Score candidates against this priority order (higher wins):

1. **Broken beats new**: open `ci-failure` issues, red CI on main
2. **Security**: actionable vulnerability findings
3. **Human-reported bugs**: issues labeled `bug` not authored by automation
4. **North Star advancement**: the open issue (or plan item) that most
   directly serves the current priorities in `IMPLEMENTATION_PLAN.md`
5. **Triage**: issues labeled `needs-triage` — validate, refine, or close them
6. **Meta tasks** (backlog empty or nothing above applies — pick one):
   - Docs: sync `docs/architecture.md` / README with reality
   - Schema audit: zod schemas vs `workflow-schema.json` cross-reference
     (see the workflow-schema-tuning skill before touching the JSON)
   - Translation completeness audit (`.claude/rules/translation.md`)
   - Run the `backlog-scan` skill to replenish the backlog
   - Measure something: bundle size, activation time, CLI startup — file the
     numbers as an issue so future iterations can act on them

Tie-breakers: prefer small-and-shippable over large; prefer items with an
issue number (traceable) over ad-hoc ideas. **If the best candidate is a
large architectural change, do not start it** — write a design outline as an
issue comment instead and pick the next candidate.

State your selection and reasoning to the user in 2–3 sentences **before**
executing.

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
7. **Auto-merge on green CI only**:
   `gh pr merge <num> --squash --auto` — this merges into `auto-dev`
   automatically once CI passes, and never merges a red PR. If CI fails,
   fix and re-push; after 3 failed attempts, leave the PR open, label it
   `needs-triage`, and log the blockage instead of forcing it.

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
