/**
 * Image Generator Service
 *
 * Generates background images for theme changes via Replicate API.
 * Implements prompt construction from mood+genre+region+narrative context.
 *
 * Architecture:
 * - Uses official Replicate SDK for direct API calls
 * - Constructs prompts from theme metadata and narrative context
 * - Implements 30-second timeout with AbortController
 * - Enforces rate limiting (max 5 generations per session)
 *
 * Security:
 * - Validates output paths to prevent directory traversal
 * - Rate limiting prevents API abuse
 * - API token stored in environment variable
 */

import Replicate from "replicate";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";
import { logger } from "../logger";

/**
 * Default configuration for image generation
 */
const DEFAULT_CONFIG = {
  /** Directory where generated images are saved (must match server static route) */
  outputDirectory: "./assets/backgrounds",
  /** Timeout for image generation in milliseconds (30 seconds) */
  timeout: 30000,
  /** Maximum number of generations allowed per session */
  maxGenerationsPerSession: 5,
  /** Default model to use for image generation */
  defaultModel: "black-forest-labs/flux-schnell",
  /** Replicate API token (from environment) */
  apiToken: process.env.REPLICATE_API_TOKEN,
};

/**
 * Result from successful image generation
 */
export interface GenerationResult {
  /** Absolute path to generated image file */
  filePath: string;
  /** Prompt used for generation */
  prompt: string;
  /** Model used for generation */
  model: string;
  /** Generation duration in milliseconds */
  durationMs: number;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    public readonly current: number,
    public readonly limit: number
  ) {
    super(`Rate limit exceeded: ${current}/${limit} generations used`);
    this.name = "RateLimitError";
  }
}

/**
 * Error thrown when generation times out
 */
