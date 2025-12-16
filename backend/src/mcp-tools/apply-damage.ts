/**
 * MCP Tool: apply_damage
 *
 * Applies damage or healing to the player character or NPCs.
 * Handles HP bounds checking, condition application, and incapacitation detection.
 *
 * Tool registered as: mcp__adventure-rpg__apply_damage
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { PlayerCharacter, NPC } from "../../../shared/protocol";

/**
 * Result of applying damage
 */
export interface ApplyDamageResult {
  success: true;
  targetName: string;
  previousHp: number;
  newHp: number;
  maxHp: number;
  amount: number;
  damageType: string | null;
  conditionsApplied: string[];
  incapacitated: boolean;
}

/**
 * Error result from apply_damage
 */
export interface ApplyDamageError {
  success: false;
  error: string;
}

/**
 * Result type for applyDamage function
 */
export type ApplyDamageReturn = ApplyDamageResult | ApplyDamageError;

/**
 * Static tool definition for the apply_damage tool.
 */
export const applyDamageToolDefinition = {
  name: "apply_damage",
  description: `Apply damage or healing to the player character or an NPC.

Positive amount = damage (reduces HP)
Negative amount = healing (restores HP)

HP is bounded: cannot go below 0 or above max.
Returns incapacitated=true when target reaches 0 HP.

Examples:
- apply_damage(target="player", amount=5) → Player takes 5 damage
- apply_damage(target="player", amount=-10) → Player heals 10 HP
- apply_damage(target="npc", npcName="Goblin", amount=8, damageType="fire")
- apply_damage(target="player", amount=3, applyConditions=["poisoned"])`,
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["player", "npc"],
        description: "Target type: 'player' for player character, 'npc' for NPCs",
      },
      npcName: {
        type: "string",
        description: "Required when target='npc'. Name of the NPC to target.",
      },
      amount: {
        type: "number",
        description: "Damage amount (positive) or healing (negative)",
      },
      damageType: {
        type: "string",
        description: "Optional. Type of damage (e.g., 'fire', 'slashing', 'psychic')",
      },
      applyConditions: {
        type: "array",
        items: { type: "string" },
        description: "Optional. Conditions to apply (e.g., ['poisoned', 'frightened'])",
      },
    },
    required: ["target", "amount"],
  },
} as const;

/**
 * Apply damage to player character
 */
export function applyDamageToPlayer(
  pc: PlayerCharacter,
  amount: number,
  damageType: string | null,
  conditions: string[]
): ApplyDamageReturn {
  // Validate character has HP defined
  if (!pc.hp) {
    return {
      success: false,
      error: "Player character does not have HP defined. Create character first with hp.current and hp.max.",
    };
  }

  const previousHp = pc.hp.current;
  const maxHp = pc.hp.max;

  // Calculate new HP with bounds checking
  let newHp = previousHp - amount; // Negative amount = healing
  if (newHp < 0) newHp = 0;
  if (newHp > maxHp) newHp = maxHp;

  // Update HP
  pc.hp.current = newHp;

  // Apply conditions
  if (conditions.length > 0) {
    if (!pc.conditions) {
      pc.conditions = [];
    }
    for (const condition of conditions) {
      if (!pc.conditions.includes(condition)) {
        pc.conditions.push(condition);
      }
    }
  }

  const incapacitated = newHp === 0;

  return {
    success: true,
    targetName: pc.name ?? "Player",
    previousHp,
    newHp,
    maxHp,
    amount,
    damageType,
    conditionsApplied: conditions,
    incapacitated,
  };
}

/**
 * Apply damage to an NPC
 */
