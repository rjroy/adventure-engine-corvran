import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { MobileTabBar } from "../../src/components/MobileTabBar";
import { PanelProvider, usePanels } from "../../src/contexts/PanelContext";
import type { Panel } from "../../src/types/protocol";
import { renderHook, act } from "@testing-library/react";

// Helper to create wrapper for renderHook
function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <PanelProvider>{children}</PanelProvider>
  );
}

// Helper component that adds panels before rendering
function WithPanels({
  panels,
  children,
}: {
  panels: Panel[];
  children: ReactNode;
}) {
  const { addPanel } = usePanels();

  useEffect(() => {
    for (const panel of panels) {
      addPanel(panel);
    }
  }, [addPanel, panels]);

  return <>{children}</>;
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

describe("MobileTabBar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders Story and Panels tabs", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      expect(screen.getByRole("tab", { name: /story/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /panels/i })).toBeInTheDocument();
    });

    test("Story tab is selected by default", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      const storyTab = screen.getByRole("tab", { name: /story/i });
      const panelsTab = screen.getByRole("tab", { name: /panels/i });

      expect(storyTab).toHaveAttribute("aria-selected", "true");
      expect(panelsTab).toHaveAttribute("aria-selected", "false");
    });

    test("has proper tablist role", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });
  });

  describe("tab switching", () => {
    test("clicking Panels tab switches to panels view", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      const panelsTab = screen.getByRole("tab", { name: /panels/i });
      fireEvent.click(panelsTab);

      expect(panelsTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: /story/i })).toHaveAttribute(
        "aria-selected",
        "false"
      );
    });

    test("clicking Story tab switches back to story view", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      // Switch to panels first
      fireEvent.click(screen.getByRole("tab", { name: /panels/i }));

      // Switch back to story
      const storyTab = screen.getByRole("tab", { name: /story/i });
      fireEvent.click(storyTab);

      expect(storyTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("panel count badge", () => {
    test("shows no badge when no panels exist", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      // Badge should not be present
      expect(screen.queryByLabelText(/\d+ panels/)).not.toBeInTheDocument();
    });

    test("shows badge with panel count when sidebar panels exist", () => {
      const panels = [
        createTestPanel({ id: "sidebar-1", position: "sidebar" }),
        createTestPanel({ id: "sidebar-2", position: "sidebar" }),
      ];

      render(
        <PanelProvider>
          <WithPanels panels={panels}>
            <MobileTabBar />
          </WithPanels>
        </PanelProvider>
      );

      expect(screen.getByLabelText("2 panels")).toBeInTheDocument();
      expect(screen.getByLabelText("2 panels")).toHaveTextContent("2");
    });

    test("badge excludes header panels from count", () => {
      // This test verifies the logic in nonHeaderPanelCount
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "header-1", position: "header" }));
        result.current.addPanel(createTestPanel({ id: "sidebar-1", position: "sidebar" }));
      });

      expect(result.current.nonHeaderPanelCount).toBe(1);
    });
  });

  describe("accessibility", () => {
    test("tab buttons have correct tabIndex", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      // Active tab should have tabIndex 0, inactive should have -1
      expect(screen.getByRole("tab", { name: /story/i })).toHaveAttribute(
        "tabIndex",
        "0"
      );
      expect(screen.getByRole("tab", { name: /panels/i })).toHaveAttribute(
        "tabIndex",
        "-1"
      );
    });

    test("tabIndex updates when switching tabs", () => {
      render(
        <PanelProvider>
          <MobileTabBar />
        </PanelProvider>
      );

      fireEvent.click(screen.getByRole("tab", { name: /panels/i }));

      expect(screen.getByRole("tab", { name: /story/i })).toHaveAttribute(
        "tabIndex",
        "-1"
      );
      expect(screen.getByRole("tab", { name: /panels/i })).toHaveAttribute(
        "tabIndex",
        "0"
      );
    });
  });
});

describe("PanelContext mobile tab state", () => {
  describe("mobileTab", () => {
    test("initializes with 'story' tab", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mobileTab).toBe("story");
    });

    test("setMobileTab updates the active tab", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMobileTab("panels");
      });

      expect(result.current.mobileTab).toBe("panels");
    });

    test("can switch back to story tab", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMobileTab("panels");
        result.current.setMobileTab("story");
      });

      expect(result.current.mobileTab).toBe("story");
    });
  });

  describe("nonHeaderPanelCount", () => {
    test("is 0 when no panels exist", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.nonHeaderPanelCount).toBe(0);
    });

    test("counts sidebar panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "s1", position: "sidebar" }));
        result.current.addPanel(createTestPanel({ id: "s2", position: "sidebar" }));
      });

      expect(result.current.nonHeaderPanelCount).toBe(2);
    });

    test("counts overlay panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "o1", position: "overlay" }));
      });

      expect(result.current.nonHeaderPanelCount).toBe(1);
    });

    test("excludes header panels", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "h1", position: "header" }));
        result.current.addPanel(createTestPanel({ id: "h2", position: "header" }));
        result.current.addPanel(createTestPanel({ id: "s1", position: "sidebar" }));
      });

      expect(result.current.nonHeaderPanelCount).toBe(1);
    });

    test("updates when panels are removed", () => {
      const { result } = renderHook(() => usePanels(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addPanel(createTestPanel({ id: "s1", position: "sidebar" }));
        result.current.addPanel(createTestPanel({ id: "s2", position: "sidebar" }));
      });

      expect(result.current.nonHeaderPanelCount).toBe(2);

      act(() => {
        result.current.removePanel("s1");
      });

      expect(result.current.nonHeaderPanelCount).toBe(1);
    });
  });
});
