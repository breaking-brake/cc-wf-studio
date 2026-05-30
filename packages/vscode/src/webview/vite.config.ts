/**
 * Claude Code Workflow Studio - Vite Configuration
 *
 * Vite build configuration for the Webview UI
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Emit asset references as relative paths (e.g. `./assets/main.js`) so the
  // built HTML can be served under any URL prefix. ccwf preview / canvas
  // mount the dist tree behind a `/<sessionId>/` path slug, and the VSCode
  // extension serves the same file via `asWebviewUri` which rewrites every
  // request anyway, so relative resolution works in both targets.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Canvas entry — full editor used by both the VSCode webview and `ccwf canvas`.
        main: resolve(__dirname, 'index.html'),
        // Preview entry — read-only WorkflowOverview rendered by `ccwf preview`.
        overview: resolve(__dirname, 'overview.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Generate sourcemaps only in development mode
    sourcemap: mode === 'development',
    // Target modern browsers (VSCode uses Electron)
    target: 'esnext',
    minify: 'esbuild',
    // Polyfill not needed (VSCode Electron supports modules natively).
    // Per-chunk CSS preload deps still get baked into split chunks; we
    // suppress the resulting preload errors at runtime via a
    // `vite:preloadError` listener in main.tsx.
    modulePreload: { polyfill: false },
    // Increase chunk size warning limit to 1000 kB (VSCode extension context)
    chunkSizeWarningLimit: 1000,
  },
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  // Development server configuration
  server: {
    port: 5173,
    strictPort: true,
  },
}));
