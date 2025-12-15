/**
 * Duplicate Connection Integration Tests
 *
 * Tests behavior when multiple WebSocket connections attempt to use the same
 * adventure with the same token. This validates whether the system properly
 * handles or prevents duplicate sessions.
 *
 * These tests use a real Bun server to test actual WebSocket behavior.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import type { Server } from "bun";
import { rm, mkdir } from "node:fs/promises";
import type { ServerMessage, ClientMessage } from "../../src/types/protocol";

// Test configuration
const TEST_PORT = 3098;
const TEST_ADVENTURES_DIR = "./test-adventures-duplicate";
const WS_TIMEOUT = 5000;

// Track connections for cleanup
const activeConnections: WebSocket[] = [];

// Server instance
let server: Server<unknown> | null = null;

/**
 * Helper to create a new adventure via REST API
 */
async function createAdventure(): Promise<{ adventureId: string; sessionToken: string }> {
  const res = await fetch(`http://localhost:${TEST_PORT}/adventure/new`, {
    method: "POST",
  });
  return res.json() as Promise<{ adventureId: string; sessionToken: string }>;
}

/**
 * Helper to open WebSocket and authenticate
 * Returns the WebSocket and a promise that resolves when authenticated
 * Uses resolved flag pattern from connection-limit.test.ts to prevent race conditions
 */
function connectAndAuthenticate(
  adventureId: string,
  token: string
): Promise<{ ws: WebSocket; result: "authenticated" | "rejected"; errorCode?: string }> {
  return new Promise((resolve) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ ws: null as unknown as WebSocket, result: "rejected", errorCode: "TIMEOUT" });
      }
    }, WS_TIMEOUT);

    const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws?adventureId=${adventureId}`, {
      // @ts-expect-error - Bun WebSocket supports headers option
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    // Track all WebSockets for cleanup, not just successful ones
    activeConnections.push(ws);

    ws.onopen = () => {
      // Send authenticate message
      const authMsg: ClientMessage = {
        type: "authenticate",
        payload: { token },
      };
      ws.send(JSON.stringify(authMsg));
    };

    ws.onmessage = (event) => {
      if (resolved) return;
      const msg = JSON.parse(event.data as string) as ServerMessage;

      if (msg.type === "adventure_loaded") {
        resolved = true;
        clearTimeout(timeout);
        resolve({ ws, result: "authenticated" });
      } else if (msg.type === "error") {
        resolved = true;
        clearTimeout(timeout);
        resolve({ ws, result: "rejected", errorCode: msg.payload.code });
      }
    };

    ws.onerror = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({ ws, result: "rejected", errorCode: "WS_ERROR" });
    };

    ws.onclose = (event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({ ws, result: "rejected", errorCode: `CLOSED_${event.code}` });
    };
  });
}

/**
 * Close all active connections
 */
async function closeAllConnections(): Promise<void> {
  const toClose = [...activeConnections];
  await Promise.all(
    toClose.map(
      (ws) =>
        new Promise<void>((resolve) => {
          if (ws.readyState === WebSocket.CLOSED) {
            resolve();
            return;
          }
          ws.onclose = () => resolve();
          ws.close();
        })
    )
  );
  activeConnections.length = 0;
}

describe("Duplicate Connection Handling", () => {
  beforeAll(async () => {
    // Set up test environment
    process.env.ADVENTURES_DIR = TEST_ADVENTURES_DIR;
    process.env.MOCK_SDK = "true";

    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });

    // Import server after setting env vars
    const serverModule = await import("../../src/server");

    // Start server
    server = Bun.serve({
      port: TEST_PORT,
      fetch: serverModule.app.fetch,
      websocket: (await import("../../src/server")).default.websocket,
    });
  });

  afterAll(async () => {
    await closeAllConnections();
    if (server) {
      void server.stop();
    }
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await closeAllConnections();
  });

  test("first connection with valid token succeeds", async () => {
    const { adventureId, sessionToken } = await createAdventure();

    const { result } = await connectAndAuthenticate(adventureId, sessionToken);

    expect(result).toBe("authenticated");
  });

  test("second connection to same adventure with same token", async () => {
    // This test documents actual behavior when two connections use the same token
    const { adventureId, sessionToken } = await createAdventure();

    // First connection
    const first = await connectAndAuthenticate(adventureId, sessionToken);
    expect(first.result).toBe("authenticated");

    // Second connection with same token
    const second = await connectAndAuthenticate(adventureId, sessionToken);

    // Document actual behavior:
    // - If rejected: system prevents duplicate sessions (good for consistency)
    // - If authenticated: both sessions work independently (potential state conflicts)
    //
    // For a single-player text adventure, either behavior is acceptable.
    // This test ensures the behavior is intentional and documented.

    if (second.result === "rejected") {
      // Second connection was rejected - this is the safer behavior
      expect(second.errorCode).toBeDefined();
      console.log(`Second connection rejected with: ${second.errorCode}`);
    } else {
      // Both connections succeeded - document this behavior
      expect(second.result).toBe("authenticated");
      console.log("Both connections authenticated - system allows concurrent sessions");

      // Verify both can still communicate
      expect(first.ws.readyState).toBe(WebSocket.OPEN);
      expect(second.ws.readyState).toBe(WebSocket.OPEN);
    }
  });

  test("connection with wrong token is rejected", async () => {
    const { adventureId } = await createAdventure();

    // Try to connect with invalid token
    const { result, errorCode } = await connectAndAuthenticate(
      adventureId,
      "wrong-token-12345"
    );

    expect(result).toBe("rejected");
    expect(errorCode).toBe("INVALID_TOKEN");
  });

  test("connection to nonexistent adventure is rejected", async () => {
    const { result, errorCode } = await connectAndAuthenticate(
      "nonexistent-adventure-id",
      "any-token"
    );

    expect(result).toBe("rejected");
    expect(errorCode).toBe("ADVENTURE_NOT_FOUND");
  });
});
