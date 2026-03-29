import { NextRequest } from "next/server";
import * as http from "node:http";
import { resolve } from "node:path";
import { Readable } from "node:stream";

const SOCKET_PATH = resolve(process.env.DAEMON_SOCKET_PATH || "./corvran.sock");

/**
 * Pipe a web ReadableStream body into a Node http.ClientRequest.
 */
function pipeBodyToRequest(
  body: ReadableStream<Uint8Array>,
  req: http.ClientRequest,
): void {
  const reader = body.getReader();
  function pump(): void {
    reader.read().then(({ done, value }) => {
      if (done) {
        req.end();
        return;
      }
      req.write(value);
      pump();
    }).catch((err) => {
      req.destroy(err instanceof Error ? err : new Error(String(err)));
    });
  }
  pump();
}

/**
 * Collect response headers from a Node IncomingMessage into a plain object.
 */
function collectHeaders(res: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(res.headers)) {
    if (key === "connection" || key === "transfer-encoding") continue;
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(", ");
    }
  }
  return headers;
}

/**
 * Make a buffered HTTP request over a Unix socket. Used for non-streaming
 * responses (JSON, etc).
 */
function requestBuffered(
  socketPath: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: ReadableStream<Uint8Array> | null,
): Promise<{ status: number; headers: Record<string, string>; body: ArrayBuffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, method, path, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode ?? 500,
          headers: collectHeaders(res),
          body: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        });
      });
      res.on("error", reject);
    });

    req.on("error", reject);

    if (body) {
      pipeBodyToRequest(body, req);
    } else {
      req.end();
    }
  });
}

/**
 * Make a streaming HTTP request over a Unix socket. Returns the raw Node
 * response so the caller can pipe it into a web ReadableStream for SSE.
 */
function requestStreaming(
  socketPath: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: ReadableStream<Uint8Array> | null,
): Promise<{ status: number; headers: Record<string, string>; nodeStream: Readable }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, method, path, headers }, (res) => {
      resolve({
        status: res.statusCode ?? 500,
        headers: collectHeaders(res),
        nodeStream: res,
      });
    });

    req.on("error", reject);

    if (body) {
      pipeBodyToRequest(body, req);
    } else {
      req.end();
    }
  });
}

/**
 * Forward a request to the daemon's Unix socket and return the response.
 * SSE responses are streamed through without buffering.
 */
async function proxyToDaemon(request: NextRequest, path: string[]): Promise<Response> {
  const daemonPath = `/${path.join("/")}${request.nextUrl.search}`;

  console.log(`[proxy] ${request.method} ${daemonPath} -> unix:${SOCKET_PATH}`);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key === "host" || key === "connection" || key === "transfer-encoding") return;
    headers[key] = value;
  });

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? request.body
    : null;

  // Check if the client expects SSE (the message endpoint uses Accept: text/event-stream)
  const acceptsSSE = request.headers.get("accept")?.includes("text/event-stream");

  try {
    if (acceptsSSE) {
      const daemonResponse = await requestStreaming(
        SOCKET_PATH, request.method, daemonPath, headers, body,
      );

      console.log(`[proxy] ${request.method} ${daemonPath} <- ${daemonResponse.status} (streaming)`);

      const webStream = Readable.toWeb(daemonResponse.nodeStream) as ReadableStream;

      return new Response(webStream, {
        status: daemonResponse.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Buffered path for regular requests
    const daemonResponse = await requestBuffered(
      SOCKET_PATH, request.method, daemonPath, headers, body,
    );

    console.log(`[proxy] ${request.method} ${daemonPath} <- ${daemonResponse.status}`);

    return new Response(daemonResponse.body, {
      status: daemonResponse.status,
      headers: daemonResponse.headers,
    });
  } catch (err) {
    console.error(`[proxy] ${request.method} ${daemonPath} FAILED:`, err);
    return new Response(
      JSON.stringify({
        error: "Daemon unreachable",
        detail: err instanceof Error ? err.message : String(err),
        socketPath: SOCKET_PATH,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}
