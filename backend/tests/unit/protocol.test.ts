// Protocol Validation Tests
// Unit tests for Zod schema validation of WebSocket messages

import { describe, test, expect } from "bun:test";
import {
  parseClientMessage,
  parseServerMessage,
  formatValidationError,
  ClientMessageSchema,
  ServerMessageSchema,
} from "../../../shared/protocol";

describe("parseClientMessage()", () => {
  describe("authenticate message", () => {
    test("accepts valid authenticate message", () => {
      const result = parseClientMessage({
        type: "authenticate",
        payload: { token: "abc123" },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.type === "authenticate") {
        expect(result.data.payload.token).toBe("abc123");
      }
    });

    test("rejects authenticate without token", () => {
      const result = parseClientMessage({
        type: "authenticate",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    test("rejects authenticate with non-string token", () => {
      const result = parseClientMessage({
        type: "authenticate",
        payload: { token: 123 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("player_input message", () => {
    test("accepts valid player_input message", () => {
      const result = parseClientMessage({
        type: "player_input",
        payload: { text: "Look around" },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.type === "player_input") {
        expect(result.data.payload.text).toBe("Look around");
      }
    });

    test("rejects player_input without text", () => {
      const result = parseClientMessage({
        type: "player_input",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    test("rejects player_input with non-string text", () => {
      const result = parseClientMessage({
        type: "player_input",
        payload: { text: null },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("start_adventure message", () => {
    test("accepts start_adventure with adventureId", () => {
      const result = parseClientMessage({
        type: "start_adventure",
        payload: { adventureId: "adventure-123" },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.type === "start_adventure") {
        expect(result.data.payload.adventureId).toBe("adventure-123");
      }
    });

    test("accepts start_adventure without adventureId (optional)", () => {
      const result = parseClientMessage({
        type: "start_adventure",
        payload: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ping message", () => {
    test("accepts valid ping message", () => {
      const result = parseClientMessage({ type: "ping" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("ping");
      }
    });
  });

  describe("invalid messages", () => {
    test("rejects unknown message type", () => {
      const result = parseClientMessage({
        type: "unknown_type",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing type field", () => {
      const result = parseClientMessage({
        payload: { token: "abc" },
      });
      expect(result.success).toBe(false);
    });

    test("rejects non-object input", () => {
      const result = parseClientMessage("not an object");
      expect(result.success).toBe(false);
    });

    test("rejects null input", () => {
      const result = parseClientMessage(null);
      expect(result.success).toBe(false);
    });

    test("rejects array input", () => {
      const result = parseClientMessage([{ type: "ping" }]);
      expect(result.success).toBe(false);
    });
  });
});

describe("parseServerMessage()", () => {
  describe("gm_response messages", () => {
    test("accepts gm_response_start", () => {
      const result = parseServerMessage({
        type: "gm_response_start",
        payload: { messageId: "msg-123" },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("gm_response_start");
      }
    });

    test("accepts gm_response_chunk", () => {
      const result = parseServerMessage({
        type: "gm_response_chunk",
        payload: { messageId: "msg-123", text: "Hello" },
      });
      expect(result.success).toBe(true);
    });

    test("accepts gm_response_end", () => {
      const result = parseServerMessage({
        type: "gm_response_end",
        payload: { messageId: "msg-123" },
      });
      expect(result.success).toBe(true);
    });

    test("rejects gm_response_chunk without text", () => {
      const result = parseServerMessage({
        type: "gm_response_chunk",
        payload: { messageId: "msg-123" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("adventure_loaded message", () => {
    test("accepts valid adventure_loaded with empty history", () => {
      const result = parseServerMessage({
        type: "adventure_loaded",
        payload: { adventureId: "adv-123", history: [] },
      });
      expect(result.success).toBe(true);
    });

    test("accepts adventure_loaded with history entries", () => {
      const result = parseServerMessage({
        type: "adventure_loaded",
        payload: {
          adventureId: "adv-123",
          history: [
            {
              id: "entry-1",
              timestamp: "2024-01-01T00:00:00Z",
              type: "player_input",
              content: "Hello",
            },
            {
              id: "entry-2",
              timestamp: "2024-01-01T00:00:01Z",
              type: "gm_response",
              content: "Greetings, traveler!",
            },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    test("rejects adventure_loaded with invalid history entry type", () => {
      const result = parseServerMessage({
        type: "adventure_loaded",
        payload: {
          adventureId: "adv-123",
          history: [
            {
              id: "entry-1",
              timestamp: "2024-01-01T00:00:00Z",
              type: "invalid_type",
              content: "Hello",
            },
          ],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("error message", () => {
    test("accepts valid error message", () => {
      const result = parseServerMessage({
        type: "error",
        payload: {
          code: "GM_ERROR",
          message: "Something went wrong",
          retryable: true,
        },
      });
      expect(result.success).toBe(true);
    });

    test("rejects error with invalid code", () => {
      const result = parseServerMessage({
        type: "error",
        payload: {
          code: "UNKNOWN_ERROR",
          message: "Something went wrong",
          retryable: true,
        },
      });
      expect(result.success).toBe(false);
    });

    test("accepts all valid error codes", () => {
      const validCodes = [
        "INVALID_TOKEN",
        "ADVENTURE_NOT_FOUND",
        "RATE_LIMIT",
        "GM_ERROR",
        "STATE_CORRUPTED",
      ];
      for (const code of validCodes) {
        const result = parseServerMessage({
          type: "error",
          payload: { code, message: "test", retryable: false },
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("pong message", () => {
    test("accepts valid pong message", () => {
      const result = parseServerMessage({ type: "pong" });
      expect(result.success).toBe(true);
    });
  });

  describe("theme_change message", () => {
    test("accepts valid theme_change message", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "calm",
          genre: "high-fantasy",
          region: "forest",
          backgroundUrl: "http://example.com/bg.jpg",
        },
      });
      expect(result.success).toBe(true);
    });

    test("accepts theme_change with null backgroundUrl", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "mysterious",
          genre: "sci-fi",
          region: "city",
          backgroundUrl: null,
        },
      });
      expect(result.success).toBe(true);
    });

    test("accepts theme_change with transitionDuration", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "tense",
          genre: "horror",
          region: "underground",
          backgroundUrl: null,
          transitionDuration: 2000,
        },
      });
      expect(result.success).toBe(true);
    });

    test("rejects theme_change with invalid mood", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "happy",
          genre: "high-fantasy",
          region: "forest",
          backgroundUrl: null,
        },
      });
      expect(result.success).toBe(false);
    });

    test("rejects theme_change with invalid genre", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "calm",
          genre: "western",
          region: "forest",
          backgroundUrl: null,
        },
      });
      expect(result.success).toBe(false);
    });

    test("rejects theme_change with invalid region", () => {
      const result = parseServerMessage({
        type: "theme_change",
        payload: {
          mood: "calm",
          genre: "high-fantasy",
          region: "space",
          backgroundUrl: null,
        },
      });
      expect(result.success).toBe(false);
    });

    test("accepts all valid moods", () => {
      const validMoods = ["calm", "tense", "ominous", "triumphant", "mysterious"];
      for (const mood of validMoods) {
        const result = parseServerMessage({
          type: "theme_change",
          payload: {
            mood,
            genre: "high-fantasy",
            region: "forest",
            backgroundUrl: null,
          },
        });
        expect(result.success).toBe(true);
      }
    });

    test("accepts all valid genres", () => {
      const validGenres = [
        "sci-fi",
        "steampunk",
        "low-fantasy",
        "high-fantasy",
        "horror",
        "modern",
        "historical",
      ];
      for (const genre of validGenres) {
        const result = parseServerMessage({
          type: "theme_change",
          payload: {
            mood: "calm",
            genre,
            region: "forest",
            backgroundUrl: null,
          },
        });
        expect(result.success).toBe(true);
      }
    });

    test("accepts all valid regions", () => {
      const validRegions = [
        "city",
        "village",
        "forest",
        "desert",
        "mountain",
        "ocean",
        "underground",
        "castle",
        "ruins",
      ];
      for (const region of validRegions) {
        const result = parseServerMessage({
          type: "theme_change",
          payload: {
            mood: "calm",
            genre: "high-fantasy",
            region,
            backgroundUrl: null,
          },
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("invalid messages", () => {
    test("rejects unknown message type", () => {
      const result = parseServerMessage({
        type: "unknown",
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing type", () => {
      const result = parseServerMessage({
        payload: { messageId: "123" },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("formatValidationError()", () => {
  test("formats single error", () => {
    const result = ClientMessageSchema.safeParse({
      type: "authenticate",
      payload: {},
    });
    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(formatted).toContain("payload.token");
    }
  });

  test("formats multiple errors", () => {
    const result = ServerMessageSchema.safeParse({
      type: "error",
      payload: {},
    });
    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(formatted).toContain("payload.code");
      expect(formatted).toContain("payload.message");
      expect(formatted).toContain("payload.retryable");
    }
  });

  test("formats nested path errors", () => {
    const result = ServerMessageSchema.safeParse({
      type: "adventure_loaded",
      payload: {
        adventureId: "test",
        history: [{ id: "1", timestamp: "now", type: "invalid", content: "hi" }],
      },
    });
    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(formatted).toContain("history");
    }
  });
});
