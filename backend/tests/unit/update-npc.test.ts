/**
 * Unit tests for update_npc MCP tool
 */

import { describe, test, expect } from "bun:test";
import {
  updateNpc,
  formatUpdateNpcResult,
  type UpdateNpcResult,
  type UpdateNpcError,
} from "../../src/mcp-tools/update-npc";
import type { NPC } from "../../src/types/protocol";

describe("updateNpc", () => {
  test("updates HP", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", hp: { current: 7, max: 7 } },
    ];

    const result = updateNpc(
      { name: "Goblin", hp: { current: 3, max: 7 } },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.hp).toEqual({ current: 3, max: 7 });
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toContain("hp:");
    }
    expect(npcs[0].hp).toEqual({ current: 3, max: 7 });
  });

  test("updates stats", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", stats: { strength: 8 } },
    ];

    const result = updateNpc(
      { name: "Goblin", stats: { strength: 10, dexterity: 14 } },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.stats).toEqual({ strength: 10, dexterity: 14 });
      expect(result.changes).toHaveLength(1);
    }
  });

  test("updates conditions", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", conditions: [] },
    ];

    const result = updateNpc(
      { name: "Goblin", conditions: ["poisoned", "frightened"] },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.conditions).toEqual(["poisoned", "frightened"]);
    }
    expect(npcs[0].conditions).toEqual(["poisoned", "frightened"]);
  });

  test("updates isHostile status", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Merchant", isHostile: false },
    ];

    const result = updateNpc(
      { name: "Merchant", isHostile: true },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.isHostile).toBe(true);
      expect(result.changes[0]).toContain("isHostile: false → true");
    }
  });

  test("updates notes", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Spy", notes: "Old notes" },
    ];

    const result = updateNpc(
      { name: "Spy", notes: "New notes" },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.notes).toBe("New notes");
      expect(result.changes[0]).toContain('"Old notes" → "New notes"');
    }
  });

  test("updates multiple fields at once", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", hp: { current: 7, max: 7 }, conditions: [] },
    ];

    const result = updateNpc(
      {
        name: "Goblin",
        hp: { current: 5, max: 7 },
        conditions: ["wounded"],
        notes: "Took a hit",
      },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.changes).toHaveLength(3);
      expect(result.npc.hp).toEqual({ current: 5, max: 7 });
      expect(result.npc.conditions).toEqual(["wounded"]);
      expect(result.npc.notes).toBe("Took a hit");
    }
  });

  test("preserves unchanged fields", () => {
    const npcs: NPC[] = [
      {
        id: "npc-1",
        name: "Goblin",
        stats: { strength: 8 },
        hp: { current: 7, max: 7 },
        isHostile: true,
      },
    ];

    const result = updateNpc({ name: "Goblin", hp: { current: 3, max: 7 } }, npcs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.stats).toEqual({ strength: 8 });
      expect(result.npc.isHostile).toBe(true);
      expect(result.changes).toHaveLength(1);
    }
  });

  test("finds NPC case-insensitively", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin Scout" },
    ];

    const result = updateNpc({ name: "goblin scout", isHostile: false }, npcs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.name).toBe("Goblin Scout");
    }
  });

  test("returns error when NPC not found", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin" },
    ];

    const result = updateNpc({ name: "Dragon", hp: { current: 50, max: 100 } }, npcs);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('NPC "Dragon" not found');
      expect(result.error).toContain("Goblin");
    }
  });

  test("returns error when NPC list empty", () => {
    const npcs: NPC[] = [];

    const result = updateNpc({ name: "Goblin", hp: { current: 5, max: 7 } }, npcs);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('NPC "Goblin" not found');
      expect(result.error).toContain("none");
    }
  });

  test("returns error when no updates provided", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin" },
    ];

    const result = updateNpc({ name: "Goblin" }, npcs);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No updates provided");
    }
  });

  test("updates inventory", () => {
    const npcs: NPC[] = [
      {
        id: "npc-1",
        name: "Merchant",
        inventory: [{ name: "Potion", quantity: 3 }],
      },
    ];

    const result = updateNpc(
      {
        name: "Merchant",
        inventory: [
          { name: "Potion", quantity: 5 },
          { name: "Scroll", quantity: 2 },
        ],
      },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.inventory).toHaveLength(2);
      expect(result.npc.inventory?.[0].quantity).toBe(5);
    }
  });

  test("updates reward", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", reward: { xp: 50 } },
    ];

    const result = updateNpc(
      {
        name: "Goblin",
        reward: { xp: 100, loot: [{ name: "Gold", quantity: 10 }] },
      },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.reward?.xp).toBe(100);
      expect(result.npc.reward?.loot?.[0].name).toBe("Gold");
    }
  });

  test("updates skills", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Rogue" },
    ];

    const result = updateNpc(
      {
        name: "Rogue",
        skills: { stealth: 5, acrobatics: 3 },
      },
      npcs
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.npc.skills).toEqual({ stealth: 5, acrobatics: 3 });
    }
  });
});

describe("formatUpdateNpcResult", () => {
  test("formats successful update", () => {
    const result: UpdateNpcResult = {
      success: true,
      npc: {
        id: "npc-1",
        name: "Goblin",
        hp: { current: 3, max: 7 },
        isHostile: true,
      },
      changes: ["hp: 7/7 → 3/7"],
    };

    const formatted = formatUpdateNpcResult(result);

    expect(formatted).toContain('Updated NPC "Goblin"');
    expect(formatted).toContain("hp: 7/7 → 3/7");
    expect(formatted).toContain("HP: 3/7");
    expect(formatted).toContain("Hostile: Yes");
  });

  test("formats multiple changes", () => {
    const result: UpdateNpcResult = {
      success: true,
      npc: {
        id: "npc-1",
        name: "Goblin",
        hp: { current: 5, max: 7 },
        conditions: ["wounded"],
        isHostile: true,
      },
      changes: ["hp: 7/7 → 5/7", "conditions: [] → [wounded]"],
    };

    const formatted = formatUpdateNpcResult(result);

    expect(formatted).toContain("Changes Made** (2)");
    expect(formatted).toContain("hp: 7/7 → 5/7");
    expect(formatted).toContain("conditions: [] → [wounded]");
    expect(formatted).toContain("Conditions: wounded");
  });

  test("formats with stats and skills", () => {
    const result: UpdateNpcResult = {
      success: true,
      npc: {
        id: "npc-1",
        name: "Fighter",
        stats: { strength: 16, dexterity: 12 },
        skills: { athletics: 5, intimidation: -1 },
        isHostile: true,
      },
      changes: ["stats: ... → ..."],
    };

    const formatted = formatUpdateNpcResult(result);

    expect(formatted).toContain("Stats: strength: 16");
    expect(formatted).toContain("Skills: athletics: +5, intimidation: -1");
  });

  test("formats error result", () => {
    const result: UpdateNpcError = {
      success: false,
      error: 'NPC "Dragon" not found',
    };

    const formatted = formatUpdateNpcResult(result);

    expect(formatted).toContain('Error: NPC "Dragon" not found');
  });

  test("formats with notes", () => {
    const result: UpdateNpcResult = {
      success: true,
      npc: {
        id: "npc-1",
        name: "Spy",
        isHostile: false,
        notes: "Working for the guild",
      },
      changes: ["notes: ... → ..."],
    };

    const formatted = formatUpdateNpcResult(result);

    expect(formatted).toContain("Notes: Working for the guild");
  });
});
