---
name: pr-to-production
description: Create a release PR promoting main to the production branch in this pnpm + Changesets monorepo. Use when the user says "リリースPR", "productionにPR", "リリース準備", or wants to trigger a release. This promotes already-bumped versions to production so the manual "Release — Publish" workflow can publish them.
---

# PR to Production Branch (Release)

Promote `main` to `production` so the publish workflow can release the pending packages.

**Important: this repo uses Changesets, not semantic-release.** Versions are NOT computed from commit messages. The bump already happened earlier in the flow:

```
1. feature PR + .changeset/*.md            → merged to main
2. release-version-pr.yml opens/updates the
   "Version Packages" PR (bumps + CHANGELOG) → merged to main
3. main now carries bumped versions and consumed changesets
4. promote main → production               ← THIS SKILL creates that PR
5. Actions → "Release — Publish" (ref: production, manual workflow_dispatch)
   → publishes npm packages + uploads the VSIX if cc-wf-studio was bumped
```

So this skill's job is step 4: open a PR from `main` to `production` that mirrors the current state of main. It does **not** bump versions or write CHANGELOGs — those are already on main.

## Precondition: no pending changesets on main

The release will silently no-op (and a CI guard fails the promote) if unconsumed changesets are still on main — that means the "Version Packages" PR has not been merged yet. Check first:

```bash
git fetch origin production main --quiet
git ls-tree -r --name-only origin/main -- .changeset | grep -E '\.changeset/.+\.md$' | grep -v 'README.md'
```

If that lists any `.changeset/*.md` besides `README.md`, **stop** and tell the user to merge the "Version Packages" PR first. Only proceed when there are none.

## Workflow

1. **Fetch latest** (required first): `git fetch origin production main --quiet`. Always compare against remote refs (`origin/main`, `origin/production`) — local branches may be stale.

2. **Check the precondition** above (pending changesets). Abort if any remain.

3. **Gather context** (parallel):
   - `git log origin/production..origin/main --oneline` — commits to be released.
   - `git rev-list --count origin/production..origin/main` — confirm main is ahead. If `0`, there is nothing to release.
   - Read each `packages/*/package.json` `version` on `origin/main` to report the versions that will publish, and compare against `origin/production` to see which packages actually changed:
     ```bash
     for p in core mcp cli vscode; do
       echo "$p -> main: $(git show origin/main:packages/$p/package.json | grep '"version"' | head -1) | prod: $(git show origin/production:packages/$p/package.json | grep '"version"' | head -1)"
     done
     ```

4. **Create the PR**:
   - `gh pr create --base production --head main` using `assets/pr-template.md`.
   - Title: `Release: <summary>` (e.g. `Release: cc-wf-studio@3.34.3` for a single-package release, or `Release: core/cli/mcp + extension` when several bump together).

## What publishing does (for the PR body)

After this PR merges to production, the **manual** "Release — Publish" workflow (`workflow_dispatch`, ref `production`) runs `pnpm changeset publish`, which:

- Publishes to npm any of `@cc-wf-studio/{core,mcp,cli}` whose version is ahead of the registry (OIDC Trusted Publishing, no token).
- Creates the git tags (including `cc-wf-studio@x.y.z` for the private extension, since `privatePackages.tag` is on).
- If `cc-wf-studio` was bumped, builds the VSIX and attaches it to its GitHub Release. **The store upload to VS Marketplace / Open VSX is then a manual step by the Repository Owner** — CI does not run `vsce publish`.

## Merge strategy

Use a **merge commit** (not squash) so `production` mirrors `main` exactly — the publish step reads versions from the production tree, and the histories should stay aligned.

## PR Format

- **Language**: always write the PR title and body in English (repo rule).
- **Body**: use `assets/pr-template.md`.
