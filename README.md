<p align="center">
  <img src="./resources/icon-large.png" alt="CC Workflow Studio Icon" width="128">
</p>

# CC Workflow Studio

<p align="center">
  <a href="https://github.com/breaking-brake/cc-wf-studio/stargazers"><img src="https://img.shields.io/github/stars/breaking-brake/cc-wf-studio" alt="GitHub Stars" /></a>
  <a href="https://snyk.io/test/github/breaking-brake/cc-wf-studio"><img src="https://snyk.io/test/github/breaking-brake/cc-wf-studio/badge.svg" alt="Known Vulnerabilities" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=breaking-brake.cc-wf-studio"><img src="https://img.shields.io/visual-studio-marketplace/v/breaking-brake.cc-wf-studio?label=VS%20Marketplace" alt="VS Code Marketplace" /></a>
  <a href="https://open-vsx.org/extension/breaking-brake/cc-wf-studio"><img src="https://img.shields.io/open-vsx/v/breaking-brake/cc-wf-studio?label=OpenVSX" alt="OpenVSX" /></a>
</p>

<p align="center">
  <img src="./resources/hero.png" alt="CC Workflow Studio" width="800">
</p>

<p align="center">
  <strong>Accelerate Claude Code/GitHub Copilot<a href="#github-copilot-support">(※1)</a>/OpenAI Codex<a href="#openai-codex-support">(※2)</a> automation with a visual workflow editor</strong>
</p>

<p align="center">
  Design complex AI agent workflows by conversing with AI – or use intuitive drag-and-drop. Build Sub-Agent orchestrations and conditional branching with natural language, then export directly to <code>.claude</code> format.
</p>

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

🔀 **Visual Workflow Editor** - Intuitive drag-and-drop canvas for designing AI workflows without code

✨ **Edit with AI** - Iteratively improve workflows through conversational AI - ask for changes, add features, or refine logic with natural language feedback

⚡ **One-Click Export & Run** - Export workflows to ready-to-use formats and run directly from the editor:
  - **Claude Code**: `.claude/agents/` and `.claude/commands/`
  - **GitHub Copilot Chat**<a href="#github-copilot-support">(※1)</a>: `.github/prompts/`
  - **GitHub Copilot CLI**<a href="#github-copilot-support">(※1)</a>: `.github/skills/`
  - **OpenAI Codex CLI**<a href="#openai-codex-support">(※2)</a>: `.codex/skills/`

<span id="github-copilot-support">🤖</span> **GitHub Copilot Support (※1 β)** - Export & Run workflows to Copilot Chat or Copilot CLI, and use Copilot as AI provider for Edit with AI.

  **Note:**
  - Enable **Copilot** option in Toolbar's **More** menu to activate
  - Requires [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension or [Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) to be installed
  - Experimental feature; some workflows may not work as expected

<span id="openai-codex-support">🤖</span> **OpenAI Codex CLI Support (※2 β)** - Export & Run workflows to Codex CLI (Skills format).

  **Note:**
  - Enable **Codex** option in Toolbar's **More** menu to activate
  - Requires [Codex CLI](https://github.com/openai/codex) to be installed
  - Experimental feature; some workflows may not work as expected

## Getting Started

- Click the <img src="./resources/icon.png" alt="icon" height="16" style="vertical-align: middle"> icon in the top-right corner of the editor
- Or open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → **"CC Workflow Studio: Open Editor"**

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
