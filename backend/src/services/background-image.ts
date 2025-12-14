/**
 * Background Image Orchestrator
 *
 * Implements catalog-first strategy for background image retrieval:
 * 1. Search catalog for existing image matching mood+genre+region
 * 2. If not found, generate new image via art-gen-mcp
 * 3. If generation fails, return fallback image
 *
 * This orchestrator composes ImageCatalogService and ImageGeneratorService,
 * coordinating the cascade logic and error handling to ensure the UI
 * always receives a valid background URL.
 *
 * Architecture:
 * - Catalog-first: Prefer cached images to avoid API costs and latency
 * - Graceful degradation: Fallback at every failure point
 * - Force generation: Optional flag to skip catalog lookup for fresh images
 * - Path-to-URL conversion: Translates file system paths to HTTP URLs
 */

import { ImageCatalogService } from "./image-catalog";
import {
  ImageGeneratorService,
  RateLimitError,
  GenerationTimeoutError,
  ReplicateAPIError,
} from "./image-generator";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";

/**
 * Configuration for BackgroundImageService
 */
interface BackgroundImageConfig {
  /** Base URL for serving static background images (e.g., "http://localhost:3000/backgrounds") */
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
 *   { baseUrl: "http://localhost:3000/backgrounds" }
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
   * Get background image URL following catalog-first cascade:
   * 1. If forceGenerate is true, skip to step 3
   * 2. Search catalog for existing image matching mood+genre+region
   * 3. If not found, attempt to generate new image
   * 4. If generation succeeds, store in catalog and return URL
   * 5. If generation fails (timeout, rate limit, error), return fallback URL
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @param forceGenerate - If true, skip catalog lookup and generate new image
   * @param narrativeContext - Optional narrative context for image generation prompts
   * @returns Background image result with URL and source metadata
   */
  async getBackgroundImage(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    forceGenerate = false,
    narrativeContext?: string
  ): Promise<BackgroundImageResult> {
    // Step 1: Check if we should skip catalog lookup
    if (forceGenerate) {
      this.log(`Force generate requested for ${mood}/${genre}/${region}`);
      return this.generateAndStore(mood, genre, region, narrativeContext);
    }

    // Step 2: Search catalog for existing image
    this.log(`Searching catalog for ${mood}/${genre}/${region}`);
    const catalogPath = this.catalog.findImage(mood, genre, region);

    if (catalogPath) {
      this.log(`Catalog hit: ${catalogPath}`);
      const url = this.pathToUrl(catalogPath);
      return {
        url,
        source: "catalog",
      };
    }

    // Step 3: Catalog miss - attempt to generate new image
    this.log(`Catalog miss for ${mood}/${genre}/${region}, attempting generation`);
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

      // No need to store in catalog - glob will find it by naming convention
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
      if (error instanceof RateLimitError) {
        this.log(`Rate limit exceeded: ${error.message}`, "error");
      } else if (error instanceof GenerationTimeoutError) {
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

    const prefix = "[BackgroundImageService]";
    switch (level) {
      case "info":
        console.log(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      case "error":
        console.error(`${prefix} ${message}`);
        break;
    }
  }
}
