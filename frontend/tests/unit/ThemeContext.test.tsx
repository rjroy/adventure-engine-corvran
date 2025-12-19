import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";
import type { ThemeMood } from "../../src/types/protocol";

// Helper to create wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    // Clear any existing styles
    document.documentElement.removeAttribute("style");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("ThemeProvider", () => {
    test("initializes with calm theme synchronously", () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      // Check that CSS variables are set for calm theme
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#2196f3");
      expect(root.style.getPropertyValue("--color-background")).toBe("#ffffff");
      expect(root.style.getPropertyValue("--font-family")).toContain(
        "system-ui"
      );
    });

    test("renders children correctly", () => {
      const { getByText } = render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      expect(getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("useTheme hook", () => {
    test("throws error when used outside ThemeProvider", () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      spy.mockRestore();
    });

    test("returns theme context value", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("currentMood");
      expect(result.current).toHaveProperty("isTransitioning");
      expect(result.current).toHaveProperty("backgroundUrl");
      expect(result.current).toHaveProperty("applyTheme");
      expect(result.current).toHaveProperty("resetToDefault");
    });

    test("initializes with calm mood", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentMood).toBe("calm");
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.backgroundUrl).toBe("/backgrounds/corvran-engine-background.webp");
    });
  });

  describe("applyTheme", () => {
    test("applies theme immediately when called after debounce period", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Fast-forward past debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Apply tense theme
      act(() => {
        result.current.applyTheme({ mood: "tense" });
      });

      expect(result.current.currentMood).toBe("tense");
      expect(result.current.isTransitioning).toBe(true);

      // Check CSS variables updated
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#c65900");
      expect(root.style.getPropertyValue("--color-background")).toBe("#fff8e1");
    });

    test("applies background URL when provided", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({
          mood: "ominous",
          backgroundUrl: "https://example.com/bg.jpg",
        });
      });

      expect(result.current.backgroundUrl).toBe("https://example.com/bg.jpg");
    });

    test("debounces rapid theme changes", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Fast-forward past initial debounce period
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Apply multiple themes rapidly
      act(() => {
        result.current.applyTheme({ mood: "tense" });
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.applyTheme({ mood: "ominous" });
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.applyTheme({ mood: "mysterious" });
      });

      // Before debounce completes, should still be on calm (or first applied)
      // After debounce, should be on mysterious
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.currentMood).toBe("mysterious");

      // Check CSS variables for mysterious theme
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#00bcd4");
      expect(root.style.getPropertyValue("--color-background")).toBe("#0a0e1a");
    });

    test("clears isTransitioning flag after transition duration", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "triumphant" });
      });

      expect(result.current.isTransitioning).toBe(true);

      // Advance by default transition duration (1500ms)
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    test("respects custom transition duration", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({
          mood: "tense",
          transitionDuration: 3000,
        });
      });

      expect(result.current.isTransitioning).toBe(true);

      // Advance by half the duration
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Should still be transitioning
      expect(result.current.isTransitioning).toBe(true);

      // Advance to complete the transition
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    test("applies all theme properties (colors, fonts, accents)", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "ominous" });
      });

      const root = document.documentElement;

      // Check colors
      expect(root.style.getPropertyValue("--color-primary")).toBe("#ba68c8");
      expect(root.style.getPropertyValue("--color-text")).toBe("#e0e0e0");

      // Check font
      expect(root.style.getPropertyValue("--font-family")).toContain(
        "Garamond"
      );

      // Check accents
      expect(root.style.getPropertyValue("--accent-border-style")).toBe(
        "solid"
      );
      expect(root.style.getPropertyValue("--accent-shadow")).toContain(
        "rgba(186, 104, 200, 0.4)"
      );
    });

    test("handles mysterious theme with dashed border style", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "mysterious" });
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--accent-border-style")).toBe(
        "dashed"
      );
    });

    test("warns for invalid mood", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({
          mood: "invalid-mood" as ThemeMood,
        });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Theme not found for mood: invalid-mood"
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("resetToDefault", () => {
    test("resets to calm theme", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Apply a different theme first
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "ominous" });
      });

      expect(result.current.currentMood).toBe("ominous");

      // Reset to default
      act(() => {
        result.current.resetToDefault();
      });

      expect(result.current.currentMood).toBe("calm");

      // Check CSS variables
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--color-primary")).toBe("#2196f3");
      expect(root.style.getPropertyValue("--color-background")).toBe("#ffffff");
    });

    test("clears background URL on reset", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({
          mood: "tense",
          backgroundUrl: "https://example.com/bg.jpg",
        });
      });

      expect(result.current.backgroundUrl).toBe("https://example.com/bg.jpg");

      act(() => {
        result.current.resetToDefault();
      });

      expect(result.current.backgroundUrl).toBe("/backgrounds/corvran-engine-background.webp");
    });

    test("cancels pending debounced theme changes", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Apply a theme
      act(() => {
        result.current.applyTheme({ mood: "tense" });
      });

      // Quickly apply another theme (will be debounced)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.applyTheme({ mood: "ominous" });
      });

      // Reset before debounce completes
      act(() => {
        result.current.resetToDefault();
      });

      // Advance past debounce period
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should still be on calm (reset), not ominous
      expect(result.current.currentMood).toBe("calm");
    });
  });

  describe("CSS variable updates", () => {
    test("updates all color variables", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "triumphant" });
      });

      const root = document.documentElement;
      const expectedColors = {
        "--color-primary": "#b8860b",
        "--color-secondary": "#cc7000",
        "--color-background": "#fffef7",
        "--color-surface": "#fff9e6",
        "--color-surface-alt": "#fff3cc",
        "--color-border": "#b8860b",
        "--color-text": "#1a1300",
        "--color-text-secondary": "#4a3800",
        "--color-text-muted": "#6b5200",
        "--color-player-bg": "#fff9e6",
        "--color-player-border": "#b8860b",
        "--color-gm-bg": "#fffef7",
        "--color-gm-border": "#cc7000",
        "--color-error": "#b71c1c",
        "--color-error-bg": "#ffebee",
      };

      for (const [variable, value] of Object.entries(expectedColors)) {
        expect(root.style.getPropertyValue(variable)).toBe(value);
      }
    });
  });

  describe("edge cases", () => {
    test("handles rapid apply/reset sequences", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "tense" });
        result.current.resetToDefault();
        result.current.applyTheme({ mood: "ominous" });
        result.current.resetToDefault();
      });

      expect(result.current.currentMood).toBe("calm");
    });

    test("cleans up debounce timer on unmount", () => {
      const { result, unmount } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      act(() => {
        result.current.applyTheme({ mood: "tense" });
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.applyTheme({ mood: "ominous" });
      });

      // Unmount before debounce completes
      unmount();

      // This should not throw
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    });
  });
});
