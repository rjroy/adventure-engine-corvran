import type { FileOps } from "../types";
import type { QueryFn } from "./session-runner";

export class CompactionInProgressError extends Error {
  constructor(adventurePath: string) {
    super(`Compaction is already running for adventure: ${adventurePath}`);
    this.name = "CompactionInProgressError";
  }
}

export class HistoryTooShortError extends Error {
  constructor() {
    super("History is empty or too short to compact.");
    this.name = "HistoryTooShortError";
  }
}

export interface CompactionResult {
  archived: string;
  previousSize: number;
  newSize: number;
}

const MIN_COMPACTION_LENGTH = 500;

const HISTORY_SUMMARIZATION_PROMPT = `You are a narrator recapping an adventure for a reader who will continue playing from where you leave off.

Your output will be saved as the adventure's history file. Do not include meta-commentary ("Here is a summary of..."), headers like "Summary:", or references to the act of summarizing. Write as though you are the story's narrator recapping events for a reader who will continue the adventure from where you leave off.

Preserve the following categories of information:
- Character names: all named characters who appeared, with their roles or relationships
- Active quests and objectives: what the player is trying to accomplish, including sub-goals
- Unresolved tensions: threads that were raised but not resolved (the missing daughter, the suspicious guard, the locked door)
- Current location: where the player is at the end of the segment
- Mechanical state changes: level ups, significant inventory changes, HP loss, conditions acquired or cleared, if the RPG system tracks these
- Key decisions the player made: alliances formed, enemies spared, paths chosen
- The emotional state of the narrative: is the mood tense? Triumphant? Desperate? The recap should carry this forward.

Structure the summary with the most recent events given the most detail. Earlier events can be condensed more aggressively. The final paragraph must clearly establish the current situation: where the player is, what they were doing, and what is immediately ahead or unresolved.`;

const WORLD_SUMMARIZATION_PROMPT = `You are consolidating a world reference document for a tabletop RPG adventure.

Your output will replace the current world state file. Do not include meta-commentary, headers like "Summary:", or references to the act of consolidating. Write a clean reference document.

Your task:
- Remove information that is no longer relevant: dead NPCs with no remaining plot threads, abandoned locations the player will not revisit
- Consolidate duplicate or overlapping descriptions into single, authoritative entries
- Tighten prose without losing specificity
- Preserve all active quest state, living NPC details, and mechanical facts (prices, distances, faction relationships)

The output should read as a clean reference document, not as a narrative.`;

function buildHistorySystemPrompt(context?: { character?: string; world?: string }): string {
  let prompt = HISTORY_SUMMARIZATION_PROMPT;

  if (context?.character) {
    prompt += `\n\n## Character Reference\n\nThe following is the player's character sheet for context. Do not summarize it; use it to resolve ambiguous names and verify mechanical state.\n\n${context.character}`;
  }

  if (context?.world) {
    prompt += `\n\n## World Reference\n\nThe following is the current world state for context. Do not summarize it; use it to resolve ambiguous names and verify quest state.\n\n${context.world}`;
  }

  return prompt;
}

/**
 * Extracts the final text result from a Query async iterable.
 * Compaction only cares about the final result text, not streaming events.
 *
 * The SDK's message type hierarchy doesn't export narrowed subtypes for
 * discriminated union branches, so we access `.result` and `.errors` via
 * property checks after narrowing on `type` and `subtype`.
 */
async function extractQueryResult(query: ReturnType<QueryFn>): Promise<string> {
  for await (const msg of query) {
    if (msg.type === "result") {
      if (msg.subtype === "success" && "result" in msg && typeof msg.result === "string") {
        return msg.result;
      }
      const errors = "errors" in msg && Array.isArray(msg.errors) ? msg.errors : ["Unknown error"];
      throw new Error(`Haiku summarization failed: ${errors.join("; ")}`);
    }
  }
  throw new Error("Haiku summarization returned no result");
}

