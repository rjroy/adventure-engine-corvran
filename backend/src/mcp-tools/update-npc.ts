/**
 * MCP Tool: update_npc
 *
 * Updates existing NPC properties with partial updates.
 * Preserves unchanged fields and reports changes made.
 *
 * Tool registered as: mcp__adventure-theme__update_npc
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { NPC, InventoryItem, NPCReward } from "../../../shared/protocol";

/**
 * Result of updating an NPC
 */
export interface UpdateNpcResult {
  success: true;
  npc: NPC;
  changes: string[];
}

/**
 * Error result from update_npc
 */
export interface UpdateNpcError {
  success: false;
  error: string;
}

/**
 * Result type for updateNpc function
 */
export type UpdateNpcReturn = UpdateNpcResult | UpdateNpcError;

/**
 * Update parameters for an NPC (all optional except name for lookup)
 */
export interface UpdateNpcParams {
  name: string;
  stats?: Record<string, number>;
  skills?: Record<string, number>;
  hp?: { current: number; max: number };
  conditions?: string[];
  inventory?: InventoryItem[];
  reward?: NPCReward;
  isHostile?: boolean;
  notes?: string;
}

/**
 * Static tool definition for the update_npc tool.
 */
export const updateNpcToolDefinition = {
  name: "update_npc",
  description: `Update an existing NPC's properties.

Only specified fields are updated; unspecified fields remain unchanged.
Use this to modify stats, HP, conditions, inventory, or other properties.

Examples:
- update_npc(name="Goblin Scout", hp={current:3,max:7}) → Updates HP only
- update_npc(name="Goblin Scout", conditions=["poisoned","frightened"])
- update_npc(name="Merchant", isHostile=true, notes="Betrayed the party")

Returns the updated NPC with a list of changes made.`,
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the NPC to update (case-sensitive)",
      },
      stats: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "New stat values (replaces existing stats)",
      },
      skills: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "New skill bonuses (replaces existing skills)",
      },
      hp: {
        type: "object",
        properties: {
          current: { type: "number" },
          max: { type: "number" },
        },
        required: ["current", "max"],
        description: "New HP values",
      },
      conditions: {
        type: "array",
        items: { type: "string" },
        description: "New conditions (replaces existing conditions)",
      },
      inventory: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
          },
          required: ["name", "quantity"],
        },
        description: "New inventory (replaces existing inventory)",
      },
      reward: {
        type: "object",
        properties: {
          xp: { type: "number" },
          loot: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
              },
            },
          },
          storyFlag: { type: "string" },
        },
        description: "New reward (replaces existing reward)",
      },
      isHostile: {
        type: "boolean",
        description: "New hostile status",
      },
      notes: {
        type: "string",
        description: "New GM notes (replaces existing notes)",
      },
    },
    required: ["name"],
  },
} as const;

/**
 * Update an existing NPC with partial updates
 */
export function updateNpc(
  params: UpdateNpcParams,
  npcs: NPC[]
): UpdateNpcReturn {
  // Find NPC by name (case-sensitive per spec, but let's be lenient)
  const npc = npcs.find(
    (n) => n.name.toLowerCase() === params.name.toLowerCase()
  );

  if (!npc) {
    const availableNames = npcs.map((n) => n.name).join(", ");
    return {
      success: false,
      error: `NPC "${params.name}" not found. Available NPCs: ${availableNames || "none"}`,
    };
  }

  // Track changes made
  const changes: string[] = [];

  // Apply updates and track changes
  if (params.stats !== undefined) {
    const oldStats = npc.stats ? JSON.stringify(npc.stats) : "none";
    npc.stats = params.stats;
    changes.push(`stats: ${oldStats} → ${JSON.stringify(params.stats)}`);
  }

  if (params.skills !== undefined) {
    const oldSkills = npc.skills ? JSON.stringify(npc.skills) : "none";
    npc.skills = params.skills;
    changes.push(`skills: ${oldSkills} → ${JSON.stringify(params.skills)}`);
  }

  if (params.hp !== undefined) {
    const oldHp = npc.hp ? `${npc.hp.current}/${npc.hp.max}` : "none";
    npc.hp = params.hp;
    changes.push(`hp: ${oldHp} → ${params.hp.current}/${params.hp.max}`);
  }

  if (params.conditions !== undefined) {
    const oldConditions = npc.conditions?.join(", ") || "none";
    npc.conditions = params.conditions;
    changes.push(`conditions: [${oldConditions}] → [${params.conditions.join(", ")}]`);
  }

  if (params.inventory !== undefined) {
    const oldInventory = npc.inventory?.map((i) => i.name).join(", ") || "none";
    npc.inventory = params.inventory;
    const newInventory = params.inventory.map((i) => i.name).join(", ") || "none";
    changes.push(`inventory: [${oldInventory}] → [${newInventory}]`);
  }

  if (params.reward !== undefined) {
    const oldReward = npc.reward ? JSON.stringify(npc.reward) : "none";
    npc.reward = params.reward;
    changes.push(`reward: ${oldReward} → ${JSON.stringify(params.reward)}`);
  }

  if (params.isHostile !== undefined) {
    const oldHostile = npc.isHostile ?? true;
    npc.isHostile = params.isHostile;
    changes.push(`isHostile: ${oldHostile} → ${params.isHostile}`);
  }

  if (params.notes !== undefined) {
    const oldNotes = npc.notes ?? "none";
    npc.notes = params.notes;
    changes.push(`notes: "${oldNotes}" → "${params.notes}"`);
  }

  if (changes.length === 0) {
    return {
      success: false,
      error: "No updates provided. Specify at least one field to update.",
    };
  }

  return {
    success: true,
    npc,
    changes,
  };
}

