// Validation Tests
// Unit tests for adventure ID validation and path traversal prevention

import { describe, test, expect } from "bun:test";
import { validateAdventureId, safeResolvePath } from "../../src/validation";

describe("validateAdventureId()", () => {
  describe("valid IDs", () => {
    test("accepts UUID format", () => {
      const result = validateAdventureId(
        "550e8400-e29b-41d4-a716-446655440000"
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("accepts simple alphanumeric ID", () => {
      const result = validateAdventureId("adventure123");
      expect(result.valid).toBe(true);
    });

    test("accepts ID with hyphens", () => {
      const result = validateAdventureId("my-adventure-2024");
      expect(result.valid).toBe(true);
    });

    test("accepts ID with underscores", () => {
      const result = validateAdventureId("my_adventure_2024");
      expect(result.valid).toBe(true);
    });

    test("accepts single character ID", () => {
      const result = validateAdventureId("a");
      expect(result.valid).toBe(true);
    });
  });

  describe("path traversal attempts", () => {
    test("rejects forward slash", () => {
      const result = validateAdventureId("../etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });

    test("rejects backslash", () => {
      const result = validateAdventureId("..\\windows\\system32");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });

    test("rejects double dot", () => {
      const result = validateAdventureId("..");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("relative directory");
    });

    test("rejects single dot", () => {
      const result = validateAdventureId(".");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("relative directory");
    });

    test("rejects URL-encoded forward slash", () => {
      const result = validateAdventureId("..%2Fetc%2Fpasswd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects URL-encoded backslash", () => {
      const result = validateAdventureId("..%5Cwindows");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects URL-encoded double dot", () => {
      const result = validateAdventureId("%2e%2e");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects mixed path traversal", () => {
      const result = validateAdventureId("foo/../bar");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });
  });

  describe("invalid inputs", () => {
    test("rejects empty string", () => {
      const result = validateAdventureId("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("rejects whitespace-only string", () => {
      const result = validateAdventureId("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("rejects null byte", () => {
      const result = validateAdventureId("adventure\0id");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid characters");
    });
  });
});

describe("safeResolvePath()", () => {
  const baseDir = "/home/user/adventures";

  describe("valid paths", () => {
    test("resolves valid adventure ID", () => {
      const result = safeResolvePath(baseDir, "adventure123");
      expect(result).toBe("/home/user/adventures/adventure123");
    });

    test("resolves UUID-style ID", () => {
      const result = safeResolvePath(
        baseDir,
        "550e8400-e29b-41d4-a716-446655440000"
      );
      expect(result).toBe(
        "/home/user/adventures/550e8400-e29b-41d4-a716-446655440000"
      );
    });
  });

  describe("path traversal prevention", () => {
    test("returns null for path with forward slash", () => {
      const result = safeResolvePath(baseDir, "../etc/passwd");
      expect(result).toBeNull();
    });

    test("returns null for double dot", () => {
      const result = safeResolvePath(baseDir, "..");
      expect(result).toBeNull();
    });

    test("returns null for single dot", () => {
      const result = safeResolvePath(baseDir, ".");
      expect(result).toBeNull();
    });

    test("returns null for empty string", () => {
      const result = safeResolvePath(baseDir, "");
      expect(result).toBeNull();
    });
  });

  describe("relative base directory", () => {
    test("resolves with relative base", () => {
      const result = safeResolvePath("./adventures", "adventure123");
      expect(result).not.toBeNull();
      expect(result).toContain("adventures/adventure123");
    });
  });
});
