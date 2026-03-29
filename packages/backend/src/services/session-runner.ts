import type { Query, Options } from "@anthropic-ai/claude-agent-sdk";

export type QueryFn = (params: { prompt: string; options?: Options }) => Query;

export interface SessionRunnerConfig {
  pluginPaths: string[];
  model: string;
}

export interface RunQueryParams {
  systemPrompt: string;
  playerMessage: string;
  adventurePath: string;
  abortController: AbortController;
}

const TOOLS = ["Bash", "Read", "Write", "Edit", "Grep", "Glob"];

export function createSessionRunner(deps: {
  queryFn: QueryFn;
  config: SessionRunnerConfig;
}) {
  const { queryFn, config } = deps;

  function runQuery(params: RunQueryParams): Query {
    const { systemPrompt, playerMessage, adventurePath, abortController } = params;

    return queryFn({
      prompt: playerMessage,
      options: {
        systemPrompt,
        cwd: adventurePath,
        plugins: config.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
        tools: TOOLS,
        allowedTools: TOOLS,
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
