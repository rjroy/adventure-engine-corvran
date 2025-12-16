/**
 * Unit tests for mock SDK RPG tool detection
 */

import { describe, test, expect } from "bun:test";
import {
  detectDiceTool,
  detectCreateNpcTool,
  detectApplyDamageTool,
  detectManageCombatTool,
} from "../../src/mock-sdk";

describe("Mock SDK - Dice Detection", () => {
  test("detects roll keyword", () => {
    const result = detectDiceTool("i want to roll for stealth");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("roll_dice");
    expect(result?.input.expression).toBe("1d20+5");
    expect(result?.input.context).toBe("Stealth check");
  });

  test("detects attack keyword", () => {
    const result = detectDiceTool("i attack the goblin");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("roll_dice");
    expect(result?.input.expression).toBe("1d20+3");
    expect(result?.input.context).toBe("Attack roll");
  });

  test("returns null for non-dice input", () => {
    const result = detectDiceTool("i walk north");
    expect(result).toBeNull();
  });
});

describe("Mock SDK - Create NPC Detection", () => {
  test("detects goblin encounter", () => {
    const result = detectCreateNpcTool("a goblin appears from the shadows");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("create_npc");
    expect(result?.input.name).toBe("Goblin Scout");
    expect(result?.input.templateName).toBe("Goblin");
    expect(result?.input.hp).toEqual({ current: 7, max: 7 });
    expect(result?.input.isHostile).toBe(true);
  });

  test("detects orc encounter", () => {
    const result = detectCreateNpcTool("you see an orc warrior approaching");
    expect(result).not.toBeNull();
    expect(result?.input.name).toBe("Orc Warrior");
    expect(result?.input.templateName).toBe("Orc");
    expect(result?.input.hp).toEqual({ current: 15, max: 15 });
  });

  test("returns null when no NPC keywords", () => {
    const result = detectCreateNpcTool("i walk through the forest");
    expect(result).toBeNull();
  });
});

describe("Mock SDK - Apply Damage Detection", () => {
  test("detects player damage", () => {
    const result = detectApplyDamageTool("the goblin hits me");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("apply_damage");
    expect(result?.input.target).toBe("player");
    expect(result?.input.amount).toBe(5);
    expect(result?.input.damageType).toBe("slashing");
  });

  test("detects NPC damage", () => {
    const result = detectApplyDamageTool("my attack hits the goblin");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("apply_damage");
    expect(result?.input.target).toBe("npc");
    expect(result?.input.npcName).toBe("Goblin Scout");
    expect(result?.input.amount).toBe(8);
  });

  test("detects fire damage", () => {
    const result = detectApplyDamageTool("fire damage hits the enemy");
    expect(result).not.toBeNull();
    expect(result?.input.damageType).toBe("fire");
  });

  test("returns null for non-damage input", () => {
    const result = detectApplyDamageTool("i walk away");
    expect(result).toBeNull();
  });
});

describe("Mock SDK - Manage Combat Detection", () => {
  test("detects combat start", () => {
    const result = detectManageCombatTool("start combat with initiative");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("manage_combat");
    expect(result?.input.action).toBe("start");
    expect(result?.input.combatants).toHaveLength(2);
    expect(result?.input.combatants?.[0].name).toBe("Player");
    expect(result?.input.combatants?.[0].isPlayer).toBe(true);
    expect(result?.input.combatants?.[1].name).toBe("Goblin Scout");
  });

  test("detects next turn", () => {
    const result = detectManageCombatTool("end my turn");
    expect(result).not.toBeNull();
    expect(result?.input.action).toBe("next_turn");
  });

  test("detects end combat", () => {
    const result = detectManageCombatTool("end combat");
    expect(result).not.toBeNull();
    expect(result?.input.action).toBe("end");
  });

  test("returns null for non-combat input", () => {
    const result = detectManageCombatTool("i search the room");
    expect(result).toBeNull();
  });
});
