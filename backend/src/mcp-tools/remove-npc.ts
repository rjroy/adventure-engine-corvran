/**
 * MCP Tool: remove_npc
 *
 * Removes an NPC from the game state, optionally specifying a reason.
 * Also removes the NPC from combat initiative order if applicable.
 *
 * Tool registered as: mcp__adventure-theme__remove_npc
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { NPC, CombatState } from "../../../shared/protocol";

/**
 * Valid reasons for removing an NPC
 */
export const VALID_REASONS = ["defeated", "fled", "departed", "other"] as const;
export type RemovalReason = (typeof VALID_REASONS)[number];

/**
 * Result of removing an NPC
 */
export interface RemoveNpcResult {
  success: true;
  removedNpc: NPC;
  reason: RemovalReason;
  removedFromCombat: boolean;
}

/**
 * Error result from remove_npc
 */
export interface RemoveNpcError {
  success: false;
  error: string;
}

/**
 * Result type for removeNpc function
 */
export type RemoveNpcReturn = RemoveNpcResult | RemoveNpcError;

/**
 * Parameters for removing an NPC
 */
export interface RemoveNpcParams {
  name: string;
  reason?: RemovalReason;
}

/**
 * Static tool definition for the remove_npc tool.
 */
export const removeNpcToolDefinition = {
  name: "remove_npc",
  description: `Remove an NPC from the game.

Use when an NPC is defeated, flees, departs, or is otherwise removed from play.
Also removes the NPC from combat initiative order if in active combat.

Returns the removed NPC's data (including reward info that may need to be applied).

Examples:
- remove_npc(name="Goblin Scout", reason="defeated") → Returns NPC with reward info
- remove_npc(name="Merchant", reason="departed") → NPC left the scene
- remove_npc(name="Spy", reason="fled") → NPC escaped`,
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the NPC to remove (case-insensitive)",
      },
      reason: {
        type: "string",
        enum: VALID_REASONS,
        description: "Reason for removal: defeated (killed/subdued), fled (escaped), departed (left scene), other",
      },
    },
    required: ["name"],
  },
} as const;

/**
 * Remove an NPC from the game state
 */
export function removeNpc(
  params: RemoveNpcParams,
  npcs: NPC[],
  combatState: CombatState | null,
  removeFromNpcs: (index: number) => void,
  removeFromInitiative: (npcName: string) => void
): RemoveNpcReturn {
  // Find NPC by name (case-insensitive)
  const npcIndex = npcs.findIndex(
    (n) => n.name.toLowerCase() === params.name.toLowerCase()
  );

  if (npcIndex === -1) {
    const availableNames = npcs.map((n) => n.name).join(", ");
    return {
      success: false,
      error: `NPC "${params.name}" not found. Available NPCs: ${availableNames || "none"}`,
    };
  }

  const removedNpc = npcs[npcIndex];
  const reason = params.reason ?? "other";

  // Remove from NPC array
  removeFromNpcs(npcIndex);

  // Check if in combat and remove from initiative order
  let removedFromCombat = false;
  if (combatState?.active && combatState.initiativeOrder) {
    const inCombat = combatState.initiativeOrder.some(
      (c) => c.name.toLowerCase() === removedNpc.name.toLowerCase() && !c.isPlayer
    );
    if (inCombat) {
      removeFromInitiative(removedNpc.name);
      removedFromCombat = true;
    }
  }

  return {
    success: true,
    removedNpc,
    reason,
    removedFromCombat,
  };
}

/**
 * Format the remove_npc result for display
 */
export function formatRemoveNpcResult(result: RemoveNpcReturn): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const { removedNpc, reason, removedFromCombat } = result;

  let output = `**NPC Removed: ${removedNpc.name}**\n`;
  output += `**Reason**: ${formatReason(reason)}\n`;

  if (removedFromCombat) {
    output += `⚔️ *Removed from combat initiative order*\n`;
  }

  // Show reward info if available
  if (removedNpc.reward) {
    output += `\n**Rewards Available**:\n`;
    if (removedNpc.reward.xp) {
      output += `- XP: ${removedNpc.reward.xp}\n`;
    }
    if (removedNpc.reward.loot && removedNpc.reward.loot.length > 0) {
      output += `- Loot: ${removedNpc.reward.loot.map((l) => `${l.name} (${l.quantity})`).join(", ")}\n`;
    }
    if (removedNpc.reward.storyFlag) {
      output += `- Story Flag: ${removedNpc.reward.storyFlag}\n`;
    }
  }

  // Show NPC details for reference
  output += `\n**NPC Details** (for reference):\n`;
  output += `- ID: ${removedNpc.id}\n`;

  if (removedNpc.hp) {
    output += `- Final HP: ${removedNpc.hp.current}/${removedNpc.hp.max}\n`;
  }

  if (removedNpc.inventory && removedNpc.inventory.length > 0) {
    output += `- Inventory: ${removedNpc.inventory.map((i) => `${i.name} (${i.quantity})`).join(", ")}\n`;
  }

  if (removedNpc.notes) {
    output += `- Notes: ${removedNpc.notes}\n`;
  }

  return output;
}

/**
 * Format the removal reason for display
 */
function formatReason(reason: RemovalReason): string {
  switch (reason) {
    case "defeated":
      return "Defeated (killed/subdued)";
    case "fled":
      return "Fled (escaped)";
    case "departed":
      return "Departed (left scene)";
    case "other":
      return "Other";
  }
}

/**
 * Create the remove_npc tool using the SDK's tool() helper.
 * @param getNpcs Function to get current NPCs array
 * @param getCombatState Function to get current combat state
 * @param removeFromNpcs Function to remove NPC at index from array
 * @param removeFromInitiative Function to remove NPC from combat initiative
 */
export function createRemoveNpcTool(
  getNpcs: () => NPC[],
  getCombatState: () => CombatState | null,
  removeFromNpcs: (index: number) => void,
  removeFromInitiative: (npcName: string) => void
) {
  return tool(
    "remove_npc",
    `Remove an NPC from the game. Use when an NPC is defeated, flees, or departs.
Returns the removed NPC's data including reward info for the GM to apply.`,
    {
      name: z.string().describe("Name of the NPC to remove"),
      reason: z
        .enum(VALID_REASONS)
        .optional()
        .describe("Reason: defeated, fled, departed, or other"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const npcs = getNpcs();
      const combatState = getCombatState();

      const result = removeNpc(
        args,
        npcs,
        combatState,
        removeFromNpcs,
        removeFromInitiative
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatRemoveNpcResult(result),
          },
        ],
      };
    }
  );
}
