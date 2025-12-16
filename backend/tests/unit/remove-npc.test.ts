/**
 * Unit tests for remove_npc MCP tool
 */

import { describe, test, expect } from "bun:test";
import {
  removeNpc,
  formatRemoveNpcResult,
  type RemoveNpcResult,
  type RemoveNpcError,
} from "../../src/mcp-tools/remove-npc";
import type { NPC, CombatState } from "../../src/types/protocol";

describe("removeNpc", () => {
  test("removes NPC from array", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin" },
      { id: "npc-2", name: "Orc" },
    ];
    let removedIndex = -1;

    const result = removeNpc(
      { name: "Goblin", reason: "defeated" },
      npcs,
      null,
      (index) => {
        removedIndex = index;
      },
      () => {}
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedNpc.name).toBe("Goblin");
      expect(result.reason).toBe("defeated");
      expect(result.removedFromCombat).toBe(false);
    }
    expect(removedIndex).toBe(0);
  });

  test("finds NPC case-insensitively", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin Scout" }];

    const result = removeNpc(
      { name: "goblin scout", reason: "fled" },
      npcs,
      null,
      () => {},
      () => {}
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedNpc.name).toBe("Goblin Scout");
      expect(result.reason).toBe("fled");
    }
  });

  test("uses 'other' as default reason", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin" }];

    const result = removeNpc(
      { name: "Goblin" },
      npcs,
      null,
      () => {},
      () => {}
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reason).toBe("other");
    }
  });

  test("returns error when NPC not found", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin" }];

    const result = removeNpc(
      { name: "Dragon", reason: "defeated" },
      npcs,
      null,
      () => {},
      () => {}
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('NPC "Dragon" not found');
      expect(result.error).toContain("Goblin");
    }
  });

  test("returns error when NPC list empty", () => {
    const npcs: NPC[] = [];

    const result = removeNpc(
      { name: "Goblin", reason: "defeated" },
      npcs,
      null,
      () => {},
      () => {}
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("none");
    }
  });

  test("removes NPC from combat initiative order", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin" },
    ];
    const combatState: CombatState = {
      active: true,
      round: 1,
      initiativeOrder: [
        { name: "Player", initiative: 15, isPlayer: true, conditions: [] },
        { name: "Goblin", initiative: 10, isPlayer: false, conditions: [] },
      ],
      currentIndex: 0,
      structure: "turn-based",
    };
    let removedFromInitiative = false;

    const result = removeNpc(
      { name: "Goblin", reason: "defeated" },
      npcs,
      combatState,
      () => {},
      () => {
        removedFromInitiative = true;
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedFromCombat).toBe(true);
    }
    expect(removedFromInitiative).toBe(true);
  });

  test("does not remove from combat when combat inactive", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin" }];
    const combatState: CombatState = {
      active: false,
      round: 0,
      initiativeOrder: [],
      currentIndex: 0,
      structure: "turn-based",
    };
    let removedFromInitiative = false;

    const result = removeNpc(
      { name: "Goblin", reason: "departed" },
      npcs,
      combatState,
      () => {},
      () => {
        removedFromInitiative = true;
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedFromCombat).toBe(false);
    }
    expect(removedFromInitiative).toBe(false);
  });

  test("does not remove player from initiative", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Hero" }];
    const combatState: CombatState = {
      active: true,
      round: 1,
      initiativeOrder: [
        { name: "Hero", initiative: 15, isPlayer: true, conditions: [] },
      ],
      currentIndex: 0,
      structure: "turn-based",
    };
    let removedFromInitiative = false;

    const result = removeNpc(
      { name: "Hero", reason: "other" },
      npcs,
      combatState,
      () => {},
      () => {
        removedFromInitiative = true;
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedFromCombat).toBe(false);
    }
    expect(removedFromInitiative).toBe(false);
  });

  test("preserves NPC data including reward", () => {
    const npcs: NPC[] = [
      {
        id: "npc-1",
        name: "Goblin",
        hp: { current: 0, max: 7 },
        reward: {
          xp: 50,
          loot: [{ name: "Gold", quantity: 10 }],
          storyFlag: "goblin_defeated",
        },
        inventory: [{ name: "Dagger", quantity: 1 }],
        notes: "Was guarding the entrance",
      },
    ];

    const result = removeNpc(
      { name: "Goblin", reason: "defeated" },
      npcs,
      null,
      () => {},
      () => {}
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.removedNpc.reward?.xp).toBe(50);
      expect(result.removedNpc.reward?.loot?.[0].name).toBe("Gold");
      expect(result.removedNpc.inventory?.[0].name).toBe("Dagger");
    }
  });
});

describe("formatRemoveNpcResult", () => {
  test("formats successful removal", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: {
        id: "npc-1",
        name: "Goblin",
        hp: { current: 0, max: 7 },
      },
      reason: "defeated",
      removedFromCombat: false,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("NPC Removed: Goblin");
    expect(formatted).toContain("Defeated (killed/subdued)");
    expect(formatted).toContain("Final HP: 0/7");
  });

  test("formats removal with combat flag", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: { id: "npc-1", name: "Orc" },
      reason: "defeated",
      removedFromCombat: true,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("Removed from combat initiative order");
  });

  test("formats with reward information", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: {
        id: "npc-1",
        name: "Goblin",
        reward: {
          xp: 50,
          loot: [{ name: "Gold", quantity: 10 }],
          storyFlag: "goblin_slain",
        },
      },
      reason: "defeated",
      removedFromCombat: false,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("Rewards Available");
    expect(formatted).toContain("XP: 50");
    expect(formatted).toContain("Loot: Gold (10)");
    expect(formatted).toContain("Story Flag: goblin_slain");
  });

  test("formats fled reason", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: { id: "npc-1", name: "Spy" },
      reason: "fled",
      removedFromCombat: false,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("Fled (escaped)");
  });

  test("formats departed reason", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: { id: "npc-1", name: "Merchant" },
      reason: "departed",
      removedFromCombat: false,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("Departed (left scene)");
  });

  test("formats with inventory and notes", () => {
    const result: RemoveNpcResult = {
      success: true,
      removedNpc: {
        id: "npc-1",
        name: "Guard",
        inventory: [
          { name: "Sword", quantity: 1 },
          { name: "Shield", quantity: 1 },
        ],
        notes: "Was stationed at the gate",
      },
      reason: "other",
      removedFromCombat: false,
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain("Inventory: Sword (1), Shield (1)");
    expect(formatted).toContain("Notes: Was stationed at the gate");
  });

  test("formats error result", () => {
    const result: RemoveNpcError = {
      success: false,
      error: 'NPC "Dragon" not found',
    };

    const formatted = formatRemoveNpcResult(result);

    expect(formatted).toContain('Error: NPC "Dragon" not found');
  });
});
