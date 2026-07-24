---
"@cc-wf-studio/cli": patch
"cc-wf-studio": patch
---

Fix a webview boot race that could leave `ccwf canvas` stuck on the loading spinner forever: `WEBVIEW_READY` is now posted only after the webview's message listener is attached, so a fast host can no longer reply with `INITIAL_STATE`/`LOAD_WORKFLOW` before anyone is listening. The same ordering guarantee hardens the VSCode editor's boot handshake.
