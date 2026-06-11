---
name: ccwf-cli
description: Use the `ccwf` CLI (from @cc-wf-studio/cli) to render, validate, preview, export, or run cc-wf-studio workflow JSON files from the terminal. Apply whenever the user mentions viewing, visualizing, checking, executing, or converting a workflow under `.vscode/workflows/` (or any `*workflow*.json`), wants a Mermaid diagram of a workflow, asks to "see" / "preview" / "open" a workflow, or wants to run a workflow as a Claude Code Skill without opening VSCode.
allowed-tools: Bash(ccwf:*) Bash(npx @cc-wf-studio/cli:*)
---

# ccwf CLI

`ccwf` is the command-line entry into cc-wf-studio — a visual AI-agent workflow tool. It treats `.vscode/workflows/*.json` workflow files as inputs and lets you render them as Markdown, validate the schema, open them in a browser-based viewer, convert them into Agent Skills, or execute them. The same workflow JSON also drives the VSCode extension and an MCP server, so you can pick whichever interface fits the situation.

This Skill teaches Claude how to recognise when `ccwf` is the right answer and which subcommand to reach for. The subcommands and flags listed here are the source of truth — if behaviour seems off, check `ccwf <subcommand> --help` first.

## Prerequisites

Confirm `ccwf` is available before running any other subcommand:

```bash
ccwf --version
```

If `ccwf` is not on PATH:

- **Preferred**: install globally — `npm install -g @cc-wf-studio/cli`
- **Without install**: prefix every command with `npx @cc-wf-studio/cli` (e.g. `npx @cc-wf-studio/cli render <file>`)
- **In a project**: `pnpm add -D @cc-wf-studio/cli` and run via `pnpm exec ccwf`

If the user has a VSCode workspace and you can't find a workflow file, search `.vscode/workflows/*.json` first; that's the canonical location.

## Core workflow

The natural flow when the user has a workflow file in hand:

