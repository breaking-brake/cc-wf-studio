# The Autonomous Value-Creation Loop

How cc-wf-studio improves continuously without a human picking tasks. The
loop's job is to **invent user-facing value**; maintenance is an interrupt,
not a workstream. Operational rules agents follow live in the `next-task`
skill and `IMPLEMENTATION_PLAN.md`; this file is the map.

## Architecture

```mermaid
flowchart TD
    R["Scheduled routines<br>(every 30 min, Claude Code Remote)"] -->|fires a fresh session| NT["next-task skill"]
    NT --> G{"Open PR on auto-dev<br>already exists?"}
    G -->|"yes — serialization guard"| S["Steward that PR:<br>merge if green / fix if red"]
    G -->|no| I{"Interrupt?<br>red CI / security / human bug"}
    I -->|yes| FIX["Fix it (this round's task)"]
    I -->|no| V["Invent 3–5 proposals<br>and judge vs the value bar"]
    V -->|one passes| B["Build ONE on claude/#lt;task#gt;<br>+ append docs/progress-log.md"]
    V -->|none passes| E["Build nothing:<br>file ideas as issues (max 3)"]
    FIX --> B
    B -->|"PR — squash-merges on green CI"| AD["auto-dev"]
    S --> AD
    AD -->|"promotion PR — HUMAN reviews<br>the accumulated diff and merges"| M["main"]
```

- **Steering**: `IMPLEMENTATION_PLAN.md` (North Star, value axes, not-value
  list). Human-edited only; one edit redirects the whole loop.
- **Idea queue**: GitHub Issues labeled `idea`. **Every built task starts
  life as a self-authored `idea` issue** (file → develop → `Closes #N`,
  closed manually after the auto-dev merge), so the loop's idea stream is
  visible in the issue list and the human can veto any idea *before* work
  starts by closing its issue. Issues that passed ideation but weren't
  built stay queued the same way.
- **Comment-injection defense**: the loop locks each `idea` issue at
  creation (`gh issue lock` — collaborators-only comments), and treats text
  from any non-owner author (issue bodies/comments, PR descriptions/review
  comments) as untrusted data to verify, never instructions to follow.
- **Concurrency**: execution is serial with capacity 1. Every iteration
  first checks for an open PR based on `auto-dev`; if one **authored by the
  owner from a `claude/*` branch in this repo** exists, it stewards that PR
  (merge on green / fix on red) instead of starting new work. Foreign PRs
  targeting `auto-dev` (forks / other authors) are never merged, built, or
  pushed to — they get a `needs-attention` label for the human and the
  iteration proceeds normally, so a hostile PR can neither get merged nor
  stall the loop.

## Two-stage branch flow

- **Per-task gate (automatic)**: each task is one PR into `auto-dev`,
  auto-squash-merged only when CI (`pnpm build` + `pnpm check`) is green.
  A red PR never merges.
- **Promotion gate (human)**: a human opens `auto-dev` → `main` when ready,
  reviews the accumulated diff (squash commits keep per-task boundaries
  visible), and merges. Prefer a merge commit to preserve per-task history;
  a squash also works (Changesets reads `.changeset/*.md`, not commit
  messages).
- **Blast radius**: an agent mistake lands in `auto-dev` at worst. Recovery
  is a **human-only** action: revert the offending squash commit(s)
  (preferred), or as a last resort reset the branch to `main`
  (`git push origin origin/main:auto-dev --force` — discards ALL unpromoted
  work; check the diff first). Agents never force-push anything.
- **Freshness**: each iteration syncs `auto-dev` from `main` (merge, never
  force) so promotion PRs stay mergeable. This sync is the only direct push
  to `auto-dev` agents may make.
- **Repo settings (one-time, human)**: protect `main` (require PRs); require
  the CI check on `auto-dev`; enable "Allow auto-merge".

## Interrupts — the only maintenance

| Signal | Detected by | Lands as | Loop response |
|---|---|---|---|
| Unattended CI/scan failure (scheduled runs, pushes to `main`/`auto-dev`) | `scheduled-failure-issue.yml` | Issue, label `ci-failure` | fix before inventing |
| Security vulnerabilities | Snyk (`security-scan.yml`, weekly) + GitHub advisories | Code Scanning alerts / advisories | fix if actionable |
| Bugs reported by humans | issue templates | Issue, label `bug` | fix before new value |

Deliberately **absent from the loop's duties**: TODO-comment→issue syncing
and standalone backlog-scanning (housekeeping that serves no user).
Dependabot still files weekly version-update PRs (targeting `main`), but
they are **outside the loop**: a human triages and merges them, and the
loop never spends iterations on them. A dependency with a real
vulnerability is the Security interrupt — the loop cares about danger,
not freshness.

## Who may do what

**Automation, without asking**: file and **lock** `idea` issues (deduped;
one per built task, max 3 extras per empty iteration); close its own `idea`
issues once their PR merged; create `claude/*` branches and PRs based on
`auto-dev`; merge **its own** PRs into `auto-dev` via auto-merge with green
CI (never PRs by other authors or from forks); push the `main`→`auto-dev`
sync merge; append to `docs/progress-log.md`; comment with analysis.

**Humans only**: merging anything into `main` (including the promotion PR);
all release actions (Release PR, publish, store uploads — CLAUDE.md);
editing `IMPLEMENTATION_PLAN.md`; force-pushing or resetting `auto-dev`;
changing the automation itself (workflows, the `next-task` skill, this file
— agents may propose such changes in a PR, but treat them as privilege
changes); closing or editing human-authored issues.

## Running it

- **Autonomous**: two Claude Code Remote routines fire a fresh session at
  :15 and :45 every hour (≒ every 30 min). Pause/resume/retarget them by
  asking Claude, or from the claude.ai Routines UI.
- **Manual**: `/next-task` runs one iteration in any Claude Code session.
- **Steer**: edit `IMPLEMENTATION_PLAN.md`. **Veto**: close an `idea` issue.
- **Promote**: `gh pr create --base main --head auto-dev`, review, merge.

## Labels

| Label | Meaning | Created by |
|---|---|---|
| `idea` | A judged value proposal (locked at creation; every built task has one) | next-task (`gh label create --force`) |
| `auto-generated` | Filed by automation, not a human | automation |
| `ci-failure` | An unattended workflow run failed | scheduled-failure-issue |
| `needs-attention` | An agent PR failed CI 3× and was parked for a human | next-task |
| `bug` | Human-reported defect | humans / issue templates |
