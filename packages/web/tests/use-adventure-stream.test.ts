import { describe, test, expect, beforeEach, afterEach } from "bun:test";

// Test the SSE event parsing logic directly rather than testing the React hook.
// The hook uses standard fetch + ReadableStream, so we verify the parsing
// by simulating what the hook does internally.

interface ParsedEvent {
  type: string;
  data: Record<string, unknown>;
}

function parseSSEChunk(chunk: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = chunk.split("\n");
  let currentEventType = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEventType = line.slice(7);
    } else if (line.startsWith("data: ")) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        events.push({ type: currentEventType, data: parsed });
      } catch {
        // Skip malformed JSON
      }
      currentEventType = "";
    }
  }
  return events;
}

describe("SSE event parsing", () => {
  test("parses text events", () => {
    const chunk = `event: text\ndata: {"text":"Hello "}\n\nevent: text\ndata: {"text":"world"}\n\n`;
    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hello " } });
    expect(events[1]).toEqual({ type: "text", data: { text: "world" } });
  });

  test("parses tool_use events", () => {
    const chunk = `event: tool_use\ndata: {"name":"dice-roller","result":"Rolled 1d20 → 14"}\n\n`;
    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("tool_use");
    expect(events[0].data.name).toBe("dice-roller");
    expect(events[0].data.result).toBe("Rolled 1d20 → 14");
  });

  test("parses done events", () => {
    const chunk = `event: done\ndata: {"fullResponse":"Complete response text."}\n\n`;
    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
    expect(events[0].data.fullResponse).toBe("Complete response text.");
  });

  test("parses error events", () => {
    const chunk = `event: error\ndata: {"error":"Context too long"}\n\n`;
    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].data.error).toBe("Context too long");
  });

  test("handles mixed event types in one chunk", () => {
    const chunk = [
      `event: text\ndata: {"text":"Before tool. "}`,
      `event: tool_use\ndata: {"name":"dice","result":"Rolled 4"}`,
      `event: text\ndata: {"text":"After tool."}`,
      `event: done\ndata: {"fullResponse":"Before tool. After tool."}`,
    ].join("\n\n");

    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(4);
    expect(events[0].type).toBe("text");
    expect(events[1].type).toBe("tool_use");
    expect(events[2].type).toBe("text");
    expect(events[3].type).toBe("done");
  });

  test("ignores malformed JSON data lines", () => {
    const chunk = `event: text\ndata: not json\n\nevent: text\ndata: {"text":"valid"}\n\n`;
    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(1);
    expect(events[0].data.text).toBe("valid");
  });
});

describe("SSE stream integration via mock API", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("mock fetch returning SSE stream processes events correctly", async () => {
    const sseBody = [
      `event: text\ndata: {"text":"Hello "}\n\n`,
      `event: text\ndata: {"text":"adventurer."}\n\n`,
      `event: tool_use\ndata: {"name":"dice","result":"Rolled 1d20 → 18"}\n\n`,
      `event: done\ndata: {"fullResponse":"Hello adventurer."}\n\n`,
    ].join("");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    const mockResponse = new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });

    globalThis.fetch = async () => mockResponse;

    const response = await fetch("/api/daemon/adventures/test/message", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    const events = parseSSEChunk(buffer);
    expect(events).toHaveLength(4);

    // Verify text accumulation
    let accumulatedText = "";
    const toolEvents: Array<{ name: string; result: string }> = [];

    for (const event of events) {
      if (event.type === "text" && typeof event.data.text === "string") {
        accumulatedText += event.data.text;
      } else if (event.type === "tool_use") {
        toolEvents.push({
          name: event.data.name as string,
          result: event.data.result as string,
        });
      } else if (event.type === "done") {
        expect(event.data.fullResponse).toBe("Hello adventurer.");
      }
    }

    expect(accumulatedText).toBe("Hello adventurer.");
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0].result).toBe("Rolled 1d20 → 18");
  });
});
