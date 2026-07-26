import { defineConfig } from 'vitest/config';

// Extension-host suites only. `src/webview` is its own workspace package with
// its own vitest config (and its own browser-global setup), so it is excluded
// here by the narrow `include` rather than by an ignore rule.
//
// `environment: 'node'` is deliberate: the modules covered here are pure —
// they neither import `vscode` nor touch the DOM — so no mocks and no jsdom.
// Anything that reaches the extension host or the filesystem stays on manual
// E2E; see `docs/quality/03-assurance-map.md`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/extension/**/*.{test,spec}.ts'],
  },
});
