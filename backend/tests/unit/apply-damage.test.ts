/**
 * Unit tests for apply_damage MCP tool
 */

import { describe, test, expect } from "bun:test";
import {
  applyDamageToPlayer,
  applyDamageToNpc,
  formatApplyDamageResult,
  type ApplyDamageResult,
  type ApplyDamageError,
} from "../../src/mcp-tools/apply-damage";
import type { PlayerCharacter, NPC } from "../../src/types/protocol";

describe("applyDamageToPlayer", () => {
  test("applies damage and reduces HP", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 20, max: 30 },
    };

    const result = applyDamageToPlayer(pc, 5, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previousHp).toBe(20);
      expect(result.newHp).toBe(15);
      expect(result.amount).toBe(5);
      expect(result.incapacitated).toBe(false);
    }
    expect(pc.hp?.current).toBe(15);
  });

  test("applies healing with negative amount", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 15, max: 30 },
    };

    const result = applyDamageToPlayer(pc, -10, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previousHp).toBe(15);
      expect(result.newHp).toBe(25);
      expect(result.incapacitated).toBe(false);
    }
    expect(pc.hp?.current).toBe(25);
  });

  test("bounds HP at 0 (no negative HP)", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 5, max: 30 },
    };

    const result = applyDamageToPlayer(pc, 20, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previousHp).toBe(5);
      expect(result.newHp).toBe(0);
      expect(result.incapacitated).toBe(true);
    }
    expect(pc.hp?.current).toBe(0);
  });

  test("bounds HP at max (no overheal)", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 25, max: 30 },
    };

    const result = applyDamageToPlayer(pc, -20, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.newHp).toBe(30);
    }
    expect(pc.hp?.current).toBe(30);
  });

  test("applies conditions to character", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 20, max: 30 },
    };

    const result = applyDamageToPlayer(pc, 5, "poison", ["poisoned", "weakened"]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conditionsApplied).toEqual(["poisoned", "weakened"]);
      expect(result.damageType).toBe("poison");
    }
    expect(pc.conditions).toEqual(["poisoned", "weakened"]);
  });

  test("does not duplicate existing conditions", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 20, max: 30 },
      conditions: ["poisoned"],
    };

    applyDamageToPlayer(pc, 5, null, ["poisoned", "stunned"]);

    expect(pc.conditions).toEqual(["poisoned", "stunned"]);
  });

  test("returns error when character has no HP defined", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
    };

    const result = applyDamageToPlayer(pc, 5, null, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have HP defined");
    }
  });

  test("detects incapacitation at exactly 0 HP", () => {
    const pc: PlayerCharacter = {
      name: "Hero",
      attributes: {},
      hp: { current: 5, max: 30 },
    };

    const result = applyDamageToPlayer(pc, 5, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.newHp).toBe(0);
      expect(result.incapacitated).toBe(true);
    }
  });
});

describe("applyDamageToNpc", () => {
  test("applies damage to NPC by name", () => {
    const npcs: NPC[] = [
      { id: "npc-1", name: "Goblin", hp: { current: 10, max: 10 } },
      { id: "npc-2", name: "Orc", hp: { current: 20, max: 20 } },
    ];

    const result = applyDamageToNpc(npcs, "Goblin", 5, "slashing", []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.targetName).toBe("Goblin");
      expect(result.previousHp).toBe(10);
      expect(result.newHp).toBe(5);
      expect(result.damageType).toBe("slashing");
    }
    expect(npcs[0].hp?.current).toBe(5);
  });

  test("finds NPC case-insensitively", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin Shaman", hp: { current: 15, max: 15 } }];

    const result = applyDamageToNpc(npcs, "goblin shaman", 5, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.targetName).toBe("Goblin Shaman");
    }
  });

  test("returns error when NPC not found", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin", hp: { current: 10, max: 10 } }];

    const result = applyDamageToNpc(npcs, "Dragon", 5, null, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('NPC "Dragon" not found');
      expect(result.error).toContain("Goblin");
    }
  });

  test("returns error when NPC has no HP defined", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Merchant" }];

    const result = applyDamageToNpc(npcs, "Merchant", 5, null, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have HP defined");
    }
  });

  test("applies conditions to NPC", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin", hp: { current: 10, max: 10 } }];

    applyDamageToNpc(npcs, "Goblin", 3, "fire", ["burning"]);

    expect(npcs[0].conditions).toEqual(["burning"]);
  });

  test("detects NPC incapacitation", () => {
    const npcs: NPC[] = [{ id: "npc-1", name: "Goblin", hp: { current: 5, max: 10 } }];

    const result = applyDamageToNpc(npcs, "Goblin", 10, null, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.incapacitated).toBe(true);
      expect(result.newHp).toBe(0);
    }
  });
});

describe("formatApplyDamageResult", () => {
  test("formats damage result", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Hero",
      previousHp: 20,
      newHp: 15,
      maxHp: 30,
      amount: 5,
      damageType: null,
      conditionsApplied: [],
      incapacitated: false,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("Damage Applied to Hero");
    expect(formatted).toContain("HP: 20 → 15/30");
    expect(formatted).toContain("-5");
  });

  test("formats healing result", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Hero",
      previousHp: 15,
      newHp: 25,
      maxHp: 30,
      amount: -10,
      damageType: null,
      conditionsApplied: [],
      incapacitated: false,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("Healing Applied to Hero");
    expect(formatted).toContain("HP: 15 → 25/30");
    expect(formatted).toContain("+10");
  });

  test("includes damage type when specified", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Goblin",
      previousHp: 10,
      newHp: 5,
      maxHp: 10,
      amount: 5,
      damageType: "fire",
      conditionsApplied: [],
      incapacitated: false,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("(fire)");
  });

  test("includes conditions when applied", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Hero",
      previousHp: 20,
      newHp: 15,
      maxHp: 30,
      amount: 5,
      damageType: null,
      conditionsApplied: ["poisoned", "weakened"],
      incapacitated: false,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("Conditions applied: poisoned, weakened");
  });

  test("shows incapacitation warning", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Goblin",
      previousHp: 5,
      newHp: 0,
      maxHp: 10,
      amount: 10,
      damageType: null,
      conditionsApplied: [],
      incapacitated: true,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("INCAPACITATED");
    expect(formatted).toContain("Goblin");
  });

  test("shows bounded actual change when different from amount", () => {
    const result: ApplyDamageResult = {
      success: true,
      targetName: "Hero",
      previousHp: 5,
      newHp: 0,
      maxHp: 30,
      amount: 20,
      damageType: null,
      conditionsApplied: [],
      incapacitated: true,
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("bounded");
  });

  test("formats error result", () => {
    const result: ApplyDamageError = {
      success: false,
      error: "NPC not found",
    };

    const formatted = formatApplyDamageResult(result);

    expect(formatted).toContain("Error: NPC not found");
  });
});
