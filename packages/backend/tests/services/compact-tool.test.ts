import { describe, test, expect } from "bun:test";
import { createCompactToolDef } from "../../src/services/compact-tool";
import {
  createCompactionService,
  CompactionInProgressError,
  HistoryTooShortError,
  type CompactionResult,
} from "../../src/services/compaction-service";
import { createMockFileOps } from "../helpers/mock-file-ops";
import { createMockQueryFn, successResult } from "../helpers/mock-query";
import { createSessionRunner, type QueryFn } from "../../src/services/session-runner";

const ADVENTURE_PATH = "/adventures/test-adventure";
const LONG_HISTORY = "**Player:** I explore the dungeon.\n\n**GM:** You step into a vast chamber...\n".repeat(30);
const SUMMARY_TEXT = "The adventurer explored a vast dungeon chamber.";

function makeQueryFn(response: string): QueryFn {
  return createMockQueryFn([successResult(response)]);
}

function makeCompactionService(fileOps: ReturnType<typeof createMockFileOps>, queryFn: QueryFn) {
  return createCompactionService({ fileOps, queryFn });
}

describe("compact-tool", () => {
  test("tool definition has correct name, description, and input schema", () => {
    const fileOps = createMockFileOps({});
    const service = makeCompactionService(fileOps, makeQueryFn(SUMMARY_TEXT));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });

    expect(toolDef.name).toBe("compact_history");
    expect(toolDef.description).toBe("Archive the current history and create a narrative recap.");
    // Input schema should accept an empty object (no required parameters per REQ-COMP-11)
    expect(toolDef.inputSchema).toBeDefined();
  });

  test("successful compaction returns confirmation with archive path", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      [`${ADVENTURE_PATH}/character.md`]: "# Elara\nLevel 5 Ranger",
      [`${ADVENTURE_PATH}/world.md`]: "# The Wilds",
    });
    const service = makeCompactionService(fileOps, makeQueryFn(SUMMARY_TEXT));
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

    const result = await toolDef.handler({ _unused: undefined }, {});
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
    const service = makeCompactionService(fileOps, makeQueryFn(SUMMARY_TEXT));
    let emittedResult: CompactionResult | null = null;
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async (r) => { emittedResult = r; },
    });

    await toolDef.handler({ _unused: undefined }, {});

    expect(emittedResult).not.toBeNull();
    expect(emittedResult!.archived).toBe("past/scene-001.md");
    expect(emittedResult!.previousSize).toBe(LONG_HISTORY.length);
    expect(emittedResult!.newSize).toBe(SUMMARY_TEXT.length);
  });

  test("emitCompactedEvent not called on failure (REQ-COMP-46)", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "Short.",
    });
    const service = makeCompactionService(fileOps, makeQueryFn(SUMMARY_TEXT));
    let emitCalled = false;
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => { emitCalled = true; },
    });

    const result = await toolDef.handler({ _unused: undefined }, {});
    expect(result.content[0].type === "text" && result.content[0].text).toBe("History is too short to compact.");
    expect(emitCalled).toBe(false);
  });

  test("short history returns appropriate message", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: "Short.",
    });
    const service = makeCompactionService(fileOps, makeQueryFn(SUMMARY_TEXT));
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
      emitCompactedEvent: async () => {},
    });

    const result = await toolDef.handler({ _unused: undefined }, {});
    const c = result.content[0];
    const text = c.type === "text" ? c.text : "";
    expect(text).toBe("History is too short to compact.");
  });

  test("concurrent compaction returns appropriate message", async () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
    });
    // Use a delaying queryFn so the first compaction holds the lock
    const delayingQueryFn: QueryFn = () => {
      async function* generator() {
        await new Promise((resolve) => setTimeout(resolve, 100));
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

    const service = makeCompactionService(fileOps, delayingQueryFn);
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
    const result = await toolDef.handler({ _unused: undefined }, {});
    const item = result.content[0];
    expect(item.type).toBe("text");
    if (item.type === "text") expect(item.text).toBe("Compaction is already in progress.");

    await first;
  });

  test("compact_history is registered on corvran MCP server alongside roll_dice and set_mood", () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/character.md`]: "# Test Character",
      [`${ADVENTURE_PATH}/world.md`]: "# Test World",
    });

    // Spy on queryFn to capture the options passed to it
    const capturedOptions: Array<Record<string, unknown>> = [];
    const spyQueryFn: QueryFn = (params) => {
      capturedOptions.push(params.options as Record<string, unknown>);
      return makeQueryFn(SUMMARY_TEXT)(params);
    };

    const service = makeCompactionService(fileOps, spyQueryFn);

    const runner = createSessionRunner({
      queryFn: spyQueryFn,
      config: { model: "sonnet" },
      fileOps,
      compactionService: service,
    });

    // Call runQuery to capture the options
    runner.runQuery({
      systemPrompt: "Test prompt",
      playerMessage: "Hello",
      adventureId: "test",
      adventurePath: ADVENTURE_PATH,
      artStyle: null,
      pluginPaths: [],
      abortController: new AbortController(),
      setMood: async () => {},
      emitMoodEvent: async () => {},
      emitCompactedEvent: async () => {},
    });

    expect(capturedOptions).toHaveLength(1);
    const options = capturedOptions[0];
    const allowedTools = options.allowedTools as string[];
    expect(allowedTools).toContain("mcp__corvran__compact_history");
    expect(allowedTools).toContain("mcp__corvran__roll_dice");
    expect(allowedTools).toContain("mcp__corvran__set_mood");
    const mcpServers = options.mcpServers as Record<string, unknown>;
    expect(mcpServers.corvran).toBeDefined();
  });

  test("runner without compaction deps does not include compact_history in allowedTools", () => {
    const capturedOptions: Array<Record<string, unknown>> = [];
    const spyQueryFn: QueryFn = (params) => {
      capturedOptions.push(params.options as Record<string, unknown>);
      return makeQueryFn(SUMMARY_TEXT)(params);
    };

    const runner = createSessionRunner({
      queryFn: spyQueryFn,
      config: { model: "sonnet" },
    });

    runner.runQuery({
      systemPrompt: "Test prompt",
      playerMessage: "Hello",
      adventureId: "test",
      adventurePath: ADVENTURE_PATH,
      artStyle: null,
      pluginPaths: [],
      abortController: new AbortController(),
      setMood: async () => {},
      emitMoodEvent: async () => {},
      emitCompactedEvent: async () => {},
    });

    expect(capturedOptions).toHaveLength(1);
    const allowedTools = capturedOptions[0].allowedTools as string[];
    expect(allowedTools).not.toContain("mcp__corvran__compact_history");
    expect(allowedTools).toContain("mcp__corvran__roll_dice");
    expect(allowedTools).toContain("mcp__corvran__set_mood");
  });
});
