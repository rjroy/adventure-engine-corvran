import { resolve } from "node:path";
export function createMockFileOps(files = {}) {
    const store = new Map(Object.entries(files));
    return {
        getStore() { return store; },
        async readDir(path) {
            const prefix = path.endsWith("/") ? path : path + "/";
            const dirs = new Set();
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
        async readFile(path) {
            const content = store.get(path);
            if (content === undefined) {
                throw new Error(`ENOENT: no such file: ${path}`);
            }
            return content;
        },
        async writeFile(path, content) {
            store.set(path, content);
        },
        async appendFile(path, content) {
            const existing = store.get(path) ?? "";
            store.set(path, existing + content);
        },
        async fileExists(path) {
            // A file exists if it's directly in the store
            if (store.has(path))
                return true;
            // A directory exists if any key starts with it as a prefix
            const prefix = path.endsWith("/") ? path : path + "/";
            for (const key of store.keys()) {
                if (key.startsWith(prefix))
                    return true;
            }
            return false;
        },
        resolvePath(...segments) {
            return resolve(...segments);
        },
    };
}
