import type { Query, Options } from "@anthropic-ai/claude-agent-sdk";
import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { MoodState } from "@corvran/shared";
import { createDiceToolDef } from "./dice-tool";
import { createMoodToolDef, type MoodEventPayload } from "./mood-tool";
import { createCompactToolDef } from "./compact-tool";
import type { CompactionService } from "./compaction-service";
import type { FileOps } from "../types";
import { generateMoodImage } from "./image-gen";
import { extractDominantHue } from "./color-extract";

export type QueryFn = (params: { prompt: string; options?: Options }) => Query;

export interface SessionRunnerConfig {
  model: string;
}

export interface RunQueryParams {
  systemPrompt: string;
  playerMessage: string;
  adventureId: string;
  adventurePath: string;
  artStyle: string | null;
  pluginPaths: string[];
  abortController: AbortController;
  setMood: (mood: MoodState) => Promise<void>;
  emitMoodEvent: (payload: MoodEventPayload) => Promise<void>;
}

const TOOLS = ["Bash", "Read", "Write", "Edit", "Grep", "Glob"];

async function downloadImage(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const buffer = await response.arrayBuffer();
  await Bun.write(destPath, buffer);
}

export function createSessionRunner(deps: {
  queryFn: QueryFn;
  config: SessionRunnerConfig;
  fileOps?: FileOps;
  compactionService?: CompactionService;
}) {
  const { queryFn, config, fileOps, compactionService } = deps;

  function runQuery(params: RunQueryParams): Query {
    const { systemPrompt, playerMessage, adventurePath, abortController } = params;

    const diceToolDef = createDiceToolDef();
    const moodToolDef = createMoodToolDef({
      adventureId: params.adventureId,
      adventurePath,
      artStyle: params.artStyle,
      generateImage: generateMoodImage,
      extractHue: extractDominantHue,
      saveImage: downloadImage,
      setMood: params.setMood,
      emitMoodEvent: params.emitMoodEvent,
    });

    const tools = [diceToolDef, moodToolDef];
    const toolNames = ["mcp__corvran__roll_dice", "mcp__corvran__set_mood"];

    if (compactionService && fileOps) {
      const compactToolDef = createCompactToolDef({
        compactionService,
        adventurePath,
        getAdventureContext: async () => {
          const characterPath = fileOps.resolvePath(adventurePath, "character.md");
          const worldPath = fileOps.resolvePath(adventurePath, "world.md");
          let character: string | undefined;
          let world: string | undefined;
          try { character = await fileOps.readFile(characterPath); } catch { /* missing file */ }
          try { world = await fileOps.readFile(worldPath); } catch { /* missing file */ }
          return { character, world };
        },
      });
      tools.push(compactToolDef);
      toolNames.push("mcp__corvran__compact_history");
    }

    const corvranServer = createSdkMcpServer({
      name: "corvran",
      tools,
    });

    return queryFn({
      prompt: playerMessage,
      options: {
        systemPrompt,
        cwd: adventurePath,
        plugins: params.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
        tools: TOOLS,
        allowedTools: [...TOOLS, ...toolNames],
        mcpServers: {
          corvran: corvranServer,
        },
        permissionMode: "dontAsk",
        persistSession: false,
        model: config.model,
        includePartialMessages: true,
        abortController,
      },
    });
  }

  return { runQuery };
}

export type SessionRunner = ReturnType<typeof createSessionRunner>;
