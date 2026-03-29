import { createApp, resolveConfig } from "./app.js";

const config = resolveConfig();
const app = createApp();

const socketPath = process.env.DAEMON_SOCKET || "./corvran.sock";

// idleTimeout: 0 is required for SSE connections (Phase 3). The bun-types
// definition is overly strict here, so we use a type assertion.
const server = Bun.serve({
  fetch: app.fetch,
  unix: socketPath,
  idleTimeout: 0 as never,
});

console.log(`Adventure Engine daemon listening on ${socketPath}`);
console.log(`Adventures path: ${config.adventuresPath}`);
console.log(`Plugin paths: ${config.pluginPaths.join(", ")}`);
