// History Compactor Tests
// Unit tests for history compaction, archiving, and summarization

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { HistoryCompactor } from "../../src/services/history-compactor";
import type { NarrativeEntry, NarrativeHistory } from "../../../shared/protocol";

const TEST_ADVENTURE_DIR = "./test-adventure-compaction";

// Helper to create test entries
function createTestEntry(
  index: number,
  type: "player_input" | "gm_response",
  contentLength = 100
): NarrativeEntry {
  const content = `${"x".repeat(contentLength)} (entry ${index})`;
  return {
    id: `entry-${index}`,
    timestamp: new Date(Date.now() - (100 - index) * 60000).toISOString(), // Stagger timestamps
    type,
    content,
  };
}

// Helper to create a history with n entries
function createTestHistory(entryCount: number, contentLength = 100): NarrativeHistory {
  const entries: NarrativeEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    entries.push(
      createTestEntry(i, i % 2 === 0 ? "player_input" : "gm_response", contentLength)
    );
  }
  return { entries };
}

describe("HistoryCompactor", () => {
  let compactor: HistoryCompactor;

  beforeEach(async () => {
    // Clean test directory before each test
    await rm(TEST_ADVENTURE_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURE_DIR, { recursive: true });

    compactor = new HistoryCompactor(TEST_ADVENTURE_DIR, {
      retainedCount: 20,
      model: "claude-haiku-3",
      mockSdk: true,
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURE_DIR, { recursive: true, force: true });
  });

  describe("shouldCompact()", () => {
    test("returns false when history is below threshold", () => {
      // Create history with 10 entries of 100 chars each = 1000 chars
      const history = createTestHistory(10, 100);
      expect(compactor.shouldCompact(history)).toBe(false);
    });

    test("returns true when history exceeds threshold", () => {
      // Create history that exceeds 100,000 chars
      // 100 entries * 1100 chars each = 110,000 chars
      const history = createTestHistory(100, 1100);
      expect(compactor.shouldCompact(history)).toBe(true);
    });

    test("returns false for empty history", () => {
      const history: NarrativeHistory = { entries: [] };
      expect(compactor.shouldCompact(history)).toBe(false);
    });
  });

  describe("getHistorySize()", () => {
    test("returns 0 for empty history", () => {
      const history: NarrativeHistory = { entries: [] };
      expect(compactor.getHistorySize(history)).toBe(0);
    });

    test("calculates total characters correctly", () => {
      const history = createTestHistory(5, 200);
      // Each entry has ~200 chars + " (entry X)" suffix
      const expectedMin = 5 * 200;
      const size = compactor.getHistorySize(history);
      expect(size).toBeGreaterThanOrEqual(expectedMin);
    });
  });

  describe("compact()", () => {
    test("returns error when not enough entries to compact", async () => {
      const history = createTestHistory(10);
      const result = await compactor.compact(history);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Not enough entries");
    });

    test("archives older entries and retains recent ones", async () => {
      // Create history with 30 entries, should archive 10 and retain 20
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.entriesArchived).toBe(10);
      expect(result.retainedEntries).toHaveLength(20);
      expect(result.archivePath).toBeDefined();

      // Verify retained entries are the most recent
      expect(result.retainedEntries![0].id).toBe("entry-10");
      expect(result.retainedEntries![19].id).toBe("entry-29");
    });

    test("creates archive file with correct format", async () => {
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.archivePath).toBeDefined();

      // Read archive file
      const archiveContent = await readFile(result.archivePath!, "utf-8");

      // Check YAML frontmatter
      expect(archiveContent).toContain("---");
      expect(archiveContent).toContain("archived_at:");
      expect(archiveContent).toContain("date_range:");
      expect(archiveContent).toContain("entry_count: 10");

      // Check markdown content
      expect(archiveContent).toContain("# Archived Adventure History");
      expect(archiveContent).toContain("## Entries");
      expect(archiveContent).toContain("Player Input");
      expect(archiveContent).toContain("GM Response");
    });

    test("creates archive directory if missing", async () => {
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);

      // Check that history directory was created
      const historyDir = join(TEST_ADVENTURE_DIR, "history");
      const files = await readdir(historyDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });

    test("generates mock summary in MOCK_SDK mode", async () => {
      // The compactor uses env.mockSdk which defaults to false in tests
      // But we can verify the structure even with mock
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();

      if (result.summary) {
        expect(result.summary.model).toBe("claude-haiku-3");
        expect(result.summary.entriesArchived).toBe(10);
        expect(result.summary.dateRange.from).toBeDefined();
        expect(result.summary.dateRange.to).toBeDefined();
        expect(result.summary.text).toBeDefined();
        expect(result.summary.generatedAt).toBeDefined();
      }
    });

    test("prevents concurrent compaction", async () => {
      const history = createTestHistory(30);

      // Start two compactions simultaneously
      const promise1 = compactor.compact(history);
      const promise2 = compactor.compact(history);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail with "already in progress"
      const successes = [result1, result2].filter((r) => r.success);
      const failures = [result1, result2].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toContain("already in progress");
    });

    test("handles custom retention count", async () => {
      const customCompactor = new HistoryCompactor(TEST_ADVENTURE_DIR, {
        retainedCount: 10,
        model: "claude-haiku-3",
        mockSdk: true,
      });

      const history = createTestHistory(30);
      const result = await customCompactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.entriesArchived).toBe(20);
      expect(result.retainedEntries).toHaveLength(10);
    });
  });

  describe("date range calculation", () => {
    test("calculates correct date range from entries", async () => {
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.summary?.dateRange.from).toBe(history.entries[0].timestamp);
      expect(result.summary?.dateRange.to).toBe(history.entries[9].timestamp);
    });
  });

  describe("archive filename format", () => {
    test("generates timestamped filename", async () => {
      const history = createTestHistory(30);
      const result = await compactor.compact(history);

      expect(result.success).toBe(true);
      expect(result.archivePath).toMatch(/history\/\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });
  });
});