1. **`ccwf validate <file>`** — schema-check it. Exit 0 = clean, exit 1 = errors. Run this first whenever you receive a workflow from elsewhere.
2. **`ccwf preview <file>`** — opens a read-only viewer (Mermaid + per-node Markdown) in the browser. Use this when the user says "show me" / "what's in this workflow?" / "見せて".
3. **`ccwf export <file>` or `ccwf run <file>`** — materialises the workflow as Claude Code (or another agent's) Skill files. Use `run` when the user wants the next step to be actually executing the workflow with `claude`.

If a step fails, stop and surface the exact error to the user before moving on.

## Subcommand reference

### `ccwf render <file>`

Print a Markdown bundle (Mermaid flowchart + per-node execution instructions) to stdout. Use when piping to another tool or pasting into a PR / chat message.

```bash
ccwf render ./.vscode/workflows/my-workflow.json             # Markdown (default)
ccwf render ./.vscode/workflows/my-workflow.json -f mermaid  # ```mermaid block only
```

Output is the same content `ccwf preview` shows in the right pane.

### `ccwf validate <file>`

Schema-check the workflow JSON.

```bash
ccwf validate ./.vscode/workflows/my-workflow.json           # exit 0/1, human-readable errors on stderr
ccwf validate ./.vscode/workflows/my-workflow.json --json    # prints { valid, errors[] }
```

Use this:
- Before `ccwf run` / `ccwf export` if the file is hand-edited or AI-generated
- In CI / pre-commit hooks
- When the user asks "is this workflow OK?" / "壊れてない?"

### `ccwf preview <file>`

Open a **read-only viewer** in the browser. Mermaid flowchart on the left, per-node Markdown on the right. Auto-reloads when the file changes on disk. Auto-shuts down 30s after the last viewer tab closes.

```bash
ccwf preview ./my-workflow.json                  # boot, open browser
ccwf preview ./my-workflow.json --port 51234     # pin to a port
ccwf preview ./my-workflow.json --keep-alive     # don't auto-shutdown when the tab closes
```

Use when the user says any of: "show me", "preview", "what does this workflow do?", "open it in a browser", "見せて", "可視化して".

The printed URL has the shape `http://localhost:<port>/<uuid>/`. The UUID just keeps two concurrent preview sessions from clobbering each other — it isn't a security boundary, since the server only listens on the loopback interface by default.

### `ccwf canvas <file>` (experimental)

Open the **full editable canvas** in the browser (same UI as the VSCode extension). Saves write back to the workflow file. Heavier than `preview`; reach for it only when the user explicitly wants to edit without VSCode.

```bash
ccwf canvas ./my-workflow.json
```

Other VSCode-only features (Slack share, Claude API upload, MCP server management, agent-specific export buttons) return a `CANVAS_UNSUPPORTED` error in this mode — they require the extension proper.

### `ccwf export <file> [--agent <name>]`

Materialise the workflow as **Agent Skill files** for a target agent. Pure file write, no execution.

```bash
ccwf export ./my-workflow.json                                 # --agent claude-code (default)
ccwf export ./my-workflow.json --agent cursor                  # cursor
ccwf export ./my-workflow.json --agent codex --cwd /tmp/proj   # codex, custom output root
ccwf export ./my-workflow.json --overwrite                     # replace existing files
```

Output by `--agent`:

| `--agent`              | Files emitted (relative to `--cwd` or `process.cwd()`)                                       |
|------------------------|----------------------------------------------------------------------------------------------|
| `claude-code` (default)| `.claude/agents/<sub-agent>.md` (inline SubAgent nodes) + `.claude/skills/<workflow>/SKILL.md` |
| `antigravity`          | `.agent/skills/<workflow>/SKILL.md`                                                          |
| `codex`                | `.codex/skills/<workflow>/SKILL.md`                                                          |
| `copilot`              | `.github/skills/<workflow>/SKILL.md`                                                         |
| `cursor`               | `.cursor/skills/<workflow>/SKILL.md` + `.cursor/agents/<sub-agent>.md`                       |
| `gemini`               | `.gemini/skills/<workflow>/SKILL.md`                                                         |
| `roo-code` (Zoo Code)  | `.roo/skills/<workflow>/SKILL.md`                                                            |

Use `export` (rather than `run`) when the user wants the *files only* — e.g. checking generated content into git, inspecting before execution, or generating Skills for multiple agents in batch.

### `ccwf run <file> [--agent <name>] [--launch]`

Same file output as `ccwf export`, plus a "next step" hint on stdout. `--launch` additionally spawns the `claude` binary in the output directory (best-effort, claude-code agent only).

```bash
ccwf run ./my-workflow.json --launch          # write + spawn claude
ccwf run ./my-workflow.json --agent cursor    # write only (cursor launch not yet wired)
```

Use `run`:
- When the user wants to execute the workflow in Claude Code right after generating it ("動かして" / "実行して" / "run this workflow")
- As the one-stop shortcut after `validate` passes

### `ccwf mcp --file <file>`

Run the cc-wf-studio stdio MCP server in-process against `<file>`. Equivalent to the standalone `ccwf-mcp` bin. Use this to point an MCP client (Claude Code, MCP Inspector, …) at a workflow so the agent can read and edit it through MCP tools.

```bash
ccwf mcp --file ./.vscode/workflows/my-workflow.json
```

Typical `.mcp.json` snippet for Claude Code:

```json
{
  "mcpServers": {
    "cc-wf-studio": {
      "type": "stdio",
      "command": "npx",
      "args": ["@cc-wf-studio/cli", "mcp", "--file", ".vscode/workflows/my-workflow.json"]
    }
  }
}
```

The MCP server exposes 6 tools: `get_workflow_schema`, `get_current_workflow`, `apply_workflow`, `update_nodes`, `list_available_agents`, `highlight_group_node`. Use these when the user wants AI-driven editing of the workflow itself (not just rendering / running it).

### `ccwf install-skills` / `ccwf uninstall-skills`

Copy this Skill bundle into a discoverable location, or remove it again.

```bash
ccwf install-skills                  # ~/.claude/skills/ccwf-cli/ (user-scope)
ccwf install-skills --project        # ./.claude/skills/ccwf-cli/ (project-scope)
ccwf install-skills --overwrite      # replace an existing copy
ccwf install-skills --dry-run        # print paths without writing

ccwf uninstall-skills                # remove from ~/.claude/skills/
ccwf uninstall-skills --project      # remove from ./.claude/skills/
ccwf uninstall-skills --dry-run      # print deletions without writing
```

Use cases:

- "Install the ccwf skill" / "teach Claude Code about ccwf" → `ccwf install-skills`
- "Update the ccwf skill" / "refresh the install" → `ccwf uninstall-skills && ccwf install-skills`
- "Remove the ccwf skill" / "cleanup before uninstalling the CLI" → `ccwf uninstall-skills`

`uninstall-skills` is idempotent: running it twice prints "nothing to remove" the second time and exits 0.

## Mapping user phrasing to subcommands

Use this as a lookup when the user describes intent in natural language. If the user names a file under `.vscode/workflows/` or a `*workflow*.json`, the subcommand pattern below applies.

| User says...                                                                       | Run                                          |
|------------------------------------------------------------------------------------|----------------------------------------------|
| "Show me / preview this workflow", "見せて", "可視化して"                          | `ccwf preview <file>`                        |
| "Render this as Markdown", "Mermaid 図にして"                                       | `ccwf render <file>`                         |
| "Is this workflow valid?", "壊れてない?", "schema 確認して"                          | `ccwf validate <file>`                       |
| "Export as a Claude Skill / agent file", "skills 化して"                            | `ccwf export <file>` (default agent)         |
| "Convert for Cursor / Codex / Gemini …"                                            | `ccwf export <file> --agent <name>`          |
| "Run this workflow", "動かして", "実行して"                                          | `ccwf run <file> --launch`                   |
| "Edit the canvas without VSCode", "editor を browser で開いて"                       | `ccwf canvas <file>` (mention experimental)  |
| "Let an MCP client edit this workflow"                                              | `ccwf mcp --file <file>` and configure `.mcp.json` |
| "Install the ccwf skill / teach Claude about ccwf"                                  | `ccwf install-skills [--project]`            |
| "Update / refresh the ccwf skill"                                                   | `ccwf uninstall-skills && ccwf install-skills` |
| "Remove the ccwf skill / cleanup"                                                   | `ccwf uninstall-skills [--project]`          |

## Tips & gotchas

- **`ccwf preview` URLs include a per-session UUID** so two concurrent preview sessions don't collide. The server itself only binds to the loopback interface (`127.0.0.1`) by default, so external machines can't reach it; the UUID is a path key, not a credential.
- **Auto-shutdown**: `preview` and `canvas` shut themselves down 30 seconds after the last viewer tab closes. The countdown only starts once at least one viewer has connected, so a `preview` that nobody opens stays up. Use `--keep-alive` for multi-tab or LAN scenarios.
- **`ccwf run --launch` requires `claude` on PATH**. If it's missing, the command warns and exits cleanly after writing the files — that's not an error condition.
- **`ccwf canvas` is experimental** and missing Slack / Claude API / MCP / external-IDE export. If the user needs any of those, fall back to the VSCode extension.
- **Workflow file location**: when the user doesn't specify a path, look first under `.vscode/workflows/*.json` from the workspace root. If multiple workflows exist, list them and ask.
- **Validation before execution**: if the workflow is hand-edited or AI-authored in the same session, run `ccwf validate` before `ccwf run` / `ccwf export` to catch shape errors early.
- **`.claude/commands/` vs `.claude/skills/`**: Claude Code folded `commands/` into `skills/`. `ccwf export --agent claude-code` writes to the new path (`.claude/skills/<workflow>/SKILL.md`). Existing `.claude/commands/<workflow>.md` files are left alone — the user may want to delete them manually.

## Related interfaces

`ccwf` is one of three entry points to the same workflow JSON; if the user already has the VSCode extension installed or wants AI-driven editing, suggest the appropriate sibling:

- **`cc-wf-studio` VSCode extension** — visual canvas + Slack share + in-canvas AI editing.
- **`@cc-wf-studio/mcp` stdio bin (`ccwf-mcp` or `ccwf mcp`)** — let an external AI client read and edit workflows through MCP tools.

See the monorepo README at <https://github.com/breaking-brake/cc-wf-studio> for the full picture.
