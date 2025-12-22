// Error Handler Module
// Centralized error mapping and logging for the Adventure Engine
// Implements REQ-F-25 (user-friendly errors) and REQ-F-28 (detailed logging)

import type { SDKAssistantMessageError } from "@anthropic-ai/claude-agent-sdk";
import type { ErrorCode } from "./types/protocol";
import { logger } from "./logger";

/**
 * Error thrown when input processing exceeds the configured timeout
 */
export class ProcessingTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Input processing timed out after ${timeoutMs}ms`);
    this.name = "ProcessingTimeoutError";
  }
}

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
 * @param sdkErrorCode The SDK error code
 * @param messageContent Optional error message content from Claude (for "unknown" errors)
 */
export function mapSDKError(
  sdkErrorCode: SDKAssistantMessageError,
  messageContent?: string
): ErrorDetails {
  const errorMap: Record<
    SDKAssistantMessageError,
    Omit<ErrorDetails, "originalError">
  > = {
    rate_limit: {
      code: "RATE_LIMIT",
      message: "Rate limit exceeded",
      retryable: false,
      userMessage: "The game master is busy. Please try again later.",
      technicalDetails: "Claude API rate limit exceeded",
    },
    server_error: {
      code: "GM_ERROR",
      message: "AI service overloaded",
      retryable: false,
      userMessage: "The game master is thinking deeply. Please wait.",
      technicalDetails: "Claude API server error (500-level)",
    },
    authentication_failed: {
      code: "AUTH_ERROR",
      message: "Authentication failed",
      retryable: false,
      userMessage: "Something went wrong. Please try again.",
      technicalDetails: "Claude API authentication failed - check API key",
    },
    billing_error: {
      code: "AUTH_ERROR",
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
      technicalDetails: messageContent
        ? `Claude API error: ${messageContent}`
        : "Unknown error from Claude API",
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
 * Create error details for processing timeout errors
 */
export function mapProcessingTimeoutError(error: ProcessingTimeoutError): ErrorDetails {
  return {
    code: "PROCESSING_TIMEOUT",
    message: error.message,
    retryable: true,
    userMessage: "The game master is taking longer than expected. Your response may still arrive shortly.",
    technicalDetails: `Input processing timed out after ${error.timeoutMs}ms`,
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
  technicalDetails?: string;
} {
  return {
    code: details.code,
    message: details.userMessage,
    retryable: details.retryable,
    technicalDetails: details.technicalDetails,
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

/**
 * Check if an SDK error indicates a session recovery is needed.
 * Session recovery is triggered when the Claude Agent SDK rejects
 * a resume session ID as invalid or expired.
 * @param sdkErrorCode The SDK error code (if available)
 * @param errorMessage Optional error message to check for session-related keywords
 * @returns true if session recovery should be attempted
 */
export function isSessionRecoveryNeeded(
  sdkErrorCode: SDKAssistantMessageError | undefined,
  errorMessage?: string
): boolean {
  // invalid_request often indicates session ID issues when resume is used
  if (sdkErrorCode === "invalid_request") {
    return true;
  }

  // Check error message content for session-related keywords
  if (errorMessage) {
    const msg = errorMessage.toLowerCase();
    return (
      msg.includes("session not found") ||
      msg.includes("invalid session") ||
      msg.includes("session expired") ||
      msg.includes("conversation not found") ||
      msg.includes("resume failed") ||
      msg.includes("no conversation") ||
      // SDK process crashes when resume session ID is invalid
      msg.includes("process exited with code")
    );
  }

  return false;
}
