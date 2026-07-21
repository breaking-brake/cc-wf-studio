---
name: backlog-scan
description: Scan the codebase for improvement candidates (bugs, refactoring targets, missing validation, docs drift, DX friction) and file them as deduplicated GitHub Issues. Use when the user says "バックログスキャン", "改善点を洗い出して", "タスクを補充して", or when the backlog looks thin. Judgment-layer discovery — mechanical detection (TODO comments, dependency updates, CI failures) is already handled by GitHub Actions, so do NOT re-file those.
---

# Backlog Scan

Analyze the codebase, judge which findings are genuinely worth doing, and file
them as GitHub Issues. This skill is the **judgment layer** of the task
pipeline described in `docs/task-automation.md` — read that file's
responsibility matrix if unsure whether something belongs here.

In remote/unattended sessions the `gh` CLI may be absent — use the GitHub MCP
tools instead (list issues, create issues, labels); commands below name `gh`
for brevity.

**Do not re-discover what the mechanical layer already covers:**

- TODO/FIXME/HACK comments → `todo-sync.yml` workflow (label `todo-comment`)
- Dependency updates → Dependabot PRs
- Security vulnerabilities → Snyk scan / Code Scanning
- Unattended CI failures → `scheduled-failure-issue.yml` (label `ci-failure`)

## Workflow

1. **Load the dedup base and direction first** (in parallel):
   - Open issues: `gh issue list --state open --limit 200 --json number,title,labels`
   - `IMPLEMENTATION_PLAN.md` (North Star + current priorities + Not Doing list)
   - Recent entries in `docs/progress-log.md`

2. **Scan** — pick 2–3 dimensions per run (rotate across runs rather than
   doing everything shallowly every time):
   - **Correctness**: suspicious error handling, unvalidated inputs at
     boundaries (MCP tool params, webview messages, CLI args), zod schemas in
     `packages/core/src/schema/nodes/` that drifted from actual node behavior
   - **Schema cross-reference rule**: fields present in the zod schemas but
     missing from `packages/core/resources/workflow-schema.json` (or vice
     versa) — CLAUDE.md requires these to stay in sync
   - **Docs drift**: `docs/architecture.md` / README vs actual code paths and
     commands; `.claude/rules/*` referencing things that moved
   - **Translation completeness**: per `.claude/rules/translation.md`, keys
     present in one locale but missing in others
   - **Refactoring**: duplicated logic across `packages/*`, dead code
     (especially around the discontinued Chat-UI AI editing features — but
     remember those are maintain-only, not remove-on-sight; propose, don't
     assume), oversized files/functions
   - **DX**: friction in build/test/preview loops, missing CLI conveniences,
     unclear error messages

3. **Filter hard before filing.** File an issue only if ALL hold:
   - Concrete and actionable (a specific file/behavior, not "improve quality")
   - You verified the problem actually exists in the current code (read it —
     don't file from pattern-matching alone)
   - Not a duplicate of an open issue (check titles AND skim likely bodies)
   - Not on the `Not Doing` list in `IMPLEMENTATION_PLAN.md`
   - Not a release/publish action (human-only, per CLAUDE.md)

4. **File (max 5 issues per run).** In English (repo rule). For each:

   ```bash
   gh issue create \
     --title "<imperative, specific title>" \
     --label auto-generated --label needs-triage --label <type> \
     --body "<body>"
   ```

   - `<type>`: one of `bug`, `enhancement`, `refactor`, `documentation`
     (create missing labels with `gh label create <name> --force`)
   - Body must include: **What/Where** (file paths), **Why it matters**,
     **Suggested approach** (1–3 bullets), **Evidence** (the code you read),
     and the line `Filed by the backlog-scan skill.`
   - If you found more than 5 worthwhile items, file the top 5 by value and
     list the rest in your session summary for the human — do not file them.

5. **Report** to the user: what was scanned, what was filed (with issue
   links), what was skipped and why.

## Boundaries

- **Issues only** — this skill never changes code. Implementation happens via
  the `next-task` skill or a human, always through a PR.
- Never close or edit human-authored issues.
- The 5-issue cap is per invocation and non-negotiable; quality over volume.
