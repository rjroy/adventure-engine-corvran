/**
 * MCP Tool: manage_combat
 *
 * Manages combat lifecycle: start combat, advance turns, end combat.
 * Handles initiative sorting, turn advancement with incapacitation checks,
 * and round tracking.
 *
 * Tool registered as: mcp__adventure-rpg__manage_combat
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { CombatState, CombatantEntry, NPC } from "../../../shared/protocol";

/**
 * Result of successful combat management
 */
export interface ManageCombatResult {
  success: true;
  combatState: CombatState | null;
  message: string;
  currentCombatant?: string;
  round?: number;
}

/**
 * Error result from manage_combat
 */
export interface ManageCombatError {
  success: false;
  error: string;
}

/**
 * Result type for combat management functions
 */
export type ManageCombatReturn = ManageCombatResult | ManageCombatError;

/**
 * Static tool definition for the manage_combat tool.
 */
export const manageCombatToolDefinition = {
  name: "manage_combat",
  description: `Manage combat encounters: start, advance turn, end combat.

Actions:
- start: Create combat state, sort combatants by initiative
- next_turn: Advance to next combatant, skip incapacitated
- end: Clear combat state

Examples:
- manage_combat(action="start", combatants=[{name:"Player", initiativeRoll:18, isPlayer:true}, {name:"Goblin", initiativeRoll:12, isPlayer:false}])
- manage_combat(action="next_turn")
- manage_combat(action="end")`,
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start", "next_turn", "end"],
        description: "Combat action to perform",
      },
      combatants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Combatant name (player or NPC name)",
            },
            initiativeRoll: {
              type: "number",
              description: "Initiative roll result",
            },
            isPlayer: {
              type: "boolean",
              description: "Whether this is the player character",
            },
          },
          required: ["name", "initiativeRoll", "isPlayer"],
        },
        description: "Combatants for 'start' action (includes player + NPCs)",
      },
    },
    required: ["action"],
  },
} as const;

/**
 * Check if a combatant is incapacitated.
 * Checks conditions array for incapacitation keywords and HP for NPCs.
 */
export function isIncapacitated(
  combatant: CombatantEntry,
  npcs: NPC[]
): boolean {
  // Check conditions for incapacitation keywords
  const incapacitationKeywords = [
    "incapacitated",
    "unconscious",
    "dead",
    "defeated",
  ];

  for (const condition of combatant.conditions) {
    if (
      incapacitationKeywords.some((keyword) =>
        condition.toLowerCase().includes(keyword)
      )
    ) {
      return true;
    }
  }

  // For NPCs, also check HP = 0
  if (!combatant.isPlayer) {
    const npc = npcs.find(
      (n) => n.name.toLowerCase() === combatant.name.toLowerCase()
    );
    if (npc?.hp && npc.hp.current <= 0) {
      return true;
    }
  }

  return false;
}

/**
 * Start a new combat encounter.
 * Creates combat state, sorts combatants by initiative (highest first),
 * sets round to 1 and currentIndex to 0.
 */
export function startCombat(
  combatants: Array<{
    name: string;
    initiativeRoll: number;
    isPlayer: boolean;
  }>
): ManageCombatReturn {
  if (combatants.length === 0) {
    return {
      success: false,
      error: "Cannot start combat: at least one combatant required",
    };
  }

  // Sort combatants by initiative (highest first)
  // For ties, maintain input order (stable sort)
  const sortedCombatants = [...combatants].sort(
    (a, b) => b.initiativeRoll - a.initiativeRoll
  );

  // Convert to CombatantEntry format
  const initiativeOrder: CombatantEntry[] = sortedCombatants.map((c) => ({
    name: c.name,
    initiative: c.initiativeRoll,
    isPlayer: c.isPlayer,
    conditions: [],
  }));

  const combatState: CombatState = {
    active: true,
    round: 1,
    initiativeOrder,
    currentIndex: 0,
    structure: "turn-based",
  };

  return {
    success: true,
    combatState,
    message: `Combat started with ${combatants.length} combatant(s). Initiative order determined.`,
    currentCombatant: initiativeOrder[0].name,
    round: 1,
  };
}

/**
 * Advance to the next turn in combat.
 * Increments currentIndex, wraps to 0 and increments round when reaching end.
 * Skips incapacitated combatants.
 */
