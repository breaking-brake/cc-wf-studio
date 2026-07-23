---
'@cc-wf-studio/cli': minor
---

`ccwf validate` now accepts multiple files and directories: `ccwf validate ./workflows` validates every `*.json` under the directory (recursive, skipping `node_modules` and dot-directories) with a per-file report, a summary line, and a single exit code (0 all pass, 1 schema errors, 2 unreadable file). Multi-input `--json` prints `{ valid, files: [...] }`; single-file output and exit codes are unchanged.
