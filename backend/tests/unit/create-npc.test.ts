/**
 * Unit tests for create_npc MCP tool
 */

import { describe, test, expect } from "bun:test";
import {
  createNpc,
  parseNpcTemplates,
  formatCreateNpcResult,
  type CreateNpcResult,
  type CreateNpcError,
} from "../../src/mcp-tools/create-npc";
import type { NPC } from "../../src/types/protocol";
import type { SystemDefinition } from "../../src/types/state";

describe("createNpc", () => {
  test("creates NPC with basic name", () => {
    const result = createNpc({ name: "Goblin Scout" }, [], null);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.name).toBe("Goblin Scout");
      expect(result.npc.id).toBeDefined();
      expect(result.npc.isHostile).toBe(true);
      expect(result.templateUsed).toBeNull();
    }
  });

  test("creates NPC with all custom parameters", () => {
    const result = createNpc(
      {
        name: "Merchant Gorm",
        stats: { strength: 10, dexterity: 12 },
        skills: { persuasion: 4, deception: 2 },
        hp: { current: 20, max: 20 },
        conditions: ["hidden"],
        inventory: [{ name: "Gold Coins", quantity: 50 }],
        reward: { xp: 100, storyFlag: "met_merchant" },
        isHostile: false,
        notes: "Sells potions in the village square",
      },
      [],
      null
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.name).toBe("Merchant Gorm");
      expect(result.npc.stats).toEqual({ strength: 10, dexterity: 12 });
      expect(result.npc.skills).toEqual({ persuasion: 4, deception: 2 });
      expect(result.npc.hp).toEqual({ current: 20, max: 20 });
      expect(result.npc.conditions).toEqual(["hidden"]);
      expect(result.npc.inventory).toEqual([{ name: "Gold Coins", quantity: 50 }]);
      expect(result.npc.reward).toEqual({ xp: 100, storyFlag: "met_merchant" });
      expect(result.npc.isHostile).toBe(false);
      expect(result.npc.notes).toBe("Sells potions in the village square");
    }
  });

  test("generates unique UUID for each NPC", () => {
    const result1 = createNpc({ name: "NPC 1" }, [], null);
    const result2 = createNpc({ name: "NPC 2" }, [], null);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    if (result1.success && result2.success) {
      expect(result1.npc.id).not.toBe(result2.npc.id);
    }
  });

  test("rejects duplicate name (case-insensitive)", () => {
    const existingNpcs: NPC[] = [
      { id: "npc-1", name: "Goblin Scout" },
    ];

    const result = createNpc({ name: "goblin scout" }, existingNpcs, null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
      expect(result.error).toContain("goblin scout");
    }
  });

  test("uses template defaults when templateName provided", () => {
    const systemDefinition: SystemDefinition = {
      rawContent: `## NPC Templates
### Goblin
HP: 7
Attack: +2
Strength: 8
Dexterity: 14
`,
      diceTypes: ["d20"],
      hasAttributes: true,
      hasSkills: false,
      hasCombat: true,
      hasNPCTemplates: true,
      filePath: "/test/System.md",
    };

    const result = createNpc(
      { name: "Goblin Scout", templateName: "Goblin" },
      [],
      systemDefinition
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.templateName).toBe("Goblin");
      expect(result.npc.hp).toEqual({ current: 7, max: 7 });
      expect(result.npc.stats?.strength).toBe(8);
      expect(result.npc.stats?.dexterity).toBe(14);
      expect(result.npc.stats?.attack).toBe(2);
      expect(result.templateUsed).toBe("Goblin");
    }
  });

  test("overrides template defaults with explicit params", () => {
    const systemDefinition: SystemDefinition = {
      rawContent: `## NPC Templates
### Goblin
HP: 7
Strength: 8
`,
      diceTypes: ["d20"],
      hasAttributes: true,
      hasSkills: false,
      hasCombat: true,
      hasNPCTemplates: true,
      filePath: "/test/System.md",
    };

    const result = createNpc(
      {
        name: "Elite Goblin",
        templateName: "Goblin",
        hp: { current: 15, max: 15 },
        stats: { strength: 12, constitution: 10 },
      },
      [],
      systemDefinition
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.hp).toEqual({ current: 15, max: 15 });
      expect(result.npc.stats).toEqual({ strength: 12, constitution: 10 });
      expect(result.templateUsed).toBe("Goblin");
    }
  });

  test("handles missing template gracefully", () => {
    const systemDefinition: SystemDefinition = {
      rawContent: `## NPC Templates
### Goblin
HP: 7
`,
      diceTypes: ["d20"],
      hasAttributes: true,
      hasSkills: false,
      hasCombat: false,
      hasNPCTemplates: true,
      filePath: "/test/System.md",
    };

    const result = createNpc(
      { name: "Dragon", templateName: "Dragon" },
      [],
      systemDefinition
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.templateName).toBe("Dragon");
      expect(result.npc.notes).toContain("Template \"Dragon\" not found");
      expect(result.templateUsed).toBeNull();
    }
  });

  test("creates NPC without system definition", () => {
    const result = createNpc(
      { name: "Bandit", templateName: "Bandit" },
      [],
      null
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.name).toBe("Bandit");
      expect(result.templateUsed).toBeNull();
    }
  });
});

