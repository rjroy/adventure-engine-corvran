// Image Generator Service Tests
// Unit and integration tests for MCP-based image generation with mocked server

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { rm, mkdir, writeFile } from "node:fs/promises";
import {
  ImageGeneratorService,
  RateLimitError,
  GenerationTimeoutError,
} from "../../src/services/image-generator";
import type { ThemeMood, Genre, Region } from "../../../shared/protocol";

// Mock MCP client to avoid spawning actual subprocess in tests
const mockCallTool = mock(async (_args: any) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        model: "black-forest-labs/flux-schnell",
        saved_files: ["/test/output/test-image.png"],
      }),
    },
  ],
}));

const mockConnect = mock(async () => {});
const mockClose = mock(async () => {});

// Mock the MCP SDK
mock.module("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class MockClient {
    constructor(_info?: any, _capabilities?: any) {}
    async connect(_transport: any) {
      await mockConnect();
    }
    async callTool(args: any) {
      return await mockCallTool(args);
    }
    async close() {
      await mockClose();
    }
  },
}));

mock.module("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: class MockStdioClientTransport {
    constructor(_config: any) {}
  },
}));

const TEST_OUTPUT_DIR = "./test-data/images";

describe("ImageGeneratorService", () => {
  let service: ImageGeneratorService;

  beforeEach(async () => {
    // Clean and recreate test output directory
    await rm("./test-data", { recursive: true, force: true });
    await mkdir("./test-data/images", { recursive: true });

    // Reset mocks
    mockCallTool.mockClear();
    mockConnect.mockClear();
    mockClose.mockClear();

    // Create service instance with test config
    service = new ImageGeneratorService({
      outputDirectory: TEST_OUTPUT_DIR,
      timeout: 1000, // 1 second for faster tests
      maxGenerationsPerSession: 3, // Lower limit for testing
    });
  });

  afterEach(async () => {
    // Close service
    await service.close();

    // Clean up test data
    await rm("./test-data", { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("creates instance with default config", () => {
      const defaultService = new ImageGeneratorService();
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
      });

      expect(newService).toBeDefined();

      // Verify directory was created by checking if it exists
      const { existsSync } = await import("fs");
      expect(existsSync(TEST_OUTPUT_DIR)).toBe(true);
    });
  });

  describe("initialize()", () => {
    test("establishes MCP connection", async () => {
      await service.initialize();
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    test("can be called multiple times safely", async () => {
      await service.initialize();
      await service.close();
      await service.initialize();

      expect(mockConnect).toHaveBeenCalledTimes(2);
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

    test("increments generation count", async () => {
      expect(service.getGenerationCount()).toBe(0);

      await service.generateImage("calm", "low-fantasy", "village");
      expect(service.getGenerationCount()).toBe(1);

      await service.generateImage("tense", "sci-fi", "city");
      expect(service.getGenerationCount()).toBe(2);
    });

    test("throws error if not initialized", async () => {
      const uninitializedService = new ImageGeneratorService({
        outputDirectory: TEST_OUTPUT_DIR,
      });

      await expect(
        uninitializedService.generateImage("calm", "low-fantasy", "forest")
      ).rejects.toThrow("not initialized");
    });

    test("enforces rate limiting", async () => {
      // Generate up to limit (3 in test config)
      await service.generateImage("calm", "low-fantasy", "forest");
      await service.generateImage("tense", "sci-fi", "city");
      await service.generateImage("ominous", "horror", "ruins");

      // Fourth should fail
      await expect(
        service.generateImage("triumphant", "high-fantasy", "castle")
      ).rejects.toThrow(RateLimitError);
    });

    test("includes rate limit details in error", async () => {
      // Exhaust limit
      await service.generateImage("calm", "low-fantasy", "forest");
      await service.generateImage("tense", "sci-fi", "city");
      await service.generateImage("ominous", "horror", "ruins");

      try {
        await service.generateImage("triumphant", "high-fantasy", "castle");
        throw new Error("Should have thrown RateLimitError");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        if (error instanceof RateLimitError) {
          expect(error.current).toBe(3);
          expect(error.limit).toBe(3);
        }
      }
    });

    test("handles timeout properly", async () => {
      // Mock a slow response
      mockCallTool.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        success: true,
                        model: "test",
                        saved_files: ["/test.png"],
                      }),
                    },
                  ],
                }),
              2000
            )
          ) // 2 seconds, longer than 1 second timeout
      );

      await expect(
        service.generateImage("calm", "low-fantasy", "forest")
      ).rejects.toThrow(GenerationTimeoutError);
    });

    test("includes timeout duration in timeout error", async () => {
      // Mock a slow response
      mockCallTool.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
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
      // Mock different responses for each call
      mockCallTool
        .mockResolvedValueOnce({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                model: "test",
                saved_files: ["/test/output/image-1.png"],
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                model: "test",
                saved_files: ["/test/output/image-2.png"],
              }),
            },
          ],
        });

      const result1 = await service.generateImage("calm", "low-fantasy", "forest");
      const result2 = await service.generateImage("calm", "low-fantasy", "forest");

      // Filenames should be different due to timestamp
      expect(result1.filePath).not.toBe(result2.filePath);
    });

    test("calls MCP tool with correct arguments", async () => {
      await service.generateImage("calm", "low-fantasy", "forest");

      const calls = mockCallTool.mock.calls as any[];
      expect(calls.length).toBeGreaterThan(0);

      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall).toBeDefined();
      expect(lastCall?.name).toBe("generate_image_replicate");
      expect(lastCall?.arguments.prompt).toBeDefined();
      expect(lastCall?.arguments.model).toBe("black-forest-labs/flux-schnell");
      expect(lastCall?.arguments.output_file_name).toMatch(
        /^calm-low-fantasy-forest-\d+\.png$/
      );
      expect(lastCall?.arguments.output_directory).toContain("test-data/images");
    });
  });

  describe("getGenerationCount()", () => {
    test("returns 0 initially", () => {
      expect(service.getGenerationCount()).toBe(0);
    });

    test("returns correct count after generations", async () => {
      await service.initialize();

      await service.generateImage("calm", "low-fantasy", "forest");
      expect(service.getGenerationCount()).toBe(1);

      await service.generateImage("tense", "sci-fi", "city");
      expect(service.getGenerationCount()).toBe(2);
    });
  });

  describe("getRemainingGenerations()", () => {
    test("returns max initially", () => {
      expect(service.getRemainingGenerations()).toBe(3);
    });

    test("decrements after each generation", async () => {
      await service.initialize();

      await service.generateImage("calm", "low-fantasy", "forest");
      expect(service.getRemainingGenerations()).toBe(2);

      await service.generateImage("tense", "sci-fi", "city");
      expect(service.getRemainingGenerations()).toBe(1);

      await service.generateImage("ominous", "horror", "ruins");
      expect(service.getRemainingGenerations()).toBe(0);
    });

    test("never goes below 0", async () => {
      await service.initialize();

      // Exhaust limit
      await service.generateImage("calm", "low-fantasy", "forest");
      await service.generateImage("tense", "sci-fi", "city");
      await service.generateImage("ominous", "horror", "ruins");

      expect(service.getRemainingGenerations()).toBe(0);

      // Try to generate one more (will fail, but counter shouldn't go negative)
      try {
        await service.generateImage("triumphant", "high-fantasy", "castle");
      } catch (error) {
        // Expected to fail
      }

      expect(service.getRemainingGenerations()).toBe(0);
    });
  });

  describe("close()", () => {
    test("closes MCP connection", async () => {
      await service.initialize();
      await service.close();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    test("can be called multiple times safely", async () => {
      await service.initialize();
      await service.close();
      await service.close();

      // Should only close once (second call is no-op)
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    test("can be called without initializing", async () => {
      // Should complete without error even if not initialized
      await service.close();
      // If we got here without throwing, the test passes
      expect(true).toBe(true);
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
        await service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxGenerationsPerSession: 10,
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
        await service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxGenerationsPerSession: 10,
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
        await service.close();
        service = new ImageGeneratorService({
          outputDirectory: TEST_OUTPUT_DIR,
          timeout: 1000,
          maxGenerationsPerSession: 15,
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
