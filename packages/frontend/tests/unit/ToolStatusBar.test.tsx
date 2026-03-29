import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolStatusBar } from "../../src/components/ToolStatusBar";

describe("ToolStatusBar", () => {
  describe("rendering", () => {
    test("renders with idle state", () => {
      render(<ToolStatusBar state="idle" description="Ready" />);
      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--idle"
      );
    });

    test("renders with active state", () => {
      render(
        <ToolStatusBar state="active" description="Setting the scene..." />
      );
      expect(screen.getByText("Setting the scene...")).toBeInTheDocument();
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--active"
      );
    });

    test("shows animated dots when active", () => {
      render(<ToolStatusBar state="active" description="Thinking..." />);
      const indicator = screen.getByTestId("tool-status-bar").querySelector(
        ".tool-status-bar__indicator"
      );
      expect(indicator).toBeInTheDocument();
      const dots = indicator?.querySelectorAll(".tool-status-bar__dot");
      expect(dots).toHaveLength(3);
    });

    test("hides animated dots when idle", () => {
      render(<ToolStatusBar state="idle" description="Ready" />);
      const indicator = screen.getByTestId("tool-status-bar").querySelector(
        ".tool-status-bar__indicator"
      );
      expect(indicator).not.toBeInTheDocument();
    });

    test("displays different descriptions correctly", () => {
      const { rerender } = render(
        <ToolStatusBar state="active" description="Consulting the dice..." />
      );
      expect(screen.getByText("Consulting the dice...")).toBeInTheDocument();

      rerender(
        <ToolStatusBar state="active" description="Updating world state..." />
      );
      expect(screen.getByText("Updating world state...")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    test("has role=status for screen readers", () => {
      render(<ToolStatusBar state="idle" description="Ready" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    test("has aria-live=polite for announcements", () => {
      render(<ToolStatusBar state="active" description="Working..." />);
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    });

    test("indicator has aria-hidden=true", () => {
      render(<ToolStatusBar state="active" description="Working..." />);
      const indicator = screen.getByTestId("tool-status-bar").querySelector(
        ".tool-status-bar__indicator"
      );
      expect(indicator).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("state transitions", () => {
    test("transitions from idle to active", () => {
      const { rerender } = render(
        <ToolStatusBar state="idle" description="Ready" />
      );
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--idle"
      );

      rerender(
        <ToolStatusBar state="active" description="Setting the scene..." />
      );
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--active"
      );
    });

    test("transitions from active to idle", () => {
      const { rerender } = render(
        <ToolStatusBar state="active" description="Thinking..." />
      );
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--active"
      );

      rerender(<ToolStatusBar state="idle" description="Ready" />);
      expect(screen.getByTestId("tool-status-bar")).toHaveClass(
        "tool-status-bar--idle"
      );
    });
  });
});
