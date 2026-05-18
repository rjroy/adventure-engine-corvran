import { describe, test, expect } from "bun:test";
import { Value } from "typebox/value";
import {
  rollDice,
  createDiceToolDef,
  RollDiceInputSchema,
} from "../../src/services/dice-tool";

/** Returns a random function that yields values from a sequence, cycling if needed. */
function createSequence(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

/** Validate input through the actual typebox schema. Throws on invalid input. */
function parseInput(input: unknown) {
  if (!Value.Check(RollDiceInputSchema, input)) {
    throw new Error("Schema validation failed");
  }
  return input;
}

describe("rollDice", () => {
  describe("arithmetic correctness", () => {
    test("single group, single die", () => {
      // random=0.65, d=20: floor(0.65 * 20) + 1 = 14
      const result = rollDice(
        { groups: [{ n: 1, d: 20 }] },
        createSequence([0.65]),
      );
      expect(result.groups).toEqual([{ rolls: [14] }]);
      expect(result.modifier).toBe(0);
      expect(result.total).toBe(14);
    });

    test("single group, multiple dice", () => {
      // 0.5->4, 0.1->1, 0.9->6
      const result = rollDice(
        { groups: [{ n: 3, d: 6 }] },
        createSequence([0.5, 0.1, 0.9]),
      );
      expect(result.groups).toEqual([{ rolls: [4, 1, 6] }]);
      expect(result.total).toBe(11);
    });

    test("multiple groups with labels", () => {
      // hope: 0.7->floor(0.7*12)+1=9, fear: 0.4->floor(0.4*12)+1=5
      const result = rollDice(
        {
          groups: [
            { n: 1, d: 12, label: "hope" },
            { n: 1, d: 12, label: "fear" },
          ],
        },
        createSequence([0.7, 0.4]),
      );
      expect(result.groups).toEqual([
        { label: "hope", rolls: [9] },
        { label: "fear", rolls: [5] },
      ]);
      expect(result.total).toBe(14);
    });

    test("positive modifier", () => {
      // roll=4, modifier=+3, total=7
      const result = rollDice(
        { groups: [{ n: 1, d: 6 }], modifier: 3 },
        createSequence([0.5]),
      );
      expect(result.total).toBe(7);
      expect(result.modifier).toBe(3);
    });

    test("negative modifier", () => {
      // roll=4, modifier=-2, total=2
      const result = rollDice(
        { groups: [{ n: 1, d: 6 }], modifier: -2 },
        createSequence([0.5]),
      );
      expect(result.total).toBe(2);
      expect(result.modifier).toBe(-2);
    });

    test("zero modifier explicit and default", () => {
      const withExplicit = rollDice(
        { groups: [{ n: 1, d: 6 }], modifier: 0 },
        createSequence([0.5]),
      );
      expect(withExplicit.modifier).toBe(0);

      const withDefault = rollDice(
        { groups: [{ n: 1, d: 6 }] },
        createSequence([0.5]),
      );
      expect(withDefault.modifier).toBe(0);
    });
  });

  describe("threshold evaluation", () => {
    test("total equals threshold exactly", () => {
      // roll=14, modifier=+1, total=15, threshold=15
      const result = rollDice(
        { groups: [{ n: 1, d: 20 }], modifier: 1, threshold: 15 },
        createSequence([0.65]),
      );
      expect(result.total).toBe(15);
      expect(result.met).toBe(true);
      expect(result.threshold).toBe(15);
    });

    test("total exceeds threshold", () => {
      // roll=14, modifier=+5, total=19, threshold=15
      const result = rollDice(
        { groups: [{ n: 1, d: 20 }], modifier: 5, threshold: 15 },
        createSequence([0.65]),
      );
      expect(result.total).toBe(19);
      expect(result.met).toBe(true);
    });

    test("total below threshold", () => {
      // roll=floor(0.1*20)+1=3, total=3, threshold=15
      const result = rollDice(
        { groups: [{ n: 1, d: 20 }], threshold: 15 },
        createSequence([0.1]),
      );
      expect(result.total).toBe(3);
      expect(result.met).toBe(false);
    });

    test("no threshold omits threshold and met fields", () => {
      const result = rollDice(
        { groups: [{ n: 1, d: 6 }] },
        createSequence([0.5]),
      );
      expect(result.threshold).toBeUndefined();
      expect(result.met).toBeUndefined();
    });
  });

  describe("labels", () => {
    test("labels echoed from input", () => {
      const result = rollDice(
        { groups: [{ n: 1, d: 20, label: "attack" }] },
        createSequence([0.5]),
      );
      expect(result.groups[0].label).toBe("attack");
    });

    test("groups without labels omit label field", () => {
      const result = rollDice(
        { groups: [{ n: 1, d: 6 }] },
        createSequence([0.5]),
      );
      expect("label" in result.groups[0]).toBe(false);
    });

    test("mixed labeled and unlabeled groups", () => {
      const result = rollDice(
        {
          groups: [
            { n: 1, d: 12, label: "hope" },
            { n: 1, d: 12 },
          ],
        },
        createSequence([0.5, 0.5]),
      );
      expect(result.groups[0].label).toBe("hope");
      expect("label" in result.groups[1]).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("minimum valid input (1d2)", () => {
      // random=0.0 -> floor(0*2)+1=1
      const result = rollDice(
        { groups: [{ n: 1, d: 2 }] },
        createSequence([0.0]),
      );
      expect(result.groups[0].rolls).toEqual([1]);
      expect(result.total).toBe(1);
    });

    test("maximum cap succeeds (100d1000)", () => {
      // all random=0.999 -> floor(0.999*1000)+1=1000
      const result = rollDice(
        { groups: [{ n: 100, d: 1000 }] },
        createSequence([0.999]),
      );
      expect(result.groups[0].rolls).toHaveLength(100);
      expect(result.groups[0].rolls.every((r) => r === 1000)).toBe(true);
      expect(result.total).toBe(100000);
    });

    test("large negative modifier makes total negative", () => {
      // roll=floor(0.0*6)+1=1, modifier=-10, total=-9
      const result = rollDice(
        { groups: [{ n: 1, d: 6 }], modifier: -10 },
        createSequence([0.0]),
      );
      expect(result.total).toBe(-9);
    });
  });
});

describe("input validation (schema)", () => {
  test("rejects n = 0", () => {
    expect(() => parseInput({ groups: [{ n: 0, d: 6 }] })).toThrow();
  });

  test("rejects d = 1", () => {
    expect(() => parseInput({ groups: [{ n: 1, d: 1 }] })).toThrow();
  });

  test("rejects empty groups array", () => {
    expect(() => parseInput({ groups: [] })).toThrow();
  });

  test("rejects n over cap (101)", () => {
    expect(() => parseInput({ groups: [{ n: 101, d: 6 }] })).toThrow();
  });

  test("rejects d over cap (1001)", () => {
    expect(() => parseInput({ groups: [{ n: 1, d: 1001 }] })).toThrow();
  });
});

describe("createDiceToolDef", () => {
  test("returns a tool definition with the expected metadata", () => {
    const def = createDiceToolDef();
    expect(def.name).toBe("roll_dice");
    expect(def.label).toBe("Roll Dice");
    expect(def.parameters).toBe(RollDiceInputSchema);
    expect(typeof def.execute).toBe("function");
  });
});
