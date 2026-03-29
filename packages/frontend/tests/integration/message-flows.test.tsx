/**
 * Integration tests for core WebSocket message flows.
 * Tests the complete message lifecycle through the GameView component.
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderGameView,
  screen,
  createMockEntry,
  createMockSummary,
  generateMessageId,
  suppressConsoleError,
  userEvent,
  type ConsoleSpy,
} from "./helpers/test-utils";

// Increase timeout for integration tests that use userEvent
// (typing simulation takes time)
describe("Message Flows Integration", { timeout: 15000 }, () => {
  let consoleErrorSpy: ConsoleSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Connection and Authentication", () => {
    test("sends authenticate and start_adventure on connection", () => {
      const { wsController } = renderGameView();

      // WebSocket should be created
      expect(wsController.getInstance()).not.toBeNull();

      // Simulate connection opening
      act(() => {
        wsController.open();
      });

      const messages = wsController.getSentMessages();

      // Should send authenticate with adventureId (new format for Safari compatibility)
      expect(messages[0]).toEqual({
        type: "authenticate",
        payload: { token: "test-session-token", adventureId: "test-adventure-id" },
      });
    });

    test("displays empty state before adventure loaded", () => {
      renderGameView();

      // Should show the placeholder text
      expect(screen.getByText(/no narrative entries yet/i)).toBeInTheDocument();
    });

    test("displays history after adventure_loaded message", () => {
      const { wsController } = renderGameView();
      const history = [
        createMockEntry("player_input", "Hello, world!"),
        createMockEntry("gm_response", "Welcome to the adventure."),
      ];

      act(() => {
        wsController.simulateAuthentication({ history });
      });

      // History should be displayed
      expect(screen.getByText("Hello, world!")).toBeInTheDocument();
      expect(screen.getByText("Welcome to the adventure.")).toBeInTheDocument();
    });

    test("displays history summary when provided", () => {
      const { wsController } = renderGameView();
      const summary = createMockSummary("Previously on your adventure: You found a mysterious key.");

      act(() => {
        wsController.simulateAuthentication({ summary });
      });

      // Summary should be displayed
      expect(screen.getByText(/Previously on your adventure/)).toBeInTheDocument();
    });

    test("status becomes connected after WebSocket opens", () => {
      const { wsController } = renderGameView();

      // Initially should show disconnected state (input disabled)
      const inputBefore = screen.getByPlaceholderText("Reconnecting...");
      expect(inputBefore).toBeDisabled();

      act(() => {
        wsController.simulateAuthentication();
      });

      // After connected, input should be enabled
      const inputAfter = screen.getByPlaceholderText("What do you do?");
      expect(inputAfter).not.toBeDisabled();
    });
  });

  describe("Player Input Flow", () => {
    test("player input appears immediately in narrative", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      // Type and submit input
      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "look around{Enter}");

      // Player input should appear immediately
      expect(screen.getByText("look around")).toBeInTheDocument();
    });

    test("sends player_input message with correct payload", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      wsController.clearSentMessages();

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "examine the door{Enter}");

      const messages = wsController.getSentMessages();
      expect(messages).toContainEqual({
        type: "player_input",
        payload: { text: "examine the door" },
      });
    });

    test("clears input field after submission", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test input{Enter}");

      expect(input).toHaveValue("");
    });
  });

  describe("GM Response Streaming", () => {
    test("gm_response_start enables streaming indicator", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "look around{Enter}");

      // Start streaming response
      const messageId = generateMessageId();
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
      });

      // Input should show "Waiting for response..."
      expect(screen.getByPlaceholderText("Waiting for response...")).toBeInTheDocument();
    });

    test("gm_response_chunks accumulate content", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "look around{Enter}");

      const messageId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
      });

      // Send first chunk
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "You see a " },
        });
      });

      expect(screen.getByText("You see a")).toBeInTheDocument();

      // Send second chunk
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "dark forest." },
        });
      });

      expect(screen.getByText("You see a dark forest.")).toBeInTheDocument();
    });

    test("gm_response_end finalizes entry and enables input", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "look around{Enter}");

      const messageId = generateMessageId();

      // Complete streaming sequence
      act(() => {
        wsController.simulatePlayerResponse(messageId, ["The room is dark and quiet."]);
      });

      // Response should be in the narrative
      expect(screen.getByText("The room is dark and quiet.")).toBeInTheDocument();

      // Input should be enabled again
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
    });

    test("full input→response cycle works end-to-end", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      // Player submits input
      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "open the chest{Enter}");

      // Server responds with streaming message
      const messageId = generateMessageId();
      act(() => {
        wsController.simulatePlayerResponse(messageId, [
          "You open the chest and find ",
          "a shimmering golden key.",
        ]);
      });

      // Both player input and GM response should be visible
      expect(screen.getByText("open the chest")).toBeInTheDocument();
      expect(screen.getByText("You open the chest and find a shimmering golden key.")).toBeInTheDocument();
    });

    test("multiple exchanges maintain correct order", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      // First exchange
      let input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "first command{Enter}");

      act(() => {
        wsController.simulatePlayerResponse(generateMessageId(), ["First response."]);
      });

      // Second exchange
      input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "second command{Enter}");

      act(() => {
        wsController.simulatePlayerResponse(generateMessageId(), ["Second response."]);
      });

      // Third exchange
      input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "third command{Enter}");

      act(() => {
        wsController.simulatePlayerResponse(generateMessageId(), ["Third response."]);
      });

      // All entries should be visible
      const log = screen.getByTestId("narrative-log");
      expect(log.textContent).toContain("first command");
      expect(log.textContent).toContain("First response.");
      expect(log.textContent).toContain("second command");
      expect(log.textContent).toContain("Second response.");
      expect(log.textContent).toContain("third command");
      expect(log.textContent).toContain("Third response.");
    });
  });

  describe("Heartbeat", () => {
    test("sends ping every 30 seconds", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
      });

      wsController.clearSentMessages();

      // Advance 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const messages = wsController.getSentMessages();
      expect(messages).toContainEqual({ type: "ping" });
      vi.useRealTimers();
    });

    test("handles pong response without errors", () => {
      const { wsController } = renderGameView();

      act(() => {
        wsController.simulateAuthentication();
      });

      // Send pong (should not cause any issues)
      act(() => {
        wsController.simulatePong();
      });

      // No errors should be logged
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    test("mismatched messageId is ignored", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      const correctId = generateMessageId();
      const wrongId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId: correctId },
        });
      });

      // Send chunk with wrong ID
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId: wrongId, text: "This should be ignored" },
        });
      });

      // Send chunk with correct ID
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId: correctId, text: "Correct content" },
        });
      });

      // Only correct content should be visible
      expect(screen.getByText("Correct content")).toBeInTheDocument();
      expect(screen.queryByText("This should be ignored")).not.toBeInTheDocument();
    });

    test("duplicate gm_response_end does not create duplicate entry", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      const messageId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "Response content" },
        });
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // Send duplicate end
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // Should only have one GM response entry
      const responses = screen.getAllByText("Response content");
      expect(responses).toHaveLength(1);
    });

    test("empty chunk does not crash", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      const messageId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "" },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "Content after empty" },
        });
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      expect(screen.getByText("Content after empty")).toBeInTheDocument();
    });

    test("large response renders correctly", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "tell me a long story{Enter}");

      const messageId = generateMessageId();
      const largeContent = "A".repeat(10000); // 10KB of content

      act(() => {
        wsController.simulatePlayerResponse(messageId, [largeContent]);
      });

      // Should contain the large content
      const log = screen.getByTestId("narrative-log");
      expect(log.textContent).toContain(largeContent);
    });
  });
});
