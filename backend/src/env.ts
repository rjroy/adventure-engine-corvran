/**
 * Environment Variable Validation
 *
 * Validates and exports typed environment configuration at startup.
 * Fails fast with clear error messages for invalid configuration.
 *
 * Usage:
 * ```typescript
 * import { env, validateEnv } from "./env";
 *
 * // Call early in startup
 * validateEnv();
 *
 * // Access validated config
 * console.log(env.port);
 * ```
 */

import { networkInterfaces } from "os";
import { logger } from "./logger";
import { DEFAULT_PATHS } from "./paths";

/**
 * Validated environment configuration
 */
export interface EnvConfig {
  port: number;
  host: string;
  adventuresDir: string;
  allowedOrigins: string[];
  maxConnections: number;
  inputTimeout: number;
  logLevel: string;
  logFile: boolean;
  nodeEnv: string | undefined;
  staticRoot: string;
  logsDir: string;
  backgroundsDir: string;
  mockSdk: boolean;
  replicateApiToken: string | undefined;
  // History compaction settings
  /** Character threshold for triggering compaction (default 100000) */
  compactionCharThreshold: number;
  /** Number of entries to retain after compaction (default 20) */
  retainedEntryCount: number;
  /** Model to use for summarization (default "claude-3-5-haiku-latest") */
  compactionSummaryModel: string;
}

/**
 * Valid log levels
 */
export const VALID_LOG_LEVELS = ["debug", "info", "warn", "error", "fatal", "trace"];

/**
 * Validation errors collected during startup
 */
export interface ValidationResult {
  errors: string[];
  warnings: string[];
  config: EnvConfig;
}

/**
 * Parse and validate PORT environment variable
 * @throws Error if value is not a valid port number
 */
