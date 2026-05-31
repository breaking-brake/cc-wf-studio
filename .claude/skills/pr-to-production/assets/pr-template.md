## Summary

Promote `main` to `production` to release the pending package version bumps. Versions and CHANGELOGs were already produced by the merged "Version Packages" PR (Changesets) — this PR only moves them to `production` for publishing.

## Packages to Release

| Package | production | → main (this release) |
|---|---|---|
| `@cc-wf-studio/core` | A.B.C | A.B.C |
| `@cc-wf-studio/mcp` | A.B.C | A.B.C |
| `@cc-wf-studio/cli` | A.B.C | A.B.C |
| `cc-wf-studio` (extension) | A.B.C | X.Y.Z |

(List only the rows that change; leave others as-is for context.)

## Included Changes

- [type: short description] (#PR)

## What Publishing Will Do

After this PR merges, manually run **Actions → "Release — Publish"** (`workflow_dispatch`, ref `production`). It will:

1. `pnpm changeset publish` — publish npm packages whose version is ahead of the registry (`@cc-wf-studio/{core,mcp,cli}`, via OIDC Trusted Publishing).
2. Create git tags, including `cc-wf-studio@X.Y.Z` for the extension.
3. If `cc-wf-studio` was bumped: build the VSIX and attach it to the GitHub Release.

**Note:** The VS Marketplace / Open VSX store upload is a separate manual step by the Repository Owner (downloads the VSIX from the GitHub Release) — CI does not publish to the stores.

## Preconditions

- [x] No pending `.changeset/*.md` on `main` (the "Version Packages" PR is merged).

## Merge Strategy

**Use a merge commit** (not squash) so `production` mirrors `main` exactly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
