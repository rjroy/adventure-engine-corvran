import { query } from "@anthropic-ai/claude-agent-sdk";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { createApp, resolveConfig } from "./app";
import { buildPluginRegistry } from "./services/plugin-registry";
import type { FileOps } from "./types";

/** Minimal FileOps for registry building at startup */
const registryFileOps: FileOps = {
  async readDir(path: string) {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  },
  async readFile(path: string) {
    return readFile(path, "utf-8");
  },
  writeFile() { throw new Error("not implemented"); },
  appendFile() { throw new Error("not implemented"); },
  async fileExists(path: string) {
    try { await stat(path); return true; } catch { return false; }
  },
  async stat(path: string) {
    try { const s = await stat(path); return { mtime: s.mtime }; } catch { return null; }
  },
  async readFileBytes(path: string) {
    const buf = await Bun.file(path).arrayBuffer();
    return new Uint8Array(buf);
  },
  resolvePath(...segments: string[]) { return resolve(...segments); },
};

const config = resolveConfig();
const pluginRegistry = await buildPluginRegistry(config.pluginsDir, registryFileOps);
const app = createApp({ queryFn: query, pluginRegistry });

// Ensure ~/.corvran/ exists before writing the socket or adventures into it
mkdirSync(config.corvranHome, { recursive: true });

const socketPath = resolve(process.env.DAEMON_SOCKET || `${config.corvranHome}/corvran.sock`);

// Clean up stale socket file from a previous run
if (existsSync(socketPath)) {
  console.log(`[daemon] Removing stale socket: ${socketPath}`);
  unlinkSync(socketPath);
}

// idleTimeout: 0 is required for SSE connections (Phase 3). The bun-types
// definition is overly strict here, so we use a type assertion.
Bun.serve({
  fetch: app.fetch,
  unix: socketPath,
  idleTimeout: 0 as never,
});

console.log(`[daemon] Adventure Engine daemon listening on unix:${socketPath}`);
console.log(`[daemon] Adventures path: ${config.adventuresPath}`);
console.log(`[daemon] Plugins dir: ${config.pluginsDir}`);
console.log(`[daemon] Ready.`);
