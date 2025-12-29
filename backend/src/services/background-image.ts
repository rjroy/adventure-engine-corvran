/**
 * Background Image Orchestrator
 *
 * Generates fresh background images for each theme change:
 * 1. Generate new image via Replicate API
 * 2. Apply LRU eviction to keep disk usage bounded (100 images max)
 * 3. If generation fails, return fallback image from catalog
 *
 * This orchestrator composes ImageCatalogService and ImageGeneratorService,
 * coordinating generation and error handling to ensure the UI always
 * receives a valid background URL.
 *
 * Architecture:
 * - Generate-first: Always create fresh images for visual variety
 * - LRU eviction: Automatically prune old images to bound disk usage
 * - Graceful degradation: Fallback at every failure point
 * - Path-to-URL conversion: Translates file system paths to HTTP URLs
 */

import { ImageCatalogService } from "./image-catalog";
import {
  ImageGeneratorService,
  GenerationTimeoutError,
  ReplicateAPIError,
} from "./image-generator";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";
import { logger } from "../logger";

/**
 * Configuration for BackgroundImageService
 */
interface BackgroundImageConfig {
  /** Base URL for serving static background images (e.g., "/backgrounds") */
  baseUrl: string;
  /** Enable verbose logging for debugging */
  verbose?: boolean;
}

/**
 * Result from getting a background image
 */
export interface BackgroundImageResult {
  /** HTTP URL to the background image */
  url: string;
  /** Source of the image: catalog, generated, or fallback */
  source: "catalog" | "generated" | "fallback";
  /** Generation metadata (only present if source is "generated") */
  metadata?: {
    prompt: string;
    model: string;
    durationMs: number;
  };
}

/**
 * Orchestrator service for background image retrieval and generation.
 *
 * This service implements the catalog-first strategy defined in the Dynamic
 * Theming System plan. It coordinates between ImageCatalogService and
 * ImageGeneratorService to:
 * - Search existing catalog before generating new images
 * - Generate and store new images when catalog misses
 * - Return fallback images when generation fails
 * - Convert file system paths to frontend-consumable URLs
 *
 * Usage:
 * ```typescript
 * const catalogService = new ImageCatalogService();
 * const generatorService = new ImageGeneratorService();
 * await generatorService.initialize();
 *
 * const orchestrator = new BackgroundImageService(
 *   catalogService,
 *   generatorService,
 *   { baseUrl: "/backgrounds" }
 * );
 *
 * const result = await orchestrator.getBackgroundImage(
 *   "calm", "high-fantasy", "forest"
 * );
 * console.log(`Background URL: ${result.url} (source: ${result.source})`);
 * ```
 */
export class BackgroundImageService {
  private catalog: ImageCatalogService;
  private generator: ImageGeneratorService;
  private baseUrl: string;
  private verbose: boolean;

  /**
   * Create a new BackgroundImageService instance.
   *
   * @param catalog - Image catalog service for querying and storing image metadata
   * @param generator - Image generator service for creating new images via art-gen-mcp
   * @param config - Configuration including base URL for serving images
   */
  constructor(
    catalog: ImageCatalogService,
    generator: ImageGeneratorService,
    config: BackgroundImageConfig
  ) {
    this.catalog = catalog;
    this.generator = generator;
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.verbose = config.verbose ?? false;
  }

  /**
   * Get background image URL by generating a fresh image.
   *
   * Always generates a new image to ensure visual variety across scenes.
   * Falls back to catalog images only if generation fails.
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @param _forceGenerate - Deprecated, kept for API compatibility
   * @param narrativeContext - Optional narrative context for image generation prompts
   * @returns Background image result with URL and source metadata
   */
  async getBackgroundImage(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    _forceGenerate = false,
    narrativeContext?: string
  ): Promise<BackgroundImageResult> {
    this.log(`Generating fresh image for ${mood}/${genre}/${region}`);
    return this.generateAndStore(mood, genre, region, narrativeContext);
  }

  /**
   * Attempt to generate a new image and store it in the catalog.
   * If generation fails for any reason, return fallback image.
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @param narrativeContext - Optional narrative context for prompts
   * @returns Background image result
   */
  private async generateAndStore(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    narrativeContext?: string
  ): Promise<BackgroundImageResult> {
    try {
      // Attempt image generation
      this.log(`Generating new image for ${mood}/${genre}/${region}`);
      const result = await this.generator.generateImage(
        mood,
        genre,
        region,
        narrativeContext
      );

      // Invalidate catalog cache so new image is discoverable
      this.catalog.invalidateCache();
      this.log(`Generated image saved: ${result.filePath}`);

      // Convert path to URL
      const url = this.pathToUrl(result.filePath);

      return {
        url,
        source: "generated",
        metadata: {
          prompt: result.prompt,
          model: result.model,
          durationMs: result.durationMs,
        },
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof GenerationTimeoutError) {
        this.log(`Generation timeout: ${error.message}`, "error");
      } else if (error instanceof ReplicateAPIError) {
        this.log(
          `Replicate API error: ${error.message} (retryable: ${error.isRetryable})`,
          "error"
        );
      } else {
        this.log(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
          "error"
        );
      }

      // Return fallback image
      return this.getFallbackImage(mood);
    }
  }

  /**
   * Get fallback image for a given mood.
   * These are always available default images used when generation fails.
   *
   * @param mood - Theme mood state
   * @returns Background image result with fallback URL
   */
  private getFallbackImage(mood: ThemeMood): BackgroundImageResult {
    const fallbackPath = this.catalog.getFallback(mood);
    const url = this.pathToUrl(fallbackPath);

    this.log(`Using fallback image for ${mood}: ${url}`);

    return {
      url,
      source: "fallback",
    };
  }

  /**
   * Convert a file system path to an HTTP URL.
   *
   * This method handles two path formats:
   * - Absolute paths: /path/to/data/images/file.png -> {baseUrl}/file.png
   * - Relative paths: ./data/images/file.png -> {baseUrl}/file.png
   * - ./assets/backgrounds/calm.jpg -> {baseUrl}/calm.jpg
   *
   * @param filePath - Absolute or relative file path
   * @returns HTTP URL suitable for frontend consumption
   */
  private pathToUrl(filePath: string): string {
    // Extract filename from path (handles both Unix and Windows paths)
    const filename = filePath.split(/[/\\]/).pop() || filePath;

    // Construct full URL
    return `${this.baseUrl}/${filename}`;
  }

  /**
   * Log a message if verbose mode is enabled.
   *
   * @param message - Message to log
   * @param level - Log level (info, warn, error)
   */
  private log(message: string, level: "info" | "warn" | "error" = "info"): void {
    if (!this.verbose) return;

    const bgLogger = logger.child({ component: "BackgroundImageService" });
    switch (level) {
      case "info":
        bgLogger.debug(message);
        break;
      case "warn":
        bgLogger.warn(message);
        break;
      case "error":
        bgLogger.error(message);
        break;
    }
  }
}
