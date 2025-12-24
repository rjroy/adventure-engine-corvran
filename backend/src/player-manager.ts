// Player Manager
// Handles CRUD operations for player character directories

import { mkdir, readdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { generateSlug, validateSlug, safeResolvePath } from "./validation";
import { logger } from "./logger";

/**
 * Player info returned by list()
 */
export interface PlayerInfo {
  /** Filesystem-safe slug (directory name) */
  slug: string;
  /** Human-readable name (from sheet.md or slug) */
  name: string;
}

/**
 * Template content for new character sheet
 * Per TD-5: Empty template that GM populates on first interaction
 */
const SHEET_TEMPLATE = `# Character Sheet

*Details to be established in adventure.*
`;

/**
 * Template content for character story
 * Tracks narrative state: story arcs, objectives, recent events
 * Game mechanics (HP, conditions, resources) belong in sheet.md
 */
const STORY_TEMPLATE = `# Character Story

*Story arcs and objectives will be recorded here.*
`;

/**
 * Manages player character directories under PROJECT_DIR/players/
 *
 * Responsibilities:
 * - Create new player directories with template files
 * - List existing players with name extraction
 * - Validate and resolve player paths securely
 * - Handle slug generation with collision detection
 *
 * Per spec requirements:
 * - REQ-F-1: Character data at {PROJECT_DIR}/players/{character-slug}/
 * - REQ-F-6: Each directory contains sheet.md and story.md
 * - REQ-F-7: Directory names are filesystem-safe slugs
 * - REQ-F-9: Slug collision appends numeric suffix
 * - REQ-F-26: Creating new character initializes with templates
 * - REQ-NF-4: Path traversal protection
 */
export class PlayerManager {
  private readonly projectDir: string;
  private readonly playersDir: string;
  private readonly log = logger.child({ component: "PlayerManager" });

  /**
   * Create a new PlayerManager
   * @param projectDir Absolute path to PROJECT_DIR
   */
  constructor(projectDir: string) {
    this.projectDir = resolve(projectDir);
    this.playersDir = join(this.projectDir, "players");
  }

  /**
   * Create a new player directory with template files.
   *
   * @param name Human-readable character name (will be slugified)
   * @returns The generated slug (directory name)
   * @throws Error if directory creation fails
   */
  async create(name: string): Promise<string> {
    // Generate unique slug with collision detection
    const slug = generateSlug(name, this.playersDir);

    // Validate the generated slug for security
    const validation = validateSlug(slug);
    if (!validation.valid) {
      throw new Error(`Invalid slug generated: ${validation.error}`);
    }

    const playerDir = join(this.playersDir, slug);

    // Atomic directory creation with restrictive permissions (0o700 = owner only)
    // Per security measures in plan: directory creation uses restrictive permissions
    await mkdir(playerDir, { recursive: true, mode: 0o700 });

    const sheetPath = join(playerDir, "sheet.md");
    const storyPath = join(playerDir, "story.md");
    const sheetTempPath = join(playerDir, ".sheet.md.tmp");
    const storyTempPath = join(playerDir, ".story.md.tmp");

    try {
      // Atomic write for sheet.md (mode 0o600 = owner read/write only)
      await writeFile(sheetTempPath, SHEET_TEMPLATE, {
        encoding: "utf-8",
        mode: 0o600,
      });
      await rename(sheetTempPath, sheetPath);

      // Atomic write for story.md
      await writeFile(storyTempPath, STORY_TEMPLATE, {
        encoding: "utf-8",
        mode: 0o600,
      });
      await rename(storyTempPath, storyPath);

      this.log.info({ slug, name }, "Created player directory");

      return slug;
    } catch (error) {
      // Clean up temp files on error
      try {
        await unlink(sheetTempPath);
      } catch {
        /* ignore */
      }
      try {
        await unlink(storyTempPath);
      } catch {
        /* ignore */
      }
      throw error;
    }
  }

  /**
   * Create a player directory at a specific slug without collision detection.
   *
   * Use this for auto-creation when restoring from a saved playerRef.
   * Unlike create(), this does NOT generate a new slug or check for collisions.
   *
   * @param slug The exact slug to use (directory name)
   * @throws Error if slug is invalid or directory creation fails
   */
  async createAtSlug(slug: string): Promise<void> {
    // Validate the slug for security
    const validation = validateSlug(slug);
    if (!validation.valid) {
      throw new Error(`Invalid slug: ${validation.error}`);
    }

    const safePath = safeResolvePath(this.playersDir, slug);
    if (safePath === null) {
      throw new Error(`Invalid slug: path traversal detected`);
    }

    const playerDir = safePath;

    // Create directory with restrictive permissions
    await mkdir(playerDir, { recursive: true, mode: 0o700 });

    const sheetPath = join(playerDir, "sheet.md");
    const storyPath = join(playerDir, "story.md");
    const sheetTempPath = join(playerDir, ".sheet.md.tmp");
    const storyTempPath = join(playerDir, ".story.md.tmp");

    try {
      // Atomic write for sheet.md
      await writeFile(sheetTempPath, SHEET_TEMPLATE, {
        encoding: "utf-8",
        mode: 0o600,
      });
      await rename(sheetTempPath, sheetPath);

      // Atomic write for story.md
      await writeFile(storyTempPath, STORY_TEMPLATE, {
        encoding: "utf-8",
        mode: 0o600,
      });
      await rename(storyTempPath, storyPath);

      this.log.info({ slug }, "Created player directory at slug");
    } catch (error) {
      // Clean up temp files on error
      try {
        await unlink(sheetTempPath);
      } catch {
        /* ignore */
      }
      try {
        await unlink(storyTempPath);
      } catch {
        /* ignore */
      }
      throw error;
    }
  }

  /**
   * Check if a player directory exists.
   *
   * @param slug Player slug (directory name)
   * @returns true if directory exists, false otherwise
   */
  exists(slug: string): boolean {
    // Validate slug before filesystem access
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return false;
    }

    const safePath = safeResolvePath(this.playersDir, slug);
    if (safePath === null) {
      return false;
    }

    return existsSync(safePath);
  }

  /**
   * List all players with their names.
   *
   * Reads each player's sheet.md to extract the character name.
   * Falls back to slug if name cannot be extracted.
   *
   * @returns Array of {slug, name} objects sorted by slug
   */
  async list(): Promise<PlayerInfo[]> {
    // Create players directory if it doesn't exist
    if (!existsSync(this.playersDir)) {
      return [];
    }

    try {
      const entries = await readdir(this.playersDir, { withFileTypes: true });
      const players: PlayerInfo[] = [];

      for (const entry of entries) {
        // Only process directories
        if (!entry.isDirectory()) {
          continue;
        }

        // Skip hidden directories
        if (entry.name.startsWith(".")) {
          continue;
        }

        // Validate slug
        const validation = validateSlug(entry.name);
        if (!validation.valid) {
          this.log.warn({ slug: entry.name }, "Skipping invalid player directory");
          continue;
        }

        // Try to extract name from sheet.md
        const name = await this.extractNameFromSheet(entry.name);

        players.push({
          slug: entry.name,
          name: name ?? entry.name,
        });
      }

      // Sort by slug for consistent ordering
      players.sort((a, b) => a.slug.localeCompare(b.slug));

      return players;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get the validated absolute path to a player directory.
   *
   * @param slug Player slug (directory name)
   * @returns Absolute path to player directory, or null if path traversal detected
   */
  getPath(slug: string): string | null {
    // Validate slug first
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return null;
    }

    return safeResolvePath(this.playersDir, slug);
  }

  /**
   * Get the relative reference path for a player (for state.json playerRef).
   *
   * @param slug Player slug (directory name)
   * @returns Relative path like "players/kael-thouls", or null if invalid
   */
  getRef(slug: string): string | null {
    // Validate slug first
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return null;
    }

    // Verify path safety
    const safePath = safeResolvePath(this.playersDir, slug);
    if (safePath === null) {
      return null;
    }

    return `players/${slug}`;
  }

  /**
   * Extract character name from sheet.md header.
   *
   * Looks for the first H1 header (# Name) in the file.
   * Returns null if file doesn't exist or no header found.
   *
   * @param slug Player slug
   * @returns Extracted name or null
   */
  private async extractNameFromSheet(slug: string): Promise<string | null> {
    const safePath = safeResolvePath(this.playersDir, slug);
    if (safePath === null) {
      return null;
    }

    const sheetPath = join(safePath, "sheet.md");

    try {
      const content = await readFile(sheetPath, "utf-8");

      // Look for first H1 header: "# Name" or "# Character Name: Kael"
      const match = content.match(/^#\s+(.+?)$/m);
      if (match) {
        const header = match[1].trim();

        // Skip template headers
        if (header === "Character Sheet") {
          return null;
        }

        // Handle "Character Name: Kael" format
        const colonMatch = header.match(/^Character\s*(?:Name)?:\s*(.+)$/i);
        if (colonMatch) {
          return colonMatch[1].trim();
        }

        // Handle "Name: Kael" format
        const nameMatch = header.match(/^Name:\s*(.+)$/i);
        if (nameMatch) {
          return nameMatch[1].trim();
        }

        return header;
      }

      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      this.log.warn({ slug, error }, "Failed to read sheet.md");
      return null;
    }
  }
}
