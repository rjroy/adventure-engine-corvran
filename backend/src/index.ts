// Entry point for Adventure Engine Backend
// Starts the Bun server with HTTP and WebSocket support

import server from "./server";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || "localhost";

console.log(`Starting Adventure Engine Backend on ${HOST}:${PORT}`);

Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: server.fetch,
  websocket: server.websocket,
});

console.log(`Server running at http://${HOST}:${PORT}`);
console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
