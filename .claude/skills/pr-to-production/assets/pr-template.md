## Summary

Merge latest changes from `main` to `production` for automated release vX.Y.Z.

## Included Changes

### Features
- feat: [description] (#PR)

### Bug Fixes
- fix: [description] (#PR)

### Enhancements
- chore: [description] (#PR)

## Release Version Calculation

**vX.Y.Z** (minor/patch/major bump)

Semantic Release will analyze commits since the last release (vA.B.C):
- ✅ `feat: [desc]` (#PR) → **minor bump**
- ✅ `fix: [desc]` (#PR) → **patch bump**
- ❌ `chore: [desc]` (#PR) → no version bump

Result: **A.B.C + [bump type] = X.Y.Z**

## CHANGELOG.md Contents

The following will be included:
- [Feature/Fix descriptions]

Chore commits will not appear in CHANGELOG.

## Release Automation

This merge will trigger:
1. Analyze commit messages for version bump
2. Update version in package.json files
3. Generate CHANGELOG.md
4. Create GitHub release
5. Build and upload VSIX package
6. Sync version changes back to main

## Merge Strategy

**Use merge commit** (not squash) to preserve commit history for Semantic Release.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
