import { describe, test, expect } from "bun:test";
import { shouldSendOnEnter, isTouchDevice } from "../lib/keyboard-handler";

describe("shouldSendOnEnter", () => {
  describe("desktop (isMobile = false)", () => {
    const isMobile = false;

    test("Enter sends", () => {
      expect(shouldSendOnEnter({ key: "Enter", shiftKey: false }, isMobile)).toBe(true);
    });

    test("Shift+Enter does not send", () => {
      expect(shouldSendOnEnter({ key: "Enter", shiftKey: true }, isMobile)).toBe(false);
    });

    test("other keys do not send", () => {
      expect(shouldSendOnEnter({ key: "a", shiftKey: false }, isMobile)).toBe(false);
      expect(shouldSendOnEnter({ key: "Tab", shiftKey: false }, isMobile)).toBe(false);
    });
  });

  describe("mobile (isMobile = true)", () => {
    const isMobile = true;

    test("Enter does not send (inserts newline)", () => {
      expect(shouldSendOnEnter({ key: "Enter", shiftKey: false }, isMobile)).toBe(false);
    });

    test("Shift+Enter does not send", () => {
      expect(shouldSendOnEnter({ key: "Enter", shiftKey: true }, isMobile)).toBe(false);
    });

    test("other keys do not send", () => {
      expect(shouldSendOnEnter({ key: "a", shiftKey: false }, isMobile)).toBe(false);
    });
  });
});

describe("isTouchDevice", () => {
  test("returns false in non-browser environment", () => {
    // bun test has no window.ontouchstart or maxTouchPoints
    expect(isTouchDevice()).toBe(false);
  });
});
