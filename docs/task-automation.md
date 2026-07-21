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

## Responsibility matrix

| Task source | Discovered by | Filed as | Executed by | Human approval gate |
|---|---|---|---|---|
| TODO/FIXME/HACK comments | `todo-sync.yml` (weekly) | Issue, label `todo-comment` | `next-task` skill or human | PR review + merge |
| Dependency updates | Dependabot (weekly) | PR | Dependabot | PR review + merge |
| Security vulnerabilities | Snyk (`security-scan.yml`, weekly) | Code Scanning alerts; failures → `ci-failure` issue | human (or `next-task` for clear fixes) | PR review + merge |
| Unattended CI/scan failures | `scheduled-failure-issue.yml` | Issue, label `ci-failure` | `next-task` skill or human | PR review + merge |
| Code improvements, refactors, docs drift, DX | `backlog-scan` skill | Issue, labels `auto-generated` + `needs-triage` + type | `next-task` skill or human | PR review + merge |
| Features / direction changes | human | Issue or `IMPLEMENTATION_PLAN.md` edit | either | PR review + merge |
| User reports (bug/feature/question) | humans via issue templates | Issue | either | PR review + merge |
| Meta tasks (docs, schema audit, measurements) | `next-task` fallback list | directly executed or filed | `next-task` skill | PR review + merge |
| Releases (Release PR, publish, store upload) | — | — | **human only** | entire action is human |

## What automation may do WITHOUT asking

- File issues — always labeled `auto-generated`, always deduplicated, always
  capped (todo-sync: 10/run; backlog-scan: 5/run).
- Close an auto-filed issue whose underlying finding no longer exists
  (todo-sync does this; agents never close human-authored issues).
- Create branches (`claude/*`), commit, push those branches, open PRs.
- Comment on issues/PRs with analysis or design outlines.

## What ALWAYS requires a human

- **Merging any PR into `main`.** This is the universal gate: automation can
  propose code, never land it.
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
               next-task skill ──→ branch → PR → CI → human merge
                      │
                      └──→ docs/progress-log.md (loop memory)
```

- **Replenish**: run `/backlog-scan` when the backlog is thin (or let the
  weekly automations feed it).
- **Advance**: run `/next-task` for one autonomous iteration; run it
  repeatedly for a Ralph-style loop. For hands-off cadence, schedule a
  Claude Code session (e.g. a Claude Code Remote routine) that invokes
  `/next-task` — the PR-merge gate keeps this safe.
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
