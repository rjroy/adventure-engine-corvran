// Image Generator Service Tests
// Unit tests for Replicate-based image generation with LRU eviction

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { rm, mkdir } from "node:fs/promises";
import {
  ImageGeneratorService,
  GenerationTimeoutError,
} from "../../src/services/image-generator";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";

// Mock fetch to return fake image data
const _originalFetch = globalThis.fetch;
const mockFetch = mock(() =>
  Promise.resolve(
    new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    })
  )
);
globalThis.fetch = mockFetch as unknown as typeof fetch;

// Mock Replicate SDK
const mockRun = mock(() =>
  Promise.resolve(["https://replicate.delivery/test-image.png"])
);

void mock.module("replicate", () => ({
  default: class MockReplicate {
    constructor(_config: { auth: string }) {}
    run = mockRun;
  },
}));

const TEST_OUTPUT_DIR = "./test-data/images";
const TEST_API_TOKEN = "test-replicate-token";

describe("ImageGeneratorService", () => {
  let service: ImageGeneratorService;

  beforeEach(async () => {
    // Clean and recreate test output directory
    await rm("./test-data", { recursive: true, force: true });
    await mkdir("./test-data/images", { recursive: true });

    // Reset mocks
    mockRun.mockClear();
    mockRun.mockImplementation(() =>
      Promise.resolve(["https://replicate.delivery/test-image.png"])
    );
    mockFetch.mockClear();
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        })
      )
    );

    // Create service instance with test config
    service = new ImageGeneratorService({
      outputDirectory: TEST_OUTPUT_DIR,
      timeout: 1000, // 1 second for faster tests
      maxImages: 100, // LRU limit for testing
      apiToken: TEST_API_TOKEN,
    });
  });

  afterEach(async () => {
    // Close service
    service.close();

    // Clean up test data
    await rm("./test-data", { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("creates instance with default config", () => {
      const defaultService = new ImageGeneratorService({
        apiToken: TEST_API_TOKEN,
      });
      expect(defaultService).toBeDefined();
    });

    test("creates instance with custom config", () => {
      expect(service).toBeDefined();
    });

    test("creates output directory if it doesn't exist", async () => {
      // Remove the directory
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

      // Create service should recreate it
      const newService = new ImageGeneratorService({
        outputDirectory: TEST_OUTPUT_DIR,
        apiToken: TEST_API_TOKEN,
      });

      expect(newService).toBeDefined();

      // Verify directory was created by checking if it exists
      const { existsSync } = await import("fs");
      expect(existsSync(TEST_OUTPUT_DIR)).toBe(true);
    });
  });

  describe("initialize()", () => {
    test("creates Replicate client", async () => {
      await service.initialize();
      // If no error thrown, client was created successfully
      expect(true).toBe(true);
    });

    test("throws error if no API token", async () => {
      const noTokenService = new ImageGeneratorService({
        outputDirectory: TEST_OUTPUT_DIR,
      });

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(noTokenService.initialize()).rejects.toThrow(
        "REPLICATE_API_TOKEN environment variable is required"
      );
    });

    test("can be called multiple times safely", async () => {
      await service.initialize();
      service.close();
      await service.initialize();
      // If no error thrown, test passes
      expect(true).toBe(true);
    });
  });

  describe("generateImage()", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test("generates image with mood, genre, and region", async () => {
      const result = await service.generateImage(
        "calm",
        "high-fantasy",
        "forest"
      );

      expect(result.filePath).toBeDefined();
      expect(result.prompt).toBeDefined();
      expect(result.model).toBe("black-forest-labs/flux-schnell");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test("includes narrative context in prompt when provided", async () => {
      const narrativeContext = "The adventurers rest by a serene waterfall";

      const result = await service.generateImage(
        "calm",
        "high-fantasy",
        "forest",
        narrativeContext
      );

      expect(result.prompt).toContain(narrativeContext);
    });

    test("constructs prompt with mood descriptors", async () => {
      const result = await service.generateImage(
        "ominous",
        "horror",
        "ruins"
      );

      expect(result.prompt).toContain("dark");
      expect(result.prompt).toContain("foreboding");
    });

    test("constructs prompt with genre styles", async () => {
      const result = await service.generateImage("calm", "steampunk", "city");

      expect(result.prompt).toContain("brass");
      expect(result.prompt).toContain("Victorian");
    });

    test("constructs prompt with region settings", async () => {
      const result = await service.generateImage(
        "triumphant",
        "high-fantasy",
        "castle"
      );

      expect(result.prompt).toContain("fortress");
      expect(result.prompt).toContain("architecture");
    });

    test("throws error if not initialized", async () => {
      const uninitializedService = new ImageGeneratorService({
        outputDirectory: TEST_OUTPUT_DIR,
        apiToken: TEST_API_TOKEN,
      });

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(
        uninitializedService.generateImage("calm", "low-fantasy", "forest")
      ).rejects.toThrow("not initialized");
    });

    test("handles timeout properly", async () => {
      // Mock a slow response that respects abort signal
      mockRun.mockImplementationOnce(
        // @ts-expect-error - mock needs access to options.signal
        (_model: string, options: { signal?: AbortSignal }) =>
          new Promise<string[]>((resolve, reject) => {
            const timeoutId = setTimeout(
              () => resolve(["https://replicate.delivery/slow-image.png"]),
              2000
            );
            // Listen for abort signal
            options?.signal?.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(
        service.generateImage("calm", "low-fantasy", "forest")
      ).rejects.toThrow(GenerationTimeoutError);
    });

    test("includes timeout duration in timeout error", async () => {
      // Mock a slow response that respects abort signal
      mockRun.mockImplementationOnce(
        // @ts-expect-error - mock needs access to options.signal
        (_model: string, options: { signal?: AbortSignal }) =>
          new Promise<string[]>((resolve, reject) => {
            const timeoutId = setTimeout(resolve, 2000);
            options?.signal?.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      try {
        await service.generateImage("calm", "low-fantasy", "forest");
        throw new Error("Should have thrown GenerationTimeoutError");
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationTimeoutError);
        if (error instanceof GenerationTimeoutError) {
          expect(error.timeoutMs).toBe(1000); // Test timeout
        }
      }
    });

    test("generates unique filenames for same mood/genre/region", async () => {
      const result1 = await service.generateImage("calm", "low-fantasy", "forest");
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));
      const result2 = await service.generateImage("calm", "low-fantasy", "forest");

      // Filenames should be different due to timestamp
      expect(result1.filePath).not.toBe(result2.filePath);
    });

    test("calls Replicate with correct arguments", async () => {
      await service.generateImage("calm", "low-fantasy", "forest");

      expect(mockRun).toHaveBeenCalledTimes(1);
      const callArgs = mockRun.mock.calls[0] as unknown[];
      expect(callArgs[0]).toBe("black-forest-labs/flux-schnell");
      expect(callArgs[1]).toHaveProperty("input");
    });
  });

  describe("close()", () => {
    test("clears Replicate client", async () => {
      await service.initialize();
      service.close();
      // If no error thrown, test passes
      expect(true).toBe(true);
    });

    test("can be called multiple times safely", async () => {
      await service.initialize();
      service.close();
      service.close();
      // If no error thrown, test passes
      expect(true).toBe(true);
    });

    test("can be called without initializing", () => {
      // Should complete without error even if not initialized
      service.close();
      // If we got here without throwing, the test passes
      expect(true).toBe(true);
    });
  });

  describe("LRU eviction", () => {
    test("does not evict when under limit", async () => {
      // Service with limit of 100, we generate 1 image
      await service.initialize();
      await service.generateImage("calm", "low-fantasy", "forest");

      // Verify the generated image still exists
      const { readdir } = await import("fs/promises");
      const files = await readdir(TEST_OUTPUT_DIR);
      const pngFiles = files.filter((f: string) => f.endsWith(".png"));
      expect(pngFiles.length).toBe(1);
    });

    test("evicts oldest files when over limit", async () => {
      const { writeFile, utimes, readdir } = await import("fs/promises");
      const path = await import("path");

      // Create a service with maxImages: 2
      const limitedService = new ImageGeneratorService({
        outputDirectory: TEST_OUTPUT_DIR,
        timeout: 1000,
        maxImages: 2,
        apiToken: TEST_API_TOKEN,
      });
      await limitedService.initialize();

      // Pre-create 2 "old" files with earlier timestamps
      const oldFile1 = path.resolve(TEST_OUTPUT_DIR, "old-image-1.png");
      const oldFile2 = path.resolve(TEST_OUTPUT_DIR, "old-image-2.png");
      await writeFile(oldFile1, "fake png data");
      await writeFile(oldFile2, "fake png data");

      // Set old timestamps (1 hour ago, 30 minutes ago)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      await utimes(oldFile1, oneHourAgo, oneHourAgo);
      await utimes(oldFile2, thirtyMinAgo, thirtyMinAgo);

      // Generate a new image (should trigger eviction of oldest)
      await limitedService.generateImage("calm", "low-fantasy", "forest");

      // Check remaining files
      const files = await readdir(TEST_OUTPUT_DIR);
      const pngFiles = files.filter((f: string) => f.endsWith(".png"));

      // Should have exactly 2 files (limit is 2)
      expect(pngFiles.length).toBe(2);

      // The oldest file (old-image-1.png) should be gone
      expect(pngFiles).not.toContain("old-image-1.png");

      // The second oldest (old-image-2.png) should still exist
      expect(pngFiles).toContain("old-image-2.png");

      limitedService.close();
    });
  });

  describe("prompt construction", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test("includes all mood types correctly", async () => {
      const moods: ThemeMood[] = [
        "calm",
        "tense",
        "ominous",
        "triumphant",
        "mysterious",
      ];

      for (const mood of moods) {
        const result = await service.generateImage(mood, "low-fantasy", "forest");
        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);

        // Reset for next iteration
        service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxImages: 100,
          apiToken: TEST_API_TOKEN,
        });
        await service.initialize();
      }
    });

    test("includes all genre types correctly", async () => {
      const genres: Genre[] = [
        "sci-fi",
        "steampunk",
        "low-fantasy",
        "high-fantasy",
        "horror",
        "modern",
        "historical",
      ];

      for (const genre of genres) {
        const result = await service.generateImage("calm", genre, "city");
        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);

        // Reset for next iteration
        service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxImages: 100,
          apiToken: TEST_API_TOKEN,
        });
        await service.initialize();
      }
    });

    test("includes all region types correctly", async () => {
      const regions: Region[] = [
        "city",
        "village",
        "forest",
        "desert",
        "mountain",
        "ocean",
        "underground",
        "castle",
        "ruins",
      ];

      for (const region of regions) {
        const result = await service.generateImage("calm", "low-fantasy", region);
        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);

        // Reset for next iteration
        service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxImages: 100,
          apiToken: TEST_API_TOKEN,
        });
        await service.initialize();
      }
    });

    test("always includes cinematic quality instructions", async () => {
      const result = await service.generateImage("calm", "low-fantasy", "forest");

      expect(result.prompt).toContain("Cinematic");
      expect(result.prompt).toContain("detailed");
      expect(result.prompt).toContain("professional");
    });
  });
});