/**
 * Scans a directory for files matching a prefix pattern (e.g., "scene-" or "world-")
 * and returns the next sequential number.
 */
async function getNextSequenceNumber(
  fileOps: FileOps,
  pastDir: string,
  prefix: string,
): Promise<number> {
  let files: string[];
  try {
    files = await fileOps.readFiles(pastDir);
  } catch {
    // Directory doesn't exist yet
    return 1;
  }

  const pattern = new RegExp(`^${prefix}(\\d{3})\\.md$`);
  let highest = 0;

  for (const file of files) {
    const match = pattern.exec(file);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }

  return highest + 1;
}

function formatSequenceNumber(n: number): string {
  return String(n).padStart(3, "0");
}

export interface CompactionServiceDeps {
  fileOps: FileOps;
  queryFn: QueryFn;
}

export function createCompactionService(deps: CompactionServiceDeps) {
  const { fileOps, queryFn } = deps;
  const inFlight = new Set<string>();

  async function compactFile(
    adventurePath: string,
    fileName: string,
    archivePrefix: string,
    systemPrompt: string,
  ): Promise<CompactionResult> {
    if (inFlight.has(adventurePath)) {
      throw new CompactionInProgressError(adventurePath);
    }

    inFlight.add(adventurePath);
    try {
      const filePath = fileOps.resolvePath(adventurePath, fileName);
      let content: string;
      try {
        content = await fileOps.readFile(filePath);
      } catch {
        throw new HistoryTooShortError();
      }

      if (content.length < MIN_COMPACTION_LENGTH) {
        throw new HistoryTooShortError();
      }

      const previousSize = content.length;
      const pastDir = fileOps.resolvePath(adventurePath, "past");
      const seq = await getNextSequenceNumber(fileOps, pastDir, archivePrefix);
      const archiveName = `${archivePrefix}${formatSequenceNumber(seq)}.md`;
      const archivePath = fileOps.resolvePath(pastDir, archiveName);

      // Step 1: Archive (write-then-delete)
      await fileOps.writeFile(archivePath, content);
      try {
        await fileOps.deleteFile(filePath);
      } catch (deleteError) {
        // Rollback archive to prevent two copies on disk
        try { await fileOps.deleteFile(archivePath); } catch { /* best effort */ }
        throw deleteError;
      }

      // Step 2: Summarize via Haiku (REQ-COMP-41: 60-second timeout)
      let summary: string;
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 60_000);
      try {
        const query = queryFn({
          prompt: content,
          options: {
            systemPrompt,
            model: "claude-haiku-4-5-20251001",
            persistSession: false,
            permissionMode: "dontAsk",
            abortController: timeoutController,
          },
        });
        summary = await extractQueryResult(query);
      } catch (error) {
        // Reverse the archive: restore original file, remove archive
        await fileOps.writeFile(filePath, content);
        try {
          await fileOps.deleteFile(archivePath);
        } catch {
          // Best effort cleanup
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      // Step 3: Save summary as new file
      await fileOps.writeFile(filePath, summary);

      return {
        archived: `past/${archiveName}`,
        previousSize,
        newSize: summary.length,
      };
    } finally {
      inFlight.delete(adventurePath);
    }
  }

  async function compactHistory(
    adventurePath: string,
    context?: { character?: string; world?: string },
  ): Promise<CompactionResult> {
    const systemPrompt = buildHistorySystemPrompt(context);
    return compactFile(adventurePath, "history.md", "scene-", systemPrompt);
  }

  async function compactWorld(adventurePath: string): Promise<CompactionResult> {
    return compactFile(adventurePath, "world.md", "world-", WORLD_SUMMARIZATION_PROMPT);
  }

  function isCompacting(adventurePath: string): boolean {
    return inFlight.has(adventurePath);
  }

  return { compactHistory, compactWorld, isCompacting };
}

export type CompactionService = ReturnType<typeof createCompactionService>;
