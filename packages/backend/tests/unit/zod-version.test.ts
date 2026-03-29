/**
 * Zod Version Compatibility Test
 *
 * The Claude Agent SDK requires Zod 3.x. Zod 4.x has breaking API changes
 * that cause MCP tools to fail with: "keyValidator._parse is not a function"
 *
 * This test ensures we don't accidentally upgrade to an incompatible version.
 */

import { describe, test, expect } from "bun:test";
import { z } from "zod";

describe("Zod version compatibility", () => {
  test("Zod must be version 3.x for SDK compatibility", () => {
    // Zod doesn't export version directly, but we can check for v3-specific behavior
    // In Zod 3.x, z.string() returns an object with _parse method
    // In Zod 4.x, this internal API changed, breaking the SDK

    const schema = z.string();

    // This internal method exists in Zod 3.x but was changed in 4.x
    // The SDK relies on this API for MCP tool validation
    expect(typeof (schema as unknown as { _parse: unknown })._parse).toBe(
      "function"
    );
  });

  test("Zod schema validation works correctly", () => {
    // Basic sanity check that Zod is working
    const schema = z.object({
      mood: z.enum(["calm", "tense", "ominous"]),
      genre: z.string(),
    });

    const valid = schema.safeParse({ mood: "calm", genre: "fantasy" });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({ mood: "invalid", genre: "fantasy" });
    expect(invalid.success).toBe(false);
  });
});
