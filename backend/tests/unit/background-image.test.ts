// Background Image Service Tests
// Unit tests for orchestration logic: catalog-first cascade, force generation,
// error handling, and fallback behavior

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { BackgroundImageService } from "../../src/services/background-image";
import { ImageCatalogService } from "../../src/services/image-catalog";
import {
  ImageGeneratorService,
  RateLimitError,
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
  close = mock((): void => {});
}

/**
 * Mock ImageGeneratorService
 */
class MockImageGeneratorService {
  generateImage = mock(
    async (_mood: ThemeMood, _genre: Genre, _region: Region, _narrativeContext?: string) => ({
      filePath: "./data/images/generated-image.png",
      prompt: "A test prompt",
      model: "test-model",
      durationMs: 1000,
    })
  );
  getGenerationCount = mock(() => 0);
  getRemainingGenerations = mock(() => 5);
  initialize = mock(async (): Promise<void> => {});
  close = mock(async (): Promise<void> => {});
}

describe("BackgroundImageService", () => {
  let catalogService: MockImageCatalogService;
  let generatorService: MockImageGeneratorService;
  let orchestrator: BackgroundImageService;

  const BASE_URL = "http://localhost:3000/backgrounds";

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
        { baseUrl: "http://localhost:3000/backgrounds/" }
      );
      expect(withSlash).toBeDefined();
    });
  });

  describe("getBackgroundImage() - catalog hit", () => {
    test("returns catalog image when match exists", async () => {
      // Setup: catalog has an image
      catalogService.findImage.mockReturnValue("./data/images/calm-fantasy-forest.png");

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "high-fantasy",
        "forest"
      );

      // Verify catalog was checked
      expect(catalogService.findImage).toHaveBeenCalledWith(
        "calm",
        "high-fantasy",
        "forest"
      );

      // Verify generator was NOT called
      expect(generatorService.generateImage).not.toHaveBeenCalled();

      // Verify result
      expect(result).toEqual({
        url: `${BASE_URL}/calm-fantasy-forest.png`,
        source: "catalog",
      });
    });

    test("converts absolute paths to URLs correctly", async () => {
      catalogService.findImage.mockReturnValue("/absolute/path/to/images/image.png");

      const result = await orchestrator.getBackgroundImage(
        "tense",
        "sci-fi",
        "city"
      );

      expect(result.url).toBe(`${BASE_URL}/image.png`);
      expect(result.source).toBe("catalog");
    });

    test("handles Windows-style paths", async () => {
      catalogService.findImage.mockReturnValue("C:\\data\\images\\image.png");

      const result = await orchestrator.getBackgroundImage(
        "ominous",
        "horror",
        "ruins"
      );

      expect(result.url).toBe(`${BASE_URL}/image.png`);
      expect(result.source).toBe("catalog");
    });
  });

  describe("getBackgroundImage() - catalog miss with generation", () => {
    test("generates new image when catalog miss", async () => {
      // Setup: catalog has no match
      catalogService.findImage.mockReturnValue(null);

      const result = await orchestrator.getBackgroundImage(
        "triumphant",
        "steampunk",
        "castle"
      );

      // Verify catalog was checked first
      expect(catalogService.findImage).toHaveBeenCalledWith(
        "triumphant",
        "steampunk",
        "castle"
      );

      // Verify generation was attempted
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "triumphant",
        "steampunk",
        "castle",
        undefined
      );

      // Verify image was stored in catalog
      expect(catalogService.storeImage).toHaveBeenCalledWith(
        "triumphant",
        "steampunk",
        "castle",
        "./data/images/generated-image.png",
        "A test prompt"
      );

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
      catalogService.findImage.mockReturnValue(null);

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
  });

  describe("getBackgroundImage() - force generation", () => {
    test("skips catalog lookup when forceGenerate is true", async () => {
      const result = await orchestrator.getBackgroundImage(
        "calm",
        "modern",
        "city",
        true // force generate
      );

      // Verify catalog was NOT checked
      expect(catalogService.findImage).not.toHaveBeenCalled();

      // Verify generation was called
      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "calm",
        "modern",
        "city",
        undefined
      );

      // Verify image was stored
      expect(catalogService.storeImage).toHaveBeenCalled();

      expect(result.source).toBe("generated");
    });

    test("force generation with narrative context", async () => {
      await orchestrator.getBackgroundImage(
        "tense",
        "historical",
        "desert",
        true,
        "Soldiers march across the dunes at sunset"
      );

      expect(generatorService.generateImage).toHaveBeenCalledWith(
        "tense",
        "historical",
        "desert",
        "Soldiers march across the dunes at sunset"
      );
      expect(catalogService.findImage).not.toHaveBeenCalled();
    });
  });

  describe("getBackgroundImage() - error handling", () => {
    test("returns fallback on rate limit error", async () => {
      catalogService.findImage.mockReturnValue(null);
      generatorService.generateImage.mockRejectedValue(new RateLimitError(5, 5));

      const result = await orchestrator.getBackgroundImage(
        "ominous",
        "horror",
        "underground"
      );

      // Verify fallback was used
      expect(catalogService.getFallback).toHaveBeenCalledWith("ominous");
      expect(result).toEqual({
        url: `${BASE_URL}/ominous.jpg`,
        source: "fallback",
      });

      // Verify image was NOT stored in catalog (because generation failed)
      expect(catalogService.storeImage).not.toHaveBeenCalled();
    });

    test("returns fallback on timeout error", async () => {
      catalogService.findImage.mockReturnValue(null);
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
      catalogService.findImage.mockReturnValue(null);
      generatorService.generateImage.mockRejectedValue(new Error("MCP server crashed"));

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
      catalogService.findImage.mockReturnValue(null);
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
      catalogService.findImage.mockReturnValue(null);

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
      catalogService.findImage.mockReturnValue(null);

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
      catalogService.findImage.mockReturnValue(null);

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

  describe("cascade flow - complete integration", () => {
    test("catalog hit bypasses generation entirely", async () => {
      catalogService.findImage.mockReturnValue("./data/images/cached.png");

      await orchestrator.getBackgroundImage("calm", "sci-fi", "city");

      expect(catalogService.findImage).toHaveBeenCalled();
      expect(generatorService.generateImage).not.toHaveBeenCalled();
      expect(catalogService.storeImage).not.toHaveBeenCalled();
      expect(catalogService.getFallback).not.toHaveBeenCalled();
    });

    test("catalog miss triggers generation and storage", async () => {
      catalogService.findImage.mockReturnValue(null);

      await orchestrator.getBackgroundImage("tense", "horror", "ruins");

      expect(catalogService.findImage).toHaveBeenCalled();
      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.storeImage).toHaveBeenCalled();
      expect(catalogService.getFallback).not.toHaveBeenCalled();
    });

    test("generation failure triggers fallback", async () => {
      catalogService.findImage.mockReturnValue(null);
      generatorService.generateImage.mockRejectedValue(new Error("Failed"));

      await orchestrator.getBackgroundImage("ominous", "steampunk", "underground");

      expect(catalogService.findImage).toHaveBeenCalled();
      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.storeImage).not.toHaveBeenCalled();
      expect(catalogService.getFallback).toHaveBeenCalled();
    });

    test("force generation skips catalog but stores result", async () => {
      await orchestrator.getBackgroundImage("triumphant", "modern", "city", true);

      expect(catalogService.findImage).not.toHaveBeenCalled();
      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.storeImage).toHaveBeenCalled();
      expect(catalogService.getFallback).not.toHaveBeenCalled();
    });

    test("force generation failure triggers fallback", async () => {
      generatorService.generateImage.mockRejectedValue(new RateLimitError(5, 5));

      await orchestrator.getBackgroundImage("mysterious", "low-fantasy", "forest", true);

      expect(catalogService.findImage).not.toHaveBeenCalled();
      expect(generatorService.generateImage).toHaveBeenCalled();
      expect(catalogService.storeImage).not.toHaveBeenCalled();
      expect(catalogService.getFallback).toHaveBeenCalled();
    });
  });

  describe("URL conversion edge cases", () => {
    test("handles filenames with special characters", async () => {
      catalogService.findImage.mockReturnValue("./data/images/calm-fantasy-forest (1).png");

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "high-fantasy",
        "forest"
      );

      expect(result.url).toBe(`${BASE_URL}/calm-fantasy-forest (1).png`);
    });

    test("handles nested directory paths", async () => {
      catalogService.findImage.mockReturnValue("./data/images/2024/12/image.png");

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "sci-fi",
        "city"
      );

      expect(result.url).toBe(`${BASE_URL}/image.png`);
    });

    test("handles paths with only filename", async () => {
      catalogService.findImage.mockReturnValue("image.png");

      const result = await orchestrator.getBackgroundImage(
        "calm",
        "modern",
        "village"
      );

      expect(result.url).toBe(`${BASE_URL}/image.png`);
    });
  });

  describe("verbose logging", () => {
    test("does not log when verbose is false", async () => {
      const consoleSpy = mock(() => {});
      console.log = consoleSpy;

      catalogService.findImage.mockReturnValue("./test.png");
      await orchestrator.getBackgroundImage("calm", "sci-fi", "city");

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test("logs when verbose is true", async () => {
      const verboseOrchestrator = new BackgroundImageService(
        catalogService as unknown as ImageCatalogService,
        generatorService as unknown as ImageGeneratorService,
        { baseUrl: BASE_URL, verbose: true }
      );

      const consoleSpy = mock(() => {});
      console.log = consoleSpy;

      catalogService.findImage.mockReturnValue("./test.png");
      await verboseOrchestrator.getBackgroundImage("calm", "sci-fi", "city");

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
