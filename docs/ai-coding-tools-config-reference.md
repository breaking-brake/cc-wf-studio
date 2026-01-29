# AI Coding Tools Configuration Reference

A summary of configuration file paths for each AI coding tool.
Created by referencing official documentation for each tool.

## Summary Table

| Tool | Rules | Skills | Commands/Prompts | Agents | MCP | Ignore |
|------|-------|--------|------------------|--------|-----|--------|
| Claude Code | Project<br>User | Project<br>User | Project<br>User | Project<br>User | Project<br>User | Project |
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

## Directory Structure Comparison

### Project Level

```
Project Root/
├── CLAUDE.md                           # Claude Code (root rule)
├── AGENTS.md                           # Codex CLI, Copilot CLI, VSCode Copilot Chat (root rule)
├── AGENTS.override.md                  # Codex CLI (override)
├── .mcp.json                           # Claude Code (MCP)
├── .claudeignore                       # Claude Code (ignore)
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
├── .github/
│   ├── copilot-instructions.md         # VSCode Copilot Chat, Copilot CLI (root rule)
│   ├── instructions/*.instructions.md  # VSCode Copilot Chat, Copilot CLI (modular rules)
│   ├── agents/                         # Copilot CLI (custom agents)
│   ├── prompts/*.prompt.md             # VSCode Copilot Chat (prompts)
│   └── skills/{name}/SKILL.md          # VSCode Copilot Chat, Copilot CLI (skills)
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
└── .copilot/
    ├── config.json                     # Copilot CLI (main config)
    ├── mcp-config.json                 # Copilot CLI (global MCP)
    ├── agents/                         # Copilot CLI (global custom agents)
    ├── skills/{name}/SKILL.md          # Copilot CLI, VSCode Copilot Chat (global skills)
    └── session-state/                  # Copilot CLI (session storage)
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
