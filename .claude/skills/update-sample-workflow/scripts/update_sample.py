#!/usr/bin/env python3
"""
Update a sample workflow JSON in resources/samples/ from a source workflow JSON.

Preserves the meta field from the existing sample, replaces the workflow field
with the source, and updates nodeCount automatically.

Usage:
    python3 update_sample.py <source_workflow> <sample_id>

Example:
    python3 update_sample.py .vscode/workflows/github-issue-planning-en.json github-issue-planning-sample
"""

import json
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <source_workflow_json> <sample_id>")
        print(f"Example: {sys.argv[0]} .vscode/workflows/my-workflow.json github-issue-planning-sample")
        sys.exit(1)

    source_path = Path(sys.argv[1])
    sample_id = sys.argv[2]

    # Find project root (where resources/ lives)
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent.parent.parent  # .claude/skills/update-sample-workflow/scripts/ -> root
    sample_path = project_root / "resources" / "samples" / f"{sample_id}.json"

    # Validate paths
    if not source_path.exists():
        print(f"Error: Source workflow not found: {source_path}")
        sys.exit(1)

    if not sample_path.exists():
        print(f"Error: Sample file not found: {sample_path}")
        sys.exit(1)

    # Read source workflow
    with open(source_path, "r", encoding="utf-8") as f:
        source_workflow = json.load(f)

    # Read existing sample (to preserve meta)
    with open(sample_path, "r", encoding="utf-8") as f:
        sample = json.load(f)

    # Update workflow field
    sample["workflow"] = source_workflow

    # Normalize: set sample-specific workflow ID
    sample["workflow"]["id"] = f"sample-{sample_id.replace('-sample', '')}"

    # Normalize: fix timestamps
    sample["workflow"]["createdAt"] = "2026-04-06T00:00:00.000Z"
    sample["workflow"]["updatedAt"] = "2026-04-06T00:00:00.000Z"

    # Remove fields not needed in samples
    for key in ["slashCommandOptions"]:
        sample["workflow"].pop(key, None)

    # Update nodeCount in meta
    node_count = len(sample["workflow"].get("nodes", []))
    sample["meta"]["nodeCount"] = node_count

    # Write back
    with open(sample_path, "w", encoding="utf-8") as f:
        json.dump(sample, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Updated {sample_path}")
    print(f"  Source: {source_path}")
    print(f"  Nodes: {node_count}")
    print(f"  Meta preserved: id={sample['meta']['id']}")


if __name__ == "__main__":
    main()
