import { describe, test, expect } from "bun:test";
import { createCompactToolDef } from "../../src/services/compact-tool";
import {
  createCompactionService,
  CompactionInProgressError,
  HistoryTooShortError,
  type CompactionResult,
  type SummarizeFn,
} from "../../src/services/compaction-service";
import { createMockFileOps } from "../helpers/mock-file-ops";
import { invokeTool } from "../helpers/invoke-tool";

const ADVENTURE_PATH = "/adventures/test-adventure";
const LONG_HISTORY = "**Player:** I explore the dungeon.\n\n**GM:** You step into a vast chamber...\n".repeat(30);
const SUMMARY_TEXT = "The adventurer explored a vast dungeon chamber.";

function makeSummarize(response: string): SummarizeFn {
  return async () => response;
}

function makeDelayingSummarize(response: string, delayMs: number): SummarizeFn {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return response;
  };
}

function makeCompactionService(
  fileOps: ReturnType<typeof createMockFileOps>,
  summarize: SummarizeFn,
) {
  return createCompactionService({ fileOps, summarize });
}

describe("compact-tool", () => {
  test("tool definition has correct name, description, and parameter schema", () => {
    const fileOps = createMockFileOps({});
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });

    expect(toolDef.name).toBe("compact_history");
    expect(toolDef.description).toBe("Archive the current history and create a narrative recap.");
    expect(toolDef.parameters).toBeDefined();
  });

  test("successful compaction returns confirmation with archive path", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      [`${ADVENTURE_PATH}/character.md`]: "# Elara\nLevel 5 Ranger",
      [`${ADVENTURE_PATH}/world.md`]: "# The Wilds",
    });
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    let emittedResult: unknown = null;
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({
        character: "# Elara\nLevel 5 Ranger",
        world: "# The Wilds",
      }),
      emitCompactedEvent: async (r) => { emittedResult = r; },
    });

    const result = await invokeTool(toolDef, { _unused: undefined });
    const c = result.content[0];
    const text = c.type === "text" ? c.text : "";
    expect(text).toBe("History compacted. Scene archived to past/scene-001.md.");

    // REQ-COMP-44: emitCompactedEvent called with CompactionResult
    expect(emittedResult).not.toBeNull();
    const emitted = emittedResult as CompactionResult;
    expect(emitted.archived).toBe("past/scene-001.md");
    expect(emitted.previousSize).toBe(LONG_HISTORY.length);
    expect(typeof emitted.newSize).toBe("number");
  });

  test("emitCompactedEvent called on successful compaction (REQ-COMP-44)", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
    });
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    let emittedResult: CompactionResult | null = null;
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async (r) => { emittedResult = r; },
    });

    await invokeTool(toolDef, { _unused: undefined });

    expect(emittedResult).not.toBeNull();
    expect(emittedResult!.archived).toBe("past/scene-001.md");
    expect(emittedResult!.previousSize).toBe(LONG_HISTORY.length);
    expect(emittedResult!.newSize).toBe(SUMMARY_TEXT.length);
  });

  test("emitCompactedEvent not called on failure (REQ-COMP-46)", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "Short.",
    });
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    let emitCalled = false;
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => { emitCalled = true; },
    });

    const result = await invokeTool(toolDef, { _unused: undefined });
    expect(result.content[0].type === "text" && result.content[0].text).toBe(
      "History is too short to compact.",
    );
    expect(emitCalled).toBe(false);
  });

  test("short history returns appropriate message", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "Short.",
    });
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });

    const result = await invokeTool(toolDef, { _unused: undefined });
    const c = result.content[0];
    const text = c.type === "text" ? c.text : "";
    expect(text).toBe("History is too short to compact.");
  });

  test("concurrent compaction returns appropriate message", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
    });
    const service = makeCompactionService(fileOps, makeDelayingSummarize(SUMMARY_TEXT, 100));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });

    // Start compaction via the service directly to hold the lock
    const first = service.compactHistory(ADVENTURE_PATH);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Tool call while lock is held
    const result = await invokeTool(toolDef, { _unused: undefined });
    const item = result.content[0];
    expect(item.type).toBe("text");
    if (item.type === "text") expect(item.text).toBe("Compaction is already in progress.");

    await first;
  });

  test("compact_history is unaffected by surface concurrency (no MCP-server registration required)", () => {
    // Pi-agent has no MCP server abstraction: custom tools are passed directly
    // through `customTools` in createAgentSession. The session-runner is
    // responsible for wiring up the tool; this test simply confirms the def
    // itself is a valid ToolDefinition with the expected name.
    const fileOps = createMockFileOps({});
    const service = makeCompactionService(fileOps, makeSummarize(SUMMARY_TEXT));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });
    expect(toolDef.name).toBe("compact_history");
    expect(toolDef.label).toBe("Compact History");
  });

  // Suppress unused-import warnings — the error classes are exported by the
  // service and exercised through the tool above. Keep the imports stable so
  // future tests can reference them directly.
  void CompactionInProgressError;
  void HistoryTooShortError;
});
