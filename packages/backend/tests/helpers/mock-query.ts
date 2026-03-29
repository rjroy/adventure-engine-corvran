import type { SDKMessage, SDKResultMessage, SDKPartialAssistantMessage, SDKAssistantMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { QueryFn } from "../../src/services/session-runner.js";

/**
 * Creates a mock Query object from an array of SDKMessages.
 * Implements the AsyncGenerator interface that Query extends.
 */
function createMockQuery(messages: SDKMessage[]) {
  async function* generator() {
    for (const msg of messages) {
      yield msg;
    }
  }

  const gen = generator();

  return Object.assign(gen, {
    interrupt: async () => {},
    setPermissionMode: async () => {},
    setModel: async () => {},
    setMaxThinkingTokens: async () => {},
    supportedCommands: async () => [],
    supportedModels: async () => [],
    mcpServerStatus: async () => [],
    accountInfo: async () => ({ email: "test@test.com" }),
    rewindFiles: async () => ({ canRewind: false }),
    setMcpServers: async () => ({ added: [], removed: [], errors: {} }),
    streamInput: async () => {},
  });
}

/** Creates a text delta stream event */
export function textDelta(text: string): SDKPartialAssistantMessage {
  return {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKPartialAssistantMessage;
}

/** Creates a success result message */
export function successResult(resultText: string): SDKResultMessage {
  return {
    type: "result",
    subtype: "success",
    duration_ms: 100,
    duration_api_ms: 80,
    is_error: false,
    num_turns: 1,
    result: resultText,
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      server_tool_use: null,
    },
    modelUsage: {},
    permission_denials: [],
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKResultMessage;
}

/** Creates an error result message */
export function errorResult(errors: string[]): SDKResultMessage {
  return {
    type: "result",
    subtype: "error_during_execution",
    duration_ms: 100,
    duration_api_ms: 80,
    is_error: true,
    num_turns: 1,
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 100,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      server_tool_use: null,
    },
    modelUsage: {},
    permission_denials: [],
    errors,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKResultMessage;
}

/** Creates an assistant message with tool_use blocks */
export function assistantWithToolUse(
  tools: Array<{ id: string; name: string; input: Record<string, unknown> }>,
): SDKAssistantMessage {
  return {
    type: "assistant",
    message: {
      id: "msg_" + crypto.randomUUID(),
      type: "message",
      role: "assistant",
      content: tools.map((t) => ({
        type: "tool_use" as const,
        id: t.id,
        name: t.name,
        input: t.input,
      })),
      model: "test-model",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKAssistantMessage;
}

/** Creates a user message with tool_result blocks */
export function userWithToolResult(
  results: Array<{ tool_use_id: string; content: string }>,
): SDKUserMessage {
  return {
    type: "user",
    message: {
      role: "user",
      content: results.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.tool_use_id,
        content: r.content,
      })),
    },
    parent_tool_use_id: null,
    session_id: "test-session",
  } as SDKUserMessage;
}

/** Creates a mock queryFn that returns the given messages */
export function createMockQueryFn(messages: SDKMessage[]): QueryFn {
  return () => createMockQuery(messages) as ReturnType<QueryFn>;
}

/**
 * Creates a mock queryFn that throws an error during iteration.
 * Yields the given messages first, then throws the error.
 */
export function createThrowingQueryFn(
  messagesBeforeError: SDKMessage[],
  error: Error,
): QueryFn {
  return () => {
    async function* generator() {
      for (const msg of messagesBeforeError) {
        yield msg;
      }
      throw error;
    }

    const gen = generator();
    return Object.assign(gen, {
      interrupt: async () => {},
      setPermissionMode: async () => {},
      setModel: async () => {},
      setMaxThinkingTokens: async () => {},
      supportedCommands: async () => [],
      supportedModels: async () => [],
      mcpServerStatus: async () => [],
      accountInfo: async () => ({ email: "test@test.com" }),
      rewindFiles: async () => ({ canRewind: false }),
      setMcpServers: async () => ({ added: [], removed: [], errors: {} }),
      streamInput: async () => {},
    }) as ReturnType<QueryFn>;
  };
}
