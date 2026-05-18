import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { CompactionService, CompactionResult } from "./compaction-service";
import { CompactionInProgressError, HistoryTooShortError } from "./compaction-service";

type CompactToolDetails =
  | (CompactionResult & { skipped?: undefined; error?: undefined })
  | { skipped: "too_short" | "in_progress"; error?: undefined }
  | { skipped?: undefined; error: string };

export interface CompactToolDeps {
  compactionService: CompactionService;
  adventurePath: string;
  getAdventureContext: () => Promise<{ character?: string; world?: string }>;
  emitCompactedEvent: (result: CompactionResult) => Promise<void>;
}

const CompactInputSchema = Type.Object({
  _unused: Type.Optional(Type.String()),
});

export function createCompactToolDef(deps: CompactToolDeps): ToolDefinition {
  const { compactionService, adventurePath, getAdventureContext } = deps;

  return defineTool<typeof CompactInputSchema, CompactToolDetails>({
    name: "compact_history",
    label: "Compact History",
    description: "Archive the current history and create a narrative recap.",
    parameters: CompactInputSchema,
    async execute() {
      try {
        const context = await getAdventureContext();
        const result = await compactionService.compactHistory(adventurePath, context);
        try {
          await deps.emitCompactedEvent(result);
        } catch (err) {
          console.error(`[compact-tool] failed to emit compacted event:`, err);
        }
        return {
          content: [
            { type: "text", text: `History compacted. Scene archived to ${result.archived}.` },
          ],
          details: result,
        };
      } catch (error) {
        if (error instanceof HistoryTooShortError) {
          return {
            content: [{ type: "text", text: "History is too short to compact." }],
            details: { skipped: "too_short" },
          };
        }
        if (error instanceof CompactionInProgressError) {
          return {
            content: [{ type: "text", text: "Compaction is already in progress." }],
            details: { skipped: "in_progress" },
          };
        }
        const reason = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Compaction failed: ${reason}.` }],
          details: { error: reason },
        };
      }
    },
  });
}
