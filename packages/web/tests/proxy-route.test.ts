import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { unlinkSync } from "fs";

/**
 * Tests the Unix socket proxy behavior by starting a mock daemon on a temp
 * socket using Bun.serve, then calling it via fetch with { unix } option.
 * This validates the same code path the proxy route uses.
 */

const SOCKET_PATH = `/tmp/claude-1000/test-proxy-${Date.now()}.sock`;

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    unix: SOCKET_PATH,
    fetch(req: Request) {
      const url = new URL(req.url);

      // JSON endpoint
      if (url.pathname === "/adventures" && req.method === "GET") {
        return Response.json({
          adventures: [{ id: "test", name: "Test Adventure" }],
        });
      }

      // SSE endpoint
      if (url.pathname.endsWith("/message") && req.method === "POST") {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('event: text\ndata: {"text":"Hello "}\n\n')
            );
            controller.enqueue(
              encoder.encode('event: text\ndata: {"text":"world"}\n\n')
            );
            controller.enqueue(
              encoder.encode(
                'event: done\ndata: {"fullResponse":"Hello world"}\n\n'
              )
            );
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
});

afterAll(() => {
  server.stop(true);
  try {
    unlinkSync(SOCKET_PATH);
  } catch {
    // Already cleaned up
  }
});

describe("Unix socket proxy behavior", () => {
  test("forwards GET request and returns JSON", async () => {
    const response = await fetch("http://localhost/adventures", {
      unix: SOCKET_PATH,
    } as RequestInit);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.adventures).toHaveLength(1);
    expect(data.adventures[0].id).toBe("test");
  });

  test("forwards POST and receives SSE stream", async () => {
    const response = await fetch("http://localhost/adventures/test/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
      unix: SOCKET_PATH,
    } as RequestInit);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const text = await response.text();
    expect(text).toContain("event: text");
    expect(text).toContain('"Hello "');
    expect(text).toContain('"world"');
    expect(text).toContain("event: done");
  });

  test("returns 404 for unknown paths", async () => {
    const response = await fetch("http://localhost/unknown", {
      unix: SOCKET_PATH,
    } as RequestInit);

    expect(response.status).toBe(404);
  });

  test("fetch throws when socket does not exist", async () => {
    // This validates the error path the proxy catches to return 502
    let threw = false;
    try {
      await fetch("http://localhost/adventures", {
        unix: "/tmp/claude-1000/nonexistent.sock",
      } as RequestInit);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("preserves response content-type header", async () => {
    const response = await fetch("http://localhost/adventures", {
      unix: SOCKET_PATH,
    } as RequestInit);

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
