/**
 * Integration tests for error handling in message flows.
 * Tests error display, recovery, and reconnection behavior.
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderGameView,
  screen,
  generateMessageId,
  suppressConsoleError,
  userEvent,
  type ConsoleSpy,
} from "./helpers/test-utils";

describe("Error Handling Integration", { timeout: 15000 }, () => {
  let consoleErrorSpy: ConsoleSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Error Message Display", () => {
    test("INVALID_TOKEN error displays message", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.open();
        wsController.simulateError("INVALID_TOKEN", "Invalid session token", false);
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent("Invalid session token");
    });

    test("ADVENTURE_NOT_FOUND error displays message", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.open();
        wsController.simulateError("ADVENTURE_NOT_FOUND", "Adventure not found", false);
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent("Adventure not found");
    });

    test("RATE_LIMIT error displays with retry indication", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
        wsController.simulateError("RATE_LIMIT", "Too many requests. Please try again later.", true);
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent("Too many requests");
    });

    test("GM_ERROR clears streaming state", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      const messageId = generateMessageId();

      // Start streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "Partial response..." },
        });
      });

      // Should be streaming
      expect(screen.getByPlaceholderText("Waiting for response...")).toBeDisabled();

      // Error occurs
      act(() => {
        wsController.simulateError("GM_ERROR", "An error occurred processing your request", true);
      });

      // Error displayed
      expect(screen.getByTestId("error-message")).toHaveTextContent("An error occurred");

      // Streaming should stop, input enabled
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
    });

    test("STATE_CORRUPTED error displays message", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.open();
        wsController.simulateError("STATE_CORRUPTED", "Adventure state is corrupted", false);
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent("Adventure state is corrupted");
    });

    test("PROCESSING_TIMEOUT error displays message", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "complex request{Enter}");

      act(() => {
        wsController.simulateError("PROCESSING_TIMEOUT", "Request timed out", true);
      });

      expect(screen.getByTestId("error-message")).toHaveTextContent("Request timed out");
    });
  });

  describe("Error Recovery", () => {
    test("error clears on next successful gm_response_start", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      // First request fails
      let input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "first request{Enter}");

      act(() => {
        wsController.simulateError("GM_ERROR", "Temporary error", true);
      });

      expect(screen.getByTestId("error-message")).toBeInTheDocument();

      // Second request succeeds
      input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "second request{Enter}");

      const messageId = generateMessageId();
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
      });

      // Error should be cleared
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });
  });

  describe("Connection Status", () => {
    test("WebSocket close triggers reconnecting status", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
      });

      // Connection is lost
      act(() => {
        wsController.close(1006, "Connection lost");
      });

      // Input should show reconnecting
      expect(screen.getByPlaceholderText("Reconnecting...")).toBeInTheDocument();
      vi.useRealTimers();
    });

    test("reconnect success restores connected status", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
      });

      // Connection is lost
      act(() => {
        wsController.close(1006, "Connection lost");
      });

      expect(screen.getByPlaceholderText("Reconnecting...")).toBeInTheDocument();

      // Advance time for reconnect attempt
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Simulate reconnection
      act(() => {
        wsController.simulateAuthentication();
      });

      // Should be connected again
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
      vi.useRealTimers();
    });
  });

  describe("Input State After Error", () => {
    test("input is enabled after non-retryable error", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
        wsController.simulateError("STATE_CORRUPTED", "Fatal error", false);
      });

      // Input should still be enabled (user might want to try something)
      const input = screen.getByPlaceholderText("What do you do?");
      expect(input).not.toBeDisabled();
    });

    test("input is enabled after retryable error", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
        wsController.simulateError("RATE_LIMIT", "Please wait", true);
      });

      // Input should be enabled for retry
      const input = screen.getByPlaceholderText("What do you do?");
      expect(input).not.toBeDisabled();
    });
  });
});
