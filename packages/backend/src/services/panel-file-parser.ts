/**
 * Panel File Parser Service
 *
 * Parses panel markdown files with YAML frontmatter for the file-based panel system.
 * Handles frontmatter validation, panel ID derivation from filenames, and path matching.
 *
 * Panel files are stored at `{playerRef}/panels/{panel-id}.md` with frontmatter
 * containing title, position, and optional priority fields.
 *
 * Requirements implemented:
 * - REQ-F-2: Panel ID derived from filename
 * - REQ-F-3: Filename validation (alphanumeric + hyphens, max 32 chars)
 * - REQ-F-4: Required `title` field (max 64 chars)
 * - REQ-F-5: Required `position` field (sidebar, header, overlay)
 * - REQ-F-6: Optional `priority` field (low, medium, high; default medium)
 */

import matter from "gray-matter";
import { z } from "zod";
import type { PanelPosition } from "../../../shared/protocol";

// ========================
// Constants from former panel-manager.ts
// ========================

/**
 * Maximum panel ID length in characters.
 * Previously defined in panel-manager.ts, now defined here for panel file parsing.
 */
export const MAX_ID_LENGTH = 32;

// ========================
// Constants
// ========================

/**
 * Maximum title length in characters (REQ-F-4).
 */
export const MAX_TITLE_LENGTH = 64;

/**
 * Regex pattern for valid panel IDs (derived from filenames).
 * Matches alphanumeric characters and hyphens only.
 */
const ID_PATTERN = /^[a-zA-Z0-9-]+$/;

/**
 * Panel priority levels for display ordering (REQ-F-6).
 */
export const PanelPrioritySchema = z.enum(["low", "medium", "high"]);

export type PanelPriority = z.infer<typeof PanelPrioritySchema>;

/**
 * Default priority when not specified in frontmatter (REQ-F-6).
 */
export const DEFAULT_PRIORITY: PanelPriority = "medium";

// ========================
// Schemas
// ========================

/**
 * Zod schema for panel frontmatter validation.
 *
 * Required fields:
 * - title: Display header (1-64 chars) [REQ-F-4]
 * - position: Panel position (sidebar, header, overlay) [REQ-F-5]
 *
 * Optional fields:
 * - priority: Display priority (low, medium, high; default medium) [REQ-F-6]
 */
export const PanelFrontmatterSchema = z.object({
  /** Display header text (1-64 chars) */
  title: z
    .string({
      required_error: "Missing required field 'title'",
      invalid_type_error: "Field 'title' must be a string",
    })
    .min(1, "Field 'title' cannot be empty")
    .max(MAX_TITLE_LENGTH, `Field 'title' exceeds ${MAX_TITLE_LENGTH} characters`),

  /** Panel display position */
  position: z.enum(["sidebar", "header", "overlay"], {
    required_error: "Missing required field 'position'",
    invalid_type_error:
      "Field 'position' must be one of: sidebar, header, overlay",
  }),

  /** Display priority for overflow handling (default: medium) */
  priority: PanelPrioritySchema.optional().default(DEFAULT_PRIORITY),
});

export type PanelFrontmatter = z.infer<typeof PanelFrontmatterSchema>;

// ========================
// Result Types
// ========================

/**
 * Result of parsing a panel file.
 * Success returns validated frontmatter and markdown body.
 * Failure returns a specific error message.
 */
export type ParsePanelFileResult =
  | {
      success: true;
      data: {
        frontmatter: PanelFrontmatter;
        body: string;
      };
    }
  | { success: false; error: string };

/**
 * Result of deriving a panel ID from a file path.
 * Success returns the validated panel ID.
 * Failure returns a specific error message.
 */
export type DerivePanelIdResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ========================
// Error Messages
// ========================

/**
 * Error messages for panel file parsing failures.
 */
export const PanelFileErrors = {
  /** Missing YAML frontmatter delimiters */
  NO_FRONTMATTER: "Panel file must have YAML frontmatter between --- delimiters",

  /** Invalid ID format in filename */
  INVALID_ID_FORMAT: (id: string): string =>
    `Invalid panel ID '${id}': must be alphanumeric with hyphens only`,

  /** ID too long */
  ID_TOO_LONG: (id: string, length: number): string =>
    `Panel ID '${id}' is ${length} chars (max ${MAX_ID_LENGTH})`,

  /** Path doesn't match panel directory pattern */
  NOT_PANEL_PATH: (path: string): string =>
    `Path '${path}' is not in a panels directory`,

  /** Frontmatter parsing failed */
  FRONTMATTER_PARSE_ERROR: (message: string): string =>
    `Failed to parse frontmatter: ${message}`,
} as const;

// ========================
// Functions
// ========================

