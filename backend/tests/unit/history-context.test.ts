// History Context Tests
// Unit tests for session recovery context builder

import { describe, test, expect } from "bun:test";
import {
  buildRecoveryContext,
  buildRecoveryPrompt,
} from "../../src/services/history-context";
import type { NarrativeHistory, NarrativeEntry } from "../../../shared/protocol";

// Helper to create test entries
function createEntry(
  type: "player_input" | "gm_response",
  content: string,
  id?: string
): NarrativeEntry {
  return {
    id: id ?? `entry-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    type,
    content,
  };
}

describe("History Context", () => {
  describe("buildRecoveryContext()", () => {
    test("returns empty context for empty history", () => {
      const history: NarrativeHistory = { entries: [] };

      const result = buildRecoveryContext(history);

      expect(result.contextPrompt).toBe("");
      expect(result.entriesIncluded).toBe(0);
      expect(result.hasSummary).toBe(false);
    });

    test("includes recent entries in context", () => {
      const history: NarrativeHistory = {
        entries: [
          createEntry("player_input", "I enter the tavern"),
          createEntry("gm_response", "The tavern is bustling with activity."),
          createEntry("player_input", "I order an ale"),
          createEntry("gm_response", "The bartender nods and slides you a mug."),
        ],
      };

      const result = buildRecoveryContext(history);

      expect(result.entriesIncluded).toBe(4);
      expect(result.hasSummary).toBe(false);
      expect(result.contextPrompt).toContain("**Player**");
      expect(result.contextPrompt).toContain("**Game Master**");
      expect(result.contextPrompt).toContain("I enter the tavern");
      expect(result.contextPrompt).toContain("The bartender nods");
    });

    test("includes summary when available", () => {
      const history: NarrativeHistory = {
        entries: [
          createEntry("player_input", "Continue my journey"),
        ],
        summary: {
          text: "The hero has traveled far and faced many challenges.",
          generatedAt: new Date().toISOString(),
          model: "claude-3-haiku",
          entriesArchived: 50,
          dateRange: {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        },
      };

      const result = buildRecoveryContext(history);

      expect(result.hasSummary).toBe(true);
      expect(result.contextPrompt).toContain("Previous Adventure Summary");
      expect(result.contextPrompt).toContain("traveled far and faced many challenges");
    });

    test("respects maxEntries option", () => {
      const history: NarrativeHistory = {
        entries: Array.from({ length: 10 }, (_, i) =>
          createEntry("player_input", `Entry number ${i + 1} here`)
        ),
      };

      const result = buildRecoveryContext(history, { maxEntries: 3 });

      // Should include only the last 3 entries
      expect(result.entriesIncluded).toBe(3);
      expect(result.contextPrompt).toContain("Entry number 8 here");
      expect(result.contextPrompt).toContain("Entry number 9 here");
      expect(result.contextPrompt).toContain("Entry number 10 here");
      // Entry 1 should NOT appear (only last 3)
      expect(result.contextPrompt).not.toContain("Entry number 1 here");
      expect(result.contextPrompt).not.toContain("Entry number 7 here");
    });

    test("respects maxChars option", () => {
      const longContent = "A".repeat(500);
      const history: NarrativeHistory = {
        entries: Array.from({ length: 10 }, (_, i) =>
          createEntry("player_input", `${longContent} - Entry ${i + 1}`)
        ),
      };

      // Each entry is ~520 chars + formatting. With 2000 char limit, should get ~3 entries
      const result = buildRecoveryContext(history, { maxChars: 2000 });

      expect(result.entriesIncluded).toBeLessThan(10);
      expect(result.contextPrompt.length).toBeLessThanOrEqual(2000);
    });

    test("can exclude summary with includeSummary: false", () => {
      const history: NarrativeHistory = {
        entries: [createEntry("player_input", "Hello")],
        summary: {
          text: "This is the summary",
          generatedAt: new Date().toISOString(),
          model: "claude-3-haiku",
          entriesArchived: 10,
          dateRange: {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        },
      };

      const result = buildRecoveryContext(history, { includeSummary: false });

      expect(result.hasSummary).toBe(false);
      expect(result.contextPrompt).not.toContain("Summary");
      expect(result.contextPrompt).not.toContain("This is the summary");
    });

    test("truncates very long entries", () => {
      const veryLongContent = "A".repeat(3000);
      const history: NarrativeHistory = {
        entries: [createEntry("player_input", veryLongContent)],
      };

      const result = buildRecoveryContext(history);

      // Entry should be truncated with "..." indicator
      expect(result.contextPrompt).toContain("...");
      // Should be much shorter than original
      expect(result.contextPrompt.length).toBeLessThan(veryLongContent.length);
    });

    test("default options are 20 entries and 12000 chars", () => {
      const history: NarrativeHistory = {
        entries: Array.from({ length: 30 }, (_, i) =>
          createEntry("player_input", `Entry number ${i + 1} here`)
        ),
      };

      const result = buildRecoveryContext(history);

      // Should use default of 20 entries (last 20 of 30)
      expect(result.entriesIncluded).toBe(20);
      // First 10 entries should NOT appear
      expect(result.contextPrompt).not.toContain("Entry number 1 here");
      expect(result.contextPrompt).not.toContain("Entry number 10 here");
      // Last 20 entries should appear
      expect(result.contextPrompt).toContain("Entry number 11 here"); // First of last 20
      expect(result.contextPrompt).toContain("Entry number 30 here"); // Last entry
    });

    test("preserves entry order", () => {
      const history: NarrativeHistory = {
        entries: [
          createEntry("player_input", "FIRST"),
          createEntry("gm_response", "SECOND"),
          createEntry("player_input", "THIRD"),
        ],
      };

      const result = buildRecoveryContext(history);

      const firstIndex = result.contextPrompt.indexOf("FIRST");
      const secondIndex = result.contextPrompt.indexOf("SECOND");
      const thirdIndex = result.contextPrompt.indexOf("THIRD");

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe("buildRecoveryPrompt()", () => {
    test("returns original input when no context", () => {
      const context = {
        contextPrompt: "",
        entriesIncluded: 0,
        hasSummary: false,
      };

      const result = buildRecoveryPrompt("Attack the goblin", context);

      expect(result).toBe("Attack the goblin");
    });

    test("prepends context to user input", () => {
      const context = {
        contextPrompt: "## Recent Conversation\n\n**Player**: Hello\n\n",
        entriesIncluded: 1,
        hasSummary: false,
      };

      const result = buildRecoveryPrompt("Attack the goblin", context);

      expect(result).toContain("[SESSION RECOVERY");
      expect(result).toContain("Recent Conversation");
      expect(result).toContain("Hello");
      expect(result).toContain("[Current player input");
      expect(result).toContain("Attack the goblin");
    });

    test("includes session recovery header", () => {
      const context = {
        contextPrompt: "Some context",
        entriesIncluded: 1,
        hasSummary: false,
      };

      const result = buildRecoveryPrompt("Test input", context);

      expect(result).toContain("SESSION RECOVERY");
      expect(result).toContain("Previous conversation context restored");
    });

    test("separates context from current input with delimiter", () => {
      const context = {
        contextPrompt: "Past conversation",
        entriesIncluded: 1,
        hasSummary: false,
      };

      const result = buildRecoveryPrompt("Current action", context);

      expect(result).toContain("---");
      // Current input appears after delimiter
      const parts = result.split("---");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[parts.length - 1]).toContain("Current action");
    });
  });

  describe("Integration: buildRecoveryContext + buildRecoveryPrompt", () => {
    test("full workflow with history and input", () => {
      const history: NarrativeHistory = {
        entries: [
          createEntry("player_input", "I greet the innkeeper"),
          createEntry("gm_response", "The innkeeper smiles warmly and offers you a room."),
        ],
        summary: {
          text: "Your journey has brought you to the village of Millbrook.",
          generatedAt: new Date().toISOString(),
          model: "claude-3-haiku",
          entriesArchived: 20,
          dateRange: {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        },
      };

      const context = buildRecoveryContext(history);
      const prompt = buildRecoveryPrompt("I accept the room offer", context);

      // Should have summary
      expect(prompt).toContain("Millbrook");

      // Should have conversation
      expect(prompt).toContain("greet the innkeeper");
      expect(prompt).toContain("smiles warmly");

      // Should have current input
      expect(prompt).toContain("I accept the room offer");

      // Should be structured
      expect(prompt).toContain("SESSION RECOVERY");
      expect(prompt).toContain("Current player input");
    });
  });
});
