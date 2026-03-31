import { describe, test, expect } from "bun:test";
import { createAdventureService } from "../../src/services/adventure-service.js";
import { createMockFileOps } from "../helpers/mock-file-ops.js";

const ADVENTURES_ROOT = "/test/adventures";

describe("setMood", () => {
  test("writes all three mood fields to adventure.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
system: d20
---

A brave quest.
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 142,
      description: "serene forest glade",
      imagePath: "mood.png",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    expect(content).toContain("mood_hue: 142");
    expect(content).toContain('mood_description: "serene forest glade"');
    expect(content).toContain("mood_image: mood.png");
    // Original fields preserved
    expect(content).toContain("name: The Quest");
    expect(content).toContain("system: d20");
    // Body preserved
    expect(content).toContain("A brave quest.");
  });

  test("updates existing mood fields in place", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
mood_hue: 100
mood_description: "old mood"
mood_image: old.png
---

Body text.
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 270,
      description: "eerie twilight",
      imagePath: "mood.png",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    expect(content).toContain("mood_hue: 270");
    expect(content).toContain('mood_description: "eerie twilight"');
    expect(content).toContain("mood_image: mood.png");
    expect(content).not.toContain("mood_hue: 100");
    expect(content).not.toContain("old mood");
    expect(content).toContain("name: The Quest");
    expect(content).toContain("Body text.");
  });

  test("removes mood_image line when imagePath is absent", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
mood_hue: 100
mood_description: "old mood"
mood_image: old.png
---
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 270,
      description: "eerie twilight",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    expect(content).toContain("mood_hue: 270");
    expect(content).toContain('mood_description: "eerie twilight"');
    expect(content).not.toContain("mood_image");
  });

  test("does not disturb other frontmatter fields", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
system: daggerheart
art_style: dark fantasy
---

A tale of adventure.
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 30,
      description: "blazing sunset",
      imagePath: "mood.png",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    expect(content).toContain("name: The Quest");
    expect(content).toContain("system: daggerheart");
    expect(content).toContain("art_style: dark fantasy");
    expect(content).toContain("mood_hue: 30");
    expect(content).toContain("A tale of adventure.");
  });

  test("escapes double quotes in description on write (F2)", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
---
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 142,
      description: 'A tavern called "The Dragon"',
      imagePath: "mood.png",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    expect(content).toContain('mood_description: "A tavern called \\"The Dragon\\""');
    // Verify it doesn't have unescaped inner quotes that would corrupt YAML
    const lines = content.split("\n");
    const descLine = lines.find(l => l.startsWith("mood_description:"));
    expect(descLine).toBeDefined();
    // The value after the key should be a single well-formed quoted string
    expect(descLine).toBe('mood_description: "A tavern called \\"The Dragon\\""');
  });

  test("handles malformed frontmatter without worsening corruption (F4)", async () => {
    // Content starts with --- but has no closing ---
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
Some broken content here
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    await service.setMood("quest", {
      hue: 200,
      description: "icy cavern",
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/adventure.md`)!;
    // Should have exactly one opening and one closing --- pair
    const dashLines = content.split("\n").filter(l => l.trim() === "---");
    expect(dashLines.length).toBe(2);
    // Should contain the mood fields
    expect(content).toContain("mood_hue: 200");
    expect(content).toContain('mood_description: "icy cavern"');
    // Original body content should be preserved after frontmatter
    expect(content).toContain("name: The Quest");
  });
});

describe("getAdventure with currentMood", () => {
  test("populates currentMood from adventure config", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
mood_hue: 142
mood_description: serene forest
mood_image: mood.png
---
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    const adventure = await service.getAdventure("quest");
    expect(adventure).not.toBeNull();
    expect(adventure!.currentMood).not.toBeNull();
    expect(adventure!.currentMood!.hue).toBe(142);
    expect(adventure!.currentMood!.description).toBe("serene forest");
    expect(adventure!.currentMood!.imagePath).toBe("mood.png");
  });

  test("returns currentMood: null when no mood fields exist", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: `---
name: The Quest
system: d20
---
`,
    };

    const fileOps = createMockFileOps(files);
    const service = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

    const adventure = await service.getAdventure("quest");
    expect(adventure).not.toBeNull();
    expect(adventure!.currentMood).toBeNull();
  });
});
