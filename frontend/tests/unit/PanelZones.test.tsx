import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import {
  SidebarPanelZone,
  HeaderPanelZone,
  OverlayPanelContainer,
} from "../../src/components/PanelZones";
import { PanelProvider, usePanels } from "../../src/contexts/PanelContext";
import type { Panel } from "../../src/types/protocol";

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

// Helper component that adds panels to context before rendering
function PanelSetup({
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

// Helper to render with providers and panel setup
function renderWithPanels(panels: Panel[], ui: ReactNode) {
  return render(
    <PanelProvider>
      <PanelSetup panels={panels}>{ui}</PanelSetup>
    </PanelProvider>
  );
}

describe("SidebarPanelZone", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders nothing when no sidebar panels exist", () => {
      renderWithPanels([], <SidebarPanelZone />);

      expect(screen.queryByTestId("panel-zone-sidebar")).not.toBeInTheDocument();
    });

    test("renders sidebar zone when sidebar panels exist", () => {
      const panel = createTestPanel({ id: "weather", position: "sidebar" });
      renderWithPanels([panel], <SidebarPanelZone />);

      expect(screen.getByTestId("panel-zone-sidebar")).toBeInTheDocument();
    });

    test("renders only sidebar panels", () => {
      const sidebarPanel = createTestPanel({
        id: "sidebar-panel",
        title: "Sidebar Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const headerPanel = createTestPanel({
        id: "header-panel",
        title: "Header Panel",
        position: "header",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const overlayPanel = createTestPanel({
        id: "overlay-panel",
        title: "Overlay Panel",
        position: "overlay",
        createdAt: "2025-01-01T00:00:02Z",
      });

      renderWithPanels(
        [sidebarPanel, headerPanel, overlayPanel],
        <SidebarPanelZone />
      );

      expect(screen.getByText("Sidebar Panel")).toBeInTheDocument();
      expect(screen.queryByText("Header Panel")).not.toBeInTheDocument();
      expect(screen.queryByText("Overlay Panel")).not.toBeInTheDocument();
    });

    test("renders multiple sidebar panels in creation order", () => {
      const panel1 = createTestPanel({
        id: "first",
        title: "First Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const panel2 = createTestPanel({
        id: "second",
        title: "Second Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const panel3 = createTestPanel({
        id: "third",
        title: "Third Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:02Z",
      });

      // Add in non-chronological order
      renderWithPanels([panel2, panel3, panel1], <SidebarPanelZone />);

      const sidebarZone = screen.getByTestId("panel-zone-sidebar");
      const panels = sidebarZone.querySelectorAll("[data-panel-id]");

      expect(panels).toHaveLength(3);
      expect(panels[0]).toHaveAttribute("data-panel-id", "first");
      expect(panels[1]).toHaveAttribute("data-panel-id", "second");
      expect(panels[2]).toHaveAttribute("data-panel-id", "third");
    });
  });

  describe("accessibility", () => {
    test("has aria-label for screen readers", () => {
      const panel = createTestPanel({ id: "weather", position: "sidebar" });
      renderWithPanels([panel], <SidebarPanelZone />);

      expect(screen.getByTestId("panel-zone-sidebar")).toHaveAttribute(
        "aria-label",
        "Sidebar panels"
      );
    });

    test("uses aside element for semantic meaning", () => {
      const panel = createTestPanel({ id: "weather", position: "sidebar" });
      renderWithPanels([panel], <SidebarPanelZone />);

      const zone = screen.getByTestId("panel-zone-sidebar");
      expect(zone.tagName).toBe("ASIDE");
    });
  });
});

