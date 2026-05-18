import { describe, test, expect } from "bun:test";
import { createMockFileOps } from "../helpers/mock-file-ops";
import {
  createCompactionService,
  CompactionInProgressError,
  HistoryTooShortError,
  type SummarizeFn,
} from "../../src/services/compaction-service";

const ADVENTURE_PATH = "/adventures/test-adventure";
const LONG_HISTORY = "**Player:** I explore the dungeon.\n\n**GM:** You step into a vast chamber...\n".repeat(30);
const SUMMARY_TEXT = "The adventurer explored a vast dungeon chamber.";
const LONG_WORLD = "# The Kingdom of Valoria\n\nA sprawling realm of forests and mountains...\n".repeat(30);
const WORLD_SUMMARY = "The Kingdom of Valoria is a sprawling realm.";

interface SummarizeCall {
  systemPrompt: string;
  text: string;
}

function makeSummarize(response: string): SummarizeFn {
  return async () => response;
}

/** Returns a summarize fn plus a captured list of calls for inspection. */
function makeCapturingSummarize(response: string): { summarize: SummarizeFn; calls: SummarizeCall[] } {
  const calls: SummarizeCall[] = [];
  const summarize: SummarizeFn = async ({ systemPrompt, text }) => {
    calls.push({ systemPrompt, text });
    return response;
  };
  return { summarize, calls };
}

function makeDelayingSummarize(response: string, delayMs: number): SummarizeFn {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return response;
  };
}

function makeFailingSummarize(error: Error): SummarizeFn {
  return async () => {
    throw error;
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
        summarize: makeSummarize(SUMMARY_TEXT),
      });

      const result = await service.compactHistory(ADVENTURE_PATH);

      expect(result.archived).toBe("past/scene-001.md");
      expect(result.previousSize).toBe(LONG_HISTORY.length);
      expect(result.newSize).toBe(SUMMARY_TEXT.length);

      const archived = await fileOps.readFile(`${ADVENTURE_PATH}/past/scene-001.md`);
      expect(archived).toBe(LONG_HISTORY);

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
        summarize: makeSummarize(SUMMARY_TEXT),
      });

      const result = await service.compactHistory(ADVENTURE_PATH);

      expect(result.archived).toBe("past/scene-004.md");
      expect(await fileOps.readFile(`${ADVENTURE_PATH}/past/scene-004.md`)).toBe(LONG_HISTORY);
    });

    test("short history: throws HistoryTooShortError", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: "Short.",
      });
      const service = createCompactionService({
        fileOps,
        summarize: makeSummarize(SUMMARY_TEXT),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(HistoryTooShortError);
    });

    test("missing history: throws HistoryTooShortError", async () => {
      const fileOps = createMockFileOps({});
      const service = createCompactionService({
        fileOps,
        summarize: makeSummarize(SUMMARY_TEXT),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(HistoryTooShortError);
    });

    test("concurrency: second compaction throws CompactionInProgressError", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const service = createCompactionService({
        fileOps,
        summarize: makeDelayingSummarize(SUMMARY_TEXT, 100),
      });

      const first = service.compactHistory(ADVENTURE_PATH);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.isCompacting(ADVENTURE_PATH)).toBe(true);

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow(CompactionInProgressError);

      await first;

      expect(service.isCompacting(ADVENTURE_PATH)).toBe(false);
    });

    test("summarizer failure: reverses archive and clears lock", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const service = createCompactionService({
        fileOps,
        summarize: makeFailingSummarize(new Error("Haiku unavailable")),
      });

      await expect(service.compactHistory(ADVENTURE_PATH)).rejects.toThrow("Haiku unavailable");

      const restored = await fileOps.readFile(`${ADVENTURE_PATH}/history.md`);
      expect(restored).toBe(LONG_HISTORY);

      expect(service.isCompacting(ADVENTURE_PATH)).toBe(false);

      const pastFiles = await fileOps.readFiles(`${ADVENTURE_PATH}/past`);
      expect(pastFiles).toEqual([]);
    });

    test("context passed to summarizer: character and world in system prompt", async () => {
      const character = "# Elara\nLevel 5 Ranger";
      const world = "# The Wilds\nA dangerous frontier.";
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: LONG_HISTORY,
      });
      const { summarize, calls } = makeCapturingSummarize(SUMMARY_TEXT);
      const service = createCompactionService({ fileOps, summarize });

      await service.compactHistory(ADVENTURE_PATH, { character, world });

      expect(calls).toHaveLength(1);
      expect(calls[0].systemPrompt).toContain("## Character Reference");
      expect(calls[0].systemPrompt).toContain(character);
      expect(calls[0].systemPrompt).toContain("## World Reference");
      expect(calls[0].systemPrompt).toContain(world);
      // The history content itself is passed as the user message text.
      expect(calls[0].text).toBe(LONG_HISTORY);
    });

    test("verbatim archive: content is byte-identical to original", async () => {
      const specialContent = "**Player:** I say \"hello\" to the elf.\n\n**GM:** The elf — a tall, silver-haired woman — nods.\n‘Greetings,’ she says. “I’ve been expecting you.”\n\nHP: 42/50 • GP: 1,234\n".repeat(10);
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/history.md`]: specialContent,
      });
      const service = createCompactionService({
        fileOps,
        summarize: makeSummarize(SUMMARY_TEXT),
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
      const { summarize, calls } = makeCapturingSummarize(WORLD_SUMMARY);
      const service = createCompactionService({ fileOps, summarize });

      const result = await service.compactWorld(ADVENTURE_PATH);

      expect(result.archived).toBe("past/world-001.md");
      expect(result.previousSize).toBe(LONG_WORLD.length);
      expect(result.newSize).toBe(WORLD_SUMMARY.length);

      const archived = await fileOps.readFile(`${ADVENTURE_PATH}/past/world-001.md`);
      expect(archived).toBe(LONG_WORLD);

      const newWorld = await fileOps.readFile(`${ADVENTURE_PATH}/world.md`);
      expect(newWorld).toBe(WORLD_SUMMARY);

      const prompt = calls[0].systemPrompt;
      expect(prompt).toContain("consolidating a world reference document");
      expect(prompt).not.toContain("narrator recapping");
    });

    test("world numbering: separate sequence from history", async () => {
      const fileOps = createMockFileOps({
        [`${ADVENTURE_PATH}/world.md`]: LONG_WORLD,
        [`${ADVENTURE_PATH}/past/scene-003.md`]: "history archive",
        [`${ADVENTURE_PATH}/past/world-002.md`]: "old world",
      });
      const service = createCompactionService({
        fileOps,
        summarize: makeSummarize(WORLD_SUMMARY),
      });

      const result = await service.compactWorld(ADVENTURE_PATH);

      expect(result.archived).toBe("past/world-003.md");
    });
  });
});
