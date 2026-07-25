/**
 * Minimal browser globals for the node-environment suites.
 *
 * `workflow-store.ts` reads `localStorage` while zustand's `create()` runs —
 * i.e. at module import time, before any test body executes. A per-test
 * `vi.stubGlobal` is therefore too late; the stub has to be installed by a
 * `setupFiles` entry, which vitest runs before the module graph is imported.
 *
 * In-memory and reset per test file (each file gets its own worker module
 * registry), so nothing leaks between suites and no test depends on
 * filesystem or real browser state.
 */

class MemoryStorage implements Storage {
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }

  getItem(key: string): string | null {
    return this.#entries.has(key) ? (this.#entries.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.#entries.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#entries.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new MemoryStorage();
}
