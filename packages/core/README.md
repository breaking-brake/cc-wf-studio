# @cc-wf-studio/core

Pure logic shared by every cc-wf-studio interface — the VSCode extension, the MCP server, and the `ccwf` CLI all reach for the same workflow types, validators, and Markdown/Mermaid generators that live here. No file system, no UI, no network: a node-side dependency you can pull into your own automation without inheriting an editor.

This is the "brain" of the monorepo. See the [root README](../../README.md) for how the three interfaces compose around it.

## Install

```sh
npm install @cc-wf-studio/core
```

## What's inside

| Module | Purpose |
|---|---|
| `types/workflow-definition` | `Workflow`, every `*Node` shape, `Connection`, `WorkflowMetadata`, `SlashCommandOptions`, hook types, `VALIDATION_RULES`. |
| `types/sample-workflow` / `types/ai-metrics` | Sample-workflow JSON shape used by the editor, lightweight metrics types for the AI-editing flow. |
| `constants/built-in-sub-agents` | Catalogue of the agents Claude Code ships out of the box (`general-purpose`, `explore`, `plan`). |
| `services/workflow-prompt-generator` | `generateMermaidFlowchart`, `generateExecutionInstructions`, `sanitizeNodeId` + the `ExportProvider` union. |
| `services/workflow-overview-formatter` | `generateOverviewMarkdown` — the per-node Markdown the canvas Overview panel and `ccwf preview` render side-by-side with the Mermaid diagram. |
| `services/workflow-export` | Pure `.claude/*` file generators (`generateSubAgentFile`, `generateSlashCommandFile`, `nodeNameToFileName`, `escapeYamlString`, `validateClaudeFileFormat`) and `planWorkflowExportFiles(workflow)` — the planner Claude Code's `ccwf export` walks. |
| `services/agent-skill-export` | `AgentSkillProvider` union + `generateAgentSkillContent` and `planAgentSkillFiles(workflow, agent)` for every non-Claude agent (Antigravity / Codex / Copilot / Cursor / Gemini / Roo Code). |
| `utils/validate-workflow` | `validateAIGeneratedWorkflow` — the schema check `ccwf validate` runs. |
| `utils/migrate-workflow` | Forward-migration of older workflow JSON to the current schema. |
| `utils/schema-parser` | Helpers that load the bundled workflow schema (`resources/workflow-schema.toon`). |
| `utils/workflow-validator` | Slack-share specific validator (`validateWorkflowFile`, re-exported as `SlackValidationResult`). |

Anything tied to a side-effect (`fs.writeFile`, `vscode.window.*`, `postMessage`, ...) lives in the **caller** — `core` only computes.

## Usage

```ts
import {
  generateMermaidFlowchart,
  generateExecutionInstructions,
  planWorkflowExportFiles,
  planAgentSkillFiles,
  validateAIGeneratedWorkflow,
  migrateWorkflow,
  type Workflow,
} from '@cc-wf-studio/core';

// 1. Validate before doing anything else.
const result = validateAIGeneratedWorkflow(rawJson);
if (!result.valid) {
  throw new Error(`Bad workflow:\n${result.errors.map((e) => e.message).join('\n')}`);
}

const workflow = migrateWorkflow(rawJson) as Workflow;

// 2. Render the canvas-equivalent Markdown.
const mermaid = generateMermaidFlowchart(workflow);
const guide = generateExecutionInstructions(workflow, { provider: 'claude-code' });

// 3. Decide what files to emit (without writing them).
const claudePlan = planWorkflowExportFiles(workflow);
// → [{ relativePath: '.claude/skills/<workflow>/SKILL.md', contents: ... }, ...]

const cursorPlan = planAgentSkillFiles(workflow, 'cursor');
// → [{ relativePath: '.cursor/skills/<workflow>/SKILL.md', ... },
//    { relativePath: '.cursor/agents/<sub-agent>.md', ... }]
```

## Subpath imports

`@cc-wf-studio/core/mcp` exposes a few `McpNode`-specific types (`McpNodeData`, `ToolParameter`) that pre-date the unified `workflow-definition` schema and still drift in shape. Reach for them only when working with MCP nodes specifically.

```ts
import { type McpNodeData } from '@cc-wf-studio/core/mcp';
```

`@cc-wf-studio/core/resources/workflow-schema.json` and `…/workflow-schema.toon` expose the raw schema files so a host can hand them to an LLM verbatim — the MCP server's `get_workflow_schema` tool does exactly that.

## License

[AGPL-3.0-or-later](../../LICENSE)
