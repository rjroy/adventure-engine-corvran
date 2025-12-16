/**
 * Dice Roller Service
 *
 * Executes dice rolls using cryptographically secure randomness and maintains
 * an audit log of all rolls for transparency and debugging.
 *
 * Features:
 * - Polyhedral dice (d4, d6, d8, d10, d12, d20, d100) using crypto.randomInt()
 * - Fudge dice (dF) with results from [-1, 0, +1]
 * - Combined expressions (2d6+1d4+5)
 * - Roll logging with UUID tracking
 * - Automatic log rotation (keeps last 1000 entries)
 *
 * Performance target: <100ms per roll including logging
 */

import { randomInt, randomUUID } from "node:crypto";
import type { DiceLogEntry } from "../../../shared/protocol";
import {
  parseDiceExpression,
  type DiceComponent,
} from "./dice-parser";

/**
 * Result of a successful dice roll
 */
export interface DiceRollResult {
  /** Original expression that was rolled */
  expression: string;
  /** Individual die results in order */
  individualRolls: number[];
  /** Numeric modifier applied */
  modifier: number;
  /** Final total (sum of rolls + modifier) */
  total: number;
  /** Whether this roll is visible to the player */
  visible: boolean;
  /** UUID reference to the audit log entry */
  logId: string;
}

/**
 * Success result from rollDice
 */
export interface RollSuccess {
  success: true;
  result: DiceRollResult;
}

/**
 * Error result from rollDice
 */
export interface RollError {
  success: false;
  error: string;
}

/**
 * Result type for rollDice function
 */
export type RollResult = RollSuccess | RollError;

/**
 * Roll a single die using cryptographically secure randomness.
 *
 * @param sides - Number of sides on the die
 * @returns Random integer from 1 to sides (inclusive)
 */
function rollSingleDie(sides: number): number {
  // randomInt is exclusive on upper bound, so we add 1
  return randomInt(1, sides + 1);
}

/**
 * Roll a single Fudge die.
 * Fudge dice return -1, 0, or +1 with equal probability.
 *
 * @returns -1, 0, or +1
 */
function rollFudgeDie(): number {
  const result = randomInt(0, 3); // 0, 1, or 2
  return result - 1; // Maps to -1, 0, or +1
}

/**
 * Roll a dice component (e.g., "2d6" or "4dF").
 *
 * @param component - Parsed dice component to roll
 * @returns Array of individual die results
 */
function rollDiceComponent(component: DiceComponent): number[] {
  const results: number[] = [];

  for (let i = 0; i < component.count; i++) {
    if (component.sides === "F") {
      results.push(rollFudgeDie());
    } else {
      results.push(rollSingleDie(component.sides));
    }
  }

  return results;
}

/**
 * Rotate dice log to keep only the most recent entries.
 * Mutates the diceLog array in place.
 *
 * @param diceLog - Array of dice log entries
 * @param maxEntries - Maximum number of entries to keep (default 1000)
 */
function rotateDiceLog(diceLog: DiceLogEntry[], maxEntries = 1000): void {
  if (diceLog.length > maxEntries) {
    // Remove oldest entries, keep most recent maxEntries
    const entriesToRemove = diceLog.length - maxEntries;
    diceLog.splice(0, entriesToRemove);
  }
}

/**
 * Execute a dice roll and log the result.
 *
 * Parses the dice expression, executes the roll using cryptographically secure
 * randomness, creates an audit log entry, and rotates the log if needed.
 *
 * @param expression - Dice expression (e.g., "2d6+3", "4dF", "1d20-2")
 * @param context - Contextual description of why this roll occurred
 * @param visible - Whether the roll is visible to the player
 * @param diceLog - Array of dice log entries (mutated in place)
 * @returns RollResult with individual rolls and total, or error
 *
 * @example
 * const result = rollDice("2d6+3", "Initiative roll", true, state.diceLog);
 * if (result.success) {
 *   console.log(`Rolled ${result.result.total}`);
 * }
 */
export function rollDice(
  expression: string,
  context: string,
  visible: boolean,
  diceLog: DiceLogEntry[]
): RollResult {
  const startTime = performance.now();

  // Parse the expression
  const parseResult = parseDiceExpression(expression);

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
    };
  }

  // Roll all dice components
  const individualRolls: number[] = [];

  for (const component of parseResult.dice) {
    const componentRolls = rollDiceComponent(component);
    individualRolls.push(...componentRolls);
  }

  // Calculate total
  const rollSum = individualRolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollSum + parseResult.modifier;

  // Generate UUID for this roll
  const logId = randomUUID();

  // Create log entry
  const logEntry: DiceLogEntry = {
    id: logId,
    timestamp: new Date().toISOString(),
    expression,
    individualRolls,
    total,
    context,
    visible,
    requestedBy: "system", // Default; GM can override via explicit parameter
  };

  // Append to log
  diceLog.push(logEntry);

  // Rotate log if needed
  rotateDiceLog(diceLog);

  // Performance check
  const elapsedTime = performance.now() - startTime;
  if (elapsedTime > 100) {
    console.warn(
      `Dice roll took ${elapsedTime.toFixed(2)}ms (exceeds 100ms target)`
    );
  }

  return {
    success: true,
    result: {
      expression,
      individualRolls,
      modifier: parseResult.modifier,
      total,
      visible,
      logId,
    },
  };
}

/**
 * Overload for rollDice that allows specifying the requestedBy field.
 *
 * @param expression - Dice expression
 * @param context - Contextual description
 * @param visible - Whether visible to player
 * @param diceLog - Dice log array
 * @param requestedBy - Who requested the roll ("gm" or "system")
 */
export function rollDiceWithRequester(
  expression: string,
  context: string,
  visible: boolean,
  diceLog: DiceLogEntry[],
  requestedBy: "gm" | "system"
): RollResult {
  const result = rollDice(expression, context, visible, diceLog);

  // Update the requestedBy field if roll succeeded
  if (result.success && diceLog.length > 0) {
    const lastEntry = diceLog[diceLog.length - 1];
    if (lastEntry.id === result.result.logId) {
      lastEntry.requestedBy = requestedBy;
    }
  }

  return result;
}
