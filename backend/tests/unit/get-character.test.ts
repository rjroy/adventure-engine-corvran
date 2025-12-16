// get_character Tool Tests
// Unit tests for the get_character MCP tool

import { describe, test, expect } from "bun:test";
import { getCharacterToolDefinition, formatCharacterForDisplay } from "../../src/mcp-tools/get-character";
import type { PlayerCharacter } from "../../../shared/protocol";

describe("get_character MCP Tool", () => {
  describe("tool definition", () => {
    test("has correct name", () => {
      expect(getCharacterToolDefinition.name).toBe("get_character");
    });

    test("has descriptive description", () => {
      expect(getCharacterToolDefinition.description).toContain("player character");
      expect(getCharacterToolDefinition.description).toContain("stats");
      expect(getCharacterToolDefinition.description).toContain("inventory");
    });

    test("requires no parameters", () => {
      expect(getCharacterToolDefinition.input_schema.required).toEqual([]);
    });
  });

  describe("formatCharacterForDisplay", () => {
    test("returns character not created message for empty character", () => {
      const emptyCharacter: PlayerCharacter = {
        name: null,
        attributes: {},
      };

      const result = formatCharacterForDisplay(emptyCharacter);

      expect(result).toContain("Character not yet created");
      expect(result).toContain("Guide them through character creation");
    });

    test("returns formatted character with basic info", () => {
      const character: PlayerCharacter = {
        name: "Elara",
        attributes: { background: "noble" },
        stats: { strength: 14, dexterity: 16, constitution: 12 },
        hp: { current: 25, max: 30 },
        level: 3,
        xp: 2500,
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("## Elara");
      expect(result).toContain("strength: 14");
      expect(result).toContain("dexterity: 16");
      expect(result).toContain("**HP**: 25/30");
      expect(result).toContain("Level 3");
      expect(result).toContain("2500 XP");
    });

    test("includes skills when defined", () => {
      const character: PlayerCharacter = {
        name: "Rogue",
        attributes: {},
        skills: { stealth: 7, perception: 4, acrobatics: 5 },
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("**Skills**");
      expect(result).toContain("stealth: +7");
      expect(result).toContain("perception: +4");
    });

    test("includes conditions when present", () => {
      const character: PlayerCharacter = {
        name: "Warrior",
        attributes: {},
        stats: { strength: 18 },
        hp: { current: 10, max: 50 },
        conditions: ["poisoned", "exhausted"],
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("**Conditions**");
      expect(result).toContain("poisoned, exhausted");
    });

    test("includes inventory with quantities and equipped status", () => {
      const character: PlayerCharacter = {
        name: "Adventurer",
        attributes: {},
        inventory: [
          { name: "Longsword", quantity: 1, equipped: true },
          { name: "Health Potion", quantity: 3 },
          { name: "Gold Coins", quantity: 50 },
        ],
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("**Inventory**");
      expect(result).toContain("- Longsword [equipped]");
      expect(result).toContain("- Health Potion (x3)");
      expect(result).toContain("- Gold Coins (x50)");
    });

    test("shows critical HP status when low", () => {
      const character: PlayerCharacter = {
        name: "Wounded",
        attributes: {},
        hp: { current: 5, max: 40 },
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("(Critical!)");
    });

    test("shows bloodied status at 50% or less", () => {
      const character: PlayerCharacter = {
        name: "Hurt",
        attributes: {},
        hp: { current: 20, max: 40 },
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("(Bloodied)");
    });

    test("shows incapacitated at 0 HP", () => {
      const character: PlayerCharacter = {
        name: "Fallen",
        attributes: {},
        hp: { current: 0, max: 40 },
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("(Incapacitated!)");
    });

    test("handles character with only name", () => {
      const character: PlayerCharacter = {
        name: "Simple",
        attributes: {},
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("## Simple");
      // Should not have stats/skills/hp sections
      expect(result).not.toContain("**Stats**");
      expect(result).not.toContain("**HP**");
    });

    test("shows negative skill modifiers correctly", () => {
      const character: PlayerCharacter = {
        name: "Clumsy",
        attributes: {},
        skills: { athletics: -2, stealth: 0, perception: 3 },
      };

      const result = formatCharacterForDisplay(character);

      expect(result).toContain("athletics: -2");
      expect(result).toContain("stealth: +0");
      expect(result).toContain("perception: +3");
    });
  });
});
