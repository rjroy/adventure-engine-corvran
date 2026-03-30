import { describe, test, expect } from "bun:test";
import { createAdventureService } from "../src/services/adventure-service.js";
import { createMockFileOps } from "./helpers/mock-file-ops.js";

const ADVENTURES_ROOT = "/test/adventures";

describe("isValidAdventureId", () => {
  test("rejects IDs with /", () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });
    expect(service.isValidAdventureId("../etc/passwd")).toBe(false);
  });

  test("rejects IDs with ..", () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });
    expect(service.isValidAdventureId("foo/../../bar")).toBe(false);
  });

  test("accepts valid IDs", () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });
    expect(service.isValidAdventureId("lost-mines")).toBe(true);
  });
});

describe("listAdventures", () => {
  test("returns empty array when no adventures exist", async () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });
    const result = await service.listAdventures();
    expect(result).toEqual([]);
  });

  test("discovers adventures with various file combinations", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/full-adventure/character.md`]: "# Hero\nA brave warrior",
      [`${ADVENTURES_ROOT}/full-adventure/world.md`]: "# World",
      [`${ADVENTURES_ROOT}/full-adventure/history.md`]: "# History",
      [`${ADVENTURES_ROOT}/new-adventure/character.md`]: "# Char",
      [`${ADVENTURES_ROOT}/new-adventure/world.md`]: "# World",
      [`${ADVENTURES_ROOT}/bare-adventure/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    expect(result).toHaveLength(3);

    const full = result.find((a) => a.id === "full-adventure");
    expect(full).toEqual({
      id: "full-adventure",
      name: "full-adventure",
      hasCharacter: true,
      hasWorld: true,
      hasHistory: true,
      system: null,
      concept: null,
      characterName: "Hero",
      lastPlayed: "1970-01-01T00:00:00.000Z",
    });

    const newAdv = result.find((a) => a.id === "new-adventure");
    expect(newAdv).toEqual({
      id: "new-adventure",
      name: "new-adventure",
      hasCharacter: true,
      hasWorld: true,
      hasHistory: false,
      system: null,
      concept: null,
      characterName: "Char",
      lastPlayed: null,
    });

    const bare = result.find((a) => a.id === "bare-adventure");
    expect(bare).toEqual({
      id: "bare-adventure",
      name: "bare-adventure",
      hasCharacter: false,
      hasWorld: false,
      hasHistory: false,
      system: null,
      concept: null,
      characterName: null,
      lastPlayed: null,
    });
  });

  test("returns name from frontmatter when present", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/my-quest/adventure.md`]:
        '---\nname: "The Lost Mines"\nsystem: d20\n---\n\nA classic dungeon crawl.',
      [`${ADVENTURES_ROOT}/my-quest/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const quest = result.find((a) => a.id === "my-quest");
    expect(quest?.name).toBe("The Lost Mines");
    expect(quest?.concept).toBe("A classic dungeon crawl.");
  });

  test("returns directory name when name absent from frontmatter", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/old-quest/adventure.md`]: "---\nsystem: d20\n---\n",
      [`${ADVENTURES_ROOT}/old-quest/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const quest = result.find((a) => a.id === "old-quest");
    expect(quest?.name).toBe("old-quest");
  });

  test("returns concept from body text", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/story/adventure.md`]:
        "---\nsystem: daggerheart\n---\n\nAn epic tale of frozen wastes.",
      [`${ADVENTURES_ROOT}/story/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const story = result.find((a) => a.id === "story");
    expect(story?.concept).toBe("An epic tale of frozen wastes.");
  });

  test("returns characterName from # heading in character.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/named/character.md`]: "# Aria Stormborn\nA fierce warrior",
      [`${ADVENTURES_ROOT}/named/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const named = result.find((a) => a.id === "named");
    expect(named?.characterName).toBe("Aria Stormborn");
  });

  test("returns null characterName when no heading in character.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/nohead/character.md`]: "Just some text, no heading",
      [`${ADVENTURES_ROOT}/nohead/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const nohead = result.find((a) => a.id === "nohead");
    expect(nohead?.characterName).toBeNull();
  });

  test("returns null characterName when no character.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/nochar/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const nochar = result.find((a) => a.id === "nochar");
    expect(nochar?.characterName).toBeNull();
  });

  test("returns lastPlayed as ISO string from history.md mtime", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURES_ROOT}/played/history.md`]: "some history",
      [`${ADVENTURES_ROOT}/played/.keep`]: "",
    });
    const playDate = new Date("2026-03-15T10:30:00.000Z");
    fileOps.setMtime(`${ADVENTURES_ROOT}/played/history.md`, playDate);

    const service = createAdventureService({
      fileOps,
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const played = result.find((a) => a.id === "played");
    expect(played?.lastPlayed).toBe("2026-03-15T10:30:00.000Z");
  });

  test("returns null lastPlayed when no history.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/fresh/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const fresh = result.find((a) => a.id === "fresh");
    expect(fresh?.lastPlayed).toBeNull();
  });
});

