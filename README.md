<p align="center">
  <img src="./resources/icon-large.png" alt="CC Workflow Studio Icon" width="128">
</p>

# CC Workflow Studio

<p align="center">
  <a href="https://github.com/breaking-brake/cc-wf-studio/stargazers"><img src="https://img.shields.io/github/stars/breaking-brake/cc-wf-studio" alt="GitHub Stars" /></a>
  <a href="https://snyk.io/test/github/breaking-brake/cc-wf-studio"><img src="https://snyk.io/test/github/breaking-brake/cc-wf-studio/badge.svg" alt="Known Vulnerabilities" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=breaking-brake.cc-wf-studio"><img src="https://img.shields.io/visual-studio-marketplace/v/breaking-brake.cc-wf-studio?label=VS%20Marketplace" alt="VS Code Marketplace" /></a>
  <a href="https://open-vsx.org/extension/breaking-brake/cc-wf-studio"><img src="https://img.shields.io/open-vsx/v/breaking-brake/cc-wf-studio?label=OpenVSX" alt="OpenVSX" /></a>
  <a href="https://deepwiki.com/breaking-brake/cc-wf-studio"><img src="https://img.shields.io/badge/Ask-DeepWiki-009485" alt="Ask DeepWiki" /></a>
</p>

<p align="center">
  <img src="./resources/hero.png" alt="CC Workflow Studio" width="800">
</p>

<p align="center">
  <strong>Visual Workflow Editor for AI Agents</strong>
</p>

<span id="github-copilot-support"></span><span id="openai-codex-support"></span><span id="roo-code-support"></span><span id="gemini-cli-support"></span>

| Agent | Export Format | Requires |
|-------|--------------|----------|
| Claude Code | `.claude/agents/` `.claude/commands/` | [Claude Code](https://github.com/anthropics/claude-code) |
| GitHub Copilot Chat | `.github/prompts/` | [Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) |
| GitHub Copilot CLI | `.github/skills/` | [Copilot CLI](https://github.com/github/copilot-cli) |
| OpenAI Codex CLI | `.codex/skills/` | [Codex CLI](https://github.com/openai/codex) |
| Roo Code | `.roo/skills/` | [Roo Code](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline) |
| Gemini CLI | `.gemini/skills/` | [Gemini CLI](https://github.com/google-gemini/gemini-cli) |

> **Note:** Agents other than Claude Code require activation from Toolbar's **More** menu.

<!-- Hero image placeholder - recommended size: 1600x900px or 16:9 aspect ratio -->
<!-- Place image at: /resources/hero.png -->

---

<!-- AI Edit Demo GIF: PR Code Review Workflow -->
<p align="center">
  <img src="./resources/demo_edit_with_ai.gif" alt="AI-Assisted Workflow Creation Demo - PR Code Review" width="800">
</p>

<p align="center">
  <em>✨ Edit with AI: Create a PR code review workflow with MCP, Skills, and conditional branching – All with natural language</em>
</p>

---

<!-- Run Workflow Demo GIF -->
<p align="center">
  <img src="./resources/demo_run_workflow.gif" alt="Run Workflow Demo - Execute workflows directly from the editor" width="800">
</p>

<p align="center">
  <em>▶️ Run workflows directly from the editor – See your AI automation in action instantly</em>
</p>

---

## Key Features

🔀 **Visual Workflow Editor** - Intuitive drag-and-drop canvas for designing AI agent orchestrations without code

🤖 **Agentic Engineering** - Design multi-agent workflows with Sub-Agent orchestration, Agent Skills, and MCP tool integration — the building blocks of agentic engineering

✨ **Edit with AI** - Iteratively improve workflows through conversational AI - ask for changes, add features, or refine logic with natural language feedback

⚡ **One-Click Export & Run** - Export workflows to ready-to-use formats and run directly from the editor

## How to Use

### Launch the Extension

- Click the <img src="./resources/icon.png" alt="icon" height="16" style="vertical-align: middle"> icon in the top-right corner of the editor
- Or: Command Palette (`Cmd+Shift+P`) → **"CC Workflow Studio: Open Editor"**

### Create a Workflow

- Add nodes from the palette and configure their settings, or use [Edit with AI](#edit-with-ai).

### Save & Load

- Click Save <img src="./resources/icon-save.png" alt="save" height="16" style="vertical-align: middle"> button in the toolbar to store your workflow as `.vscode/workflows/*.json`
- Click Load <img src="./resources/icon-file-down.png" alt="load" height="16" style="vertical-align: middle"> button in the toolbar to open a saved `.json` workflow

### Export & Run

- Click Export <img src="./resources/icon-export.png" alt="export" height="16" style="vertical-align: middle"> button in the toolbar to create a `.md` slash command or agent skill (use `/workflow-name` in AI coding agents)
- Click Run <img src="./resources/icon-play.png" alt="run" height="16" style="vertical-align: middle"> button in the toolbar to run your workflow directly in AI coding agents

### Edit with AI

- Click Edit with AI <img src="./resources/icon-sparkles.png" alt="sparkles" height="16" style="vertical-align: middle"> button in the toolbar to generate or refine workflows with natural language
- **Native with MCP Server**: Click an AI agent button (Claude Code, Copilot Chat, Copilot CLI, Codex, Roo Code) in the Edit with AI panel to launch native AI editing. The MCP server starts automatically behind the scenes.

```mermaid
sequenceDiagram
    actor User
    participant VSCode as CC Workflow Studio
    participant MCP as MCP Server
    participant Agent as AI Agent

    User->>VSCode: Click agent button
    VSCode->>MCP: Auto start server
    VSCode->>Agent: Launch with editing skill

    loop AI edits workflow
        Agent->>MCP: get_workflow
        MCP-->>Agent: workflow JSON
        Agent->>MCP: apply_workflow
        MCP->>VSCode: Update canvas
    end
```

## Usage Examples

Coming soon - Sample workflows and tutorials are under development.

## License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0-or-later).

See the [LICENSE](./LICENSE) file for the full license text.

### What this means

- You can use, modify, and distribute this software
- If you modify and deploy this software (including as a network service), you must:
  - Make your modified source code available under AGPL-3.0
  - Provide access to the source code for users interacting with the service
- Commercial use is allowed, but proprietary modifications are not

Copyright (c) 2025 breaking-brake

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=breaking-brake/cc-wf-studio&type=Date)](https://star-history.com/#breaking-brake/cc-wf-studio&Date)

## Acknowledgments

Built with [React Flow](https://reactflow.dev/) • Powered by [Claude Code](https://claude.com/claude-code) • Inspired by [Dify](https://dify.ai/)

---

**Made with CC Workflow Studio**