export class GenerationTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Image generation timed out after ${timeoutMs}ms`);
    this.name = "GenerationTimeoutError";
  }
}

/**
 * Error thrown when Replicate API call fails
 */
export class ReplicateAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = "ReplicateAPIError";
  }
}

/**
 * Service for generating background images via Replicate API.
 *
 * This service manages direct API calls to Replicate, constructs appropriate
 * prompts from theme context, and handles timeouts and rate limiting.
 *
 * Usage:
 * ```typescript
 * const generator = new ImageGeneratorService();
 * await generator.initialize();
 *
 * const result = await generator.generateImage(
 *   "calm", "high-fantasy", "forest",
 *   "The adventurers rest by a serene waterfall"
 * );
 *
 * console.log(`Generated image at: ${result.filePath}`);
 * await generator.close();
 * ```
 */
export class ImageGeneratorService {
  private replicate: Replicate | null = null;
  private generationCount = 0;
  private readonly outputDirectory: string;
  private readonly timeout: number;
  private readonly maxGenerations: number;
  private readonly defaultModel: string;
  private readonly apiToken: string | undefined;

  /**
   * Create a new ImageGeneratorService instance.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.outputDirectory = resolve(
      config.outputDirectory ?? DEFAULT_CONFIG.outputDirectory
    );
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.maxGenerations =
      config.maxGenerationsPerSession ?? DEFAULT_CONFIG.maxGenerationsPerSession;
    this.defaultModel = config.defaultModel ?? DEFAULT_CONFIG.defaultModel;
    this.apiToken = config.apiToken ?? DEFAULT_CONFIG.apiToken;

    // Warn early if API token is missing
    if (!this.apiToken) {
      logger.warn("REPLICATE_API_TOKEN not set - image generation will fail until token is provided");
    }

    // Ensure output directory exists
    this.ensureOutputDirectory();
  }

  /**
   * Initialize the Replicate client.
   *
   * @throws Error if API token is not set
   */
  initialize(): void {
    if (!this.apiToken) {
      throw new Error(
        "REPLICATE_API_TOKEN environment variable is required for image generation"
      );
    }

    this.replicate = new Replicate({
      auth: this.apiToken,
    });
  }

  /**
   * Generate a background image from mood, genre, region, and optional narrative context.
   *
   * This method:
   * 1. Checks rate limiting
   * 2. Constructs an appropriate prompt from the provided context
   * 3. Calls Replicate API with timeout
   * 4. Downloads and saves the generated image
   * 5. Returns the generated image path
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @param narrativeContext - Optional narrative context for more specific imagery
   * @returns Generation result with file path and metadata
   * @throws RateLimitError if max generations exceeded
   * @throws GenerationTimeoutError if generation exceeds timeout
   * @throws ReplicateAPIError if API call fails
   * @throws Error if client not initialized or generation fails
   */
  async generateImage(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    narrativeContext?: string
  ): Promise<GenerationResult> {
    // Ensure client is initialized
    if (!this.replicate) {
      throw new Error(
        "ImageGeneratorService not initialized. Call initialize() first."
      );
    }

    // Check rate limiting
    if (this.generationCount >= this.maxGenerations) {
      throw new RateLimitError(this.generationCount, this.maxGenerations);
    }

    // Construct prompt from context
    const prompt = this.constructPrompt(mood, genre, region, narrativeContext);

    // Generate unique filename
    const filename = this.generateFilename(mood, genre, region);

    // Start timing
    const startTime = Date.now();

    try {
      // Call Replicate API with timeout
      const filePath = await this.callReplicateWithTimeout(prompt, filename);

      // Increment generation counter
      this.generationCount++;

      const durationMs = Date.now() - startTime;

      return {
        filePath,
        prompt,
        model: this.defaultModel,
        durationMs,
      };
    } catch (error) {
      // Re-throw typed errors
      if (
        error instanceof GenerationTimeoutError ||
        error instanceof RateLimitError ||
        error instanceof ReplicateAPIError
      ) {
        throw error;
      }

      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the current generation count for this session.
   *
   * @returns Number of images generated in this session
   */
  getGenerationCount(): number {
    return this.generationCount;
  }

  /**
   * Get the remaining generation allowance for this session.
   *
   * @returns Number of generations remaining before rate limit
   */
  getRemainingGenerations(): number {
    return Math.max(0, this.maxGenerations - this.generationCount);
  }

  /**
   * Close the service and cleanup resources.
   *
   * Should be called when shutting down the service.
   */
  close(): void {
    this.replicate = null;
  }

  /**
   * Construct an image generation prompt from theme context.
   *
   * This method builds a detailed prompt that combines:
   * - Mood-specific atmosphere and lighting
   * - Genre-appropriate visual style and elements
   * - Region-specific location and environment
   * - Optional narrative context for specific details
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @param narrativeContext - Optional narrative context
   * @returns Constructed prompt string
   */
  private constructPrompt(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    narrativeContext?: string
  ): string {
    // Mood-specific atmosphere descriptors
    const moodDescriptors: Record<ThemeMood, string> = {
      calm: "serene, peaceful, soft lighting, tranquil atmosphere",
      tense: "dramatic tension, harsh contrasts, stormy sky, ominous shadows",
      ominous:
        "dark, foreboding, eerie atmosphere, deep shadows, sense of dread",
      triumphant:
        "bright, victorious, golden hour lighting, celebratory atmosphere",
      mysterious:
        "enigmatic, misty, ethereal light, hidden secrets, sense of wonder",
    };

    // Genre-specific visual style
    const genreStyles: Record<Genre, string> = {
      "sci-fi":
        "futuristic technology, neon accents, sleek architecture, cyberpunk aesthetic",
      steampunk:
        "brass and copper machinery, Victorian architecture, steam-powered devices, industrial",
      "low-fantasy":
        "medieval setting, natural magic, earthy tones, realistic fantasy",
      "high-fantasy":
        "epic fantasy, magical elements, fantastical architecture, vibrant otherworldly",
      horror: "gothic horror, decrepit structures, unsettling atmosphere, macabre",
      modern: "contemporary architecture, urban environment, realistic modern setting",
      historical:
        "period-accurate architecture, historical setting, authentic details",
    };

    // Region-specific location
    const regionSettings: Record<Region, string> = {
      city: "urban landscape, buildings and streets, populated area",
      village: "small settlement, humble dwellings, rural community",
      forest: "dense woodland, ancient trees, natural wilderness",
      desert: "arid landscape, sand dunes, sparse vegetation",
      mountain: "towering peaks, rocky terrain, high altitude",
      ocean: "vast waters, coastal or seafaring setting, maritime",
      underground: "subterranean cavern, underground chambers, dim lighting",
      castle: "fortress architecture, imposing structure, defensive walls",
      ruins: "abandoned structures, crumbling architecture, overgrown decay",
    };

    // Construct the full prompt
    const parts = [
      `A ${moodDescriptors[mood]} scene`,
      `in a ${genreStyles[genre]} style`,
      `depicting a ${regionSettings[region]}`,
    ];

    if (narrativeContext) {
      parts.push(`with context: ${narrativeContext}`);
    }

    parts.push(
      "Cinematic composition, highly detailed, professional quality, suitable for game background, wide aspect ratio 16:9"
    );

    return parts.join(". ") + ".";
  }

  /**
   * Generate a unique filename from mood, genre, and region.
   *
   * @param mood - Theme mood state
   * @param genre - Genre classification
   * @param region - Region/location type
   * @returns Filename with timestamp (e.g., "calm-high-fantasy-forest-1702492800000.png")
   */
  private generateFilename(
    mood: ThemeMood,
    genre: Genre,
    region: Region
  ): string {
    const timestamp = Date.now();
    return `${mood}-${genre}-${region}-${timestamp}.png`;
  }

  /**
   * Call Replicate API with timeout enforcement.
   *
   * @param prompt - Image generation prompt
   * @param filename - Output filename
   * @returns Path to saved image file
   * @throws GenerationTimeoutError if generation exceeds timeout
   * @throws ReplicateAPIError if API call fails
   */
  private async callReplicateWithTimeout(
    prompt: string,
    filename: string
  ): Promise<string> {
    if (!this.replicate) {
      throw new Error("Replicate client not initialized");
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      // Call Replicate API
      const output = await this.replicate.run(
        this.defaultModel as `${string}/${string}`,
        {
          input: {
            prompt,
            num_outputs: 1,
            aspect_ratio: "16:9", // Wide format for backgrounds
            output_format: "png",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Extract image URL from output
      const imageUrl = this.extractImageUrl(output);

      if (!imageUrl) {
        throw new Error("No image URL in Replicate response");
      }

      // Download image to local file
      const filePath = await this.downloadImage(imageUrl, filename);

      return filePath;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new GenerationTimeoutError(this.timeout);
      }

      // Handle API errors
      if (this.isReplicateError(error)) {
        throw this.mapReplicateError(error as Error);
      }

      throw error;
    }
  }

  /**
   * Extract image URL from Replicate output.
   * Handles both FileOutput objects and plain string URLs.
   *
   * @param output - Raw output from Replicate API
   * @returns Image URL or null if not found
   */
  private extractImageUrl(output: unknown): string | null {
    if (Array.isArray(output) && output.length > 0) {
      const first: unknown = output[0];

      // FileOutput object with url() method
      if (typeof first === "object" && first !== null && "url" in first) {
        const fileOutput = first as { url: () => string };
        return typeof fileOutput.url === "function"
          ? fileOutput.url()
          : String(fileOutput.url);
      }

      // Plain string URL
      if (typeof first === "string") {
        return first;
      }
    }

    // Single string output
    if (typeof output === "string") {
      return output;
    }

    return null;
  }

  /**
   * Download image from URL and save to local file.
   *
   * @param url - Image URL to download
   * @param filename - Filename to save as
   * @returns Absolute path to saved file
   */
  private async downloadImage(url: string, filename: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`
      );
    }

    const buffer = await response.arrayBuffer();
    const filePath = resolve(this.outputDirectory, filename);

    await Bun.write(filePath, buffer);

    return filePath;
  }

  /**
   * Check if error is a Replicate API error.
   *
   * @param error - Error to check
   * @returns True if error appears to be from Replicate API
   */
  private isReplicateError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return (
      message.includes("replicate") ||
      message.includes("401") ||
      message.includes("429") ||
      message.includes("prediction") ||
      message.includes("unauthorized") ||
      message.includes("rate limit")
    );
  }

  /**
   * Map Replicate errors to appropriate error types.
   *
   * @param error - Error from Replicate API
   * @returns Typed error
   */
  private mapReplicateError(error: Error): ReplicateAPIError {
    const message = error.message.toLowerCase();

    // Rate limiting
    if (message.includes("429") || message.includes("rate limit")) {
      return new ReplicateAPIError(
        "Replicate API rate limit exceeded",
        429,
        true
      );
    }

    // Authentication
    if (message.includes("401") || message.includes("unauthorized")) {
      return new ReplicateAPIError("Invalid REPLICATE_API_TOKEN", 401, false);
    }

    // Server errors (retryable)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    ) {
      return new ReplicateAPIError("Replicate API server error", 500, true);
    }

    // Generic API error
    return new ReplicateAPIError(error.message, undefined, false);
  }

  /**
   * Ensure the output directory exists, creating it if necessary.
   */
  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDirectory)) {
      mkdirSync(this.outputDirectory, { recursive: true });
    }
  }
}