describe("parseNpcTemplates", () => {
  test("parses NPC Templates section", () => {
    const content = `## Dice
d20

## NPC Templates
### Goblin
HP: 7
Attack: +2

### Orc
HP: 15
Strength: 16
`;

    const templates = parseNpcTemplates(content);

    expect(templates.size).toBe(2);
    expect(templates.get("goblin")?.hp).toEqual({ current: 7, max: 7 });
    expect(templates.get("orc")?.hp).toEqual({ current: 15, max: 15 });
    expect(templates.get("orc")?.stats?.strength).toBe(16);
  });

  test("parses Monster Manual section", () => {
    const content = `## Monster Manual
### Dragon
HP: 100
`;

    const templates = parseNpcTemplates(content);

    expect(templates.size).toBe(1);
    expect(templates.get("dragon")?.hp).toEqual({ current: 100, max: 100 });
  });

  test("parses HP with current/max format", () => {
    const content = `## NPC Templates
### Wounded Soldier
HP: 5/10
`;

    const templates = parseNpcTemplates(content);

    expect(templates.get("wounded soldier")?.hp).toEqual({ current: 5, max: 10 });
  });

  test("detects non-hostile NPCs", () => {
    const content = `## NPC Templates
### Merchant
Friendly shopkeeper
HP: 10

### Bandit
Hostile thief
HP: 12
`;

    const templates = parseNpcTemplates(content);

    expect(templates.get("merchant")?.isHostile).toBe(false);
    expect(templates.get("bandit")?.isHostile).toBe(true);
  });

  test("returns empty map when no NPC section", () => {
    const content = `## Dice
d20

## Combat
Turn-based
`;

    const templates = parseNpcTemplates(content);

    expect(templates.size).toBe(0);
  });

  test("parses various stat formats", () => {
    const content = `## NPC Templates
### Test Creature
Strength: 14
Dexterity: 16
Constitution: 12
Intelligence: 10
Wisdom: 8
Charisma: 6
Defense: 15
Armor: 18
`;

    const templates = parseNpcTemplates(content);
    const stats = templates.get("test creature")?.stats;

    expect(stats?.strength).toBe(14);
    expect(stats?.dexterity).toBe(16);
    expect(stats?.constitution).toBe(12);
    expect(stats?.intelligence).toBe(10);
    expect(stats?.wisdom).toBe(8);
    expect(stats?.charisma).toBe(6);
    expect(stats?.defense).toBe(15);
    expect(stats?.armor).toBe(18);
  });
});

describe("formatCreateNpcResult", () => {
  test("formats successful creation", () => {
    const result: CreateNpcResult = {
      success: true,
      npc: {
        id: "test-id",
        name: "Goblin Scout",
        hp: { current: 7, max: 7 },
        isHostile: true,
      },
      message: "Created NPC \"Goblin Scout\"",
      templateUsed: null,
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("Created NPC \"Goblin Scout\"");
    expect(formatted).toContain("test-id");
    expect(formatted).toContain("Goblin Scout");
    expect(formatted).toContain("HP**: 7/7");
    expect(formatted).toContain("Hostile**: Yes");
  });

  test("formats creation from template", () => {
    const result: CreateNpcResult = {
      success: true,
      npc: {
        id: "test-id",
        name: "Goblin Scout",
        templateName: "Goblin",
        stats: { strength: 8 },
        hp: { current: 7, max: 7 },
        isHostile: true,
      },
      message: "Created NPC \"Goblin Scout\" from template \"Goblin\"",
      templateUsed: "Goblin",
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("from template \"Goblin\"");
    expect(formatted).toContain("Template**: Goblin");
    expect(formatted).toContain("Stats**: strength: 8");
  });

  test("formats with inventory and reward", () => {
    const result: CreateNpcResult = {
      success: true,
      npc: {
        id: "test-id",
        name: "Bandit",
        isHostile: true,
        inventory: [
          { name: "Dagger", quantity: 1 },
          { name: "Gold", quantity: 10 },
        ],
        reward: {
          xp: 50,
          loot: [{ name: "Dagger", quantity: 1 }],
          storyFlag: "defeated_bandit",
        },
      },
      message: "Created NPC \"Bandit\"",
      templateUsed: null,
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("Inventory**: Dagger (1), Gold (10)");
    expect(formatted).toContain("Reward**: 50 XP; Loot: Dagger; Flag: defeated_bandit");
  });

  test("formats with conditions and notes", () => {
    const result: CreateNpcResult = {
      success: true,
      npc: {
        id: "test-id",
        name: "Spy",
        isHostile: false,
        conditions: ["invisible", "frightened"],
        notes: "Works for the guild",
      },
      message: "Created NPC \"Spy\"",
      templateUsed: null,
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("Conditions**: invisible, frightened");
    expect(formatted).toContain("Notes**: Works for the guild");
  });

  test("formats skills with sign", () => {
    const result: CreateNpcResult = {
      success: true,
      npc: {
        id: "test-id",
        name: "Rogue",
        isHostile: true,
        skills: { stealth: 5, deception: -1 },
      },
      message: "Created NPC \"Rogue\"",
      templateUsed: null,
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("Skills**: stealth: +5, deception: -1");
  });

  test("formats error result", () => {
    const result: CreateNpcError = {
      success: false,
      error: "NPC with name \"Goblin\" already exists",
    };

    const formatted = formatCreateNpcResult(result);

    expect(formatted).toContain("Error: NPC with name \"Goblin\" already exists");
  });
});