/**
 * Format the update_npc result for display
 */
export function formatUpdateNpcResult(result: UpdateNpcReturn): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const { npc, changes } = result;

  let output = `**Updated NPC "${npc.name}"**\n\n`;
  output += `**Changes Made** (${changes.length}):\n`;
  for (const change of changes) {
    output += `- ${change}\n`;
  }

  output += `\n**Current State**:\n`;
  output += `- ID: ${npc.id}\n`;

  if (npc.stats && Object.keys(npc.stats).length > 0) {
    output += `- Stats: ${Object.entries(npc.stats)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")}\n`;
  }

  if (npc.skills && Object.keys(npc.skills).length > 0) {
    output += `- Skills: ${Object.entries(npc.skills)
      .map(([k, v]) => `${k}: ${v >= 0 ? "+" : ""}${v}`)
      .join(", ")}\n`;
  }

  if (npc.hp) {
    output += `- HP: ${npc.hp.current}/${npc.hp.max}\n`;
  }

  output += `- Hostile: ${npc.isHostile ? "Yes" : "No"}\n`;

  if (npc.conditions && npc.conditions.length > 0) {
    output += `- Conditions: ${npc.conditions.join(", ")}\n`;
  }

  if (npc.notes) {
    output += `- Notes: ${npc.notes}\n`;
  }

  return output;
}

/**
 * Create the update_npc tool using the SDK's tool() helper.
 * @param getNpcs Function to get current NPCs array (for modification in place)
 */
export function createUpdateNpcTool(getNpcs: () => NPC[]) {
  return tool(
    "update_npc",
    `Update an existing NPC's properties. Only specified fields are updated.
Returns the updated NPC with a list of changes made.`,
    {
      name: z.string().describe("Name of the NPC to update"),
      stats: z.record(z.number()).optional().describe("New stat values"),
      skills: z.record(z.number()).optional().describe("New skill bonuses"),
      hp: z
        .object({
          current: z.number(),
          max: z.number(),
        })
        .optional()
        .describe("New HP values"),
      conditions: z.array(z.string()).optional().describe("New conditions"),
      inventory: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            equipped: z.boolean().optional(),
            properties: z.record(z.unknown()).optional(),
          })
        )
        .optional()
        .describe("New inventory"),
      reward: z
        .object({
          xp: z.number().optional(),
          loot: z
            .array(
              z.object({
                name: z.string(),
                quantity: z.number(),
                equipped: z.boolean().optional(),
                properties: z.record(z.unknown()).optional(),
              })
            )
            .optional(),
          storyFlag: z.string().optional(),
        })
        .optional()
        .describe("New reward"),
      isHostile: z.boolean().optional().describe("New hostile status"),
      notes: z.string().optional().describe("New GM notes"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const npcs = getNpcs();
      const result = updateNpc(args, npcs);

      return {
        content: [
          {
            type: "text" as const,
            text: formatUpdateNpcResult(result),
          },
        ],
      };
    }
  );
}
