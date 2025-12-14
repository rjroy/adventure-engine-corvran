// Input validation for Adventure Engine
// Prevents path traversal, prompt injection, and other attacks

import { resolve, join, normalize } from "node:path";

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
