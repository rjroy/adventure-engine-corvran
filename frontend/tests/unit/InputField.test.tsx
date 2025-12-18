import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputField } from "../../src/components/InputField";

describe("InputField", () => {
  describe("rendering", () => {
    test("renders input with default placeholder", () => {
      render(<InputField onSubmit={vi.fn()} />);

      expect(screen.getByPlaceholderText("Enter your command...")).toBeInTheDocument();
    });

    test("renders input with custom placeholder", () => {
      render(<InputField onSubmit={vi.fn()} placeholder="What do you do?" />);

      expect(screen.getByPlaceholderText("What do you do?")).toBeInTheDocument();
    });

    test("renders Send button", () => {
      render(<InputField onSubmit={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    });

    test("button is disabled when input is empty", () => {
      render(<InputField onSubmit={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    });
  });

  describe("submission", () => {
    test("calls onSubmit with trimmed value when form is submitted", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<InputField onSubmit={onSubmit} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "  look around  ");
      await user.click(screen.getByRole("button", { name: "Send" }));

      expect(onSubmit).toHaveBeenCalledWith("look around");
    });

    test("clears input after submission", async () => {
      const user = userEvent.setup();
      render(<InputField onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test command");
      await user.click(screen.getByRole("button", { name: "Send" }));

      expect(input).toHaveValue("");
    });

    test("submits on Enter key", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<InputField onSubmit={onSubmit} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "go north{Enter}");

      expect(onSubmit).toHaveBeenCalledWith("go north");
    });

    test("Shift+Enter adds newline instead of submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<InputField onSubmit={onSubmit} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "line one{Shift>}{Enter}{/Shift}line two");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(input).toHaveValue("line one\nline two");
    });

    test("does not submit whitespace-only input", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<InputField onSubmit={onSubmit} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: "Send" }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    test("input is disabled when disabled prop is true", () => {
      render(<InputField onSubmit={vi.fn()} disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    test("does not submit when disabled", () => {
      const onSubmit = vi.fn();
      render(<InputField onSubmit={onSubmit} disabled />);

      // userEvent won't type into disabled input, so we test button directly
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
