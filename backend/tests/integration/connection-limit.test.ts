/**
 * WebSocket Connection Limit Integration Tests
 *
 * Tests the MAX_CONNECTIONS limit behavior by starting a real Bun server
 * and making actual WebSocket connections to verify:
 * - Connections up to the limit are accepted
 * - Connections beyond the limit are rejected with proper error
 * - After a connection closes, new connections can be accepted
 *
 * These tests use a minimal test server that focuses on connection limit
 * behavior without the full adventure state infrastructure.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import type { Server } from "bun";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { ServerMessage } from "../../src/types/protocol";

// Test configuration
const TEST_PORT = 3099;
const TEST_MAX_CONNECTIONS = 3;
const WS_CONNECT_TIMEOUT = 5000;

/**
 * Message types used by the minimal test server
 * These are simplified versions that don't require full protocol compliance
 */
interface TestMessage {
  type: string;
  payload?: {
    connId?: string;
    code?: string;
    message?: string;
    retryable?: boolean;
  };
}

/**
 * Type guard for test messages
 */
function isTestMessage(data: unknown): data is TestMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as TestMessage).type === "string"
  );
}

// Server instance
let server: Server<unknown> | null = null;

// Track WebSocket connections for cleanup
const activeConnections: WebSocket[] = [];

// Connection tracking for the test server (simulates server.ts connections map)
const testConnections = new Map<string, { adventureId: string }>();
let testConnectionCounter = 0;

/**
 * Helper to open a WebSocket connection (no authentication needed for limit testing)
 * Returns a promise that resolves when the connection is established
 */
function openConnection(adventureId: string = "test-adventure"): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket connection timeout"));
    }, WS_CONNECT_TIMEOUT);

    const ws = new WebSocket(
      `ws://localhost:${TEST_PORT}/ws?adventureId=${adventureId}`,
      {
        // @ts-expect-error - Bun WebSocket supports headers option
        headers: {
          Origin: "http://localhost:5173",
        },
      }
    );

    ws.onopen = () => {
      // Wait for connection_accepted message (confirms server added us to connections)
      // Do nothing here - wait for message
    };

    ws.onmessage = (event) => {
      const parsed: unknown = JSON.parse(event.data as string);
      if (!isTestMessage(parsed)) return;

      if (parsed.type === "connection_accepted") {
        clearTimeout(timeout);
        activeConnections.push(ws);
        resolve(ws);
      } else if (parsed.type === "error") {
        clearTimeout(timeout);
        // Don't close here - let the server close it
        reject(new Error(`Server error: ${parsed.payload?.message ?? "Unknown error"}`));
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection error"));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      // Remove from active connections
      const idx = activeConnections.indexOf(ws);
      if (idx >= 0) {
        activeConnections.splice(idx, 1);
      }
    };
  });
}

/**
 * Helper to attempt a WebSocket connection and capture rejection
 * Returns the close code and error message if rejected
 */
function attemptConnection(
  adventureId: string = "test-adventure"
): Promise<{ accepted: boolean; closeCode?: number; closeReason?: string; errorMessage?: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ accepted: false, errorMessage: "Connection timeout" });
      }
    }, WS_CONNECT_TIMEOUT);

    const ws = new WebSocket(
      `ws://localhost:${TEST_PORT}/ws?adventureId=${adventureId}`,
      {
        // @ts-expect-error - Bun WebSocket supports headers option
        headers: {
          Origin: "http://localhost:5173",
        },
      }
    );

    ws.onmessage = (event) => {
      if (resolved) return;
      const parsed: unknown = JSON.parse(event.data as string);
      if (!isTestMessage(parsed)) return;

      if (parsed.type === "connection_accepted") {
        resolved = true;
        clearTimeout(timeout);
        activeConnections.push(ws);
        resolve({ accepted: true });
      } else if (parsed.type === "error") {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          accepted: false,
          errorMessage: parsed.payload?.message,
        });
      }
    };

    ws.onerror = () => {
      // Ignore - onclose will be called
    };

    ws.onclose = (event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({
        accepted: false,
        closeCode: event.code,
        closeReason: event.reason,
      });
    };
  });
}

/**
 * Close a WebSocket connection cleanly
 */
function closeConnection(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }

    const handler = () => {
      const idx = activeConnections.indexOf(ws);
      if (idx >= 0) {
        activeConnections.splice(idx, 1);
      }
      resolve();
    };

    ws.onclose = handler;
    ws.close();
  });
}

/**
 * Close all active connections
 */
async function closeAllConnections(): Promise<void> {
  const toClose = [...activeConnections];
  await Promise.all(toClose.map((ws) => closeConnection(ws)));
  activeConnections.length = 0;
}

/**
 * Create a minimal test server with connection limit enforcement
 * This mirrors the server.ts connection limit logic without the full adventure infrastructure
 */
