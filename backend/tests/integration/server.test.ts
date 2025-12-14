// Server Integration Tests
// Tests for REST endpoints and WebSocket lifecycle

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { rm, mkdir } from "node:fs/promises";

const TEST_ADVENTURES_DIR = "./test-adventures-server";

// Set environment variable before importing server
process.env.ADVENTURES_DIR = TEST_ADVENTURES_DIR;

// Import after setting env var
const { app } = await import("../../src/server");
import type { ServerMessage, ClientMessage } from "../../src/types/protocol";

describe("Server REST Endpoints", () => {
  beforeAll(async () => {
    // Clean and create test directory
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up after all tests
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
  });

  describe("GET /api/health", () => {
    test("returns health check message", async () => {
      const res = await app.request("/api/health");
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toBe("Adventure Engine Backend");
    });
  });

  describe("POST /adventure/new", () => {
    test("creates new adventure and returns ID and token", async () => {
      const res = await app.request("/adventure/new", { method: "POST" });
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        adventureId: string;
        sessionToken: string;
      };
      expect(data).toHaveProperty("adventureId");
      expect(data).toHaveProperty("sessionToken");

      // Validate UUID format
      expect(data.adventureId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(data.sessionToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    test("creates multiple unique adventures", async () => {
      const res1 = await app.request("/adventure/new", { method: "POST" });
      const res2 = await app.request("/adventure/new", { method: "POST" });

      const data1 = (await res1.json()) as {
        adventureId: string;
        sessionToken: string;
      };
      const data2 = (await res2.json()) as {
        adventureId: string;
        sessionToken: string;
      };

      expect(data1.adventureId).not.toBe(data2.adventureId);
      expect(data1.sessionToken).not.toBe(data2.sessionToken);
    });
  });

  describe("GET /adventure/:id", () => {
    test("returns adventure metadata for existing adventure", async () => {
      // Create adventure first
      const createRes = await app.request("/adventure/new", { method: "POST" });
      const { adventureId } = (await createRes.json()) as {
        adventureId: string;
        sessionToken: string;
      };

      // Get adventure metadata
      const res = await app.request(`/adventure/${adventureId}`);
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        id: string;
        createdAt: string;
        lastActiveAt: string;
        currentScene: { description: string; location: string };
      };
      expect(data).toHaveProperty("id", adventureId);
      expect(data).toHaveProperty("createdAt");
      expect(data).toHaveProperty("lastActiveAt");
      expect(data).toHaveProperty("currentScene");
      expect(data.currentScene).toHaveProperty("description");
      expect(data.currentScene).toHaveProperty("location");
    });

    test("returns 404 for nonexistent adventure", async () => {
      const res = await app.request("/adventure/nonexistent-id");
      expect(res.status).toBe(404);

      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("not found");
    });

    test("includes initial scene description", async () => {
      const createRes = await app.request("/adventure/new", { method: "POST" });
      const { adventureId } = (await createRes.json()) as {
        adventureId: string;
        sessionToken: string;
      };

      const res = await app.request(`/adventure/${adventureId}`);
      const data = (await res.json()) as {
        currentScene: { description: string; location: string };
      };

      expect(data.currentScene.description).toBe(
        "The adventure is just beginning. The world awaits your imagination."
      );
      expect(data.currentScene.location).toBe("Unknown");
    });
  });

  describe("GET /backgrounds/:mood", () => {
    test("serves calm fallback image", async () => {
      const res = await app.request("/backgrounds/calm.jpg");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/jpeg");
    });

    test("serves tense fallback image", async () => {
      const res = await app.request("/backgrounds/tense.jpg");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/jpeg");
    });

    test("serves ominous fallback image", async () => {
      const res = await app.request("/backgrounds/ominous.jpg");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/jpeg");
    });

    test("serves triumphant fallback image", async () => {
      const res = await app.request("/backgrounds/triumphant.jpg");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/jpeg");
    });

    test("serves mysterious fallback image", async () => {
      const res = await app.request("/backgrounds/mysterious.jpg");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/jpeg");
    });
  });
});

// WebSocket lifecycle is tested via E2E (requires Bun.serve() context)
// These are type/format validation tests only
describe("WebSocket Message Handling", () => {

  test("ping/pong message format", () => {
    const ping: ClientMessage = { type: "ping" };
    const pong: ServerMessage = { type: "pong" };

    expect(ping.type).toBe("ping");
    expect(pong.type).toBe("pong");
  });

  test("player_input message format", () => {
    const msg: ClientMessage = {
      type: "player_input",
      payload: { text: "look around" },
    };

    expect(msg.type).toBe("player_input");
    expect(msg.payload.text).toBe("look around");
  });

  test("error message format", () => {
    const msg: ServerMessage = {
      type: "error",
      payload: {
        code: "INVALID_TOKEN",
        message: "Invalid session token",
        retryable: false,
      },
    };

    expect(msg.type).toBe("error");
    expect(msg.payload.code).toBe("INVALID_TOKEN");
    expect(msg.payload.retryable).toBe(false);
  });

  test("adventure_loaded message format", () => {
    const msg: ServerMessage = {
      type: "adventure_loaded",
      payload: {
        adventureId: "test-id",
        history: [],
      },
    };

    expect(msg.type).toBe("adventure_loaded");
    expect(msg.payload.adventureId).toBe("test-id");
    expect(msg.payload.history).toEqual([]);
  });

  test("gm_response messages format", () => {
    const start: ServerMessage = {
      type: "gm_response_start",
      payload: { messageId: "msg-123" },
    };

    const chunk: ServerMessage = {
      type: "gm_response_chunk",
      payload: { messageId: "msg-123", text: "Hello " },
    };

    const end: ServerMessage = {
      type: "gm_response_end",
      payload: { messageId: "msg-123" },
    };

    expect(start.type).toBe("gm_response_start");
    expect(chunk.payload.text).toBe("Hello ");
    expect(end.type).toBe("gm_response_end");
  });
});
