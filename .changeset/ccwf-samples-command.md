---
"@cc-wf-studio/cli": minor
---

Add `ccwf samples` command: `samples list` shows the bundled example workflows (id, difficulty, node count, tags, locales) and `samples copy <id> [--locale <loc>] [--output <path>]` scaffolds one locally, ready for `ccwf preview` / `ccwf run`. The sample workflows that previously shipped only with the VSCode extension are now bundled into the CLI package at build time.
