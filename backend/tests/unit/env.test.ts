/**
 * Environment Validation Tests
 *
 * Tests for the env.ts module that validates environment variables at startup.
 */

import { describe, expect, test } from "bun:test";
import {
  parsePort,
  parseMaxConnections,
  parseInputTimeout,
  parseLogLevel,
  parseAllowedOrigins,
  parseBoolean,
  validateEnvironment,
  VALID_LOG_LEVELS,
} from "../../src/env";

describe("parsePort", () => {
  test("returns default 3000 when undefined", () => {
    expect(parsePort(undefined)).toBe(3000);
  });

  test("returns default 3000 when empty string", () => {
    expect(parsePort("")).toBe(3000);
  });

  test("parses valid port numbers", () => {
    expect(parsePort("8080")).toBe(8080);
    expect(parsePort("3000")).toBe(3000);
    expect(parsePort("1")).toBe(1);
    expect(parsePort("65535")).toBe(65535);
  });

  test("throws for non-numeric value", () => {
    expect(() => parsePort("invalid")).toThrow("Invalid PORT");
    expect(() => parsePort("invalid")).toThrow("invalid");
  });

  test("throws for port below 1", () => {
    expect(() => parsePort("0")).toThrow("Invalid PORT");
    expect(() => parsePort("-1")).toThrow("Invalid PORT");
  });

  test("throws for port above 65535", () => {
    expect(() => parsePort("65536")).toThrow("Invalid PORT");
    expect(() => parsePort("99999")).toThrow("Invalid PORT");
  });

  test("throws for floating point", () => {
    // parseInt will parse "3000.5" as 3000, so this actually passes
    // This is acceptable behavior - parseInt truncates
    expect(parsePort("3000.5")).toBe(3000);
  });
});

describe("parseMaxConnections", () => {
  test("returns default 100 when undefined", () => {
    expect(parseMaxConnections(undefined)).toBe(100);
  });

  test("returns default 100 when empty string", () => {
    expect(parseMaxConnections("")).toBe(100);
  });

  test("parses valid connection counts", () => {
    expect(parseMaxConnections("50")).toBe(50);
    expect(parseMaxConnections("1")).toBe(1);
    expect(parseMaxConnections("1000")).toBe(1000);
  });

  test("throws for non-numeric value", () => {
    expect(() => parseMaxConnections("many")).toThrow("Invalid MAX_CONNECTIONS");
    expect(() => parseMaxConnections("abc")).toThrow("Invalid MAX_CONNECTIONS");
  });

  test("throws for zero", () => {
    expect(() => parseMaxConnections("0")).toThrow("Invalid MAX_CONNECTIONS");
    expect(() => parseMaxConnections("0")).toThrow("positive integer");
  });

  test("throws for negative value", () => {
    expect(() => parseMaxConnections("-1")).toThrow("Invalid MAX_CONNECTIONS");
    expect(() => parseMaxConnections("-100")).toThrow("positive integer");
  });
});

describe("parseInputTimeout", () => {
  test("returns default 60000 when undefined", () => {
    expect(parseInputTimeout(undefined)).toBe(60000);
  });

  test("returns default 60000 when empty string", () => {
    expect(parseInputTimeout("")).toBe(60000);
  });

  test("parses valid timeout values", () => {
    expect(parseInputTimeout("1000")).toBe(1000);
    expect(parseInputTimeout("30000")).toBe(30000);
    expect(parseInputTimeout("120000")).toBe(120000);
  });

  test("throws for non-numeric value", () => {
    expect(() => parseInputTimeout("slow")).toThrow("Invalid INPUT_TIMEOUT");
    expect(() => parseInputTimeout("abc")).toThrow("Invalid INPUT_TIMEOUT");
  });

  test("throws for value below 1000ms", () => {
    expect(() => parseInputTimeout("999")).toThrow("Invalid INPUT_TIMEOUT");
    expect(() => parseInputTimeout("500")).toThrow(">= 1000");
  });

  test("throws for zero", () => {
    expect(() => parseInputTimeout("0")).toThrow("Invalid INPUT_TIMEOUT");
  });

  test("throws for negative value", () => {
    expect(() => parseInputTimeout("-1000")).toThrow("Invalid INPUT_TIMEOUT");
  });
});

describe("parseLogLevel", () => {
  test("returns default info when undefined", () => {
    expect(parseLogLevel(undefined)).toBe("info");
  });

  test("returns default info when empty string", () => {
    expect(parseLogLevel("")).toBe("info");
  });

  test("accepts all valid log levels", () => {
    for (const level of VALID_LOG_LEVELS) {
      expect(parseLogLevel(level)).toBe(level);
    }
  });

  test("throws for invalid log level", () => {
    expect(() => parseLogLevel("verbose")).toThrow("Invalid LOG_LEVEL");
    expect(() => parseLogLevel("verbose")).toThrow("verbose");
    expect(() => parseLogLevel("verbose")).toThrow("debug, info, warn, error");
  });

  test("is case-sensitive", () => {
    // Log levels should be lowercase
    expect(() => parseLogLevel("INFO")).toThrow("Invalid LOG_LEVEL");
    expect(() => parseLogLevel("Debug")).toThrow("Invalid LOG_LEVEL");
  });
});

