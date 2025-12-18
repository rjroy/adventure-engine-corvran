// Multi-Adventure Integration Tests
// Tests for character/world selection and auto-creation functionality

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";

const TEST_ADVENTURES_DIR = "./test-multi-adventures";
const TEST_PROJECT_DIR = "./test-multi-project";

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

describe("Multi-Adventure Support", () => {
  let stateManager: InstanceType<typeof AdventureStateManager>;

  beforeEach(async () => {
    // Clean and create test directories
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
    await mkdir(TEST_PROJECT_DIR, { recursive: true });

    stateManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
  });

  describe("GameSession initialization", () => {
    test("initializes PlayerManager and WorldManager", async () => {
      const { ws } = createMockWS();
      const state = await stateManager.create();
      const session = new GameSession(ws, stateManager);

      const result = await session.initialize(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      // Session should work (managers initialized)
      expect(session.getState()).toBeDefined();
    });

    test("auto-creates player directory when playerRef is set but directory missing", async () => {
      const { ws } = createMockWS();
      const state = await stateManager.create();

      // Manually set playerRef in state (simulating a saved adventure)
      await stateManager.updatePlayerRef("players/test-hero");

      const session = new GameSession(ws, stateManager);
      await session.initialize(state.id, state.sessionToken);

      // Directory should have been auto-created
      const playerDir = join(TEST_PROJECT_DIR, "players", "test-hero");
      expect(existsSync(playerDir)).toBe(true);

      // Should have template files
      const files = await readdir(playerDir);
      expect(files).toContain("sheet.md");
      expect(files).toContain("state.md");
    });

    test("auto-creates world directory when worldRef is set but directory missing", async () => {
      const { ws } = createMockWS();
      const state = await stateManager.create();

      // Manually set worldRef in state
      await stateManager.updateWorldRef("worlds/eldoria");

      const session = new GameSession(ws, stateManager);
      await session.initialize(state.id, state.sessionToken);

      // Directory should have been auto-created
      const worldDir = join(TEST_PROJECT_DIR, "worlds", "eldoria");
      expect(existsSync(worldDir)).toBe(true);

      // Should have template files
      const files = await readdir(worldDir);
      expect(files).toContain("world_state.md");
      expect(files).toContain("locations.md");
      expect(files).toContain("characters.md");
      expect(files).toContain("quests.md");
    });

    test("does not create directories when refs are null", async () => {
      const { ws } = createMockWS();
      const state = await stateManager.create();

      const session = new GameSession(ws, stateManager);
      await session.initialize(state.id, state.sessionToken);

      // No players or worlds directories should exist
      expect(existsSync(join(TEST_PROJECT_DIR, "players"))).toBe(false);
      expect(existsSync(join(TEST_PROJECT_DIR, "worlds"))).toBe(false);
    });

    test("does not recreate existing player directory", async () => {
      const { ws } = createMockWS();
      const state = await stateManager.create();

      // Pre-create player directory with custom content
      const playerDir = join(TEST_PROJECT_DIR, "players", "existing-hero");
      await mkdir(playerDir, { recursive: true });
      await writeFile(join(playerDir, "sheet.md"), "# Custom Sheet\nExisting content");
      await writeFile(join(playerDir, "state.md"), "# Custom State");

      // Set ref to existing player
      await stateManager.updatePlayerRef("players/existing-hero");

      const session = new GameSession(ws, stateManager);
      await session.initialize(state.id, state.sessionToken);

      // Original content should be preserved (not overwritten by template)
      const { readFile } = await import("node:fs/promises");
      const sheetContent = await readFile(join(playerDir, "sheet.md"), "utf-8");
      expect(sheetContent).toContain("Existing content");
    });
  });

  describe("State with refs", () => {
    test("new adventure state has null refs", async () => {
      const state = await stateManager.create();

      expect(state.playerRef).toBeNull();
      expect(state.worldRef).toBeNull();
    });

    test("updatePlayerRef persists to state", async () => {
      await stateManager.create();
      await stateManager.updatePlayerRef("players/kael-thouls");

      const updatedState = stateManager.getState();
      expect(updatedState?.playerRef).toBe("players/kael-thouls");
    });

    test("updateWorldRef persists to state", async () => {
      await stateManager.create();
      await stateManager.updateWorldRef("worlds/eldoria");

      const updatedState = stateManager.getState();
      expect(updatedState?.worldRef).toBe("worlds/eldoria");
    });

    test("state loads with refs from saved adventure", async () => {
      // Create adventure and set refs
      const state = await stateManager.create();
      await stateManager.updatePlayerRef("players/saved-hero");
      await stateManager.updateWorldRef("worlds/saved-world");

      // Create new manager and load the same adventure
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const loadResult = await newManager.load(state.id, state.sessionToken);

      expect(loadResult.success).toBe(true);
      const loadedState = newManager.getState();
      expect(loadedState?.playerRef).toBe("players/saved-hero");
      expect(loadedState?.worldRef).toBe("worlds/saved-world");
    });
  });

  describe("Backward compatibility", () => {
    test("legacy adventure without refs loads successfully", async () => {
      // Create adventure
      const state = await stateManager.create();
      const adventureId = state.id;
      const sessionToken = state.sessionToken;

      // Load adventure - should work even without refs
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(adventureId, sessionToken);

      expect(result.success).toBe(true);
      const loadedState = newManager.getState();
      expect(loadedState?.playerRef).toBeNull();
      expect(loadedState?.worldRef).toBeNull();
    });

    test("GameSession works with legacy adventure (null refs)", async () => {
      const { ws, messages } = createMockWS();
      const state = await stateManager.create();

      // Initialize session with legacy state (null refs)
      const session = new GameSession(ws, stateManager);
      const result = await session.initialize(state.id, state.sessionToken);

      expect(result.success).toBe(true);

      // Should be able to handle input
      await session.handleInput("Hello world");

      // Should receive response messages
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.type === "gm_response_start")).toBe(true);
    });
  });
});