export function applyDamageToNpc(
  npcs: NPC[],
  npcName: string,
  amount: number,
  damageType: string | null,
  conditions: string[]
): ApplyDamageReturn {
  // Find NPC by name (case-insensitive)
  const npc = npcs.find(
    (n) => n.name.toLowerCase() === npcName.toLowerCase()
  );

  if (!npc) {
    return {
      success: false,
      error: `NPC "${npcName}" not found. Available NPCs: ${npcs.map((n) => n.name).join(", ") || "none"}`,
    };
  }

  // Validate NPC has HP defined
  if (!npc.hp) {
    return {
      success: false,
      error: `NPC "${npc.name}" does not have HP defined. Update NPC with hp.current and hp.max first.`,
    };
  }

  const previousHp = npc.hp.current;
  const maxHp = npc.hp.max;

  // Calculate new HP with bounds checking
  let newHp = previousHp - amount;
  if (newHp < 0) newHp = 0;
  if (newHp > maxHp) newHp = maxHp;

  // Update HP
  npc.hp.current = newHp;

  // Apply conditions
  if (conditions.length > 0) {
    if (!npc.conditions) {
      npc.conditions = [];
    }
    for (const condition of conditions) {
      if (!npc.conditions.includes(condition)) {
        npc.conditions.push(condition);
      }
    }
  }

  const incapacitated = newHp === 0;

  return {
    success: true,
    targetName: npc.name,
    previousHp,
    newHp,
    maxHp,
    amount,
    damageType,
    conditionsApplied: conditions,
    incapacitated,
  };
}

/**
 * Format the apply_damage result for display
 */
export function formatApplyDamageResult(result: ApplyDamageReturn): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const { targetName, previousHp, newHp, maxHp, amount, damageType, conditionsApplied, incapacitated } = result;

  const actionType = amount > 0 ? "Damage" : "Healing";
  const actualChange = Math.abs(previousHp - newHp);
  const damageTypeStr = damageType ? ` (${damageType})` : "";

  let output = `**${actionType} Applied to ${targetName}${damageTypeStr}**\n`;
  output += `HP: ${previousHp} → ${newHp}/${maxHp}`;

  if (actualChange !== Math.abs(amount)) {
    output += ` (${amount > 0 ? "-" : "+"}${actualChange} actual, bounded)`;
  } else {
    output += ` (${amount > 0 ? "-" : "+"}${Math.abs(amount)})`;
  }

  if (conditionsApplied.length > 0) {
    output += `\nConditions applied: ${conditionsApplied.join(", ")}`;
  }

  if (incapacitated) {
    output += `\n\n⚠️ **${targetName} is INCAPACITATED!** (HP = 0)`;
  }

  return output;
}

/**
 * Create the apply_damage tool using the SDK's tool() helper.
 * @param getPlayerCharacter Function to get current player character
 * @param getNpcs Function to get current NPCs array
 */
export function createApplyDamageTool(
  getPlayerCharacter: () => PlayerCharacter,
  getNpcs: () => NPC[]
) {
  return tool(
    "apply_damage",
    `Apply damage or healing to the player character or an NPC. Positive amount = damage, negative = healing. Returns incapacitation status when HP reaches 0.`,
    {
      target: z.enum(["player", "npc"]).describe("Target type"),
      npcName: z.string().optional().describe("NPC name when target='npc'"),
      amount: z.number().describe("Damage (positive) or healing (negative) amount"),
      damageType: z.string().optional().describe("Type of damage"),
      applyConditions: z.array(z.string()).optional().describe("Conditions to apply"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const { target, npcName, amount, damageType, applyConditions = [] } = args;

      let result: ApplyDamageReturn;

      if (target === "player") {
        const pc = getPlayerCharacter();
        result = applyDamageToPlayer(pc, amount, damageType ?? null, applyConditions);
      } else {
        // target === "npc"
        if (!npcName) {
          result = {
            success: false,
            error: "npcName is required when target='npc'",
          };
        } else {
          const npcs = getNpcs();
          result = applyDamageToNpc(npcs, npcName, amount, damageType ?? null, applyConditions);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatApplyDamageResult(result),
          },
        ],
      };
    }
  );
}
