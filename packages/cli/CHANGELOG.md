# @cc-wf-studio/cli

## 0.2.2

### Patch Changes

- 1119040: Update dependencies to resolve Dependabot alerts: bump ws to ^8.21.0 (CLI), vite to ^7.3.6, and refresh transitive dependencies (hono, dompurify, form-data, undici, markdown-it, linkify-it, js-yaml, esbuild) to patched versions
- Updated dependencies [8c1e56a]
  - @cc-wf-studio/core@0.4.0
  - @cc-wf-studio/mcp@0.1.5

## 0.2.1

### Patch Changes

- 638706b: Fix license stated in package READMEs: core/mcp/cli are MIT (not AGPL). Links now point to each package's own MIT LICENSE.
- Updated dependencies [3295d3c]
- Updated dependencies [638706b]
  - @cc-wf-studio/core@0.3.0
  - @cc-wf-studio/mcp@0.1.4

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
- Updated dependencies [181d985]
- Updated dependencies [4403233]
  - @cc-wf-studio/core@0.2.0
  - @cc-wf-studio/mcp@0.1.3

## 0.1.2

### Patch Changes

- 37475fc: Relicense from AGPL-3.0-or-later to **MIT**. The headless library and tooling packages are now permissively licensed to encourage reuse and embedding; the VSCode extension (`cc-wf-studio`) remains AGPL-3.0-or-later. Each package now ships its own `LICENSE` file in the published tarball. This is a license loosening — no code or API change — so existing usage is unaffected.
- Updated dependencies [37475fc]
  - @cc-wf-studio/core@0.1.1
  - @cc-wf-studio/mcp@0.1.2

## 0.1.1

### Patch Changes

- Fix `ccwf --version` reporting `0.0.0` instead of the actual published version, and add a `--version` / `-V` flag to `ccwf-mcp`. Both bins now read the version from their own `package.json` at startup so they stay in sync with the npm release without a build-time substitution step.
- Updated dependencies
  - @cc-wf-studio/mcp@0.1.1

## 0.1.0

### Minor Changes

- 73ca28c: Add `ccwf canvas <file>` (experimental) and `ccwf run --launch`.

  `ccwf canvas` brings up the **full editable** cc-wf-studio canvas in a browser. It starts a localhost HTTP + WebSocket server backed by the bundled webview build, emulating the VSCode message channel through a small `bootstrap.js` polyfill that overrides `window.acquireVsCodeApi`. The webview source is unchanged. Saves from the canvas write back to the file; other VSCode-only flows (Slack, Claude API, MCP, export-for-\*) return a `CANVAS_UNSUPPORTED` error so the UI surfaces the limitation cleanly. The server binds to `127.0.0.1` with a URL token; the README documents the localhost-only threat model. A lighter read-only `ccwf preview` (just the `WorkflowOverview` component — Mermaid + Markdown panes) is planned as a follow-up.

  The CLI now bundles the webview assets in its npm tarball — `packages/cli/build` syncs `packages/vscode/src/webview/dist/**` into `packages/cli/dist/webview/` so `npx @cc-wf-studio/cli canvas` works on a fresh install. `cc-wf-studio-webview` is added as a workspace devDependency of the CLI to make the pnpm build order topological, and `@cc-wf-studio/core` is declared as a workspace dependency of `cc-wf-studio-webview` so a clean rebuild succeeds.

  `ccwf run --launch` does the existing file write and then walks `PATH` for the `claude` binary, spawning it in the output directory. Missing binary or non-claude-code agent prints a warning and exits cleanly. Without `--launch` the command is identical to before.

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

- 6163323: Bundle a Claude Code Skill (`ccwf-cli`) and ship `ccwf install-skills` to install it.

  The Skill teaches AI coding agents — Claude Code in particular — when to reach for the `ccwf` CLI and which subcommand fits the user's request. Its description is intentionally broad (any mention of viewing, validating, executing, or converting a workflow file under `.vscode/workflows/` or any `*workflow*.json`), and `allowed-tools` whitelists `Bash(ccwf:*)` + `Bash(npx @cc-wf-studio/cli:*)` so Claude can invoke the CLI without per-command permission prompts. The body of `SKILL.md` is a reference: prerequisites, the validate → preview → run / export workflow, one section per subcommand (including the new `install-skills` itself), a user-phrasing → subcommand mapping table, and tips around the per-session UUID URL slug + auto-shutdown behaviour.

  `ccwf install-skills` copies the bundled `SKILL.md` (and any future supporting files under `packages/cli/skills/`) into `~/.claude/skills/ccwf-cli/` by default, or `./.claude/skills/ccwf-cli/` with `--project`. `--overwrite` is required when a destination already exists; `--dry-run` prints the plan without writing. No new runtime dependencies; the resolver looks at `<pkg>/dist/skills/` for installed runs and `<pkg>/skills/` for tsx-based development runs, mirroring how `preview` / `canvas` discover the bundled webview.

  The CLI build chain now includes a `sync:skills` step (`packages/cli/skills/` → `packages/cli/dist/skills/`), and `dist/skills/` is part of the npm tarball via the existing `"files": ["dist", "README.md"]` declaration.

- acf251c: Add `ccwf preview <file>` — a lightweight, read-only viewer that opens the cc-wf-studio overview (Mermaid + per-node Markdown panes) for a single workflow in a local browser.

  Unlike the heavyweight `ccwf canvas` (which mirrors the full VSCode editor through a WebSocket-backed message channel), `preview` serves a single static HTML page with the workflow JSON injected at boot. No editor, no `Save` button, no extension RPCs — just the existing `WorkflowOverview` React component rendered standalone. The page subscribes to a Server-Sent Events channel when `--watch` is in effect, and reloads itself whenever the source file changes on disk.

  Internals:

  - New `overview.html` + `src/overview-entry.tsx` + `src/overview-polyfill.ts` entry in `cc-wf-studio-webview`. Polyfill intercepts the one bridge call the read-only surface makes (`OPEN_EXTERNAL_URL` for markdown links) and reroutes it through `window.open`. Vite emits two rollup inputs (`main` for the canvas, `overview` for preview).
  - `@cc-wf-studio/cli` ships an HTTP server (`src/preview/server.ts`) and an `fs.watch`-based debounced file watcher (`src/preview/watcher.ts`). No new runtime dependencies; the `ws` package stays canvas-only.
  - The `vscode` accessor previously embedded in `main.tsx` moved to `services/vscode-api.ts`. `main.tsx` re-exports it for backward compat, but the new overview entry imports it directly so it no longer drags in the canvas bootstrap.

  Flags: `--port`, `--host`, `--no-open`, `--watch`, `--keep-alive`. Localhost-bound by default with a random URL token on both the entry URL and the `/events/<token>` SSE channel. The browser keeps a Server-Sent Events stream open for the lifetime of the page; the server auto-shuts down 30 seconds after the last viewer disconnects (the countdown only starts once at least one client has connected, so a `--no-open` boot that nobody opens stays alive). Pass `--keep-alive` to keep the server running until you Ctrl+C (multiple tabs / LAN sharing / reconnect later).

### Patch Changes

- Updated dependencies [37ec403]
- Updated dependencies [b948d19]
- Updated dependencies [e9c49d3]
  - @cc-wf-studio/core@0.1.0
  - @cc-wf-studio/mcp@0.1.0
