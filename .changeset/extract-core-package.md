---
"@cc-wf-studio/core": minor
"cc-wf-studio": patch
---

Extract the pure workflow logic (schema types, validators, migration, schema parser, Mermaid generator, Slash Command formatter, built-in sub-agent metadata) and the schema resources into a new `@cc-wf-studio/core` package. The VSCode extension now consumes them through `@cc-wf-studio/core` (and `@cc-wf-studio/core/mcp` for MCP-specific types). No user-visible behavior changes.
