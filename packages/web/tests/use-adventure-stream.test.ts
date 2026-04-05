import { describe, test, expect, beforeEach, afterEach } from "bun:test";

// Test the SSE event parsing logic directly rather than testing the React hook.
// The hook uses standard fetch + ReadableStream, so we verify the parsing
// by simulating what the hook does internally.

interface ParsedEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Parses a single SSE chunk into events. Stateless: only sees lines within this chunk.
 * Use parseSSEChunks for multi-chunk scenarios.
 */
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

/**
 * Simulates the hook's multi-chunk reader loop with buffer and persistent event type.
 * Each string in chunks represents one reader.read() result.
 */
function parseSSEChunks(chunks: string[]): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  let buffer = "";
  let currentEventType = "";

  for (const chunk of chunks) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

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
  }

  // Process remaining buffer (matches hook's post-loop logic)
  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
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

describe("SSE cross-chunk parsing", () => {
  test("done event split across two chunks: event line in chunk 1, data line in chunk 2", () => {
    const chunks = [
      `event: text\ndata: {"text":"Hello"}\n\nevent: done\n`,
      `data: {"fullResponse":"Hello"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hello" } });
    expect(events[1]).toEqual({
      type: "done",
      data: { fullResponse: "Hello" },
    });
  });

  test("all events in a single chunk still works (regression)", () => {
    const chunks = [
      `event: text\ndata: {"text":"Hello "}\n\nevent: text\ndata: {"text":"world"}\n\nevent: done\ndata: {"fullResponse":"Hello world"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("text");
    expect(events[1].type).toBe("text");
    expect(events[2].type).toBe("done");
    expect(events[2].data.fullResponse).toBe("Hello world");
  });

  test("final data line without trailing newline is still processed", () => {
    const chunks = [
      `event: text\ndata: {"text":"Hello"}\n\nevent: done\ndata: {"fullResponse":"Hello"}`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hello" } });
    expect(events[1]).toEqual({
      type: "done",
      data: { fullResponse: "Hello" },
    });
  });

  test("event type split mid-line across chunks", () => {
    // "event: done" split as "event: do" + "ne\ndata: ..."
    const chunks = [
      `event: text\ndata: {"text":"Hi"}\n\nevent: do`,
      `ne\ndata: {"fullResponse":"Hi"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hi" } });
    expect(events[1]).toEqual({ type: "done", data: { fullResponse: "Hi" } });
  });

  test("data line JSON split across chunks", () => {
    const chunks = [
      `event: text\ndata: {"text":"He`,
      `llo"}\n\nevent: done\ndata: {"fullResponse":"Hello"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hello" } });
    expect(events[1]).toEqual({
      type: "done",
      data: { fullResponse: "Hello" },
    });
  });

  test("error event split across chunks sets error type correctly", () => {
    const chunks = [
      `event: error\n`,
      `data: {"error":"Context too long"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "error",
      data: { error: "Context too long" },
    });
  });

  test("many small chunks each containing partial lines", () => {
    // Simulate extreme chunking where each character arrives separately
    const fullSSE = `event: text\ndata: {"text":"Hi"}\n\nevent: done\ndata: {"fullResponse":"Hi"}\n\n`;
    // Split into chunks of 5 characters each
    const chunks: string[] = [];
    for (let i = 0; i < fullSSE.length; i += 5) {
      chunks.push(fullSSE.slice(i, i + 5));
    }
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: { text: "Hi" } });
    expect(events[1]).toEqual({ type: "done", data: { fullResponse: "Hi" } });
  });
});

describe("compacted event parsing", () => {
  test("compacted event is parsed with correct payload", () => {
    const chunk = [
      `event: text\ndata: {"text":"Before compact. "}`,
      `event: compacted\ndata: {"archived":"past/scene-003.md","previousSize":145230,"newSize":4820}`,
      `event: text\ndata: {"text":"After compact."}`,
      `event: done\ndata: {"fullResponse":"Before compact. After compact."}`,
    ].join("\n\n");

    const events = parseSSEChunk(chunk);
    expect(events).toHaveLength(4);

    const compactedEvent = events.find((e) => e.type === "compacted");
    expect(compactedEvent).toBeDefined();
    expect(compactedEvent!.data).toEqual({
      archived: "past/scene-003.md",
      previousSize: 145230,
      newSize: 4820,
    });
  });

  test("compacted event does not disrupt text accumulation", () => {
    const chunk = [
      `event: text\ndata: {"text":"Hello "}`,
      `event: compacted\ndata: {"archived":"past/scene-001.md","previousSize":5000,"newSize":500}`,
      `event: text\ndata: {"text":"world"}`,
      `event: done\ndata: {"fullResponse":"Hello world"}`,
    ].join("\n\n");

    const events = parseSSEChunk(chunk);

    // Text events are still present and correct around the compacted event
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents).toHaveLength(2);
    expect(textEvents[0].data.text).toBe("Hello ");
    expect(textEvents[1].data.text).toBe("world");

    // Done event has the full response
    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent!.data.fullResponse).toBe("Hello world");
  });

  test("compacted event with invalid payload is ignored", () => {
    const chunk = `event: compacted\ndata: {"not":"valid"}\n\n`;
    const events = parseSSEChunk(chunk);
    // The event is parsed as JSON, but won't pass CompactResponseSchema.safeParse
    // in the hook. At the parsing level, it's still a valid event.
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("compacted");
  });

  test("compacted event split across chunks is reassembled", () => {
    const chunks = [
      `event: text\ndata: {"text":"Hi"}\n\nevent: compact`,
      `ed\ndata: {"archived":"past/scene-001.md","previousSize":5000,"newSize":500}\n\nevent: done\ndata: {"fullResponse":"Hi"}\n\n`,
    ];
    const events = parseSSEChunks(chunks);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("text");
    expect(events[1].type).toBe("compacted");
    expect(events[1].data).toEqual({
      archived: "past/scene-001.md",
      previousSize: 5000,
      newSize: 500,
    });
    expect(events[2].type).toBe("done");
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
