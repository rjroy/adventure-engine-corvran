import { query } from "@anthropic-ai/claude-agent-sdk";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createApp, resolveConfig } from "./app.js";

const config = resolveConfig();
const app = createApp({ queryFn: query });

const socketPath = resolve(process.env.DAEMON_SOCKET || "./corvran.sock");

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
console.log(`[daemon] Plugin paths: ${config.pluginPaths.join(", ")}`);
console.log(`[daemon] Ready.`);
