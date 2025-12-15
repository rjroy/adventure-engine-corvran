// Error Handler Module
// Centralized error mapping and logging for the Adventure Engine
// Implements REQ-F-25 (user-friendly errors) and REQ-F-28 (detailed logging)

import type { SDKAssistantMessageError } from "@anthropic-ai/claude-agent-sdk";
import type { ErrorCode } from "./types/protocol";
import { logger } from "./logger";

/**
 * Internal error details for logging
 */
export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  userMessage: string; // Friendly message shown to user
  technicalDetails?: string; // Technical details for logs
  originalError?: unknown; // Original error for debugging
}

/**
 * Map SDK error codes to user-friendly error details
 * Implements the error mapping strategy from the spec
 */
export function mapSDKError(sdkErrorCode: SDKAssistantMessageError): ErrorDetails {
  const errorMap: Record<
    SDKAssistantMessageError,
    Omit<ErrorDetails, "originalError">
  > = {
    rate_limit: {
      code: "RATE_LIMIT",
      message: "Rate limit exceeded",
      retryable: true,
      userMessage: "The game master needs a moment. Please try again.",
      technicalDetails: "Claude API rate limit exceeded",
    },
    server_error: {
      code: "GM_ERROR",
      message: "AI service overloaded",
      retryable: true,
      userMessage: "The game master is thinking deeply. Please wait.",
      technicalDetails: "Claude API server error (500-level)",
    },
    authentication_failed: {
      code: "GM_ERROR",
      message: "Authentication failed",
      retryable: false,
      userMessage: "Something went wrong. Please try again.",
      technicalDetails: "Claude API authentication failed - check API key",
    },
    billing_error: {
      code: "GM_ERROR",
      message: "Billing error",
      retryable: false,
      userMessage: "Something went wrong. Please try again.",
      technicalDetails: "Claude API billing error - check account status",
    },
    invalid_request: {
      code: "GM_ERROR",
      message: "Invalid request",
      retryable: false,
      userMessage: "Something went wrong. Please try again.",
      technicalDetails: "Invalid request sent to Claude API",
    },
    unknown: {
      code: "GM_ERROR",
      message: "Unknown error",
      retryable: true,
      userMessage: "Something went wrong. Please try again.",
      technicalDetails: "Unknown error from Claude API",
    },
  };

  return errorMap[sdkErrorCode];
}

/**
 * Map state load errors to error details
 */
export function mapStateError(
  errorType: "NOT_FOUND" | "CORRUPTED" | "INVALID_TOKEN",
  errorMessage: string,
  path?: string
): ErrorDetails {
  switch (errorType) {
    case "NOT_FOUND":
      return {
        code: "ADVENTURE_NOT_FOUND",
        message: errorMessage,
        retryable: false,
        userMessage: "Adventure not found. Please check the adventure ID.",
        technicalDetails: `State file not found: ${errorMessage}`,
      };

    case "INVALID_TOKEN":
      return {
        code: "INVALID_TOKEN",
        message: errorMessage,
        retryable: false,
        userMessage: "Invalid session. Please start a new adventure.",
        technicalDetails: `Session token validation failed: ${errorMessage}`,
      };

    case "CORRUPTED":
      return {
        code: "STATE_CORRUPTED",
        message: errorMessage,
        retryable: false, // Not retryable - needs START_FRESH
        userMessage:
          "Your adventure data appears corrupted. You can start fresh to begin a new adventure.",
        technicalDetails: `State corruption detected${path ? ` in ${path}` : ""}: ${errorMessage}`,
      };
  }
}

/**
 * Create error details for generic errors
 */
export function mapGenericError(error: unknown): ErrorDetails {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  return {
    code: "GM_ERROR",
    message: errorMessage,
    retryable: true,
    userMessage: "Something went wrong. Please try again.",
    technicalDetails: `Unexpected error: ${errorMessage}`,
    originalError: error,
  };
}

/**
 * Log error with detailed context for debugging (REQ-F-28)
 * In production, this would integrate with a proper logging system
 */
export function logError(
  context: string,
  details: ErrorDetails,
  additionalContext?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();

  // Log structured error data
  const logData = {
    timestamp,
    context,
    errorCode: details.code,
    message: details.message,
    retryable: details.retryable,
    technicalDetails: details.technicalDetails,
    ...additionalContext,
  };

  // Log structured error data
  const errorLogger = logger.child({ component: "ErrorHandler" });

  if (details.originalError instanceof Error && details.originalError.stack) {
    errorLogger.error(
      { ...logData, stack: details.originalError.stack },
      `[ERROR] ${context}`
    );
  } else {
    errorLogger.error(logData, `[ERROR] ${context}`);
  }
}

/**
 * Create a user-facing error payload for the protocol
 */
export function createErrorPayload(details: ErrorDetails): {
  code: ErrorCode;
  message: string;
  retryable: boolean;
} {
  return {
    code: details.code,
    message: details.userMessage,
    retryable: details.retryable,
  };
}

/**
 * Check if an error is a state corruption error
 */
export function isStateCorruption(errorCode: ErrorCode): boolean {
  return errorCode === "STATE_CORRUPTED";
}

/**
 * Check if an error is retryable
 */
export function isRetryable(details: ErrorDetails): boolean {
  return details.retryable;
}
