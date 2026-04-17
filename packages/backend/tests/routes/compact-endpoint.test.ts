import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../../src/services/adventure-service";
import { createAdventureRoutes } from "../../src/routes/adventure-routes";
import { createCompactionService } from "../../src/services/compaction-service";
import { createMockFileOps } from "../helpers/mock-file-ops";
import { createMockQueryFn, successResult } from "../helpers/mock-query";
import type { QueryFn } from "../../src/services/session-runner";

const ADVENTURES_ROOT = "/test/adventures";
const ADV_ID = "test-adventure";
const ADV_PATH = `${ADVENTURES_ROOT}/${ADV_ID}`;
const LONG_HISTORY =
  "**Player:** I explore the dungeon.\n\n**GM:** You step into a vast chamber...\n".repeat(30);
const SUMMARY_TEXT = "The adventurer explored a vast dungeon chamber.";

function buildTestApp(
  files: Record<string, string>,
  queryFn?: QueryFn,
) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });

  const effectiveQueryFn = queryFn ?? createMockQueryFn([successResult(SUMMARY_TEXT)]);
  const compactionService = createCompactionService({ fileOps, queryFn: effectiveQueryFn });

  const adventureModule = createAdventureRoutes({
    adventureService,
    compactionService,
    fileOps,
  });

  const app = new Hono();
  app.route("/", adventureModule.routes);
  return { app, fileOps };
}

describe("POST /adventures/:id/compact", () => {
  test("returns archived path, previousSize, and newSize on success", async () => {
    const { app, fileOps } = buildTestApp({
      [`${ADV_PATH}/history.md`]: LONG_HISTORY,
    });

    const res = await app.request(`/adventures/${ADV_ID}/compact`, { method: "POST" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.archived).toBe("past/scene-001.md");
    expect(body.previousSize).toBe(LONG_HISTORY.length);
    expect(body.newSize).toBe(SUMMARY_TEXT.length);

    // Verify archived file exists with original content
    const store = fileOps.getStore();
    expect(store.get(`${ADV_PATH}/past/scene-001.md`)).toBe(LONG_HISTORY);
    // Verify new history is the summary
    expect(store.get(`${ADV_PATH}/history.md`)).toBe(SUMMARY_TEXT);
  });

  test("returns 404 for non-existent adventure", async () => {
    const { app } = buildTestApp({});

    const res = await app.request("/adventures/nonexistent/compact", { method: "POST" });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("Adventure not found");
  });

  test("returns 400 when history is too short", async () => {
    const { app } = buildTestApp({
      [`${ADV_PATH}/history.md`]: "Short history.",
    });

    const res = await app.request(`/adventures/${ADV_ID}/compact`, { method: "POST" });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("History is empty or too short to compact.");
  });

  test("returns 409 when compaction is already in progress", async () => {
    // Use a delaying queryFn so the first compaction holds the lock
    const delayingQueryFn: QueryFn = () => {
      async function* generator() {
        await new Promise((resolve) => setTimeout(resolve, 500));
        yield successResult(SUMMARY_TEXT);
      }
      const gen = generator();
      return Object.assign(gen, {
        interrupt: async () => {},
        setPermissionMode: async () => {},
        setModel: async () => {},
        setMaxThinkingTokens: async () => {},
        supportedCommands: async () => [],
        supportedModels: async () => [],
        mcpServerStatus: async () => [],
        accountInfo: async () => ({ email: "test@test.com" }),
        rewindFiles: async () => ({ canRewind: false }),
        setMcpServers: async () => ({ added: [], removed: [], errors: {} }),
        streamInput: async () => {},
      }) as unknown as ReturnType<QueryFn>;
    };

    const { app } = buildTestApp(
      { [`${ADV_PATH}/history.md`]: LONG_HISTORY },
      delayingQueryFn,
    );

    // Start first compaction (don't await)
    const first = app.request(`/adventures/${ADV_ID}/compact`, { method: "POST" });

    // Give the first request time to acquire the lock
    await new Promise((r) => setTimeout(r, 50));

    // Second attempt should get 409
    const second = await app.request(`/adventures/${ADV_ID}/compact`, { method: "POST" });
    expect(second.status).toBe(409);

    const body = await second.json();
    expect(body.error).toBe("Compaction is already running for this adventure.");

    // Let the first one finish cleanly
    const firstRes = await first;
    expect(firstRes.status).toBe(200);
  });

  test("returns 500 when Haiku call fails", async () => {
    const failingQueryFn: QueryFn = () => {
      async function* generator() {
        throw new Error("Haiku API timeout");
      }
      const gen = generator();
      return Object.assign(gen, {
        interrupt: async () => {},
        setPermissionMode: async () => {},
        setModel: async () => {},
        setMaxThinkingTokens: async () => {},
        supportedCommands: async () => [],
        supportedModels: async () => [],
        mcpServerStatus: async () => [],
        accountInfo: async () => ({ email: "test@test.com" }),
        rewindFiles: async () => ({ canRewind: false }),
        setMcpServers: async () => ({ added: [], removed: [], errors: {} }),
        streamInput: async () => {},
      }) as unknown as ReturnType<QueryFn>;
    };

    const { app, fileOps } = buildTestApp(
      { [`${ADV_PATH}/history.md`]: LONG_HISTORY },
      failingQueryFn,
    );

    const res = await app.request(`/adventures/${ADV_ID}/compact`, { method: "POST" });
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toContain("Compaction failed:");

    // Verify history was restored (archive reversal)
    const store = fileOps.getStore();
    expect(store.get(`${ADV_PATH}/history.md`)).toBe(LONG_HISTORY);
  });
});
