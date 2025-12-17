/**
 * History Compactor Service
 *
 * Implements history compaction for adventure narratives:
 * 1. Archives older entries to dated markdown files
 * 2. Generates AI summaries of archived content
 * 3. Retains recent entries for immediate context
 *
 * Compaction is triggered when history exceeds a character threshold,
 * keeping gameplay responsive while preserving narrative continuity.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NarrativeEntry, HistorySummary, NarrativeHistory } from "../../../shared/protocol";
import type { CompactionConfig, CompactionResult } from "../types/state";
import { logger } from "../logger";
import { env } from "../env";

// Dynamic import for SDK to support mock mode
let query: typeof import("@anthropic-ai/claude-agent-sdk").query | undefined;

/**
 * Initialize the SDK query function.
 * Uses real SDK in production, skips in mock mode.
 */
async function initializeQuery(): Promise<void> {
  if (env.mockSdk) {
    return; // Mock mode uses inline mock function
  }
  if (!query) {
    const sdk = await import("@anthropic-ai/claude-agent-sdk");
    query = sdk.query;
  }
}

/**
 * Summarization prompt for Claude.
 * Focuses on narrative-relevant information for returning players.
 */
const SUMMARIZATION_PROMPT = `You are summarizing a narrative adventure history for context continuity.

The history contains player inputs and Game Master (GM) responses from an interactive text adventure.

SUMMARIZATION GUIDELINES:
1. Preserve key PLOT POINTS:
   - Major story events and turning points
   - Important discoveries or revelations
   - Quest progress and objectives

2. Track CHARACTER DEVELOPMENTS:
   - Player character name and key traits established
   - NPCs introduced and their significance
   - Relationships formed or changed

3. Note WORLD STATE changes:
   - Locations visited and their significance
   - Items acquired or lost
   - Important lore or facts established

4. Keep the NARRATIVE TONE:
   - Match the adventure's genre and style
   - Preserve emotional high points
   - Note any running jokes or callbacks

FORMAT:
Write a cohesive narrative summary in 2nd person ("You"), as if recapping for a returning player.
Target length: 200-400 words.
Start with "Previously in your adventure..." or similar.

Do NOT include:
- Mundane movements or routine actions
- Exact dialogue unless particularly significant
- Technical details or dice rolls
- Meta-commentary about the game itself

HISTORY TO SUMMARIZE:
`;

/**
 * Service for compacting adventure history.
 *
 * When history grows beyond the configured threshold, this service:
 * 1. Archives older entries to markdown files
 * 2. Generates an AI summary of the archived content
 * 3. Retains recent entries for immediate context
 */
export class HistoryCompactor {
  private adventureDir: string;
  private config: CompactionConfig;
  private log: ReturnType<typeof logger.child>;
  private compactionInProgress = false;

  /**
   * Create a new HistoryCompactor instance.
   *
   * @param adventureDir - Directory containing the adventure state files
   * @param config - Compaction configuration
   */
  constructor(adventureDir: string, config: CompactionConfig) {
    this.adventureDir = adventureDir;
    this.config = config;
    this.log = logger.child({ component: "HistoryCompactor" });
  }

  /**
   * Check if history should be compacted based on character count.
   *
   * @param history - Current narrative history
   * @returns true if compaction should occur
   */
  shouldCompact(history: NarrativeHistory): boolean {
    const totalChars = history.entries.reduce(
      (sum, entry) => sum + entry.content.length,
      0
    );
    return totalChars >= env.compactionCharThreshold;
  }

  /**
   * Calculate total character count of history entries.
   *
   * @param history - Narrative history
   * @returns Total characters across all entries
   */
  getHistorySize(history: NarrativeHistory): number {
    return history.entries.reduce(
      (sum, entry) => sum + entry.content.length,
      0
    );
  }

