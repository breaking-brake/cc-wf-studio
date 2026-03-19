---
name: pr-to-main
description: Create a PR to main branch for feature/fix changes. Use when the user says "PRを作成", "mainにPR", or wants to submit changes for review.
---

# PR to Main Branch

Create PR for feature branches targeting main.

## Workflow

1. **Gather context** (parallel):
   - `git status` (no -uall flag)
   - `git diff` for staged/unstaged changes
   - `git log` for commit history on current branch
   - Check if branch tracks remote and needs push

2. **Analyze changes**:
   - Review ALL commits in the branch (not just latest)
   - Identify the type from commit prefix: `fix:`, `feat:`, `improvement:`

3. **Select template** based on commit prefix:
   - `fix:` → Use `assets/fix-template.md`
   - `feat:` → Use `assets/feat-template.md`
   - `improvement:` → Use `assets/improvement-template.md`

4. **Create PR** (parallel if needed):
   - Push branch with `-u` flag if needed
   - Create PR using `gh pr create`

## PR Format

**Language**: Always write PR title and body in English

**Title**: Under 70 characters, descriptive

## Templates

### fix: (Bug fixes)
Use `assets/fix-template.md` - Problem/Solution format with Current/Expected behavior

### feat: (New features)
Use `assets/feat-template.md` - Summary/Motivation/Changes format

### improvement: (Enhancements)
Use `assets/improvement-template.md` - Before/After comparison format
