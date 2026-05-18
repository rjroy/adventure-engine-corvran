import type { RunQueryParams, SessionRunner } from "../../src/services/session-runner";

/**
 * Events scripted into a mock session runner. The mock plays them through the
 * RunQueryParams callbacks in order, mirroring the contract between
 * SessionRunner and the route layer.
 */
export type ScriptedEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; result: string }
  | { type: "done"; fullResponse: string }
  | { type: "error"; error: string }
  | { type: "mood"; hue: number; description: string; imagePath?: string }
  | { type: "compacted"; archived: string; previousSize: number; newSize: number }
  /** Throw the given error during runQuery (after preceding events). */
  | { type: "throw"; error: Error }
  /** Mark the abort signal as triggered before continuing the script. */
  | { type: "abort" };

export interface MockRunnerCall {
  params: RunQueryParams;
  systemPrompt: string;
  playerMessage: string;
  adventureId: string;
  adventurePath: string;
  artStyle: string | null;
  pluginPaths: string[];
}

export interface MockSessionRunner extends SessionRunner {
  readonly calls: readonly MockRunnerCall[];
}

/**
 * Build a SessionRunner whose runQuery plays the given script and records the
 * params it was called with. Each call replays the same script. For per-call
 * scripts, pass a function that returns the script.
 */
export function createMockSessionRunner(
  scriptOrFn: ScriptedEvent[] | ((call: number) => ScriptedEvent[]),
): MockSessionRunner {
  const calls: MockRunnerCall[] = [];

  async function runQuery(params: RunQueryParams): Promise<void> {
    calls.push({
      params,
      systemPrompt: params.systemPrompt,
      playerMessage: params.playerMessage,
      adventureId: params.adventureId,
      adventurePath: params.adventurePath,
      artStyle: params.artStyle,
      pluginPaths: params.pluginPaths,
    });

    const script = typeof scriptOrFn === "function" ? scriptOrFn(calls.length - 1) : scriptOrFn;

    for (const event of script) {
      switch (event.type) {
        case "text":
          await params.onTextDelta(event.text);
          break;
        case "tool_use":
          await params.onToolUse({ name: event.name, result: event.result });
          break;
        case "done":
          await params.onDone(event.fullResponse);
          break;
        case "error":
          await params.onError(event.error);
          break;
        case "mood": {
          const payload: { hue: number; description: string; imagePath?: string } = {
            hue: event.hue,
            description: event.description,
          };
          if (event.imagePath) payload.imagePath = event.imagePath;
          await params.emitMoodEvent(payload);
          break;
        }
        case "compacted":
          await params.emitCompactedEvent({
            archived: event.archived,
            previousSize: event.previousSize,
            newSize: event.newSize,
          });
          break;
        case "throw":
          throw event.error;
        case "abort":
          params.abortController.abort();
          break;
      }
    }
  }

  return {
    runQuery,
    get calls() {
      return calls;
    },
  };
}
