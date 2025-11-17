# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of Claude Code Workflow Studio seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Reporting Process

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **GitHub Security Advisory**
   - Go to the [Security tab](https://github.com/breaking-brake/cc-wf-studio/security/advisories) of this repository
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

2. **Email** (if GitHub Security Advisory is not available)
   - Contact the maintainers directly via GitHub
   - Include "SECURITY" in the subject line
   - Provide as much information as possible about the vulnerability

### What to Include in Your Report

Please include the following information:

- Type of vulnerability (e.g., code injection, privilege escalation, etc.)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Fix & Disclosure**: We aim to release a fix within 30 days, depending on complexity

## Security Measures

This project implements the following security measures:

### Automated Vulnerability Scanning

- **Snyk**: Continuous monitoring of dependencies for known vulnerabilities
  - Weekly automated scans every Monday
  - Scans on every push to `main` and `production` branches
  - PR-based scanning for all pull requests
  - [![Known Vulnerabilities](https://snyk.io/test/github/breaking-brake/cc-wf-studio/badge.svg)](https://snyk.io/test/github/breaking-brake/cc-wf-studio)

- **GitHub Dependabot**: Automated dependency updates for security patches

### Development Practices

- **Code Review**: All changes require review before merging
- **TypeScript Strict Mode**: Type safety enforcement
- **ESLint**: Static code analysis for potential security issues
- **Automated Release**: Semantic Release for controlled versioning

### VSCode Extension Security

As a VSCode extension, this project follows [VSCode Extension Security Best Practices](https://code.visualstudio.com/api/references/extension-guidelines#security):

- **Sandboxed Webview**: UI components run in isolated webview context
- **Content Security Policy**: Strict CSP headers for webview content
- **Input Validation**: All user inputs are validated and sanitized
- **Local-First Design**: Most operations run locally without network access
- **MCP Server Transparency**: Network-dependent MCP tools are clearly documented

## Known Limitations

### Network Access (MCP Nodes)

MCP Tool nodes may require network connectivity depending on the specific MCP server configuration (e.g., remote API servers). Users should:

- Review MCP server configurations before use
- Only use trusted MCP servers
- Be aware of data transmission when using remote MCP tools

### File System Access

This extension requires file system access to:

- Read/write workflows in `.vscode/workflows/`
- Export agents/commands to `.claude/agents/` and `.claude/commands/`
- Scan Skills in `~/.claude/skills/` and `.claude/skills/`

All file operations include conflict detection and user confirmation before overwriting.

## Security Updates

Security updates are released as patch versions (e.g., 2.5.1) and announced via:

- GitHub Security Advisories
- GitHub Releases
- CHANGELOG.md

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be acknowledged in the CHANGELOG (with their permission).

---

For general questions about security, please open a discussion in the [GitHub Discussions](https://github.com/breaking-brake/cc-wf-studio/discussions) section.
