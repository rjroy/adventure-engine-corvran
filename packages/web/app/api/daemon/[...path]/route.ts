import { NextRequest } from "next/server";

const SOCKET_PATH = process.env.DAEMON_SOCKET_PATH || "./corvran.sock";

/**
 * Forward a request to the daemon's Unix socket and return the response.
 * For SSE streams, pipes chunks without buffering.
 */
async function proxyToDaemon(request: NextRequest, path: string[]): Promise<Response> {
  const daemonPath = `/${path.join("/")}`;
  const url = `http://localhost${daemonPath}`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Skip hop-by-hop headers and host
    if (key === "host" || key === "connection" || key === "transfer-encoding") return;
    headers[key] = value;
  });

  const fetchOptions: RequestInit & { unix: string } = {
    method: request.method,
    headers,
    unix: SOCKET_PATH,
  };

  // Forward body for methods that have one
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    // Duplex is required for streaming request bodies in Bun/Node
    (fetchOptions as unknown as Record<string, unknown>).duplex = "half";
  }

  let daemonResponse: Response;
  try {
    daemonResponse = await fetch(url, fetchOptions);
  } catch {
    return new Response(
      JSON.stringify({ error: "Daemon unreachable" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const contentType = daemonResponse.headers.get("content-type") || "";

  // SSE: pipe the stream through without buffering
  if (contentType.includes("text/event-stream")) {
    if (!daemonResponse.body) {
      return new Response(
        JSON.stringify({ error: "Empty stream from daemon" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(daemonResponse.body, {
      status: daemonResponse.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // Non-streaming: forward JSON body and status
  const responseHeaders = new Headers();
  daemonResponse.headers.forEach((value, key) => {
    // Skip hop-by-hop headers
    if (key === "connection" || key === "transfer-encoding") return;
    responseHeaders.set(key, value);
  });

  return new Response(daemonResponse.body, {
    status: daemonResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToDaemon(request, path);
}