describe("getAdventure", () => {
  test("returns detail with file contents", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/my-quest/character.md`]: "Brave hero",
      [`${ADVENTURES_ROOT}/my-quest/world.md`]: "Dark forest",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("my-quest");
    expect(result).toEqual({
      id: "my-quest",
      name: "my-quest",
      character: "Brave hero",
      world: "Dark forest",
      hasHistory: false,
      system: null,
      concept: null,
    });
  });

  test("returns nulls for missing files", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/empty-quest/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("empty-quest");
    expect(result).toEqual({
      id: "empty-quest",
      name: "empty-quest",
      character: null,
      world: null,
      hasHistory: false,
      system: null,
      concept: null,
    });
  });

  test("returns null for nonexistent adventure", async () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("does-not-exist");
    expect(result).toBeNull();
  });

  test("returns null for traversal attempt", async () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("../etc/passwd");
    expect(result).toBeNull();
  });

  test("returns frontmatter name over directory name", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/the-healers-burden/adventure.md`]:
        '---\nname: "The Healer\'s Burden"\nsystem: d20\n---\n\nA story of sacrifice.',
      [`${ADVENTURES_ROOT}/the-healers-burden/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("the-healers-burden");
    expect(result?.name).toBe("The Healer's Burden");
    expect(result?.concept).toBe("A story of sacrifice.");
    expect(result?.system).toBe("d20");
  });

  test("returns directory name when no frontmatter name", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/old-quest/adventure.md`]: "---\nsystem: d20\n---\n",
      [`${ADVENTURES_ROOT}/old-quest/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("old-quest");
    expect(result?.name).toBe("old-quest");
  });

  test("returns concept from adventure.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/concept-quest/adventure.md`]:
        "---\nsystem: d20\n---\n\nA dungeon beneath the mountain.",
      [`${ADVENTURES_ROOT}/concept-quest/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("concept-quest");
    expect(result?.concept).toBe("A dungeon beneath the mountain.");
    expect(result?.system).toBe("d20");
  });
});

describe("system field from adventure.md", () => {
  test("listAdventures returns system from adventure.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/dh-quest/character.md`]: "# Hero",
      [`${ADVENTURES_ROOT}/dh-quest/adventure.md`]: "---\nsystem: daggerheart\n---\n\nA Daggerheart adventure.",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.listAdventures();
    const quest = result.find((a) => a.id === "dh-quest");
    expect(quest?.system).toBe("daggerheart");
  });

  test("getAdventure returns system from adventure.md", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/d20-quest/character.md`]: "Fighter",
      [`${ADVENTURES_ROOT}/d20-quest/adventure.md`]: "---\nsystem: d20\n---\n",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("d20-quest");
    expect(result?.system).toBe("d20");
  });

  test("returns system: null when adventure.md has no system field", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/nofield/adventure.md`]: "---\ntitle: My Quest\n---\n",
      [`${ADVENTURES_ROOT}/nofield/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("nofield");
    expect(result?.system).toBeNull();
  });

  test("logs warning for malformed adventure.md YAML (REQ-SYS-4a)", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/broken/adventure.md`]: "---\nsystem: daggerheart\n",
      [`${ADVENTURES_ROOT}/broken/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      const result = await service.listAdventures();
      const broken = result.find((a) => a.id === "broken");
      expect(broken?.system).toBeNull();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain("broken");
      expect(warnings[0]).toContain("Malformed frontmatter");
    } finally {
      console.warn = origWarn;
    }
  });

  test("returns system: null when no adventure.md exists", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/bare/.keep`]: "",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getAdventure("bare");
    expect(result?.system).toBeNull();
  });
});

describe("getHistory", () => {
  test("returns content when history exists", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/history.md`]: "**Player:** Hello\n\n**GM:** Welcome",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getHistory("quest");
    expect(result).toEqual({
      exists: true,
      history: "**Player:** Hello\n\n**GM:** Welcome",
    });
  });

  test("returns exists:false when no history", async () => {
    const files: Record<string, string> = {
      [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
    };

    const service = createAdventureService({
      fileOps: createMockFileOps(files),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getHistory("quest");
    expect(result).toEqual({ exists: false, history: null });
  });

  test("returns exists:false for invalid ID", async () => {
    const service = createAdventureService({
      fileOps: createMockFileOps(),
      adventuresPath: ADVENTURES_ROOT,
    });

    const result = await service.getHistory("../etc/passwd");
    expect(result).toEqual({ exists: false, history: null });
  });
});