  /**
   * Perform compaction on the history.
   * Archives older entries, generates summary, and returns retained entries.
   *
   * @param history - Current narrative history
   * @returns Compaction result with archive path, summary, and retained entries
   */
  async compact(history: NarrativeHistory): Promise<CompactionResult> {
    // Prevent concurrent compaction
    if (this.compactionInProgress) {
      this.log.warn("Compaction already in progress, skipping");
      return {
        success: false,
        error: "Compaction already in progress",
      };
    }

    this.compactionInProgress = true;

    try {
      const entryCount = history.entries.length;
      const retainCount = Math.min(this.config.retainedCount, entryCount);

      // If we don't have enough entries to compact, skip
      if (entryCount <= retainCount) {
        this.log.debug({ entryCount, retainCount }, "Not enough entries to compact");
        return {
          success: false,
          error: "Not enough entries to compact",
        };
      }

      const archiveCount = entryCount - retainCount;
      const entriesToArchive = history.entries.slice(0, archiveCount);
      const retainedEntries = history.entries.slice(archiveCount);

      this.log.info(
        { archiveCount, retainCount, totalChars: this.getHistorySize(history) },
        "Starting history compaction"
      );

      // Step 1: Archive entries to markdown
      let archivePath: string;
      try {
        archivePath = await this.archiveEntries(entriesToArchive);
        this.log.info({ archivePath }, "Entries archived successfully");
      } catch (error) {
        this.log.error({ error }, "Failed to archive entries");
        return {
          success: false,
          error: `Archive failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Step 2: Generate summary (include previous summary for continuity)
      let summary: HistorySummary | null = null;
      try {
        const summaryText = await this.generateSummary(entriesToArchive, history.summary?.text);
        const dateRange = this.getDateRange(entriesToArchive);

        summary = {
          generatedAt: new Date().toISOString(),
          model: this.config.model,
          entriesArchived: archiveCount,
          dateRange,
          text: summaryText,
        };
        this.log.info({ entriesArchived: archiveCount }, "Summary generated successfully");
      } catch (error) {
        // Summarization failure is non-fatal - we still have the archive
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log.warn({ error: errorMessage }, "Failed to generate summary, proceeding without");
        summary = null;
      }

      return {
        success: true,
        archivePath,
        entriesArchived: archiveCount,
        retainedEntries,
        summary,
      };
    } finally {
      this.compactionInProgress = false;
    }
  }

  /**
   * Archive entries to a markdown file with YAML frontmatter.
   *
   * @param entries - Entries to archive
   * @returns Path to the created archive file
   */
  private async archiveEntries(entries: NarrativeEntry[]): Promise<string> {
    const historyDir = join(this.adventureDir, "history");
    await mkdir(historyDir, { recursive: true, mode: 0o700 });

    const now = new Date();
    const filename = this.formatArchiveFilename(now);
    const archivePath = join(historyDir, filename);

    const dateRange = this.getDateRange(entries);
    const content = this.formatArchiveContent(entries, dateRange, now);

    await writeFile(archivePath, content, { encoding: "utf-8", mode: 0o600 });

    return archivePath;
  }

  /**
   * Check if we should use mock mode.
   * Config override takes precedence over environment setting.
   */
  private get useMockSdk(): boolean {
    return this.config.mockSdk ?? env.mockSdk;
  }

  /**
   * Generate a summary of the archived entries using Claude.
   * If a previous summary exists, it's included for continuity.
   *
   * @param entries - Entries to summarize
   * @param previousSummary - Optional previous summary to build upon
   * @returns Summary text
   */
  private async generateSummary(entries: NarrativeEntry[], previousSummary?: string): Promise<string> {
    const historyText = this.formatEntriesForSummary(entries);

    // Build prompt with previous summary if available
    let prompt = SUMMARIZATION_PROMPT;
    if (previousSummary) {
      prompt += `PREVIOUS SUMMARY (incorporate and build upon this):
${previousSummary}

NEW EVENTS TO INCORPORATE:
`;
    }
    prompt += historyText;

    if (this.useMockSdk) {
      // Mock mode: return a simple summary
      return this.mockSummarize(entries, previousSummary);
    }

    // Initialize SDK if needed
    await initializeQuery();

    if (!query) {
      throw new Error("SDK query not available");
    }

    // Query Claude for summary
    const sdkQuery = query({
      prompt,
      options: {
        systemPrompt: `You are a narrative summarizer. Your ONLY task is to write a summary.

IMPORTANT: Do NOT use any tools. Do NOT mention tools. Do NOT say you will use tools.
Simply write the summary directly as your response.

You are a narrative summarizer for interactive adventures.`,
        model: this.config.model,
        maxTurns: 1,
        allowedTools: [], // No tools needed for summarization
      },
    });

    let summaryText = "";

    for await (const message of sdkQuery) {
      if (message.type === "stream_event") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const event = message.event;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (event?.type === "content_block_delta" && event.delta?.type === "text_delta") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          summaryText += event.delta.text as string;
        }
      }

      if (message.type === "assistant") {
        if (message.error) {
          throw new Error(`SDK error: ${message.error}`);
        }
        // Fallback to complete message if streaming didn't capture
        if (!summaryText) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (block.type === "text") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                summaryText = block.text as string;
                break;
              }
            }
          }
        }
      }
    }

    if (!summaryText) {
      throw new Error("No summary generated");
    }

    return summaryText.trim();
  }

  /**
   * Mock summarization for testing without API calls.
   */
  private mockSummarize(entries: NarrativeEntry[], previousSummary?: string): string {
    const playerInputs = entries.filter(e => e.type === "player_input");
    const gmResponses = entries.filter(e => e.type === "gm_response");

    const previousContext = previousSummary
      ? `\n\n[Previous summary incorporated: ${previousSummary.slice(0, 50)}...]`
      : "";

    return `Previously in your adventure...

You embarked on a journey through this interactive narrative. Over the course of ${playerInputs.length} actions and ${gmResponses.length} Game Master responses, your story unfolded.

[This is a mock summary generated for testing. In production, Claude will generate a detailed narrative recap of your adventure's key events, character developments, and world state changes.]${previousContext}

The adventure continues from where you left off.`;
  }

  /**
   * Format entries for summarization prompt.
   */
  private formatEntriesForSummary(entries: NarrativeEntry[]): string {
    return entries
      .map((entry) => {
        const type = entry.type === "player_input" ? "Player" : "GM";
        const date = new Date(entry.timestamp).toLocaleString();
        return `[${date}] ${type}: ${entry.content}`;
      })
      .join("\n\n");
  }

  /**
   * Format archive filename with timestamp.
   */
  private formatArchiveFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}-${hours}${minutes}${seconds}.md`;
  }

  /**
   * Format archive content with YAML frontmatter.
   */
  private formatArchiveContent(
    entries: NarrativeEntry[],
    dateRange: { from: string; to: string },
    archivedAt: Date
  ): string {
    const frontmatter = [
      "---",
      `archived_at: "${archivedAt.toISOString()}"`,
      "date_range:",
      `  from: "${dateRange.from}"`,
      `  to: "${dateRange.to}"`,
      `entry_count: ${entries.length}`,
      "---",
      "",
    ].join("\n");

    const header = "# Archived Adventure History\n\n## Entries\n\n";

    const entryContent = entries
      .map((entry) => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toISOString().replace("T", " ").slice(0, 19);
        const type = entry.type === "player_input" ? "Player Input" : "GM Response";

        return `### ${dateStr} - ${type}\n\n${entry.type === "player_input" ? "> " : ""}${entry.content}\n`;
      })
      .join("\n");

    return frontmatter + header + entryContent;
  }

  /**
   * Get date range from entries.
   */
  private getDateRange(entries: NarrativeEntry[]): { from: string; to: string } {
    if (entries.length === 0) {
      const now = new Date().toISOString();
      return { from: now, to: now };
    }

    return {
      from: entries[0].timestamp,
      to: entries[entries.length - 1].timestamp,
    };
  }
}
