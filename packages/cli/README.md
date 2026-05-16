# @cc-wf-studio/cli

Command-line tool (`ccwf`) for [cc-wf-studio](https://github.com/breaking-brake/cc-wf-studio) workflows. Renders, validates, materialises, and serves a workflow JSON from a terminal — no VSCode required.

## Install

```sh
# Run without installing
npx @cc-wf-studio/cli --help

# Or install locally
pnpm add -D @cc-wf-studio/cli
```

## Subcommands

| Command | Description |
|---|---|
| `ccwf render <file>` | Print a Mermaid + execution-instructions Markdown bundle to stdout. |
| `ccwf validate <file>` | Schema-check the workflow JSON. Exit 0/1. `--json` for machine-readable output. |
| `ccwf mcp --file <file>` | Run the cc-wf-studio stdio MCP server in-process against `<file>`. |
| `ccwf export <file>` | Materialise the workflow as agent-skill files for a target agent (`--agent <name>`, default `claude-code`). |
| `ccwf run <file>` | Today: identical to `ccwf export` plus a "next step" hint. Phase 4b will let the agent spawn itself and perform the export + execution. |

### `ccwf render`

```sh
ccwf render ./.vscode/workflows/my-workflow.json            # Markdown (default)
ccwf render ./.vscode/workflows/my-workflow.json -f mermaid # ```mermaid block only
```

### `ccwf validate`

```sh
ccwf validate ./.vscode/workflows/my-workflow.json          # exit 0/1
ccwf validate ./.vscode/workflows/my-workflow.json --json   # prints { valid, errors[] }
```

### `ccwf mcp`

```sh
ccwf mcp --file ./.vscode/workflows/my-workflow.json
```

Speaks stdio MCP. Point an MCP client (Claude Code, MCP Inspector, …) at it. Equivalent to the standalone `ccwf-mcp` bin shipped by `@cc-wf-studio/mcp` — same factory, same tools.

Example `.mcp.json`:

```json
{
  "servers": {
    "cc-wf-studio": {
      "type": "stdio",
      "command": "npx",
      "args": ["@cc-wf-studio/cli", "mcp", "--file", ".vscode/workflows/my-workflow.json"]
    }
  }
}
```

### `ccwf export`

```sh
ccwf export ./my-workflow.json                                # --agent claude-code (default)
ccwf export ./my-workflow.json --agent cursor                  # cursor
ccwf export ./my-workflow.json --agent codex --cwd /tmp/proj   # codex into a different root
ccwf export ./my-workflow.json --overwrite                     # replace existing files
```

Output layout by target agent:

| `--agent` | Files emitted (relative to `--cwd` / `process.cwd()`) |
|---|---|
| `claude-code` (default) | `.claude/agents/<sub-agent>.md` (for inline SubAgent nodes) + `.claude/skills/<workflow>.md` |
| `antigravity` | `.agent/skills/<workflow>/SKILL.md` |
| `codex` | `.codex/skills/<workflow>/SKILL.md` |
| `copilot` | `.github/skills/<workflow>/SKILL.md` |
| `cursor` | `.cursor/skills/<workflow>/SKILL.md` + `.cursor/agents/<sub-agent>.md` |
| `gemini` | `.gemini/skills/<workflow>/SKILL.md` |
| `roo-code` | `.roo/skills/<workflow>/SKILL.md` |

`.claude/commands/` is the previous home for the workflow entry; Claude Code is folding it into `.claude/skills/`, and `ccwf export --agent claude-code` writes the new path. Existing `.claude/commands/<workflow>.md` files are not deleted automatically.

### `ccwf run`

```sh
ccwf run ./my-workflow.json                                    # same files as export, plus a hint
ccwf run ./my-workflow.json --agent cursor                     # forwarded to export
```

Today `ccwf run` is a thin wrapper over `ccwf export` (same flags: `--agent`, `--cwd`, `--overwrite`). It adds an agent-specific "next step" line to stdout. **Phase 4b will replace its body** so the chosen agent spawns itself and performs both the skill conversion and the execution — the surface stays compatible.

## Fixtures

`fixtures/sample-workflow.json` is a minimal, schema-valid workflow that backs the smoke tests in this package's README examples.

## Development

Inside the monorepo, three invocation paths are available:

```sh
# 1. tsx — runs straight from src, no rebuild required (fastest iteration)
pnpm ccwf:dev render packages/cli/fixtures/sample-workflow.json

# 2. built dist — exercises the actual published code path
pnpm -F @cc-wf-studio/cli build
pnpm ccwf render packages/cli/fixtures/sample-workflow.json

# 3. via the hoisted bin — same as path 2, but uses the linked bin under node_modules/.bin
pnpm exec ccwf render packages/cli/fixtures/sample-workflow.json
```

Use `ccwf:dev` while iterating on a subcommand; use `ccwf` (built) before pushing to confirm the bin shipped under `dist/` still works.

## License

AGPL-3.0-or-later. See [LICENSE](https://github.com/breaking-brake/cc-wf-studio/blob/main/LICENSE).
