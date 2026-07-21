# Task Automation Pipeline

How tasks are discovered, filed, selected, and executed in this repo — and
who is allowed to do what. Reference material; the operational rules that
agents follow live in the two skills (`backlog-scan`, `next-task`) and
`IMPLEMENTATION_PLAN.md`.

## Design: two layers

- **Mechanical layer (GitHub Actions)** — detection that needs no judgment:
  pattern-matchable, deterministic, safe to run unattended. Output is always
  *filed*, never *executed*.
- **Judgment layer (Claude Code skills)** — anything requiring code
  comprehension or prioritization. Runs inside a Claude Code session (on
  demand, or on a schedule via a Claude Code Remote routine), where a human
  is in the loop by default.

The backlog's single source of truth is **GitHub Issues**. There is no
TODO.md; `IMPLEMENTATION_PLAN.md` holds direction, not tasks.

## Two-stage branch flow: `auto-dev` → `main`

Agent-authored changes never target `main` directly. They flow through the
**`auto-dev` integration branch**:

```text
claude/<task> ──PR──▶ auto-dev ──promotion PR──▶ main
              (agent auto-merges     (HUMAN reviews the
               when CI is green)      accumulated diff and merges)
```

- **Per-task gate (automatic)**: each task is its own PR into `auto-dev`;
  the agent enables `gh pr merge --squash --auto`, so it lands only when CI
  (`pnpm check` + `pnpm build`) is green. A red PR never merges.
- **Promotion gate (human)**: when ready, a human opens a PR from `auto-dev`
  into `main`, reviews the accumulated diff task-by-task (the squash commits
  keep per-task boundaries visible), and merges. Prefer a **merge commit**
  for the promotion PR so those per-task commits survive on `main`; a squash
  also works (Changesets versioning reads `.changeset/*.md` files, not
  commit messages, so releases are unaffected either way).
- **Blast radius**: a catastrophic agent mistake lands in `auto-dev` at
  worst. Recovery is cheap and never touches `main`:
  `git push origin origin/main:auto-dev --force` resets the branch (any
  unpromoted work is discarded — check the diff first).
- **Freshness**: the `next-task` skill syncs `auto-dev` from `main` at the
  start of every iteration, so promotion PRs stay mergeable.
- **Recommended repo settings** (one-time, human): protect `main` (require
  PRs + review), and on `auto-dev` require the CI status check so auto-merge
  cannot bypass it. Enable "Allow auto-merge" in repo settings.

## Responsibility matrix

Agent-executed rows land in `auto-dev` on green CI; the human gate for all of
them is the **promotion PR (`auto-dev` → `main`)**. Human-executed work may
still PR straight to `main` as before.

| Task source | Discovered by | Filed as | Executed by | Human approval gate |
|---|---|---|---|---|
| TODO/FIXME/HACK comments | `todo-sync.yml` (weekly) | Issue, label `todo-comment` | `next-task` skill or human | promotion PR |
| Dependency updates | Dependabot (weekly) | PR (targets `main`) | Dependabot | PR review + merge |
| Security vulnerabilities | Snyk (`security-scan.yml`, weekly) | Code Scanning alerts; failures → `ci-failure` issue | human (or `next-task` for clear fixes) | promotion PR |
| Unattended CI/scan failures | `scheduled-failure-issue.yml` | Issue, label `ci-failure` | `next-task` skill or human | promotion PR |
| Code improvements, refactors, docs drift, DX | `backlog-scan` skill | Issue, labels `auto-generated` + `needs-triage` + type | `next-task` skill or human | promotion PR |
| Features / direction changes | human | Issue or `IMPLEMENTATION_PLAN.md` edit | either | PR review or promotion PR |
| User reports (bug/feature/question) | humans via issue templates | Issue | either | PR review or promotion PR |
| Meta tasks (docs, schema audit, measurements) | `next-task` fallback list | directly executed or filed | `next-task` skill | promotion PR |
| Releases (Release PR, publish, store upload) | — | — | **human only** | entire action is human |

## What automation may do WITHOUT asking

- File issues — always labeled `auto-generated`, always deduplicated, always
  capped (todo-sync: 10/run; backlog-scan: 5/run).
- Close an auto-filed issue whose underlying finding no longer exists
  (todo-sync does this; agents never close human-authored issues).
- Create branches (`claude/*`), commit, push those branches, open PRs
  **with base `auto-dev`**.
- **Merge its own PR into `auto-dev`** — only via `gh pr merge --auto` so a
  green CI run is a precondition, never a direct push of task work to
  `auto-dev`. (Direct pushes to `auto-dev` are allowed for exactly one
  thing: the `main` → `auto-dev` freshness sync merge.)
- Comment on issues/PRs with analysis or design outlines.

## What ALWAYS requires a human

- **Merging into `main` — including the promotion PR (`auto-dev` → `main`).**
  This is the universal gate: automation can propose and stage code, never
  land it on `main`.
- **Anything release-related** — running the Release PR workflow, merging the
  Version Packages PR, dispatching publish, store uploads (CLAUDE.md rule).
- Editing the North Star / priorities / Not Doing list in
  `IMPLEMENTATION_PLAN.md`.
- Changing the automation itself (workflows under `.github/`, the two skills,
  this document) — agents may propose such changes in a PR, but a reviewer
  should treat them as privilege changes, not ordinary code.
- Deleting issues, editing other people's issues/comments, closing
  human-authored issues.

## Running the loop

```text
(weekly, automatic)          (on demand / scheduled Claude session)
 todo-sync ─┐
 Dependabot ─┤→ GitHub Issues ←─ backlog-scan skill
 Snyk ───────┤        │
 failure rep.┘        ▼
               next-task skill ──→ claude/<task> → PR → CI green
                      │                              │ (auto-merge)
                      │                              ▼
                      │                          auto-dev
                      │                              │ promotion PR
                      │                              ▼ (HUMAN merge)
                      │                            main
                      └──→ docs/progress-log.md (loop memory)
```

- **Replenish**: run `/backlog-scan` when the backlog is thin (or let the
  weekly automations feed it).
- **Advance**: run `/next-task` for one autonomous iteration; run it
  repeatedly for a Ralph-style loop. For hands-off cadence, schedule a
  Claude Code session (e.g. a Claude Code Remote routine) that invokes
  `/next-task` — the auto-dev buffer plus the human promotion gate keeps
  this safe.
- **Promote**: when `auto-dev` has accumulated enough,
  `gh pr create --base main --head auto-dev`, review the whole diff, merge.
  If something in the batch is bad, revert that squash commit on `auto-dev`
  (or reset `auto-dev` to `main` and discard the batch) before promoting.
- **Steer**: edit `IMPLEMENTATION_PLAN.md`. That's the only lever needed;
  the loop re-reads it every iteration.

## Labels

| Label | Meaning | Created by |
|---|---|---|
| `auto-generated` | Filed by automation, not a human | workflows/skills (idempotent `gh label create --force`) |
| `todo-comment` | Synced from a code comment; auto-closes when the comment is removed | todo-sync |
| `ci-failure` | An unattended workflow run failed | scheduled-failure-issue |
| `needs-triage` | Agent-judged finding awaiting human confirmation | backlog-scan |
| `bug` / `enhancement` / `refactor` / `documentation` | Task type | backlog-scan / humans |
