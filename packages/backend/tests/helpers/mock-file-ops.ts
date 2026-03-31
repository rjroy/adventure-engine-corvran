import { resolve } from "node:path";
import type { FileOps } from "../../src/types";

/**
 * In-memory FileOps for testing. Files are stored as a flat map of
 * absolute paths to contents. Directories are inferred from file paths.
 */
export type MockFileOps = FileOps & {
  getStore(): Map<string, string>;
  getBytesStore(): Map<string, Uint8Array>;
  setMtime(path: string, date: Date): void;
};

export function createMockFileOps(files: Record<string, string> = {}): MockFileOps {
  const store = new Map<string, string>(Object.entries(files));
  const bytesStore = new Map<string, Uint8Array>();
  const mtimes = new Map<string, Date>();

  return {
    getStore() { return store; },
    getBytesStore() { return bytesStore; },
    setMtime(path: string, date: Date) { mtimes.set(path, date); },
    async readDir(path: string): Promise<string[]> {
      const prefix = path.endsWith("/") ? path : path + "/";
      const dirs = new Set<string>();
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstSegment = rest.split("/")[0];
          // Only include entries that have content deeper (i.e., are directories)
          if (rest.includes("/")) {
            dirs.add(firstSegment);
          }
        }
      }
      return [...dirs].sort();
    },

    async readFile(path: string): Promise<string> {
      const content = store.get(path);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file: ${path}`);
      }
      return content;
    },

    async writeFile(path: string, content: string): Promise<void> {
      store.set(path, content);
    },

    async appendFile(path: string, content: string): Promise<void> {
      const existing = store.get(path) ?? "";
      store.set(path, existing + content);
    },

    async readFileBytes(path: string): Promise<Uint8Array> {
      const bytes = bytesStore.get(path);
      if (bytes) return bytes;
      const content = store.get(path);
      if (content !== undefined) return new TextEncoder().encode(content);
      throw new Error(`ENOENT: no such file: ${path}`);
    },

    async fileExists(path: string): Promise<boolean> {
      // A file exists if it's directly in the store (text or bytes)
      if (store.has(path) || bytesStore.has(path)) return true;
      // A directory exists if any key starts with it as a prefix
      const prefix = path.endsWith("/") ? path : path + "/";
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      for (const key of bytesStore.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },

    async stat(path: string): Promise<{ mtime: Date } | null> {
      if (!store.has(path)) return null;
      const mtime = mtimes.get(path) ?? new Date(0);
      return { mtime };
    },

    resolvePath(...segments: string[]): string {
      return resolve(...segments);
    },
  };
}
