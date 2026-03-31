import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { applyMood } from "../../lib/apply-mood";

// Minimal DOM stub for document.documentElement.style and getElementById
let setProperties: Map<string, string>;
let bgLayerElement: { style: { backgroundImage: string } } | null;

const originalDocument = globalThis.document;

beforeEach(() => {
  setProperties = new Map();
  bgLayerElement = { style: { backgroundImage: "" } };

  // @ts-expect-error -- minimal DOM stub for unit testing
  globalThis.document = {
    documentElement: {
      style: {
        setProperty(name: string, value: string) {
          setProperties.set(name, value);
        },
      },
    },
    getElementById(id: string) {
      if (id === "mood-bg-layer") return bgLayerElement;
      return null;
    },
  };
});

afterEach(() => {
  globalThis.document = originalDocument;
});

describe("applyMood", () => {
  test("sets all nine CSS variables at hue 0", () => {
    applyMood(0);

    expect(setProperties.get("--bg-base")).toBe("oklch(20% 0.045 0)");
    expect(setProperties.get("--bg-surface")).toBe("oklch(25% 0.045 0)");
    expect(setProperties.get("--bg-elevated")).toBe("oklch(30% 0.045 0)");
    expect(setProperties.get("--text-primary")).toBe("oklch(90% 0.024 175)");
    expect(setProperties.get("--text-secondary")).toBe("oklch(65% 0.024 175)");
    expect(setProperties.get("--text-tertiary")).toBe("oklch(45% 0.024 175)");
    expect(setProperties.get("--accent")).toBe("oklch(65% 0.135 168)");
    expect(setProperties.get("--accent-hover")).toBe("oklch(85% 0.135 168)");
    expect(setProperties.get("--gm-accent")).toBe("oklch(70% 0.075 328)");
  });

  test("sets all nine CSS variables at hue 270 (default)", () => {
    applyMood(270);

    expect(setProperties.get("--bg-base")).toBe("oklch(20% 0.045 270)");
    expect(setProperties.get("--bg-surface")).toBe("oklch(25% 0.045 270)");
    expect(setProperties.get("--bg-elevated")).toBe("oklch(30% 0.045 270)");
    // (270 + 175) % 360 = 85
    expect(setProperties.get("--text-primary")).toBe("oklch(90% 0.024 85)");
    expect(setProperties.get("--text-secondary")).toBe("oklch(65% 0.024 85)");
    expect(setProperties.get("--text-tertiary")).toBe("oklch(45% 0.024 85)");
    // (270 + 168) % 360 = 78
    expect(setProperties.get("--accent")).toBe("oklch(65% 0.135 78)");
    expect(setProperties.get("--accent-hover")).toBe("oklch(85% 0.135 78)");
    // (270 + 328) % 360 = 238
    expect(setProperties.get("--gm-accent")).toBe("oklch(70% 0.075 238)");
  });

  test("hue offset arithmetic is correct at H=100", () => {
    applyMood(100);

    // text: (100 + 175) % 360 = 275
    expect(setProperties.get("--text-primary")).toBe("oklch(90% 0.024 275)");
    // accent: (100 + 168) % 360 = 268
    expect(setProperties.get("--accent")).toBe("oklch(65% 0.135 268)");
    // gm-accent: (100 + 328) % 360 = 68
    expect(setProperties.get("--gm-accent")).toBe("oklch(70% 0.075 68)");
  });

  test("modulo wraps correctly at H=350", () => {
    applyMood(350);

    // text: (350 + 175) % 360 = 165
    expect(setProperties.get("--text-primary")).toBe("oklch(90% 0.024 165)");
    // accent: (350 + 168) % 360 = 158
    expect(setProperties.get("--accent")).toBe("oklch(65% 0.135 158)");
    // gm-accent: (350 + 328) % 360 = 318
    expect(setProperties.get("--gm-accent")).toBe("oklch(70% 0.075 318)");
  });

  test("sets background image when imageSrc is provided", () => {
    applyMood(270, "/api/daemon/adventures/test/mood-image");

    expect(bgLayerElement!.style.backgroundImage).toBe(
      'url("/api/daemon/adventures/test/mood-image")',
    );
  });

  test("clears background image when imageSrc is absent", () => {
    // Set it first
    bgLayerElement!.style.backgroundImage = 'url("something")';
    applyMood(270);

    expect(bgLayerElement!.style.backgroundImage).toBe("");
  });

  test("does not throw when #mood-bg-layer element is absent", () => {
    bgLayerElement = null;
    expect(() => applyMood(270, "/some-image")).not.toThrow();
    // CSS variables should still be set
    expect(setProperties.size).toBe(9);
  });
});
