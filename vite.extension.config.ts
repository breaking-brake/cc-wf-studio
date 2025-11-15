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
        'node:child_process',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:os',
        'node:process',
        'node:stream',
        'child_process',
        'fs',
        'fs/promises',
        'path',
        'os',
        'process',
        'stream',
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
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
