// Entry point for Adventure Engine Backend
// Starts the Bun server with HTTP and WebSocket support

import server from "./server";
import { logger } from "./logger";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || "localhost";

logger.info({ host: HOST, port: PORT }, "Starting Adventure Engine Backend");

Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: server.fetch,
  websocket: server.websocket,
});

logger.info({ url: `http://${HOST}:${PORT}`, wsEndpoint: `ws://${HOST}:${PORT}/ws` }, "Server running");
