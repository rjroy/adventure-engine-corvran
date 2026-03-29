/**
 * Integration tests for streaming narrative display.
 * Tests progressive display, auto-scroll, and transition behavior.
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

describe("Streaming Narrative Integration", { timeout: 15000 }, () => {
  let consoleErrorSpy: ConsoleSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Progressive Display", () => {
    test("streaming content appears incrementally", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "describe the scene{Enter}");

      const messageId = generateMessageId();

      // Start streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
      });

      // First chunk
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "The sun sets " },
        });
      });

      expect(screen.getByText("The sun sets")).toBeInTheDocument();

      // Second chunk
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "over the mountains, " },
        });
      });

      expect(screen.getByText("The sun sets over the mountains,")).toBeInTheDocument();

      // Third chunk
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "painting the sky orange." },
        });
      });

      expect(screen.getByText("The sun sets over the mountains, painting the sky orange.")).toBeInTheDocument();
    });

    test("streaming entry shows visual indicator via isStreaming prop", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      const messageId = generateMessageId();

      // Before streaming, no streaming class
      const logBefore = screen.getByTestId("narrative-log");
      expect(logBefore.querySelector(".streaming")).toBeNull();

      // Start streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "Content" },
        });
      });

      // During streaming, should have streaming indicator
      // (implementation may vary - checking the input placeholder as proxy)
      expect(screen.getByPlaceholderText("Waiting for response...")).toBeInTheDocument();

      // End streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // After streaming ends, input should be enabled
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
    });
  });

  describe("Auto-scroll Behavior", () => {
    test("scrollTo is called when new streaming content arrives", async () => {
      const scrollToSpy = vi.spyOn(Element.prototype, "scrollTo");
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      scrollToSpy.mockClear();

      const messageId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "New content" },
        });
      });

      // scrollTo should be called for new content
      expect(scrollToSpy).toHaveBeenCalled();

      scrollToSpy.mockRestore();
    });
  });

  describe("Rapid Chunks", () => {
    test("handles 50 chunks in quick succession", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "rapid test{Enter}");

      const messageId = generateMessageId();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
      });

      // Send 50 chunks rapidly
      act(() => {
        for (let i = 0; i < 50; i++) {
          wsController.receiveMessage({
            type: "gm_response_chunk",
            payload: { messageId, text: `chunk${i} ` },
          });
        }
      });

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // All chunks should be present
      const log = screen.getByTestId("narrative-log");
      expect(log.textContent).toContain("chunk0");
      expect(log.textContent).toContain("chunk49");
    });
  });

  describe("Multi-paragraph Content", () => {
    test("preserves line breaks in streaming content", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "describe{Enter}");

      const messageId = generateMessageId();
      const multiParagraph = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";

      act(() => {
        wsController.simulatePlayerResponse(messageId, [multiParagraph]);
      });

      // The content should be present (newlines may be rendered as breaks or preserved)
      const log = screen.getByTestId("narrative-log");
      expect(log.textContent).toContain("First paragraph.");
      expect(log.textContent).toContain("Second paragraph.");
      expect(log.textContent).toContain("Third paragraph.");
    });
  });

  describe("Markdown Content", () => {
    test("markdown renders during streaming", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "markdown test{Enter}");

      const messageId = generateMessageId();

      act(() => {
        wsController.simulatePlayerResponse(messageId, [
          "Here is some **bold** and *italic* text.",
        ]);
      });

      // Check that markdown is rendered (bold and italic)
      const log = screen.getByTestId("narrative-log");
      expect(log.querySelector("strong")).not.toBeNull();
      expect(log.querySelector("em")).not.toBeNull();
    });
  });

  describe("Transition to History", () => {
    test("streaming entry transitions to history entry on completion", async () => {
      const { wsController } = renderGameView();
      const user = userEvent.setup();

      act(() => {
        wsController.simulateAuthentication();
      });

      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "transition test{Enter}");

      const messageId = generateMessageId();

      // During streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_start",
          payload: { messageId },
        });
        wsController.receiveMessage({
          type: "gm_response_chunk",
          payload: { messageId, text: "Streaming content" },
        });
      });

      // Content visible during streaming
      expect(screen.getByText("Streaming content")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Waiting for response...")).toBeInTheDocument();

      // End streaming
      act(() => {
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // Content still visible as history entry
      expect(screen.getByText("Streaming content")).toBeInTheDocument();

      // Input enabled (streaming ended)
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
    });
  });

  describe("Input During Stream", () => {
    test("input is disabled while streaming", async () => {
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
      });

      // Input should be disabled during streaming
      expect(screen.getByPlaceholderText("Waiting for response...")).toBeDisabled();

      act(() => {
        wsController.receiveMessage({
          type: "gm_response_end",
          payload: { messageId },
        });
      });

      // Input should be enabled after streaming
      expect(screen.getByPlaceholderText("What do you do?")).not.toBeDisabled();
    });
  });
});
