// Input validation for Adventure Engine
// Prevents path traversal and other injection attacks

import { resolve, join, normalize } from "node:path";

/**
 * Validation result with error message if invalid
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an adventure ID to prevent path traversal attacks.
 *
 * Adventure IDs must:
 * - Not be empty
 * - Not contain path separators (/ or \)
 * - Not be "." or ".."
 * - Not contain null bytes
 *
 * @param id Adventure ID to validate
 * @returns ValidationResult indicating if ID is safe
 */
export function validateAdventureId(id: string): ValidationResult {
  // Check for empty/whitespace-only ID
  if (!id || id.trim().length === 0) {
    return { valid: false, error: "Adventure ID cannot be empty" };
  }

  // Check for null bytes (can cause truncation in some systems)
  if (id.includes("\0")) {
    return { valid: false, error: "Adventure ID contains invalid characters" };
  }

  // Check for path separators
  if (id.includes("/") || id.includes("\\")) {
    return { valid: false, error: "Adventure ID cannot contain path separators" };
  }

  // Check for directory traversal patterns
  if (id === "." || id === "..") {
    return { valid: false, error: "Adventure ID cannot be a relative directory reference" };
  }

  // Additional check: ensure ID doesn't decode to dangerous values
  // (handles URL-encoded path traversal attempts like %2F or %2e%2e)
  try {
    const decoded = decodeURIComponent(id);
    if (decoded !== id) {
      // If decoding changes the value, re-validate the decoded version
      if (decoded.includes("/") || decoded.includes("\\") ||
          decoded === "." || decoded === "..") {
        return { valid: false, error: "Adventure ID contains encoded path characters" };
      }
    }
  } catch {
    // decodeURIComponent throws on malformed input - that's fine, the raw ID is safe
  }

  return { valid: true };
}

/**
 * Safely resolve an adventure directory path, ensuring it stays within the base directory.
 *
 * This provides defense-in-depth against path traversal, even if the ID passes validation.
 *
 * @param baseDir Base adventures directory
 * @param adventureId Adventure ID
 * @returns Safe resolved path, or null if path would escape base directory
 */
export function safeResolvePath(baseDir: string, adventureId: string): string | null {
  // First validate the ID
  const validation = validateAdventureId(adventureId);
  if (!validation.valid) {
    return null;
  }

  // Resolve both paths to absolute
  const resolvedBase = resolve(baseDir);
  const resolvedPath = resolve(join(baseDir, adventureId));

  // Normalize both for consistent comparison
  const normalizedBase = normalize(resolvedBase);
  const normalizedPath = normalize(resolvedPath);

  // Ensure the resolved path is within the base directory
  // The resolved path must start with the base path plus a separator
  if (!normalizedPath.startsWith(normalizedBase + "/") &&
      normalizedPath !== normalizedBase) {
    return null;
  }

  return resolvedPath;
}
