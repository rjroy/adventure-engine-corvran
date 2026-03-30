import type { Query, Options } from "@anthropic-ai/claude-agent-sdk";
import { createDiceTool } from "./dice-tool.js";

export type QueryFn = (params: { prompt: string; options?: Options }) => Query;

export interface SessionRunnerConfig {
  model: string;
}

export interface RunQueryParams {
  systemPrompt: string;
  playerMessage: string;
  adventurePath: string;
  pluginPaths: string[];
  abortController: AbortController;
}

const TOOLS = ["Bash", "Read", "Write", "Edit", "Grep", "Glob"];

export function createSessionRunner(deps: {
  queryFn: QueryFn;
  config: SessionRunnerConfig;
}) {
  const { queryFn, config } = deps;
  const diceMcpServer = createDiceTool();

  function runQuery(params: RunQueryParams): Query {
    const { systemPrompt, playerMessage, adventurePath, abortController } = params;

    return queryFn({
      prompt: playerMessage,
      options: {
        systemPrompt,
        cwd: adventurePath,
        plugins: params.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
        tools: TOOLS,
        allowedTools: [...TOOLS, "mcp__corvran__roll_dice"],
        mcpServers: {
          corvran: diceMcpServer,
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
