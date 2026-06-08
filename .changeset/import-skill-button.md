---
"@cc-wf-studio/core": minor
"@cc-wf-studio/cli": minor
"cc-wf-studio": minor
---

feat: AI-agent workflow actions (Import Skill, Generate Tour) with a guided tour player

- The MCP "AI Edit" panel now lets you pick an agent (Claude Code, Copilot, Codex, …) once, then run any action with it: **AI Edit**, **Import Skill → Workflow**, or **Generate Workflow Tour**
- **Import Skill** reconstructs a published Agent Skill (SKILL.md) as a workflow on the canvas, generating a guided tour alongside the nodes
- **Generate Workflow Tour** adds a guided tour to the workflow you are currently editing
- Workflows gain an optional `tour` field (`TourStep[]`) in `@cc-wf-studio/core`
- New tour player: a "Start tour" button (shown when a workflow has a tour) and a step-by-step card. On the editing canvas it spotlights and centres each step's nodes; in the read-only Overview it scrolls/follows them in the Mermaid + instructions panes
- The Overview tour works in the in-editor Overview mode **and** in `ccwf preview` — so tours can be played from the CLI without VS Code
- Tours are persisted with the workflow on save, so they survive a save/reload round-trip
- New `ccwf tour <file> [--agent ...]` CLI command launches an AI agent (claude-code / codex / copilot / gemini) that writes a `tour` into the workflow file — tour generation without VS Code
