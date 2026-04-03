import { describe, test, expect } from "bun:test";
import { createMockFileOps } from "../helpers/mock-file-ops";
import { createMockQueryFn, successResult } from "../helpers/mock-query";
import {
  createCompactionService,
  CompactionInProgressError,
  HistoryTooShortError,
} from "../../src/services/compaction-service";
import type { QueryFn } from "../../src/services/session-runner";

const ADVENTURE_PATH = "/adventures/test-adventure";
const LONG_HISTORY = "**Player:** I explore the dungeon.\n\n**GM:** You step into a vast chamber...\n".repeat(30);
const SUMMARY_TEXT = "The adventurer explored a vast dungeon chamber.";
const LONG_WORLD = "# The Kingdom of Valoria\n\nA sprawling realm of forests and mountains...\n".repeat(30);
const WORLD_SUMMARY = "The Kingdom of Valoria is a sprawling realm.";

function makeQueryFn(response: string): QueryFn {
  return createMockQueryFn([successResult(response)]);
}

/** Creates a queryFn that captures the params it receives for inspection */
function makeCapturingQueryFn(response: string) {
  const calls: Array<{ prompt: string; options?: Record<string, unknown> }> = [];
  const queryFn: QueryFn = (params) => {
    calls.push(params as { prompt: string; options?: Record<string, unknown> });
    return createMockQueryFn([successResult(response)])(params);
  };
  return { queryFn, calls };
}

