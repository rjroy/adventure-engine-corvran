import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../src/services/adventure-service";
import { createAdventureRoutes, buildFileTree, isBinaryPath } from "../src/routes/adventure-routes";
import { createMockFileOps } from "./helpers/mock-file-ops";

const ADVENTURES_ROOT = "/test/adventures";

function buildTestApp(files: Record<string, string> = {}) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const { routes } = createAdventureRoutes({ adventureService, fileOps });
  const app = new Hono();
  app.route("/", routes);
  return { app, fileOps };
}

// ── readDirEntries mock tests ────────────────────────────────────────────────

describe("readDirEntries", () => {
  test("returns files and directories with correct types", async () => {
    const fileOps = createMockFileOps({
      "/adv/character.md": "...",
      "/adv/world.md": "...",
      "/adv/characters/dwig.md": "...",
    });
    const entries = await fileOps.readDirEntries("/adv");
    const byName = Object.fromEntries(entries.map((e) => [e.name, e.type]));
    expect(byName["character.md"]).toBe("file");
    expect(byName["world.md"]).toBe("file");
    expect(byName["characters"]).toBe("directory");
  });

  test("returns empty array for empty directory", async () => {
    const fileOps = createMockFileOps({});
    const entries = await fileOps.readDirEntries("/empty");
    expect(entries).toEqual([]);
  });

  test("directory type wins when name appears as both file and sub-path", async () => {
    // "foo" is both a file key and a prefix for "foo/bar.md"
    const fileOps = createMockFileOps({
      "/dir/foo": "content",
      "/dir/foo/bar.md": "nested",
    });
    const entries = await fileOps.readDirEntries("/dir");
    const foo = entries.find((e) => e.name === "foo");
    expect(foo?.type).toBe("directory");
  });
});

// ── isBinaryPath ────────────────────────────────────────────────────────────

describe("isBinaryPath", () => {
  test("returns false for text extensions", () => {
    expect(isBinaryPath("readme.md")).toBe(false);
    expect(isBinaryPath("config.json")).toBe(false);
    expect(isBinaryPath("data.yaml")).toBe(false);
    expect(isBinaryPath("data.yml")).toBe(false);
    expect(isBinaryPath("notes.txt")).toBe(false);
    expect(isBinaryPath("config.toml")).toBe(false);
    expect(isBinaryPath("table.csv")).toBe(false);
  });

  test("returns true for binary extensions", () => {
    expect(isBinaryPath("image.png")).toBe(true);
    expect(isBinaryPath("photo.jpg")).toBe(true);
    expect(isBinaryPath("archive.zip")).toBe(true);
    expect(isBinaryPath("noextension")).toBe(true);
  });

  test("extension check is case-insensitive", () => {
    expect(isBinaryPath("file.MD")).toBe(false);
    expect(isBinaryPath("file.JSON")).toBe(false);
    expect(isBinaryPath("IMAGE.PNG")).toBe(true);
  });
});

// ── buildFileTree ────────────────────────────────────────────────────────────

describe("buildFileTree", () => {
  test("sorts directories before files, each group alphabetical", async () => {
    const fileOps = createMockFileOps({
      "/adv/zebra.md": "...",
      "/adv/alpha.md": "...",
      "/adv/z-dir/file.md": "...",
      "/adv/a-dir/file.md": "...",
    });
    const tree = await buildFileTree(fileOps, "/adv", "");
    expect(tree[0].name).toBe("a-dir");
    expect(tree[0].type).toBe("directory");
    expect(tree[1].name).toBe("z-dir");
    expect(tree[1].type).toBe("directory");
    expect(tree[2].name).toBe("alpha.md");
    expect(tree[2].type).toBe("file");
    expect(tree[3].name).toBe("zebra.md");
    expect(tree[3].type).toBe("file");
  });

  test("builds recursive tree with correct paths", async () => {
    const fileOps = createMockFileOps({
      "/adv/adventure.md": "...",
      "/adv/characters/dwig.md": "dwig content",
    });
    const tree = await buildFileTree(fileOps, "/adv", "");
    const charsDir = tree.find((n) => n.name === "characters");
    expect(charsDir).toBeDefined();
    expect(charsDir?.type).toBe("directory");
    expect(charsDir?.path).toBe("characters");
    expect(charsDir?.children).toHaveLength(1);
    expect(charsDir?.children?.[0].name).toBe("dwig.md");
    expect(charsDir?.children?.[0].path).toBe("characters/dwig.md");
    expect(charsDir?.children?.[0].type).toBe("file");
  });
});

// ── GET /adventures/:id/files ────────────────────────────────────────────────

describe("GET /adventures/:id/files", () => {
  test("returns file tree for adventure", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
      [`${ADVENTURES_ROOT}/quest/character.md`]: "char",
      [`${ADVENTURES_ROOT}/quest/notes/note1.md`]: "note",
    });
    const res = await app.request("/adventures/quest/files");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("tree");
    expect(Array.isArray(body.tree)).toBe(true);
    // notes directory should come before character.md/adventure.md
    expect(body.tree[0].name).toBe("notes");
    expect(body.tree[0].type).toBe("directory");
  });

  test("returns 404 for missing adventure", async () => {
    const { app } = buildTestApp({});
    const res = await app.request("/adventures/missing/files");
    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid adventure ID", async () => {
    const { app } = buildTestApp({});
    const res = await app.request("/adventures/..%2Fevil/files");
    expect(res.status).toBe(400);
  });
});

// ── GET /adventures/:id/file ─────────────────────────────────────────────────

describe("GET /adventures/:id/file", () => {
  test("returns text file content", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
      [`${ADVENTURES_ROOT}/quest/character.md`]: "# Dwig\nA dwarf.",
    });
    const res = await app.request("/adventures/quest/file?path=character.md");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.binary).toBe(false);
    expect(body.content).toBe("# Dwig\nA dwarf.");
    expect(body.path).toBe("character.md");
  });

  test("returns binary classification for .png (no existence check)", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
      // No mood.png in the store — binary check should not hit filesystem
    });
    const res = await app.request("/adventures/quest/file?path=mood.png");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.binary).toBe(true);
    expect(body.content).toBeNull();
  });

  test("returns 404 for missing text file", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
    });
    const res = await app.request("/adventures/quest/file?path=nonexistent.md");
    expect(res.status).toBe(404);
  });

  test("returns 400 for missing path query parameter", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
    });
    const res = await app.request("/adventures/quest/file");
    expect(res.status).toBe(400);
  });

  test("returns 400 for path traversal with URL-encoded ..", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
    });
    const res = await app.request("/adventures/quest/file?path=..%2F..%2Fetc%2Fpasswd");
    expect(res.status).toBe(400);
  });

  test("returns 400 for absolute path traversal", async () => {
    const { app } = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/adventure.md`]: "---\nname: Quest\n---",
    });
    const res = await app.request("/adventures/quest/file?path=%2Fetc%2Fpasswd");
    expect(res.status).toBe(400);
  });

  test("returns 404 for missing adventure", async () => {
    const { app } = buildTestApp({});
    const res = await app.request("/adventures/missing/file?path=character.md");
    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid adventure ID", async () => {
    const { app } = buildTestApp({});
    const res = await app.request("/adventures/..%2Fevil/file?path=character.md");
    expect(res.status).toBe(400);
  });
});
