// Entry point for Adventure Engine Backend
// Starts the Bun server with HTTP and WebSocket support

import { env, validateEnv } from "./env";
import server, {
  heartbeatInterval,
  imageGeneratorService,
  drainConnections,
} from "./server";
import { logger } from "./logger";
import { initializeShutdown } from "./shutdown";

// Validate environment variables before starting server
// Fails fast with clear error message if configuration is invalid
validateEnv();

const PORT = env.port;
const HOST = env.host;

logger.info({ host: HOST, port: PORT }, "Starting Adventure Engine Backend");

const bunServer = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: server.fetch,
  websocket: server.websocket,
});

// Initialize graceful shutdown handlers
initializeShutdown({
  server: bunServer,
  heartbeatInterval,
  imageGeneratorService,
  drainConnections,
});

logger.info({ url: `http://${HOST}:${PORT}`, wsEndpoint: `ws://${HOST}:${PORT}/ws` }, "Server running");
