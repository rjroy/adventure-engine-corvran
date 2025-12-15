/**
 * Structured Logging Module
 *
 * Provides centralized, structured logging using pino.
 * Features:
 * - JSON output in production, pretty output in development
 * - Log level filtering via LOG_LEVEL environment variable
 * - Rotating file logs enabled by default (disable with LOG_FILE=false)
 * - Child loggers for request context propagation
 * - Consistent format across all backend modules
 */

import pino from "pino";

const level = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";
const enableFileLogging = process.env.LOG_FILE !== "false";

/**
 * Build pino transport configuration.
 *
 * - Default: stdout + rotating file logs in ./logs/
 * - LOG_FILE=false: stdout only (no file logs)
 */
function buildTransport(): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  if (enableFileLogging) {
    // Multi-target: stdout + rotating file
    return {
      targets: [
        // Always log to stdout
        {
          target: "pino/file",
          options: { destination: 1 }, // stdout
          level,
        },
        // Rotating file logs in ./logs/
        {
          target: "pino-roll",
          options: {
            file: "./logs/app",
            frequency: "daily",
            size: "10m",
            mkdir: true,
          },
          level,
        },
      ],
    };
  }

  // Development: just stdout
  if (!isProduction) {
    return {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    };
  }

  // Production without file logging: default JSON to stdout
  return undefined;
}

/**
 * Root logger instance.
 *
 * Configuration:
 * - LOG_LEVEL: Set to "debug", "info", "warn", or "error" (default: "info")
 * - NODE_ENV: Set to "production" for JSON output, otherwise pretty output
 * - LOG_FILE: Set to "false" to disable rotating file logs (default: enabled)
 *
 * Usage:
 * ```typescript
 * import { logger } from "./logger";
 *
 * // Simple logging
 * logger.info("Server started");
 *
 * // With context
 * logger.info({ adventureId: "abc123", connId: "conn_1" }, "WebSocket opened");
 *
 * // Create child logger for request context
 * const reqLogger = logger.child({ adventureId: "abc123" });
 * reqLogger.info("Processing input"); // automatically includes adventureId
 * ```
 */
export const logger = pino({
  level,
  transport: buildTransport(),
  // Custom formatters not allowed with multi-target transport
  formatters:
    !isProduction && !enableFileLogging
      ? {
          level: (label: string) => ({ level: label }),
        }
      : undefined,
});

export type Logger = pino.Logger;

/**
 * Counter for generating unique request IDs within the same millisecond
 */
let requestCounter = 0;

/**
 * Create a request-scoped child logger with correlation IDs.
 *
 * All logs from this logger will include reqId, connId, and optionally adventureId,
 * enabling correlation of all log entries from a single request.
 *
 * @param connId Connection ID (from WebSocket connection)
 * @param adventureId Optional adventure ID for additional context
 * @returns Object containing the child logger and generated request ID
 *
 * @example
 * ```typescript
 * const { logger: reqLogger, reqId } = createRequestLogger("conn_1_123", "abc-123");
 * reqLogger.info("Processing input"); // includes reqId, connId, adventureId
 * ```
 */
export function createRequestLogger(
  connId: string,
  adventureId?: string
): { logger: pino.Logger; reqId: string } {
  const reqId = `req_${connId}_${++requestCounter}_${Date.now()}`;
  const childLogger = logger.child({
    reqId,
    connId,
    ...(adventureId && { adventureId }),
  });
  return { logger: childLogger, reqId };
}

/**
 * Reset request counter (for testing only)
 */
export function _resetRequestCounter(): void {
  requestCounter = 0;
}
