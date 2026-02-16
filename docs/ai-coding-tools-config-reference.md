# AI Coding Tools Configuration Reference

A summary of configuration file paths for each AI coding tool.
Created by referencing official documentation for each tool.

## Summary Table

| Tool | Rules | Skills | Commands/Prompts | Agents/Modes | MCP | Ignore |
|------|-------|--------|------------------|--------------|-----|--------|
| Claude Code | Project<br>User | Project<br>User | Project<br>User | Project<br>User | Project<br>User | Project |
| Gemini CLI | Project<br>User | Project<br>User | Project<br>User | - | Project<br>User | Project |
| Roo Code | Project<br>Global | Project<br>Global | Project<br>Global | Project<br>Global | Project<br>Global | Project |
| VSCode Copilot Chat | Project<br>User | Project<br>User | Project<br>User | Project | Project<br>User | - |
| Copilot CLI | Project | Project<br>Global | - | Project<br>Global | Global | - |
| Codex CLI (OpenAI) | Project<br>Global | Project<br>User<br>Admin | - | - | Global | - |

---

## Claude Code

> **Reference:**
> - [Claude Code Settings](https://code.claude.com/docs/en/settings)
> - [Extend Claude with Skills](https://code.claude.com/docs/en/skills)

### Memory (CLAUDE.md)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./CLAUDE.md` | Project memory/context (shared) |
| **Project (local)** | `./.claude/CLAUDE.local.md` | Project memory (personal, gitignored) |
| **User** | `~/.claude/CLAUDE.md` | User memory (all projects) |

### Settings

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.claude/settings.json` | Project settings (shared) |
| **Project (local)** | `./.claude/settings.local.json` | Project settings (personal, gitignored) |
| **User** | `~/.claude/settings.json` | User settings |
| **Managed** | See below | Enterprise settings (admin-deployed) |

**Managed settings locations:**
- macOS: `/Library/Application Support/ClaudeCode/`
- Linux/WSL: `/etc/claude-code/`
- Windows: `C:\Program Files\ClaudeCode\`

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.claude/skills/{skill-name}/SKILL.md` | Project skills |
| **User** | `~/.claude/skills/{skill-name}/SKILL.md` | User skills (all projects) |
| **Enterprise** | Managed settings path | Organization-wide skills |

> **Note:** Skills in subdirectories (e.g., `packages/frontend/.claude/skills/`) are auto-discovered

**Frontmatter Schema:**
```yaml
---
name: skill-name                    # Optional (uses directory name if omitted)
description: Skill description      # Recommended
argument-hint: "[issue-number]"     # Optional
disable-model-invocation: false     # Optional, prevent auto-loading
user-invocable: true                # Optional, hide from / menu if false
allowed-tools:                      # Optional
  - Bash
  - Read
  - Write
model: claude-sonnet-4-5            # Optional
context: fork                       # Optional, run in subagent
agent: Explore                      # Optional, subagent type
hooks: {}                           # Optional, skill-scoped hooks
---
```

### Commands (Legacy)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.claude/commands/*.md` | Project commands |
| **User** | `~/.claude/commands/*.md` | User commands |

> **Note:** Commands are merged into Skills. Both `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` create `/review`. Skills are recommended.

**Frontmatter Schema:**
```yaml
---
description: Command description
allowed-tools:                      # Optional
  - Bash
argument-hint: "[filename]"         # Optional
model: claude-sonnet-4-5            # Optional
disable-model-invocation: false     # Optional
---
```

### Agents (Subagents)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.claude/agents/*.md` | Project subagents |
| **User** | `~/.claude/agents/*.md` | User subagents |

### MCP

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.mcp.json` | Project MCP configuration |
| **User** | `~/.claude.json` | User preferences, OAuth, MCP servers (within `mcpServers` key) |
| **Managed** | `managed-mcp.json` | Enterprise MCP (in managed settings path) |

**JSON Schema:**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {}
    }
  }
}
```

### Ignore

| Scope | Path |
|-------|------|
| **Project** | `./.claudeignore` |

---

## Gemini CLI

Google Gemini CLI is a terminal-based AI coding agent.

> **Reference:**
> - [Gemini CLI Installation](https://geminicli.com/docs/get-started/installation/)
> - [Gemini CLI Configuration](https://geminicli.com/docs/get-started/configuration/)
> - [GEMINI.md Files](https://geminicli.com/docs/cli/gemini-md/)
> - [Agent Skills](https://geminicli.com/docs/cli/skills/)
> - [Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
> - [MCP Servers](https://geminicli.com/docs/tools/mcp-server/)
> - [Extensions](https://geminicli.com/docs/extensions/)

### Installation

| Method | Command |
|--------|---------|
| **npm (global)** | `npm install -g @google/gemini-cli` |
| **Homebrew (macOS/Linux)** | `brew install gemini-cli` |
| **npx (no install)** | `npx @google/gemini-cli` |

**Prerequisites:** Node.js 20.0.0+

### Rules (GEMINI.md)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./GEMINI.md` | Project instructions (discovered from CWD up to `.git` root) |
| **Project (subdirs)** | `**/GEMINI.md` | Subdirectory instructions (recursive scan) |
| **User** | `~/.gemini/GEMINI.md` | User instructions (all projects) |

**Features:**
- `@file.md` syntax to import other Markdown files
- `/memory show` to display current combined context
- `/memory refresh` to reload all context files
- `/memory add <text>` to append text to `~/.gemini/GEMINI.md`
- `GEMINI_SYSTEM_MD` environment variable to override system prompt

**Custom context file names (settings.json):**
```json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
```

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.gemini/skills/{skill-name}/SKILL.md` | Project skills |
| **User** | `~/.gemini/skills/{skill-name}/SKILL.md` | User skills (all projects) |
| **Extension** | Extension-bundled | Skills from installed extensions |

**Directory structure:**
```
.gemini/skills/my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable scripts
├── references/       # Optional: static documentation
└── assets/           # Optional: templates/resources
```

**Frontmatter Schema:**
```yaml
---
name: skill-name           # Required
description: Skill description  # Required (single-line string)
---
```

**Lifecycle:**
1. **Discovery**: CLI scans 3 layers; only `name` and `description` are injected into system prompt
2. **Activation**: Model calls `activate_skill` tool when task matches (user confirmation required)
3. **Injection**: After approval, SKILL.md body + folder structure are added to conversation

**CLI commands:** `gemini skills list`, `gemini skills install`, `gemini skills link`

**settings.json:**
```json
{
  "skills": {
    "enabled": true,
    "disabled": ["skill-name"]
  }
}
```

### Commands (Custom Commands)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.gemini/commands/*.toml` | Project commands |
| **User** | `~/.gemini/commands/*.toml` | User commands |
| **Extension** | Extension-bundled | Commands from installed extensions |

> **Note:** Project commands override same-named user commands. Filename becomes command name (e.g., `test.toml` → `/test`, `git/commit.toml` → `/git:commit`).

**TOML Schema:**
```toml
description = "Generate a commit message"    # Optional
prompt = """
Review the following staged changes:

!{git diff --staged}

{{args}}
"""
```

**Template syntax:**
- `{{args}}` — User input placeholder
- `!{command}` — Shell command output injection
- `@{file.md}` — File content injection

### MCP

MCP servers are configured in `settings.json` under `mcpServers` key.

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.gemini/settings.json` | Project MCP configuration (within `mcpServers` key) |
| **User** | `~/.gemini/settings.json` | User MCP configuration (within `mcpServers` key) |

**JSON Schema:**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "$ENV_VAR"
      },
      "cwd": "/path/to/dir",
      "timeout": 600000,
      "trust": false,
      "includeTools": ["tool1"],
      "excludeTools": ["tool2"]
    }
  }
}
```

**Transport types:** `httpUrl` > `url` > `command` (priority order, at least one required)

**Global MCP settings:**
```json
{
  "mcp": {
    "allowed": ["serverName"],
    "excluded": ["serverName"]
  }
}
```

### Configuration

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.gemini/settings.json` | Project settings |
| **User** | `~/.gemini/settings.json` | User settings |
| **System** | See below | System settings (admin-deployed) |

**System settings locations:**
- Linux: `/etc/gemini-cli/settings.json`
- macOS: `/Library/Application Support/GeminiCli/settings.json`

**Precedence order (high → low):**
1. CLI arguments (`--model`, `--sandbox`, etc.)
2. Environment variables (`GEMINI_API_KEY`, `GEMINI_MODEL`, etc.)
3. System settings
4. Project settings (`.gemini/settings.json`)
5. User settings (`~/.gemini/settings.json`)
6. System defaults
7. Hard-coded defaults

> **Note:** `GEMINI_CLI_HOME` environment variable can change the `~/.gemini` path

**Key environment variables:**

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | API authentication key |
| `GEMINI_MODEL` | Default model |
| `GEMINI_CLI_HOME` | Config root directory (overrides `~/.gemini`) |
| `GEMINI_SANDBOX` | Sandbox mode |
| `GEMINI_SYSTEM_MD` | System prompt override |

### Ignore

| Scope | Path |
|-------|------|
| **Project** | `./.geminiignore` |

> **Note:** Uses `.gitignore` syntax. Session restart required after changes.

**settings.json related:**
```json
{
  "context": {
    "fileFiltering": {
      "respectGitIgnore": true,
      "respectGeminiIgnore": true
    }
  }
}
```

### Extensions

| Scope | Path | Description |
|-------|------|-------------|
| **User** | `~/.gemini/extensions/{name}/` | Installed extensions |

**Extension directory structure:**
```
.gemini/extensions/my-extension/
├── gemini-extension.json   # Required: manifest
├── GEMINI.md               # Optional: context
├── commands/*.toml          # Optional: custom commands
├── skills/{name}/SKILL.md   # Optional: skills
└── hooks/hooks.json         # Optional: hook definitions
```

**CLI commands:** `gemini extensions install <source>`, `gemini extensions list`, `gemini extensions enable/disable`

---

## VSCode Copilot Chat

GitHub Copilot Chat functionality within VSCode.

> **Reference:**
> - [Use custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
> - [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
> - [Use prompt files in VS Code](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
> - [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

### Rules (Instructions)

| Scope | Path | Description |
|-------|------|-------------|
| **Project (root)** | `./.github/copilot-instructions.md` | Main instructions file |
| **Project (modular)** | `./.github/instructions/*.instructions.md` | Modular instructions files |
| **Project (agents)** | `./AGENTS.md` | Agent instructions file (root) |
| **User** | VS Code profile folder | User-level instructions |

**Frontmatter Schema (modular instructions):**
```yaml
---
description: Rule description  # Optional
applyTo: "**/*.ts,**/*.tsx"    # Optional, comma-separated globs
---
```

**Related Settings:**

| Setting | Description |
|---------|-------------|
| `github.copilot.chat.codeGeneration.useInstructionFiles` | Enable `.github/copilot-instructions.md` |
| `chat.instructionsFilesLocations` | Custom instructions file search paths |
| `chat.useAgentsMdFile` | Enable `AGENTS.md` support |
| `chat.useNestedAgentsMdFiles` | Enable nested `AGENTS.md` (experimental) |

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.github/skills/{skill-name}/SKILL.md` | Project skills |
| **Project (legacy)** | `./.claude/skills/{skill-name}/SKILL.md` | Legacy compatibility (Claude Code format) |
| **User** | `~/.copilot/skills/{skill-name}/SKILL.md` | User-level skills |
| **User (legacy)** | `~/.claude/skills/{skill-name}/SKILL.md` | Legacy compatibility (Claude Code format) |

**Frontmatter Schema:**
```yaml
---
name: skill-name        # Required, max 64 characters
description: Skill description  # Required, max 1024 characters
---
```

**Related Settings:**

| Setting | Description |
|---------|-------------|
| `chat.useAgentSkills` | Enable Agent Skills feature (preview) |

### Prompts (Commands)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.github/prompts/*.prompt.md` | Project prompts |
| **User** | VS Code profile folder | User-level prompts |

**Frontmatter Schema:**
```yaml
---
name: prompt-name           # Optional, identifier after /
description: Prompt description  # Optional
agent: agent                # Optional: ask | edit | agent | custom-agent-name
model: gpt-4o               # Optional, language model
tools:                      # Optional, available tools
  - Read
  - Write
  - "<mcp-server>/*"        # MCP server tools
argument-hint: "Enter value"  # Optional
---
```

**Usage:**
- Type `/prompt-name` in chat input
- Command Palette: "Chat: Run Prompt"

**Related Settings:**

| Setting | Description |
|---------|-------------|
| `chat.promptFilesLocations` | Prompt file search paths |
| `chat.promptFilesRecommendations` | Show as suggested actions |

### MCP

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.vscode/mcp.json` | Workspace MCP configuration |
| **User** | VS Code user profile | Global MCP configuration |
| **Dev Container** | `devcontainer.json` | `customizations.vscode.mcp` section |

**JSON Schema:**
```json
{
  "inputs": [
    {
      "id": "api-key",
      "type": "promptString",
      "description": "API Key",
      "password": true
    }
  ],
  "servers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  }
}
```

> **Note:** Claude Code uses `mcpServers` key, VSCode Copilot uses `servers` key

**Related Settings:**

| Setting | Description |
|---------|-------------|
| `chat.mcp.gallery.enabled` | Enable GitHub MCP server gallery |
| `chat.mcp.autostart` | Auto-restart on configuration changes |
| `chat.mcp.discovery.enabled` | Auto-detect configuration from Claude Desktop |

---

## Copilot CLI

GitHub Copilot CLI (`npm install -g @github/copilot`) is a terminal-based AI coding agent.

> **Reference:**
> - [Installing GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
> - [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
> - [GitHub Copilot CLI Repository](https://github.com/github/copilot-cli)

### Installation

| Method | Command |
|--------|---------|
| **WinGet (Windows)** | `winget install GitHub.Copilot` |
| **Homebrew (macOS/Linux)** | `brew install copilot-cli` |
| **npm (all platforms)** | `npm install -g @github/copilot` |
| **Install script (macOS/Linux)** | `curl -fsSL https://gh.io/copilot-install \| bash` |

### Rules (Instructions)

| Scope | Path | Description |
|-------|------|-------------|
| **Project (root)** | `./.github/copilot-instructions.md` | Repository-wide instructions file |
| **Project (modular)** | `./.github/instructions/**/*.instructions.md` | Path-specific instructions files |
| **Project (agents)** | `./AGENTS.md` | Agent instructions file |

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.github/skills/{skill-name}/SKILL.md` | Project skills |
| **Global** | `~/.copilot/skills/{skill-name}/SKILL.md` | Global skills |

> **Note:** `.claude/skills/` is also read for backward compatibility

**Frontmatter Schema:**
```yaml
---
name: skill-name        # Required: lowercase, hyphens for spaces
description: Skill description  # Required
---
```

### Agents (Custom Agents)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.github/agents/` | Repository-level custom agents |
| **Global** | `~/.copilot/agents/` | User-level custom agents |
| **Enterprise** | `.github-private/agents/` | Enterprise-level agents |

**Priority:** Project > Global

### MCP

| Scope | Path | Description |
|-------|------|-------------|
| **Global** | `~/.copilot/mcp-config.json` | Global MCP configuration |

> **Note:** Copilot CLI does NOT support project-scope MCP configuration. Only user-scope (`~/.copilot/mcp-config.json`) is supported.

**JSON Schema:**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

> **Note:** Since v0.0.340, environment variables must be explicitly specified using `${VAR}` format

### Configuration

| Scope | Path | Description |
|-------|------|-------------|
| **Global** | `~/.copilot/config.json` | Main configuration file |
| **Global** | `~/.copilot/session-state/` | Session state and conversation history |

> **Note:** `XDG_CONFIG_HOME` environment variable can change the `~/.copilot` path

---

## Codex CLI (OpenAI)

OpenAI Codex CLI is a terminal-based AI coding agent.

> **Reference:**
> - [OpenAI Codex CLI](https://github.com/openai/codex)
> - [Configuration Reference](https://developers.openai.com/codex/config-reference/)
> - [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
> - [Agent Skills](https://developers.openai.com/codex/skills/)

### Rules (AGENTS.md)

| Scope | Path | Description |
|-------|------|-------------|
| **Global** | `~/.codex/AGENTS.md` | Global instructions |
| **Global (override)** | `~/.codex/AGENTS.override.md` | Global override (takes precedence) |
| **Project** | `./AGENTS.md` | Per-directory instructions (repo root to CWD) |
| **Project (override)** | `./AGENTS.override.md` | Per-directory override |

**Precedence order:** Global → Project root → ... → Current directory (closer files override earlier)

> **Note:** Custom fallback filenames can be configured via `project_doc_fallback_filenames` in config.toml

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project (CWD)** | `./.codex/skills/{skill-name}/SKILL.md` | Current directory skills |
| **Project (repo)** | `$REPO_ROOT/.codex/skills/{skill-name}/SKILL.md` | Repository root skills |
| **User** | `~/.codex/skills/{skill-name}/SKILL.md` | Personal skills |
| **Admin** | `/etc/codex/skills/{skill-name}/SKILL.md` | System-level skills |
| **System** | Built-in | Default bundled skills |

**Frontmatter Schema:**
```yaml
---
name: skill-name           # Required
description: Skill description  # Required
metadata:
  short-description: Brief description  # Optional, user-facing
---
```

### Configuration

| Scope | Path | Description |
|-------|------|-------------|
| **User** | `~/.codex/config.toml` | Main configuration file |
| **Admin** | `requirements.toml` | Admin-enforced constraints |

> **Note:** `CODEX_HOME` environment variable can change the `~/.codex` path

**Custom instructions** can be added via:
- `developer_instructions` in config.toml (inline)
- `model_instructions_file` in config.toml (file path)

### MCP

MCP servers are configured in `~/.codex/config.toml` under `mcp_servers.<id>.*`

**TOML Schema (stdio):**
```toml
[mcp_servers.server-name]
enabled = true
command = "npx"
args = ["-y", "package-name"]
cwd = "/path/to/dir"  # Optional
startup_timeout_sec = 10  # Optional
tool_timeout_sec = 60  # Optional

[mcp_servers.server-name.env]
API_KEY = "value"
```

**TOML Schema (HTTP):**
```toml
[mcp_servers.server-name]
enabled = true
url = "https://example.com/mcp"
bearer_token_env_var = "MCP_TOKEN"  # Optional

[mcp_servers.server-name.http_headers]
X-Custom-Header = "value"
```

---

## Roo Code

Roo Code (formerly Roo Cline) is a VSCode extension for AI-assisted coding with customizable modes.

> **Reference:**
> - [Roo Code Documentation](https://docs.roocode.com/)
> - [Custom Instructions](https://docs.roocode.com/features/custom-instructions)
> - [Skills](https://docs.roocode.com/features/skills)
> - [Slash Commands](https://docs.roocode.com/features/slash-commands)
> - [Custom Modes](https://docs.roocode.com/features/custom-modes)
> - [MCP in Roo Code](https://docs.roocode.com/features/mcp/using-mcp-in-roo)

### Rules (Instructions)

**Directory-based (recommended):**

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.roo/rules/` | Project rules (all modes) |
| **Project (mode)** | `./.roo/rules-{modeSlug}/` | Mode-specific project rules |
| **Global** | `~/.roo/rules/` | Global rules (all workspaces) |
| **Global (mode)** | `~/.roo/rules-{modeSlug}/` | Mode-specific global rules |

**Fallback (single file, used only when directory-based rules don't exist):**

| File | Description |
|------|-------------|
| `.roorules` | Project rules (all modes) |
| `.roorules-{modeSlug}` | Mode-specific project rules |
| `.clinerules` | Legacy compatibility |
| `.clinerules-{modeSlug}` | Legacy compatibility (mode-specific) |

**AGENTS.md support:**
- `AGENTS.md` at workspace root is read by default
- Disable via: `"roo-cline.useAgentRules": false`

> **Note:** Rule files in directories are read recursively, sorted alphabetically by base name. Supported formats: `.md`, `.txt`, and other plain text files.

**Priority (low → high):**
1. Global rules (`~/.roo/rules/`)
2. Workspace rules (`.roo/rules/`) — overrides global
3. Legacy files (`.roorules`, `.clinerules`) — only when directory-based rules don't exist

### Skills

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.roo/skills/{skill-name}/SKILL.md` | Project skills (all modes) |
| **Project (mode)** | `./.roo/skills-{modeSlug}/{skill-name}/SKILL.md` | Mode-specific project skills |
| **Global** | `~/.roo/skills/{skill-name}/SKILL.md` | Global skills |
| **Global (mode)** | `~/.roo/skills-{modeSlug}/{skill-name}/SKILL.md` | Mode-specific global skills |

**Frontmatter Schema:**
```yaml
---
name: skill-name           # Required, 1-64 chars, lowercase + hyphens, must match directory name
description: Skill description  # Required, 1-1024 chars
---
```

**Override priority (high → low):**
1. Project mode-specific (`.roo/skills-{modeSlug}/`)
2. Project general (`.roo/skills/`)
3. Global mode-specific (`~/.roo/skills-{modeSlug}/`)
4. Global general (`~/.roo/skills/`)

> **Note:** Skills are fully disabled when `.roo/system-prompt-{mode-slug}` exists.

### Commands (Slash Commands)

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.roo/commands/*.md` | Project commands |
| **Global** | `~/.roo/commands/*.md` | Global commands |

**Frontmatter Schema:**
```yaml
---
description: Command description     # Optional
argument-hint: <placeholder-text>    # Optional
mode: mode-slug                      # Optional, mode to use when executing
---
```

> **Note:** Filename becomes command name (e.g., `review.md` → `/review`). Project commands override same-named global commands.

### Modes (Custom Agents)

| Scope | Path | Format | Description |
|-------|------|--------|-------------|
| **Project** | `./.roomodes` | YAML or JSON | Project custom modes (highest priority) |
| **Global** | `{globalStorage}/settings/custom_modes.yaml` | YAML | Global custom modes (recommended) |
| **Global (legacy)** | `{globalStorage}/settings/custom_modes.json` | JSON | Global custom modes (legacy) |

**globalStorage paths:**
- macOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/`
- Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/`
- Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\`

**Schema:**
```yaml
customModes:
  - slug: my-mode              # Required: /^[a-zA-Z0-9-]+$/
    name: My Custom Mode       # Required: display name
    roleDefinition: |          # Required: system prompt prefix
      You are an expert in...
    groups:                    # Required: tool access control
      - read
      - - edit
        - fileRegex: \.(md|mdx)$
          description: Markdown files only
      - browser
      - command
      - mcp
    description: Short summary   # Optional
    whenToUse: |                 # Optional: orchestration guidance
      Use this mode when...
    customInstructions: |        # Optional: appended to system prompt
      Additional guidelines...
```

**Built-in modes:** `code`, `debug`, `ask`, `architect`, `orchestrator`

### MCP

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.roo/mcp.json` | Project MCP configuration |
| **Global** | `{globalStorage}/settings/cline_mcp_settings.json` | Global MCP configuration |

**JSON Schema (STDIO):**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "cwd": "/working/directory",
      "env": {
        "API_KEY": "your-key"
      },
      "alwaysAllow": ["tool1", "tool2"],
      "disabled": false
    }
  }
}
```

**JSON Schema (Streamable HTTP):**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "streamable-http",
      "url": "https://example.com/mcp",
      "headers": {},
      "alwaysAllow": [],
      "disabled": false
    }
  }
}
```

> **Note:** Project-level overrides global when same server name is defined in both.

### Ignore

| Scope | Path |
|-------|------|
| **Project** | `./.rooignore` |

> **Note:** Uses `.gitignore` syntax. Affects `read_file`, `write_to_file`, `apply_diff`, `list_code_definition_names` tools.

### System Prompt Override

| Scope | Path | Description |
|-------|------|-------------|
| **Project** | `./.roo/system-prompt-{mode-slug}` | Completely overrides system prompt for a mode |

> **Warning:** This bypasses all standard sections (tool descriptions, rules, skills). Use with caution.

---

## Directory Structure Comparison

### Project Level

```
Project Root/
├── CLAUDE.md                           # Claude Code (root rule)
├── GEMINI.md                           # Gemini CLI (project instructions)
├── AGENTS.md                           # Codex CLI, Copilot CLI, VSCode Copilot Chat, Roo Code (root rule)
├── AGENTS.override.md                  # Codex CLI (override)
├── .mcp.json                           # Claude Code (MCP)
├── .claudeignore                       # Claude Code (ignore)
├── .geminiignore                       # Gemini CLI (ignore)
├── .rooignore                          # Roo Code (ignore)
├── .roomodes                           # Roo Code (project custom modes, YAML/JSON)
├── .roorules                           # Roo Code (fallback rules)
├── .roorules-{modeSlug}               # Roo Code (fallback mode-specific rules)
│
├── .claude/
│   ├── CLAUDE.local.md                 # Claude Code (local memory, gitignored)
│   ├── settings.json                   # Claude Code (project settings)
│   ├── settings.local.json             # Claude Code (local settings, gitignored)
│   ├── agents/*.md                     # Claude Code (subagents)
│   ├── commands/*.md                   # Claude Code (commands - legacy)
│   └── skills/{name}/SKILL.md          # Claude Code, VSCode Copilot Chat (skills)
│
├── .codex/
│   └── skills/{name}/SKILL.md          # Codex CLI (skills)
│
├── .gemini/
│   ├── settings.json                   # Gemini CLI (project settings + MCP)
│   ├── commands/*.toml                 # Gemini CLI (project custom commands)
│   └── skills/{name}/SKILL.md          # Gemini CLI (project skills)
│
├── .geminiignore                       # Gemini CLI (ignore)
│
├── .github/
│   ├── copilot-instructions.md         # VSCode Copilot Chat, Copilot CLI (root rule)
│   ├── instructions/*.instructions.md  # VSCode Copilot Chat, Copilot CLI (modular rules)
│   ├── agents/                         # Copilot CLI (custom agents)
│   ├── prompts/*.prompt.md             # VSCode Copilot Chat (prompts)
│   └── skills/{name}/SKILL.md          # VSCode Copilot Chat, Copilot CLI (skills)
│
├── .roo/
│   ├── rules/                          # Roo Code (project rules, all modes)
│   ├── rules-{modeSlug}/              # Roo Code (project mode-specific rules)
│   ├── skills/{name}/SKILL.md          # Roo Code (project skills)
│   ├── skills-{modeSlug}/{name}/SKILL.md  # Roo Code (project mode-specific skills)
│   ├── commands/*.md                   # Roo Code (project slash commands)
│   ├── mcp.json                        # Roo Code (project MCP)
│   └── system-prompt-{mode-slug}       # Roo Code (system prompt override)
│
└── .vscode/
    └── mcp.json                        # VSCode Copilot Chat (MCP)
```

### User Level (Global)

```
User Home (~)/
├── .claude/
│   ├── CLAUDE.md                       # Claude Code (user memory)
│   ├── settings.json                   # Claude Code (user settings)
│   ├── agents/*.md                     # Claude Code (user subagents)
│   ├── commands/*.md                   # Claude Code (user commands - legacy)
│   └── skills/{name}/SKILL.md          # Claude Code, VSCode Copilot Chat (user skills)
│
├── .claude.json                        # Claude Code (preferences, OAuth, MCP servers)
│
├── .codex/
│   ├── AGENTS.md                       # Codex CLI (global instructions)
│   ├── AGENTS.override.md              # Codex CLI (global override)
│   ├── config.toml                     # Codex CLI (config + MCP)
│   └── skills/{name}/SKILL.md          # Codex CLI (user skills)
│
├── .gemini/
│   ├── GEMINI.md                       # Gemini CLI (user instructions)
│   ├── settings.json                   # Gemini CLI (user settings + MCP)
│   ├── commands/*.toml                 # Gemini CLI (user custom commands)
│   ├── skills/{name}/SKILL.md          # Gemini CLI (user skills)
│   └── extensions/{name}/              # Gemini CLI (installed extensions)
│
├── .copilot/
│   ├── config.json                     # Copilot CLI (main config)
│   ├── mcp-config.json                 # Copilot CLI (global MCP)
│   ├── agents/                         # Copilot CLI (global custom agents)
│   ├── skills/{name}/SKILL.md          # Copilot CLI, VSCode Copilot Chat (global skills)
│   └── session-state/                  # Copilot CLI (session storage)
│
└── .roo/
    ├── rules/                          # Roo Code (global rules, all modes)
    ├── rules-{modeSlug}/              # Roo Code (global mode-specific rules)
    ├── skills/{name}/SKILL.md          # Roo Code (global skills)
    ├── skills-{modeSlug}/{name}/SKILL.md  # Roo Code (global mode-specific skills)
    └── commands/*.md                   # Roo Code (global slash commands)

# Roo Code VS Code Extension Global Storage
# macOS:   ~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/
# Linux:   ~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/
# Windows: %APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\
{globalStorage}/
└── settings/
    ├── cline_mcp_settings.json         # Roo Code (global MCP)
    ├── custom_modes.yaml               # Roo Code (global custom modes, recommended)
    └── custom_modes.json               # Roo Code (global custom modes, legacy)
```

---

## VSCode Copilot Chat vs Copilot CLI Comparison

| Feature | VSCode Copilot Chat | Copilot CLI |
|---------|---------------------|-------------|
| **Environment** | VSCode | Terminal |
| **Installation** | VSCode extension | `npm install -g @github/copilot` etc. |
| **Rules (root)** | `.github/copilot-instructions.md`, `AGENTS.md` | `.github/copilot-instructions.md`, `AGENTS.md` |
| **Rules (modular)** | `.github/instructions/*.instructions.md` | `.github/instructions/**/*.instructions.md` |
| **Skills (Project)** | `.github/skills/`, `.claude/skills/` (legacy) | `.github/skills/` |
| **Skills (Global)** | `~/.copilot/skills/`, `~/.claude/skills/` (legacy) | `~/.copilot/skills/` |
| **Prompts** | `.github/prompts/*.prompt.md` | - |
| **Agents** | - | `.github/agents/`, `~/.copilot/agents/` |
| **MCP (Project)** | `.vscode/mcp.json` | - (not supported) |
| **MCP (Global)** | VS Code user profile | `~/.copilot/mcp-config.json` |
| **Config** | VSCode settings | `~/.copilot/config.json` |

---

## References

- [Claude Code Documentation](https://code.claude.com/docs/en)
- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Gemini CLI GitHub Repository](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI Installation](https://geminicli.com/docs/get-started/installation/)
- [Gemini CLI Configuration](https://geminicli.com/docs/get-started/configuration/)
- [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/)
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/)
- [Gemini CLI Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
- [Gemini CLI MCP Servers](https://geminicli.com/docs/tools/mcp-server/)
- [Gemini CLI .geminiignore](https://geminicli.com/docs/cli/gemini-ignore/)
- [Gemini CLI Extensions](https://geminicli.com/docs/extensions/)
- [Roo Code Documentation](https://docs.roocode.com/)
- [Roo Code Custom Instructions](https://docs.roocode.com/features/custom-instructions)
- [Roo Code Skills](https://docs.roocode.com/features/skills)
- [Roo Code Slash Commands](https://docs.roocode.com/features/slash-commands)
- [Roo Code Custom Modes](https://docs.roocode.com/features/custom-modes)
- [Roo Code MCP](https://docs.roocode.com/features/mcp/using-mcp-in-roo)
- [Roo Code .rooignore](https://docs.roocode.com/features/rooignore)
- [Roo Code System Prompt Override](https://docs.roocode.com/advanced-usage/footgun-prompting)
- [Use custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Use prompt files in VS Code](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Installing GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [GitHub Copilot CLI Repository](https://github.com/github/copilot-cli)
- [OpenAI Codex CLI](https://github.com/openai/codex)
- [Codex Configuration Reference](https://developers.openai.com/codex/config-reference/)
- [Codex Agent Skills](https://developers.openai.com/codex/skills/)
- [Codex AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md)
