/**
 * Structured Logging Module
 *
 * Provides centralized, structured logging using pino.
 * Features:
 * - JSON output in production, pretty output in development
 * - Log level filtering via LOG_LEVEL environment variable
 * - Optional rotating file logs via LOG_FILE environment variable
 * - Child loggers for request context propagation
 * - Consistent format across all backend modules
 */

import pino from "pino";

const level = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";
const enableFileLogging = process.env.LOG_FILE === "true";

/**
 * Build pino transport configuration.
 *
 * - Development: JSON to stdout
 * - Production: JSON to stdout
 * - LOG_FILE=true: Also write to rotating log files in ./logs/
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
 * - LOG_FILE: Set to "true" to enable rotating file logs in ./logs/
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
  formatters: !isProduction
    ? {
        level: (label: string) => ({ level: label }),
      }
    : undefined,
});

export type Logger = pino.Logger;
