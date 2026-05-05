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
  // Webview is loaded via vscode `webview.asWebviewUri()`; absolute `/assets/...`
  // URLs in bundled CSS resolve against the webview origin (NOT the extension's
  // resource root), so font/image references break under the CSP. Relative paths
  // (`./asset.woff2`) resolve against the loaded stylesheet URL, which IS inside
  // the extension's translated webview path — so fonts/images work correctly.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
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
