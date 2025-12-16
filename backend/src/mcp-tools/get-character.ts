/**
 * MCP Tool: get_character
 *
 * Returns the current player character state to the GM.
 * Provides read-only access to character stats, skills, HP, conditions, and inventory.
 *
 * Tool registered as: mcp__adventure-rpg__get_character
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { PlayerCharacter } from "../../../shared/protocol";

/**
 * Static tool definition for the get_character tool.
 * Used when passing tool schema to the SDK query.
 */
export const getCharacterToolDefinition = {
  name: "get_character",
  description: `Retrieve the current player character's full state.

Returns:
- name: Character name (null if not yet created)
- stats: Attribute scores (strength, dexterity, etc.)
- skills: Skill proficiencies and modifiers
- hp: Current and maximum hit points
- conditions: Active status effects
- inventory: Items carried
- xp: Experience points
- level: Character level

Use this to check character state before making decisions about:
- Difficulty of skill checks
- Available abilities
- Health status for combat
- Inventory for puzzles`,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
} as const;

/**
 * Format the player character for display in tool response.
 * Exported for testing purposes.
 * @param pc PlayerCharacter object
 * @returns Formatted string representation
 */
export function formatCharacterForDisplay(pc: PlayerCharacter): string {
  if (!pc.name && !pc.stats) {
    return `Character not yet created.

The player has not created their character yet. Guide them through character creation:
1. Ask for their character's name
2. Help them allocate stats per the system rules
3. Choose skills and background
4. Set initial HP based on system formula
5. Persist the character using Write tool to ./player.md`;
  }

  const lines: string[] = [];

  // Basic info
  lines.push(`## ${pc.name ?? "Unnamed Character"}`);

  // Stats
  if (pc.stats && Object.keys(pc.stats).length > 0) {
    const statsStr = Object.entries(pc.stats)
      .map(([stat, value]) => `${stat}: ${value}`)
      .join(", ");
    lines.push(`**Stats**: ${statsStr}`);
  }

  // Skills
  if (pc.skills && Object.keys(pc.skills).length > 0) {
    const skillsStr = Object.entries(pc.skills)
      .map(([skill, value]) => `${skill}: ${value >= 0 ? "+" : ""}${value}`)
      .join(", ");
    lines.push(`**Skills**: ${skillsStr}`);
  }

  // HP
  if (pc.hp) {
    const hpPercent = Math.round((pc.hp.current / pc.hp.max) * 100);
    let hpStatus = "";
    if (pc.hp.current <= 0) hpStatus = " (Incapacitated!)";
    else if (hpPercent <= 25) hpStatus = " (Critical!)";
    else if (hpPercent <= 50) hpStatus = " (Bloodied)";
    lines.push(`**HP**: ${pc.hp.current}/${pc.hp.max}${hpStatus}`);
  }

  // Level & XP
  if (pc.level !== undefined || pc.xp !== undefined) {
    const levelInfo = [];
    if (pc.level !== undefined) levelInfo.push(`Level ${pc.level}`);
    if (pc.xp !== undefined) levelInfo.push(`${pc.xp} XP`);
    lines.push(`**Progress**: ${levelInfo.join(" | ")}`);
  }

  // Conditions
  if (pc.conditions && pc.conditions.length > 0) {
    lines.push(`**Conditions**: ${pc.conditions.join(", ")}`);
  }

  // Inventory
  if (pc.inventory && pc.inventory.length > 0) {
    lines.push(`**Inventory**:`);
    for (const item of pc.inventory) {
      const qty = item.quantity > 1 ? ` (x${item.quantity})` : "";
      const equipped = item.equipped ? " [equipped]" : "";
      lines.push(`- ${item.name}${qty}${equipped}`);
    }
  }

  return lines.join("\n");
}

/**
 * Create the get_character tool using the SDK's tool() helper.
 * @param getPlayerCharacter Function to retrieve current player character from state
 */
export function createGetCharacterTool(
  getPlayerCharacter: () => PlayerCharacter
) {
  return tool(
    "get_character",
    `Retrieve the current player character's full state including stats, skills, HP, conditions, inventory, XP, and level. Use this before making decisions about skill check difficulty, available abilities, or combat tactics.`,
    {
      // No parameters required - just retrieves current state
      _placeholder: z.string().optional().describe("Not used - tool takes no parameters"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (_args) => {
      const pc = getPlayerCharacter();
      const formatted = formatCharacterForDisplay(pc);

      return {
        content: [
          {
            type: "text" as const,
            text: formatted,
          },
        ],
      };
    }
  );
}
