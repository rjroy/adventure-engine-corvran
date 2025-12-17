/**
 * Image Catalog Service
 *
 * Provides directory-based lookup for mood/genre/region-tagged background images.
 * Uses glob patterns to find matching images by naming convention.
 *
 * Naming convention: {mood}-{genre}-{region}*.png
 * Example: ominous-dark-fantasy-underground-1734567890123.png
 *
 * Caching: File list is cached on first lookup to avoid repeated directory scans.
 * Call invalidateCache() after adding new images to refresh the cache.
 */

import { Glob } from "bun";
import { existsSync } from "fs";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";
import { DEFAULT_PATHS } from "../paths";

/**
 * Default backgrounds directory (absolute path computed at startup)
 */
const DEFAULT_BACKGROUNDS_DIR = DEFAULT_PATHS.backgrounds;

/**
 * Service for finding background images by mood/genre/region using directory glob patterns.
 * Caches file list to avoid repeated directory scans on every theme change.
 */
export class ImageCatalogService {
  private backgroundsDir: string;
  private cachedFiles: string[] | null = null;

  /**
   * Create a new ImageCatalogService instance.
   *
   * @param backgroundsDir - Path to backgrounds directory (defaults to ./assets/backgrounds)
   */
  constructor(backgroundsDir: string = DEFAULT_BACKGROUNDS_DIR) {
    this.backgroundsDir = backgroundsDir;
  }

  /**
   * Load and cache all PNG files from the backgrounds directory.
   * Performs a single directory scan and caches the results.
   *
   * @returns Array of PNG filenames (without directory path)
   */
  private loadCache(): string[] {
    if (this.cachedFiles === null) {
      const glob = new Glob("*.png");
      this.cachedFiles = [...glob.scanSync(this.backgroundsDir)];
    }
    return this.cachedFiles;
  }

  /**
   * Invalidate the file cache, forcing a rescan on next lookup.
   * Call this after generating or adding new images to the catalog.
   */
  invalidateCache(): void {
    this.cachedFiles = null;
  }

  /**
   * Find images matching mood/genre/region using cached file list.
   * Returns random match for variety when multiple images exist.
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @returns Image file path if found, null otherwise
   */
  findImage(mood: ThemeMood, genre: Genre, region: Region): string | null {
    const prefix = `${mood}-${genre}-${region}`;
    const files = this.loadCache();

    const matches = files
      .filter((f) => f.startsWith(prefix))
      .map((f) => `${this.backgroundsDir}/${f}`);

    if (matches.length === 0) {
      return null;
    }

    // Random selection for variety when multiple images match
    const randomIndex = Math.floor(Math.random() * matches.length);
    return matches[randomIndex];
  }

  /**
   * Get fallback image path for a given mood.
   * These are default images used when no specific match exists.
   *
   * @param mood - Theme mood state
   * @returns Path to fallback image
   */
  getFallback(mood: ThemeMood): string {
    // Try mood-specific fallback first
    const moodPath = `${this.backgroundsDir}/${mood}.jpg`;
    if (existsSync(moodPath)) {
      return moodPath;
    }

    // Ultimate fallback to calm.jpg
    return `${this.backgroundsDir}/calm.jpg`;
  }
}
