---
'@cc-wf-studio/cli': patch
---

`ccwf canvas`/`ccwf preview` now print a clear "port already in use" message with next steps instead of a raw Node `EADDRINUSE` error when `--port` is taken.
