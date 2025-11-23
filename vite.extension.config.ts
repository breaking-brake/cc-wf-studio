import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Vite configuration for bundling VSCode Extension Host code
 *
 * This bundles src/extension/** TypeScript files into a single output file
 * with all dependencies (including @modelcontextprotocol/sdk) included.
 */
export default defineConfig({
  build: {
    // Library mode for Node.js environment (Extension Host)
    lib: {
      entry: resolve(__dirname, 'src/extension/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },

    // Output directory
    outDir: 'dist',

    // Generate source maps for debugging
    sourcemap: true,

    // Minification (disable for easier debugging, enable for production)
    minify: false,

    rollupOptions: {
      // Mark vscode module and Node.js built-ins as external
      external: [
        'vscode',
        // Node.js built-in modules (with and without node: prefix)
        'node:assert',
        'node:child_process',
        'node:crypto',
        'node:events',
        'node:fs',
        'node:fs/promises',
        'node:http',
        'node:http2',
        'node:https',
        'node:os',
        'node:path',
        'node:process',
        'node:querystring',
        'node:readline/promises',
        'node:stream',
        'node:stream/promises',
        'node:tty',
        'node:util',
        'node:url',
        'node:zlib',
        'assert',
        'child_process',
        'crypto',
        'events',
        'fs',
        'fs/promises',
        'http',
        'http2',
        'https',
        'os',
        'path',
        'process',
        'querystring',
        'stream',
        'tty',
        'util',
        'url',
        'zlib',
      ],

      output: {
        // Ensure proper external module handling
        globals: {
          vscode: 'vscode',
        },
        // Disable code splitting - bundle everything into a single file
        inlineDynamicImports: true,
      },
    },

    // Target Node.js environment (Extension Host runs in Node.js)
    target: 'node18',

    // Don't emit index.html
    emptyOutDir: false,
  },

  // Resolve configuration
  resolve: {
    // Use Node.js builds for dependencies (prevents "window is not defined" errors)
    conditions: ['node'],
    // Ignore 'browser' field in package.json, use 'main' field instead
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
