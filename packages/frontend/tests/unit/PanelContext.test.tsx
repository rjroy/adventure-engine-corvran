import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { PanelProvider, usePanels } from "../../src/contexts/PanelContext";
import type { Panel } from "../../src/types/protocol";

// Helper to create wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <PanelProvider>{children}</PanelProvider>
  );
}

// Helper to create a test panel
function createTestPanel(overrides: Partial<Panel> = {}): Panel {
  return {
    id: "test-panel",
    title: "Test Panel",
    content: "Test content",
    position: "sidebar",
    persistent: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("PanelContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("usePanels hook", () => {
    test("throws error when used outside PanelProvider", () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePanels());
      }).toThrow("usePanels must be used within a PanelProvider");

      spy.mockRestore();
    });

    test("returns panel context value", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("panels");
      expect(result.current).toHaveProperty("minimized");
      expect(result.current).toHaveProperty("addPanel");
      expect(result.current).toHaveProperty("updatePanel");
      expect(result.current).toHaveProperty("removePanel");
      expect(result.current).toHaveProperty("toggleMinimize");
      expect(result.current).toHaveProperty("isMinimized");
    });

    test("initializes with empty panels array and minimized set", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.panels).toEqual([]);
      expect(result.current.minimized.size).toBe(0);
    });
  });

  describe("addPanel", () => {
    test("adds a panel to the state", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
      });

      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0]).toEqual(panel);
    });

    test("adds multiple panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel1 = createTestPanel({ id: "weather", createdAt: "2025-01-01T00:00:00Z" });
      const panel2 = createTestPanel({ id: "ticker", createdAt: "2025-01-01T00:00:01Z" });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
      });

      expect(result.current.panels).toHaveLength(2);
    });

    test("ignores duplicate panel IDs", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel1 = createTestPanel({ id: "weather", content: "Sunny" });
      const panel2 = createTestPanel({ id: "weather", content: "Rainy" });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
      });

      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0].content).toBe("Sunny");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PanelContext] Panel with ID "weather" already exists, ignoring add'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("updatePanel", () => {
    test("updates panel content by ID", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather", content: "Sunny, 72F" });

      act(() => {
        result.current.addPanel(panel);
      });

      act(() => {
        result.current.updatePanel("weather", "Rainy, 55F");
      });

      expect(result.current.panels[0].content).toBe("Rainy, 55F");
    });

    test("preserves other panel properties on update", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({
        id: "weather",
        title: "Weather",
        position: "sidebar",
        persistent: true,
      });

      act(() => {
        result.current.addPanel(panel);
      });

      act(() => {
        result.current.updatePanel("weather", "New content");
      });

      expect(result.current.panels[0].title).toBe("Weather");
      expect(result.current.panels[0].position).toBe("sidebar");
      expect(result.current.panels[0].persistent).toBe(true);
    });

    test("warns when updating non-existent panel", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updatePanel("nonexistent", "New content");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PanelContext] Panel with ID "nonexistent" not found, ignoring update'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("removePanel", () => {
    test("removes panel by ID", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
      });

      expect(result.current.panels).toHaveLength(1);

      act(() => {
        result.current.removePanel("weather");
      });

      expect(result.current.panels).toHaveLength(0);
    });

    test("clears minimize state when panel is removed", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
        result.current.toggleMinimize("weather");
      });

      expect(result.current.isMinimized("weather")).toBe(true);

      act(() => {
        result.current.removePanel("weather");
      });

      expect(result.current.minimized.has("weather")).toBe(false);
    });

    test("warns when removing non-existent panel", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.removePanel("nonexistent");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PanelContext] Panel with ID "nonexistent" not found, ignoring remove'
      );

      consoleWarnSpy.mockRestore();
    });

    test("leaves other panels untouched when removing one", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel1 = createTestPanel({ id: "weather", createdAt: "2025-01-01T00:00:00Z" });
      const panel2 = createTestPanel({ id: "ticker", createdAt: "2025-01-01T00:00:01Z" });
      const panel3 = createTestPanel({ id: "status", createdAt: "2025-01-01T00:00:02Z" });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
        result.current.addPanel(panel3);
      });

      act(() => {
        result.current.removePanel("ticker");
      });

      expect(result.current.panels).toHaveLength(2);
      expect(result.current.panels.map((p) => p.id)).toEqual(["weather", "status"]);
    });
  });

  describe("toggleMinimize (REQ-F-18)", () => {
    test("minimizes a panel", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
      });

      expect(result.current.isMinimized("weather")).toBe(false);

      act(() => {
        result.current.toggleMinimize("weather");
      });

      expect(result.current.isMinimized("weather")).toBe(true);
      expect(result.current.minimized.has("weather")).toBe(true);
    });

    test("expands a minimized panel", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
        result.current.toggleMinimize("weather");
      });

      expect(result.current.isMinimized("weather")).toBe(true);

      act(() => {
        result.current.toggleMinimize("weather");
      });

      expect(result.current.isMinimized("weather")).toBe(false);
    });

    test("toggles minimize state correctly multiple times", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather" });

      act(() => {
        result.current.addPanel(panel);
      });

      // Toggle multiple times
      for (let i = 0; i < 5; i++) {
        const wasMinimized = result.current.isMinimized("weather");
        act(() => {
          result.current.toggleMinimize("weather");
        });
        expect(result.current.isMinimized("weather")).toBe(!wasMinimized);
      }
    });

    test("warns when toggling non-existent panel", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleMinimize("nonexistent");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[PanelContext] Panel with ID "nonexistent" not found, ignoring toggle'
      );

      consoleWarnSpy.mockRestore();
    });

    test("minimize state is independent per panel", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel1 = createTestPanel({ id: "weather", createdAt: "2025-01-01T00:00:00Z" });
      const panel2 = createTestPanel({ id: "ticker", createdAt: "2025-01-01T00:00:01Z" });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
      });

      act(() => {
        result.current.toggleMinimize("weather");
      });

      expect(result.current.isMinimized("weather")).toBe(true);
      expect(result.current.isMinimized("ticker")).toBe(false);
    });
  });

  describe("panel ordering (REQ-F-22)", () => {
    test("panels are sorted by createdAt timestamp", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      // Add panels in non-chronological order
      const panel2 = createTestPanel({
        id: "second",
        createdAt: "2025-01-01T00:00:02Z",
      });
      const panel1 = createTestPanel({
        id: "first",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const panel3 = createTestPanel({
        id: "third",
        createdAt: "2025-01-01T00:00:03Z",
      });

      act(() => {
        result.current.addPanel(panel2);
        result.current.addPanel(panel1);
        result.current.addPanel(panel3);
      });

      expect(result.current.panels.map((p) => p.id)).toEqual([
        "first",
        "second",
        "third",
      ]);
    });

    test("maintains order after update", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel1 = createTestPanel({
        id: "first",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const panel2 = createTestPanel({
        id: "second",
        createdAt: "2025-01-01T00:00:02Z",
      });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
      });

      // Update first panel - should not change order
      act(() => {
        result.current.updatePanel("first", "Updated content");
      });

      expect(result.current.panels.map((p) => p.id)).toEqual(["first", "second"]);
    });

    test("handles same timestamp panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const sameTime = "2025-01-01T00:00:00Z";
      const panel1 = createTestPanel({ id: "a", createdAt: sameTime });
      const panel2 = createTestPanel({ id: "b", createdAt: sameTime });

      act(() => {
        result.current.addPanel(panel1);
        result.current.addPanel(panel2);
      });

      // Both panels should be present (order may vary for same timestamp)
      expect(result.current.panels).toHaveLength(2);
      expect(result.current.panels.map((p) => p.id).sort()).toEqual(["a", "b"]);
    });
  });

  describe("clearAllPanels", () => {
    test("clears all panels from state", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      // Add some panels
      act(() => {
        result.current.addPanel(createTestPanel({ id: "a", createdAt: "2025-01-01T00:00:00Z" }));
        result.current.addPanel(createTestPanel({ id: "b", createdAt: "2025-01-01T00:00:01Z" }));
        result.current.addPanel(createTestPanel({ id: "c", createdAt: "2025-01-01T00:00:02Z" }));
      });

      expect(result.current.panels).toHaveLength(3);

      act(() => {
        result.current.clearAllPanels();
      });

      expect(result.current.panels).toHaveLength(0);
    });

    test("clears minimize state when clearing all panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      // Add panels and minimize some
      act(() => {
        result.current.addPanel(createTestPanel({ id: "a", createdAt: "2025-01-01T00:00:00Z" }));
        result.current.addPanel(createTestPanel({ id: "b", createdAt: "2025-01-01T00:00:01Z" }));
        result.current.toggleMinimize("a");
        result.current.toggleMinimize("b");
      });

      expect(result.current.minimized.size).toBe(2);

      act(() => {
        result.current.clearAllPanels();
      });

      expect(result.current.minimized.size).toBe(0);
    });

    test("clears position overrides when clearing all panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      // Add overlay panel and set position
      act(() => {
        result.current.addPanel(createTestPanel({
          id: "overlay-panel",
          position: "overlay",
          createdAt: "2025-01-01T00:00:00Z",
        }));
        result.current.updatePanelPosition("overlay-panel", 100, 200);
      });

      expect(result.current.getPanelPosition("overlay-panel")).toEqual({ x: 100, y: 200 });

      act(() => {
        result.current.clearAllPanels();
      });

      expect(result.current.getPanelPosition("overlay-panel")).toBeUndefined();
    });

    test("works when already empty", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.panels).toHaveLength(0);

      act(() => {
        result.current.clearAllPanels();
      });

      expect(result.current.panels).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    test("handles rapid add/remove sequences", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "a", createdAt: "2025-01-01T00:00:00Z" }));
        result.current.addPanel(createTestPanel({ id: "b", createdAt: "2025-01-01T00:00:01Z" }));
        result.current.removePanel("a");
        result.current.addPanel(createTestPanel({ id: "c", createdAt: "2025-01-01T00:00:02Z" }));
        result.current.removePanel("b");
      });

      expect(result.current.panels.map((p) => p.id)).toEqual(["c"]);
    });

    test("handles empty content update", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const panel = createTestPanel({ id: "weather", content: "Sunny" });

      act(() => {
        result.current.addPanel(panel);
      });

      act(() => {
        result.current.updatePanel("weather", "");
      });

      expect(result.current.panels[0].content).toBe("");
    });

    test("panel positions are preserved", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const sidebarPanel = createTestPanel({
        id: "sidebar-panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const headerPanel = createTestPanel({
        id: "header-panel",
        position: "header",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const overlayPanel = createTestPanel({
        id: "overlay-panel",
        position: "overlay",
        x: 50,
        y: 50,
        createdAt: "2025-01-01T00:00:02Z",
      });

      act(() => {
        result.current.addPanel(sidebarPanel);
        result.current.addPanel(headerPanel);
        result.current.addPanel(overlayPanel);
      });

      expect(result.current.panels.find((p) => p.id === "sidebar-panel")?.position).toBe("sidebar");
      expect(result.current.panels.find((p) => p.id === "header-panel")?.position).toBe("header");
      expect(result.current.panels.find((p) => p.id === "overlay-panel")?.position).toBe("overlay");
      expect(result.current.panels.find((p) => p.id === "overlay-panel")?.x).toBe(50);
      expect(result.current.panels.find((p) => p.id === "overlay-panel")?.y).toBe(50);
    });

    test("persistent flag is preserved", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      const persistentPanel = createTestPanel({
        id: "persistent",
        persistent: true,
      });
      const nonPersistentPanel = createTestPanel({
        id: "non-persistent",
        persistent: false,
      });

      act(() => {
        result.current.addPanel(persistentPanel);
        result.current.addPanel(nonPersistentPanel);
      });

      expect(result.current.panels.find((p) => p.id === "persistent")?.persistent).toBe(true);
      expect(result.current.panels.find((p) => p.id === "non-persistent")?.persistent).toBe(false);
    });
  });
});
