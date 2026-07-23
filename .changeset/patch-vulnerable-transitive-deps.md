---
"cc-wf-studio": patch
"@cc-wf-studio/cli": patch
---

Patch vulnerable transitive dependencies in the lockfile (brace-expansion, fast-uri, body-parser, and the dompurify that mermaid embeds in the bundled webview) — all in-range bumps; `pnpm audit` high-severity findings resolved.
