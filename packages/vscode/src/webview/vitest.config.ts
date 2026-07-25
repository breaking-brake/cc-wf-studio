import { defineConfig } from 'vitest/config';

// Deliberately separate from `vite.config.ts`: the suites in this package test
// pure modules (serialization, stores) and need neither the React plugin nor a
// DOM. Rendering stays on manual E2E — see `docs/quality/03-assurance-map.md`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
