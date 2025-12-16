/**
 * Dice Expression Parser
 *
 * Parses standard dice notation (NdX+M format) for RPG systems.
 * Supports polyhedral dice (d4, d6, d8, d10, d12, d20, d100) and Fudge dice (dF).
 *
 * Valid formats:
 * - Single die: d20, d6, dF
 * - Multiple dice: 2d6, 3d8, 4dF
 * - With modifiers: 2d6+3, 1d20-2
 * - Combined expressions: 2d6+1d4+5 (stretch goal)
 *
 * Performance target: <10ms parse time
 */

/**
 * Valid polyhedral dice types supported by the parser
 */
export const POLYHEDRAL_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

/**
 * Single die component in a dice expression
 */
export interface DiceComponent {
  count: number;
  sides: number | "F"; // Number for polyhedral, "F" for Fudge dice
}

/**
 * Successful parse result
 */
export interface ParsedDiceExpression {
  success: true;
  dice: DiceComponent[];
  modifier: number;
}

/**
 * Failed parse result with error message
 */
export interface ParseError {
  success: false;
  error: string;
}

/**
 * Result of parsing a dice expression
 */
export type ParseResult = ParsedDiceExpression | ParseError;

/**
 * Parse a single dice component (e.g., "2d6", "dF", "d20")
 *
 * @param component - The dice component string to parse
 * @returns Parsed dice component or null if invalid
 */
function parseSingleDiceComponent(component: string): DiceComponent | null {
  // Match patterns like: 2d6, d20, 4dF, dF
  const match = component.match(/^(\d+)?d(F|\d+)$/i);

  if (!match) {
    return null;
  }

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sidesStr = match[2];

  // Handle Fudge dice
  if (sidesStr.toUpperCase() === "F") {
    return { count, sides: "F" };
  }

  // Handle polyhedral dice
  const sides = parseInt(sidesStr, 10);

  // Validate sides is a supported die type
  if (
    !(POLYHEDRAL_DICE as readonly number[]).includes(sides)
  ) {
    return null;
  }

  return { count, sides };
}

/**
 * Parse a dice expression into structured format
 *
 * Supports:
 * - Polyhedral dice: d4, d6, d8, d10, d12, d20, d100
 * - Fudge dice: dF (results: -1, 0, +1)
 * - Multiple dice: 2d6, 3d8
 * - Modifiers: +N, -N
 * - Combined: 2d6+1d4+5
 *
 * @param expression - Dice expression string (e.g., "2d6+3", "4dF", "1d20-2")
 * @returns ParseResult with dice array and modifier, or error
 *
 * @example
 * parseDiceExpression("2d6+3")
 * // => { success: true, dice: [{count: 2, sides: 6}], modifier: 3 }
 *
 * @example
 * parseDiceExpression("4dF")
 * // => { success: true, dice: [{count: 4, sides: "F"}], modifier: 0 }
 *
 * @example
 * parseDiceExpression("d7")
 * // => { success: false, error: "Invalid die type: d7. Valid types: d4, d6, ..." }
 */
export function parseDiceExpression(expression: string): ParseResult {
  // Remove all whitespace for easier parsing
  const normalized = expression.replace(/\s+/g, "");

  if (!normalized) {
    return {
      success: false,
      error:
        "Empty expression. Valid examples: d20, 2d6+3, 4dF, 1d20-2, 2d6+1d4+5",
    };
  }

  // Split on + and - while preserving the operators
  // This regex captures the operators in the result
  const tokens = normalized.split(/([+-])/);

  const dice: DiceComponent[] = [];
  let modifier = 0;
  let expectOperand = true; // Track if we expect a number/dice next
  let currentSign = 1; // Track current sign for next operand

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (!token) {
      continue; // Skip empty strings from split
    }

    if (token === "+" || token === "-") {
      if (expectOperand && i > 0) {
        // Operator without preceding operand (except at start for negative)
        return {
          success: false,
          error: `Invalid expression: unexpected '${token}' at position ${i}. Valid examples: d20, 2d6+3, 4dF`,
        };
      }
      currentSign = token === "+" ? 1 : -1;
      expectOperand = true;
      continue;
    }

    if (!expectOperand) {
      return {
        success: false,
        error: `Invalid expression: missing operator before '${token}'. Valid examples: d20, 2d6+3, 2d6+1d4+5`,
      };
    }

    // Try to parse as dice component
    if (token.toLowerCase().includes("d")) {
      const diceComponent = parseSingleDiceComponent(token);

      if (!diceComponent) {
        // Determine specific error message
        const invalidDieMatch = token.match(/d(\d+)/i);
        if (invalidDieMatch) {
          const invalidSides = invalidDieMatch[1];
          return {
            success: false,
            error: `Invalid die type: d${invalidSides}. Valid types: d4, d6, d8, d10, d12, d20, d100, dF`,
          };
        }

        return {
          success: false,
          error: `Invalid dice notation: '${token}'. Valid examples: d20, 2d6, 4dF`,
        };
      }

      // Apply sign to dice count if needed (for combined expressions)
      if (currentSign === -1) {
        return {
          success: false,
          error: `Cannot subtract dice: '-${token}'. You can only subtract modifiers (e.g., 2d6-3).`,
        };
      }

      dice.push(diceComponent);
      expectOperand = false;
      currentSign = 1;
    } else {
      // Try to parse as numeric modifier
      const num = parseInt(token, 10);

      if (isNaN(num)) {
        return {
          success: false,
          error: `Invalid token: '${token}'. Expected dice notation (e.g., 2d6) or number modifier.`,
        };
      }

      if (num < 0) {
        return {
          success: false,
          error: `Invalid modifier: ${num}. Use subtraction operator instead (e.g., 2d6-3, not 2d6+-3).`,
        };
      }

      modifier += num * currentSign;
      expectOperand = false;
      currentSign = 1;
    }
  }

  if (expectOperand) {
    return {
      success: false,
      error: `Incomplete expression: trailing operator. Valid examples: d20, 2d6+3, 4dF`,
    };
  }

  // Validate we have at least one die
  if (dice.length === 0) {
    return {
      success: false,
      error: `No dice specified. Expression must include at least one die (e.g., d20, 2d6). Got: ${expression}`,
    };
  }

  return {
    success: true,
    dice,
    modifier,
  };
}
