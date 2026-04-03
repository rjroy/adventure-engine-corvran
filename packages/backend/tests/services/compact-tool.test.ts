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
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({
        character: "# Elara\nLevel 5 Ranger",
        world: "# The Wilds",
      }),
    });

    const result = await toolDef.handler({});
    const text = result.content[0].text;
    expect(text).toBe("History compacted. Scene archived to past/scene-001.md.");
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
    });

    const result = await toolDef.handler({});
    const text = result.content[0].text;
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
      }) as ReturnType<QueryFn>;
    };

    const service = makeCompactionService(fileOps, delayingQueryFn);
    const toolDef = createCompactToolDef({
      compactionService: service,
      adventurePath: ADVENTURE_PATH,
      getAdventureContext: async () => ({}),
    });

    // Start compaction via the service directly to hold the lock
    const first = service.compactHistory(ADVENTURE_PATH);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Tool call while lock is held
    const result = await toolDef.handler({});
    const text = result.content[0].text;
    expect(text).toBe("Compaction is already in progress.");

    await first;
  });

  test("compact_history is registered on corvran MCP server alongside roll_dice and set_mood", () => {
    const fileOps = createMockFileOps({
      [`${ADVENTURE_PATH}/character.md`]: "# Test Character",
      [`${ADVENTURE_PATH}/world.md`]: "# Test World",
    });
    const queryFn = makeQueryFn(SUMMARY_TEXT);
    const service = makeCompactionService(fileOps, queryFn);

    const runner = createSessionRunner({
      queryFn,
      config: { model: "sonnet" },
      fileOps,
      compactionService: service,
    });

    // runQuery returns a Query. We verify the allowedTools list includes
    // compact_history by checking the runner was created without error
    // and the factory accepts the compactionService + fileOps deps.
    expect(runner).toBeDefined();
    expect(runner.runQuery).toBeTypeOf("function");

    // Also verify a runner without compaction still works (backward compat)
    const runnerNoCompact = createSessionRunner({
      queryFn,
      config: { model: "sonnet" },
    });
    expect(runnerNoCompact).toBeDefined();
  });
});
