// Roll Dice MCP Tool Integration Tests
// Tests for roll_dice tool via Mock SDK

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "../../src/types/protocol";

const TEST_ADVENTURES_DIR = "./test-dice-adventures";
const TEST_PROJECT_DIR = "./test-dice-project";

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

describe("Roll Dice MCP Tool", () => {
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

  describe("Dice Roll Triggers", () => {
    test("input with 'attack' triggers dice roll", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I attack the goblin");

      // Verify dice log was updated
      const state = session.getState();
      expect(state?.diceLog).toBeDefined();
      expect(state!.diceLog!.length).toBeGreaterThan(0);

      const lastRoll = state!.diceLog![state!.diceLog!.length - 1];
      expect(lastRoll.expression).toBe("1d20+3");
      expect(lastRoll.context).toBe("Attack roll");
      expect(lastRoll.visible).toBe(true);
      expect(lastRoll.requestedBy).toBe("gm");
      expect(lastRoll.individualRolls.length).toBe(1);
      expect(lastRoll.total).toBeGreaterThanOrEqual(4); // 1d20+3 minimum is 4
      expect(lastRoll.total).toBeLessThanOrEqual(23); // 1d20+3 maximum is 23
    });

    test("input with 'roll' triggers generic skill check", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I roll to investigate");

      const state = session.getState();
      const lastRoll = state!.diceLog![state!.diceLog!.length - 1];
      expect(lastRoll.expression).toBe("1d20");
      expect(lastRoll.context).toBe("Skill check");
    });

    test("input with 'stealth' triggers stealth check", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I try to sneak past the guard");

      const state = session.getState();
      const lastRoll = state!.diceLog![state!.diceLog!.length - 1];
      expect(lastRoll.expression).toBe("1d20+5");
      expect(lastRoll.context).toBe("Stealth check");
    });

    test("input with 'initiative' triggers initiative roll", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Roll initiative");

      const state = session.getState();
      const lastRoll = state!.diceLog![state!.diceLog!.length - 1];
      expect(lastRoll.expression).toBe("1d20+2");
      expect(lastRoll.context).toBe("Initiative roll");
    });

    test("input with 'damage' triggers damage roll", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("Roll damage");

      const state = session.getState();
      const lastRoll = state!.diceLog![state!.diceLog!.length - 1];
      expect(lastRoll.expression).toBe("2d6+2");
      expect(lastRoll.context).toBe("Damage roll");
      expect(lastRoll.individualRolls.length).toBe(2);
    });

    test("input without dice trigger does not create log entry", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I look around the room");

      const state = session.getState();
      expect(state?.diceLog?.length ?? 0).toBe(0);
    });
  });

  describe("Dice Log Integrity", () => {
    test("each roll has unique UUID", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I attack");
      await session.handleInput("I attack again");

      const state = session.getState();
      const ids = state!.diceLog!.map((roll) => roll.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test("rolls have ISO timestamp", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I attack");

      const state = session.getState();
      const lastRoll = state!.diceLog![0];
      expect(lastRoll.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test("multiple rolls accumulate in dice log", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I attack");
      await session.handleInput("I roll for stealth");
      await session.handleInput("Roll initiative");

      const state = session.getState();
      expect(state!.diceLog!.length).toBe(3);
      expect(state!.diceLog![0].context).toBe("Attack roll");
      expect(state!.diceLog![1].context).toBe("Stealth check");
      expect(state!.diceLog![2].context).toBe("Initiative roll");
    });
  });

  describe("Roll Result Validation", () => {
    test("1d20 result is in valid range", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Run multiple times to test randomness
      for (let i = 0; i < 10; i++) {
        await session.handleInput("I roll a check");
      }

      const state = session.getState();
      for (const roll of state!.diceLog!) {
        expect(roll.total).toBeGreaterThanOrEqual(1);
        expect(roll.total).toBeLessThanOrEqual(20);
        expect(roll.individualRolls[0]).toBeGreaterThanOrEqual(1);
        expect(roll.individualRolls[0]).toBeLessThanOrEqual(20);
      }
    });

    test("2d6+2 result is in valid range", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      for (let i = 0; i < 10; i++) {
        await session.handleInput("Roll damage");
      }

      const state = session.getState();
      for (const roll of state!.diceLog!) {
        expect(roll.total).toBeGreaterThanOrEqual(4); // 2*1 + 2
        expect(roll.total).toBeLessThanOrEqual(14); // 2*6 + 2
        expect(roll.individualRolls.length).toBe(2);
        for (const die of roll.individualRolls) {
          expect(die).toBeGreaterThanOrEqual(1);
          expect(die).toBeLessThanOrEqual(6);
        }
      }
    });

    test("total equals sum of rolls plus modifier", async () => {
      const { ws } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      await session.handleInput("I attack");

      const state = session.getState();
      const roll = state!.diceLog![0];

      // 1d20+3, so total should be individualRolls[0] + 3
      const expectedTotal = roll.individualRolls.reduce((sum, r) => sum + r, 0) + 3;
      expect(roll.total).toBe(expectedTotal);
    });
  });

  describe("State Persistence", () => {
    test("dice log persists across session reloads", async () => {
      const { ws: ws1 } = createMockWS();
      const session1 = new GameSession(ws1, stateManager);
      await session1.initialize(adventureId, sessionToken);

      await session1.handleInput("I attack");
      const state1 = session1.getState();
      const originalRoll = state1!.diceLog![0];

      // Create new session for same adventure
      const { ws: ws2 } = createMockWS();
      const session2 = new GameSession(ws2, stateManager);
      await session2.initialize(adventureId, sessionToken);

      const state2 = session2.getState();
      expect(state2!.diceLog!.length).toBe(1);
      expect(state2!.diceLog![0].id).toBe(originalRoll.id);
      expect(state2!.diceLog![0].expression).toBe(originalRoll.expression);
      expect(state2!.diceLog![0].total).toBe(originalRoll.total);
    });
  });

  describe("Combined Tool Usage", () => {
    test("both theme and dice tools can trigger in same input", async () => {
      const { ws, messages } = createMockWS();
      const session = new GameSession(ws, stateManager);
      await session.initialize(adventureId, sessionToken);

      // Input that should trigger both theme change (battle→tense) and dice roll
      await session.handleInput("I attack the enemy in battle");

      const state = session.getState();

      // Verify theme change
      expect(state?.currentTheme?.mood).toBe("tense");

      // Verify dice roll
      expect(state!.diceLog!.length).toBe(1);
      expect(state!.diceLog![0].context).toBe("Attack roll");

      // Verify theme_change message was sent
      const themeMessages = messages.filter((m) => m.type === "theme_change");
      expect(themeMessages.length).toBe(1);
    });
  });
});
