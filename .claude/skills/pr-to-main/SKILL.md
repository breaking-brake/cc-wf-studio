---
name: pr-to-main
description: Create a PR to the main branch for feature/fix changes in this pnpm + Changesets monorepo. Use when the user says "PRを作成", "mainにPR", or wants to submit changes for review. Always run this in the monorepo-aware way — identify the affected package(s) and make sure a changeset exists, because the release pipeline is Changesets-driven.
---

# PR to Main Branch

Create a PR for a feature/fix branch targeting `main` in the cc-wf-studio monorepo.

This is a **pnpm monorepo with four packages** (`packages/core`, `packages/mcp`, `packages/cli`, `packages/vscode`) and versioning is driven by **Changesets**, not commit messages. Two monorepo facts shape this workflow:

- A release-worthy change must ship with a `.changeset/*.md` file in the same PR. Without it, the change merges but **never gets released** — and pending changesets later block promotion to production.
- Knowing *which package(s)* changed drives the changeset target, the PR scope, and the commit scope (e.g. `fix(vscode):`).

So the job here is not just "open a PR" — it's "open a PR that the release pipeline can actually act on."

## Workflow

1. **Gather context** (run in parallel):
   - `git status` (no `-uall`)
   - `git diff` (staged + unstaged) and `git diff origin/main...HEAD` for the full branch delta
   - `git log origin/main..HEAD --oneline` for every commit on the branch
   - Check whether the branch tracks a remote and needs pushing
   - `ls .changeset/*.md` to see whether a changeset already exists

2. **Identify scope and type**:
   - **Affected package(s)**: map changed paths to packages — `packages/core` → `@cc-wf-studio/core`, `packages/mcp` → `@cc-wf-studio/mcp`, `packages/cli` → `@cc-wf-studio/cli`, `packages/vscode` → `cc-wf-studio` (the VSCode extension). Changes outside `packages/` (root config, `.github/`, docs) usually need no release.
   - **Type**: read the commit prefix, allowing an optional scope — `fix:` / `fix(vscode):` → fix, `feat:` / `feat(core):` → feat, `improvement:` → improvement. Review **all** commits on the branch, not just the latest.

3. **Ensure a changeset exists** (the monorepo-critical step):
   - If a `.changeset/*.md` already covers this change, confirm it names the right package(s) and bump level, and move on.
   - If the change should be released and no changeset exists, create one with `pnpm changeset` — select the affected package(s) from step 2, choose patch/minor/major, and write a one-line summary (this becomes the CHANGELOG entry). Note: bumping `@cc-wf-studio/core` auto-bumps its dependents, so you don't author separate changesets for `cli`/`mcp`.
   - If the change genuinely needs no release (CI-only, tooling, docs), record that intent explicitly with `pnpm changeset add --empty` so the pipeline isn't left guessing.
   - Why this matters: the release flow (`release-version-pr.yml` → "Version Packages" PR → production → publish) only acts on consumed changesets, and a guard fails the promote if changesets are still pending. A PR without the right changeset is a silent no-op for releases.

4. **Verify the build is green** before opening the PR:
   - Run `pnpm check && pnpm build` from the repo root (Biome + type-checks, then full compilation). Reviewers and CI expect a clean tree, and catching breakage now is cheaper than after review.

5. **Select the PR template** based on type (from step 2):
   - `fix:` → `assets/fix-template.md`
   - `feat:` → `assets/feat-template.md`
   - `improvement:` → `assets/improvement-template.md`

6. **Create the PR**:
   - Push the branch with `git push -u` if it has no upstream.
   - Open it with `gh pr create --base main`, filling the chosen template.

## PR Format

- **Language**: always write the PR title and body in English (repo rule).
- **Title** — `main` merges via **squash**, so the PR title *becomes* the squash commit subject. It must therefore follow the commit convention: `<type>(<scope>): <description>`.
  - `<type>`: matches the change type from step 2 — `fix` / `feat` / `improvement` / `docs` / `refactor` / `chore` / `ci`.
  - `<scope>`: the affected package/area from step 2 — `vscode`, `cli`, `mcp`, `core` (use the directory name, not the npm name). List several as `(cli, mcp)`. **Omit the scope** for repo-wide changes (root config, `.github/`, top-level docs), e.g. `ci: guard against pending changesets`.
  - `<description>`: imperative mood, no trailing period, concise (aim ≤50 chars per the commit guideline; GitHub appends ` (#NN)` on squash, so don't pad it).
  - Examples (from this repo's history): `fix(vscode): parse Changesets-format CHANGELOG`, `feat(cli): ccwf install-skills subcommand`, `docs: add root README for the monorepo`.
- **Body**: in the **Changes** section, write real monorepo paths (`packages/vscode/src/...`, `packages/core/...`), not generic placeholders.
- Mention the changeset in the body so reviewers can see the intended release effect — e.g. "Adds a `patch` changeset for `cc-wf-studio`" or "No release needed (empty changeset)".

## Templates

- **fix:** `assets/fix-template.md` — Problem/Solution with Current vs Expected behavior.
- **feat:** `assets/feat-template.md` — Summary/Motivation/Changes.
- **improvement:** `assets/improvement-template.md` — Before/After comparison.
