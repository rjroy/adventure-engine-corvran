import { describe, test, expect } from "bun:test";
import {
  keywordHue,
  createMoodToolDef,
  type MoodToolDeps,
  type MoodEventPayload,
} from "../../src/services/mood-tool";
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
  test("fire keywords return 20", () => {
    expect(keywordHue("a blazing fire surrounds the room")).toBe(20);
    expect(keywordHue("the inferno rages")).toBe(20);
    expect(keywordHue("lava flows down the mountainside")).toBe(20);
    expect(keywordHue("an ember glows in the ashes")).toBe(20);
  });

  test("blood keywords return 5", () => {
    expect(keywordHue("blood flows through the halls")).toBe(5);
    expect(keywordHue("crimson banners hang from the walls")).toBe(5);
    expect(keywordHue("war drums echo across the valley")).toBe(5);
  });

  test("forest keywords return 142", () => {
    expect(keywordHue("deep in the forest")).toBe(142);
    expect(keywordHue("a verdant meadow")).toBe(142);
    expect(keywordHue("moss covers the ancient stones")).toBe(142);
    expect(keywordHue("vine-wrapped pillars")).toBe(142);
  });

  test("ocean keywords return 220", () => {
    expect(keywordHue("across the ocean")).toBe(220);
    expect(keywordHue("the tide rises")).toBe(220);
    expect(keywordHue("a river cuts through the canyon")).toBe(220);
  });

  test("sky keywords return 195", () => {
    expect(keywordHue("an open sky stretches above")).toBe(195);
    expect(keywordHue("dawn breaks over the hills")).toBe(195);
    expect(keywordHue("the morning air is crisp")).toBe(195);
  });

  test("night keywords return 270", () => {
    expect(keywordHue("the void consumes all light")).toBe(270);
    expect(keywordHue("darkness envelops everything")).toBe(270);
    expect(keywordHue("shadow creeps closer")).toBe(270);
    expect(keywordHue("the abyss stares back")).toBe(270);
  });

  test("ice keywords return 205", () => {
    expect(keywordHue("ice covers the path")).toBe(205);
    expect(keywordHue("a frozen tundra")).toBe(205);
    expect(keywordHue("the glacier groans")).toBe(205);
  });

  test("desert keywords return 50", () => {
    expect(keywordHue("endless desert sands")).toBe(50);
    expect(keywordHue("stone pillars rise from the earth")).toBe(50);
    expect(keywordHue("an ancient ruin stands alone")).toBe(50);
  });

  test("magic keywords return 300", () => {
    expect(keywordHue("arcane symbols glow on the floor")).toBe(300);
    expect(keywordHue("a mystical aura surrounds the portal")).toBe(300);
    expect(keywordHue("ethereal light shimmers")).toBe(300);
    expect(keywordHue("the fey court gathers")).toBe(300);
  });

  test("poison keywords return 120", () => {
    expect(keywordHue("poison drips from the fangs")).toBe(120);
    expect(keywordHue("a plague sweeps the land")).toBe(120);
    expect(keywordHue("decay fills the chamber")).toBe(120);
    expect(keywordHue("rot covers the fallen body")).toBe(120);
    expect(keywordHue("corruption spreads through the kingdom")).toBe(120);
  });

  test("first match wins when multiple keywords appear", () => {
    // "fire" group (20) appears before "ocean" group (220)
    expect(keywordHue("fire on the ocean waves")).toBe(20);
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
      expect(savedMood).not.toBeNull();
      expect(savedMood!).toEqual({
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
      expect(emittedPayload).not.toBeNull();
      expect(emittedPayload!).toEqual({
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
        { type: "text", text: "mood set (using fallback hue)" },
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
      expect(savedMood).not.toBeNull();
      expect(savedMood!).toEqual({
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
      expect(emittedPayload).not.toBeNull();
      expect(emittedPayload!).toEqual({
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

  describe("error recovery", () => {
    test("falls back to keyword hue when extractHue throws", async () => {
      let savedMood: MoodState | null = null;
      let emittedPayload: MoodEventPayload | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          extractHue: async () => {
            throw new Error("PNG parse failed");
          },
          setMood: async (mood) => {
            savedMood = mood;
          },
          emitMoodEvent: async (payload) => {
            emittedPayload = payload;
          },
        }),
      );
      const result = await toolDef.handler({ description: "a dark forest clearing" }, {});
      // Keyword hue for "forest" is 142, no imagePath since extraction failed
      expect(savedMood).not.toBeNull();
      expect(savedMood!).toEqual({ hue: 142, description: "a dark forest clearing" });
      expect(emittedPayload).not.toBeNull();
      expect(emittedPayload!).toEqual({ hue: 142, description: "a dark forest clearing" });
      expect(result.content).toEqual([{ type: "text", text: "mood set (using fallback hue)" }]);
    });

    test("skips extractHue when saveImage throws", async () => {
      let extractHueCalled = false;
      let savedMood: MoodState | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          saveImage: async () => {
            throw new Error("disk full");
          },
          extractHue: async () => {
            extractHueCalled = true;
            return 180;
          },
          setMood: async (mood) => {
            savedMood = mood;
          },
        }),
      );
      await toolDef.handler({ description: "ocean waves" }, {});
      expect(extractHueCalled).toBe(false);
      expect(savedMood).not.toBeNull();
      expect(savedMood!).toEqual({ hue: 220, description: "ocean waves" });
    });

    test("still emits mood event when setMood throws", async () => {
      let emittedPayload: MoodEventPayload | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          setMood: async () => {
            throw new Error("write failed");
          },
          emitMoodEvent: async (payload) => {
            emittedPayload = payload;
          },
        }),
      );
      const result = await toolDef.handler({ description: "dark cavern" }, {});
      expect(emittedPayload).not.toBeNull();
      expect(emittedPayload!.hue).toBe(180);
      expect(result.content[0].text).toBe("mood set");
    });

    test("still returns success when emitMoodEvent throws", async () => {
      let savedMood: MoodState | null = null;
      const toolDef = createMoodToolDef(
        createMockDeps({
          setMood: async (mood) => {
            savedMood = mood;
          },
          emitMoodEvent: async () => {
            throw new Error("stream closed");
          },
        }),
      );
      const result = await toolDef.handler({ description: "dark cavern" }, {});
      expect(savedMood).not.toBeNull();
      expect(result.content[0].text).toBe("mood set");
    });
  });
});