export function parsePort(value: string | undefined): number {
  if (!value) return 3000;

  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT: "${value}". Must be a number between 1 and 65535.`
    );
  }
  return port;
}

/**
 * Parse and validate MAX_CONNECTIONS environment variable
 * @throws Error if value is not a positive integer
 */
export function parseMaxConnections(value: string | undefined): number {
  if (!value) return 100;

  const max = parseInt(value, 10);
  if (isNaN(max) || max < 1) {
    throw new Error(
      `Invalid MAX_CONNECTIONS: "${value}". Must be a positive integer.`
    );
  }
  return max;
}

/**
 * Parse and validate INPUT_TIMEOUT environment variable
 * @returns Timeout in milliseconds (default 60000ms / 60 seconds)
 * @throws Error if value is not a positive integer
 */
export function parseInputTimeout(value: string | undefined): number {
  if (!value) return 60000;

  const timeout = parseInt(value, 10);
  if (isNaN(timeout) || timeout < 1000) {
    throw new Error(
      `Invalid INPUT_TIMEOUT: "${value}". Must be a positive integer >= 1000 (milliseconds).`
    );
  }
  return timeout;
}

/**
 * Parse and validate LOG_LEVEL environment variable
 * @throws Error if value is not a valid log level
 */
export function parseLogLevel(value: string | undefined): string {
  const level = value || "info";
  if (!VALID_LOG_LEVELS.includes(level)) {
    throw new Error(
      `Invalid LOG_LEVEL: "${level}". Must be one of: ${VALID_LOG_LEVELS.join(", ")}.`
    );
  }
  return level;
}

/**
 * Parse ALLOWED_ORIGINS into array.
 * Returns defaults if value is undefined, empty, or results in no valid origins.
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  const defaults = ["http://localhost:5173", "http://localhost:3000"];

  if (!value) {
    return defaults;
  }

  const origins = value.split(",").map((o) => o.trim()).filter(Boolean);

  // Fall back to defaults if parsing results in empty array
  // (e.g., "," or "   " would produce no valid origins)
  if (origins.length === 0) {
    return defaults;
  }

  return origins;
}

/**
 * Parse boolean environment variable
 */
export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Special hostnames that don't require network interface validation
 */
const SPECIAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::", "::1"]);

/**
 * Get all available IP addresses from network interfaces
 */
function getAvailableIPs(): Set<string> {
  const ips = new Set<string>();
  const interfaces = networkInterfaces();

  for (const name in interfaces) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        ips.add(info.address);
      }
    }
  }

  return ips;
}

/**
 * Validate HOST environment variable.
 * Ensures the specified IP address exists on a network interface.
 * @throws Error if HOST is not available on any network interface
 */
export function validateHost(host: string | undefined): string {
  const hostValue = host || "localhost";

  // Special hosts are always valid
  if (SPECIAL_HOSTS.has(hostValue)) {
    return hostValue;
  }

  // Check if the IP exists on any network interface
  const availableIPs = getAvailableIPs();
  if (!availableIPs.has(hostValue)) {
    const availableList = Array.from(availableIPs).join(", ");
    throw new Error(
      `HOST "${hostValue}" is not available on any network interface. ` +
        `Available IPs: ${availableList}. ` +
        `Use "localhost", "0.0.0.0", or a valid interface IP.`
    );
  }

  return hostValue;
}

/**
 * Raw environment values for testing
 */
export interface RawEnv {
  PORT?: string;
  HOST?: string;
  ADVENTURES_DIR?: string;
  ALLOWED_ORIGINS?: string;
  MAX_CONNECTIONS?: string;
  INPUT_TIMEOUT?: string;
  LOG_LEVEL?: string;
  LOG_FILE?: string;
  NODE_ENV?: string;
  STATIC_ROOT?: string;
  LOGS_DIR?: string;
  BACKGROUNDS_DIR?: string;
  MOCK_SDK?: string;
  REPLICATE_API_TOKEN?: string;
  // History compaction
  COMPACTION_CHAR_THRESHOLD?: string;
  RETAINED_ENTRY_COUNT?: string;
  COMPACTION_SUMMARY_MODEL?: string;
}

/**
 * Parse and validate COMPACTION_CHAR_THRESHOLD environment variable
 * @returns Character threshold for triggering compaction (default 100000)
 * @throws Error if value is not a positive integer
 */
export function parseCompactionCharThreshold(value: string | undefined): number {
  if (!value) return 100000;

  const threshold = parseInt(value, 10);
  if (isNaN(threshold) || threshold < 1000) {
    throw new Error(
      `Invalid COMPACTION_CHAR_THRESHOLD: "${value}". Must be a positive integer >= 1000.`
    );
  }
  return threshold;
}

/**
 * Parse and validate RETAINED_ENTRY_COUNT environment variable
 * @returns Number of entries to retain after compaction (default 20)
 * @throws Error if value is not a positive integer
 */
export function parseRetainedEntryCount(value: string | undefined): number {
  if (!value) return 20;

  const count = parseInt(value, 10);
  if (isNaN(count) || count < 2) {
    throw new Error(
      `Invalid RETAINED_ENTRY_COUNT: "${value}". Must be a positive integer >= 2.`
    );
  }
  return count;
}

/**
 * Validate environment variables and return result.
 * Accepts optional raw env object for testing.
 */
export function validateEnvironment(rawEnv: RawEnv = process.env): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse values with validation
  let port = 3000;
  let maxConnections = 100;
  let inputTimeout = 60000;
  let logLevel = "info";

  try {
    port = parsePort(rawEnv.PORT);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    maxConnections = parseMaxConnections(rawEnv.MAX_CONNECTIONS);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    inputTimeout = parseInputTimeout(rawEnv.INPUT_TIMEOUT);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    logLevel = parseLogLevel(rawEnv.LOG_LEVEL);
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Validate HOST is available on a network interface
  let host = "localhost";
  try {
    host = validateHost(rawEnv.HOST);
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Parse compaction settings
  let compactionCharThreshold = 100000;
  let retainedEntryCount = 20;

  try {
    compactionCharThreshold = parseCompactionCharThreshold(rawEnv.COMPACTION_CHAR_THRESHOLD);
  } catch (e) {
    errors.push((e as Error).message);
  }

  try {
    retainedEntryCount = parseRetainedEntryCount(rawEnv.RETAINED_ENTRY_COUNT);
  } catch (e) {
    errors.push((e as Error).message);
  }

  // Check for REPLICATE_API_TOKEN
  const replicateApiToken = rawEnv.REPLICATE_API_TOKEN;
  if (!replicateApiToken) {
    warnings.push(
      "REPLICATE_API_TOKEN not set. Image generation will be unavailable."
    );
  }

  // Build config
  const config: EnvConfig = {
    port,
    host,
    adventuresDir: rawEnv.ADVENTURES_DIR || DEFAULT_PATHS.adventures,
    allowedOrigins: parseAllowedOrigins(rawEnv.ALLOWED_ORIGINS),
    maxConnections,
    inputTimeout,
    logLevel,
    logFile: rawEnv.LOG_FILE !== "false",
    nodeEnv: rawEnv.NODE_ENV,
    staticRoot: rawEnv.STATIC_ROOT || DEFAULT_PATHS.staticRoot,
    logsDir: rawEnv.LOGS_DIR || DEFAULT_PATHS.logs,
    backgroundsDir: rawEnv.BACKGROUNDS_DIR || DEFAULT_PATHS.backgrounds,
    mockSdk: parseBoolean(rawEnv.MOCK_SDK, false),
    replicateApiToken,
    // History compaction
    compactionCharThreshold,
    retainedEntryCount,
    compactionSummaryModel: rawEnv.COMPACTION_SUMMARY_MODEL || "claude-3-5-haiku-latest",
  };

  return { errors, warnings, config };
}

// Run validation immediately on module load
const result = validateEnvironment();

/**
 * Validated environment configuration.
 * Access after calling validateEnv() to ensure errors are reported.
 */
export const env: EnvConfig = result.config;

/**
 * Validate environment variables at startup.
 * Logs warnings and throws on fatal errors.
 *
 * Call this early in the application startup, before using `env`.
 *
 * @throws Error if any environment variable has an invalid format
 */
export function validateEnv(): void {
  // Log warnings
  for (const warning of result.warnings) {
    logger.warn(warning);
  }

  // Throw on errors
  if (result.errors.length > 0) {
    const errorMessage = [
      "Environment validation failed:",
      ...result.errors.map((e) => `  - ${e}`),
    ].join("\n");

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.debug({ config: sanitizeConfig(env) }, "Environment validated");
}

/**
 * Sanitize config for logging (redact sensitive values)
 */
function sanitizeConfig(config: EnvConfig): Record<string, unknown> {
  return {
    ...config,
    replicateApiToken: config.replicateApiToken ? "[REDACTED]" : undefined,
  };
}