/** Creates a queryFn that delays before returning, for concurrency testing */
function makeDelayingQueryFn(response: string, delayMs: number): QueryFn {
  return (params) => {
    async function* generator() {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield successResult(response);
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
}

/** Creates a queryFn that throws an error */
function makeFailingQueryFn(error: Error): QueryFn {
  return (params) => {
    async function* generator() {
      throw error;
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
}

describe("CompactionService", () => {
  describe("compactHistory", () => {
    test("compaction pipeline: archives original, writes summary", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(SUMMARY_TEXT),
      });

      const result = await service.compactHistory(ADVENTURE_PATH);

      // Original moved to past/scene-001.md
      expect(result.archived).toBe("past/scene-001.md");
      expect(result.previousSize).toBe(LONG_HISTORY.length);
      expect(result.newSize).toBe(SUMMARY_TEXT.length);

      // Archive contains exact original content
      const archived = await fileOps.readFile(`${ADVENTURE_PATH}/past/scene-001.md`);
      expect(archived).toBe(LONG_HISTORY);

      // history.md now contains the summary
      const newHistory = await fileOps.readFile(`${ADVENTURE_PATH}/history.md`);
      expect(newHistory).toBe(SUMMARY_TEXT);
    });

    test("sequential numbering: increments from highest existing", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
        [`${ADVENTURE_PATH}/past/scene-001.md`]: "old scene 1",
        [`${ADVENTURE_PATH}/past/scene-003.md`]: "old scene 3",
      });

      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(SUMMARY_TEXT),
      });

      const result = await service.compactHistory(ADVENTURE_PATH);

      // Should be scene-004 (highest existing is 003, not gap-fill to 002)
      expect(result.archived).toBe("past/scene-004.md");
      expect(await fileOps.readFile(`${ADVENTURE_PATH}/past/scene-004.md`)).toBe(LONG_HISTORY);
    });

    test("short history: throws HistoryTooShortError", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: "Short.",
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(SUMMARY_TEXT),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(HistoryTooShortError);
    });

    test("missing history: throws HistoryTooShortError", async () => {
      const fileOps = createMockFileOps({});
      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(SUMMARY_TEXT),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(HistoryTooShortError);
    });

    test("concurrency: second compaction throws CompactionInProgressError", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeDelayingQueryFn(SUMMARY_TEXT, 100),
      });

      // Start first compaction (don't await)
      const first = service.compactHistory(ADVENTURE_PATH);

      // Give it a tick to set the lock
      await new Promise((resolve) => setTimeout(resolve, 10));

      // isCompacting should be true
      expect(service.isCompacting(ADVENTURE_PATH)).toBe(true);

      // Second attempt should throw
      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(CompactionInProgressError);

      // Wait for first to complete
      await first;

      // Lock should be cleared
      expect(service.isCompacting(ADVENTURE_PATH)).toBe(false);
    });

    test("Haiku failure: reverses archive and clears lock", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeFailingQueryFn(new Error("Haiku unavailable")),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow("Haiku unavailable");

      // history.md should be restored
      const restored = await fileOps.readFile(`${ADVENTURE_PATH}/history.md`);
      expect(restored).toBe(LONG_HISTORY);

      // Lock should be cleared
      expect(service.isCompacting(ADVENTURE_PATH)).toBe(false);

      // Archive should be cleaned up
      const pastFiles = await fileOps.readFiles(`${ADVENTURE_PATH}/past`);
      expect(pastFiles).toEqual([]);
    });

    test("context passed to Haiku: character and world in system prompt", async () => {
      const character = "# Elara\nLevel 5 Ranger";
      const world = "# The Wilds\nA dangerous frontier.";
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const { queryFn, calls } = makeCapturingQueryFn(SUMMARY_TEXT);
      const service = createCompactionService({ fileOps, queryFn });

      await service.compactHistory(ADVENTURE_PATH, { character, world });

      expect(calls).toHaveLength(1);
      const systemPrompt = calls[0].options?.systemPrompt as string;
      expect(systemPrompt).toContain("## Character Reference");
      expect(systemPrompt).toContain(character);
      expect(systemPrompt).toContain("## World Reference");
      expect(systemPrompt).toContain(world);

      // Should use Haiku model (short name, SDK resolves to latest)
      expect(calls[0].options?.model).toBe("haiku");
      expect(calls[0].options?.persistSession).toBe(false);
      expect(calls[0].options?.permissionMode).toBe("dontAsk");
    });

    test("verbatim archive: content is byte-identical to original", async () => {
      // Include various unicode, whitespace, and special characters
      const specialContent = "**Player:** I say \"hello\" to the elf.\n\n**GM:** The elf \u2014 a tall, silver-haired woman \u2014 nods.\n\u2018Greetings,\u2019 she says. \u201cI\u2019ve been expecting you.\u201d\n\nHP: 42/50 \u2022 GP: 1,234\n".repeat(10);
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: specialContent,
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(SUMMARY_TEXT),
      });

      await service.compactHistory(ADVENTURE_PATH);

      const archived = await fileOps.readFile(`${ADVENTURE_PATH}/past/scene-001.md`);
      expect(archived).toBe(specialContent);
    });
  });

  describe("compactWorld", () => {
    test("world compaction: archives to world-NNN.md naming", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/world.md`]: LONG_WORLD,
      });
      const { queryFn, calls } = makeCapturingQueryFn(WORLD_SUMMARY);
      const service = createCompactionService({ fileOps, queryFn });

      const result = await service.compactWorld(ADVENTURE_PATH);

      expect(result.archived).toBe("past/world-001.md");
      expect(result.previousSize).toBe(LONG_WORLD.length);
      expect(result.newSize).toBe(WORLD_SUMMARY.length);

      // Archive has exact content
      const archived = await fileOps.readFile(`${ADVENTURE_PATH}/past/world-001.md`);
      expect(archived).toBe(LONG_WORLD);

      // New world.md has summary
      const newWorld = await fileOps.readFile(`${ADVENTURE_PATH}/world.md`);
      expect(newWorld).toBe(WORLD_SUMMARY);

      // Uses world-specific prompt (not history prompt)
      const systemPrompt = calls[0].options?.systemPrompt as string;
      expect(systemPrompt).toContain("consolidating a world reference document");
      expect(systemPrompt).not.toContain("narrator recapping");
    });

    test("world numbering: separate sequence from history", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/world.md`]: LONG_WORLD,
        [`${ADVENTURE_PATH}/past/scene-003.md`]: "history archive",
        [`${ADVENTURE_PATH}/past/world-002.md`]: "old world",
      });
      const service = createCompactionService({
        fileOps,
        queryFn: makeQueryFn(WORLD_SUMMARY),
      });

      const result = await service.compactWorld(ADVENTURE_PATH);

      // World numbering is independent of scene numbering
      expect(result.archived).toBe("past/world-003.md");
    });
  });
});