export function nextTurn(
  combatState: CombatState | null,
  npcs: NPC[]
): ManageCombatReturn {
  if (!combatState || !combatState.active) {
    return {
      success: false,
      error: "No active combat to advance",
    };
  }

  const { initiativeOrder, currentIndex, round } = combatState;
  let newIndex = currentIndex + 1;
  let newRound = round;

  // Check if we've reached the end of initiative order
  if (newIndex >= initiativeOrder.length) {
    newIndex = 0;
    newRound++;
  }

  // Skip incapacitated combatants
  const maxIterations = initiativeOrder.length; // Prevent infinite loop
  let iterations = 0;

  while (
    iterations < maxIterations &&
    isIncapacitated(initiativeOrder[newIndex], npcs)
  ) {
    newIndex++;
    iterations++;

    // Wrap around if needed
    if (newIndex >= initiativeOrder.length) {
      newIndex = 0;
      newRound++;
    }
  }

  // If we've checked all combatants and all are incapacitated
  if (iterations >= maxIterations) {
    return {
      success: false,
      error:
        "All combatants are incapacitated. Combat should end or GM should intervene.",
    };
  }

  const updatedCombatState: CombatState = {
    ...combatState,
    currentIndex: newIndex,
    round: newRound,
  };

  const currentCombatant = initiativeOrder[newIndex].name;
  const roundChanged = newRound !== round;

  return {
    success: true,
    combatState: updatedCombatState,
    message: roundChanged
      ? `Advanced to Round ${newRound}. Current turn: ${currentCombatant}`
      : `Advanced turn. Current turn: ${currentCombatant}`,
    currentCombatant,
    round: newRound,
  };
}

/**
 * End combat.
 * Clears combat state to null.
 */
export function endCombat(
  combatState: CombatState | null
): ManageCombatReturn {
  if (!combatState || !combatState.active) {
    return {
      success: false,
      error: "No active combat to end",
    };
  }

  return {
    success: true,
    combatState: null,
    message: `Combat ended after ${combatState.round} round(s).`,
  };
}

/**
 * Format the manage_combat result for display
 */
export function formatManageCombatResult(result: ManageCombatReturn): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  let output = `**${result.message}**\n`;

  if (result.combatState) {
    const { round, currentIndex, initiativeOrder } = result.combatState;
    output += `\n**Round**: ${round}\n`;
    output += `**Current Turn**: ${initiativeOrder[currentIndex].name}\n`;
    output += `\n**Initiative Order**:\n`;

    initiativeOrder.forEach((combatant, index) => {
      const isCurrent = index === currentIndex;
      const marker = isCurrent ? "▶ " : "  ";
      const conditions =
        combatant.conditions.length > 0
          ? ` [${combatant.conditions.join(", ")}]`
          : "";
      output += `${marker}${combatant.name} (Initiative: ${combatant.initiative})${conditions}\n`;
    });
  }

  return output;
}

/**
 * Create the manage_combat tool using the SDK's tool() helper.
 * @param getCombatState Function to get current combat state
 * @param setCombatState Function to update combat state
 * @param getNpcs Function to get current NPCs array
 */
export function createManageCombatTool(
  getCombatState: () => CombatState | null,
  setCombatState: (state: CombatState | null) => void,
  getNpcs: () => NPC[]
) {
  return tool(
    "manage_combat",
    `Manage combat encounters: start combat, advance turns, end combat. Handles initiative, turn order, and incapacitation.`,
    {
      action: z
        .enum(["start", "next_turn", "end"])
        .describe("Combat action to perform"),
      combatants: z
        .array(
          z.object({
            name: z.string().describe("Combatant name"),
            initiativeRoll: z.number().describe("Initiative roll result"),
            isPlayer: z.boolean().describe("Whether this is the player"),
          })
        )
        .optional()
        .describe("Combatants for 'start' action"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const { action, combatants } = args;
      let result: ManageCombatReturn;

      switch (action) {
        case "start":
          if (!combatants || combatants.length === 0) {
            result = {
              success: false,
              error:
                "combatants array is required for 'start' action and must contain at least one combatant",
            };
          } else {
            result = startCombat(combatants);
            if (result.success) {
              setCombatState(result.combatState);
            }
          }
          break;

        case "next_turn": {
          const currentState = getCombatState();
          const npcs = getNpcs();
          result = nextTurn(currentState, npcs);
          if (result.success) {
            setCombatState(result.combatState);
          }
          break;
        }

        case "end": {
          const currentState = getCombatState();
          result = endCombat(currentState);
          if (result.success) {
            setCombatState(result.combatState);
          }
          break;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formatManageCombatResult(result),
          },
        ],
      };
    }
  );
}
