import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

const DiceGroupSchema = Type.Object({
  n: Type.Integer({ minimum: 1, maximum: 100 }),
  d: Type.Integer({ minimum: 2, maximum: 1000 }),
  label: Type.Optional(Type.String()),
});

export const RollDiceInputSchema = Type.Object({
  groups: Type.Array(DiceGroupSchema, { minItems: 1 }),
  modifier: Type.Optional(Type.Integer()),
  threshold: Type.Optional(Type.Number()),
});

export type RollDiceInput = Static<typeof RollDiceInputSchema>;

export interface RollDiceOutput {
  groups: Array<{ label?: string; rolls: number[] }>;
  modifier: number;
  total: number;
  threshold?: number;
  met?: boolean;
}

/**
 * Pure roll logic. Accepts validated input, returns structured output.
 * Exported for direct testing without tool runtime overhead.
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

export function createDiceToolDef(deps?: { random?: () => number }): ToolDefinition {
  const random = deps?.random ?? Math.random;

  return defineTool({
    name: "roll_dice",
    label: "Roll Dice",
    description:
      "Roll dice for tabletop RPG gameplay. Supports multiple groups of dice with optional labels, a modifier applied to the total, and threshold comparison.",
    parameters: RollDiceInputSchema,
    // eslint-disable-next-line @typescript-eslint/require-await -- pi expects async but rollDice is synchronous
    async execute(_toolCallId, args) {
      const result = rollDice(args, random);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        details: result,
      };
    },
  });
}
