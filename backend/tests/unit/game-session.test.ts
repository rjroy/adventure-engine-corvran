// Game Session Tests
// Unit tests for input queuing, message protocol, and state updates

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";

const TEST_ADVENTURES_DIR = "./test-game-sessions";
const TEST_PROJECT_DIR = "./test-project";

// Set environment variables before importing modules that use them
process.env.ADVENTURES_DIR = TEST_ADVENTURES_DIR;
process.env.PROJECT_DIR = TEST_PROJECT_DIR;
process.env.MOCK_SDK = "true";

// Import after setting env var - use type imports for proper typing
import type { GameSession as GameSessionType } from "../../src/game-session";
import type { AdventureStateManager as AdventureStateManagerType } from "../../src/adventure-state";

const { GameSession } = (await import("../../src/game-session")) as {
  GameSession: typeof GameSessionType;
};
const { AdventureStateManager } = (await import("../../src/adventure-state")) as {
  AdventureStateManager: typeof AdventureStateManagerType;
};

// Mock WebSocket context for testing
function createMockWS(): {
  ws: WSContext;
  messages: ServerMessage[];
} {
  const messages: ServerMessage[] = [];

  const ws = {
    send: mock((data: string) => {
      const message = JSON.parse(data) as ServerMessage;
      messages.push(message);
    }),
    close: mock(() => {}),
    // Add minimal WSContext properties
    readyState: 1, // OPEN
  } as unknown as WSContext;

  return { ws, messages };
}

