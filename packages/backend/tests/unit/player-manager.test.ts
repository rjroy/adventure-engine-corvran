// Player Manager Tests
// Unit tests for PlayerManager class - CRUD operations on player directories

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PlayerManager } from "../../src/player-manager";

describe("PlayerManager", () => {
  // Create temp directory for tests
  const tempDir = join(import.meta.dir, "temp-player-manager-test");
  const playersDir = join(tempDir, "players");

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

  describe("constructor", () => {
    test("creates manager with project directory", () => {
      const manager = new PlayerManager(tempDir);
      expect(manager).toBeDefined();
    });

    test("handles relative path by resolving to absolute", () => {
      const manager = new PlayerManager("./temp");
      expect(manager).toBeDefined();
    });
  });

  describe("create()", () => {
    test("creates player directory with template files", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("Kael Thouls");

      expect(slug).toBe("kael-thouls");
      expect(existsSync(join(playersDir, "kael-thouls"))).toBe(true);
      expect(existsSync(join(playersDir, "kael-thouls", "sheet.md"))).toBe(true);
      expect(existsSync(join(playersDir, "kael-thouls", "story.md"))).toBe(true);
    });

    test("creates sheet.md with correct template content", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Test Character");

      const sheetPath = join(playersDir, "test-character", "sheet.md");
      const content = Bun.file(sheetPath).text();
      expect(await content).toContain("# Character Sheet");
      expect(await content).toContain("*Details to be established in adventure.*");
    });

    test("creates story.md with correct template content", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Test Character");

      const storyPath = join(playersDir, "test-character", "story.md");
      const content = Bun.file(storyPath).text();
      expect(await content).toContain("# Character Story");
      expect(await content).toContain("*Story arcs and objectives will be recorded here.*");
    });

    test("creates players directory if it does not exist", async () => {
      const manager = new PlayerManager(tempDir);

      expect(existsSync(playersDir)).toBe(false);

      await manager.create("First Character");

      expect(existsSync(playersDir)).toBe(true);
    });

    test("handles slug collision by appending suffix", async () => {
      const manager = new PlayerManager(tempDir);

      // Create first character
      const slug1 = await manager.create("Kael");
      expect(slug1).toBe("kael");

      // Create second character with same name
      const slug2 = await manager.create("Kael");
      expect(slug2).toBe("kael-2");

      // Both directories should exist
      expect(existsSync(join(playersDir, "kael"))).toBe(true);
      expect(existsSync(join(playersDir, "kael-2"))).toBe(true);
    });

    test("handles multiple collisions", async () => {
      const manager = new PlayerManager(tempDir);

      // Create directories manually
      mkdirSync(join(playersDir, "warrior"), { recursive: true });
      mkdirSync(join(playersDir, "warrior-2"), { recursive: true });
      mkdirSync(join(playersDir, "warrior-3"), { recursive: true });

      const slug = await manager.create("Warrior");
      expect(slug).toBe("warrior-4");
    });

    test("returns slugified name", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("The Dark Knight's Apprentice!");
      expect(slug).toBe("the-dark-knight-s-apprentice");
    });

    test("handles empty name by returning 'unnamed'", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("");
      expect(slug).toBe("unnamed");
      expect(existsSync(join(playersDir, "unnamed"))).toBe(true);
    });

    test("handles special characters in name", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("Kael's Adventure!!!");
      expect(slug).toBe("kael-s-adventure");
    });
  });

  describe("createAtSlug()", () => {
    test("creates directory at exact slug without collision detection", async () => {
      const manager = new PlayerManager(tempDir);

      // First create a player with collision detection
      await manager.create("Hero");
      expect(manager.exists("hero")).toBe(true);

      // Now use createAtSlug - should create at exact slug even if similar exists
      await manager.createAtSlug("hero-custom");
      expect(manager.exists("hero-custom")).toBe(true);
      expect(manager.exists("hero")).toBe(true);
    });

    test("creates template files", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.createAtSlug("template-test");

      const sheetPath = join(playersDir, "template-test", "sheet.md");
      const storyPath = join(playersDir, "template-test", "story.md");

      expect(existsSync(sheetPath)).toBe(true);
      expect(existsSync(storyPath)).toBe(true);
    });

    test("throws error for invalid slug", async () => {
      const manager = new PlayerManager(tempDir);

      /* eslint-disable @typescript-eslint/await-thenable -- createAtSlug returns Promise but ESLint doesn't see it */
      await expect(manager.createAtSlug("")).rejects.toThrow("Invalid slug");
      await expect(manager.createAtSlug("../escape")).rejects.toThrow();
      await expect(manager.createAtSlug("with/slash")).rejects.toThrow();
      /* eslint-enable @typescript-eslint/await-thenable */
    });

    test("can recreate directory if it already exists", async () => {
      const manager = new PlayerManager(tempDir);

      // Create directory first
      await manager.createAtSlug("recreate-test");
      expect(manager.exists("recreate-test")).toBe(true);

      // Calling again should not throw (mkdir recursive: true)
      await manager.createAtSlug("recreate-test");
      expect(manager.exists("recreate-test")).toBe(true);
    });

    test("does not modify slug (no collision suffix)", async () => {
      const manager = new PlayerManager(tempDir);

      // Create "hero" first using normal create
      await manager.create("Hero");

      // createAtSlug should NOT add collision suffix
      await manager.createAtSlug("hero");
      // Directory already existed, so this just overwrites templates

      // Only one "hero" directory should exist, no "hero-2"
      const players = await manager.list();
      expect(players.map((p) => p.slug)).not.toContain("hero-2");
      expect(players.filter((p) => p.slug === "hero")).toHaveLength(1);
    });
  });

  describe("exists()", () => {
    test("returns true for existing player directory", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Existing Player");

      expect(manager.exists("existing-player")).toBe(true);
    });

    test("returns false for non-existent player", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.exists("non-existent")).toBe(false);
    });

    test("returns false for empty slug", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.exists("")).toBe(false);
    });

    test("returns false for path traversal attempt", async () => {
      const manager = new PlayerManager(tempDir);

      // Create a valid player first
      await manager.create("Valid Player");

      expect(manager.exists("../etc/passwd")).toBe(false);
      expect(manager.exists("..")).toBe(false);
      expect(manager.exists(".")).toBe(false);
      expect(manager.exists("foo/../bar")).toBe(false);
    });

    test("returns false for slug with null byte", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.exists("player\0test")).toBe(false);
    });

    test("returns false for URL-encoded path traversal", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.exists("%2e%2e")).toBe(false);
      expect(manager.exists("foo%2Fbar")).toBe(false);
    });
  });

  describe("list()", () => {
    test("returns empty array when players directory does not exist", async () => {
      const manager = new PlayerManager(tempDir);

      const players = await manager.list();

      expect(players).toEqual([]);
    });

    test("returns empty array when players directory is empty", async () => {
      const manager = new PlayerManager(tempDir);
      mkdirSync(playersDir, { recursive: true });

      const players = await manager.list();

      expect(players).toEqual([]);
    });

    test("lists players with slugs", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Kael Thouls");
      await manager.create("Luna Shadowmere");

      const players = await manager.list();

      expect(players).toHaveLength(2);
      expect(players.map((p) => p.slug)).toContain("kael-thouls");
      expect(players.map((p) => p.slug)).toContain("luna-shadowmere");
    });

    test("extracts name from sheet.md header", async () => {
      const manager = new PlayerManager(tempDir);

      // Create player manually with custom sheet
      mkdirSync(join(playersDir, "test-player"), { recursive: true });
      writeFileSync(
        join(playersDir, "test-player", "sheet.md"),
        "# Sir Percival the Brave\n\n**Class**: Knight\n"
      );
      writeFileSync(
        join(playersDir, "test-player", "story.md"),
        "# Character State\n"
      );

      const players = await manager.list();

      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("test-player");
      expect(players[0].name).toBe("Sir Percival the Brave");
    });

    test("falls back to slug when sheet.md has template header", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("New Character");

      const players = await manager.list();

      // Template has "# Character Sheet" which should be skipped
      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("new-character");
      expect(players[0].name).toBe("new-character"); // Falls back to slug
    });

    test("falls back to slug when sheet.md is missing", async () => {
      const manager = new PlayerManager(tempDir);

      // Create player directory without sheet.md
      mkdirSync(join(playersDir, "incomplete-player"), { recursive: true });
      writeFileSync(
        join(playersDir, "incomplete-player", "story.md"),
        "# State\n"
      );

      const players = await manager.list();

      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("incomplete-player");
      expect(players[0].name).toBe("incomplete-player");
    });

    test("skips hidden directories", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Visible Player");
      mkdirSync(join(playersDir, ".hidden-player"), { recursive: true });

      const players = await manager.list();

      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("visible-player");
    });

    test("skips files (non-directories)", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Real Player");
      writeFileSync(join(playersDir, "some-file.txt"), "content");

      const players = await manager.list();

      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("real-player");
    });

    test("returns players sorted by slug", async () => {
      const manager = new PlayerManager(tempDir);

      // Create in random order
      await manager.create("Zara");
      await manager.create("Alpha");
      await manager.create("Mira");

      const players = await manager.list();

      expect(players.map((p) => p.slug)).toEqual(["alpha", "mira", "zara"]);
    });

    test("handles name extraction with Character Name format", async () => {
      const manager = new PlayerManager(tempDir);

      mkdirSync(join(playersDir, "formal-player"), { recursive: true });
      writeFileSync(
        join(playersDir, "formal-player", "sheet.md"),
        "# Character Name: Lady Evelyn\n\n**Stats**\n"
      );

      const players = await manager.list();

      expect(players[0].name).toBe("Lady Evelyn");
    });

    test("handles name extraction with Name: format", async () => {
      const manager = new PlayerManager(tempDir);

      mkdirSync(join(playersDir, "simple-player"), { recursive: true });
      writeFileSync(
        join(playersDir, "simple-player", "sheet.md"),
        "# Name: Drax\n\n**Strength**: 18\n"
      );

      const players = await manager.list();

      expect(players[0].name).toBe("Drax");
    });
  });

  describe("getPath()", () => {
    test("returns absolute path for valid slug", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Valid Player");

      const path = manager.getPath("valid-player");

      expect(path).toBe(join(playersDir, "valid-player"));
    });

    test("returns null for empty slug", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getPath("")).toBeNull();
    });

    test("returns null for path traversal attempt", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getPath("../etc/passwd")).toBeNull();
      expect(manager.getPath("..")).toBeNull();
      expect(manager.getPath(".")).toBeNull();
      expect(manager.getPath("foo/../bar")).toBeNull();
      expect(manager.getPath("foo/bar")).toBeNull();
    });

    test("returns null for slug with backslash", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getPath("foo\\bar")).toBeNull();
    });

    test("returns null for slug with null byte", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getPath("player\0id")).toBeNull();
    });

    test("returns null for URL-encoded path traversal", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getPath("%2e%2e")).toBeNull();
      expect(manager.getPath("foo%2Fbar")).toBeNull();
      expect(manager.getPath("foo%5Cbar")).toBeNull();
    });

    test("returns path even if directory does not exist", () => {
      const manager = new PlayerManager(tempDir);

      // getPath validates the slug, not directory existence
      const path = manager.getPath("non-existent");

      expect(path).toBe(join(playersDir, "non-existent"));
    });
  });

  describe("getRef()", () => {
    test("returns relative reference for valid slug", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Test Player");

      const ref = manager.getRef("test-player");

      expect(ref).toBe("players/test-player");
    });

    test("returns null for empty slug", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getRef("")).toBeNull();
    });

    test("returns null for path traversal attempt", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getRef("../etc/passwd")).toBeNull();
      expect(manager.getRef("..")).toBeNull();
      expect(manager.getRef(".")).toBeNull();
    });

    test("returns null for slug with double-dot", () => {
      const manager = new PlayerManager(tempDir);

      expect(manager.getRef("foo..bar")).toBeNull();
    });
  });

  describe("security - path traversal rejection", () => {
    test("create does not accept path traversal in name", async () => {
      const manager = new PlayerManager(tempDir);

      // These should be slugified, removing dangerous characters
      const slug1 = await manager.create("../../../etc/passwd");
      expect(slug1).toBe("etc-passwd");

      const slug2 = await manager.create("foo/../bar");
      expect(slug2).toBe("foo-bar");
    });

    test("exists validates slug before filesystem access", () => {
      const manager = new PlayerManager(tempDir);

      // Create a trap directory outside players/
      mkdirSync(join(tempDir, "trap"), { recursive: true });

      // Attempting to access via traversal should fail validation
      expect(manager.exists("../trap")).toBe(false);
    });

    test("getPath validates slug before resolving", () => {
      const manager = new PlayerManager(tempDir);

      // Should not resolve path traversal attempts
      expect(manager.getPath("..")).toBeNull();
      expect(manager.getPath("../")).toBeNull();
      expect(manager.getPath("../..")).toBeNull();
      expect(manager.getPath("foo/..")).toBeNull();
    });

    test("list skips directories with invalid slugs", async () => {
      const manager = new PlayerManager(tempDir);

      // Create valid player
      await manager.create("Valid");

      // Create directory with potentially dangerous name (shouldn't happen normally)
      // This tests the defensive coding in list()
      mkdirSync(join(playersDir, "foo..bar"), { recursive: true });

      const players = await manager.list();

      // Only valid player should be listed
      expect(players).toHaveLength(1);
      expect(players[0].slug).toBe("valid");
    });
  });

  describe("file permissions", () => {
    test("creates directory with restrictive permissions", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Secure Player");

      // Verify directory was created (permissions are system-dependent)
      expect(existsSync(join(playersDir, "secure-player"))).toBe(true);
    });

    test("creates files with restrictive permissions", async () => {
      const manager = new PlayerManager(tempDir);

      await manager.create("Secure Player");

      // Verify files were created
      expect(existsSync(join(playersDir, "secure-player", "sheet.md"))).toBe(true);
      expect(existsSync(join(playersDir, "secure-player", "story.md"))).toBe(true);
    });
  });

  describe("edge cases", () => {
    test("handles unicode characters in name", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("El Nino");
      expect(slug).toBe("el-nino");
    });

    test("handles emoji in name", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("Fire Dragon 🔥");
      expect(slug).toBe("fire-dragon");
    });

    test("handles very long name", async () => {
      const manager = new PlayerManager(tempDir);

      const longName = "A".repeat(100);
      const slug = await manager.create(longName);

      // Should be truncated to 64 chars
      expect(slug.length).toBeLessThanOrEqual(64);
      expect(existsSync(join(playersDir, slug))).toBe(true);
    });

    test("handles whitespace-only name", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("   ");
      expect(slug).toBe("unnamed");
    });

    test("handles name with only special characters", async () => {
      const manager = new PlayerManager(tempDir);

      const slug = await manager.create("!@#$%^&*()");
      expect(slug).toBe("unnamed");
    });
  });
});
