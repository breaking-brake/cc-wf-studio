---
name: cut-release
description: Cut a release for this pnpm + Changesets monorepo by creating and merging the Release PR. Use when the user says "リリースPR", "リリース準備", "リリースしたい", "リリースを切る", "productionにPR", or otherwise wants to publish accumulated changes. Releasing is deliberate and manual — you trigger the Release PR, review it, and merging it auto-publishes.
---

# Cut a Release

Turn the changesets accumulated on `main` into a published release.

**How releasing works here (Pattern A — confirm = release):**

```text
1. feature PR + .changeset/*.md  → merged to main   (just accumulates; no release)
2. "Create Release PR" workflow (manual dispatch)   → opens the Release PR
   = "chore(release): version packages" (bump + CHANGELOG preview)
3. merge the Release PR into main                   → release.yml (push:main) auto-publishes:
     - npm publish @cc-wf-studio/{core,mcp,cli} (OIDC)
     - git tags (incl. cc-wf-studio@x.y.z)
     - if cc-wf-studio bumped: build VSIX + attach to its GitHub Release
4. upload the VSIX to VS Marketplace / Open VSX      (manual, by the Repository Owner)
```

There is **no `production` branch and no manual publish dispatch** anymore. Merging the Release PR is the single deliberate "release now" action; publishing is automatic and coupled to that merge (so version numbers never skip). `production` is frozen/legacy — do not promote to it.

## Workflow

1. **Confirm there is something to release.**
   - `git fetch origin main --quiet`
   - `git ls-tree -r --name-only origin/main -- .changeset | grep -E '\.changeset/.+\.md$' | grep -v 'README.md'`
   - If that lists changeset files, there are pending changes to release. If empty, nothing is staged — stop (or a `pnpm changeset` is missing on the merged work).

2. **Open the Release PR** — manually trigger the workflow that runs `changeset version`:
   ```bash
   gh workflow run "Release — Create Release PR"
   ```
   (Or in the Actions UI: run the **"Release — Create Release PR"** workflow.) It opens/updates a `chore(release): version packages` PR collecting all pending changesets.

3. **Review the Release PR.** Check the proposed version bump(s) and the CHANGELOG diff per package. This is the moment to catch an unexpected major/minor or a missing entry. Wait for it to be created:
   ```bash
   gh pr list --search "version packages in:title" --state open \
     --json number,title,headRefName --jq '.[] | "#\(.number) \(.title) [\(.headRefName)]"'
   ```

4. **Merge the Release PR into `main`.** This is the release trigger.
   - Merging pushes the bump commit to `main` → `release.yml` runs and auto-publishes (npm + tags + VSIX).
   - Watch it: `gh run watch` / `gh run list --workflow "Release — Publish" --limit 1`.

5. **Publish to the stores (manual).** Once the run finishes, the VSIX is attached to the `cc-wf-studio@x.y.z` GitHub Release. The Repository Owner downloads it and uploads to the VS Marketplace and Open VSX via the publisher portals. CI does not run `vsce publish` / `ovsx publish`.

## Notes

- **Batching:** to avoid frequent/jumpy version numbers, don't trigger the Release PR on every change — let changesets accumulate on `main`, then cut a release when ready. Multiple pending changesets collapse into a single bump (highest level wins; patch×N = one patch).
- **What if more work lands after merging the Release PR?** It just becomes the next release (next version). Because publish is coupled to the merge, you won't get an unpublished "phantom" version.
- **No store automation:** the GitHub Release `.vsix` is the source artifact for the Marketplace listing — the store upload stays a manual owner step.
- See `docs/release-flow.md` for the full reference.
