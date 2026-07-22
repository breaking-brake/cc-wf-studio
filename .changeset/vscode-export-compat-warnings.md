---
'cc-wf-studio': patch
---

Show target-compatibility warnings when exporting or running a workflow for a non-Claude agent (Codex, Copilot, Gemini, Cursor, Zoo Code, Antigravity) from the canvas: a notification reports how many configured settings the target ignores, and "Show Details" opens the full per-field list in an output channel — the same report `ccwf export` / `ccwf run` print.
