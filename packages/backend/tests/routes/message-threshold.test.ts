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
  assistantWithToolUse,
  userWithToolResult,
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

describe("compacted SSE event emission", () => {
  test("emits compacted SSE event on threshold-triggered compaction (REQ-COMP-42, REQ-COMP-43)", async () => {
    const longHistory = makeString(1500);
    const summaryText = "Compact recap of events.";

    const compactionQueryFn = createMockQueryFn([successResult(summaryText)]);
    const sessionQueryFn = createMockQueryFn([
      textDelta("Response"),
      successResult("Response"),
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

    // Compacted event should be emitted
    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(1);

    const payload = JSON.parse(compactedEvents[0].data);
    expect(payload.archived).toBe("past/scene-001.md");
    expect(payload.previousSize).toBe(longHistory.length);
    expect(typeof payload.newSize).toBe("number");

    // Compacted event should come before text events
    const compactedIdx = events.findIndex((e) => e.event === "compacted");
    const firstTextIdx = events.findIndex((e) => e.event === "text");
    expect(compactedIdx).toBeLessThan(firstTextIdx);
  });

  test("no compacted SSE event on failed compaction (REQ-COMP-46)", async () => {
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

    // No compacted event should be emitted
    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(0);

    // Stream should still proceed with text and done events
    const textEvents = events.filter((e) => e.event === "text");
    const doneEvents = events.filter((e) => e.event === "done");
    expect(textEvents.length).toBeGreaterThan(0);
    expect(doneEvents.length).toBe(1);
  });

  test("compacted event for history but not world when both thresholds exceeded (REQ-COMP-47)", async () => {
    const longHistory = makeString(1500);
    const longWorld = makeString(2500);
    const historySummary = "History recap.";
    const worldSummary = "World recap.";

    let callCount = 0;
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

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
        [`${ADVENTURES_ROOT}/quest/world.md`]: longWorld,
      },
      sessionQueryFn,
      { compactionQueryFn, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    // Exactly one compacted event (history only, not world)
    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(1);

    const payload = JSON.parse(compactedEvents[0].data);
    expect(payload.archived).toBe("past/scene-001.md");

    // Both compactions should have fired
    expect(callCount).toBe(2);
  });

  test("compacted SSE event from GM tool during streaming (REQ-COMP-44 integration)", async () => {
    const toolId = "tool_compact_001";

    // Session queryFn that simulates the GM calling compact_history
    const sessionQueryFn = createMockQueryFn([
      textDelta("Let me organize our adventure..."),
      assistantWithToolUse([{ id: toolId, name: "mcp__corvran__compact_history", input: {} }]),
      userWithToolResult([{ tool_use_id: toolId, content: "History compacted. Scene archived to past/scene-001.md." }]),
      textDelta("The story continues..."),
      successResult("Let me organize our adventure... The story continues..."),
    ]);

    // The compaction service mock that returns a known result
    const stubCompactionService: CompactionService = {
      async compactHistory() {
        return { archived: "past/scene-001.md", previousSize: 5000, newSize: 500 };
      },
      async compactWorld() {
        return { archived: "past/world-001.md", previousSize: 3000, newSize: 300 };
      },
      isCompacting() { return false; },
    };

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: "Some history",
      },
      sessionQueryFn,
      {
        compactionService: stubCompactionService,
        compactionConfig: { historyThreshold: 100000, worldThreshold: 200000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    // compact_history should be suppressed from tool_use events
    const toolUseEvents = events.filter((e) => e.event === "tool_use");
    for (const e of toolUseEvents) {
      const data = JSON.parse(e.data);
      expect(data.name).not.toBe("compact_history");
      expect(data.name).not.toBe("mcp__corvran__compact_history");
    }

    // Done event should exist
    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
  });
});
