---
name: update-sample-workflow
description: Update bundled sample workflow JSON in resources/samples/ from a source workflow in .vscode/workflows/. Use when the user says "サンプル更新", "update sample", or wants to sync a workflow file to the sample data.
---

# Update Sample Workflow

Update `resources/samples/<sample_id>.json` from a `.vscode/workflows/` source file. Preserves `meta` fields, replaces `workflow` content, and auto-updates `nodeCount`.

## Usage

Run the script:

```bash
python3 .claude/skills/update-sample-workflow/scripts/update_sample.py <source> <sample_id>
```

**Example:**

```bash
python3 .claude/skills/update-sample-workflow/scripts/update_sample.py \
  .vscode/workflows/github-issue-planning-en.json \
  github-issue-planning-sample
```

Then run `npm run check` to format the output JSON.

## What the script does

1. Read the source workflow JSON from `.vscode/workflows/`
2. Read the existing sample JSON to preserve `meta` (id, nameKey, descriptionKey, difficulty, tags)
3. Replace `workflow` field with the source content
4. Set `workflow.id` to `sample-<name>` format
5. Fix `createdAt`/`updatedAt` to stable timestamps
6. Remove `slashCommandOptions` and other non-sample fields
7. Update `meta.nodeCount` to actual node count
