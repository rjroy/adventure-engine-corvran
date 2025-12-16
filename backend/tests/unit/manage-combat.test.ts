/**
 * Unit tests for manage_combat MCP tool
 */

import { describe, test, expect } from "bun:test";
import type { CombatState, CombatantEntry, NPC } from "../../../shared/protocol";
import {
  startCombat,
  nextTurn,
  endCombat,
  isIncapacitated,
} from "../../src/mcp-tools/manage-combat";

describe("manage_combat tool", () => {
  describe("startCombat", () => {
    test("creates combat state with sorted combatants", () => {
      const combatants = [
        { name: "Goblin 1", initiativeRoll: 12, isPlayer: false },
        { name: "Player", initiativeRoll: 18, isPlayer: true },
        { name: "Goblin 2", initiativeRoll: 8, isPlayer: false },
      ];

      const result = startCombat(combatants);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const combatState = result.combatState!;
      expect(combatState.active).toBe(true);
      expect(combatState.round).toBe(1);
      expect(combatState.currentIndex).toBe(0);
      expect(combatState.structure).toBe("turn-based");

      // Should be sorted by initiative (highest first)
      expect(combatState.initiativeOrder).toEqual([
        { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
        { name: "Goblin 1", initiative: 12, isPlayer: false, conditions: [] },
        { name: "Goblin 2", initiative: 8, isPlayer: false, conditions: [] },
      ]);
    });

    test("handles ties in initiative (maintains input order)", () => {
      const combatants = [
        { name: "Goblin 1", initiativeRoll: 15, isPlayer: false },
        { name: "Player", initiativeRoll: 15, isPlayer: true },
      ];

      const result = startCombat(combatants);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // When tied, order should match input order
      expect(result.combatState!.initiativeOrder[0].name).toBe("Goblin 1");
      expect(result.combatState!.initiativeOrder[1].name).toBe("Player");
    });

    test("requires at least one combatant", () => {
      const result = startCombat([]);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain("at least one combatant");
    });

    test("sets structure to turn-based by default", () => {
      const combatants = [
        { name: "Player", initiativeRoll: 15, isPlayer: true },
      ];

      const result = startCombat(combatants);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.combatState!.structure).toBe("turn-based");
    });
  });

  describe("nextTurn", () => {
    test("advances to next combatant", () => {
      const combatState: CombatState = {
        active: true,
        round: 1,
        currentIndex: 0,
        structure: "turn-based",
        initiativeOrder: [
          { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
          { name: "Goblin", initiative: 12, isPlayer: false, conditions: [] },
        ],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin",
          hp: { current: 5, max: 7 },
          conditions: [],
        },
      ];

      const result = nextTurn(combatState, npcs);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.combatState!.currentIndex).toBe(1);
      expect(result.combatState!.round).toBe(1);
    });

    test("wraps to start and increments round", () => {
      const combatState: CombatState = {
        active: true,
        round: 1,
        currentIndex: 1, // Last combatant
        structure: "turn-based",
        initiativeOrder: [
          { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
          { name: "Goblin", initiative: 12, isPlayer: false, conditions: [] },
        ],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin",
          hp: { current: 5, max: 7 },
          conditions: [],
        },
      ];

      const result = nextTurn(combatState, npcs);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.combatState!.currentIndex).toBe(0);
      expect(result.combatState!.round).toBe(2);
    });

    test("skips incapacitated combatants", () => {
      const combatState: CombatState = {
        active: true,
        round: 1,
        currentIndex: 0,
        structure: "turn-based",
        initiativeOrder: [
          { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
          {
            name: "Goblin 1",
            initiative: 15,
            isPlayer: false,
            conditions: ["incapacitated"],
          },
          { name: "Goblin 2", initiative: 12, isPlayer: false, conditions: [] },
        ],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin 1",
          hp: { current: 0, max: 7 }, // Dead
          conditions: ["incapacitated"],
        },
        {
          id: "npc-2",
          name: "Goblin 2",
          hp: { current: 5, max: 7 },
          conditions: [],
        },
      ];

      const result = nextTurn(combatState, npcs);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should skip Goblin 1 and go to Goblin 2
      expect(result.combatState!.currentIndex).toBe(2);
      expect(result.combatState!.round).toBe(1);
    });

    test("skips multiple incapacitated combatants in a row", () => {
      const combatState: CombatState = {
        active: true,
        round: 1,
        currentIndex: 0,
        structure: "turn-based",
        initiativeOrder: [
          { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
          {
            name: "Goblin 1",
            initiative: 15,
            isPlayer: false,
            conditions: ["incapacitated"],
          },
          {
            name: "Goblin 2",
            initiative: 12,
            isPlayer: false,
            conditions: ["unconscious"],
          },
          { name: "Goblin 3", initiative: 10, isPlayer: false, conditions: [] },
        ],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin 1",
          hp: { current: 0, max: 7 },
          conditions: ["incapacitated"],
        },
        {
          id: "npc-2",
          name: "Goblin 2",
          hp: { current: 0, max: 7 },
          conditions: ["unconscious"],
        },
        {
          id: "npc-3",
          name: "Goblin 3",
          hp: { current: 5, max: 7 },
          conditions: [],
        },
      ];

      const result = nextTurn(combatState, npcs);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should skip both incapacitated goblins and go to Goblin 3
      expect(result.combatState!.currentIndex).toBe(3);
    });

    test("handles all combatants incapacitated", () => {
      const combatState: CombatState = {
        active: true,
        round: 1,
        currentIndex: 0,
        structure: "turn-based",
        initiativeOrder: [
          {
            name: "Player",
            initiative: 18,
            isPlayer: true,
            conditions: ["unconscious"],
          },
          {
            name: "Goblin",
            initiative: 12,
            isPlayer: false,
            conditions: ["incapacitated"],
          },
        ],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin",
          hp: { current: 0, max: 7 },
          conditions: ["incapacitated"],
        },
      ];

      const result = nextTurn(combatState, npcs);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain("All combatants are incapacitated");
    });

    test("requires active combat", () => {
      const combatState: CombatState = {
        active: false,
        round: 0,
        currentIndex: 0,
        structure: "turn-based",
        initiativeOrder: [],
      };

      const result = nextTurn(combatState, []);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain("No active combat");
    });
  });

  describe("endCombat", () => {
    test("clears combat state", () => {
      const combatState: CombatState = {
        active: true,
        round: 3,
        currentIndex: 1,
        structure: "turn-based",
        initiativeOrder: [
          { name: "Player", initiative: 18, isPlayer: true, conditions: [] },
          { name: "Goblin", initiative: 12, isPlayer: false, conditions: [] },
        ],
      };

      const result = endCombat(combatState);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.combatState).toBeNull();
      expect(result.message).toContain("ended");
    });

    test("handles ending already-ended combat", () => {
      const result = endCombat(null);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain("No active combat");
    });
  });

  describe("isIncapacitated", () => {
    test("detects incapacitated condition", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: ["incapacitated"],
      };

      expect(isIncapacitated(combatant, [])).toBe(true);
    });

    test("detects unconscious condition", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: ["unconscious"],
      };

      expect(isIncapacitated(combatant, [])).toBe(true);
    });

    test("detects dead condition", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: ["dead"],
      };

      expect(isIncapacitated(combatant, [])).toBe(true);
    });

    test("detects defeated condition", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: ["defeated"],
      };

      expect(isIncapacitated(combatant, [])).toBe(true);
    });

    test("detects HP = 0 for NPCs", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: [],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin",
          hp: { current: 0, max: 7 },
        },
      ];

      expect(isIncapacitated(combatant, npcs)).toBe(true);
    });

    test("returns false for active NPC", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: [],
      };

      const npcs: NPC[] = [
        {
          id: "npc-1",
          name: "Goblin",
          hp: { current: 5, max: 7 },
        },
      ];

      expect(isIncapacitated(combatant, npcs)).toBe(false);
    });

    test("returns false for combatant without conditions", () => {
      const combatant: CombatantEntry = {
        name: "Player",
        initiative: 18,
        isPlayer: true,
        conditions: [],
      };

      expect(isIncapacitated(combatant, [])).toBe(false);
    });

    test("case-insensitive condition matching", () => {
      const combatant: CombatantEntry = {
        name: "Goblin",
        initiative: 12,
        isPlayer: false,
        conditions: ["INCAPACITATED"],
      };

      expect(isIncapacitated(combatant, [])).toBe(true);
    });
  });
});
