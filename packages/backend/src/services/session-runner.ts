import type { Query, Options } from "@anthropic-ai/claude-agent-sdk";
import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { MoodState } from "@corvran/shared";
import { createDiceToolDef } from "./dice-tool.js";
import { createMoodToolDef, type MoodEventPayload } from "./mood-tool.js";
import { generateMoodImage } from "./image-gen.js";
import { extractDominantHue } from "./color-extract.js";

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
}) {
  const { queryFn, config } = deps;

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
    const corvranServer = createSdkMcpServer({
      name: "corvran",
      tools: [diceToolDef, moodToolDef],
    });

    return queryFn({
      prompt: playerMessage,
      options: {
        systemPrompt,
        cwd: adventurePath,
        plugins: params.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
        tools: TOOLS,
        allowedTools: [...TOOLS, "mcp__corvran__roll_dice", "mcp__corvran__set_mood"],
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