describe("HeaderPanelZone", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders nothing when no header panels exist", () => {
      renderWithPanels([], <HeaderPanelZone />);

      expect(screen.queryByTestId("panel-zone-header")).not.toBeInTheDocument();
    });

    test("renders header zone when header panels exist", () => {
      const panel = createTestPanel({ id: "ticker", position: "header" });
      renderWithPanels([panel], <HeaderPanelZone />);

      expect(screen.getByTestId("panel-zone-header")).toBeInTheDocument();
    });

    test("renders only header panels", () => {
      const sidebarPanel = createTestPanel({
        id: "sidebar-panel",
        title: "Sidebar Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const headerPanel = createTestPanel({
        id: "header-panel",
        title: "Header Panel",
        position: "header",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const overlayPanel = createTestPanel({
        id: "overlay-panel",
        title: "Overlay Panel",
        position: "overlay",
        createdAt: "2025-01-01T00:00:02Z",
      });

      renderWithPanels(
        [sidebarPanel, headerPanel, overlayPanel],
        <HeaderPanelZone />
      );

      expect(screen.getByText("Header Panel")).toBeInTheDocument();
      expect(screen.queryByText("Sidebar Panel")).not.toBeInTheDocument();
      expect(screen.queryByText("Overlay Panel")).not.toBeInTheDocument();
    });

    test("renders multiple header panels in creation order", () => {
      const panel1 = createTestPanel({
        id: "first",
        title: "First Ticker",
        position: "header",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const panel2 = createTestPanel({
        id: "second",
        title: "Second Ticker",
        position: "header",
        createdAt: "2025-01-01T00:00:01Z",
      });

      renderWithPanels([panel2, panel1], <HeaderPanelZone />);

      const headerZone = screen.getByTestId("panel-zone-header");
      const panels = headerZone.querySelectorAll("[data-panel-id]");

      expect(panels).toHaveLength(2);
      expect(panels[0]).toHaveAttribute("data-panel-id", "first");
      expect(panels[1]).toHaveAttribute("data-panel-id", "second");
    });
  });

  describe("accessibility", () => {
    test("has aria-label for screen readers", () => {
      const panel = createTestPanel({ id: "ticker", position: "header" });
      renderWithPanels([panel], <HeaderPanelZone />);

      expect(screen.getByTestId("panel-zone-header")).toHaveAttribute(
        "aria-label",
        "Header panels"
      );
    });

    test("uses section element for semantic meaning", () => {
      const panel = createTestPanel({ id: "ticker", position: "header" });
      renderWithPanels([panel], <HeaderPanelZone />);

      const zone = screen.getByTestId("panel-zone-header");
      expect(zone.tagName).toBe("SECTION");
    });
  });
});

