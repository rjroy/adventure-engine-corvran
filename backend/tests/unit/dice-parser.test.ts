// Dice Expression Parser Tests
// Unit tests for parsing dice notation expressions

import { describe, test, expect } from "bun:test";
import {
  parseDiceExpression,
  POLYHEDRAL_DICE,
} from "../../src/services/dice-parser";

describe("parseDiceExpression", () => {
  describe("polyhedral dice", () => {
    test("parses d4", () => {
      const result = parseDiceExpression("d4");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 4 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d6", () => {
      const result = parseDiceExpression("d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 6 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d8", () => {
      const result = parseDiceExpression("d8");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 8 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d10", () => {
      const result = parseDiceExpression("d10");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 10 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d12", () => {
      const result = parseDiceExpression("d12");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 12 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d20", () => {
      const result = parseDiceExpression("d20");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses d100", () => {
      const result = parseDiceExpression("d100");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 100 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("rejects invalid die types", () => {
      const invalidDice = ["d3", "d5", "d7", "d9", "d11", "d13", "d15", "d50"];

      for (const invalidDie of invalidDice) {
        const result = parseDiceExpression(invalidDie);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("Invalid die type");
          expect(result.error).toContain(invalidDie);
        }
      }
    });
  });

  describe("Fudge dice", () => {
    test("parses dF (lowercase)", () => {
      const result = parseDiceExpression("dF");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: "F" }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses df (case-insensitive)", () => {
      const result = parseDiceExpression("df");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: "F" }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 4dF", () => {
      const result = parseDiceExpression("4dF");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 4, sides: "F" }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 2dF", () => {
      const result = parseDiceExpression("2dF");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: "F" }]);
        expect(result.modifier).toBe(0);
      }
    });
  });

  describe("multiple dice", () => {
    test("parses 2d6", () => {
      const result = parseDiceExpression("2d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: 6 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 3d8", () => {
      const result = parseDiceExpression("3d8");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 3, sides: 8 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 10d10", () => {
      const result = parseDiceExpression("10d10");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 10, sides: 10 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 100d6 (large count)", () => {
      const result = parseDiceExpression("100d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 100, sides: 6 }]);
        expect(result.modifier).toBe(0);
      }
    });
  });

  describe("modifiers", () => {
    test("parses positive modifier: 2d6+3", () => {
      const result = parseDiceExpression("2d6+3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: 6 }]);
        expect(result.modifier).toBe(3);
      }
    });

    test("parses negative modifier: 1d20-2", () => {
      const result = parseDiceExpression("1d20-2");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(-2);
      }
    });

    test("parses d20+5", () => {
      const result = parseDiceExpression("d20+5");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(5);
      }
    });

    test("parses 4dF+2", () => {
      const result = parseDiceExpression("4dF+2");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 4, sides: "F" }]);
        expect(result.modifier).toBe(2);
      }
    });

    test("parses large modifier: d6+100", () => {
      const result = parseDiceExpression("d6+100");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 6 }]);
        expect(result.modifier).toBe(100);
      }
    });

    test("parses multiple modifier operations: d20+5-2", () => {
      const result = parseDiceExpression("d20+5-2");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(3); // 5 - 2
      }
    });

    test("parses zero modifier: d20+0", () => {
      const result = parseDiceExpression("d20+0");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(0);
      }
    });
  });

  describe("combined expressions (stretch goal)", () => {
    test("parses 2d6+1d4", () => {
      const result = parseDiceExpression("2d6+1d4");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([
          { count: 2, sides: 6 },
          { count: 1, sides: 4 },
        ]);
        expect(result.modifier).toBe(0);
      }
    });

    test("parses 2d6+1d4+5", () => {
      const result = parseDiceExpression("2d6+1d4+5");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([
          { count: 2, sides: 6 },
          { count: 1, sides: 4 },
        ]);
        expect(result.modifier).toBe(5);
      }
    });

    test("parses d20+d12+d8+3", () => {
      const result = parseDiceExpression("d20+d12+d8+3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([
          { count: 1, sides: 20 },
          { count: 1, sides: 12 },
          { count: 1, sides: 8 },
        ]);
        expect(result.modifier).toBe(3);
      }
    });

    test("parses 3d6+2d4+1d8+10", () => {
      const result = parseDiceExpression("3d6+2d4+1d8+10");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([
          { count: 3, sides: 6 },
          { count: 2, sides: 4 },
          { count: 1, sides: 8 },
        ]);
        expect(result.modifier).toBe(10);
      }
    });

    test("parses 4dF+2d6", () => {
      const result = parseDiceExpression("4dF+2d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([
          { count: 4, sides: "F" },
          { count: 2, sides: 6 },
        ]);
        expect(result.modifier).toBe(0);
      }
    });

    test("rejects subtracting dice: 2d6-1d4", () => {
      const result = parseDiceExpression("2d6-1d4");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot subtract dice");
      }
    });
  });

  describe("whitespace handling", () => {
    test("handles spaces: '2d6 + 3'", () => {
      const result = parseDiceExpression("2d6 + 3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: 6 }]);
        expect(result.modifier).toBe(3);
      }
    });

    test("handles tabs and spaces: '  d20  +  5  '", () => {
      const result = parseDiceExpression("  d20  +  5  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(5);
      }
    });

    test("handles no spaces: '2d6+1d4+5'", () => {
      const result = parseDiceExpression("2d6+1d4+5");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice.length).toBe(2);
        expect(result.modifier).toBe(5);
      }
    });
  });

  describe("error cases", () => {
    test("rejects empty string", () => {
      const result = parseDiceExpression("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Empty expression");
        expect(result.error).toContain("Valid examples");
      }
    });

    test("rejects whitespace-only string", () => {
      const result = parseDiceExpression("   ");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Empty expression");
      }
    });

    test("rejects invalid die type: d7", () => {
      const result = parseDiceExpression("d7");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid die type: d7");
        expect(result.error).toContain("Valid types");
        expect(result.error).toContain("d4, d6, d8, d10, d12, d20, d100, dF");
      }
    });

    test("rejects negative dice count: -2d6", () => {
      const result = parseDiceExpression("-2d6");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid expression");
        expect(result.error).toContain("unexpected");
      }
    });

    test("rejects malformed expression: 2d", () => {
      const result = parseDiceExpression("2d");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid dice notation");
      }
    });

    test("rejects malformed expression: d", () => {
      const result = parseDiceExpression("d");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid dice notation");
      }
    });

    test("rejects just a number: 5", () => {
      const result = parseDiceExpression("5");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No dice specified");
      }
    });

    test("rejects trailing operator: 2d6+", () => {
      const result = parseDiceExpression("2d6+");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Incomplete expression");
        expect(result.error).toContain("trailing operator");
      }
    });

    test("rejects invalid characters: 2d6@3", () => {
      const result = parseDiceExpression("2d6@3");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }
    });

    test("rejects double operators: 2d6++3", () => {
      const result = parseDiceExpression("2d6++3");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }
    });

    test("allows zero dice count: 0d6 (edge case)", () => {
      // While semantically odd, we allow this and let the GM/roller handle it
      const result = parseDiceExpression("0d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 0, sides: 6 }]);
        expect(result.modifier).toBe(0);
      }
    });
  });

  describe("edge cases", () => {
    test("parses 1d20 (explicit 1)", () => {
      const result = parseDiceExpression("1d20");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
      }
    });

    test("case-insensitive: D20", () => {
      const result = parseDiceExpression("D20");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
      }
    });

    test("case-insensitive: 2D6+3", () => {
      const result = parseDiceExpression("2D6+3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: 6 }]);
        expect(result.modifier).toBe(3);
      }
    });

    test("handles large numbers: 999d100+9999", () => {
      const result = parseDiceExpression("999d100+9999");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 999, sides: 100 }]);
        expect(result.modifier).toBe(9999);
      }
    });

    test("parses negative total modifier: d20+2-5", () => {
      const result = parseDiceExpression("d20+2-5");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.modifier).toBe(-3); // 2 - 5
      }
    });
  });

  describe("performance", () => {
    test("parses simple expression in <10ms", () => {
      const start = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        parseDiceExpression("2d6+3");
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(10);
    });

    test("parses complex expression in <10ms", () => {
      const start = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        parseDiceExpression("3d6+2d4+1d8+1d10+5-2+3");
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe("POLYHEDRAL_DICE constant", () => {
    test("exports valid dice types", () => {
      expect(POLYHEDRAL_DICE).toEqual([4, 6, 8, 10, 12, 20, 100]);
    });
  });

  describe("real-world examples", () => {
    test("D&D ability check: 1d20+5", () => {
      const result = parseDiceExpression("1d20+5");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 20 }]);
        expect(result.modifier).toBe(5);
      }
    });

    test("D&D damage roll: 2d6+3", () => {
      const result = parseDiceExpression("2d6+3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 2, sides: 6 }]);
        expect(result.modifier).toBe(3);
      }
    });

    test("Fate/Fudge check: 4dF+2", () => {
      const result = parseDiceExpression("4dF+2");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 4, sides: "F" }]);
        expect(result.modifier).toBe(2);
      }
    });

    test("Fireball damage: 8d6", () => {
      const result = parseDiceExpression("8d6");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 8, sides: 6 }]);
        expect(result.modifier).toBe(0);
      }
    });

    test("Percentile roll: d100", () => {
      const result = parseDiceExpression("d100");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dice).toEqual([{ count: 1, sides: 100 }]);
        expect(result.modifier).toBe(0);
      }
    });
  });
});
