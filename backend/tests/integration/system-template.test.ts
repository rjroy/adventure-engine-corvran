/**
 * Integration test for the reference System.md template
 *
 * Verifies that:
 * 1. SystemLoader successfully loads the template
 * 2. All expected sections are detected
 * 3. NPC templates can be parsed from the template
 * 4. create_npc tool can extract template defaults
 */

import { describe, test, expect } from "bun:test";
import * as path from "node:path";
import { loadSystemDefinition } from "../../src/services/system-loader";
import { parseNpcTemplates } from "../../src/mcp-tools/create-npc";

describe("Reference System.md Template Integration", () => {
  const templatePath = path.resolve(
    __dirname,
    "../../docs/examples"
  );

  test("SystemLoader successfully loads the reference template", async () => {
    const result = await loadSystemDefinition(templatePath);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);

    if (result && result.success) {
      const { definition } = result;

      // All expected features should be present
      expect(definition.hasAttributes).toBe(true);
      expect(definition.hasSkills).toBe(true);
      expect(definition.hasCombat).toBe(true);
      expect(definition.hasNPCTemplates).toBe(true);
    }
  });

  test("SystemLoader detects all standard dice types", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const { diceTypes } = result.definition;

      // Should detect d4, d6, d8, d10, d12, d20, d100
      expect(diceTypes).toContain("d4");
      expect(diceTypes).toContain("d6");
      expect(diceTypes).toContain("d8");
      expect(diceTypes).toContain("d10");
      expect(diceTypes).toContain("d12");
      expect(diceTypes).toContain("d20");
      expect(diceTypes).toContain("d100");
    }
  });

  test("NPC template parser extracts all templates from System.md", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const templates = parseNpcTemplates(result.definition.rawContent);

      // Verify expected templates are present (keys are lowercase)
      expect(templates.has("goblin")).toBe(true);
      expect(templates.has("slime (gelatinous ooze)")).toBe(true);
      expect(templates.has("wolf")).toBe(true);
      expect(templates.has("bandit thug")).toBe(true);
      expect(templates.has("giant spider")).toBe(true);
      expect(templates.has("skeleton warrior")).toBe(true);

      // Verify at least 3 templates as required (we have 6)
      expect(templates.size).toBeGreaterThanOrEqual(3);
    }
  });

  test("Goblin template has correct stats", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const templates = parseNpcTemplates(result.definition.rawContent);
      const goblin = templates.get("goblin");

      expect(goblin).toBeDefined();
      if (goblin) {
        expect(goblin.name).toBe("Goblin");
        expect(goblin.hp).toEqual({ current: 7, max: 7 });
        expect(goblin.stats).toBeDefined();
        expect(goblin.stats?.strength).toBe(8);
        expect(goblin.stats?.dexterity).toBe(14);
        expect(goblin.stats?.constitution).toBe(10);
        expect(goblin.isHostile).toBe(true);
      }
    }
  });

  test("Slime template has correct stats", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const templates = parseNpcTemplates(result.definition.rawContent);
      const slime = templates.get("slime (gelatinous ooze)");

      expect(slime).toBeDefined();
      if (slime) {
        expect(slime.name).toBe("Slime (Gelatinous Ooze)");
        expect(slime.hp).toEqual({ current: 22, max: 22 });
        expect(slime.stats).toBeDefined();
        expect(slime.stats?.strength).toBe(12);
        expect(slime.stats?.dexterity).toBe(6);
        expect(slime.stats?.constitution).toBe(16);
        expect(slime.isHostile).toBe(true);
      }
    }
  });

  test("Wolf template has correct stats", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const templates = parseNpcTemplates(result.definition.rawContent);
      const wolf = templates.get("wolf");

      expect(wolf).toBeDefined();
      if (wolf) {
        expect(wolf.name).toBe("Wolf");
        expect(wolf.hp).toEqual({ current: 11, max: 11 });
        expect(wolf.stats).toBeDefined();
        expect(wolf.stats?.strength).toBe(12);
        expect(wolf.stats?.dexterity).toBe(15);
        expect(wolf.stats?.constitution).toBe(12);
        expect(wolf.isHostile).toBe(true);
      }
    }
  });

  test("Template content includes key sections for GM interpretation", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const content = result.definition.rawContent;

      // Verify key sections exist
      expect(content).toContain("## Resolution Mechanics");
      expect(content).toContain("## Attributes");
      expect(content).toContain("## Skills");
      expect(content).toContain("## Combat");
      expect(content).toContain("### Initiative");
      expect(content).toContain("### Attack Rolls");
      expect(content).toContain("### Damage");
      expect(content).toContain("### Incapacitation");

      // Verify resolution mechanics are described
      expect(content).toContain("1d20 + applicable modifier vs. Difficulty Class");
      expect(content).toContain("Difficulty Classes");

      // Verify attribute descriptions
      expect(content).toContain("Strength (STR)");
      expect(content).toContain("Dexterity (DEX)");
      expect(content).toContain("Constitution (CON)");
      expect(content).toContain("Intelligence (INT)");
      expect(content).toContain("Wisdom (WIS)");
      expect(content).toContain("Charisma (CHA)");
    }
  });

  test("Template includes customization guidance for adventure creators", async () => {
    const result = await loadSystemDefinition(templatePath);

    if (result && result.success) {
      const content = result.definition.rawContent;

      // Verify customization section exists
      expect(content).toContain("Adventure Creator's Customization Guide");
      expect(content).toContain("Adjusting Difficulty");
      expect(content).toContain("Creating Custom NPC Templates");
      expect(content).toContain("ADVENTURE CREATOR NOTES");
    }
  });
});
