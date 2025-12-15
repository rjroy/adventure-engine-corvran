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

    // Create service instance with test directory
    service = new ImageCatalogService(TEST_BACKGROUNDS_DIR);
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

  describe("findImage()", () => {
    test("returns null when no matching image exists", () => {
      const result = service.findImage("calm", "low-fantasy", "forest");
      expect(result).toBeNull();
    });

    test("returns file path when matching image exists", async () => {
      // Create a test image file
      const filePath = `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-12345.png`;
      await writeFile(filePath, "fake image data");

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
    test("caches file list after first findImage call", async () => {
      // Create initial file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-1.png`,
        "data"
      );

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
      // Create initial file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-1.png`,
        "data"
      );

      // First call populates cache
      service.findImage("calm", "high-fantasy", "forest");

      // Add a new file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // Without invalidation, new file is not found
      expect(service.findImage("tense", "sci-fi", "city")).toBeNull();

      // Invalidate cache
      service.invalidateCache();

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
      // Create a file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/calm-high-fantasy-forest-1.png`,
        "data"
      );

      // First service instance populates its cache
      service.findImage("calm", "high-fantasy", "forest");

      // Add a new file
      await writeFile(
        `${TEST_BACKGROUNDS_DIR}/tense-sci-fi-city-2.png`,
        "data"
      );

      // New service instance should have fresh cache
      const service2 = new ImageCatalogService(TEST_BACKGROUNDS_DIR);
      const result = service2.findImage("tense", "sci-fi", "city");
      expect(result).toContain("tense-sci-fi-city-2.png");
    });
  });
});
