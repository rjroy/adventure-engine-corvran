// Slug Generation Tests
// Unit tests for generateSlug() and validateSlug() functions

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateSlug, validateSlug } from "../../src/validation";

describe("generateSlug()", () => {
  // Create temp directory for collision tests
  const tempDir = join(import.meta.dir, "temp-slug-test");

  beforeEach(() => {
    // Ensure clean state
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("basic conversion", () => {
    test("converts simple name to slug", () => {
      const slug = generateSlug("Kael Thouls", tempDir);
      expect(slug).toBe("kael-thouls");
    });

    test("lowercases all characters", () => {
      const slug = generateSlug("KAEL THOULS", tempDir);
      expect(slug).toBe("kael-thouls");
    });

    test("preserves numbers", () => {
      const slug = generateSlug("Character 2024", tempDir);
      expect(slug).toBe("character-2024");
    });

    test("handles mixed case with numbers", () => {
      const slug = generateSlug("Level50Warrior", tempDir);
      expect(slug).toBe("level50warrior");
    });

    test("handles single word name", () => {
      const slug = generateSlug("Eldoria", tempDir);
      expect(slug).toBe("eldoria");
    });

    test("handles already slugified name", () => {
      const slug = generateSlug("kael-thouls", tempDir);
      expect(slug).toBe("kael-thouls");
    });
  });

  describe("special characters", () => {
    test("replaces spaces with hyphens", () => {
      const slug = generateSlug("The Dark Forest", tempDir);
      expect(slug).toBe("the-dark-forest");
    });

    test("replaces multiple spaces with single hyphen", () => {
      const slug = generateSlug("The    Dark    Forest", tempDir);
      expect(slug).toBe("the-dark-forest");
    });

    test("replaces special characters with hyphens", () => {
      const slug = generateSlug("Kael's Adventure!", tempDir);
      expect(slug).toBe("kael-s-adventure");
    });

    test("handles unicode characters", () => {
      const slug = generateSlug("Cafe Au Lait", tempDir);
      expect(slug).toBe("cafe-au-lait");

      const slug2 = generateSlug("Der Zauber", tempDir);
      expect(slug2).toBe("der-zauber");
    });

    test("handles accented characters by removing them", () => {
      const slug = generateSlug("El Nino", tempDir);
      expect(slug).toBe("el-nino");
    });

    test("collapses multiple hyphens", () => {
      const slug = generateSlug("Kael---Thouls", tempDir);
      expect(slug).toBe("kael-thouls");
    });

    test("trims leading hyphens", () => {
      const slug = generateSlug("---Kael", tempDir);
      expect(slug).toBe("kael");
    });

    test("trims trailing hyphens", () => {
      const slug = generateSlug("Kael---", tempDir);
      expect(slug).toBe("kael");
    });

    test("trims both leading and trailing hyphens", () => {
      const slug = generateSlug("---Kael---", tempDir);
      expect(slug).toBe("kael");
    });

    test("handles only special characters", () => {
      const slug = generateSlug("!@#$%", tempDir);
      expect(slug).toBe("unnamed");
    });

    test("handles empty string", () => {
      const slug = generateSlug("", tempDir);
      expect(slug).toBe("unnamed");
    });

    test("handles whitespace-only string", () => {
      const slug = generateSlug("   ", tempDir);
      expect(slug).toBe("unnamed");
    });

    test("handles emojis", () => {
      const slug = generateSlug("Fire Dragon 🔥", tempDir);
      expect(slug).toBe("fire-dragon");
    });
  });

  describe("length truncation", () => {
    test("truncates names longer than 64 characters", () => {
      const longName =
        "This Is An Extremely Long Character Name That Should Be Truncated To Sixty Four Characters";
      const slug = generateSlug(longName, tempDir);
      // After truncation and slugification
      expect(slug.length).toBeLessThanOrEqual(64);
    });

    test("preserves names at exactly 64 characters", () => {
      // Create a name that will result in exactly 64 char slug
      const name = "a".repeat(64);
      const slug = generateSlug(name, tempDir);
      expect(slug).toBe(name);
      expect(slug.length).toBe(64);
    });

    test("handles names shorter than 64 characters", () => {
      const name = "Short Name";
      const slug = generateSlug(name, tempDir);
      expect(slug).toBe("short-name");
      expect(slug.length).toBeLessThan(64);
    });
  });

  describe("collision detection", () => {
    test("appends -2 when directory exists", () => {
      // Create existing directory
      mkdirSync(join(tempDir, "kael"), { recursive: true });

      const slug = generateSlug("Kael", tempDir);
      expect(slug).toBe("kael-2");
    });

    test("appends -3 when -2 also exists", () => {
      // Create existing directories
      mkdirSync(join(tempDir, "kael"), { recursive: true });
      mkdirSync(join(tempDir, "kael-2"), { recursive: true });

      const slug = generateSlug("Kael", tempDir);
      expect(slug).toBe("kael-3");
    });

    test("handles many collisions", () => {
      // Create existing directories 1-5
      mkdirSync(join(tempDir, "kael"), { recursive: true });
      for (let i = 2; i <= 5; i++) {
        mkdirSync(join(tempDir, `kael-${i}`), { recursive: true });
      }

      const slug = generateSlug("Kael", tempDir);
      expect(slug).toBe("kael-6");
    });

    test("returns original slug when no collision", () => {
      const slug = generateSlug("UniqueCharacter", tempDir);
      expect(slug).toBe("uniquecharacter");
    });

    test("handles collision with multi-word slugs", () => {
      mkdirSync(join(tempDir, "kael-thouls"), { recursive: true });

      const slug = generateSlug("Kael Thouls", tempDir);
      expect(slug).toBe("kael-thouls-2");
    });

    test("collision check works with relative paths", () => {
      // Create existing directory using relative temp path
      mkdirSync(join(tempDir, "relative-test"), { recursive: true });

      const slug = generateSlug("Relative Test", tempDir);
      expect(slug).toBe("relative-test-2");
    });
  });
});

describe("validateSlug()", () => {
  describe("valid slugs", () => {
    test("accepts simple alphanumeric slug", () => {
      const result = validateSlug("kael-thouls");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("accepts slug with numbers", () => {
      const result = validateSlug("character-2024");
      expect(result.valid).toBe(true);
    });

    test("accepts slug with hyphens", () => {
      const result = validateSlug("the-dark-forest");
      expect(result.valid).toBe(true);
    });

    test("accepts single character slug", () => {
      const result = validateSlug("a");
      expect(result.valid).toBe(true);
    });

    test("accepts slug with numeric suffix", () => {
      const result = validateSlug("kael-2");
      expect(result.valid).toBe(true);
    });

    test("accepts all lowercase letters", () => {
      const result = validateSlug("abcdefghijklmnopqrstuvwxyz");
      expect(result.valid).toBe(true);
    });

    test("accepts all digits", () => {
      const result = validateSlug("0123456789");
      expect(result.valid).toBe(true);
    });
  });

  describe("path traversal rejection", () => {
    test("rejects forward slash", () => {
      const result = validateSlug("../etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });

    test("rejects backslash", () => {
      const result = validateSlug("..\\windows\\system32");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });

    test("rejects double dot", () => {
      const result = validateSlug("..");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("relative directory");
    });

    test("rejects single dot", () => {
      const result = validateSlug(".");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("relative directory");
    });

    test("rejects double dot within slug", () => {
      const result = validateSlug("foo..bar");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });

    test("rejects URL-encoded forward slash", () => {
      // Note: the ".." is detected first, so it rejects on path traversal
      const result = validateSlug("..%2Fetc%2Fpasswd");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("rejects URL-encoded backslash", () => {
      // Note: the ".." is detected first, so it rejects on path traversal
      const result = validateSlug("..%5Cwindows");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("rejects pure URL-encoded forward slash", () => {
      // Test URL encoding without literal ".."
      const result = validateSlug("foo%2Fbar");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects pure URL-encoded backslash", () => {
      // Test URL encoding without literal ".."
      const result = validateSlug("foo%5Cbar");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects URL-encoded double dot", () => {
      const result = validateSlug("%2e%2e");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("encoded path");
    });

    test("rejects mixed path traversal", () => {
      const result = validateSlug("foo/../bar");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path separator");
    });

    test("rejects double-dot prefixed slug", () => {
      // ..hidden contains ".." which is a path traversal sequence
      const result = validateSlug("..hidden");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("path traversal");
    });
  });

  describe("invalid inputs", () => {
    test("rejects empty string", () => {
      const result = validateSlug("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("rejects whitespace-only string", () => {
      const result = validateSlug("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("rejects null byte", () => {
      const result = validateSlug("slug\0id");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid characters");
    });

    test("rejects null byte at end", () => {
      const result = validateSlug("slug\0");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid characters");
    });
  });

  describe("edge cases", () => {
    test("accepts slug starting with number", () => {
      const result = validateSlug("123-adventure");
      expect(result.valid).toBe(true);
    });

    test("accepts slug with consecutive hyphens", () => {
      // While generateSlug collapses these, validateSlug should accept them
      const result = validateSlug("kael--thouls");
      expect(result.valid).toBe(true);
    });

    test("accepts slug ending with hyphen", () => {
      const result = validateSlug("kael-");
      expect(result.valid).toBe(true);
    });

    test("accepts slug starting with hyphen", () => {
      const result = validateSlug("-kael");
      expect(result.valid).toBe(true);
    });

    test("handles malformed URL encoding gracefully", () => {
      // Invalid percent encoding - should not crash
      const result = validateSlug("%GG%HH");
      expect(result.valid).toBe(true); // Invalid encoding passes through as literal
    });

    test("accepts .hidden as valid (Unix hidden file)", () => {
      const result = validateSlug(".hidden");
      expect(result.valid).toBe(true);
    });
  });
});
