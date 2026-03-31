import { describe, test, expect } from "bun:test";
import {
  keywordHue,
  createMoodToolDef,
  type MoodToolDeps,
  type MoodEventPayload,
} from "../../src/services/mood-tool.js";
import type { MoodState } from "@corvran/shared";

function createMockDeps(overrides?: Partial<MoodToolDeps>): MoodToolDeps {
  return {
    adventureId: "test-adventure",
    adventurePath: "/tmp/adventures/test-adventure",
    artStyle: null,
    generateImage: async () => "https://replicate.delivery/test/image.png",
    extractHue: async () => 180,
    saveImage: async () => {},
    setMood: async () => {},
    emitMoodEvent: async () => {},
    ...overrides,
  };
}

describe("keywordHue", () => {
  test("fire keywords return 25", () => {
    expect(keywordHue("a blazing fire surrounds the room")).toBe(25);
    expect(keywordHue("the inferno rages")).toBe(25);
  });

  test("blood/rage keywords return 10", () => {
    expect(keywordHue("blood flows through the halls")).toBe(10);
    expect(keywordHue("fury of the gods")).toBe(10);
  });

  test("forest keywords return 142", () => {
    expect(keywordHue("deep in the forest")).toBe(142);
    expect(keywordHue("a verdant meadow")).toBe(142);
  });

  test("ocean keywords return 220", () => {
    expect(keywordHue("across the ocean")).toBe(220);
    expect(keywordHue("the tide rises")).toBe(220);
  });

  test("storm keywords return 250", () => {
    expect(keywordHue("a terrible storm brews")).toBe(250);
    expect(keywordHue("lightning strikes")).toBe(250);
  });

  test("shadow keywords return 285", () => {
    expect(keywordHue("shadow creeps forward")).toBe(285);
    expect(keywordHue("darkness envelops everything")).toBe(285);
  });

  test("holy keywords return 85", () => {
    expect(keywordHue("a holy aura")).toBe(85);
    expect(keywordHue("celestial beings descend")).toBe(85);
  });

  test("ice keywords return 200", () => {
    expect(keywordHue("ice covers the path")).toBe(200);
    expect(keywordHue("a frozen wasteland")).toBe(200);
  });

  test("desert keywords return 55", () => {
    expect(keywordHue("endless desert sands")).toBe(55);
    expect(keywordHue("arid landscape stretches")).toBe(55);
  });

  test("death keywords return 310", () => {
    expect(keywordHue("death awaits")).toBe(310);
    expect(keywordHue("undead rise from graves")).toBe(310);
  });

  test("first match wins when multiple keywords appear", () => {
    // "fire" group (25) appears before "ocean" group (220)
    expect(keywordHue("fire on the ocean waves")).toBe(25);
  });

  test("returns 270 when no keyword matches", () => {
    expect(keywordHue("a peaceful village at sunset")).toBe(270);
  });

  test("matching is case-insensitive", () => {
    expect(keywordHue("FOREST of dreams")).toBe(142);
    expect(keywordHue("The OCEAN roars")).toBe(220);
  });
});

describe("createMoodToolDef", () => {
  test("returns tool with name set_mood", () => {
    const toolDef = createMoodToolDef(createMockDeps());
    expect(toolDef.name).toBe("set_mood");
  });

  describe("handler with successful image generation", () => {
    test("returns 'mood set' when generateImage returns a URL", async () => {
      const toolDef = createMoodToolDef(createMockDeps());
      const result = await toolDef.handler({ description: "dark cavern" }, {});
      expect(result.content).toEqual([{ type: "text", text: "mood set" }]);
    });

    test("calls saveImage with the image URL", async () => {
      let savedUrl = "";
      let savedPath = "";
      const toolDef = createMoodToolDef(
        createMockDeps({
          saveImage: async (url, dest) => {
            savedUrl = url;
            savedPath = dest;
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(savedUrl).toBe("https://replicate.delivery/test/image.png");
      expect(savedPath).toBe("/tmp/adventures/test-adventure/mood.png");
    });

    test("calls setMood with hue from extractHue", async () => {
      let savedMood: MoodState | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          extractHue: async () => 142,
          setMood: async (mood) => {
            savedMood = mood;
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(savedMood).toEqual({
        hue: 142,
        description: "dark cavern",
        imagePath: "mood.png",
      });
    });

    test("calls emitMoodEvent with correct payload", async () => {
      let emittedPayload: MoodEventPayload | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          extractHue: async () => 142,
          emitMoodEvent: async (payload) => {
            emittedPayload = payload;
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(emittedPayload).toEqual({
        hue: 142,
        description: "dark cavern",
        imagePath: "mood.png",
      });
    });

    test("prompt includes artStyle when non-null", async () => {
      let capturedPrompt = "";
      const toolDef = createMoodToolDef(
        createMockDeps({
          artStyle: "watercolor fantasy illustration",
          generateImage: async (prompt) => {
            capturedPrompt = prompt;
            return "https://example.com/image.png";
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(capturedPrompt).toBe("watercolor fantasy illustration. dark cavern");
    });

    test("prompt is description alone when artStyle is null", async () => {
      let capturedPrompt = "";
      const toolDef = createMoodToolDef(
        createMockDeps({
          artStyle: null,
          generateImage: async (prompt) => {
            capturedPrompt = prompt;
            return "https://example.com/image.png";
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(capturedPrompt).toBe("dark cavern");
    });
  });

  describe("handler with failed image generation", () => {
    test("returns fallback message when generateImage returns null", async () => {
      const toolDef = createMoodToolDef(
        createMockDeps({ generateImage: async () => null }),
      );
      const result = await toolDef.handler({ description: "dark cavern" }, {});
      expect(result.content).toEqual([
        { type: "text", text: "mood set (image generation failed \u2014 using fallback hue)" },
      ]);
    });

    test("calls setMood with keyword-derived hue", async () => {
      let savedMood: MoodState | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          generateImage: async () => null,
          setMood: async (mood) => {
            savedMood = mood;
          },
        }),
      );
      await toolDef.handler({ description: "a dark forest clearing" }, {});
      expect(savedMood).toEqual({
        hue: 142,
        description: "a dark forest clearing",
      });
    });

    test("calls emitMoodEvent without imagePath", async () => {
      let emittedPayload: MoodEventPayload | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          generateImage: async () => null,
          emitMoodEvent: async (payload) => {
            emittedPayload = payload;
          },
        }),
      );
      await toolDef.handler({ description: "a dark forest clearing" }, {});
      expect(emittedPayload).toEqual({
        hue: 142,
        description: "a dark forest clearing",
      });
    });

    test("does not call saveImage on failure", async () => {
      let saveImageCalled = false;
      const toolDef = createMoodToolDef(
        createMockDeps({
          generateImage: async () => null,
          saveImage: async () => {
            saveImageCalled = true;
          },
        }),
      );
      await toolDef.handler({ description: "dark cavern" }, {});
      expect(saveImageCalled).toBe(false);
    });
  });
});
