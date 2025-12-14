// Error Handler Tests
// Unit tests for error mapping, logging, and user-friendly messages

import { describe, test, expect, mock } from "bun:test";
import {
  mapSDKError,
  mapStateError,
  mapGenericError,
  logError,
  createErrorPayload,
  isStateCorruption,
  isRetryable,
  type ErrorDetails,
} from "../../src/error-handler";
import type { SDKAssistantMessageError } from "@anthropic-ai/claude-agent-sdk";

describe("Error Handler", () => {
  describe("mapSDKError()", () => {
    test("maps rate_limit to user-friendly message", () => {
      const result = mapSDKError("rate_limit");

      expect(result.code).toBe("RATE_LIMIT");
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe(
        "The game master needs a moment. Please try again."
      );
      expect(result.technicalDetails).toContain("rate limit");
    });

    test("maps server_error to overloaded message", () => {
      const result = mapSDKError("server_error");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe(
        "The game master is thinking deeply. Please wait."
      );
      expect(result.technicalDetails).toContain("server error");
    });

    test("maps authentication_failed to generic error", () => {
      const result = mapSDKError("authentication_failed");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
      expect(result.technicalDetails).toContain("authentication failed");
    });

    test("maps billing_error to generic error", () => {
      const result = mapSDKError("billing_error");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
      expect(result.technicalDetails).toContain("billing error");
    });

    test("maps invalid_request to generic error", () => {
      const result = mapSDKError("invalid_request");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
    });

    test("maps unknown to generic retryable error", () => {
      const result = mapSDKError("unknown");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
    });

    test("all SDK error codes are mapped", () => {
      const sdkErrorCodes: SDKAssistantMessageError[] = [
        "rate_limit",
        "server_error",
        "authentication_failed",
        "billing_error",
        "invalid_request",
        "unknown",
      ];

      for (const code of sdkErrorCodes) {
        const result = mapSDKError(code);
        expect(result.code).toBeDefined();
        expect(result.userMessage).toBeDefined();
        expect(result.technicalDetails).toBeDefined();
        expect(typeof result.retryable).toBe("boolean");
      }
    });
  });

  describe("mapStateError()", () => {
    test("maps NOT_FOUND error", () => {
      const result = mapStateError(
        "NOT_FOUND",
        "Adventure abc123 not found"
      );

      expect(result.code).toBe("ADVENTURE_NOT_FOUND");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain("Adventure not found");
      expect(result.technicalDetails).toContain("State file not found");
    });

    test("maps INVALID_TOKEN error", () => {
      const result = mapStateError("INVALID_TOKEN", "Token mismatch");

      expect(result.code).toBe("INVALID_TOKEN");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain("Invalid session");
      expect(result.technicalDetails).toContain(
        "Session token validation failed"
      );
    });

    test("maps CORRUPTED error with path", () => {
      const result = mapStateError(
        "CORRUPTED",
        "Invalid JSON",
        "/path/to/state.json"
      );

      expect(result.code).toBe("STATE_CORRUPTED");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain("corrupted");
      expect(result.userMessage).toContain("start fresh");
      expect(result.technicalDetails).toContain("/path/to/state.json");
    });

    test("maps CORRUPTED error without path", () => {
      const result = mapStateError("CORRUPTED", "Parse error");

      expect(result.code).toBe("STATE_CORRUPTED");
      expect(result.retryable).toBe(false);
      expect(result.technicalDetails).toContain("Parse error");
    });
  });

  describe("mapGenericError()", () => {
    test("maps Error instance", () => {
      const error = new Error("Something broke");
      const result = mapGenericError(error);

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
      expect(result.technicalDetails).toContain("Something broke");
      expect(result.originalError).toBe(error);
    });

    test("maps string error", () => {
      const result = mapGenericError("Network timeout");

      expect(result.code).toBe("GM_ERROR");
      expect(result.message).toBe("Network timeout");
      expect(result.technicalDetails).toContain("Network timeout");
    });

    test("maps unknown error type", () => {
      const weirdError = { foo: "bar" };
      const result = mapGenericError(weirdError);

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.technicalDetails).toBeDefined();
    });
  });

  describe("logError()", () => {
    test("logs error with context", () => {
      // Mock console.error to capture output
      const originalConsoleError = console.error;
      const logOutput: unknown[] = [];
      console.error = mock((...args: unknown[]) => {
        logOutput.push(args);
      });

      const errorDetails: ErrorDetails = {
        code: "GM_ERROR",
        message: "Test error",
        retryable: true,
        userMessage: "User-friendly message",
        technicalDetails: "Technical details for debugging",
      };

      logError("testContext", errorDetails, { adventureId: "abc123" });

      // Restore console.error
      console.error = originalConsoleError;

      // Verify logging occurred
      expect(logOutput.length).toBeGreaterThan(0);
      const firstLog = logOutput[0] as unknown[];
      expect(firstLog[0]).toContain("[ERROR]");
      expect(firstLog[0]).toContain("testContext");

      // Parse the JSON log
      const jsonLogString = firstLog[1] as string;
      const jsonLog = JSON.parse(jsonLogString) as {
        errorCode: string;
        retryable: boolean;
        adventureId: string;
        timestamp: string;
      };
      expect(jsonLog.errorCode).toBe("GM_ERROR");
      expect(jsonLog.retryable).toBe(true);
      expect(jsonLog.adventureId).toBe("abc123");
      expect(jsonLog.timestamp).toBeDefined();
    });

    test("logs stack trace for Error instances", () => {
      const originalConsoleError = console.error;
      const logOutput: unknown[] = [];
      console.error = mock((...args: unknown[]) => {
        logOutput.push(args);
      });

      const error = new Error("Test error with stack");
      const errorDetails: ErrorDetails = {
        code: "GM_ERROR",
        message: "Test error",
        retryable: true,
        userMessage: "User message",
        originalError: error,
      };

      logError("testContext", errorDetails);

      console.error = originalConsoleError;

      // Should have at least 2 log calls (structured log + stack trace)
      expect(logOutput.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("createErrorPayload()", () => {
    test("creates protocol-compliant error payload", () => {
      const errorDetails: ErrorDetails = {
        code: "RATE_LIMIT",
        message: "Rate limit exceeded",
        retryable: true,
        userMessage: "The game master needs a moment. Please try again.",
        technicalDetails: "API rate limit",
      };

      const payload = createErrorPayload(errorDetails);

      expect(payload.code).toBe("RATE_LIMIT");
      expect(payload.message).toBe(
        "The game master needs a moment. Please try again."
      );
      expect(payload.retryable).toBe(true);
    });

    test("uses userMessage not technicalDetails", () => {
      const errorDetails: ErrorDetails = {
        code: "GM_ERROR",
        message: "Internal error",
        retryable: false,
        userMessage: "Something went wrong. Please try again.",
        technicalDetails: "Stack overflow in parser at line 42",
      };

      const payload = createErrorPayload(errorDetails);

      expect(payload.message).toBe("Something went wrong. Please try again.");
      expect(payload.message).not.toContain("Stack overflow");
    });
  });

  describe("isStateCorruption()", () => {
    test("identifies STATE_CORRUPTED error", () => {
      expect(isStateCorruption("STATE_CORRUPTED")).toBe(true);
    });

    test("returns false for other error codes", () => {
      expect(isStateCorruption("GM_ERROR")).toBe(false);
      expect(isStateCorruption("RATE_LIMIT")).toBe(false);
      expect(isStateCorruption("INVALID_TOKEN")).toBe(false);
      expect(isStateCorruption("ADVENTURE_NOT_FOUND")).toBe(false);
    });
  });

  describe("isRetryable()", () => {
    test("identifies retryable errors", () => {
      const retryableError: ErrorDetails = {
        code: "RATE_LIMIT",
        message: "Rate limit",
        retryable: true,
        userMessage: "Try again",
      };

      expect(isRetryable(retryableError)).toBe(true);
    });

    test("identifies non-retryable errors", () => {
      const nonRetryableError: ErrorDetails = {
        code: "INVALID_TOKEN",
        message: "Invalid token",
        retryable: false,
        userMessage: "Invalid session",
      };

      expect(isRetryable(nonRetryableError)).toBe(false);
    });
  });

  describe("Error message consistency (REQ-F-25)", () => {
    test("rate limit errors show specific message", () => {
      const details = mapSDKError("rate_limit");
      expect(details.userMessage).toBe(
        "The game master needs a moment. Please try again."
      );
    });

    test("overloaded errors show specific message", () => {
      const details = mapSDKError("server_error");
      expect(details.userMessage).toBe(
        "The game master is thinking deeply. Please wait."
      );
    });

    test("generic errors show generic message", () => {
      const authDetails = mapSDKError("authentication_failed");
      const billingDetails = mapSDKError("billing_error");
      const invalidDetails = mapSDKError("invalid_request");

      expect(authDetails.userMessage).toBe(
        "Something went wrong. Please try again."
      );
      expect(billingDetails.userMessage).toBe(
        "Something went wrong. Please try again."
      );
      expect(invalidDetails.userMessage).toBe(
        "Something went wrong. Please try again."
      );
    });

    test("all error responses include retryable boolean", () => {
      const sdkErrors: SDKAssistantMessageError[] = [
        "rate_limit",
        "server_error",
        "authentication_failed",
        "billing_error",
        "invalid_request",
        "unknown",
      ];

      for (const code of sdkErrors) {
        const details = mapSDKError(code);
        const payload = createErrorPayload(details);
        expect(typeof payload.retryable).toBe("boolean");
      }
    });

    test("state corruption offers start fresh option", () => {
      const details = mapStateError("CORRUPTED", "Parse failed");
      expect(details.userMessage).toContain("start fresh");
    });
  });
});
