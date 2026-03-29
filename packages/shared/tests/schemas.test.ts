import { describe, expect, test } from "bun:test";
import {
  AdventureListItemSchema,
  AdventureListResponseSchema,
  AdventureDetailSchema,
  MessageRequestSchema,
  HistoryResponseSchema,
  HealthResponseSchema,
  TextEventSchema,
  ToolUseEventSchema,
  DoneEventSchema,
  ErrorEventSchema,
} from "../src/index.js";

describe("AdventureListItemSchema", () => {
  test("accepts valid item", () => {
    const result = AdventureListItemSchema.parse({
      id: "lost-mines",
      name: "lost-mines",
      hasCharacter: true,
      hasWorld: false,
      hasHistory: true,
    });
    expect(result.id).toBe("lost-mines");
  });

  test("rejects missing fields", () => {
    expect(() => AdventureListItemSchema.parse({ id: "test" })).toThrow();
  });
});

describe("AdventureListResponseSchema", () => {
  test("accepts valid response", () => {
    const result = AdventureListResponseSchema.parse({
      adventures: [
        { id: "a", name: "a", hasCharacter: false, hasWorld: false, hasHistory: false },
      ],
    });
    expect(result.adventures).toHaveLength(1);
  });

  test("rejects non-array adventures", () => {
    expect(() => AdventureListResponseSchema.parse({ adventures: "bad" })).toThrow();
  });
});

describe("AdventureDetailSchema", () => {
  test("accepts valid detail with null fields", () => {
    const result = AdventureDetailSchema.parse({
      id: "lost-mines",
      name: "lost-mines",
      character: null,
      world: "# The Lost Mines\n...",
      hasHistory: false,
    });
    expect(result.character).toBeNull();
    expect(result.world).toBe("# The Lost Mines\n...");
  });

  test("rejects missing id", () => {
    expect(() =>
      AdventureDetailSchema.parse({
        name: "test",
        character: null,
        world: null,
        hasHistory: false,
      })
    ).toThrow();
  });
});

describe("MessageRequestSchema", () => {
  test("accepts valid message", () => {
    const result = MessageRequestSchema.parse({ message: "I search the room." });
    expect(result.message).toBe("I search the room.");
  });

  test("rejects empty message", () => {
    expect(() => MessageRequestSchema.parse({ message: "" })).toThrow();
  });
});

describe("HistoryResponseSchema", () => {
  test("accepts existing history", () => {
    const result = HistoryResponseSchema.parse({
      history: "**Player:** Hello\n\n**GM:** Welcome!",
      exists: true,
    });
    expect(result.exists).toBe(true);
  });

  test("accepts missing history", () => {
    const result = HistoryResponseSchema.parse({ history: null, exists: false });
    expect(result.history).toBeNull();
  });

  test("rejects missing exists field", () => {
    expect(() => HistoryResponseSchema.parse({ history: null })).toThrow();
  });
});

describe("HealthResponseSchema", () => {
  test("accepts valid health", () => {
    const result = HealthResponseSchema.parse({ status: "ok", version: "0.1.0" });
    expect(result.status).toBe("ok");
  });

  test("rejects missing version", () => {
    expect(() => HealthResponseSchema.parse({ status: "ok" })).toThrow();
  });
});

describe("TextEventSchema", () => {
  test("accepts valid text event", () => {
    const result = TextEventSchema.parse({ text: "You see a door." });
    expect(result.text).toBe("You see a door.");
  });

  test("rejects missing text", () => {
    expect(() => TextEventSchema.parse({})).toThrow();
  });
});

describe("ToolUseEventSchema", () => {
  test("accepts valid tool use event", () => {
    const result = ToolUseEventSchema.parse({ name: "dice-roll", result: "Rolled 15" });
    expect(result.name).toBe("dice-roll");
  });

  test("rejects missing result", () => {
    expect(() => ToolUseEventSchema.parse({ name: "dice-roll" })).toThrow();
  });
});

describe("DoneEventSchema", () => {
  test("accepts valid done event", () => {
    const result = DoneEventSchema.parse({ fullResponse: "The door opens..." });
    expect(result.fullResponse).toBe("The door opens...");
  });

  test("rejects missing fullResponse", () => {
    expect(() => DoneEventSchema.parse({})).toThrow();
  });
});

describe("ErrorEventSchema", () => {
  test("accepts valid error event", () => {
    const result = ErrorEventSchema.parse({ error: "Context overflow" });
    expect(result.error).toBe("Context overflow");
  });

  test("rejects missing error", () => {
    expect(() => ErrorEventSchema.parse({})).toThrow();
  });
});
