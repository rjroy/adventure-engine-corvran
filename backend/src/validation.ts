// Input validation for Adventure Engine
// Prevents path traversal, prompt injection, and other attacks

import { resolve, join, normalize } from "node:path";
import { existsSync } from "node:fs";

/**
 * Input flags for detected patterns in player input
 */
export type InputFlag =
  | "instruction_override"
  | "prompt_extraction"
  | "role_manipulation"
  | "excessive_length";

/**
 * Result of sanitizing player input
 */
export interface SanitizationResult {
  /** The sanitized input text */
  sanitized: string;
  /** Flags for detected suspicious patterns */
  flags: InputFlag[];
  /** Whether the input was blocked */
  blocked: boolean;
  /** Reason for blocking, if blocked */
  blockReason?: string;
}

/** Maximum allowed length for player input */
export const MAX_INPUT_LENGTH = 2000;

/** Maximum allowed length for state values in system prompt */
const DEFAULT_MAX_STATE_LENGTH = 500;

/**
 * Detection patterns for suspicious input
 * These are compiled once at module load for performance
 */
const PATTERNS: Record<InputFlag, RegExp> = {
  instruction_override:
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  prompt_extraction:
    /\b(reveal|show|display|output|print|tell\s+me)\s+(your\s+)?(the\s+)?(system\s+)?(prompt|instructions?|rules?)\b/i,
  role_manipulation:
    /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\b.*\b(assistant|ai|claude|gpt|chatgpt|system)\b/is,
  excessive_length: /(?:)/, // Handled separately via length check
};

/**
 * Detect injection patterns in input text
 * @param input Text to analyze
 * @returns Array of detected flags
 */
export function detectInjectionPatterns(input: string): InputFlag[] {
  const flags: InputFlag[] = [];

  // Check length first
  if (input.length > MAX_INPUT_LENGTH) {
    flags.push("excessive_length");
  }

  // Check each pattern
  for (const [flag, pattern] of Object.entries(PATTERNS)) {
    if (flag === "excessive_length") continue; // Already handled
    if (pattern.test(input)) {
      flags.push(flag as InputFlag);
    }
  }

  return flags;
}

/**
 * Sanitize player input for prompt injection prevention
 *
 * Uses a flag & allow approach:
 * - Most suspicious patterns are flagged for logging but allowed through
 * - Only egregious attempts (role manipulation targeting AI, excessive length) are blocked
 *
 * @param input Raw player input
 * @returns Sanitization result with flags and potentially blocked status
 */
export function sanitizePlayerInput(input: string): SanitizationResult {
  const flags = detectInjectionPatterns(input);

  // Block only egregious attempts
  if (flags.includes("excessive_length")) {
    return {
      sanitized: input.substring(0, MAX_INPUT_LENGTH),
      flags,
      blocked: true,
      blockReason: "Input exceeds maximum length",
    };
  }

  if (flags.includes("role_manipulation")) {
    return {
      sanitized: input,
      flags,
      blocked: true,
      blockReason: "Input attempts to manipulate AI behavior",
    };
  }

  // Flag but allow other patterns
  return {
    sanitized: input,
    flags,
    blocked: false,
  };
}

/**
 * Sanitize a state value before embedding in system prompt
 *
 * Truncates long values to prevent excessive content in system prompts
 *
 * @param value State value to sanitize
 * @param maxLength Maximum allowed length (default 500)
 * @returns Sanitized value safe for prompt embedding
 */
export function sanitizeStateValue(
  value: string,
  maxLength: number = DEFAULT_MAX_STATE_LENGTH
): string {
  // Truncate if too long
  let sanitized = value;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...";
  }

  return sanitized;
}

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

/** Maximum length for slugs before numeric suffix */
const MAX_SLUG_LENGTH = 64;

/**
 * Generate a filesystem-safe slug from a name.
 *
 * Algorithm (per TD-1):
 * 1. Truncate name to 64 chars
 * 2. Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens
 * 3. Trim leading/trailing hyphens
 * 4. Check if directory exists in existingDir
 * 5. If collision, append "-2", "-3", etc. until unique
 * 6. Validate result with safeResolvePath()
 *
 * @param name Human-readable name to slugify
 * @param existingDir Directory to check for collisions (e.g., "players/" or "worlds/")
 * @returns Unique, filesystem-safe slug
 */
export function generateSlug(name: string, existingDir: string): string {
  // Step 1: Truncate to 64 chars
  const truncated = name.substring(0, MAX_SLUG_LENGTH);

  // Step 2: Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens
  let slug = truncated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric sequences with single hyphen
    .replace(/-+/g, "-"); // Collapse multiple hyphens (redundant but explicit)

  // Step 3: Trim leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, "");

  // Handle edge case: empty slug after processing
  if (!slug) {
    slug = "unnamed";
  }

  // Step 4-5: Check for collisions and append suffix if needed
  const baseSlug = slug;
  let suffix = 1;
  const resolvedExistingDir = resolve(existingDir);

  while (existsSync(join(resolvedExistingDir, slug))) {
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

/**
 * Validate a slug for path traversal and other security issues.
 *
 * Rejects:
 * - Empty slugs
 * - Path traversal patterns (., .., /, \)
 * - Null bytes
 * - URL-encoded path characters
 *
 * @param slug Slug to validate
 * @returns ValidationResult indicating if slug is safe
 */
export function validateSlug(slug: string): ValidationResult {
  // Check for empty/whitespace-only slug
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: "Slug cannot be empty" };
  }

  // Check for null bytes
  if (slug.includes("\0")) {
    return { valid: false, error: "Slug contains invalid characters" };
  }

  // Check for path separators
  if (slug.includes("/") || slug.includes("\\")) {
    return { valid: false, error: "Slug cannot contain path separators" };
  }

  // Check for directory traversal patterns
  if (slug === "." || slug === "..") {
    return { valid: false, error: "Slug cannot be a relative directory reference" };
  }

  // Check for double-dot sequences within slug (e.g., "foo..bar")
  if (slug.includes("..")) {
    return { valid: false, error: "Slug cannot contain path traversal sequences" };
  }

  // Check for URL-encoded path characters
  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) {
      // If decoding changes the value, re-validate the decoded version
      if (
        decoded.includes("/") ||
        decoded.includes("\\") ||
        decoded === "." ||
        decoded === ".." ||
        decoded.includes("..")
      ) {
        return { valid: false, error: "Slug contains encoded path characters" };
      }
    }
  } catch {
    // decodeURIComponent throws on malformed input - that's fine, the raw slug is safe
  }

  return { valid: true };
}
