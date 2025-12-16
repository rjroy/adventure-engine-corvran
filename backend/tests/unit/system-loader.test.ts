/**
 * Unit tests for System Loader Service
 *
 * Tests all loading scenarios, validation rules, and edge cases.
 * All tests use temporary directories for isolation.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { loadSystemDefinition } from "../../src/services/system-loader";

let testDir: string;

beforeEach(async () => {
  // Create unique temp directory for each test
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), "system-loader-test-"));
});

afterEach(async () => {
  // Clean up temp directory
  await fs.rm(testDir, { recursive: true, force: true });
});

describe("System Loader - Single File Mode", () => {
  test("loads valid System.md with all sections", async () => {
    const content = `# RPG System

## Dice
This system uses d20, d6, and d4 for rolls.

## Attributes
Strength, Dexterity, Constitution

## Skills
Athletics, Stealth, Perception

## Combat
Turn-based combat with initiative.

## NPC Templates
### Goblin
HP: 10, Attack: +2
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);

    if (result && result.success) {
      const { definition } = result;
      expect(definition.rawContent).toBe(content);
      expect(definition.diceTypes).toEqual(["d20", "d4", "d6"]);
      expect(definition.hasAttributes).toBe(true);
      expect(definition.hasSkills).toBe(true);
      expect(definition.hasCombat).toBe(true);
      expect(definition.hasNPCTemplates).toBe(true);
      expect(definition.filePath).toContain("System.md");
    }
  });

  test("loads minimal System.md with only dice section", async () => {
    const content = `# Minimal System

## Dice
Uses d6 only.
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);

    if (result && result.success) {
      expect(result.definition.diceTypes).toEqual(["d6"]);
      expect(result.definition.hasAttributes).toBe(false);
      expect(result.definition.hasSkills).toBe(false);
      expect(result.definition.hasCombat).toBe(false);
      expect(result.definition.hasNPCTemplates).toBe(false);
    }
  });

  test("detects all standard dice types", async () => {
    const content = `# Dice System

## Dice Types
- d4 for minor damage
- d6 for standard rolls
- d8 for medium damage
- d10 for percentile (with d100)
- d12 for heavy damage
- d20 for skill checks
- d100 for percentile rolls
- dF for Fudge dice
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.diceTypes).toEqual([
        "d10",
        "d100",
        "d12",
        "d20",
        "d4",
        "d6",
        "d8",
        "dF",
      ]);
    }
  });

  test("handles case-insensitive dice notation", async () => {
    const content = `## Dice
Uses D20, D6, and DF for rolls.
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.diceTypes).toContain("d20");
      expect(result.definition.diceTypes).toContain("d6");
      expect(result.definition.diceTypes).toContain("dF");
    }
  });

  test("handles various heading levels for sections", async () => {
    const content = `# System

### Dice
d6 based

##### Attributes
STR, DEX

## Skills
Athletics

#### Combat
Narrative combat

###### NPC Templates
Goblin stats
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.hasAttributes).toBe(true);
      expect(result.definition.hasSkills).toBe(true);
      expect(result.definition.hasCombat).toBe(true);
      expect(result.definition.hasNPCTemplates).toBe(true);
    }
  });

  test("detects Monster Manual section as NPC templates", async () => {
    const content = `## Dice
d20

## Monster Manual
### Dragon
HP: 100
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.hasNPCTemplates).toBe(true);
    }
  });

  test("detects Creatures section as NPC templates", async () => {
    const content = `## Dice
d6

## Creatures
### Slime
HP: 5
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.hasNPCTemplates).toBe(true);
    }
  });

  test("returns error when dice section missing", async () => {
    const content = `# System

## Attributes
Strength, Dexterity

## Skills
Athletics
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);

    if (result && !result.success) {
      expect(result.error).toContain("Missing required \"Dice\" section");
      expect(result.error).toContain("System.md");
    }
  });

  test("returns error when dice section exists but no dice types found", async () => {
    const content = `## Dice
This system uses custom mechanics without standard dice.
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);

    if (result && !result.success) {
      expect(result.error).toContain("no dice types detected");
      expect(result.error).toContain("System.md");
    }
  });

  test("handles dice in expressions like 2d6+3", async () => {
    const content = `## Dice
Standard checks use 2d6+3. Damage is 1d8.
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.diceTypes).toEqual(["d6", "d8"]);
    }
  });
});

describe("System Loader - Directory Mode", () => {
  test("loads and concatenates multiple System/*.md files", async () => {
    const systemDir = path.join(testDir, "System");
    await fs.mkdir(systemDir);

    await fs.writeFile(
      path.join(systemDir, "01-core.md"),
      `# Core Rules

## Dice
d20 system
`,
    );

    await fs.writeFile(
      path.join(systemDir, "02-combat.md"),
      `# Combat Rules

## Combat
Initiative-based
`,
    );

    await fs.writeFile(
      path.join(systemDir, "03-npcs.md"),
      `# NPCs

## NPC Templates
### Goblin
Stats here
`,
    );

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);

    if (result && result.success) {
      // Content should be concatenated
      expect(result.definition.rawContent).toContain("Core Rules");
      expect(result.definition.rawContent).toContain("Combat Rules");
      expect(result.definition.rawContent).toContain("NPCs");

      // Features from all files detected
      expect(result.definition.diceTypes).toContain("d20");
      expect(result.definition.hasCombat).toBe(true);
      expect(result.definition.hasNPCTemplates).toBe(true);

      // File path should indicate multiple files
      expect(result.definition.filePath).toContain("System/*.md");
      expect(result.definition.filePath).toContain("3 files");
    }
  });

  test("processes files in alphabetical order", async () => {
    const systemDir = path.join(testDir, "System");
    await fs.mkdir(systemDir);

    await fs.writeFile(path.join(systemDir, "z-last.md"), "# Last\n");
    await fs.writeFile(path.join(systemDir, "a-first.md"), "# First\n## Dice\nd6\n");
    await fs.writeFile(path.join(systemDir, "m-middle.md"), "# Middle\n");

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      const content = result.definition.rawContent;
      const firstPos = content.indexOf("# First");
      const middlePos = content.indexOf("# Middle");
      const lastPos = content.indexOf("# Last");

      expect(firstPos).toBeLessThan(middlePos);
      expect(middlePos).toBeLessThan(lastPos);
    }
  });

  test("ignores non-markdown files in System directory", async () => {
    const systemDir = path.join(testDir, "System");
    await fs.mkdir(systemDir);

    await fs.writeFile(path.join(systemDir, "system.md"), "## Dice\nd20\n");
    await fs.writeFile(path.join(systemDir, "notes.txt"), "Ignore this");
    await fs.writeFile(path.join(systemDir, "data.json"), '{"ignore": true}');

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.rawContent).toContain("Dice");
      expect(result.definition.rawContent).not.toContain("Ignore this");
      expect(result.definition.rawContent).not.toContain("ignore");
      expect(result.definition.filePath).toContain("1 files");
    }
  });

  test("returns null for empty System directory", async () => {
    const systemDir = path.join(testDir, "System");
    await fs.mkdir(systemDir);

    const result = await loadSystemDefinition(testDir);

    expect(result).toBeNull();
  });

  test("returns error if dice section missing across multiple files", async () => {
    const systemDir = path.join(testDir, "System");
    await fs.mkdir(systemDir);

    await fs.writeFile(
      path.join(systemDir, "attributes.md"),
      "## Attributes\nSTR, DEX\n",
    );
    await fs.writeFile(
      path.join(systemDir, "skills.md"),
      "## Skills\nAthletics\n",
    );

    const result = await loadSystemDefinition(testDir);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);

    if (result && !result.success) {
      expect(result.error).toContain("Missing required \"Dice\" section");
    }
  });
});

describe("System Loader - No System Cases", () => {
  test("returns null when neither System.md nor System/ exists", async () => {
    // Empty adventure directory
    const result = await loadSystemDefinition(testDir);
    expect(result).toBeNull();
  });

  test("returns null when System.md is a directory", async () => {
    // Edge case: System.md exists but is a directory
    await fs.mkdir(path.join(testDir, "System.md"));

    const result = await loadSystemDefinition(testDir);
    expect(result).toBeNull();
  });

  test("returns null when System is a file instead of directory", async () => {
    // Edge case: System exists but is a file
    await fs.writeFile(path.join(testDir, "System"), "not a directory");

    const result = await loadSystemDefinition(testDir);
    expect(result).toBeNull();
  });
});

describe("System Loader - Error Handling", () => {
  test("returns error for permission denied on System.md", async () => {
    const systemPath = path.join(testDir, "System.md");
    await fs.writeFile(systemPath, "## Dice\nd20");

    // Make file unreadable
    await fs.chmod(systemPath, 0o000);

    const result = await loadSystemDefinition(testDir);

    // Restore permissions for cleanup
    await fs.chmod(systemPath, 0o644);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);

    if (result && !result.success) {
      expect(result.error).toContain("Failed to read");
      expect(result.error).toContain("System.md");
    }
  });

  test("includes file path in all error messages", async () => {
    const content = `## Attributes
No dice section`;
    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && !result.success) {
      expect(result.error).toContain(path.join(testDir, "System.md"));
    }
  });
});

describe("System Loader - Performance", () => {
  test("loads system definition in under 500ms", async () => {
    // Create a moderately-sized system file
    const content = `# Large System

## Dice
d20, d6, d8, d10, d12, d4, d100, dF

## Attributes
${"Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma\n".repeat(10)}

## Skills
${"Athletics, Acrobatics, Stealth, Perception\n".repeat(20)}

## Combat
${"Initiative rules, action economy, damage calculation\n".repeat(15)}

## NPC Templates
${Array.from({ length: 50 }, (_, i) => `### Creature ${i}\nHP: ${i * 10}\n`).join("\n")}
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const startTime = performance.now();
    const result = await loadSystemDefinition(testDir);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(result?.success).toBe(true);
    expect(duration).toBeLessThan(500);
  });
});

describe("System Loader - Edge Cases", () => {
  test("handles empty System.md file", async () => {
    await fs.writeFile(path.join(testDir, "System.md"), "");

    const result = await loadSystemDefinition(testDir);

    expect(result?.success).toBe(false);
  });

  test("handles System.md with only whitespace", async () => {
    await fs.writeFile(path.join(testDir, "System.md"), "   \n\n\t  \n");

    const result = await loadSystemDefinition(testDir);

    expect(result?.success).toBe(false);
  });

  test("handles unicode content in System.md", async () => {
    const content = `## 🎲 Dice
Uses d6 for rolls 🎯

## ⚔️ Combat
Turn-based combat with emoji! 🛡️
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      expect(result.definition.diceTypes).toContain("d6");
      expect(result.definition.hasCombat).toBe(true);
      expect(result.definition.rawContent).toContain("🎲");
    }
  });

  test("handles very long file paths", async () => {
    // Create nested directory structure
    let deepPath = testDir;
    for (let i = 0; i < 10; i++) {
      deepPath = path.join(deepPath, `level-${i}`);
      await fs.mkdir(deepPath);
    }

    await fs.writeFile(path.join(deepPath, "System.md"), "## Dice\nd20");

    const result = await loadSystemDefinition(deepPath);

    expect(result?.success).toBe(true);
  });

  test("handles system with mixed section naming", async () => {
    const content = `## Die
d6

## Attribute
STR

## Skill
Athletics
`;

    await fs.writeFile(path.join(testDir, "System.md"), content);

    const result = await loadSystemDefinition(testDir);

    if (result && result.success) {
      // "Die" should match for dice section
      expect(result.definition.diceTypes).toContain("d6");
      // "Attribute" (singular) should match
      expect(result.definition.hasAttributes).toBe(true);
      // "Skill" (singular) should match
      expect(result.definition.hasSkills).toBe(true);
    }
  });
});
