/**
 * Graceful Shutdown Module
 *
 * Handles SIGTERM and SIGINT signals to cleanly shut down the server.
 * Ensures all resources are properly released before exit.
 */

import { logger } from "./logger";

/**
 * Dependencies required for graceful shutdown
 */
export interface ShutdownDeps {
  server: { stop(closeActiveConnections?: boolean): void };
  heartbeatInterval: ReturnType<typeof setInterval>;
  imageGeneratorService: { close(): void };
  drainConnections: (reason: string) => void;
}

let isShuttingDown = false;
let deps: ShutdownDeps | null = null;

/**
 * Initialize graceful shutdown handlers.
 * Should be called once after server starts.
 * @param d Services and server instance to clean up
 */
export function initializeShutdown(d: ShutdownDeps): void {
  deps = d;
  process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
  process.on("SIGINT", () => void handleShutdown("SIGINT"));
  logger.info("Graceful shutdown handlers registered");
}

/**
 * Handle shutdown signal.
 * Cleans up resources and exits.
 */
async function handleShutdown(signal: string): Promise<void> {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
    return;
  }

  isShuttingDown = true;
  const startTime = Date.now();

  logger.info({ signal }, "Graceful shutdown initiated");

  if (!deps) {
    logger.error("Shutdown dependencies not initialized");
    process.exit(1);
  }

  try {
    // Step 1: Stop accepting new connections
    logger.debug("Stopping server listener");
    deps.server.stop(false);

    // Step 2: Clear heartbeat interval
    logger.debug("Clearing heartbeat interval");
    clearInterval(deps.heartbeatInterval);

    // Step 3: Drain WebSocket connections with shutdown message
    logger.debug("Draining WebSocket connections");
    deps.drainConnections("Server shutting down");

    // Step 4: Close image generator service
    logger.debug("Closing image generator service");
    deps.imageGeneratorService.close();

    // Step 5: Allow time for log buffers to flush
    await new Promise((r) => setTimeout(r, 100));

    const elapsed = Date.now() - startTime;
    logger.info({ elapsed, signal }, "Graceful shutdown complete");

    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
}

/**
 * Check if shutdown is in progress.
 * Can be used by other modules to reject new work during shutdown.
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