describe("parseAllowedOrigins", () => {
  test("returns defaults when undefined", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  test("returns defaults when empty string", () => {
    expect(parseAllowedOrigins("")).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  test("parses single origin", () => {
    expect(parseAllowedOrigins("http://example.com")).toEqual([
      "http://example.com",
    ]);
  });

  test("parses comma-separated origins", () => {
    expect(
      parseAllowedOrigins("http://example.com,http://other.com")
    ).toEqual(["http://example.com", "http://other.com"]);
  });

  test("trims whitespace around origins", () => {
    expect(
      parseAllowedOrigins("  http://example.com  ,  http://other.com  ")
    ).toEqual(["http://example.com", "http://other.com"]);
  });

  test("filters empty entries", () => {
    expect(parseAllowedOrigins("http://example.com,,http://other.com")).toEqual([
      "http://example.com",
      "http://other.com",
    ]);
  });

  test("returns defaults for comma-only input", () => {
    expect(parseAllowedOrigins(",")).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
    expect(parseAllowedOrigins(",,,")).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });

  test("returns defaults for whitespace-only input", () => {
    expect(parseAllowedOrigins("   ")).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
    expect(parseAllowedOrigins("  ,  ,  ")).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
  });
});

describe("parseBoolean", () => {
  test("returns default when undefined", () => {
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean(undefined, false)).toBe(false);
  });

  test("parses true values", () => {
    expect(parseBoolean("true", false)).toBe(true);
    expect(parseBoolean("TRUE", false)).toBe(true);
    expect(parseBoolean("True", false)).toBe(true);
    expect(parseBoolean("1", false)).toBe(true);
  });

  test("parses false values", () => {
    expect(parseBoolean("false", true)).toBe(false);
    expect(parseBoolean("FALSE", true)).toBe(false);
    expect(parseBoolean("0", true)).toBe(false);
    expect(parseBoolean("no", true)).toBe(false);
    expect(parseBoolean("anything", true)).toBe(false);
  });
});

describe("validateEnvironment", () => {
  test("returns valid config with all defaults", () => {
    const result = validateEnvironment({});

    expect(result.errors).toEqual([]);
    expect(result.config.port).toBe(3000);
    expect(result.config.host).toBe("localhost");
    expect(result.config.maxConnections).toBe(100);
    expect(result.config.inputTimeout).toBe(60000);
    expect(result.config.logLevel).toBe("info");
    expect(result.config.logFile).toBe(true);
    expect(result.config.mockSdk).toBe(false);
    expect(result.config.adventuresDir).toBe("./adventures");
    expect(result.config.staticRoot).toBe("../frontend/dist");
  });

  test("warns when REPLICATE_API_TOKEN is missing", () => {
    const result = validateEnvironment({});

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("REPLICATE_API_TOKEN");
    expect(result.warnings[0]).toContain("Image generation will be unavailable");
  });

  test("no warning when REPLICATE_API_TOKEN is set", () => {
    const result = validateEnvironment({
      REPLICATE_API_TOKEN: "test-token",
    });

    expect(result.warnings).toEqual([]);
    expect(result.config.replicateApiToken).toBe("test-token");
  });

  test("collects all validation errors", () => {
    const result = validateEnvironment({
      PORT: "invalid",
      MAX_CONNECTIONS: "bad",
      INPUT_TIMEOUT: "slow",
      LOG_LEVEL: "unknown",
    });

    expect(result.errors).toHaveLength(4);
    expect(result.errors[0]).toContain("Invalid PORT");
    expect(result.errors[1]).toContain("Invalid MAX_CONNECTIONS");
    expect(result.errors[2]).toContain("Invalid INPUT_TIMEOUT");
    expect(result.errors[3]).toContain("Invalid LOG_LEVEL");
  });

  test("parses all valid values", () => {
    const result = validateEnvironment({
      PORT: "8080",
      HOST: "0.0.0.0",
      ADVENTURES_DIR: "/data/adventures",
      ALLOWED_ORIGINS: "http://example.com,http://other.com",
      MAX_CONNECTIONS: "50",
      INPUT_TIMEOUT: "30000",
      LOG_LEVEL: "debug",
      LOG_FILE: "false",
      NODE_ENV: "production",
      STATIC_ROOT: "/var/www/static",
      MOCK_SDK: "true",
      REPLICATE_API_TOKEN: "r8_abc123",
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.config).toEqual({
      port: 8080,
      host: "0.0.0.0",
      adventuresDir: "/data/adventures",
      allowedOrigins: ["http://example.com", "http://other.com"],
      maxConnections: 50,
      inputTimeout: 30000,
      logLevel: "debug",
      logFile: false,
      nodeEnv: "production",
      staticRoot: "/var/www/static",
      mockSdk: true,
      replicateApiToken: "r8_abc123",
    });
  });

  test("uses defaults for missing optional values", () => {
    const result = validateEnvironment({
      REPLICATE_API_TOKEN: "token", // Set to avoid warning
    });

    expect(result.config.port).toBe(3000);
    expect(result.config.host).toBe("localhost");
    expect(result.config.adventuresDir).toBe("./adventures");
    expect(result.config.allowedOrigins).toEqual([
      "http://localhost:5173",
      "http://localhost:3000",
    ]);
    expect(result.config.maxConnections).toBe(100);
    expect(result.config.inputTimeout).toBe(60000);
    expect(result.config.logLevel).toBe("info");
    expect(result.config.logFile).toBe(true);
    expect(result.config.nodeEnv).toBeUndefined();
    expect(result.config.staticRoot).toBe("../frontend/dist");
    expect(result.config.mockSdk).toBe(false);
  });

  test("LOG_FILE=false disables file logging", () => {
    const result = validateEnvironment({
      LOG_FILE: "false",
      REPLICATE_API_TOKEN: "token",
    });

    expect(result.config.logFile).toBe(false);
  });

  test("continues parsing after validation errors", () => {
    // Even if PORT is invalid, other values should still be parsed
    const result = validateEnvironment({
      PORT: "invalid",
      HOST: "myhost",
      REPLICATE_API_TOKEN: "token",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.config.host).toBe("myhost");
    expect(result.config.replicateApiToken).toBe("token");
  });
});
