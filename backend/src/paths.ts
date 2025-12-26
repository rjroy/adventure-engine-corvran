/**
 * Path Resolution Module
 *
 * Computes absolute paths for all default directories to ensure the server
 * works correctly regardless of the current working directory.
 *
 * Uses import.meta.dirname (Bun-native) to determine the backend root,
 * then resolves all paths relative to that.
 */

import { resolve } from "node:path";

/**
 * Backend root directory (where package.json lives).
 * Computed from this file's location: backend/src/paths.ts -> backend/
 */
export const BACKEND_ROOT = resolve(import.meta.dirname, "..");

/**
 * Resolve a path relative to the backend root directory.
 *
 * @param segments - Path segments to join and resolve
 * @returns Absolute path
 *
 * @example
 * resolveFromBackend("logs") // => "/path/to/backend/logs"
 * resolveFromBackend("assets", "backgrounds") // => "/path/to/backend/assets/backgrounds"
 */
export function resolveFromBackend(...segments: string[]): string {
  return resolve(BACKEND_ROOT, ...segments);
}

/**
 * Default paths for all configurable directories.
 * These are absolute paths computed at startup.
 *
 * Each can be overridden via environment variable:
 * - adventures: ADVENTURES_DIR
 * - logs: LOGS_DIR
 * - backgrounds: BACKGROUNDS_DIR
 * - staticRoot: STATIC_ROOT
 */
export const DEFAULT_PATHS = {
  /** Adventure save data directory */
  adventures: resolveFromBackend("adventures"),
  /** Log file output directory */
  logs: resolveFromBackend("logs"),
  /** Backend assets directory (logo, etc.) */
  assets: resolveFromBackend("assets"),
  /** Background images directory (for catalog and generation) */
  backgrounds: resolveFromBackend("assets", "backgrounds"),
  /** Frontend static files (Vite build output) */
  staticRoot: resolveFromBackend("..", "frontend", "dist"),
} as const;
