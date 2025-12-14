/**
 * Image Catalog Service
 *
 * Provides directory-based lookup for mood/genre/region-tagged background images.
 * Uses glob patterns to find matching images by naming convention.
 *
 * Naming convention: {mood}-{genre}-{region}*.png
 * Example: ominous-dark-fantasy-underground-1734567890123.png
 */

import { Glob } from "bun";
import { existsSync } from "fs";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";

/**
 * Default backgrounds directory (relative to backend root)
 */
const DEFAULT_BACKGROUNDS_DIR = "./assets/backgrounds";

/**
 * Service for finding background images by mood/genre/region using directory glob patterns.
 */
export class ImageCatalogService {
  private backgroundsDir: string;

  /**
   * Create a new ImageCatalogService instance.
   *
   * @param backgroundsDir - Path to backgrounds directory (defaults to ./assets/backgrounds)
   */
  constructor(backgroundsDir: string = DEFAULT_BACKGROUNDS_DIR) {
    this.backgroundsDir = backgroundsDir;
  }

  /**
   * Find images matching mood/genre/region using glob pattern.
   * Returns random match for variety when multiple images exist.
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @returns Image file path if found, null otherwise
   */
  findImage(mood: ThemeMood, genre: Genre, region: Region): string | null {
    const pattern = `${mood}-${genre}-${region}*.png`;
    const glob = new Glob(pattern);

    const matches: string[] = [];
    for (const match of glob.scanSync(this.backgroundsDir)) {
      matches.push(`${this.backgroundsDir}/${match}`);
    }

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