describe("GameSession", () => {
  let stateManager: InstanceType<typeof AdventureStateManager>;
  let adventureId: string;
  let sessionToken: string;

  beforeEach(async () => {
    // Clean test directories before each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
    await mkdir(TEST_PROJECT_DIR, { recursive: true });

    // Create a test adventure
    stateManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager.create();
    adventureId = state.id;
    sessionToken = state.sessionToken;
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
  });

  describe("initialize()", () => {
    test("successfully initializes with valid credentials", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);

      const result = await session.initialize(adventureId, sessionToken);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(session.getState()).not.toBeNull();
    });

    test("fails with invalid session token", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);

      const result = await session.initialize(adventureId, "invalid-token");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Invalid session token");
    });

    test("fails with non-existent adventure ID", async () => {
      const { ws } = createMockWS();
      const fakeId = "non-existent-adventure";
      const session = new GameSession(ws, stateManager);

      const result = await session.initialize(fakeId, sessionToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("not found");
    });

    test("fails when PROJECT_DIR is not set", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);

      // Temporarily unset PROJECT_DIR
      const originalProjectDir = process.env.PROJECT_DIR;
      delete process.env.PROJECT_DIR;

      try {
        const result = await session.initialize(adventureId, sessionToken);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("PROJECT_DIR");
        expect(result.error).toContain("not set");
      } finally {
        // Restore PROJECT_DIR
        process.env.PROJECT_DIR = originalProjectDir;
      }
    });

    test("fails when PROJECT_DIR directory does not exist", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);

      // Temporarily set PROJECT_DIR to non-existent directory
      const originalProjectDir = process.env.PROJECT_DIR;
      process.env.PROJECT_DIR = "./non-existent-directory-12345";

      try {
        const result = await session.initialize(adventureId, sessionToken);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("PROJECT_DIR");
        expect(result.error).toContain("does not exist");
      } finally {
        // Restore PROJECT_DIR
        process.env.PROJECT_DIR = originalProjectDir;
      }
    });

    // Note: System definition loading was removed.
    // The GM now reads System.md directly via file operations during gameplay.
  });

  describe("handleInput() - Queue Management", () => {
    test("processes single input correctly", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Look around");

      // Should have: start, multiple chunks, end, tool_status (idle)
      expect(messages.length).toBeGreaterThan(2);

      const startMsg = messages[0];
      expect(startMsg.type).toBe("gm_response_start");

      // Find gm_response_end (may be followed by tool_status)
      const endMsg = messages.find((m) => m.type === "gm_response_end");
      expect(endMsg).toBeDefined();
      expect(endMsg!.type).toBe("gm_response_end");

      // Verify tool_status (idle) is sent last
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.type).toBe("tool_status");
      if (lastMsg.type === "tool_status") {
        expect(lastMsg.payload.state).toBe("idle");
      }

      // Check that messageId is consistent
      if (startMsg.type === "gm_response_start" && endMsg && endMsg.type === "gm_response_end") {
        const messageId = startMsg.payload.messageId;
        expect(endMsg.payload.messageId).toBe(messageId);
      }
    });

    test("queues multiple rapid inputs", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Send multiple inputs rapidly without awaiting
      const promises = [
        session.handleInput("First input"),
        session.handleInput("Second input"),
        session.handleInput("Third input"),
      ];

      // Queue should grow temporarily
      expect(session.getQueueLength()).toBeGreaterThanOrEqual(0);

      // Wait for all to complete
      await Promise.all(promises);

      // Queue should be empty after processing
      expect(session.getQueueLength()).toBe(0);
      expect(session.getIsProcessing()).toBe(false);
    });

    test("processes queued inputs sequentially", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Send inputs rapidly
      await Promise.all([
        session.handleInput("Input 1"),
        session.handleInput("Input 2"),
        session.handleInput("Input 3"),
      ]);

      // Count response cycles (start/end pairs)
      const startMessages = messages.filter((m) => m.type === "gm_response_start");
      const endMessages = messages.filter((m) => m.type === "gm_response_end");

      expect(startMessages.length).toBe(3);
      expect(endMessages.length).toBe(3);
    });

    test("does not drop inputs during concurrent processing", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const inputs = Array.from({ length: 10 }, (_, i) => `Input ${i + 1}`);

      // Send all inputs concurrently
      await Promise.all(inputs.map((input) => session.handleInput(input)));

      // Check history has all 10 player inputs and 10 GM responses
      const history = session.getHistory();
      expect(history.entries.length).toBe(20); // 10 player + 10 GM

      const playerInputs = history.entries.filter((e) => e.type === "player_input");
      expect(playerInputs.length).toBe(10);

      const gmResponses = history.entries.filter((e) => e.type === "gm_response");
      expect(gmResponses.length).toBe(10);
    });
  });

  describe("Message Protocol", () => {
    test("sends gm_response_start with messageId", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Test input");

      const startMsg = messages[0];
      expect(startMsg.type).toBe("gm_response_start");
      expect(startMsg.type === "gm_response_start" && startMsg.payload.messageId).toBeDefined();
    });

    test("sends gm_response_chunk messages during streaming", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Test input");

      const chunkMessages = messages.filter((m) => m.type === "gm_response_chunk");
      expect(chunkMessages.length).toBeGreaterThan(0);

      // Check that each chunk has messageId and text
      for (const msg of chunkMessages) {
        expect(msg.type === "gm_response_chunk" && msg.payload.messageId).toBeDefined();
        expect(msg.type === "gm_response_chunk" && msg.payload.text).toBeDefined();
        expect(msg.type === "gm_response_chunk" && msg.payload.text.length).toBeGreaterThan(0);
      }
    });

    test("sends gm_response_end with same messageId", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Test input");

      const startMsg = messages[0];
      // Find gm_response_end (may be followed by tool_status)
      const endMsg = messages.find((m) => m.type === "gm_response_end");

      expect(startMsg.type).toBe("gm_response_start");
      expect(endMsg).toBeDefined();
      expect(endMsg!.type).toBe("gm_response_end");

      if (startMsg.type === "gm_response_start" && endMsg && endMsg.type === "gm_response_end") {
        expect(startMsg.payload.messageId).toBe(endMsg.payload.messageId);
      }
    });

    test("chunks reconstruct full response", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const inputText = "Describe the room";
      await session.handleInput(inputText);

      // Extract chunks and reconstruct
      const chunkMessages = messages.filter((m) => m.type === "gm_response_chunk");
      const reconstructed = chunkMessages
        .map((m) => (m.type === "gm_response_chunk" ? m.payload.text : ""))
        .join("");

      // Should contain the input acknowledgment
      expect(reconstructed).toContain(inputText);
      expect(reconstructed.length).toBeGreaterThan(0);

      // Check that history matches
      const history = session.getHistory();
      const gmResponse = history.entries.find((e) => e.type === "gm_response");
      expect(gmResponse?.content).toBe(reconstructed);
    });
  });

  describe("State Updates", () => {
    test("appends player input to history", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const inputText = "Search the chest";
      await session.handleInput(inputText);

      const history = session.getHistory();
      const playerEntry = history.entries.find((e) => e.type === "player_input");

      expect(playerEntry).toBeDefined();
      expect(playerEntry?.content).toBe(inputText);
      expect(playerEntry?.timestamp).toBeDefined();
    });

    test("appends GM response to history", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Test input");

      const history = session.getHistory();
      const gmEntry = history.entries.find((e) => e.type === "gm_response");

      expect(gmEntry).toBeDefined();
      expect(gmEntry?.content).toBeDefined();
      expect(gmEntry?.timestamp).toBeDefined();
    });

    test("updates scene description after response", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const initialScene = session.getState()?.currentScene.description;
      await session.handleInput("Look around");

      const updatedScene = session.getState()?.currentScene.description;

      expect(updatedScene).not.toBe(initialScene);
      expect(updatedScene).toBeDefined();
    });

    test("maintains history order across multiple inputs", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("First");
      await session.handleInput("Second");
      await session.handleInput("Third");

      const history = session.getHistory();

      // Should have 6 entries (3 player + 3 GM)
      expect(history.entries.length).toBe(6);

      // Check alternating pattern: player, GM, player, GM, player, GM
      expect(history.entries[0].type).toBe("player_input");
      expect(history.entries[1].type).toBe("gm_response");
      expect(history.entries[2].type).toBe("player_input");
      expect(history.entries[3].type).toBe("gm_response");
      expect(history.entries[4].type).toBe("player_input");
      expect(history.entries[5].type).toBe("gm_response");

      // Check content order
      expect(history.entries[0].content).toBe("First");
      expect(history.entries[2].content).toBe("Second");
      expect(history.entries[4].content).toBe("Third");
    });
  });

  describe("Error Handling", () => {
    test("sends error message on processing failure", async () => {
      const { ws, messages } = createMockWS();

      // Create session with invalid adventure to force an error
      const session = new GameSession(ws, stateManager);

      // Try to handle input without initializing
      await session.handleInput("This should fail");

      // Should have an error message
      const errorMessages = messages.filter((m) => m.type === "error");
      expect(errorMessages.length).toBeGreaterThan(0);

      const errorMsg = errorMessages[0];
      expect(errorMsg.type === "error" && errorMsg.payload.code).toBe("GM_ERROR");
      expect(errorMsg.type === "error" && errorMsg.payload.retryable).toBe(true);
    });
  });

  describe("Mock Response Generation", () => {
    test("generates response containing input", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const inputText = "Examine the ancient tome";
      await session.handleInput(inputText);

      const history = session.getHistory();
      const gmResponse = history.entries.find((e) => e.type === "gm_response");

      expect(gmResponse?.content).toContain(inputText);
      expect(gmResponse?.content).toContain("The GM acknowledges");
    });

    test("streams response in chunks", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Test");

      const chunkMessages = messages.filter((m) => m.type === "gm_response_chunk");

      // Should have multiple chunks (not just one)
      expect(chunkMessages.length).toBeGreaterThan(1);

      // Each chunk should have text content
      for (const msg of chunkMessages) {
        expect(msg.type === "gm_response_chunk" && msg.payload.text).toBeDefined();
        expect(msg.type === "gm_response_chunk" && msg.payload.text.length).toBeGreaterThan(0);
      }
    });
  });

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
  describe("Theme Management", () => {
    test("derives genre from currentTheme", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const state = session.getState();
      // Access private method via reflection for testing
      const genre = (session as any).deriveGenre(state);
      expect(genre).toBe("high-fantasy"); // Default from creation
    });

    test("derives region from currentTheme", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const state = session.getState();
      const region = (session as any).deriveRegion(state);
      expect(region).toBe("village"); // Default from creation
    });

    test("debounces duplicate mood changes within 1 second", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Manually call handleSetThemeTool multiple times with same mood
      await (session as any).handleSetThemeTool({ mood: "calm", genre: "high-fantasy", region: "village" });
      await (session as any).handleSetThemeTool({ mood: "calm", genre: "high-fantasy", region: "village" });
      await (session as any).handleSetThemeTool({ mood: "calm", genre: "high-fantasy", region: "village" });

      // Should only have one theme_change message due to debouncing
      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);
    });

    test("allows different moods without debouncing", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Call with different moods
      await (session as any).handleSetThemeTool({ mood: "calm", genre: "high-fantasy", region: "village" });
      await (session as any).handleSetThemeTool({ mood: "tense", genre: "high-fantasy", region: "forest" });
      await (session as any).handleSetThemeTool({ mood: "ominous", genre: "high-fantasy", region: "underground" });

      // Should have three theme_change messages
      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(3);
    });

    test("emits theme_change with correct payload structure", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Call handleSetThemeTool with required mood, genre, region
      await (session as any).handleSetThemeTool({
        mood: "mysterious",
        genre: "high-fantasy",
        region: "ruins",
      });

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      expect(themeMsg.type).toBe("theme_change");

      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("mysterious");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("ruins");
        // backgroundUrl can be null if BackgroundImageService not provided
        expect(themeMsg.payload.backgroundUrl).toBeDefined();
      }
    });

    test("handles missing BackgroundImageService gracefully", async () => {
      const { ws, messages } = createMockWS();
      // Create session without BackgroundImageService
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Call handleSetThemeTool with required mood, genre, region
      await (session as any).handleSetThemeTool({
        mood: "triumphant",
        genre: "high-fantasy",
        region: "castle",
      });

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        // Should emit message with null backgroundUrl
        expect(themeMsg.payload.backgroundUrl).toBeNull();
      }
    });

    test("passes force_generate flag to BackgroundImageService", async () => {
      const { ws } = createMockWS();

      // Create mock BackgroundImageService
      const mockBgService = {
        getBackgroundImage: mock(async () => ({
          url: "http://example.com/bg.jpg",
          source: "generated" as const,
        })),
      };

      const session = new GameSession(ws, stateManager, mockBgService as any);
      await session.initialize(adventureId, sessionToken);

      // Call with force_generate = true and required mood, genre, region
      await (session as any).handleSetThemeTool({
        mood: "calm",
        genre: "high-fantasy",
        region: "village",
        force_generate: true,
      });

      // Verify BackgroundImageService was called with correct parameters
      expect(mockBgService.getBackgroundImage).toHaveBeenCalledTimes(1);
      const call = mockBgService.getBackgroundImage.mock.calls[0] as unknown[];
      expect(call[0]).toBe("calm"); // mood
      expect(call[1]).toBe("high-fantasy"); // genre
      expect(call[2]).toBe("village"); // region
      expect(call[3]).toBe(true); // force_generate
    });

    test("passes image_prompt to BackgroundImageService", async () => {
      const { ws } = createMockWS();

      const mockBgService = {
        getBackgroundImage: mock(async () => ({
          url: "http://example.com/bg.jpg",
          source: "generated" as const,
        })),
      };

      const session = new GameSession(ws, stateManager, mockBgService as any);
      await session.initialize(adventureId, sessionToken);

      await (session as any).handleSetThemeTool({
        mood: "ominous",
        genre: "horror",
        region: "underground",
        image_prompt: "A dark cavern with glowing crystals",
      });

      expect(mockBgService.getBackgroundImage).toHaveBeenCalledTimes(1);
      const call = mockBgService.getBackgroundImage.mock.calls[0] as unknown[];
      expect(call[4]).toBe("A dark cavern with glowing crystals"); // image_prompt
    });

    test("continues gracefully when BackgroundImageService throws", async () => {
      const { ws, messages } = createMockWS();

      const mockBgService = {
        getBackgroundImage: mock(async () => {
          throw new Error("Replicate API error");
        }),
      };

      const session = new GameSession(ws, stateManager, mockBgService as any);
      await session.initialize(adventureId, sessionToken);

      // Should not throw - errors are caught internally
      await (session as any).handleSetThemeTool({
        mood: "tense",
        genre: "high-fantasy",
        region: "forest",
      });

      // Should still emit theme_change with null backgroundUrl
      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("tense");
        expect(themeMsg.payload.backgroundUrl).toBeNull();
      }
    });

    test("calls stateManager.updateTheme with correct arguments", async () => {
      const { ws } = createMockWS();

      const mockBgService = {
        getBackgroundImage: mock(async () => ({
          url: "http://example.com/forest.jpg",
          source: "catalog" as const,
        })),
      };

      // Create a spy on stateManager.updateTheme
      const originalUpdateTheme = stateManager.updateTheme.bind(stateManager);
      const updateThemeSpy = mock(async (...args: Parameters<typeof originalUpdateTheme>) => {
        return originalUpdateTheme(...args);
      });
      stateManager.updateTheme = updateThemeSpy as typeof stateManager.updateTheme;

      const session = new GameSession(ws, stateManager, mockBgService as any);
      await session.initialize(adventureId, sessionToken);

      await (session as any).handleSetThemeTool({
        mood: "mysterious",
        genre: "low-fantasy",
        region: "ruins",
      });

      expect(updateThemeSpy).toHaveBeenCalledTimes(1);
      const call = updateThemeSpy.mock.calls[0] as unknown[];
      expect(call[0]).toBe("mysterious"); // mood
      expect(call[1]).toBe("low-fantasy"); // genre
      expect(call[2]).toBe("ruins"); // region
      expect(call[3]).toBe("http://example.com/forest.jpg"); // backgroundUrl
    });
  });

  describe("handleSetXpStyleTool", () => {
    test("persists xpStyle to state manager", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await (session as any).handleSetXpStyleTool("frequent");

      const state = session.getState();
      expect(state?.xpStyle).toBe("frequent");
    });

    test("updates xpStyle for all valid styles", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Test each style
      await (session as any).handleSetXpStyleTool("frequent");
      expect(session.getState()?.xpStyle).toBe("frequent");

      await (session as any).handleSetXpStyleTool("milestone");
      expect(session.getState()?.xpStyle).toBe("milestone");

      await (session as any).handleSetXpStyleTool("combat-plus");
      expect(session.getState()?.xpStyle).toBe("combat-plus");
    });

    test("calls stateManager.updateXpStyle", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      const originalUpdateXpStyle = stateManager.updateXpStyle.bind(stateManager);
      const updateXpStyleSpy = mock(async (...args: Parameters<typeof originalUpdateXpStyle>) => {
        return originalUpdateXpStyle(...args);
      });
      stateManager.updateXpStyle = updateXpStyleSpy as typeof stateManager.updateXpStyle;

      await (session as any).handleSetXpStyleTool("milestone");

      expect(updateXpStyleSpy).toHaveBeenCalledTimes(1);
      const call = updateXpStyleSpy.mock.calls[0] as unknown[];
      expect(call[0]).toBe("milestone");
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
});
