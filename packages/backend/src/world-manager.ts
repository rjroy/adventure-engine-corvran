// World Manager
// Handles CRUD operations for world directories in worlds/
// Each world contains: world_state.md, locations.md, characters.md, quests.md

import { mkdir, readdir, stat, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { generateSlug, validateSlug, safeResolvePath } from "./validation";

/**
 * World info returned by list()
 */
export interface WorldInfo {
  slug: string;
  name: string;
}

/**
 * Template content for world files per TD-5
 */
const WORLD_TEMPLATES = {
  "world_state.md": "# World State\n\n*World facts will be established in adventure.*",
  "locations.md": "# Locations\n\n*Discovered places will be recorded here.*",
  "characters.md": "# Characters\n\n*NPCs and notable characters will be recorded here.*",
  "quests.md": "# Quests\n\n*Active and completed quests will be tracked here.*",
  "art-style.md": "# Art Style\n\n*Optional: Define a visual style for background images in this world.*\n*Example: \"oil painting, impressionist style\" or \"pixel art, 16-bit\"*",
} as const;

/**
 * Manages world directories in PROJECT_DIR/worlds/
 * Provides CRUD operations with path traversal protection
 */
export class WorldManager {
  private worldsDir: string;

  /**
   * Create a WorldManager instance
   * @param projectDir Base project directory containing worlds/
   */
  constructor(projectDir: string) {
    this.worldsDir = join(projectDir, "worlds");
  }

  /**
   * Create a new world with the given name
   * Generates a unique slug, creates directory with template files
   *
   * @param name Human-readable world name
   * @returns The generated slug for the new world
   * @throws Error if directory creation fails
   */
  async create(name: string): Promise<string> {
    // Generate unique slug with collision detection
    const slug = generateSlug(name, this.worldsDir);

    // Validate the generated slug (defense in depth)
    const validation = validateSlug(slug);
    if (!validation.valid) {
      throw new Error(`Invalid slug generated: ${validation.error}`);
    }

    // Get safe path (validates against traversal)
    const worldPath = safeResolvePath(this.worldsDir, slug);
    if (worldPath === null) {
      throw new Error("Path traversal detected in world slug");
    }

    // Create directory atomically with restrictive permissions (0o700)
    await mkdir(worldPath, { recursive: true, mode: 0o700 });

    // Write template files atomically (write to temp, then rename)
    const writePromises = Object.entries(WORLD_TEMPLATES).map(
      async ([filename, content]) => {
        const filePath = join(worldPath, filename);
        const tempPath = join(worldPath, `.${filename}.tmp`);

        try {
          // Write with owner read/write only (0o600)
          await writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
          await rename(tempPath, filePath);
        } catch (error) {
          // Clean up temp file on error
          try {
            await unlink(tempPath);
          } catch {
            /* ignore cleanup errors */
          }
          throw error;
        }
      }
    );

    await Promise.all(writePromises);

    return slug;
  }

  /**
   * Create a world directory at a specific slug without collision detection.
   *
   * Use this for auto-creation when restoring from a saved worldRef.
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

    // Get safe path (validates against traversal)
    const worldPath = safeResolvePath(this.worldsDir, slug);
    if (worldPath === null) {
      throw new Error(`Invalid slug: path traversal detected`);
    }

    // Create directory with restrictive permissions
    await mkdir(worldPath, { recursive: true, mode: 0o700 });

    // Write template files atomically
    const writePromises = Object.entries(WORLD_TEMPLATES).map(
      async ([filename, content]) => {
        const filePath = join(worldPath, filename);
        const tempPath = join(worldPath, `.${filename}.tmp`);

        try {
          await writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
          await rename(tempPath, filePath);
        } catch (error) {
          try {
            await unlink(tempPath);
          } catch {
            /* ignore cleanup errors */
          }
          throw error;
        }
      }
    );

    await Promise.all(writePromises);
  }

  /**
   * Check if a world with the given slug exists
   *
   * @param slug World slug to check
   * @returns true if world directory exists
   */
  async exists(slug: string): Promise<boolean> {
    // Validate slug first
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return false;
    }

    // Get safe path
    const worldPath = safeResolvePath(this.worldsDir, slug);
    if (worldPath === null) {
      return false;
    }

    try {
      const stats = await stat(worldPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * List all available worlds
   *
   * @returns Array of world info objects with slug and name
   */
  async list(): Promise<WorldInfo[]> {
    try {
      const entries = await readdir(this.worldsDir, { withFileTypes: true });

      const worlds: WorldInfo[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        // Validate each directory name as a slug
        const validation = validateSlug(entry.name);
        if (!validation.valid) {
          // Skip invalid directory names
          continue;
        }

        // Use slug as display name (capitalized)
        // Future enhancement: read name from world_state.md
        const displayName = entry.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        worlds.push({
          slug: entry.name,
          name: displayName,
        });
      }

      // Sort alphabetically by name
      worlds.sort((a, b) => a.name.localeCompare(b.name));

      return worlds;
    } catch (error) {
      // If worlds directory doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get the validated filesystem path for a world
   *
   * @param slug World slug
   * @returns Absolute path to world directory, or null if invalid/traversal
   */
  getPath(slug: string): string | null {
    // Validate slug
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return null;
    }

    // Return safe resolved path
    return safeResolvePath(this.worldsDir, slug);
  }

  /**
   * Get the relative reference path for a world (for state.json worldRef).
   *
   * @param slug World slug (directory name)
   * @returns Relative path like "worlds/eldoria", or null if invalid
   */
  getRef(slug: string): string | null {
    // Validate slug first
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return null;
    }

    // Verify path safety
    const safePath = safeResolvePath(this.worldsDir, slug);
    if (safePath === null) {
      return null;
    }

    return `worlds/${slug}`;
  }

  /**
   * Get the worlds directory path
   * @returns Absolute path to worlds/ directory
   */
  getWorldsDir(): string {
    return this.worldsDir;
  }
}
