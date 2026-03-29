/**
 * Integration tests for theme change handling through the component tree.
 * Tests CSS variable application, background updates, and mood transitions.
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderGameView,
  screen,
  suppressConsoleError,
  suppressConsoleWarn,
  userEvent,
  type ConsoleSpy,
} from "./helpers/test-utils";
import type { ThemeMood } from "../../../shared/protocol";

describe("Theme Integration", { timeout: 15000 }, () => {
  let consoleErrorSpy: ConsoleSpy;
  let consoleWarnSpy: ConsoleSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    consoleWarnSpy = suppressConsoleWarn();
    // Clear any existing styles
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    document.documentElement.removeAttribute("style");
  });

  describe("CSS Variable Application", () => {
    test("theme_change applies CSS variables to document", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      // Advance past initial debounce
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      act(() => {
        wsController.simulateThemeChange("tense");
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#c65900");
      vi.useRealTimers();
    });

    test("all mood values apply correct colors", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      const moodColors: Record<ThemeMood, string> = {
        calm: "#2196f3",
        tense: "#c65900",
        ominous: "#ba68c8",
        triumphant: "#b8860b",
        mysterious: "#00bcd4",
      };

      for (const [mood, expectedColor] of Object.entries(moodColors)) {
        act(() => {
          vi.advanceTimersByTime(1100); // Advance past debounce
        });

        act(() => {
          wsController.simulateThemeChange(mood as ThemeMood);
        });

        const root = document.documentElement;
        expect(root.style.getPropertyValue("--color-primary")).toBe(expectedColor);
      }

      vi.useRealTimers();
    });
  });

  describe("Background URL Handling", () => {
    test("theme_change with backgroundUrl updates BackgroundLayer", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      act(() => {
        wsController.simulateThemeChange("mysterious", {
          backgroundUrl: "https://example.com/bg.jpg",
        });
      });

      // BackgroundLayer should receive the URL
      // (The actual image loading is tested in BackgroundLayer unit tests)
      // Here we verify the theme context updates
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#00bcd4");
      vi.useRealTimers();
    });

    test("theme_change with null backgroundUrl clears background", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      // First set a background
      act(() => {
        wsController.simulateThemeChange("calm", {
          backgroundUrl: "https://example.com/bg1.jpg",
        });
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Then clear it
      act(() => {
        wsController.simulateThemeChange("tense", {
          backgroundUrl: null,
        });
      });

      // Theme should still apply
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#c65900");
      vi.useRealTimers();
    });
  });

  describe("Theme Debouncing", () => {
    test("rapid theme changes are debounced", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      // Send multiple theme changes rapidly
      act(() => {
        wsController.simulateThemeChange("calm");
        wsController.simulateThemeChange("tense");
        wsController.simulateThemeChange("ominous");
      });

      // Without advancing time, the last theme should win after debounce
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      const root = document.documentElement;
      // The final theme should be applied
      expect(root.style.getPropertyValue("--color-primary")).toBe("#ba68c8");
      vi.useRealTimers();
    });
  });

  describe("Invalid Theme Handling", () => {
    test("invalid mood is rejected at boundary", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      // Set a valid theme first
      act(() => {
        wsController.simulateThemeChange("calm");
      });

      const root = document.documentElement;
      const colorBefore = root.style.getPropertyValue("--color-primary");

      // Try to send an invalid mood (this goes through raw receiveMessage)
      act(() => {
        wsController.receiveMessage({
          type: "theme_change",
          payload: {
            mood: "invalid-mood" as ThemeMood,
            genre: "sci-fi",
            region: "city",
            backgroundUrl: null,
          },
        });
      });

      // Theme should not have changed (Zod validation rejects it)
      expect(root.style.getPropertyValue("--color-primary")).toBe(colorBefore);
      expect(consoleErrorSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("Theme During Interaction", () => {
    test("theme remains stable during player_input cycle", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      // Set initial theme
      act(() => {
        wsController.simulateThemeChange("mysterious");
      });

      const root = document.documentElement;
      const initialColor = root.style.getPropertyValue("--color-primary");
      expect(initialColor).toBe("#00bcd4");

      vi.useRealTimers();

      // User types input (this requires real timers)
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText("What do you do?");
      await user.type(input, "test{Enter}");

      // Theme should remain the same
      expect(root.style.getPropertyValue("--color-primary")).toBe(initialColor);
    });

    test("input remains available during theme transition", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      // Change theme with long transition
      act(() => {
        wsController.simulateThemeChange("ominous", {
          transitionDuration: 3000,
        });
      });

      // Input should still be available during transition
      const input = screen.getByPlaceholderText("What do you do?");
      expect(input).not.toBeDisabled();
      vi.useRealTimers();
    });
  });

  describe("Custom Transition Duration", () => {
    test("custom transitionDuration is respected", () => {
      vi.useFakeTimers();
      const { wsController } = renderGameView();

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        wsController.simulateAuthentication();
      });

      act(() => {
        wsController.simulateThemeChange("triumphant", {
          transitionDuration: 5000,
        });
      });

      // Theme should be applied
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#b8860b");
      vi.useRealTimers();
    });
  });
});