describe("OverlayPanelContainer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders nothing when no overlay panels exist", () => {
      renderWithPanels([], <OverlayPanelContainer />);

      expect(screen.queryByTestId("panel-zone-overlay")).not.toBeInTheDocument();
    });

    test("renders overlay zone when overlay panels exist", () => {
      const panel = createTestPanel({ id: "popup", position: "overlay" });
      renderWithPanels([panel], <OverlayPanelContainer />);

      expect(screen.getByTestId("panel-zone-overlay")).toBeInTheDocument();
    });

    test("renders only overlay panels", () => {
      const sidebarPanel = createTestPanel({
        id: "sidebar-panel",
        title: "Sidebar Panel",
        position: "sidebar",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const headerPanel = createTestPanel({
        id: "header-panel",
        title: "Header Panel",
        position: "header",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const overlayPanel = createTestPanel({
        id: "overlay-panel",
        title: "Overlay Panel",
        position: "overlay",
        createdAt: "2025-01-01T00:00:02Z",
      });

      renderWithPanels(
        [sidebarPanel, headerPanel, overlayPanel],
        <OverlayPanelContainer />
      );

      expect(screen.getByText("Overlay Panel")).toBeInTheDocument();
      expect(screen.queryByText("Sidebar Panel")).not.toBeInTheDocument();
      expect(screen.queryByText("Header Panel")).not.toBeInTheDocument();
    });
  });

  describe("positioning (TD-8)", () => {
    test("uses default position (50%, 50%) when x/y not specified", () => {
      const panel = createTestPanel({
        id: "popup",
        position: "overlay",
      });
      renderWithPanels([panel], <OverlayPanelContainer />);

      const overlayZone = screen.getByTestId("panel-zone-overlay");
      const overlayItem = overlayZone.querySelector(".panel-zone__overlay-item");

      expect(overlayItem).toHaveStyle({ left: "50%", top: "50%" });
    });

    test("uses custom x/y position when specified", () => {
      const panel = createTestPanel({
        id: "popup",
        position: "overlay",
        x: 25,
        y: 75,
      });
      renderWithPanels([panel], <OverlayPanelContainer />);

      const overlayZone = screen.getByTestId("panel-zone-overlay");
      const overlayItem = overlayZone.querySelector(".panel-zone__overlay-item");

      expect(overlayItem).toHaveStyle({ left: "25%", top: "75%" });
    });

    test("uses position at screen corners", () => {
      const topLeftPanel = createTestPanel({
        id: "top-left",
        position: "overlay",
        x: 0,
        y: 0,
        createdAt: "2025-01-01T00:00:00Z",
      });
      const bottomRightPanel = createTestPanel({
        id: "bottom-right",
        position: "overlay",
        x: 100,
        y: 100,
        createdAt: "2025-01-01T00:00:01Z",
      });

      renderWithPanels(
        [topLeftPanel, bottomRightPanel],
        <OverlayPanelContainer />
      );

      const overlayZone = screen.getByTestId("panel-zone-overlay");
      const overlayItems = overlayZone.querySelectorAll(
        ".panel-zone__overlay-item"
      );

      expect(overlayItems[0]).toHaveStyle({ left: "0%", top: "0%" });
      expect(overlayItems[1]).toHaveStyle({ left: "100%", top: "100%" });
    });
  });

  describe("z-index stacking (REQ-F-22)", () => {
    test("assigns z-index based on creation order", () => {
      const panel1 = createTestPanel({
        id: "first",
        position: "overlay",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const panel2 = createTestPanel({
        id: "second",
        position: "overlay",
        createdAt: "2025-01-01T00:00:01Z",
      });
      const panel3 = createTestPanel({
        id: "third",
        position: "overlay",
        createdAt: "2025-01-01T00:00:02Z",
      });

      renderWithPanels([panel2, panel3, panel1], <OverlayPanelContainer />);

      const overlayZone = screen.getByTestId("panel-zone-overlay");
      const overlayItems = overlayZone.querySelectorAll(
        ".panel-zone__overlay-item"
      );

      // Oldest panel has lowest z-index (100), newest has highest (102)
      expect(overlayItems[0]).toHaveStyle({ zIndex: "100" });
      expect(overlayItems[1]).toHaveStyle({ zIndex: "101" });
      expect(overlayItems[2]).toHaveStyle({ zIndex: "102" });
    });
  });

  describe("accessibility", () => {
    test("has aria-label for screen readers", () => {
      const panel = createTestPanel({ id: "popup", position: "overlay" });
      renderWithPanels([panel], <OverlayPanelContainer />);

      expect(screen.getByTestId("panel-zone-overlay")).toHaveAttribute(
        "aria-label",
        "Overlay panels"
      );
    });

    test("uses div element for overlay container", () => {
      const panel = createTestPanel({ id: "popup", position: "overlay" });
      renderWithPanels([panel], <OverlayPanelContainer />);

      const zone = screen.getByTestId("panel-zone-overlay");
      expect(zone.tagName).toBe("DIV");
    });
  });
});

describe("All zones together", () => {
  test("each zone only shows panels for its position", () => {
    const sidebarPanel = createTestPanel({
      id: "sidebar",
      title: "Sidebar",
      position: "sidebar",
      createdAt: "2025-01-01T00:00:00Z",
    });
    const headerPanel = createTestPanel({
      id: "header",
      title: "Header",
      position: "header",
      createdAt: "2025-01-01T00:00:01Z",
    });
    const overlayPanel = createTestPanel({
      id: "overlay",
      title: "Overlay",
      position: "overlay",
      createdAt: "2025-01-01T00:00:02Z",
    });

    renderWithPanels(
      [sidebarPanel, headerPanel, overlayPanel],
      <>
        <SidebarPanelZone />
        <HeaderPanelZone />
        <OverlayPanelContainer />
      </>
    );

    // Check sidebar zone
    const sidebarZone = screen.getByTestId("panel-zone-sidebar");
    expect(sidebarZone.querySelectorAll("[data-panel-id]")).toHaveLength(1);
    expect(sidebarZone.querySelector("[data-panel-id='sidebar']")).toBeInTheDocument();

    // Check header zone
    const headerZone = screen.getByTestId("panel-zone-header");
    expect(headerZone.querySelectorAll("[data-panel-id]")).toHaveLength(1);
    expect(headerZone.querySelector("[data-panel-id='header']")).toBeInTheDocument();

    // Check overlay zone
    const overlayZone = screen.getByTestId("panel-zone-overlay");
    expect(overlayZone.querySelectorAll("[data-panel-id]")).toHaveLength(1);
    expect(overlayZone.querySelector("[data-panel-id='overlay']")).toBeInTheDocument();
  });

  test("zones are empty when panels exist only for other positions", () => {
    const sidebarPanel = createTestPanel({
      id: "sidebar-only",
      position: "sidebar",
    });

    renderWithPanels(
      [sidebarPanel],
      <>
        <SidebarPanelZone />
        <HeaderPanelZone />
        <OverlayPanelContainer />
      </>
    );

    expect(screen.getByTestId("panel-zone-sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-zone-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("panel-zone-overlay")).not.toBeInTheDocument();
  });
});

describe("Panel content rendering", () => {
  test("renders InfoPanel content correctly within zones", () => {
    const panel = createTestPanel({
      id: "weather",
      title: "Weather",
      content: "**Sunny** with *light breeze*",
      position: "sidebar",
    });

    renderWithPanels([panel], <SidebarPanelZone />);

    expect(screen.getByText("Weather")).toBeInTheDocument();
    expect(document.querySelector("strong")).toHaveTextContent("Sunny");
    expect(document.querySelector("em")).toHaveTextContent("light breeze");
  });
});
