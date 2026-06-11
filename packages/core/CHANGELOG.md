# @cc-wf-studio/core

## 0.2.0

### Minor Changes

- 181d985: feat: AI-agent workflow actions (Import Skill, Generate Tour) with a guided tour player

  - The MCP "AI Edit" panel now lets you pick an agent (Claude Code, Copilot, Codex, …) once, then run any action with it: **AI Edit**, **Import Skill → Workflow**, or **Generate Workflow Tour**
  - **Import Skill** reconstructs a published Agent Skill (SKILL.md) as a workflow on the canvas, generating a guided tour alongside the nodes
  - **Generate Workflow Tour** adds a guided tour to the workflow you are currently editing
  - Workflows gain an optional `tour` field (`TourStep[]`) in `@cc-wf-studio/core`
  - New tour player: a "Start tour" button (shown when a workflow has a tour) and a step-by-step card. On the editing canvas it spotlights and centres each step's nodes; in the read-only Overview it scrolls/follows them in the Mermaid + instructions panes
  - The Overview tour works in the in-editor Overview mode **and** in `ccwf preview` — so tours can be played from the CLI without VS Code
  - Tours are persisted with the workflow on save, so they survive a save/reload round-trip
  - New `ccwf tour <file> [--agent ...]` CLI command launches an AI agent (claude-code / codex / copilot / gemini) that writes a `tour` into the workflow file — tour generation without VS Code

### Patch Changes

- 4403233: fix: switch the Roo Code integration to Zoo Code (#770). The sunset Roo Code extension is replaced by its maintained community fork: the extension now detects `ZooCodeOrganization.zoo-code` first (falling back to the legacy Roo Code extension if installed), launches skills with Zoo Code's `/<skill>` slash syntax, and all UI labels, generated skill instructions, and CLI hints now say "Zoo Code". The `roo-code` agent ID and `.roo/` output paths are unchanged because Zoo Code still reads `.roo/skills/` and `.roo/mcp.json`.

## 0.1.1

### Patch Changes

- 37475fc: Relicense from AGPL-3.0-or-later to **MIT**. The headless library and tooling packages are now permissively licensed to encourage reuse and embedding; the VSCode extension (`cc-wf-studio`) remains AGPL-3.0-or-later. Each package now ships its own `LICENSE` file in the published tarball. This is a license loosening — no code or API change — so existing usage is unaffected.

## 0.1.0

### Minor Changes

- 37ec403: Introduce `@cc-wf-studio/cli`: a command-line entry (`ccwf`) for cc-wf-studio workflows. The initial release ships five subcommands:

  - `ccwf render <file>` — print a Mermaid + execution-instructions Markdown bundle to stdout (`--format mermaid` for the raw fenced block).
  - `ccwf validate <file>` — schema-check via `validateAIGeneratedWorkflow` (exit 0/1, `--json` for CI consumption).
  - `ccwf mcp --file <file>` — run the cc-wf-studio stdio MCP server in-process (equivalent to the standalone `ccwf-mcp` bin).
  - `ccwf export <file> [--agent <name>]` — materialise the workflow as agent-skill files. `--agent claude-code` (default) writes `.claude/agents/*.md` for inline Sub-Agent nodes plus `.claude/skills/<workflow>/SKILL.md` for the workflow entry; `--agent antigravity|codex|copilot|cursor|gemini|roo-code` writes the provider's own `<root>/skills/<workflow>/SKILL.md` layout (Cursor additionally mirrors `.cursor/agents/*.md`).
  - `ccwf run <file>` — same files as `ccwf export` with a "next step" hint tailored to the chosen agent. Auto-spawning `claude` is deferred to a later release.

  `@cc-wf-studio/core` exposes three new modules consumed by both the CLI and the VSCode extension:

  - `services/workflow-export` — pure `.claude/*` file generators (`generateSubAgentFile`, `generateSubAgentFlowAgentFile`, `generateSlashCommandFile`, `escapeYamlString`, `validateClaudeFileFormat`, `nodeNameToFileName`) and the `planWorkflowExportFiles(workflow): PlannedExportFile[]` planner.
  - `services/agent-skill-export` — `AgentSkillProvider`, `generateAgentSkillContent`, `agentSkillFilePath`, and the unified `planAgentSkillFiles(workflow, agent)` planner for antigravity / codex / copilot / cursor / gemini / roo-code.

  In addition, the workflow's entry file now lives at `.claude/skills/<workflow>/SKILL.md` (was `.claude/commands/<workflow>.md`) — Agent Skills are directory + SKILL.md (consistent with the other agents this CLI exports for). The body is still produced by the legacy SlashCommand generator, so its frontmatter retains fields like `hooks` / `model` / `argument-hint` that the Skill spec doesn't recognise; migrating to a pure Skill body is a follow-up. The VSCode extension's per-provider `*-skill-export-service.ts` files are refactored into thin facades around the core planner; file names, content, and frontmatter remain byte-for-byte equivalent.

- b948d19: Extract the pure workflow logic (schema types, validators, migration, schema parser, Mermaid generator, Slash Command formatter, built-in sub-agent metadata) and the schema resources into a new `@cc-wf-studio/core` package. The VSCode extension now consumes them through `@cc-wf-studio/core` (and `@cc-wf-studio/core/mcp` for MCP-specific types). No user-visible behavior changes.

### Patch Changes

- e9c49d3: Introduce `@cc-wf-studio/mcp`: a transport-agnostic MCP server toolkit that ships the cc-wf-studio workflow tool definitions, a `WorkflowIoAdapter` contract, and a new standalone stdio bin `ccwf-mcp --file <path>` for editing workflow JSON files outside the VSCode canvas. The VSCode extension's in-process HTTP server is refactored to consume the same factory through a `CanvasWorkflowAdapter` (no user-visible behavior changes — tool names, arguments, and response shapes are preserved). `@cc-wf-studio/core` adds `.js` extensions on its relative imports so the new bin can resolve the package under Node ESM without a bundler.
