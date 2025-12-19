// Panel Persistence Integration Tests
// End-to-end tests for panel persistence across session restarts

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";

const TEST_ADVENTURES_DIR = "./test-panel-persistence-adventures";
const TEST_PROJECT_DIR = "./test-panel-persistence-project";

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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
describe("Panel Persistence End-to-End", () => {
  beforeEach(async () => {
    // Clean test directories before each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
    await mkdir(TEST_PROJECT_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await rm(TEST_PROJECT_DIR, { recursive: true, force: true });
  });

  test("persistent panel survives session restart", async () => {
    // === Session 1: Create persistent panel ===
    const stateManager1 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager1.create();
    const adventureId = state.id;
    const sessionToken = state.sessionToken;

    const { ws: ws1 } = createMockWS();
    const session1 = new GameSession(ws1, stateManager1);
    await session1.initialize(adventureId, sessionToken);

    const panelManager1 = (session1 as any).panelManager;

    // Create persistent panel
    panelManager1.create({
      id: "weather",
      title: "Weather",
      content: "Clear skies",
      position: "sidebar",
      persistent: true,
    });

    // Manually trigger sync (simulates what MCP callback does)
    await (session1 as any).syncPanelsToState();

    // Save state
    await stateManager1.save();

    // === Session 2: Restart and verify panel persists ===
    const stateManager2 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    await stateManager2.load(adventureId, sessionToken);

    const { ws: ws2, messages: messages2 } = createMockWS();
    const session2 = new GameSession(ws2, stateManager2);
    const result = await session2.initialize(adventureId, sessionToken);

    expect(result.success).toBe(true);

    // Verify panel was restored
    const panelManager2 = (session2 as any).panelManager;
    const panels = panelManager2.list();

    expect(panels.length).toBe(1);
    expect(panels[0].id).toBe("weather");
    expect(panels[0].title).toBe("Weather");
    expect(panels[0].content).toBe("Clear skies");
    expect(panels[0].position).toBe("sidebar");
    expect(panels[0].persistent).toBe(true);

    // Verify panel_create message was emitted for restored panel
    const panelCreateMessages = messages2.filter((m) => m.type === "panel_create");
    expect(panelCreateMessages.length).toBe(1);
    expect(panelCreateMessages[0].payload?.id).toBe("weather");
  });

  test("non-persistent panel does not survive session restart", async () => {
    // === Session 1: Create both persistent and non-persistent panels ===
    const stateManager1 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager1.create();
    const adventureId = state.id;
    const sessionToken = state.sessionToken;

    const { ws: ws1 } = createMockWS();
    const session1 = new GameSession(ws1, stateManager1);
    await session1.initialize(adventureId, sessionToken);

    const panelManager1 = (session1 as any).panelManager;

    // Create persistent panel
    panelManager1.create({
      id: "persistent",
      title: "Persistent",
      content: "Persistent content",
      position: "sidebar",
      persistent: true,
    });

    // Create non-persistent panel
    panelManager1.create({
      id: "non-persistent",
      title: "Non-Persistent",
      content: "Non-persistent content",
      position: "header",
      persistent: false,
    });

    // Manually trigger sync (simulates what MCP callback does)
    await (session1 as any).syncPanelsToState();

    // Save state
    await stateManager1.save();

    // === Session 2: Restart and verify only persistent panel remains ===
    const stateManager2 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    await stateManager2.load(adventureId, sessionToken);

    const { ws: ws2 } = createMockWS();
    const session2 = new GameSession(ws2, stateManager2);
    await session2.initialize(adventureId, sessionToken);

    const panelManager2 = (session2 as any).panelManager;
    const panels = panelManager2.list();

    // Only persistent panel should remain
    expect(panels.length).toBe(1);
    expect(panels[0].id).toBe("persistent");
  });

  test("updated panel content persists across sessions", async () => {
    // === Session 1: Create and update panel ===
    const stateManager1 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager1.create();
    const adventureId = state.id;
    const sessionToken = state.sessionToken;

    const { ws: ws1 } = createMockWS();
    const session1 = new GameSession(ws1, stateManager1);
    await session1.initialize(adventureId, sessionToken);

    const panelManager1 = (session1 as any).panelManager;

    // Create panel
    panelManager1.create({
      id: "ticker",
      title: "News Ticker",
      content: "Initial news",
      position: "header",
      persistent: true,
    });

    await (session1 as any).syncPanelsToState();

    // Update panel
    panelManager1.update({
      id: "ticker",
      content: "Breaking news update!",
    });

    // Manually trigger sync after update
    await (session1 as any).syncPanelsToState();

    await stateManager1.save();

    // === Session 2: Verify updated content persists ===
    const stateManager2 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    await stateManager2.load(adventureId, sessionToken);

    const { ws: ws2 } = createMockWS();
    const session2 = new GameSession(ws2, stateManager2);
    await session2.initialize(adventureId, sessionToken);

    const panelManager2 = (session2 as any).panelManager;
    const panels = panelManager2.list();

    expect(panels.length).toBe(1);
    expect(panels[0].content).toBe("Breaking news update!");
  });

  test("dismissed panel does not persist to next session", async () => {
    // === Session 1: Create and dismiss panel ===
    const stateManager1 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager1.create();
    const adventureId = state.id;
    const sessionToken = state.sessionToken;

    const { ws: ws1 } = createMockWS();
    const session1 = new GameSession(ws1, stateManager1);
    await session1.initialize(adventureId, sessionToken);

    const panelManager1 = (session1 as any).panelManager;

    // Create panel
    panelManager1.create({
      id: "alert",
      title: "Alert",
      content: "Danger ahead!",
      position: "overlay",
      persistent: true,
      x: 50,
      y: 20,
    });

    await (session1 as any).syncPanelsToState();

    // Dismiss panel
    panelManager1.dismiss("alert");

    // Manually trigger sync after dismiss
    await (session1 as any).syncPanelsToState();

    await stateManager1.save();

    // === Session 2: Verify dismissed panel doesn't persist ===
    const stateManager2 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    await stateManager2.load(adventureId, sessionToken);

    const { ws: ws2 } = createMockWS();
    const session2 = new GameSession(ws2, stateManager2);
    await session2.initialize(adventureId, sessionToken);

    const panelManager2 = (session2 as any).panelManager;
    const panels = panelManager2.list();

    expect(panels.length).toBe(0);
  });

  test("multiple persistent panels persist across sessions", async () => {
    // === Session 1: Create multiple persistent panels ===
    const stateManager1 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    const state = await stateManager1.create();
    const adventureId = state.id;
    const sessionToken = state.sessionToken;

    const { ws: ws1 } = createMockWS();
    const session1 = new GameSession(ws1, stateManager1);
    await session1.initialize(adventureId, sessionToken);

    const panelManager1 = (session1 as any).panelManager;

    // Create multiple persistent panels
    panelManager1.create({
      id: "weather",
      title: "Weather",
      content: "Sunny",
      position: "sidebar",
      persistent: true,
    });

    panelManager1.create({
      id: "time",
      title: "Time",
      content: "3:00 PM",
      position: "header",
      persistent: true,
    });

    panelManager1.create({
      id: "quest",
      title: "Active Quest",
      content: "Find the lost artifact",
      position: "sidebar",
      persistent: true,
    });

    // Manually trigger sync (simulates what MCP callback does)
    await (session1 as any).syncPanelsToState();

    await stateManager1.save();

    // === Session 2: Verify all persistent panels restored ===
    const stateManager2 = new AdventureStateManager(TEST_ADVENTURES_DIR);
    await stateManager2.load(adventureId, sessionToken);

    const { ws: ws2, messages: messages2 } = createMockWS();
    const session2 = new GameSession(ws2, stateManager2);
    await session2.initialize(adventureId, sessionToken);

    const panelManager2 = (session2 as any).panelManager;
    const panels = panelManager2.list();

    expect(panels.length).toBe(3);

    const panelIds = panels.map((p: any) => p.id);
    expect(panelIds).toContain("weather");
    expect(panelIds).toContain("time");
    expect(panelIds).toContain("quest");

    // Verify panel_create messages were emitted for all restored panels
    const panelCreateMessages = messages2.filter((m) => m.type === "panel_create");
    expect(panelCreateMessages.length).toBe(3);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
