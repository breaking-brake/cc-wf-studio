# @cc-wf-studio/mcp

MCP (Model Context Protocol) server toolkit for [cc-wf-studio](https://github.com/breaking-brake/cc-wf-studio) workflows. Ships tool definitions, an IO adapter contract, and a standalone stdio bin (`ccwf-mcp`) that AI clients can use to edit workflow JSON files without the VSCode canvas.

> One of the three interfaces sharing a workflow file: this MCP server, the [`@cc-wf-studio/cli`](https://www.npmjs.com/package/@cc-wf-studio/cli), and the [`cc-wf-studio` VSCode extension](https://marketplace.visualstudio.com/items?itemName=breaking-brake.cc-wf-studio). See the [monorepo README](https://github.com/breaking-brake/cc-wf-studio#readme) for the bigger picture.

The package is the deduplicated home of the 6 cc-wf-studio MCP tools. Both the VSCode extension (canvas mode, HTTP transport) and the standalone bin (file mode, stdio transport) configure the same tool registrations through a shared factory.

## Install

```sh
# Run the standalone bin without installing
npx @cc-wf-studio/mcp --file path/to/workflow.json

# Or add to a local dev dependency
pnpm add -D @cc-wf-studio/mcp
```

## CLI usage

```sh
ccwf-mcp --file ./.vscode/workflows/my-workflow.json
```

Options:

| Flag | Required | Description |
|---|---|---|
| `--file <path>` | yes | Workflow JSON file to read/write. Relative paths resolve from the working directory. |
| `--project-root <dir>` | no | Base directory used to resolve `<project>/.claude/agents/`. Defaults to `process.cwd()`. |
| `--help` / `-h` | no | Print usage. |

The bin speaks stdio MCP — point an MCP client (Claude Code, MCP Inspector, …) at it. Example config for Claude Code's `.mcp.json`:

```json
{
  "servers": {
    "cc-wf-studio": {
      "type": "stdio",
      "command": "npx",
      "args": ["@cc-wf-studio/mcp", "--file", ".vscode/workflows/my-workflow.json"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `get_workflow_schema` | Return the workflow schema in TOON format. |
| `get_current_workflow` | Return the current workflow + revision. |
| `apply_workflow` | Validate + persist a workflow. Honours `expectedRevision` for optimistic locking. |
| `update_nodes` | Partial node updates (more token-efficient than `apply_workflow`). |
| `list_available_agents` | Enumerate `~/.claude/agents/*.md` (user) and `<project>/.claude/agents/*.md` (project). |
| `highlight_group_node` | Canvas-only (no-op in file mode; returns a diagnostic note). |

## Library usage (custom adapters)

```ts
import { createWorkflowMcpServer, type WorkflowIoAdapter } from '@cc-wf-studio/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const adapter: WorkflowIoAdapter = {
  /* implement the 6 methods */
};

const server = createWorkflowMcpServer(adapter);
await server.connect(new StdioServerTransport());
```

The `FileWorkflowAdapter` and the VSCode extension's `McpServerManager` are the two adapters that ship in the monorepo today.

## File-mode behaviour notes

- `revision` is `sha256:<hex>` of the file contents (UTF-8). `apply_workflow` refuses the write when `expectedRevision` doesn't match the current hash.
- Writes are atomic (temp file + rename).
- `planAndPersistSubAgentFiles` returns `[]`. AI clients should supply complete `commandFilePath` on `subAgent` nodes when targeting the file mode — auto-creation of `.claude/agents/*.md` is intentionally left to canvas mode for now.

## License

AGPL-3.0-or-later. See [LICENSE](https://github.com/breaking-brake/cc-wf-studio/blob/main/LICENSE).
