// Error Handler Tests
// Unit tests for error mapping, logging, and user-friendly messages

import { describe, test, expect } from "bun:test";
import {
  mapSDKError,
  mapStateError,
  mapGenericError,
  mapProcessingTimeoutError,
  ProcessingTimeoutError,
  logError,
  createErrorPayload,
  isStateCorruption,
  isRetryable,
  isSessionRecoveryNeeded,
  type ErrorDetails,
} from "../../src/error-handler";
import type { SDKAssistantMessageError } from "@anthropic-ai/claude-agent-sdk";

describe("Error Handler", () => {
  describe("mapSDKError()", () => {
    test("maps rate_limit to user-friendly message", () => {
      const result = mapSDKError("rate_limit");

      expect(result.code).toBe("RATE_LIMIT");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe(
        "The game master is busy. Please try again later."
      );
      expect(result.technicalDetails).toContain("rate limit");
    });

    test("maps server_error to overloaded message", () => {
      const result = mapSDKError("server_error");

      expect(result.code).toBe("GM_ERROR");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe(
        "The game master is thinking deeply. Please wait."
      );
      expect(result.technicalDetails).toContain("server error");
    });

    test("maps authentication_failed to generic error", () => {
      const result = mapSDKError("authentication_failed");

      expect(result.code).toBe("AUTH_ERROR");
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toBe("Something went wrong. Please try again.");
      expect(result.technicalDetails).toContain("authentication failed");
    });

    test("maps billing_error to generic error", () => {
      const result = mapSDKError("billing_error");

      expect(result.code).toBe("AUTH_ERROR");
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

  describe("ProcessingTimeoutError", () => {
    test("creates error with timeout duration", () => {
      const error = new ProcessingTimeoutError(60000);

      expect(error.name).toBe("ProcessingTimeoutError");
      expect(error.timeoutMs).toBe(60000);
      expect(error.message).toContain("60000ms");
    });

    test("is an Error instance", () => {
      const error = new ProcessingTimeoutError(30000);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ProcessingTimeoutError).toBe(true);
    });
  });

  describe("mapProcessingTimeoutError()", () => {
    test("maps timeout error to user-friendly message", () => {
      const error = new ProcessingTimeoutError(60000);
      const result = mapProcessingTimeoutError(error);

      expect(result.code).toBe("PROCESSING_TIMEOUT");
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toBe(
        "The game master is taking longer than expected. Your response may still arrive shortly."
      );
      expect(result.technicalDetails).toContain("60000ms");
      expect(result.originalError).toBe(error);
    });

    test("includes timeout duration in technical details", () => {
      const error = new ProcessingTimeoutError(30000);
      const result = mapProcessingTimeoutError(error);

      expect(result.technicalDetails).toContain("30000ms");
    });
  });

  describe("logError()", () => {
    test("logs error with context without throwing", () => {
      // logError now uses pino logger (tested separately in logger.test.ts)
      // This test verifies the function executes without errors
      const errorDetails: ErrorDetails = {
        code: "GM_ERROR",
        message: "Test error",
        retryable: true,
        userMessage: "User-friendly message",
        technicalDetails: "Technical details for debugging",
      };

      // Should not throw
      expect(() => {
        logError("testContext", errorDetails, { adventureId: "abc123" });
      }).not.toThrow();
    });

    test("handles Error instances with stack trace without throwing", () => {
      const error = new Error("Test error with stack");
      const errorDetails: ErrorDetails = {
        code: "GM_ERROR",
        message: "Test error",
        retryable: true,
        userMessage: "User message",
        originalError: error,
      };

      // Should not throw even with originalError containing stack
      expect(() => {
        logError("testContext", errorDetails);
      }).not.toThrow();
    });
  });

  describe("createErrorPayload()", () => {
    test("creates protocol-compliant error payload", () => {
      const errorDetails: ErrorDetails = {
        code: "RATE_LIMIT",
        message: "Rate limit exceeded",
        retryable: false,
        userMessage: "The game master is busy. Please try again later.",
        technicalDetails: "API rate limit",
      };

      const payload = createErrorPayload(errorDetails);

      expect(payload.code).toBe("RATE_LIMIT");
      expect(payload.message).toBe(
        "The game master is busy. Please try again later."
      );
      expect(payload.retryable).toBe(false);
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
      expect(isStateCorruption("PROCESSING_TIMEOUT")).toBe(false);
    });
  });

  describe("isRetryable()", () => {
    test("identifies retryable errors", () => {
      const retryableError: ErrorDetails = {
        code: "GM_ERROR",
        message: "Temporary glitch",
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

  describe("Error message consistency", () => {
    test("rate limit errors show specific message", () => {
      const details = mapSDKError("rate_limit");
      expect(details.userMessage).toBe(
        "The game master is busy. Please try again later."
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

    test("processing timeout errors show specific message", () => {
      const error = new ProcessingTimeoutError(60000);
      const details = mapProcessingTimeoutError(error);
      expect(details.userMessage).toBe(
        "The game master is taking longer than expected. Your response may still arrive shortly."
      );
      expect(details.retryable).toBe(true);
    });

    test("processing timeout creates valid error payload", () => {
      const error = new ProcessingTimeoutError(60000);
      const details = mapProcessingTimeoutError(error);
      const payload = createErrorPayload(details);

      expect(payload.code).toBe("PROCESSING_TIMEOUT");
      expect(payload.retryable).toBe(true);
      expect(typeof payload.message).toBe("string");
    });
  });

  describe("isSessionRecoveryNeeded()", () => {
    test("returns true for invalid_request SDK error code", () => {
      expect(isSessionRecoveryNeeded("invalid_request")).toBe(true);
    });

    test("returns false for other SDK error codes", () => {
      expect(isSessionRecoveryNeeded("rate_limit")).toBe(false);
      expect(isSessionRecoveryNeeded("server_error")).toBe(false);
      expect(isSessionRecoveryNeeded("authentication_failed")).toBe(false);
      expect(isSessionRecoveryNeeded("billing_error")).toBe(false);
      expect(isSessionRecoveryNeeded("unknown")).toBe(false);
    });

    test("returns true for session-related error messages", () => {
      expect(isSessionRecoveryNeeded(undefined, "Session not found")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Invalid session ID")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Session expired")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Conversation not found")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Resume failed for session")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "No conversation found")).toBe(true);
    });

    test("returns true for SDK process exit errors", () => {
      expect(isSessionRecoveryNeeded(undefined, "Claude Code process exited with code 1")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Process exited with code 1")).toBe(true);
    });

    test("is case-insensitive for error messages", () => {
      expect(isSessionRecoveryNeeded(undefined, "SESSION NOT FOUND")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "session not found")).toBe(true);
      expect(isSessionRecoveryNeeded(undefined, "Session Not Found")).toBe(true);
    });

    test("returns false for unrelated error messages", () => {
      expect(isSessionRecoveryNeeded(undefined, "Network timeout")).toBe(false);
      expect(isSessionRecoveryNeeded(undefined, "Rate limit exceeded")).toBe(false);
      expect(isSessionRecoveryNeeded(undefined, "Authentication failed")).toBe(false);
    });

    test("returns false with no arguments", () => {
      expect(isSessionRecoveryNeeded(undefined, undefined)).toBe(false);
      expect(isSessionRecoveryNeeded(undefined)).toBe(false);
    });

    test("SDK error code takes precedence over message", () => {
      // invalid_request should trigger recovery even with unrelated message
      expect(isSessionRecoveryNeeded("invalid_request", "Some other error")).toBe(true);
    });
  });
});
