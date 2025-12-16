/**
 * Unit Tests for Dice Roller Service
 *
 * Tests:
 * - Polyhedral dice rolling
 * - Fudge dice rolling
 * - Combined expressions
 * - Modifier handling
 * - Log entry creation and rotation
 * - UUID generation
 * - Error handling
 * - Statistical validation (distribution)
 * - Performance (<100ms target)
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { rollDice, rollDiceWithRequester } from "../../src/services/dice-roller";
import type { DiceLogEntry } from "../../../shared/protocol";

describe("Dice Roller Service", () => {
  let diceLog: DiceLogEntry[];

  beforeEach(() => {
    diceLog = [];
  });

  // ========================
  // Basic Rolling Tests
  // ========================

  test("rolls single d20 with correct range", () => {
    const result = rollDice("d20", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.expression).toBe("d20");
    expect(result.result.individualRolls.length).toBe(1);
    expect(result.result.individualRolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.result.individualRolls[0]).toBeLessThanOrEqual(20);
    expect(result.result.modifier).toBe(0);
    expect(result.result.total).toBe(result.result.individualRolls[0]);
  });

  test("rolls multiple dice (2d6)", () => {
    const result = rollDice("2d6", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.individualRolls.length).toBe(2);
    expect(result.result.individualRolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.result.individualRolls[0]).toBeLessThanOrEqual(6);
    expect(result.result.individualRolls[1]).toBeGreaterThanOrEqual(1);
    expect(result.result.individualRolls[1]).toBeLessThanOrEqual(6);

    const sum = result.result.individualRolls[0] + result.result.individualRolls[1];
    expect(result.result.total).toBe(sum);
  });

  test("rolls with positive modifier", () => {
    const result = rollDice("1d20+5", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.modifier).toBe(5);
    expect(result.result.total).toBe(result.result.individualRolls[0] + 5);
  });

  test("rolls with negative modifier", () => {
    const result = rollDice("1d20-3", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.modifier).toBe(-3);
    expect(result.result.total).toBe(result.result.individualRolls[0] - 3);
  });

  test("rolls combined expression (2d6+1d4+5)", () => {
    const result = rollDice("2d6+1d4+5", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Should have 3 dice (2d6 + 1d4)
    expect(result.result.individualRolls.length).toBe(3);
    expect(result.result.modifier).toBe(5);

    // Verify total
    const sum = result.result.individualRolls.reduce((a, b) => a + b, 0);
    expect(result.result.total).toBe(sum + 5);
  });

  // ========================
  // Fudge Dice Tests
  // ========================

  test("rolls single Fudge die (dF)", () => {
    const result = rollDice("dF", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.individualRolls.length).toBe(1);
    expect(result.result.individualRolls[0]).toBeGreaterThanOrEqual(-1);
    expect(result.result.individualRolls[0]).toBeLessThanOrEqual(1);
    expect([-1, 0, 1]).toContain(result.result.individualRolls[0]);
  });

  test("rolls multiple Fudge dice (4dF)", () => {
    const result = rollDice("4dF", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.individualRolls.length).toBe(4);

    for (const roll of result.result.individualRolls) {
      expect([-1, 0, 1]).toContain(roll);
    }

    const sum = result.result.individualRolls.reduce((a, b) => a + b, 0);
    expect(result.result.total).toBe(sum);
  });

  test("rolls Fudge dice with modifier (4dF+2)", () => {
    const result = rollDice("4dF+2", "Test roll", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.modifier).toBe(2);
    const sum = result.result.individualRolls.reduce((a, b) => a + b, 0);
    expect(result.result.total).toBe(sum + 2);
  });

  // ========================
  // All Polyhedral Dice
  // ========================

  test("rolls all polyhedral die types", () => {
    const diceTypes = [
      { expr: "d4", max: 4 },
      { expr: "d6", max: 6 },
      { expr: "d8", max: 8 },
      { expr: "d10", max: 10 },
      { expr: "d12", max: 12 },
      { expr: "d20", max: 20 },
      { expr: "d100", max: 100 },
    ];

    for (const { expr, max } of diceTypes) {
      const result = rollDice(expr, `Test ${expr}`, true, diceLog);

      expect(result.success).toBe(true);
      if (!result.success) continue;

      expect(result.result.individualRolls.length).toBe(1);
      expect(result.result.individualRolls[0]).toBeGreaterThanOrEqual(1);
      expect(result.result.individualRolls[0]).toBeLessThanOrEqual(max);
    }
  });

  // ========================
  // Log Entry Tests
  // ========================

  test("creates log entry with all required fields", () => {
    const result = rollDice("2d6+3", "Initiative check", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(diceLog.length).toBe(1);

    const entry = diceLog[0];
    expect(entry.id).toBeDefined();
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry.expression).toBe("2d6+3");
    expect(entry.individualRolls).toEqual(result.result.individualRolls);
    expect(entry.total).toBe(result.result.total);
    expect(entry.context).toBe("Initiative check");
    expect(entry.visible).toBe(true);
    expect(entry.requestedBy).toBe("system");
  });

  test("log entry ID matches result logId", () => {
    const result = rollDice("d20", "Test", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(diceLog.length).toBe(1);
    expect(diceLog[0].id).toBe(result.result.logId);
  });

  test("creates invisible log entries", () => {
    const result = rollDice("d20", "Secret GM roll", false, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(diceLog[0].visible).toBe(false);
  });

  test("sets requestedBy to gm when using rollDiceWithRequester", () => {
    const result = rollDiceWithRequester(
      "d20",
      "GM attack roll",
      true,
      diceLog,
      "gm"
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(diceLog[0].requestedBy).toBe("gm");
  });

  // ========================
  // Log Rotation Tests
  // ========================

  test("rotates log when exceeding 1000 entries", () => {
    // Pre-populate with 1000 entries
    for (let i = 0; i < 1000; i++) {
      rollDice("d20", `Roll ${i}`, true, diceLog);
    }

    expect(diceLog.length).toBe(1000);

    // Add one more roll
    rollDice("d20", "Roll 1000", true, diceLog);

    // Should still be 1000 (oldest removed)
    expect(diceLog.length).toBe(1000);

    // First entry should NOT be "Roll 0" anymore
    expect(diceLog[0].context).toBe("Roll 1");

    // Last entry should be "Roll 1000"
    expect(diceLog[diceLog.length - 1].context).toBe("Roll 1000");
  });

  test("keeps most recent entries during rotation", () => {
    // Pre-populate with 1005 entries
    for (let i = 0; i < 1005; i++) {
      rollDice("d20", `Roll ${i}`, true, diceLog);
    }

    // Should have rotated to 1000
    expect(diceLog.length).toBe(1000);

    // First entry should be "Roll 5" (oldest 5 removed)
    expect(diceLog[0].context).toBe("Roll 5");

    // Last entry should be "Roll 1004"
    expect(diceLog[diceLog.length - 1].context).toBe("Roll 1004");
  });

  // ========================
  // Error Handling Tests
  // ========================

  test("returns error for invalid expression", () => {
    const result = rollDice("invalid", "Test", true, diceLog);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBeDefined();
    expect(diceLog.length).toBe(0); // No log entry created
  });

  test("returns error for unsupported die type", () => {
    const result = rollDice("d7", "Test", true, diceLog);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("Invalid die type");
    expect(diceLog.length).toBe(0);
  });

  test("returns error for empty expression", () => {
    const result = rollDice("", "Test", true, diceLog);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toContain("Empty expression");
  });

  // ========================
  // UUID Uniqueness Tests
  // ========================

  test("generates unique UUIDs for each roll", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = rollDice("d20", `Roll ${i}`, true, diceLog);
      expect(result.success).toBe(true);
      if (!result.success) continue;

      ids.add(result.result.logId);
    }

    // All 100 IDs should be unique
    expect(ids.size).toBe(100);
  });

  // ========================
  // Statistical Validation Tests
  // ========================

  test("d6 distribution is approximately uniform (chi-squared test)", () => {
    const rolls = 6000; // Large sample for statistical significance
    const frequencies = new Map<number, number>();

    // Initialize frequencies
    for (let i = 1; i <= 6; i++) {
      frequencies.set(i, 0);
    }

    // Roll many times
    for (let i = 0; i < rolls; i++) {
      const result = rollDice("d6", "Distribution test", true, diceLog);
      expect(result.success).toBe(true);
      if (!result.success) continue;

      const value = result.result.individualRolls[0];
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
    }

    // Chi-squared test for uniformity
    // Expected frequency for each outcome: rolls / 6
    const expected = rolls / 6;

    let chiSquared = 0;
    for (let i = 1; i <= 6; i++) {
      const observed = frequencies.get(i) || 0;
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }

    // For 5 degrees of freedom (6 outcomes - 1), critical value at p=0.05 is 11.07
    // We use a more lenient threshold (15) to avoid flaky tests
    expect(chiSquared).toBeLessThan(15);
  });

  test("Fudge dice distribution is approximately uniform", () => {
    const rolls = 3000;
    const frequencies = new Map<number, number>([
      [-1, 0],
      [0, 0],
      [1, 0],
    ]);

    for (let i = 0; i < rolls; i++) {
      const result = rollDice("dF", "Fudge distribution test", true, diceLog);
      expect(result.success).toBe(true);
      if (!result.success) continue;

      const value = result.result.individualRolls[0];
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
    }

    // Each outcome should occur approximately rolls/3 times
    const expected = rolls / 3;

    let chiSquared = 0;
    for (const [_value, observed] of frequencies) {
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }

    // For 2 degrees of freedom (3 outcomes - 1), critical value at p=0.05 is 5.99
    // We use a more lenient threshold (8) to avoid flaky tests
    expect(chiSquared).toBeLessThan(8);
  });

  // ========================
  // Performance Tests
  // ========================

  test("completes single roll in under 100ms", () => {
    const start = performance.now();
    const result = rollDice("2d6+3", "Performance test", true, diceLog);
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(100);
  });

  test("completes complex expression in under 100ms", () => {
    const start = performance.now();
    const result = rollDice(
      "2d6+1d8+1d10+1d12+5",
      "Complex performance test",
      true,
      diceLog
    );
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(100);
  });

  test("maintains performance with large log (900 entries)", () => {
    // Pre-populate with 900 entries
    for (let i = 0; i < 900; i++) {
      rollDice("d20", `Setup ${i}`, true, diceLog);
    }

    const start = performance.now();
    const result = rollDice("2d6+3", "Performance test", true, diceLog);
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(100);
  });

  // ========================
  // Edge Cases
  // ========================

  test("handles very large modifier", () => {
    const result = rollDice("d20+999", "Large modifier", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.modifier).toBe(999);
    expect(result.result.total).toBeGreaterThanOrEqual(1000); // Minimum: 1 + 999
    expect(result.result.total).toBeLessThanOrEqual(1019); // Maximum: 20 + 999
  });

  test("handles very large negative modifier", () => {
    const result = rollDice("d20-15", "Large negative modifier", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.modifier).toBe(-15);
    expect(result.result.total).toBeGreaterThanOrEqual(-14); // Minimum: 1 - 15
    expect(result.result.total).toBeLessThanOrEqual(5); // Maximum: 20 - 15
  });

  test("handles multiple dice of same type", () => {
    const result = rollDice("10d6", "Many dice", true, diceLog);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.result.individualRolls.length).toBe(10);

    for (const roll of result.result.individualRolls) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });
});
