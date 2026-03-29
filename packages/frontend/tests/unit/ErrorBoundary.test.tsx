import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Normal content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("when no error occurs", () => {
    test("renders children normally", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    test("does not show error UI", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("when an error occurs", () => {
    test("renders error UI instead of children", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.queryByText("Normal content")).not.toBeInTheDocument();
    });

    test("displays error message in details", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    test("logs error to console", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        "ErrorBoundary caught an error:",
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String) as unknown,
        })
      );
    });

    test("renders retry button", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("button", { name: "Try Again" })
      ).toBeInTheDocument();
    });

    test("retry button resets error state", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      // Error UI should be visible
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Re-render with non-throwing component before clicking retry
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Click retry
      await user.click(screen.getByRole("button", { name: "Try Again" }));

      // Should now show normal content
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("Normal content")).toBeInTheDocument();
    });
  });

  describe("custom fallback", () => {
    test("renders custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom error UI")).toBeInTheDocument();
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    test("does not render custom fallback when no error", () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(screen.queryByText("Custom error UI")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    test("error UI has alert role", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    test("error UI has test id for e2e testing", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    });
  });
});
