import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { InfoPanel } from "../../src/components/InfoPanel";
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

// Simple render with just PanelProvider (for tests that don't need minimize)
function renderWithProviders(ui: ReactNode) {
  return render(<PanelProvider>{ui}</PanelProvider>);
}

describe("InfoPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders title bar with panel title", () => {
      const panel = createTestPanel({ title: "Weather" });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(screen.getByText("Weather")).toBeInTheDocument();
    });

    test("renders minimize button", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithProviders(<InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      expect(minimizeBtn).toBeInTheDocument();
    });

    test("renders content when not minimized", () => {
      const panel = createTestPanel({ content: "Sunny, 72F" });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(screen.getByText("Sunny, 72F")).toBeInTheDocument();
    });

    test("renders with correct data-testid", () => {
      const panel = createTestPanel({ id: "weather-panel" });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(screen.getByTestId("info-panel-weather-panel")).toBeInTheDocument();
    });

    test("renders with data-panel-id attribute", () => {
      const panel = createTestPanel({ id: "status" });
      renderWithProviders(<InfoPanel panel={panel} />);

      const panelElement = screen.getByTestId("info-panel-status");
      expect(panelElement).toHaveAttribute("data-panel-id", "status");
    });
  });

  describe("markdown rendering (TD-3)", () => {
    test("renders bold text", () => {
      const panel = createTestPanel({ content: "**Bold text**" });
      renderWithProviders(<InfoPanel panel={panel} />);

      const strong = document.querySelector("strong");
      expect(strong).toBeInTheDocument();
      expect(strong).toHaveTextContent("Bold text");
    });

    test("renders italic text", () => {
      const panel = createTestPanel({ content: "*Italic text*" });
      renderWithProviders(<InfoPanel panel={panel} />);

      const em = document.querySelector("em");
      expect(em).toBeInTheDocument();
      expect(em).toHaveTextContent("Italic text");
    });

    test("renders unordered list", () => {
      const panel = createTestPanel({
        content: "- Item 1\n- Item 2\n- Item 3",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const ul = document.querySelector("ul");
      expect(ul).toBeInTheDocument();
      const lis = document.querySelectorAll("li");
      expect(lis).toHaveLength(3);
    });

    test("renders ordered list", () => {
      const panel = createTestPanel({
        content: "1. First\n2. Second\n3. Third",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const ol = document.querySelector("ol");
      expect(ol).toBeInTheDocument();
      const lis = document.querySelectorAll("li");
      expect(lis).toHaveLength(3);
    });

    test("renders paragraph text", () => {
      const panel = createTestPanel({
        content: "Paragraph one.\n\nParagraph two.",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const paragraphs = document.querySelectorAll("p");
      expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    });

    test("filters out disallowed elements (security)", () => {
      // Headers are not in allowedElements, should be unwrapped
      const panel = createTestPanel({
        content: "# Header\n\nRegular text",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const h1 = document.querySelector("h1");
      expect(h1).not.toBeInTheDocument();
      // Content should still be present but unwrapped
      expect(screen.getByText("Header")).toBeInTheDocument();
    });

    test("does not render images (security)", () => {
      const panel = createTestPanel({
        content: "![alt](http://example.com/image.png)",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const img = document.querySelector("img");
      expect(img).not.toBeInTheDocument();
    });

    test("does not render links (security)", () => {
      const panel = createTestPanel({
        content: "[Click here](http://example.com)",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      const link = document.querySelector("a");
      expect(link).not.toBeInTheDocument();
      // Text should still be present but unwrapped
      expect(screen.getByText("Click here")).toBeInTheDocument();
    });

    test("handles empty content", () => {
      const panel = createTestPanel({ content: "" });
      renderWithProviders(<InfoPanel panel={panel} />);

      const panelElement = screen.getByTestId("info-panel-test-panel");
      expect(panelElement).toBeInTheDocument();
    });
  });

  describe("minimize functionality (REQ-F-16, REQ-F-17)", () => {
    test("minimize button shows '-' when expanded", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      expect(minimizeBtn).toHaveTextContent("-");
    });

    test("clicking minimize button hides content", () => {
      const panel = createTestPanel({ id: "weather", content: "Sunny day" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      expect(screen.getByText("Sunny day")).toBeInTheDocument();

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(minimizeBtn);

      expect(screen.queryByText("Sunny day")).not.toBeInTheDocument();
    });

    test("minimize button shows '+' when minimized", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(minimizeBtn);

      expect(minimizeBtn).toHaveTextContent("+");
    });

    test("clicking expand button shows content again", () => {
      const panel = createTestPanel({ id: "weather", content: "Sunny day" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");

      // Minimize
      fireEvent.click(minimizeBtn);
      expect(screen.queryByText("Sunny day")).not.toBeInTheDocument();

      // Expand
      fireEvent.click(minimizeBtn);
      expect(screen.getByText("Sunny day")).toBeInTheDocument();
    });

    test("adds minimized class when minimized", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const panelElement = screen.getByTestId("info-panel-weather");
      expect(panelElement).not.toHaveClass("info-panel--minimized");

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(minimizeBtn);

      expect(panelElement).toHaveClass("info-panel--minimized");
    });

    test("title remains visible when minimized", () => {
      const panel = createTestPanel({ id: "weather", title: "Weather Info" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(minimizeBtn);

      expect(screen.getByText("Weather Info")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    test("minimize button has aria-label for expand state", () => {
      const panel = createTestPanel({ id: "weather", title: "Weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      expect(minimizeBtn).toHaveAttribute("aria-label", "Minimize Weather");
    });

    test("minimize button has aria-label for collapse state", () => {
      const panel = createTestPanel({ id: "weather", title: "Weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(minimizeBtn);

      expect(minimizeBtn).toHaveAttribute("aria-label", "Expand Weather");
    });

    test("minimize button has aria-expanded attribute", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      expect(minimizeBtn).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(minimizeBtn);
      expect(minimizeBtn).toHaveAttribute("aria-expanded", "false");
    });

    test("minimize button has type=button", () => {
      const panel = createTestPanel({ id: "weather" });
      renderWithPanels([panel], <InfoPanel panel={panel} />);

      const minimizeBtn = screen.getByTestId("info-panel-minimize-weather");
      expect(minimizeBtn).toHaveAttribute("type", "button");
    });
  });

  describe("multiple panels", () => {
    test("renders multiple panels with independent minimize states", () => {
      const panel1 = createTestPanel({
        id: "weather",
        title: "Weather",
        content: "Sunny",
        createdAt: "2025-01-01T00:00:00Z",
      });
      const panel2 = createTestPanel({
        id: "ticker",
        title: "Ticker",
        content: "News",
        createdAt: "2025-01-01T00:00:01Z",
      });

      renderWithPanels(
        [panel1, panel2],
        <>
          <InfoPanel panel={panel1} />
          <InfoPanel panel={panel2} />
        </>
      );

      // Minimize only weather panel
      const weatherMinimize = screen.getByTestId("info-panel-minimize-weather");
      fireEvent.click(weatherMinimize);

      // Weather content hidden, ticker content visible
      expect(screen.queryByText("Sunny")).not.toBeInTheDocument();
      expect(screen.getByText("News")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    test("handles very long title with truncation", () => {
      const longTitle =
        "This is an extremely long panel title that should be truncated properly";
      const panel = createTestPanel({ title: longTitle });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    test("handles markdown with mixed content", () => {
      const panel = createTestPanel({
        content: `**Weather Report**

Current conditions:
- *Temperature*: 72F
- *Humidity*: 45%

Tomorrow will be **sunny**.`,
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(document.querySelector("strong")).toBeInTheDocument();
      expect(document.querySelector("em")).toBeInTheDocument();
      expect(document.querySelector("ul")).toBeInTheDocument();
    });

    test("handles special characters in content", () => {
      const panel = createTestPanel({
        content: "Price: $100 & discount = 20%",
      });
      renderWithProviders(<InfoPanel panel={panel} />);

      expect(
        screen.getByText(/Price: \$100 & discount = 20%/)
      ).toBeInTheDocument();
    });
  });
});
