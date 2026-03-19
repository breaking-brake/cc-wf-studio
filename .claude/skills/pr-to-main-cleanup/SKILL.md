---
name: pr-to-main-cleanup
description: Clean up merged feature branches after PR to main is merged. Use when the user says "ブランチ削除", "cleanup", "マージ後の片付け", or wants to delete a merged branch.
---

# PR to Main Cleanup

Delete merged feature branches after PR is merged to main.

## Workflow

1. **Gather context** (parallel):
   - `git branch` to identify current branch
   - `git log --oneline -1` to confirm current state

2. **Execute cleanup**:
   - Switch to main branch
   - Pull latest changes from origin
   - Delete local feature branch
   - Delete remote feature branch

## Commands

```bash
git checkout main && git pull origin main && git branch -D <branch-name> && git push origin --delete <branch-name>
```

## Important Notes

- PRs to main are always squash-merged, so use `-D` (force delete) since git cannot detect squash merges as "merged"
- Always pull latest main before deleting to sync merge status
