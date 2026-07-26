// Deno ships its own `localStorage` global, backed by disk and shared by every
// process. Vitest's jsdom environment doesn't shadow it, so parallel test files
// end up writing to — and `clear()`-ing — one another's storage, which makes any
// test that round-trips localStorage randomly fail. Replace it with a plain
// in-memory store so each worker gets its own.
class MemoryStorage {
  #items = new Map<string, string>();

  get length() {
    return this.#items.size;
  }

  key(index: number) {
    return [...this.#items.keys()][index] ?? null;
  }

  getItem(key: string) {
    return this.#items.get(String(key)) ?? null;
  }

  setItem(key: string, value: string) {
    this.#items.set(String(key), String(value));
  }

  removeItem(key: string) {
    this.#items.delete(String(key));
  }

  clear() {
    this.#items.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: new MemoryStorage() as unknown as Storage,
});
