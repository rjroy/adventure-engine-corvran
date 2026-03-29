import { describe, test, expect } from "bun:test";
import { parseHistory } from "../lib/parse-history";

describe("parseHistory", () => {
  test("parses empty string to empty array", () => {
    expect(parseHistory("")).toEqual([]);
    expect(parseHistory("   ")).toEqual([]);
  });

  test("parses single player message", () => {
    const result = parseHistory("**Player:** Hello there");
    expect(result).toEqual([{ role: "player", body: "Hello there" }]);
  });

  test("parses single GM message", () => {
    const result = parseHistory("**GM:** Welcome, adventurer.");
    expect(result).toEqual([{ role: "gm", body: "Welcome, adventurer." }]);
  });

  test("parses alternating Player/GM messages", () => {
    const history = `**Player:** I enter the cave.

**GM:** The cave is dark and damp. You hear dripping water.

**Player:** I light my torch.

**GM:** The torch illuminates ancient carvings on the walls.`;

    const result = parseHistory(history);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      role: "player",
      body: "I enter the cave.",
    });
    expect(result[1]).toEqual({
      role: "gm",
      body: "The cave is dark and damp. You hear dripping water.",
    });
    expect(result[2]).toEqual({
      role: "player",
      body: "I light my torch.",
    });
    expect(result[3]).toEqual({
      role: "gm",
      body: "The torch illuminates ancient carvings on the walls.",
    });
  });

  test("handles multi-paragraph GM responses by appending continuation blocks", () => {
    const history = `**GM:** First paragraph.

Second paragraph continues.

**Player:** My response.`;

    const result = parseHistory(history);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("gm");
    expect(result[0].body).toContain("First paragraph.");
    expect(result[0].body).toContain("Second paragraph continues.");
    expect(result[1].role).toBe("player");
  });

  test("handles extra blank lines between messages", () => {
    const history = `**Player:** Hello.



**GM:** Hi there.`;

    const result = parseHistory(history);
    expect(result).toHaveLength(2);
  });

  test("detects role correctly from prefix", () => {
    const history = `**Player:** I say **bold things** in my message.

**GM:** The **bold NPC** responds.`;

    const result = parseHistory(history);
    expect(result[0].role).toBe("player");
    expect(result[0].body).toContain("**bold things**");
    expect(result[1].role).toBe("gm");
    expect(result[1].body).toContain("**bold NPC**");
  });
});
