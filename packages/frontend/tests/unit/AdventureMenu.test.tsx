import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdventureMenu } from "../../src/components/AdventureMenu";

describe("AdventureMenu", () => {
  const mockOnAdventureStart = vi.fn();

  beforeEach(() => {
    mockOnAdventureStart.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("rendering", () => {
    test("renders title", () => {
      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      expect(screen.getByText("Adventure Engine of Corvran")).toBeInTheDocument();
    });

    test("renders New Adventure button", () => {
      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      expect(screen.getByRole("button", { name: /new adventure/i })).toBeInTheDocument();
    });

    test("does not show Resume button without saved adventure", () => {
      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
    });
  });

  describe("new adventure", () => {
    test("creates new adventure on button click", async () => {
      const user = userEvent.setup();
      const mockResponse = {
        adventureId: "new-adventure-id",
        sessionToken: "new-session-token",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /new adventure/i }));

      await waitFor(() => {
        expect(mockOnAdventureStart).toHaveBeenCalledWith(
          "new-adventure-id",
          "new-session-token"
        );
      });
    });

    test("shows loading state while creating", async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(fetch).mockReturnValueOnce(pendingPromise as Promise<Response>);

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /new adventure/i }));

      expect(screen.getByRole("button", { name: /creating/i })).toBeInTheDocument();

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ adventureId: "id", sessionToken: "token" }),
      });
    });

    test("saves adventure to localStorage", async () => {
      const user = userEvent.setup();
      const mockResponse = {
        adventureId: "saved-adventure-id",
        sessionToken: "saved-session-token",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /new adventure/i }));

      await waitFor(() => {
        expect(window.localStorage.getItem("adventure_id")).toBe("saved-adventure-id");
        expect(window.localStorage.getItem("session_token")).toBe("saved-session-token");
      });
    });

    test("shows error message on failure", async () => {
      const user = userEvent.setup();

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Server error" }),
      } as Response);

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /new adventure/i }));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    test("handles promise rejections without silently swallowing them", async () => {
      const user = userEvent.setup();

      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /new adventure/i }));

      await waitFor(() => {
        expect(screen.getByText("Network failure")).toBeInTheDocument();
      });
    });
  });

  describe("resume adventure", () => {
    beforeEach(() => {
      window.localStorage.setItem("adventure_id", "saved-id");
      window.localStorage.setItem("session_token", "saved-token");
    });

    test("shows Resume button with saved adventure", () => {
      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    });

    test("shows truncated adventure ID", () => {
      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      expect(screen.getByText(/adventure id: saved-id/i)).toBeInTheDocument();
    });

    test("resumes adventure on Resume button click", async () => {
      const user = userEvent.setup();

      render(<AdventureMenu onAdventureStart={mockOnAdventureStart} />);

      await user.click(screen.getByRole("button", { name: /resume/i }));

      expect(mockOnAdventureStart).toHaveBeenCalledWith("saved-id", "saved-token");
    });
  });
});
