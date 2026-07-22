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

## 2026-07-22 — SubAgent edit no longer desyncs node from agent file on failed write
- **User value**: a user editing a command-linked SubAgent whose agent-file
  write fails no longer gets a canvas node silently out of sync with the
  file — the edit dialog stays open with a visible error, and the node only
  updates once the write succeeds.
- **Issue/PR**: Closes #826
- **Outcome**: done — `sub-agent-panel.tsx` now awaits `createSubAgent`
  before `updateNodeData`; `SubAgentFormDialog` awaits `onSubmit`, shows a
  submit error (new `subAgent.form.error.saveFailed` i18n key, all 5
  locales), and guards against double-submit. The creation path gets the
  same error feedback through the shared dialog.
- **Next proposals**:
  - Walk the canvas → export → share flow as a user and propose the top
    friction fix.
  - `ccwf validate`: include the node label alongside the node id in error
    output so users can find the offending node on the canvas faster
    (verify what `ValidationError` carries first).

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
