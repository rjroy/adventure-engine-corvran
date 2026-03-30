import { describe, test, expect } from "bun:test";
import { slugify } from "../../src/services/slugify.js";

describe("slugify", () => {
  test("converts name with apostrophe", () => {
    expect(slugify("The Healer's Burden")).toBe("the-healers-burden");
  });

  test("converts simple multi-word name", () => {
    expect(slugify("My First Adventure")).toBe("my-first-adventure");
  });

  test("trims and collapses spaces", () => {
    expect(slugify("  Spaces  Everywhere  ")).toBe("spaces-everywhere");
  });

  test("falls back to 'adventure' for all-special-character input", () => {
    expect(slugify("!!!???")).toBe("adventure");
  });

  test("strips colons and keeps words", () => {
    expect(slugify("Daggerheart: Rise of Flame")).toBe("daggerheart-rise-of-flame");
  });

  test("preserves underscores", () => {
    expect(slugify("my_adventure")).toBe("my_adventure");
  });

  test("collapses consecutive hyphens", () => {
    expect(slugify("a--b---c")).toBe("a-b-c");
  });

  test("trims leading and trailing hyphens", () => {
    expect(slugify("-leading-trailing-")).toBe("leading-trailing");
  });

  test("falls back for empty string", () => {
    expect(slugify("")).toBe("adventure");
  });

  test("falls back for whitespace-only input", () => {
    expect(slugify("   ")).toBe("adventure");
  });
});
