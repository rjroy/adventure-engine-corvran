import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../src/services/adventure-service.js";
import { createAdventureRoutes } from "../src/routes/adventure-routes.js";
import { createHealthRoutes } from "../src/routes/health-routes.js";
import { createHelpRoutes } from "../src/registry.js";
import { createMockFileOps } from "./helpers/mock-file-ops.js";

const ADVENTURES_ROOT = "/test/adventures";

function buildTestApp(files: Record<string, string> = {}) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const adventureModule = createAdventureRoutes({ adventureService });
  const healthModule = createHealthRoutes();
  const helpModule = createHelpRoutes([adventureModule, healthModule]);

  const app = new Hono();
  app.route("/", adventureModule.routes);
  app.route("/", healthModule.routes);
  app.route("/", helpModule.routes);
  return app;
}

describe("GET /adventures", () => {
  test("returns empty list", async () => {
    const app = buildTestApp();
    const res = await app.request("/adventures");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ adventures: [] });
  });

  test("returns adventures with correct flags", async () => {
    const app = buildTestApp({
      [`${ADVENTURES_ROOT}/full/character.md`]: "char",
      [`${ADVENTURES_ROOT}/full/world.md`]: "world",
      [`${ADVENTURES_ROOT}/full/history.md`]: "hist",
      [`${ADVENTURES_ROOT}/partial/world.md`]: "world",
    });

    const res = await app.request("/adventures");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.adventures).toHaveLength(2);

    const full = body.adventures.find((a: { id: string }) => a.id === "full");
    expect(full.hasCharacter).toBe(true);
    expect(full.hasWorld).toBe(true);
    expect(full.hasHistory).toBe(true);

    const partial = body.adventures.find((a: { id: string }) => a.id === "partial");
    expect(partial.hasCharacter).toBe(false);
    expect(partial.hasWorld).toBe(true);
    expect(partial.hasHistory).toBe(false);
  });
});

describe("GET /adventures/:id", () => {
  test("returns adventure detail", async () => {
    const app = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
      [`${ADVENTURES_ROOT}/quest/world.md`]: "Forest",
    });

    const res = await app.request("/adventures/quest");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "quest",
      name: "quest",
      character: "Hero",
      world: "Forest",
      hasHistory: false,
    });
  });

  test("returns 404 for nonexistent adventure", async () => {
    const app = buildTestApp();
    const res = await app.request("/adventures/nope");
    expect(res.status).toBe(404);
  });

  test("returns 400 for path traversal with ../", async () => {
    const app = buildTestApp();
    const res = await app.request("/adventures/..%2Fetc%2Fpasswd");
    expect(res.status).toBe(400);
  });

  test("returns 400 for path traversal with nested ../", async () => {
    const app = buildTestApp();
    const res = await app.request("/adventures/foo%2F..%2F..%2Fbar");
    expect(res.status).toBe(400);
  });
});

describe("GET /adventures/:id/history", () => {
  test("returns history content when exists", async () => {
    const app = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/history.md`]: "**Player:** Hi\n\n**GM:** Hello",
    });

    const res = await app.request("/adventures/quest/history");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      exists: true,
      history: "**Player:** Hi\n\n**GM:** Hello",
    });
  });

  test("returns exists:false when no history", async () => {
    const app = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
    });

    const res = await app.request("/adventures/quest/history");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ exists: false, history: null });
  });

  test("returns 400 for path traversal", async () => {
    const app = buildTestApp();
    const res = await app.request("/adventures/..%2Fetc%2Fpasswd/history");
    expect(res.status).toBe(400);
  });
});

describe("POST /adventures/:id/message", () => {
  test("returns 501 (stub)", async () => {
    const app = buildTestApp({
      [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
    });

    const res = await app.request("/adventures/quest/message", { method: "POST" });
    expect(res.status).toBe(501);
  });
});

describe("GET /health", () => {
  test("returns correct payload", async () => {
    const app = buildTestApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", version: "0.1.0" });
  });
});

describe("GET /help", () => {
  test("returns all registered operations", async () => {
    const app = buildTestApp();
    const res = await app.request("/help");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.operations).toBeArray();
    const opIds = body.operations.map((op: { operationId: string }) => op.operationId);
    expect(opIds).toContain("adventures.list");
    expect(opIds).toContain("adventures.get");
    expect(opIds).toContain("adventures.history.get");
    expect(opIds).toContain("adventures.message.send");
    expect(opIds).toContain("system.health");
    expect(opIds).toContain("system.help");

    // Tree structure
    expect(body.tree.adventures).toBeDefined();
    expect(body.tree.system).toBeDefined();
  });
});
