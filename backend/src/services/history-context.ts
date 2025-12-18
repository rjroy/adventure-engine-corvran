// History Context Builder for Session Recovery
// Builds a recovery prompt from narrative history when session ID is invalid

import type { NarrativeHistory, NarrativeEntry } from "../../../shared/protocol";

/**
 * Recovery context built from narrative history
 */
export interface RecoveryContext {
  /** Formatted context string to prepend to user input */
  contextPrompt: string;
  /** Number of entries included in the context */
  entriesIncluded: number;
  /** Whether a compaction summary was included */
  hasSummary: boolean;
}

/**
 * Options for building recovery context
 */
export interface RecoveryContextOptions {
  /** Maximum entries to include (default: 20) */
  maxEntries?: number;
  /** Maximum characters for context (default: 12000) */
  maxChars?: number;
  /** Whether to include the compaction summary (default: true) */
  includeSummary?: boolean;
}

/**
 * Build recovery context from narrative history.
 * Prioritizes recent entries and includes compaction summary if available.
 * Used when session ID is invalid and we need to provide conversation context.
 *
 * @param history The narrative history to build context from
 * @param options Configuration options
 * @returns RecoveryContext with formatted prompt and metadata
 */
export function buildRecoveryContext(
  history: NarrativeHistory,
  options: RecoveryContextOptions = {}
): RecoveryContext {
  const {
    maxEntries = 20,
    maxChars = 12000,
    includeSummary = true,
  } = options;

  const parts: string[] = [];
  let charCount = 0;
  let entriesIncluded = 0;

  // Include summary if available and requested
  const hasSummary = includeSummary && !!history.summary?.text;
  if (hasSummary) {
    const summarySection = `## Previous Adventure Summary\n\n${history.summary!.text}\n\n---\n\n`;
    if (charCount + summarySection.length <= maxChars) {
      parts.push(summarySection);
      charCount += summarySection.length;
    }
  }

  // Get recent entries (up to maxEntries)
  const recentEntries = history.entries.slice(-maxEntries);

  // Format entries for context
  if (recentEntries.length > 0) {
    const headerSection = "## Recent Conversation\n\n";
    if (charCount + headerSection.length <= maxChars) {
      parts.push(headerSection);
      charCount += headerSection.length;

      for (const entry of recentEntries) {
        const formatted = formatEntry(entry);
        if (charCount + formatted.length > maxChars) {
          break;
        }

        parts.push(formatted);
        charCount += formatted.length;
        entriesIncluded++;
      }
    }
  }

  return {
    contextPrompt: parts.join(""),
    entriesIncluded,
    hasSummary,
  };
}

/**
 * Format a single narrative entry for the recovery context.
 * Truncates very long entries to preserve space for other content.
 *
 * @param entry The narrative entry to format
 * @returns Formatted string representation
 */
function formatEntry(entry: NarrativeEntry): string {
  const label = entry.type === "player_input" ? "**Player**" : "**Game Master**";

  // Truncate very long entries to preserve space for other content
  const maxContentLength = 1500;
  const content =
    entry.content.length > maxContentLength
      ? entry.content.slice(0, maxContentLength) + "..."
      : entry.content;

  return `${label}: ${content}\n\n`;
}

/**
 * Build a recovery prompt that combines context with user input.
 * This prompt is sent to Claude when recovering from an invalid session.
 *
 * @param userInput The original user input that triggered recovery
 * @param context The recovery context built from history
 * @returns Complete prompt with context and user input
 */
export function buildRecoveryPrompt(
  userInput: string,
  context: RecoveryContext
): string {
  if (!context.contextPrompt) {
    // No history context available - just use the original input
    return userInput;
  }

  return `[SESSION RECOVERY - Previous conversation context restored]

${context.contextPrompt}
---

[Current player input - respond to this]:
${userInput}`;
}
