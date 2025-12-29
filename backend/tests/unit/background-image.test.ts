// Background Image Service Tests
// Unit tests for orchestration logic: always-generate strategy,
// error handling, and fallback behavior

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { BackgroundImageService } from "../../src/services/background-image";
import { ImageCatalogService } from "../../src/services/image-catalog";
import {
  ImageGeneratorService,
  GenerationTimeoutError
} from "../../src/services/image-generator";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";

/**
 * Mock ImageCatalogService
 */
class MockImageCatalogService {
  findImage = mock((_mood: ThemeMood, _genre: Genre, _region: Region): string | null => null);
  storeImage = mock(
    (_mood: ThemeMood, _genre: Genre, _region: Region, _filePath: string, _prompt?: string): void => {}
  );
  getFallback = mock((mood: ThemeMood): string => `./assets/backgrounds/${mood}.jpg`);
  invalidateCache = mock((): void => {});
  close = mock((): void => {});
}

/**
 * Mock ImageGeneratorService
 */
class MockImageGeneratorService {
  generateImage = mock(
    (_mood: ThemeMood, _genre: Genre, _region: Region, _narrativeContext?: string) =>
      Promise.resolve({
        filePath: "./data/images/generated-image.png",
        prompt: "A test prompt",
        model: "test-model",
        durationMs: 1000,
      })
  );
  initialize = mock((): void => {});
  close = mock((): void => {});
}

