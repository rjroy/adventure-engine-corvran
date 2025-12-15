// MCP Tool Use Integration Tests
// Tests for mock SDK tool_use callback triggering theme changes

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";

const TEST_ADVENTURES_DIR = "./test-mcp-adventures";
const TEST_PROJECT_DIR = "./test-mcp-project";

// Set environment variables before importing modules that use them
process.env.ADVENTURES_DIR = TEST_ADVENTURES_DIR;
process.env.PROJECT_DIR = TEST_PROJECT_DIR;
process.env.MOCK_SDK = "true";

// Import after setting env var
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
    readyState: 1, // OPEN
  } as unknown as WSContext;

  return { ws, messages };
}

describe("MCP Tool Use via Mock SDK", () => {
  let stateManager: InstanceType<typeof AdventureStateManager>;
  let adventureId: string;
  let sessionToken: string;

  beforeEach(async () => {
    // Clean and create test directories
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

  describe("Theme Tool Triggers", () => {
    test("input with 'dark forest' triggers ominous theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // This input contains "dark forest" which should trigger set_theme
      await session.handleInput("I enter the dark forest");

      // Find theme_change messages
      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("ominous");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("forest");
      }
    });

    test("input with 'tavern' triggers calm theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I rest at the tavern");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("calm");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("village");
      }
    });

    test("input with 'battle' triggers tense theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I prepare for battle");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("tense");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("forest");
      }
    });

    test("input with 'ancient ruins' triggers mysterious theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I explore the ancient ruins");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("mysterious");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("ruins");
      }
    });

    test("input with 'victory' triggers triumphant theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("We celebrate our victory");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.mood).toBe("triumphant");
        expect(themeMsg.payload.genre).toBe("high-fantasy");
        expect(themeMsg.payload.region).toBe("castle");
      }
    });

    test("input without theme triggers does not emit theme_change", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Generic input that doesn't match any theme triggers
      await session.handleInput("I look around");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(0);
    });

    test("theme_change includes null backgroundUrl when no BackgroundImageService", async () => {
      const { ws, messages } = createMockWS();
      // Session created without BackgroundImageService
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I enter the dark forest");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.backgroundUrl).toBeNull();
      }
    });

    test("theme_change includes backgroundUrl when BackgroundImageService provided", async () => {
      const { ws, messages } = createMockWS();

      // Mock BackgroundImageService
      const mockBgService = {
        getBackgroundImage: mock(() =>
          Promise.resolve({
            url: "http://localhost:3000/backgrounds/ominous-forest.jpg",
            source: "catalog" as const,
          })
        ),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      const session = new GameSession(ws, stateManager, mockBgService as any);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I enter the dark forest");

      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);

      const themeMsg = themeMessages[0];
      if (themeMsg.type === "theme_change") {
        expect(themeMsg.payload.backgroundUrl).toBe(
          "http://localhost:3000/backgrounds/ominous-forest.jpg"
        );
      }

      // Verify BackgroundImageService was called
      expect(mockBgService.getBackgroundImage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Full Message Flow", () => {
    test("theme_change appears before gm_response_end", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I enter the dark forest");

      // Find indices
      const themeIndex = messages.findIndex((m) => m.type === "theme_change");
      const endIndex = messages.findIndex((m) => m.type === "gm_response_end");

      expect(themeIndex).toBeGreaterThan(-1);
      expect(endIndex).toBeGreaterThan(-1);
      // Theme change should come before response end
      expect(themeIndex).toBeLessThan(endIndex);
    });

    test("response still streams correctly with theme trigger", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I enter the dark forest");

      // Should have: start, chunks, theme_change, end
      const startMsg = messages.find((m) => m.type === "gm_response_start");
      const chunkMsgs = messages.filter((m) => m.type === "gm_response_chunk");
      const endMsg = messages.find((m) => m.type === "gm_response_end");

      expect(startMsg).toBeDefined();
      expect(chunkMsgs.length).toBeGreaterThan(0);
      expect(endMsg).toBeDefined();

      // Verify message ID consistency
      if (startMsg?.type === "gm_response_start" && endMsg?.type === "gm_response_end") {
        expect(startMsg.payload.messageId).toBe(endMsg.payload.messageId);
      }
    });

    test("state is updated with theme after input", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I enter the dark forest");

      // State should reflect the theme update (stored at currentTheme)
      const state = session.getState();
      expect(state?.currentTheme?.mood).toBe("ominous");
      expect(state?.currentTheme?.genre).toBe("high-fantasy");
      expect(state?.currentTheme?.region).toBe("forest");
    });
  });
});
