---
"@cc-wf-studio/cli": minor
"@cc-wf-studio/core": minor
"cc-wf-studio": patch
---

Introduce `@cc-wf-studio/cli`: a command-line entry (`ccwf`) for cc-wf-studio workflows. The initial release ships five subcommands:

- `ccwf render <file>` — print a Mermaid + execution-instructions Markdown bundle to stdout (`--format mermaid` for the raw fenced block).
- `ccwf validate <file>` — schema-check via `validateAIGeneratedWorkflow` (exit 0/1, `--json` for CI consumption).
- `ccwf mcp --file <file>` — run the cc-wf-studio stdio MCP server in-process (equivalent to the standalone `ccwf-mcp` bin).
- `ccwf export <file> [--agent <name>]` — materialise the workflow as agent-skill files. `--agent claude-code` (default) writes `.claude/agents/*.md` for inline Sub-Agent nodes plus `.claude/skills/<workflow>.md` for the workflow entry; `--agent antigravity|codex|copilot|cursor|gemini|roo-code` writes the provider's own `<root>/skills/<workflow>/SKILL.md` layout (Cursor additionally mirrors `.cursor/agents/*.md`).
- `ccwf run <file>` — same files as `ccwf export` with a "next step" hint tailored to the chosen agent. Auto-spawning `claude` is deferred to a later release.

`@cc-wf-studio/core` exposes three new modules consumed by both the CLI and the VSCode extension:

- `services/workflow-export` — pure `.claude/*` file generators (`generateSubAgentFile`, `generateSubAgentFlowAgentFile`, `generateSlashCommandFile`, `escapeYamlString`, `validateClaudeFileFormat`, `nodeNameToFileName`) and the `planWorkflowExportFiles(workflow): PlannedExportFile[]` planner.
- `services/agent-skill-export` — `AgentSkillProvider`, `generateAgentSkillContent`, `agentSkillFilePath`, and the unified `planAgentSkillFiles(workflow, agent)` planner for antigravity / codex / copilot / cursor / gemini / roo-code.

In addition, the workflow's entry file now lives at `.claude/skills/<workflow>.md` (was `.claude/commands/<workflow>.md`) — Claude Code is rolling `.claude/commands/` into `.claude/skills/`. The VSCode extension's per-provider `*-skill-export-service.ts` files are refactored into thin facades around the core planner; file names, content, and frontmatter remain byte-for-byte equivalent.
