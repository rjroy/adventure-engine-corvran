/**
 * Unit tests for graceful shutdown module
 */
import { describe, test, expect, beforeEach, mock } from "bun:test";

describe("Shutdown Module", () => {
  // Mock dependencies
  const createMockDeps = () => ({
    server: {
      stop: mock(() => {}),
    },
    heartbeatInterval: setInterval(() => {}, 10000),
    imageGeneratorService: {
      close: mock(() => {}),
    },
    drainConnections: mock(() => {}),
  });

  beforeEach(() => {
    // Note: shutdown.ts has module-level state (isShuttingDown, deps) that cannot
    // be easily reset between tests in Bun. Tests in this file verify:
    // - Export availability and types
    // - Interface compliance
    // - Initial state (isShutdownInProgress returns false before any shutdown)
    //
    // Tests do NOT trigger actual shutdown (which calls process.exit) to avoid
    // test isolation issues and process termination.
  });

  describe("initializeShutdown", () => {
    test("registers signal handlers without error", async () => {
      // Fresh import to get clean module state
      const { initializeShutdown } = await import("../../src/shutdown");
      const deps = createMockDeps();

      expect(() => {
        initializeShutdown(deps as Parameters<typeof initializeShutdown>[0]);
      }).not.toThrow();

      // Clean up interval
      clearInterval(deps.heartbeatInterval);
    });
  });

  describe("isShutdownInProgress", () => {
    test("returns false before shutdown is initiated", async () => {
      const { isShutdownInProgress } = await import("../../src/shutdown");

      // Initial state should be false
      expect(isShutdownInProgress()).toBe(false);
    });
  });

  describe("ShutdownDeps interface", () => {
    test("mock deps satisfy interface requirements", () => {
      const deps = createMockDeps();

      // Verify mock structure matches expected interface
      expect(typeof deps.server.stop).toBe("function");
      expect(typeof deps.imageGeneratorService.close).toBe("function");
      expect(typeof deps.drainConnections).toBe("function");
      expect(deps.heartbeatInterval).toBeDefined();

      // Clean up
      clearInterval(deps.heartbeatInterval);
    });
  });
});

describe("drainConnections function (from server.ts)", () => {
  test("drainConnections is exported from server", async () => {
    const { drainConnections } = await import("../../src/server");

    expect(typeof drainConnections).toBe("function");
  });

  test("drainConnections handles empty connections map", async () => {
    const { drainConnections, connections } = await import("../../src/server");

    // Ensure connections is empty
    connections.clear();

    // Should not throw when there are no connections
    expect(() => {
      drainConnections("Test shutdown");
    }).not.toThrow();
  });
});

describe("heartbeatInterval export (from server.ts)", () => {
  test("heartbeatInterval is exported from server", async () => {
    const { heartbeatInterval } = await import("../../src/server");

    expect(heartbeatInterval).toBeDefined();
    // It should be a Timer/Interval object
    expect(typeof heartbeatInterval).toBe("object");
  });
});

describe("imageGeneratorService export (from server.ts)", () => {
  test("imageGeneratorService is exported from server", async () => {
    const { imageGeneratorService } = await import("../../src/server");

    expect(imageGeneratorService).toBeDefined();
    expect(typeof imageGeneratorService.close).toBe("function");
  });

  test("imageGeneratorService.close can be called without error", async () => {
    const { imageGeneratorService } = await import("../../src/server");

    // Should not throw when called
    expect(() => {
      imageGeneratorService.close();
    }).not.toThrow();
  });
});