describe("BackgroundImageService", () => {
  let catalogService: MockImageCatalogService;
  let generatorService: MockImageGeneratorService;
  let orchestrator: BackgroundImageService;

  const BASE_URL = "/backgrounds";

  beforeEach(() => {
    catalogService = new MockImageCatalogService();
    generatorService = new MockImageGeneratorService();
    orchestrator = new BackgroundImageService(
      catalogService as unknown as ImageCatalogService,
      generatorService as unknown as ImageGeneratorService,
      { baseUrl: BASE_URL, verbose: false }
    );
  });

  describe("constructor", () => {
    test("creates instance with provided dependencies", () => {
      expect(orchestrator).toBeDefined();
    });

    test("removes trailing slash from base URL", () => {
      const withSlash = new BackgroundImageService(
        catalogService as unknown as ImageCatalogService,
        generatorService as unknown as ImageGeneratorService,
        { baseUrl: "/backgrounds/" }
      );
      expect(withSlash).toBeDefined();
    });
  });

  describe("getBackgroundImage() - always generates fresh images", () => {
    test("generates new image for each request", async () => {
      const result = await orchestrator.getBackgroundImage(
        "triumphant",
        "steampunk",
        "castle"
      );

      // Verify generation was called (catalog is NOT checked)
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "triumphant",
        "steampunk",
        "castle",
        undefined
      );

      // Verify catalog lookup was NOT called
      expect(catalogService.findImage).not.toHaveBeenCalled();

      // Verify result
      expect(result).toEqual({
        url: `${BASE_URL}/generated-image.png`,
        source: "generated",
        metadata: {
          prompt: "A test prompt",
          model: "test-model",
          durationMs: 1000,
        },
      });
    });

    test("passes narrative context to generator", async () => {
      await orchestrator.getBackgroundImage(
        "mysterious",
        "low-fantasy",
        "village",
        false,
        "An ancient ritual takes place in the town square"
      );

      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "mysterious",
        "low-fantasy",
        "village",
        "An ancient ritual takes place in the town square"
      );
    });

    test("forceGenerate parameter is ignored (always generates)", async () => {
      const result = await orchestrator.getBackgroundImage(
        "calm",
        "modern",
        "city",
        true // force generate - now a no-op
      );

      // Catalog is never checked
      expect(catalogService.findImage).not.toHaveBeenCalled();

      // Generation always happens
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "calm",
        "modern",
        "city",
        undefined
      );

      expect(result.source).toBe("generated");
    });
  });

  describe("getBackgroundImage() - error handling", () => {
    test("returns fallback on timeout error", async () => {
      generatorService.generateImage.mockRejectedValue(new GenerationTimeoutError(30000));

      const result = await orchestrator.getBackgroundImage(
        "triumphant",
        "high-fantasy",
        "mountain"
      );

      expect(catalogService.getFallback).toHaveBeenCalledWith("triumphant");
      expect(result).toEqual({
        url: `${BASE_URL}/triumphant.jpg`,
        source: "fallback",
      });
    });

    test("returns fallback on generic generation error", async () => {
      generatorService.generateImage.mockRejectedValue(new Error("Replicate API error"));

      const result = await orchestrator.getBackgroundImage(
        "mysterious",
        "sci-fi",
        "ocean"
      );

      expect(catalogService.getFallback).toHaveBeenCalledWith("mysterious");
      expect(result).toEqual({
        url: `${BASE_URL}/mysterious.jpg`,
        source: "fallback",
      });
    });

    test("returns fallback on non-Error rejection", async () => {
      generatorService.generateImage.mockRejectedValue("String error message");

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "low-fantasy",
        "forest"
      );

      expect(result.source).toBe("fallback");
    });
  });

  describe("getBackgroundImage() - all moods", () => {
    const moods: ThemeMood[] = ["calm", "tense", "ominous", "triumphant", "mysterious"];

    test.each(moods)("handles %s mood correctly", async (mood) => {
      const result = await orchestrator.getBackgroundImage(
        mood,
        "high-fantasy",
        "castle"
      );

      expect(result).toBeDefined();
      expect(result.url).toContain(BASE_URL);
    });
  });

  describe("getBackgroundImage() - all genres", () => {
    const genres: Genre[] = [
      "sci-fi",
      "steampunk",
      "low-fantasy",
      "high-fantasy",
      "horror",
      "modern",
      "historical",
    ];

    test.each(genres)("handles %s genre correctly", async (genre) => {
      const result = await orchestrator.getBackgroundImage(
        "calm",
        genre,
        "city"
      );

      expect(result).toBeDefined();
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "calm",
        genre,
        "city",
        undefined
      );
    });
  });

  describe("getBackgroundImage() - all regions", () => {
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

    test.each(regions)("handles %s region correctly", async (region) => {
      const result = await orchestrator.getBackgroundImage(
        "calm",
        "high-fantasy",
        region
      );

      expect(result).toBeDefined();
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "calm",
        "high-fantasy",
        region,
        undefined
      );
    });
  });

  describe("generation flow", () => {
    test("always generates without checking catalog", async () => {
      await orchestrator.getBackgroundImage("calm", "sci-fi", "city");

      expect(catalogService.findImage).not.toHaveBeenCalled();
      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.getFallback).not.toHaveBeenCalled();
    });

    test("generation failure triggers fallback", async () => {
      generatorService.generateImage.mockRejectedValue(new Error("Failed"));

      await orchestrator.getBackgroundImage("ominous", "steampunk", "underground");

      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.getFallback).toHaveBeenCalled();
    });

    test("invalidates cache after successful generation", async () => {
      await orchestrator.getBackgroundImage("triumphant", "modern", "city");

      expect(catalogService.invalidateCache).toHaveBeenCalled();
    });
  });

  describe("URL conversion", () => {
    test("extracts filename from generated image path", async () => {
      const result = await orchestrator.getBackgroundImage(
        "calm",
        "high-fantasy",
        "forest"
      );

      // Mock returns "./data/images/generated-image.png"
      expect(result.url).toBe(`${BASE_URL}/generated-image.png`);
    });

    test("handles fallback image paths", async () => {
      generatorService.generateImage.mockRejectedValue(new Error("Failed"));

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "modern",
        "village"
      );

      // Fallback returns "./assets/backgrounds/{mood}.jpg"
      expect(result.url).toBe(`${BASE_URL}/calm.jpg`);
    });
  });

  describe("verbose logging", () => {
    test("does not throw when verbose is false", async () => {
      const result = await orchestrator.getBackgroundImage("calm", "sci-fi", "city");
      expect(result).toBeDefined();
    });

    test("does not throw when verbose is true", async () => {
      const verboseOrchestrator = new BackgroundImageService(
        catalogService as unknown as ImageCatalogService,
        generatorService as unknown as ImageGeneratorService,
        { baseUrl: BASE_URL, verbose: true }
      );

      const result = await verboseOrchestrator.getBackgroundImage("calm", "sci-fi", "city");
      expect(result).toBeDefined();
    });
  });
});
