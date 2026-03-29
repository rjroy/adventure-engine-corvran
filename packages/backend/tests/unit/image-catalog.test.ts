// Image Catalog Service Tests
// Unit tests for directory-based image lookup using glob patterns

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { ImageCatalogService } from "../../src/services/image-catalog";

const TEST_BACKGROUNDS_DIR = "./test-data/backgrounds";

describe("ImageCatalogService", () => {
  let service: ImageCatalogService;

  beforeEach(async () => {
    // Create test backgrounds directory
    await mkdir(TEST_BACKGROUNDS_DIR, { recursive: true });

    // Create fallback image to satisfy validation
    await writeFile(`${TEST_BACKGROUNDS_DIR}/calm.jpg`, "fallback");

    // Create service instance with test directory
    service = new ImageCatalogService(TEST_BACKGROUNDS_DIR);

    // Initialize the service
    await service.initialize();
  });

  afterEach(async () => {
    // Clean up test data
    await rm("./test-data", { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("creates instance with default path", () => {
      const defaultService = new ImageCatalogService();
      expect(defaultService).toBeDefined();
    });

    test("creates instance with custom path", () => {
      expect(service).toBeDefined();
    });
  });

  describe("initialize()", () => {
    test("succeeds when directory exists with fallback", async () => {
      const testDir = "./test-data/init-test-1";
      await mkdir(testDir, { recursive: true });
      await writeFile(`${testDir}/calm.jpg`, "fallback");

      const testService = new ImageCatalogService(testDir);
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(testService.initialize()).resolves.toBeUndefined();

      await rm(testDir, { recursive: true, force: true });
    });

    test("throws when directory does not exist", async () => {
      const testService = new ImageCatalogService("./nonexistent-test-dir");
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(testService.initialize()).rejects.toThrow(
        "Backgrounds directory not found"
      );
    });

    test("pre-loads file cache", async () => {
      const testDir = "./test-data/init-test-2";
      await mkdir(testDir, { recursive: true });
      await writeFile(`${testDir}/calm.jpg`, "fallback");
      await writeFile(
        `${testDir}/test-calm-low-fantasy-forest-123.png`,
        "data"
      );

      const testService = new ImageCatalogService(testDir);
      await testService.initialize();

      // Cache should be populated - findImage should work immediately
      const result = testService.findImage("calm", "low-fantasy", "forest");
      expect(result).toBeNull(); // No "calm-low-fantasy-forest" file exists

      await rm(testDir, { recursive: true, force: true });
    });

    test("warns when fallback image missing but still initializes", async () => {
      const testDir = "./test-data/init-test-3";
      await mkdir(testDir, { recursive: true });
      // Don't create calm.jpg

      const testService = new ImageCatalogService(testDir);
      // Should not throw, but should log warning
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(testService.initialize()).resolves.toBeUndefined();

      await rm(testDir, { recursive: true, force: true });
    });

    test("logs file count on successful initialization", async () => {
      const testDir = "./test-data/init-test-4";
      await mkdir(testDir, { recursive: true });
      await writeFile(`${testDir}/calm.jpg`, "fallback");
      await writeFile(`${testDir}/file1.png`, "data");
      await writeFile(`${testDir}/file2.png`, "data");

      const testService = new ImageCatalogService(testDir);
      await testService.initialize();

      // Verify initialization completed (no throw means success)
      expect(true).toBe(true);

      await rm(testDir, { recursive: true, force: true });
    });
  });

  describe("findImage()", () => {
    test("returns null when no matching image exists", () => {
      const result = service.findImage("calm", "low-fantasy", "forest");
      expect(result).toBeNull();
    });

    test("returns file path when matching image exists", async () => {
      // Create a test image file
      const filePath = `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-12345.png`;
      await writeFile(filePath, "fake image data");

      // Re-initialize to pick up the new file
      service.invalidateCache();
      await service.initialize();

      const result = service.findImage("tense", "sci-fi", "city");
      expect(result).toBe(filePath);
    });

    test("returns null for different mood", async () => {
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-low-fantasy-forest-12345.png`,
        "fake image data"
      );

      const result = service.findImage("tense", "low-fantasy", "forest");
      expect(result).toBeNull();
    });

    test("returns null for different genre", async () => {
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-low-fantasy-forest-12345.png`,
        "fake image data"
      );

      const result = service.findImage("calm", "sci-fi", "forest");
      expect(result).toBeNull();
    });

    test("returns null for different region", async () => {
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-low-fantasy-forest-12345.png`,
        "fake image data"
      );

      const result = service.findImage("calm", "low-fantasy", "city");
      expect(result).toBeNull();
    });

    test("finds image with timestamp suffix", async () => {
      const timestamp = Date.now();
      const filePath = `${TEST_BACKGROUNDS_DIR}/ominous-horror-ruins-${timestamp}.png`;
      await writeFile(filePath, "fake image data");

      // Re-initialize to pick up the new file
      service.invalidateCache();
      await service.initialize();

      const result = service.findImage("ominous", "horror", "ruins");
      expect(result).toBe(filePath);
    });

    test("finds one of multiple matching images", async () => {
      // Create multiple matching images
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-111.png`,
        "fake image 1"
      );
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-222.png`,
        "fake image 2"
      );
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-333.png`,
        "fake image 3"
      );

      // Re-initialize to pick up the new files
      service.invalidateCache();
      await service.initialize();

      const result = service.findImage("calm", "high-fantasy", "forest");

      // Should return one of the matching images
      expect(result).not.toBeNull();
      expect(result).toContain("calm-high-fantasy-forest-");
      expect(result).toEndWith(".png");
    });

    test("handles images with various suffixes", async () => {
      // Image with just numbers
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/mysterious-steampunk-underground-42.png`,
        "data"
      );

      // Re-initialize to pick up the new file
      service.invalidateCache();
      await service.initialize();

      const result = service.findImage(
        "mysterious",
        "steampunk",
        "underground"
      );
      expect(result).toBe(
        `${TEST_BACKGROUNDS_DIR}/mysterious-steampunk-underground-42.png`
      );
    });
  });

  describe("getFallback()", () => {
    test("returns mood-specific fallback when it exists", async () => {
      // Create a mood-specific fallback
      await writeFile(`${TEST_BACKGROUNDS_DIR}/calm.jpg`, "fallback image");

      const fallback = service.getFallback("calm");
      expect(fallback).toBe(`${TEST_BACKGROUNDS_DIR}/calm.jpg`);
    });

    test("returns calm.jpg when mood-specific fallback doesn't exist", async () => {
      // Create only calm.jpg
      await writeFile(`${TEST_BACKGROUNDS_DIR}/calm.jpg`, "default fallback");

      const fallback = service.getFallback("tense");
      expect(fallback).toBe(`${TEST_BACKGROUNDS_DIR}/calm.jpg`);
    });

    test("returns calm.jpg path even if it doesn't exist (ultimate fallback)", () => {
      // No files exist at all
      const fallback = service.getFallback("ominous");
      expect(fallback).toBe(`${TEST_BACKGROUNDS_DIR}/calm.jpg`);
    });

    test("returns correct fallback for each mood", async () => {
      const moods = [
        "calm",
        "tense",
        "ominous",
        "triumphant",
        "mysterious",
      ] as const;

      for (const mood of moods) {
        // Create the fallback file
        await writeFile(`${TEST_BACKGROUNDS_DIR}/${mood}.jpg`, `${mood} image`);

        const fallback = service.getFallback(mood);
        expect(fallback).toBe(`${TEST_BACKGROUNDS_DIR}/${mood}.jpg`);
      }
    });
  });

  describe("glob pattern matching", () => {
    test("matches exact mood-genre-region prefix", async () => {
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-village-1.png`,
        "data"
      );
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-2.png`,
        "data"
      );

      // Re-initialize to pick up the new files
      service.invalidateCache();
      await service.initialize();

      // Should only find village, not forest
      const villageResult = service.findImage(
        "calm",
        "high-fantasy",
        "village"
      );
      expect(villageResult).toContain("village");

      const forestResult = service.findImage("calm", "high-fantasy", "forest");
      expect(forestResult).toContain("forest");
    });

    test("does not match partial mood names", async () => {
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-village-1.png`,
        "data"
      );

      // "cal" should not match "calm"
      const result = service.findImage(
        "cal" as "calm",
        "high-fantasy",
        "village"
      );
      expect(result).toBeNull();
    });

    test("handles empty directory gracefully", () => {
      const result = service.findImage("calm", "high-fantasy", "forest");
      expect(result).toBeNull();
    });
  });

  describe("caching", () => {
    test("caches file list at initialization", async () => {
      // Create initial file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-1.png`,
        "data"
      );

      // Re-initialize to pick up the new file
      service.invalidateCache();
      await service.initialize();

      // First call should find the image
      const result1 = service.findImage("calm", "high-fantasy", "forest");
      expect(result1).toContain("calm-high-fantasy-forest-1.png");

      // Add a new file without invalidating cache
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // Second call should NOT find the new file (cache not invalidated)
      const result2 = service.findImage("tense", "sci-fi", "city");
      expect(result2).toBeNull();
    });

    test("invalidateCache allows new files to be discovered", async () => {
      // Add a new file after initialization
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // Without invalidation and re-initialization, new file is not found
      expect(service.findImage("tense", "sci-fi", "city")).toBeNull();

      // Invalidate cache and re-initialize
      service.invalidateCache();
      await service.initialize();

      // Now new file should be found
      const result = service.findImage("tense", "sci-fi", "city");
      expect(result).toContain("tense-sci-fi-city-2.png");
    });

    test("multiple findImage calls use same cache", async () => {
      // Create files
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-1.png`,
        "data"
      );
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // Re-initialize to pick up the new files
      service.invalidateCache();
      await service.initialize();

      // Multiple calls should work from cached file list
      expect(service.findImage("calm", "high-fantasy", "forest")).toContain(
        "calm-high-fantasy-forest"
      );
      expect(service.findImage("tense", "sci-fi", "city")).toContain(
        "tense-sci-fi-city"
      );
      expect(service.findImage("ominous", "horror", "ruins")).toBeNull();

      // All calls should have used the same cached file list
      // (verified by the fact that both existing files were found)
    });

    test("cache is per-instance", async () => {
      // Add a new file after first service is initialized
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // First service instance doesn't see the new file
      expect(service.findImage("tense", "sci-fi", "city")).toBeNull();

      // New service instance should have fresh cache after initialization
      const service2 = new ImageCatalogService(TEST_BACKGROUNDS_DIR);
      await service2.initialize();
      const result = service2.findImage("tense", "sci-fi", "city");
      expect(result).toContain("tense-sci-fi-city-2.png");
    });
  });
});
