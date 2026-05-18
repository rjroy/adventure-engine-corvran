import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { createAdventureService } from "../../src/services/adventure-service";
import { createAdventureRoutes, type CompactionConfig } from "../../src/routes/adventure-routes";
import { createHistoryService } from "../../src/services/history-service";
import {
  createCompactionService,
  CompactionInProgressError,
  type CompactionService,
  type SummarizeFn,
} from "../../src/services/compaction-service";
import { createMockFileOps } from "../helpers/mock-file-ops";
import {
  createMockSessionRunner,
  type ScriptedEvent,
} from "../helpers/mock-session-runner";

const ADVENTURES_ROOT = "/test/adventures";

function makeString(length: number, char = "x"): string {
  return char.repeat(length);
}

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
 * `summarize` runs the (mocked) Haiku summarization for compaction.
 * `script` is the SessionRunner script that the mock runner replays for the GM turn.
 */
function buildTestApp(
  files: Record<string, string>,
  script: ScriptedEvent[],
  options?: {
    summarize?: SummarizeFn;
    compactionConfig?: CompactionConfig;
    compactionService?: CompactionService;
  },
) {
  const fileOps = createMockFileOps(files);
  const adventureService = createAdventureService({ fileOps, adventuresPath: ADVENTURES_ROOT });
  const historyService = createHistoryService({ fileOps });

  const compactionService = options?.compactionService ??
    (options?.summarize
      ? createCompactionService({ fileOps, summarize: options.summarize })
      : undefined);

  const sessionRunner = createMockSessionRunner(script);

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

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      {
        summarize: async () => summaryText,
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    const archive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archive).toBe(longHistory);

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(summaryText);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Response");
  });

  test("skips compaction when history is below threshold", async () => {
    const shortHistory = makeString(500);

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: shortHistory,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      {
        summarize: async () => "should not run",
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

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
    const summarize: SummarizeFn = async () => {
      callCount++;
      return callCount === 1 ? historySummary : worldSummary;
    };

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
        [`${ADVENTURES_ROOT}/quest/world.md`]: longWorld,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      { summarize, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    const historyArchive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(historyArchive).toBe(longHistory);
    const worldArchive = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/past/world-001.md`);
    expect(worldArchive).toBe(longWorld);

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(historySummary);
    const world = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/world.md`);
    expect(world).toBe(worldSummary);

    expect(callCount).toBe(2);
  });

  test("falls back to original history when summarizer fails (REQ-COMP-41)", async () => {
    const longHistory = makeString(1500);

    const failingSummarize: SummarizeFn = async () => {
      throw new Error("Haiku unavailable");
    };

    const { app, fileOps } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      { summarize: failingSummarize, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

    const history = fileOps.getStore().get(`${ADVENTURES_ROOT}/quest/history.md`);
    expect(history).toContain(longHistory);
    expect(history).toContain("**Player:** Hello");
    expect(history).toContain("**GM:** Response");
  });

  test("context overflow after compaction returns error (REQ-COMP-35)", async () => {
    const longHistory = makeString(1500);
    const summaryText = "Compact recap.";

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      [
        // Pre-translated overflow message — the session-runner is responsible
        // for converting raw provider phrasing into this friendly form.
        { type: "error", error: "Adventure history is too long. Edit history.md to shorten it." },
      ],
      {
        summarize: async () => summaryText,
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    expect(res.status).toBe(200);

    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents.length).toBe(1);
    const errorData = JSON.parse(errorEvents[0].data);
    expect(errorData.error).toContain("Edit history.md to shorten it");
  });

  test("skips compaction when already in progress (REQ-COMP-29)", async () => {
    const longHistory = makeString(1500);

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
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      {
        compactionService: stubCompactionService,
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    await res.text();

    expect(res.status).toBe(200);

    const archiveExists = fileOps.getStore().has(`${ADVENTURES_ROOT}/quest/past/scene-001.md`);
    expect(archiveExists).toBe(false);

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

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      {
        summarize: async () => summaryText,
        compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(1);

    const payload = JSON.parse(compactedEvents[0].data);
    expect(payload.archived).toBe("past/scene-001.md");
    expect(payload.previousSize).toBe(longHistory.length);
    expect(typeof payload.newSize).toBe("number");

    const compactedIdx = events.findIndex((e) => e.event === "compacted");
    const firstTextIdx = events.findIndex((e) => e.event === "text");
    expect(compactedIdx).toBeLessThan(firstTextIdx);
  });

  test("no compacted SSE event on failed compaction (REQ-COMP-46)", async () => {
    const longHistory = makeString(1500);

    const failingSummarize: SummarizeFn = async () => {
      throw new Error("Haiku unavailable");
    };

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      { summarize: failingSummarize, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(0);

    const textEvents = events.filter((e) => e.event === "text");
    const doneEvents = events.filter((e) => e.event === "done");
    expect(textEvents.length).toBeGreaterThan(0);
    expect(doneEvents.length).toBe(1);
  });

  test("compacted event for history but not world when both thresholds exceeded (REQ-COMP-47)", async () => {
    const longHistory = makeString(1500);
    const longWorld = makeString(2500);

    let callCount = 0;
    const summarize: SummarizeFn = async () => {
      callCount++;
      return callCount === 1 ? "History recap." : "World recap.";
    };

    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: longHistory,
        [`${ADVENTURES_ROOT}/quest/world.md`]: longWorld,
      },
      [
        { type: "text", text: "Response" },
        { type: "done", fullResponse: "Response" },
      ],
      { summarize, compactionConfig: { historyThreshold: 1000, worldThreshold: 2000 } },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(1);

    const payload = JSON.parse(compactedEvents[0].data);
    expect(payload.archived).toBe("past/scene-001.md");

    expect(callCount).toBe(2);
  });

  test("compact_history tool_use is suppressed from SSE events (REQ-COMP-44, Step A.4)", async () => {
    // The session-runner is responsible for suppressing compact_history and
    // set_mood from the tool_use channel; the route forwards what it gets
    // verbatim. The mock runner does not emit a tool_use for compact_history
    // in this script — only a "compacted" event — which mirrors what the
    // real runner is expected to do.
    const { app } = buildTestApp(
      {
        [`${ADVENTURES_ROOT}/quest/character.md`]: "Hero",
        [`${ADVENTURES_ROOT}/quest/history.md`]: "Some history",
      },
      [
        { type: "text", text: "Let me organize our adventure..." },
        { type: "compacted", archived: "past/scene-001.md", previousSize: 5000, newSize: 500 },
        { type: "text", text: "The story continues..." },
        { type: "done", fullResponse: "Let me organize our adventure... The story continues..." },
      ],
      {
        summarize: async () => "ignored",
        compactionConfig: { historyThreshold: 100000, worldThreshold: 200000 },
      },
    );

    const res = await sendMessage(app, "quest", "Hello");
    const text = await res.text();
    const events = parseSSE(text);

    const toolUseEvents = events.filter((e) => e.event === "tool_use");
    for (const e of toolUseEvents) {
      const data = JSON.parse(e.data);
      expect(data.name).not.toBe("compact_history");
    }

    const compactedEvents = events.filter((e) => e.event === "compacted");
    expect(compactedEvents.length).toBe(1);

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
  });
});
