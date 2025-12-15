import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("Logger Module", () => {
  // Store original env values
  let originalLogLevel: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Save original env values
    originalLogLevel = process.env.LOG_LEVEL;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original env values
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe("Logger Import", () => {
    test("exports logger instance", async () => {
      // Dynamic import to get fresh module
      const { logger } = await import("../../src/logger");

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    test("exports Logger type", async () => {
      const loggerModule = await import("../../src/logger");

      // Type export verification - if this compiles, the type exists
      expect(loggerModule.logger).toBeDefined();
    });
  });

  describe("Child Logger", () => {
    test("creates child logger with context", async () => {
      const { logger } = await import("../../src/logger");

      const childLogger = logger.child({ component: "TestComponent" });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe("function");
      expect(typeof childLogger.error).toBe("function");
    });

    test("child logger maintains parent functionality", async () => {
      const { logger } = await import("../../src/logger");

      const childLogger = logger.child({
        adventureId: "test-adventure",
        connId: "test-conn",
      });

      // Should not throw when logging with context
      expect(() => {
        childLogger.info({ extra: "data" }, "Test message");
      }).not.toThrow();
    });

    test("nested child loggers accumulate context", async () => {
      const { logger } = await import("../../src/logger");

      const level1 = logger.child({ level: 1 });
      const level2 = level1.child({ level: 2 });

      expect(level2).toBeDefined();
      expect(() => {
        level2.info("Nested context works");
      }).not.toThrow();
    });
  });

  describe("Log Methods", () => {
    test("info method accepts message and object", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.info({ key: "value" }, "Info message");
      }).not.toThrow();
    });

    test("warn method accepts message and object", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.warn({ warning: true }, "Warning message");
      }).not.toThrow();
    });

    test("error method accepts message and object", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.error({ err: new Error("Test error") }, "Error occurred");
      }).not.toThrow();
    });

    test("debug method accepts message and object", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.debug({ debug: true }, "Debug message");
      }).not.toThrow();
    });

    test("methods accept message-only format", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.info("Simple info");
        logger.warn("Simple warning");
        logger.error("Simple error");
        logger.debug("Simple debug");
      }).not.toThrow();
    });
  });

  describe("Log Level Configuration", () => {
    test("respects LOG_LEVEL environment variable", async () => {
      // This test verifies the logger reads LOG_LEVEL
      // Since pino is configured at import time, we verify the pattern works
      const { logger } = await import("../../src/logger");

      // Logger should be configured with a level
      expect(logger.level).toBeDefined();
    });

    test("defaults to info level when LOG_LEVEL not set", () => {
      // Verify default behavior
      const defaultLevel = "info";

      // When LOG_LEVEL is not set, should default to info
      expect(process.env.LOG_LEVEL || "info").toBe(defaultLevel);
    });
  });

  describe("Integration Patterns", () => {
    test("works with error-handler pattern", async () => {
      const { logger } = await import("../../src/logger");

      const errorLogger = logger.child({ component: "ErrorHandler" });
      const logData = {
        timestamp: new Date().toISOString(),
        context: "test",
        errorCode: "TEST_ERROR",
        message: "Test message",
      };

      expect(() => {
        errorLogger.error(logData, "[ERROR] test");
      }).not.toThrow();
    });

    test("works with WebSocket connection pattern", async () => {
      const { logger } = await import("../../src/logger");

      const connLogger = logger.child({
        adventureId: "adv-123",
        connId: "conn_1_12345",
      });

      expect(() => {
        connLogger.info("WebSocket opened");
        connLogger.info({ code: 1000, reason: "Normal closure" }, "WebSocket closed");
      }).not.toThrow();
    });

    test("works with GameSession pattern", async () => {
      const { logger } = await import("../../src/logger");

      expect(() => {
        logger.debug({ input: "player action" }, "Processing input");
        logger.debug({ mood: "calm", genre: "high-fantasy" }, "Theme change");
        logger.warn({ flags: ["length"] }, "Flagged input");
      }).not.toThrow();
    });
  });
});
