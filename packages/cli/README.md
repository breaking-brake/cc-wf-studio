# @cc-wf-studio/cli

Command-line tool (`ccwf`) for [cc-wf-studio](https://github.com/breaking-brake/cc-wf-studio) workflows. Renders, validates, materialises, and serves a workflow JSON from a terminal — no VSCode required.

> One of the three interfaces sharing a workflow file: this CLI, the [`@cc-wf-studio/mcp`](https://www.npmjs.com/package/@cc-wf-studio/mcp) stdio server, and the [`cc-wf-studio` VSCode extension](https://marketplace.visualstudio.com/items?itemName=breaking-brake.cc-wf-studio). See the [monorepo README](https://github.com/breaking-brake/cc-wf-studio#readme) for the bigger picture.

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
| `ccwf run <file>` | `ccwf export` + a "next step" hint. `--launch` additionally spawns Claude Code when available. |
| `ccwf preview <file>` | Open a read-only viewer (Mermaid + per-node Markdown panes) in a local browser. Auto-reloads when the file changes. |
| `ccwf canvas <file>` | (Experimental) Open the **full editable** cc-wf-studio canvas in a local browser. Saves write back to the same file. |
| `ccwf install-skills` | Copy the bundled Claude Code Skill into `~/.claude/skills/` (or `./.claude/skills/` with `--project`) so AI agents learn when to use ccwf. |
| `ccwf uninstall-skills` | Remove the bundled Claude Code Skill from `~/.claude/skills/` (or `./.claude/skills/` with `--project`). Idempotent. |

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
| `claude-code` (default) | `.claude/agents/<sub-agent>.md` (for inline SubAgent nodes) + `.claude/skills/<workflow>/SKILL.md` |
| `antigravity` | `.agent/skills/<workflow>/SKILL.md` |
| `codex` | `.codex/skills/<workflow>/SKILL.md` |
| `copilot` | `.github/skills/<workflow>/SKILL.md` |
| `cursor` | `.cursor/skills/<workflow>/SKILL.md` + `.cursor/agents/<sub-agent>.md` |
| `gemini` | `.gemini/skills/<workflow>/SKILL.md` |
| `roo-code` | `.roo/skills/<workflow>/SKILL.md` |

`.claude/commands/` is the previous home for the workflow entry; Claude Code is folding it into `.claude/skills/`, where each skill is a *directory* containing `SKILL.md` (see the Agent Skills format). `ccwf export --agent claude-code` writes to the new directory-based layout. Existing `.claude/commands/<workflow>.md` files are not deleted automatically.

The body of `SKILL.md` is, for now, still produced by the legacy SlashCommand generator — so its frontmatter retains fields like `hooks`, `model`, and `argument-hint` that the Skill spec doesn't strictly recognise. Migrating that body to a pure Skill format (and deciding what to do with the SlashCommand-only options) is a follow-up task.

### `ccwf run`

```sh
ccwf run ./my-workflow.json                                    # same files as export, plus a hint
ccwf run ./my-workflow.json --agent cursor                     # forwarded to export
```

`ccwf run` is a thin wrapper over `ccwf export` (same flags: `--agent`, `--cwd`, `--overwrite`). It adds an agent-specific "next step" line to stdout. With `--launch` (best-effort, claude-code only for now) it also walks `PATH` for the `claude` binary and spawns it in the output directory — when the binary is missing or a different agent is selected, the spawn is skipped and a warning is printed.

```sh
ccwf run ./my-workflow.json --launch        # write + spawn claude
ccwf run ./my-workflow.json --agent cursor  # write only (cursor launch not yet wired)
```

### `ccwf preview`

```sh
ccwf preview ./my-workflow.json                 # boot, print URL, open browser
ccwf preview ./my-workflow.json --port 51234    # pin to a port
ccwf preview ./my-workflow.json --keep-alive    # don't auto-shutdown when the tab closes
```

By default the server auto-shuts down **30 seconds after the last viewer tab closes**, so you don't leak listeners after a one-off "open and read" session. The countdown only starts once at least one browser has actually connected — a run where the browser fails to launch and the user never opens the URL stays alive indefinitely. Pass `--keep-alive` to keep the server running until you hit Ctrl+C (useful for multiple tabs, LAN sharing, or reconnecting later).

Read-only viewer powered by the `WorkflowOverview` component the VSCode extension already ships:
- **Left**: Mermaid flow rendered from the workflow nodes / connections.
- **Right**: Per-node Markdown instructions generated by `@cc-wf-studio/core`'s overview formatter.

No editor, no Save button, no extension RPCs — the browser fetches a single static HTML, the workflow JSON is injected once at boot. A Server-Sent Events channel keeps the page in sync with disk: edits to the workflow file trigger an automatic reload.

**Reachability**: bound to the IPv4 loopback (`127.0.0.1`) by default — only this machine can reach the server. The printed URL says `localhost` for readability and both addresses resolve to the same listener. The entry URL and SSE channel use a per-session UUID path prefix (`http://localhost:<port>/<uuid>/`) so two concurrent preview sessions don't collide; requests without the prefix get a 403. Pass `--host` (e.g. `0.0.0.0`) only when you intentionally want other machines on the network (Docker, DevContainers, Codespaces, a colleague's laptop on the same LAN, …) to reach the preview — the banner prints an explicit non-loopback notice when that happens.

### `ccwf canvas` (experimental)

```sh
ccwf canvas ./my-workflow.json                # boot, print URL, open browser
ccwf canvas ./my-workflow.json --port 51234   # pin to a port
```

`ccwf canvas` brings up the **full editable** cc-wf-studio canvas in a browser. It serves the bundled webview UI from a local HTTP + WebSocket server; saves from the canvas write back to the same workflow file. Other VSCode-only features (Slack share, Claude API upload, MCP server management, agent-specific export buttons, …) intentionally return a `CANVAS_UNSUPPORTED` error so the UI surfaces the limitation rather than hanging.

> **Status**: experimental. The intent is to keep the in-VSCode experience reachable without VSCode for use cases like remote SSH or CI environments. For "just look at this workflow" the upcoming `ccwf preview` (read-only Mermaid + Markdown view) will be lighter — it skips the WebSocket and just renders the `WorkflowOverview` component statically.

**Reachability**: the server binds to the IPv4 loopback (`127.0.0.1`) by default — only this machine can reach the server. The printed URL says `localhost` and both addresses resolve to the same listener. The entry URL and WebSocket use a per-session UUID path prefix (`http://localhost:<port>/<uuid>/`, `ws://localhost:<port>/<uuid>/ws`) so two concurrent sessions don't collide; requests without the prefix get a 403. Pass `--host` (e.g. `0.0.0.0`) only when you intentionally want other machines on the network to reach the canvas — the banner prints an explicit non-loopback notice when that happens.

The bundled webview's VSCode message protocol is emulated by a small polyfill (`bootstrap.js`) injected into `index.html`. The webview source is **unchanged** — `window.acquireVsCodeApi` returns a WebSocket-backed transport that talks to this CLI process.

### `ccwf install-skills` / `ccwf uninstall-skills`

```sh
ccwf install-skills                  # ~/.claude/skills/ccwf-cli (user-scope, default)
ccwf install-skills --project        # ./.claude/skills/ccwf-cli (commit to share with the team)
ccwf install-skills --overwrite      # replace an existing copy
ccwf install-skills --dry-run        # print paths, write nothing

ccwf uninstall-skills                # remove the user-scope copy
ccwf uninstall-skills --project      # remove the project-scope copy
ccwf uninstall-skills --dry-run      # print deletions, write nothing
```

Installs a [Claude Code Skill](https://code.claude.com/docs/en/skills) that teaches AI agents (Claude Code in particular) when to reach for `ccwf` and which subcommand fits each user phrasing. The skill auto-triggers when the user mentions viewing, validating, executing, or converting a workflow file — Claude then runs `ccwf` through Bash without per-command permission prompts (the skill whitelists `Bash(ccwf:*)` via `allowed-tools`).

After installing, open or restart your Claude Code session so the skill loads.

To refresh after upgrading the CLI, chain the two commands: `ccwf uninstall-skills && ccwf install-skills`. `uninstall-skills` is idempotent (a no-op when the destination is already empty).

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
