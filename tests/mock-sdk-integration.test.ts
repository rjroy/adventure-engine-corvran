import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, unlinkSync, existsSync } from "fs";
import { createApp } from "../packages/backend/src/app.js";
import type { QueryFn } from "../packages/backend/src/services/session-runner.js";
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";

/**
 * Integration test with mock SDK: starts the daemon with an injected queryFn
 * (no real API key needed), sends POST /adventures/:id/message, and verifies
 * the full SSE chain through the Unix socket.
 */

const TEST_SOCKET = `/tmp/claude-1000/mock-sdk-integration-${Date.now()}.sock`;
const TEST_ADVENTURES = `/tmp/claude-1000/mock-sdk-adventures-${Date.now()}`;

// Tracks calls to the mock queryFn for assertion
const queryCalls: Array<{ prompt: string; systemPrompt?: string }> = [];

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

const TOOL_USE_ID = "toolu_integration_1";

const mockMessages: SDKMessage[] = [
  // Text streaming delta
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Welcome, brave " },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKPartialAssistantMessage,
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "adventurer!" },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKPartialAssistantMessage,
  // Tool invocation (assistant message)
  {
    type: "assistant",
    message: {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: TOOL_USE_ID,
          name: "Bash",
          input: { command: "roll 2d6" },
        },
      ],
      model: "test-model",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKAssistantMessage,
  // Tool result (user message)
  {
    type: "user",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: TOOL_USE_ID,
          content: "Rolled 2d6: [5, 3] = 8",
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: "test-session",
  } as SDKUserMessage,
  // More text
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: " You rolled an 8!" },
    },
    parent_tool_use_id: null,
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKPartialAssistantMessage,
  // Success result
  {
    type: "result",
    subtype: "success",
    duration_ms: 200,
    duration_api_ms: 150,
    is_error: false,
    num_turns: 1,
    result: "Welcome, brave adventurer! You rolled an 8!",
    total_cost_usd: 0.01,
    usage: {
      input_tokens: 200,
      output_tokens: 100,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      server_tool_use: null,
    },
    modelUsage: {},
    permission_denials: [],
    uuid: crypto.randomUUID(),
    session_id: "test-session",
  } as SDKResultMessage,
];

const mockQueryFn: QueryFn = (params) => {
  queryCalls.push({
    prompt: typeof params.prompt === "string" ? params.prompt : "stream",
    systemPrompt:
      params.options?.systemPrompt && typeof params.options.systemPrompt === "string"
        ? params.options.systemPrompt
        : undefined,
  });
  return createMockQuery(mockMessages) as ReturnType<QueryFn>;
};

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  // Create test adventure
  mkdirSync(`${TEST_ADVENTURES}/quest`, { recursive: true });
  writeFileSync(`${TEST_ADVENTURES}/quest/character.md`, "# Hero\nA brave warrior.");
  writeFileSync(`${TEST_ADVENTURES}/quest/world.md`, "# The Realm\nA dangerous land.");

  const app = createApp({
    adventuresPath: TEST_ADVENTURES,
    queryFn: mockQueryFn,
    model: "test-model",
  });

  server = Bun.serve({
    fetch: app.fetch,
    unix: TEST_SOCKET,
    idleTimeout: 0 as never,
  });
});

afterAll(() => {
  if (server) server.stop(true);
  try { unlinkSync(TEST_SOCKET); } catch { /* already cleaned */ }
  try { rmSync(TEST_ADVENTURES, { recursive: true, force: true }); } catch { /* best effort */ }
});

function parseSSE(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (event) events.push({ event, data });
  }
  return events;
}

describe("Mock SDK integration: POST /adventures/:id/message", () => {
  test("streams text, tool_use, and done events through Unix socket", async () => {
    const res = await fetch("http://localhost/adventures/quest/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I enter the cave" }),
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const body = await res.text();
    const events = parseSSE(body);

    // Text events
    const textEvents = events.filter((e) => e.event === "text");
    expect(textEvents.length).toBeGreaterThanOrEqual(2);
    const firstText = JSON.parse(textEvents[0].data);
    expect(firstText.text).toBe("Welcome, brave ");

    // Tool event with result (not invocation input)
    const toolEvents = events.filter((e) => e.event === "tool_use");
    expect(toolEvents.length).toBe(1);
    const toolData = JSON.parse(toolEvents[0].data);
    expect(toolData.name).toBe("Bash");
    expect(toolData.result).toBe("Rolled 2d6: [5, 3] = 8");

    // Done event
    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents.length).toBe(1);
    const doneData = JSON.parse(doneEvents[0].data);
    expect(doneData.fullResponse).toBe("Welcome, brave adventurer! You rolled an 8!");
  });

  test("persists history after message exchange", async () => {
    // History was written by the previous test. Verify via GET endpoint.
    const res = await fetch("http://localhost/adventures/quest/history", {
      unix: TEST_SOCKET,
    } as RequestInit);

    expect(res.status).toBe(200);
    const data = await res.json() as { exists: boolean; history: string | null };
    expect(data.exists).toBe(true);
    expect(data.history).toContain("**Player:** I enter the cave");
    expect(data.history).toContain("**GM:**");
  });

  test("queryFn receives correct system prompt with adventure content", () => {
    expect(queryCalls.length).toBeGreaterThanOrEqual(1);
    const call = queryCalls[0];
    expect(call.prompt).toBe("I enter the cave");
    expect(call.systemPrompt).toContain("Hero");
    expect(call.systemPrompt).toContain("The Realm");
  });
});
