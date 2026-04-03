import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../../src/services/adventure-service";
import { createAdventureRoutes, type CompactionConfig } from "../../src/routes/adventure-routes";
import { createHistoryService } from "../../src/services/history-service";
import { createSessionRunner } from "../../src/services/session-runner";
import { createCompactionService, CompactionInProgressError, type CompactionService } from "../../src/services/compaction-service";
import { createMockFileOps } from "../helpers/mock-file-ops";
import {
  createMockQueryFn,
  textDelta,
  successResult,
  errorResult,
} from "../helpers/mock-query";
import type { QueryFn } from "../../src/services/session-runner";

const ADVENTURES_ROOT = "/test/adventures";

/** Generate a string of the given length */
function makeString(length: number, char = "x"): string {
  return char.repeat(length);
}

/** Parse SSE text into an array of { event, data } objects */
function parseSSE(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (event) events.push({ event, data });
  }
  return events;
}

/**
 * Build a test app with compaction wired in.
 *
 * The compactionQueryFn handles Haiku summarization calls (compaction).
 * The sessionQueryFn handles the main GM session calls (message streaming).
 * Both use separate QueryFn instances so we can control their behavior independently.
 */
function buildTestApp(
  files: Record<string, string>,
  sessionQueryFn: QueryFn,
  options?: {
    compactionQueryFn?: QueryFn;
    compactionConfig?: CompactionConfig;
    compactionService?: CompactionService;
  },
) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const historyService = createHistoryService({ fileOps });
  const sessionRunner = createSessionRunner({
    queryFn: sessionQueryFn,
    config: { model: "test-model" },
  });

  // Build compaction service from provided queryFn, or use a pre-built service
  const compactionService = options?.compactionService ??
    (options?.compactionQueryFn
      ? createCompactionService({ fileOps, queryFn: options.compactionQueryFn })
      : undefined);

  const compactionConfig = options?.compactionConfig ?? {
    historyThreshold: 1000,
    worldThreshold: 2000,
  };

  const module = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
    compactionService,
    compactionConfig: compactionService ? compactionConfig : undefined,
    fileOps,
  });

  const app = new Hono();
  app.route("/", module.routes);
  return { app, fileOps, compactionService };
}

function sendMessage(app: Hono, adventureId: string, message: string) {
  return app.request(`/adventures/${adventureId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

describe("threshold-triggered compaction", () => {
  test("compacts history when threshold exceeded", async () => {
    const longHistory = makeString(1500);
    const summaryText = "Compact recap of events.";

    const compactionQueryFn = createMockQueryFn([successResult(summaryText)]);
    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
    ]);

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    // Archive should exist
    const archive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archive).toBe(longHistory);

    // history.md should contain the recap + player message + GM response
    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(summaryText);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Response");
  });

  test("skips compaction when history is below threshold", async () => {
    const shortHistory = makeString(500);

    const compactionQueryFn = createMockQueryFn([successResult("should not run")]);
    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
    ]);

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: shortHistory,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    // No archive should exist
    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

    // history.md should have original content + player message + GM response
    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(shortHistory);
    expect(history).toContain("**Player:** Hello");
  });

  test("compacts history then world when both thresholds exceeded (REQ-COMP-10)", async () => {
    const longHistory = makeString(1500);
    const longWorld = makeString(2500);
    const historySummary = "History recap.";
    const worldSummary = "World recap.";

    let callCount = 0;
    // Compaction queryFn returns different summaries for history vs world calls
    const compactionQueryFn: QueryFn = (params) => {
      callCount++;
      if (callCount === 1) {
        return createMockQueryFn([successResult(historySummary)])(params);
      }
      return createMockQueryFn([successResult(worldSummary)])(params);
    };

    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
    ]);

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
        [`${ADVENTURES_ROOT}/quest/world.md`]: longWorld,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    // Both archives should exist
    const historyArchive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(historyArchive).toBe(longHistory);
    const worldArchive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/world-001.md`);
    expect(worldArchive).toBe(longWorld);

    // Working files should contain summaries
    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(historySummary);
    const world = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/world.md`);
    expect(world).toBe(worldSummary);

    // Both compaction calls should have fired
    expect(callCount).toBe(2);
  });

  test("falls back to original history when Haiku fails (REQ-COMP-41)", async () => {
    const longHistory = makeString(1500);

    // Compaction queryFn that fails
    const compactionQueryFn: QueryFn = () => {
      async function* generator() {
        throw new Error("Haiku unavailable");
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
      }) as ReturnType<QueryFn>;
    };

    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
    ]);

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    // Archive should have been reversed (cleaned up)
    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

    // history.md should contain original history + player message + GM response
    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(longHistory);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Response");
  });

  test("context overflow after compaction returns error (REQ-COMP-35)", async () => {
    const longHistory = makeString(1500);
    const summaryText = "Compact recap.";

    const compactionQueryFn = createMockQueryFn([successResult(summaryText)]);
    // Session query returns a context overflow error
    const sessionQueryFn = createMockQueryFn([
      errorResult(["prompt is too long: context window exceeded"]),
    ]);

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    expect(res.status).toBe(200);

    // Should have an error event with the overflow message
    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents.length).toBe(1);
    const errorData = JSON.parse(errorEvents[0].data);
    expect(errorData.error).toContain("Edit history.md to shorten it");
  });

  test("skips compaction when already in progress (REQ-COMP-29)", async () => {
    const longHistory = makeString(1500);

    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
    ]);

    // Stub compaction service that always reports in-progress
    const stubCompactionService: CompactionService = {
      async compactHistory() {
        throw new CompactionInProgressError("/test/adventures/quest");
      },
      async compactWorld() {
        throw new CompactionInProgressError("/test/adventures/quest");
      },
      isCompacting() { return true; },
    };

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      sessionQueryFn,
      {
        compactionService: stubCompactionService,
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    // No archive should exist (compaction was skipped)
    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

    // history.md should still contain original content + player message + GM response
    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(longHistory);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Response");
  });
});
