// World Manager Tests
// Unit tests for WorldManager CRUD operations

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, readFile, stat, writeFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { WorldManager } from "../../src/world-manager";

// Test directory setup
const TEST_PROJECT_DIR = join(import.meta.dir, "temp-world-manager-test");
const TEST_WORLDS_DIR = join(TEST_PROJECT_DIR, "worlds");

describe("WorldManager", () => {
  let manager: WorldManager;

  beforeEach(async () => {
    // Clean state
    if (existsSync(TEST_PROJECT_DIR)) {
      await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_PROJECT_DIR, { recursive: true });
    manager = new WorldManager(TEST_PROJECT_DIR);
  });

  afterEach(async () => {
    // Cleanup
    if (existsSync(TEST_PROJECT_DIR)) {
      await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    test("sets worldsDir to projectDir/worlds", () => {
      expect(manager.getWorldsDir()).toBe(TEST_WORLDS_DIR);
    });

    test("handles trailing slash in projectDir", () => {
      const managerWithSlash = new WorldManager(TEST_PROJECT_DIR + "/");
      expect(managerWithSlash.getWorldsDir()).toBe(TEST_WORLDS_DIR);
    });
  });

  describe("create()", () => {
    test("creates world directory with slugified name", async () => {
      const slug = await manager.create("Eldoria");

      expect(slug).toBe("eldoria");
      const worldPath = join(TEST_WORLDS_DIR, "eldoria");
      const stats = await stat(worldPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test("creates world_state.md with correct template", async () => {
      const slug = await manager.create("Test World");

      const content = await readFile(
        join(TEST_WORLDS_DIR, slug, "world_state.md"),
        "utf-8"
      );
      expect(content).toBe("# World State\n\n*World facts will be established in adventure.*");
    });

    test("creates locations.md with correct template", async () => {
      const slug = await manager.create("Test World");

      const content = await readFile(
        join(TEST_WORLDS_DIR, slug, "locations.md"),
        "utf-8"
      );
      expect(content).toBe("# Locations\n\n*Discovered places will be recorded here.*");
    });

    test("creates characters.md with correct template", async () => {
      const slug = await manager.create("Test World");

      const content = await readFile(
        join(TEST_WORLDS_DIR, slug, "characters.md"),
        "utf-8"
      );
      expect(content).toBe("# Characters\n\n*NPCs and notable characters will be recorded here.*");
    });

    test("creates quests.md with correct template", async () => {
      const slug = await manager.create("Test World");

      const content = await readFile(
        join(TEST_WORLDS_DIR, slug, "quests.md"),
        "utf-8"
      );
      expect(content).toBe("# Quests\n\n*Active and completed quests will be tracked here.*");
    });

    test("creates all five template files", async () => {
      const slug = await manager.create("Complete World");

      const files = await readdir(join(TEST_WORLDS_DIR, slug));
      expect(files).toContain("world_state.md");
      expect(files).toContain("locations.md");
      expect(files).toContain("characters.md");
      expect(files).toContain("quests.md");
      expect(files).toContain("art-style.md");
      expect(files.length).toBe(5);
    });

    test("creates directory with 0o700 permissions", async () => {
      const slug = await manager.create("Secure World");

      const worldPath = join(TEST_WORLDS_DIR, slug);
      const stats = await stat(worldPath);
      const permissions = stats.mode & 0o777;

      expect(permissions).toBe(0o700);
    });

    test("creates files with 0o600 permissions", async () => {
      const slug = await manager.create("Secure Files World");

      const filePath = join(TEST_WORLDS_DIR, slug, "world_state.md");
      const stats = await stat(filePath);
      const permissions = stats.mode & 0o777;

      expect(permissions).toBe(0o600);
    });

    test("slugifies multi-word names", async () => {
      const slug = await manager.create("The Dark Forest");

      expect(slug).toBe("the-dark-forest");
    });

    test("handles special characters in name", async () => {
      const slug = await manager.create("Kael's World!");

      expect(slug).toBe("kael-s-world");
    });

    test("handles collision by appending suffix", async () => {
      // Create first world
      await manager.create("Eldoria");

      // Create second world with same name
      const slug2 = await manager.create("Eldoria");

      expect(slug2).toBe("eldoria-2");
      expect(await manager.exists("eldoria")).toBe(true);
      expect(await manager.exists("eldoria-2")).toBe(true);
    });

    test("handles multiple collisions", async () => {
      await manager.create("Realm");
      await manager.create("Realm");
      const slug3 = await manager.create("Realm");

      expect(slug3).toBe("realm-3");
    });

    test("creates worlds directory if it does not exist", async () => {
      // Remove worlds dir if it was created
      await rm(TEST_WORLDS_DIR, { recursive: true, force: true });

      await manager.create("New World");

      const stats = await stat(TEST_WORLDS_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    test("handles empty name by using 'unnamed'", async () => {
      const slug = await manager.create("");

      expect(slug).toBe("unnamed");
      expect(await manager.exists("unnamed")).toBe(true);
    });

    test("handles whitespace-only name", async () => {
      const slug = await manager.create("   ");

      expect(slug).toBe("unnamed");
    });
  });

  describe("exists()", () => {
    test("returns true for existing world", async () => {
      await manager.create("Existing World");

      const exists = await manager.exists("existing-world");

      expect(exists).toBe(true);
    });

    test("returns false for non-existent world", async () => {
      const exists = await manager.exists("nonexistent");

      expect(exists).toBe(false);
    });

    test("returns false for empty slug", async () => {
      const exists = await manager.exists("");

      expect(exists).toBe(false);
    });

    test("returns false for file (not directory)", async () => {
      // Create a file instead of directory
      await mkdir(TEST_WORLDS_DIR, { recursive: true });
      await writeFile(join(TEST_WORLDS_DIR, "not-a-dir"), "content");

      const exists = await manager.exists("not-a-dir");

      expect(exists).toBe(false);
    });

    test("returns false when worlds directory does not exist", async () => {
      // Don't create any worlds - worlds dir won't exist
      await rm(TEST_WORLDS_DIR, { recursive: true, force: true });

      const exists = await manager.exists("any-world");

      expect(exists).toBe(false);
    });
  });

  describe("list()", () => {
    test("returns empty array when no worlds exist", async () => {
      const worlds = await manager.list();

      expect(worlds).toEqual([]);
    });

    test("returns empty array when worlds directory does not exist", async () => {
      await rm(TEST_WORLDS_DIR, { recursive: true, force: true });

      const worlds = await manager.list();

      expect(worlds).toEqual([]);
    });

    test("lists single world with slug and name", async () => {
      await manager.create("Eldoria");

      const worlds = await manager.list();

      expect(worlds).toHaveLength(1);
      expect(worlds[0].slug).toBe("eldoria");
      expect(worlds[0].name).toBe("Eldoria");
    });

    test("lists multiple worlds sorted alphabetically", async () => {
      await manager.create("Zephyr");
      await manager.create("Aether");
      await manager.create("Middle Earth");

      const worlds = await manager.list();

      expect(worlds).toHaveLength(3);
      expect(worlds[0].name).toBe("Aether");
      expect(worlds[1].name).toBe("Middle Earth");
      expect(worlds[2].name).toBe("Zephyr");
    });

    test("capitalizes multi-word slugs correctly", async () => {
      await manager.create("the dark realm");

      const worlds = await manager.list();

      expect(worlds[0].slug).toBe("the-dark-realm");
      expect(worlds[0].name).toBe("The Dark Realm");
    });

    test("skips files (only lists directories)", async () => {
      await manager.create("Real World");
      // Add a file to worlds directory
      await writeFile(join(TEST_WORLDS_DIR, "not-a-world.txt"), "content");

      const worlds = await manager.list();

      expect(worlds).toHaveLength(1);
      expect(worlds[0].slug).toBe("real-world");
    });

    test("skips directories with invalid slug names", async () => {
      await manager.create("Valid World");
      // Create directory with invalid slug (contains ..)
      await mkdir(join(TEST_WORLDS_DIR, "..invalid"), { recursive: true });

      const worlds = await manager.list();

      expect(worlds).toHaveLength(1);
      expect(worlds[0].slug).toBe("valid-world");
    });
  });

  describe("getPath()", () => {
    test("returns absolute path for valid slug", async () => {
      await manager.create("Test World");

      const path = manager.getPath("test-world");

      expect(path).toBe(resolve(TEST_WORLDS_DIR, "test-world"));
    });

    test("returns path even if world does not exist", () => {
      // getPath validates slug format, not existence
      const path = manager.getPath("nonexistent");

      expect(path).toBe(resolve(TEST_WORLDS_DIR, "nonexistent"));
    });

    test("returns null for empty slug", () => {
      const path = manager.getPath("");

      expect(path).toBeNull();
    });

    test("returns null for whitespace-only slug", () => {
      const path = manager.getPath("   ");

      expect(path).toBeNull();
    });
  });

  describe("path traversal rejection", () => {
    test("getPath returns null for path with forward slash", () => {
      const path = manager.getPath("../etc/passwd");

      expect(path).toBeNull();
    });

    test("getPath returns null for path with backslash", () => {
      const path = manager.getPath("..\\windows\\system32");

      expect(path).toBeNull();
    });

    test("getPath returns null for double dot", () => {
      const path = manager.getPath("..");

      expect(path).toBeNull();
    });

    test("getPath returns null for single dot", () => {
      const path = manager.getPath(".");

      expect(path).toBeNull();
    });

    test("getPath returns null for URL-encoded path traversal", () => {
      const path = manager.getPath("..%2Fetc%2Fpasswd");

      expect(path).toBeNull();
    });

    test("getPath returns null for double dot within slug", () => {
      const path = manager.getPath("foo..bar");

      expect(path).toBeNull();
    });

    test("getPath returns null for null byte", () => {
      const path = manager.getPath("world\0hack");

      expect(path).toBeNull();
    });

    test("exists returns false for path traversal attempt", async () => {
      const exists = await manager.exists("../etc");

      expect(exists).toBe(false);
    });

    test("exists returns false for URL-encoded traversal", async () => {
      const exists = await manager.exists("%2e%2e");

      expect(exists).toBe(false);
    });
  });

  describe("getRef()", () => {
    test("returns relative reference for valid slug", async () => {
      await manager.create("Test World");

      const ref = manager.getRef("test-world");

      expect(ref).toBe("worlds/test-world");
    });

    test("returns null for empty slug", () => {
      expect(manager.getRef("")).toBeNull();
    });

    test("returns null for path traversal attempt", () => {
      expect(manager.getRef("../etc/passwd")).toBeNull();
      expect(manager.getRef("..")).toBeNull();
      expect(manager.getRef(".")).toBeNull();
    });

    test("returns null for slug with double-dot", () => {
      expect(manager.getRef("foo..bar")).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("handles very long world names (truncation)", async () => {
      const longName = "A".repeat(100);
      const slug = await manager.create(longName);

      // Slug should be truncated to 64 chars
      expect(slug.length).toBeLessThanOrEqual(64);
      expect(await manager.exists(slug)).toBe(true);
    });

    test("handles unicode world names", async () => {
      const slug = await manager.create("El Dorado");

      expect(slug).toBe("el-dorado");
      expect(await manager.exists("el-dorado")).toBe(true);
    });

    test("handles emoji in world name", async () => {
      const slug = await manager.create("Fire World");

      expect(slug).toBe("fire-world");
      expect(await manager.exists("fire-world")).toBe(true);
    });

    test("handles slug with numbers", async () => {
      const slug = await manager.create("World 2024");

      expect(slug).toBe("world-2024");
      expect(await manager.exists("world-2024")).toBe(true);
    });

    test("returns existing slug when checking with getPath", () => {
      const path = manager.getPath("world-with-suffix-2");

      expect(path).toBe(resolve(TEST_WORLDS_DIR, "world-with-suffix-2"));
    });
  });

  describe("concurrent operations", () => {
    test("handles concurrent world creation", async () => {
      // Create multiple worlds concurrently
      const createPromises = [
        manager.create("World A"),
        manager.create("World B"),
        manager.create("World C"),
      ];

      const slugs = await Promise.all(createPromises);

      expect(slugs).toContain("world-a");
      expect(slugs).toContain("world-b");
      expect(slugs).toContain("world-c");

      const worlds = await manager.list();
      expect(worlds).toHaveLength(3);
    });
  });

  describe("createAtSlug()", () => {
    test("creates directory at exact slug without collision detection", async () => {
      // First create a world with generateSlug
      await manager.create("Eldoria");
      expect(await manager.exists("eldoria")).toBe(true);

      // Now use createAtSlug to create at exact slug (would normally collide)
      // This should NOT append -2, it should create at the exact path
      await manager.createAtSlug("eldoria-exact");

      expect(await manager.exists("eldoria-exact")).toBe(true);
      expect(await manager.exists("eldoria")).toBe(true);
    });

    test("creates all five template files", async () => {
      await manager.createAtSlug("test-world");

      const worldPath = join(TEST_WORLDS_DIR, "test-world");
      const files = await readdir(worldPath);

      expect(files).toContain("world_state.md");
      expect(files).toContain("locations.md");
      expect(files).toContain("characters.md");
      expect(files).toContain("quests.md");
      expect(files).toContain("art-style.md");
      expect(files.length).toBe(5);
    });

    test("creates template files with correct content", async () => {
      await manager.createAtSlug("content-test");

      const worldPath = join(TEST_WORLDS_DIR, "content-test");

      const worldState = await readFile(join(worldPath, "world_state.md"), "utf-8");
      expect(worldState).toBe("# World State\n\n*World facts will be established in adventure.*");

      const locations = await readFile(join(worldPath, "locations.md"), "utf-8");
      expect(locations).toBe("# Locations\n\n*Discovered places will be recorded here.*");

      const characters = await readFile(join(worldPath, "characters.md"), "utf-8");
      expect(characters).toBe("# Characters\n\n*NPCs and notable characters will be recorded here.*");

      const quests = await readFile(join(worldPath, "quests.md"), "utf-8");
      expect(quests).toBe("# Quests\n\n*Active and completed quests will be tracked here.*");

      const artStyle = await readFile(join(worldPath, "art-style.md"), "utf-8");
      expect(artStyle).toBe("# Art Style\n\n*Optional: Define a visual style for background images in this world.*\n*Example: \"oil painting, impressionist style\" or \"pixel art, 16-bit\"*");
    });

    test("throws error for invalid slug", async () => {
      /* eslint-disable @typescript-eslint/await-thenable -- createAtSlug returns Promise but ESLint doesn't see it */
      await expect(manager.createAtSlug("")).rejects.toThrow("Invalid slug");
      await expect(manager.createAtSlug("   ")).rejects.toThrow("Invalid slug");
      await expect(manager.createAtSlug("../etc")).rejects.toThrow("Invalid slug");
      /* eslint-enable @typescript-eslint/await-thenable */
    });

    test("throws error for path traversal attempt", async () => {
      /* eslint-disable @typescript-eslint/await-thenable -- createAtSlug returns Promise but ESLint doesn't see it */
      await expect(manager.createAtSlug("..")).rejects.toThrow("Invalid slug");
      await expect(manager.createAtSlug("foo..bar")).rejects.toThrow("Invalid slug");
      /* eslint-enable @typescript-eslint/await-thenable */
    });

    test("can recreate directory if it already exists", async () => {
      // Create world first
      await manager.createAtSlug("existing-world");
      expect(await manager.exists("existing-world")).toBe(true);

      // Create again at same slug - should succeed (mkdir recursive: true)
      await manager.createAtSlug("existing-world");
      expect(await manager.exists("existing-world")).toBe(true);
    });

    test("does not modify slug (no collision suffix)", async () => {
      // Create "eldoria" with create() which uses collision detection
      await manager.create("Eldoria");
      expect(await manager.exists("eldoria")).toBe(true);

      // Now manually create "eldoria" with createAtSlug
      // This will succeed because mkdir { recursive: true } allows existing dirs
      await manager.createAtSlug("eldoria");
      expect(await manager.exists("eldoria")).toBe(true);

      // Verify no "eldoria-2" was created
      expect(await manager.exists("eldoria-2")).toBe(false);
    });

    test("creates directory with correct permissions", async () => {
      await manager.createAtSlug("secure-world");

      const worldPath = join(TEST_WORLDS_DIR, "secure-world");
      const stats = await stat(worldPath);
      const permissions = stats.mode & 0o777;

      expect(permissions).toBe(0o700);
    });

    test("creates files with correct permissions", async () => {
      await manager.createAtSlug("secure-files");

      const filePath = join(TEST_WORLDS_DIR, "secure-files", "world_state.md");
      const stats = await stat(filePath);
      const permissions = stats.mode & 0o777;

      expect(permissions).toBe(0o600);
    });
  });
});