function createTestServer(): { app: Hono; websocket: ReturnType<typeof createBunWebSocket>["websocket"] } {
  const { upgradeWebSocket, websocket } = createBunWebSocket();
  const app = new Hono();

  // Health check
  app.get("/api/health", (c) => c.text("OK"));

  // WebSocket endpoint with connection limit
  app.get(
    "/ws",
    async (c, next) => {
      const origin = c.req.header("origin");
      if (origin !== "http://localhost:5173" && origin !== "http://localhost:3000") {
        return c.text("Forbidden", 403);
      }
      return next();
    },
    upgradeWebSocket((c) => {
      const adventureId = c.req.query("adventureId") || "";
      const connId = `conn_${++testConnectionCounter}_${Date.now()}`;

      return {
        onOpen(_event, ws) {
          // Check connection limit BEFORE adding to map
          // This mirrors the logic in server.ts lines 250-266
          if (testConnections.size >= TEST_MAX_CONNECTIONS) {
            const errorMsg: ServerMessage = {
              type: "error",
              payload: {
                code: "GM_ERROR",
                message: "Server at capacity. Please try again later.",
                retryable: true,
              },
            };
            ws.send(JSON.stringify(errorMsg));
            ws.close(1013, "Server at capacity");
            return;
          }

          // Add to connections
          testConnections.set(connId, { adventureId });

          // Send connection accepted message
          ws.send(JSON.stringify({ type: "connection_accepted", payload: { connId } }));
        },

        onClose() {
          testConnections.delete(connId);
        },
      };
    })
  );

  return { app, websocket };
}

describe("WebSocket Connection Limits", () => {
  beforeAll(() => {
    // Create and start test server
    const { app, websocket } = createTestServer();
    server = Bun.serve({
      port: TEST_PORT,
      fetch: app.fetch,
      websocket,
    });
  });

  afterAll(async () => {
    // Close all connections
    await closeAllConnections();

    // Stop server (returns a promise but we don't need to wait for it in tests)
    if (server) {
      void server.stop();
    }
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await closeAllConnections();
    testConnections.clear();
  });

  test("accepts connections up to MAX_CONNECTIONS limit", async () => {
    // Open connections up to the limit
    const connections: WebSocket[] = [];
    for (let i = 0; i < TEST_MAX_CONNECTIONS; i++) {
      const ws = await openConnection(`adventure-${i}`);
      connections.push(ws);
    }

    // All connections should be open
    expect(connections.length).toBe(TEST_MAX_CONNECTIONS);
    for (const ws of connections) {
      expect(ws.readyState).toBe(WebSocket.OPEN);
    }

    // Verify server tracking
    expect(testConnections.size).toBe(TEST_MAX_CONNECTIONS);
  });

  test("rejects connection when at capacity with proper error", async () => {
    // Open connections up to the limit
    for (let i = 0; i < TEST_MAX_CONNECTIONS; i++) {
      await openConnection(`adventure-${i}`);
    }

    // Verify we're at capacity
    expect(testConnections.size).toBe(TEST_MAX_CONNECTIONS);

    // Try to open one more - should be rejected
    const result = await attemptConnection("adventure-overflow");

    expect(result.accepted).toBe(false);
    // Should receive "Server at capacity" error or close code 1013
    const hasCapacityError =
      result.errorMessage?.includes("capacity") ||
      result.closeCode === 1013 ||
      result.closeReason?.includes("capacity");
    expect(hasCapacityError).toBe(true);
  });

  test("accepts new connection after existing one closes", async () => {
    // Open connections up to the limit
    const connections: WebSocket[] = [];
    for (let i = 0; i < TEST_MAX_CONNECTIONS; i++) {
      const ws = await openConnection(`adventure-${i}`);
      connections.push(ws);
    }

    // Verify we're at capacity
    expect(connections.length).toBe(TEST_MAX_CONNECTIONS);
    expect(testConnections.size).toBe(TEST_MAX_CONNECTIONS);

    // Close one connection
    await closeConnection(connections[0]);

    // Small delay to ensure server processes the close
    await new Promise((r) => setTimeout(r, 100));

    // Verify server tracking updated
    expect(testConnections.size).toBe(TEST_MAX_CONNECTIONS - 1);

    // Now a new connection should be accepted
    const result = await attemptConnection("adventure-new");

    expect(result.accepted).toBe(true);
    expect(testConnections.size).toBe(TEST_MAX_CONNECTIONS);
  });

  test("rejected connection has retryable flag set", async () => {
    // Fill up connections
    for (let i = 0; i < TEST_MAX_CONNECTIONS; i++) {
      await openConnection(`adventure-${i}`);
    }

    // Attempt connection that will be rejected and capture the error message
    const errorPayload = await new Promise<TestMessage["payload"] | null>(
      (resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, WS_CONNECT_TIMEOUT);

        const ws = new WebSocket(
          `ws://localhost:${TEST_PORT}/ws?adventureId=overflow`,
          {
            // @ts-expect-error - Bun WebSocket supports headers option
            headers: {
              Origin: "http://localhost:5173",
            },
          }
        );

        ws.onmessage = (event) => {
          if (resolved) return;
          const parsed: unknown = JSON.parse(event.data as string);
          if (!isTestMessage(parsed)) return;

          if (parsed.type === "error") {
            resolved = true;
            clearTimeout(timeout);
            resolve(parsed.payload ?? null);
          }
        };

        ws.onclose = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        };
      }
    );

    // The error should have retryable: true since it's a temporary capacity issue
    expect(errorPayload).not.toBeNull();
    expect(errorPayload?.retryable).toBe(true);
    expect(errorPayload?.message).toContain("capacity");
  });

  test("multiple rapid connections respect the limit", async () => {
    // Try to open more connections than the limit simultaneously
    const connectionCount = TEST_MAX_CONNECTIONS + 3;
    const results = await Promise.all(
      Array.from({ length: connectionCount }, (_, i) =>
        attemptConnection(`rapid-adventure-${i}`)
      )
    );

    // Count accepted vs rejected
    const accepted = results.filter((r) => r.accepted).length;
    const rejected = results.filter((r) => !r.accepted).length;

    // Should accept exactly MAX_CONNECTIONS and reject the rest
    expect(accepted).toBe(TEST_MAX_CONNECTIONS);
    expect(rejected).toBe(3);
  });
});
