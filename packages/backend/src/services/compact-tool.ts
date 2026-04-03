import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { CompactionService } from "./compaction-service";
import { CompactionInProgressError, HistoryTooShortError } from "./compaction-service";

export interface CompactToolDeps {
  compactionService: CompactionService;
  adventurePath: string;
  getAdventureContext: () => Promise<{ character?: string; world?: string }>;
}

export function createCompactToolDef(deps: CompactToolDeps) {
  const { compactionService, adventurePath, getAdventureContext } = deps;

  return tool(
    "compact_history",
    "Archive the current history and create a narrative recap.",
    { _unused: z.string().optional() },
    async () => {
      try {
        const context = await getAdventureContext();
        const result = await compactionService.compactHistory(adventurePath, context);
        return {
          content: [
            { type: "text", text: `History compacted. Scene archived to ${result.archived}.` },
          ],
        };
      } catch (error) {
        if (error instanceof HistoryTooShortError) {
          return { content: [{ type: "text", text: "History is too short to compact." }] };
        }
        if (error instanceof CompactionInProgressError) {
          return { content: [{ type: "text", text: "Compaction is already in progress." }] };
        }
        const reason = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Compaction failed: ${reason}.` }] };
      }
    },
  );
}
