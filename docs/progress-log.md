# Progress Log

Append-only memory of the autonomous value-creation loop. The `next-task`
skill appends one entry per iteration (newest first) and reads recent
entries to avoid repeating finished or abandoned work. Humans may annotate
entries but should not rewrite history.

Entry format:

```markdown
## YYYY-MM-DD — <short task title>
- **User value**: <one sentence — "a user can now X" / "no longer suffers Y">
- **Issue/PR**: #NN / #MM
- **Outcome**: done | abandoned (<why>) | blocked (<on what>)
- **Next proposals**: <0–3 bullets for the following iteration>
```

---

## 2026-07-21 — Fix SubAgent creation from existing agent discarding form edits
- **User value**: a user editing Color/Model/Tools/Memory in the SubAgent
  form before adding an existing agent to the canvas no longer has those
  edits silently discarded — the created node now matches what they typed.
- **Issue/PR**: Closes #816
- **Outcome**: done — `handleSelectCommand` in `NodePalette.tsx` now builds
  node data from the submitted `formData` (model/tools/memory/color)
  instead of re-parsing the agent file's frontmatter, matching the
  "+ Create New" and node-edit paths.
- **Next proposals**:
  - #826: SubAgent edit dialog commits node state before the agent file
    write succeeds (fix ordering so failed writes don't desync the node).
  - Walk the canvas → export → share flow as a user and propose the top
    friction fix.

## 2026-07-21 — Bootstrap the value-creation loop
- **User value**: none directly — this is the machine that will produce it.
- **Issue/PR**: (this setup PR)
- **Outcome**: done — next-task skill (invention-centric), auto-dev two-stage
  flow, CI gate, unattended-failure detection, 30-min scheduled routines.
- **Next proposals**:
  - First real iteration: walk the canvas → export → share flow as a user
    and propose the top friction fix.
