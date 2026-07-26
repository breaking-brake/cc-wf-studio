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

/**
 * Presence alone is not enough to trust. Node 22 has no `localStorage`, but
 * Node 25 exposes one that is only usable when the runtime was started with
 * `--localstorage-file` — without it the object exists while `getItem` is
 * `undefined`. A `typeof … === 'undefined'` guard therefore skips the stub on
 * Node 25 and the suites die with "getItem is not a function", passing in CI
 * (Node 22) and failing on a newer local runtime.
 *
 * So probe for the methods actually used rather than for the object.
 */
function isUsableStorage(value: unknown): value is Storage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Storage).getItem === 'function' &&
    typeof (value as Storage).setItem === 'function'
  );
}

if (!isUsableStorage(globalThis.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (!isUsableStorage(globalThis.sessionStorage)) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
