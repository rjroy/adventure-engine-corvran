/**
 * Touch device detection and keyboard behavior for mobile vs desktop input.
 *
 * On desktop: Enter sends, Shift+Enter inserts newline.
 * On mobile/touch: Enter inserts newline, user taps Send button.
 */

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function shouldSendOnEnter(
  event: { key: string; shiftKey: boolean },
  isMobile: boolean,
): boolean {
  if (event.key !== "Enter") return false;
  if (isMobile) return false;
  return !event.shiftKey;
}