/**
 * Parse a panel markdown file and validate its frontmatter.
 *
 * Uses gray-matter to extract YAML frontmatter and validates against
 * PanelFrontmatterSchema. Returns validated frontmatter with defaults applied
 * (e.g., priority defaults to "medium") and the markdown body content.
 *
 * @param content - Raw file content including frontmatter
 * @returns ParsePanelFileResult with frontmatter and body, or error message
 *
 * @example
 * ```typescript
 * const content = `---
 * title: Weather Status
 * position: sidebar
 * ---
 * Current conditions: Clear skies`;
 *
 * const result = parsePanelFile(content);
 * if (result.success) {
 *   console.log(result.data.frontmatter.title); // "Weather Status"
 *   console.log(result.data.frontmatter.priority); // "medium" (default)
 *   console.log(result.data.body); // "Current conditions: Clear skies"
 * }
 * ```
 */
export function parsePanelFile(content: string): ParsePanelFileResult {
  // Check for frontmatter delimiters using gray-matter's test function
  if (!matter.test(content)) {
    return { success: false, error: PanelFileErrors.NO_FRONTMATTER };
  }

  // Parse with gray-matter
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: PanelFileErrors.FRONTMATTER_PARSE_ERROR(message),
    };
  }

  // Check if frontmatter has any data (gray-matter returns empty object if none)
  if (Object.keys(parsed.data).length === 0) {
    return { success: false, error: PanelFileErrors.NO_FRONTMATTER };
  }

  // Validate frontmatter against schema
  const validation = PanelFrontmatterSchema.safeParse(parsed.data);
  if (!validation.success) {
    // Format Zod error to show specific field/constraint
    const firstIssue = validation.error.issues[0];
    const path = firstIssue.path.join(".");
    const message = path
      ? `${path}: ${firstIssue.message}`
      : firstIssue.message;
    return { success: false, error: message };
  }

  return {
    success: true,
    data: {
      frontmatter: validation.data,
      body: parsed.content.trim(),
    },
  };
}

/**
 * Derive a panel ID from a file path.
 *
 * Extracts the filename (without .md extension) and validates it as a panel ID.
 * The ID must be alphanumeric + hyphens only, max 32 characters (REQ-F-2, REQ-F-3).
 *
 * @param filePath - Path to the panel file (absolute or relative)
 * @returns DerivePanelIdResult with validated ID or error message
 *
 * @example
 * ```typescript
 * const result = derivePanelId("/players/kael/panels/weather-status.md");
 * if (result.success) {
 *   console.log(result.id); // "weather-status"
 * }
 * ```
 */
export function derivePanelId(filePath: string): DerivePanelIdResult {
  // Normalize path separators (handle Windows paths)
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Extract filename from path
  const parts = normalizedPath.split("/");
  const filename = parts[parts.length - 1] || "";

  // Remove .md extension
  const id = filename.endsWith(".md")
    ? filename.slice(0, -3)
    : filename;

  // Validate ID is not empty
  if (!id || id.length === 0) {
    return {
      success: false,
      error: PanelFileErrors.INVALID_ID_FORMAT("(empty)"),
    };
  }

  // Validate ID length
  if (id.length > MAX_ID_LENGTH) {
    return {
      success: false,
      error: PanelFileErrors.ID_TOO_LONG(id, id.length),
    };
  }

  // Validate ID pattern
  if (!ID_PATTERN.test(id)) {
    return {
      success: false,
      error: PanelFileErrors.INVALID_ID_FORMAT(id),
    };
  }

  return { success: true, id };
}

/**
 * Check if a file path is within a player's panels directory.
 *
 * Matches paths of the form `{playerRef}/panels/*.md` where playerRef
 * is the relative path to the player directory (e.g., "players/kael-thouls").
 *
 * @param path - File path to check (absolute or relative to PROJECT_DIR)
 * @param playerRef - Player reference path (e.g., "players/kael-thouls")
 * @returns true if the path is a panel file for this player
 *
 * @example
 * ```typescript
 * isPanelPath("players/kael/panels/weather.md", "players/kael"); // true
 * isPanelPath("players/kael/sheet.md", "players/kael"); // false
 * isPanelPath("/absolute/players/kael/panels/weather.md", "players/kael"); // true
 * ```
 */
export function isPanelPath(path: string, playerRef: string): boolean {
  // Normalize both paths (remove trailing slashes, ensure consistent separators)
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPlayerRef = playerRef.replace(/\\/g, "/").replace(/\/$/, "");

  // Build expected pattern: {playerRef}/panels/*.md
  const panelDirPattern = `${normalizedPlayerRef}/panels/`;

  // Check if path contains the panel directory pattern and ends with .md
  // The path may be absolute or relative, so we check if it includes the pattern
  const pathContainsPanelDir = normalizedPath.includes(panelDirPattern);
  const endsWithMd = normalizedPath.endsWith(".md");

  if (!pathContainsPanelDir || !endsWithMd) {
    return false;
  }

  // Extract the portion after /panels/ to ensure it's a direct child (not nested)
  const panelDirIndex = normalizedPath.indexOf(panelDirPattern);
  const afterPanelDir = normalizedPath.slice(
    panelDirIndex + panelDirPattern.length
  );

  // Should be just filename.md (no additional slashes)
  return !afterPanelDir.includes("/");
}

/**
 * Extract position as PanelPosition type.
 * Useful for type assertions when working with validated frontmatter.
 */
export function getFrontmatterPosition(
  frontmatter: PanelFrontmatter
): PanelPosition {
  return frontmatter.position;
}
