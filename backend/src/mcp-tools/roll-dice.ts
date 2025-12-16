/**
 * MCP Tool: roll_dice
 *
 * Exposes dice rolling functionality to the GM via MCP.
 * Validates expressions using the dice parser and executes rolls with crypto-secure randomness.
 *
 * Tool registered as: mcp__adventure-rpg__roll_dice
 */

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { DiceLogEntry } from "../../../shared/protocol";
import { rollDiceWithRequester } from "../services/dice-roller";

/**
 * Static tool definition for the roll_dice tool.
 * Used when passing tool schema to the SDK query.
 * Actual handling is done via tool_use block processing in GameSession.
 */
export const rollDiceTool = {
  name: "roll_dice",
  description: `Roll dice using standard notation. Supports:
- Polyhedral: d4, d6, d8, d10, d12, d20, d100
- Fudge: dF (results: -1, 0, +1)
- Multiple dice: 2d6, 3d8, 4dF
- Modifiers: 2d6+3, 1d20-2, 3d4+5
- Combined: 2d6+1d4+5, 3dF+2

Returns individual rolls and total for transparency.

EXAMPLES:
- "1d20" → Single d20 roll
- "2d6+3" → Two d6, add 3
- "4dF" → Four Fudge dice
- "2d6+1d4+5" → Two d6, one d4, add 5`,
  input_schema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Dice expression (e.g., '2d6+3', '4dF', '1d20')",
      },
      context: {
        type: "string",
        description: "Optional. What this roll is for (e.g., 'Attack roll', 'Initiative')",
      },
      visible: {
        type: "boolean",
        description: "Optional. Whether player sees the result (default: true)",
      },
    },
    required: ["expression"],
  },
} as const;

/**
 * Create the roll_dice tool using the SDK's tool() helper.
 * @param diceLog Reference to the adventure state's dice log array (mutated in place)
 */
export function createRollDiceTool(diceLog: DiceLogEntry[]) {
  return tool(
    "roll_dice",
    `Roll dice using standard notation. Supports:
- Polyhedral: d4, d6, d8, d10, d12, d20, d100
- Fudge: dF (results: -1, 0, +1)
- Multiple dice: 2d6, 3d8, 4dF
- Modifiers: 2d6+3, 1d20-2, 3d4+5
- Combined: 2d6+1d4+5, 3dF+2

Returns individual rolls and total for transparency.`,
    {
      expression: z.string().describe("Dice expression (e.g., '2d6+3', '4dF', '1d20')"),
      context: z.string().optional().describe("What this roll is for (e.g., 'Attack roll', 'Initiative')"),
      visible: z.boolean().default(true).describe("Whether player sees the result"),
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (args) => {
      const result = rollDiceWithRequester(
        args.expression,
        args.context ?? "GM roll",
        args.visible,
        diceLog,
        "gm"
      );

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${result.error}

Valid examples:
- "1d20" → Single d20 roll
- "2d6+3" → Two d6, add 3
- "4dF" → Four Fudge dice (each rolls -1, 0, or +1)
- "2d6+1d4+5" → Two d6, one d4, add 5

Supported dice types: d4, d6, d8, d10, d12, d20, d100, dF`,
            },
          ],
        };
      }

      const { expression, individualRolls, modifier, total, visible, logId } = result.result;

      return {
        content: [
          {
            type: "text" as const,
            text: `Rolled ${expression}:
- Individual rolls: [${individualRolls.join(", ")}]
- Modifier: ${modifier >= 0 ? "+" : ""}${modifier}
- Total: ${total}
- Visible to player: ${visible}
- Log ID: ${logId}`,
          },
        ],
      };
    }
  );
}
