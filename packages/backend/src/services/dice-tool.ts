import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const DiceGroupSchema = z.object({
  n: z.number().int().min(1).max(100),
  d: z.number().int().min(2).max(1000),
  label: z.string().optional(),
});

/** Exported for validation tests. The tool handler uses this schema via the `tool()` wrapper. */
export const RollDiceInputSchema = {
  groups: z.array(DiceGroupSchema).min(1),
  modifier: z.number().int().optional(),
  threshold: z.number().optional(),
};

export interface RollDiceInput {
  groups: Array<{ n: number; d: number; label?: string }>;
  modifier?: number;
  threshold?: number;
}

export interface RollDiceOutput {
  groups: Array<{ label?: string; rolls: number[] }>;
  modifier: number;
  total: number;
  threshold?: number;
  met?: boolean;
}

/**
 * Pure roll logic. Accepts validated input, returns structured output.
 * Exported for direct testing without MCP overhead.
 */
export function rollDice(
  input: RollDiceInput,
  random: () => number = Math.random,
): RollDiceOutput {
  const modifier = input.modifier ?? 0;
  let total = modifier;

  const groups = input.groups.map((group) => {
    const rolls: number[] = [];
    for (let i = 0; i < group.n; i++) {
      const roll = Math.floor(random() * group.d) + 1;
      rolls.push(roll);
      total += roll;
    }

    const outputGroup: { label?: string; rolls: number[] } = { rolls };
    if (group.label !== undefined) {
      outputGroup.label = group.label;
    }
    return outputGroup;
  });

  const result: RollDiceOutput = { groups, modifier, total };

  if (input.threshold !== undefined) {
    result.threshold = input.threshold;
    result.met = total >= input.threshold;
  }

  return result;
}

export function createDiceToolDef(deps?: { random?: () => number }) {
  const random = deps?.random ?? Math.random;

  return tool(
    "roll_dice",
    "Roll dice for tabletop RPG gameplay. Supports multiple groups of dice with optional labels, a modifier applied to the total, and threshold comparison.",
    RollDiceInputSchema,
    async (args) => {
      const result = rollDice(args, random);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}

export function createDiceTool(
  deps?: { random?: () => number },
): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({
    name: "corvran",
    tools: [createDiceToolDef(deps)],
  });
}
