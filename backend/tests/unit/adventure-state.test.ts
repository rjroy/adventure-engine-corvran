// Adventure State Manager Tests
// Unit tests for state persistence, loading, and corruption detection

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AdventureStateManager } from "../../src/adventure-state";
import type { NarrativeEntry, Panel } from "../../../shared/protocol";
import type { AdventureState, NarrativeHistory } from "../../src/types/state";

const TEST_ADVENTURES_DIR = "./test-adventures";

describe("AdventureStateManager", () => {
  let manager: AdventureStateManager;

  beforeEach(async () => {
    // Clean test directory before each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
    await mkdir(TEST_ADVENTURES_DIR, { recursive: true });
    manager = new AdventureStateManager(TEST_ADVENTURES_DIR);
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_ADVENTURES_DIR, { recursive: true, force: true });
  });

  describe("create()", () => {
    test("creates new adventure with UUID and token", async () => {
      const state = await manager.create();

      expect(state.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(state.sessionToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(state.agentSessionId).toBeNull();
      expect(state.createdAt).toBeDefined();
      expect(state.lastActiveAt).toBeDefined();
    });

    test("creates adventure with custom ID", async () => {
      const customId = "test-adventure-123";
      const state = await manager.create(customId);

      expect(state.id).toBe(customId);
    });

    test("initializes with default scene description", async () => {
      const state = await manager.create();

      expect(state.currentScene.description).toBe(
        "The adventure is just beginning. The world awaits your imagination."
      );
    });

    test("creates adventure directory and state files", async () => {
      const state = await manager.create();
      const adventureDir = join(TEST_ADVENTURES_DIR, state.id);
      const statePath = join(adventureDir, "state.json");
      const historyPath = join(adventureDir, "history.json");

      const stateContent = await readFile(statePath, "utf-8");
      const historyContent = await readFile(historyPath, "utf-8");

      expect(JSON.parse(stateContent)).toMatchObject({
        id: state.id,
        sessionToken: state.sessionToken,
      });
      expect(JSON.parse(historyContent)).toEqual({ entries: [] });
    });

    test("saves state with ISO 8601 timestamps", async () => {
      const state = await manager.create();

      expect(state.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(state.lastActiveAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  describe("load()", () => {
    test("loads existing adventure state", async () => {
      const created = await manager.create();
      const token = created.sessionToken;
      const id = created.id;

      // Create new manager instance to test loading
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(id, token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.id).toBe(id);
        expect(result.state.sessionToken).toBe(token);
        expect(result.history.entries).toEqual([]);
      }
    });

    test("returns NOT_FOUND error for nonexistent adventure", async () => {
      const result = await manager.load("nonexistent-id", "fake-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("NOT_FOUND");
        expect(result.error.message).toContain("not found");
      }
    });

    test("returns INVALID_TOKEN error for wrong token", async () => {
      const state = await manager.create();
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);

      const result = await newManager.load(state.id, "wrong-token");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("INVALID_TOKEN");
      }
    });

    test("returns CORRUPTED error for invalid JSON in state file", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      // Corrupt the state file
      await writeFile(statePath, "{ invalid json }", "utf-8");

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("CORRUPTED");
        if (result.error.type === "CORRUPTED") {
          // Compare absolute paths since safeResolvePath returns absolute paths
          expect(result.error.path).toBe(resolve(statePath));
        }
      }
    });

    test("returns CORRUPTED error for invalid JSON in history file", async () => {
      const state = await manager.create();
      const historyPath = join(TEST_ADVENTURES_DIR, state.id, "history.json");

      // Corrupt the history file
      await writeFile(historyPath, "{ invalid json }", "utf-8");

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("CORRUPTED");
        if (result.error.type === "CORRUPTED") {
          // Compare absolute paths since safeResolvePath returns absolute paths
          expect(result.error.path).toBe(resolve(historyPath));
        }
      }
    });

    test("initializes empty history if history.json doesn't exist", async () => {
      const state = await manager.create();
      const historyPath = join(TEST_ADVENTURES_DIR, state.id, "history.json");

      // Delete history file to simulate old adventure
      await rm(historyPath);

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.history.entries).toEqual([]);
      }
    });

    test("updates lastActiveAt timestamp on load", async () => {
      const state = await manager.create();
      const originalTimestamp = state.lastActiveAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.lastActiveAt).not.toBe(originalTimestamp);
        expect(
          new Date(result.state.lastActiveAt).getTime()
        ).toBeGreaterThan(new Date(originalTimestamp).getTime());
      }
    });
  });

  describe("save()", () => {
    test("atomically writes state using temp file", async () => {
      await manager.create();

      // Save should succeed
      await manager.save();

      const state = manager.getState();
      expect(state).toBeDefined();
    });

    test("throws error if no state loaded", () => {
      expect(manager.save()).rejects.toThrow(
        "No state to save"
      );
    });

    test("updates lastActiveAt on save", async () => {
      const state = await manager.create();
      const originalTimestamp = state.lastActiveAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await manager.save();

      const updatedState = manager.getState();
      expect(updatedState?.lastActiveAt).not.toBe(originalTimestamp);
    });

    test("writes human-readable JSON with indentation", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      const content = await readFile(statePath, "utf-8");

      // Check that JSON is pretty-printed (has newlines and indentation)
      expect(content).toContain("\n");
      expect(content).toContain("  ");
    });
  });

  describe("appendHistory()", () => {
    test("adds entry to history and persists", async () => {
      await manager.create();

      const entry: NarrativeEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: "look around",
      };

      await manager.appendHistory(entry);

      const history = manager.getHistory();
      expect(history.entries).toHaveLength(1);
      expect(history.entries[0]).toEqual(entry);
    });

    test("persists history to disk", async () => {
      const state = await manager.create();
      const entry: NarrativeEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: "look around",
      };

      await manager.appendHistory(entry);

      // Load from disk to verify persistence
      const historyPath = join(TEST_ADVENTURES_DIR, state.id, "history.json");
      const content = await readFile(historyPath, "utf-8");
      const loadedHistory = JSON.parse(content) as NarrativeHistory;

      expect(loadedHistory.entries).toHaveLength(1);
      expect(loadedHistory.entries[0]).toEqual(entry);
    });

    test("appends multiple entries in order", async () => {
      await manager.create();

      const entries: NarrativeEntry[] = [
        {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "first",
        },
        {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: "gm_response",
          content: "second",
        },
        {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          type: "player_input",
          content: "third",
        },
      ];

      for (const entry of entries) {
        await manager.appendHistory(entry);
      }

      const history = manager.getHistory();
      expect(history.entries).toEqual(entries);
    });

    test("throws error if no state loaded", () => {
      const entry: NarrativeEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: "test",
      };

      expect(manager.appendHistory(entry)).rejects.toThrow(
        "No state loaded"
      );
    });
  });

  describe("updateAgentSessionId()", () => {
    test("updates agent session ID and saves", async () => {
      await manager.create();
      const sessionId = "agent-session-123";

      await manager.updateAgentSessionId(sessionId);

      const state = manager.getState();
      expect(state?.agentSessionId).toBe(sessionId);
    });

    test("persists agent session ID to disk", async () => {
      const state = await manager.create();
      const sessionId = "agent-session-123";

      await manager.updateAgentSessionId(sessionId);

      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");
      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as AdventureState;

      expect(loadedState.agentSessionId).toBe(sessionId);
    });
  });

  describe("updateScene()", () => {
    test("updates scene description", async () => {
      await manager.create();
      const newDescription = "You stand in a dark forest.";

      await manager.updateScene(newDescription);

      const state = manager.getState();
      expect(state?.currentScene.description).toBe(newDescription);
    });

  });

  describe("getters", () => {
    test("getState() returns current state", async () => {
      const created = await manager.create();
      const state = manager.getState();

      expect(state).toEqual(created);
    });

    test("getState() returns null when no state loaded", () => {
      const state = manager.getState();
      expect(state).toBeNull();
    });

    test("getHistory() returns current history", async () => {
      await manager.create();
      const entry: NarrativeEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: "player_input",
        content: "test",
      };

      await manager.appendHistory(entry);

      const history = manager.getHistory();
      expect(history.entries).toContain(entry);
    });
  });

  describe("file permissions", () => {
    test("creates adventure directory with owner-only access (0o700)", async () => {
      const state = await manager.create();
      const adventureDir = join(TEST_ADVENTURES_DIR, state.id);

      const dirStat = await stat(adventureDir);
      // mode includes file type bits, mask with 0o777 to get permission bits only
      const permissions = dirStat.mode & 0o777;

      expect(permissions).toBe(0o700);
    });

    test("creates state.json with owner-only read/write (0o600)", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      const fileStat = await stat(statePath);
      const permissions = fileStat.mode & 0o777;

      expect(permissions).toBe(0o600);
    });

    test("creates history.json with owner-only read/write (0o600)", async () => {
      const state = await manager.create();
      const historyPath = join(TEST_ADVENTURES_DIR, state.id, "history.json");

      const fileStat = await stat(historyPath);
      const permissions = fileStat.mode & 0o777;

      expect(permissions).toBe(0o600);
    });

    test("maintains 0o600 permissions after save()", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      // Modify and save
      await manager.updateScene("New scene description");

      const fileStat = await stat(statePath);
      const permissions = fileStat.mode & 0o777;

      expect(permissions).toBe(0o600);
    });
  });

  describe("playerRef and worldRef fields", () => {
    test("new adventures initialize playerRef and worldRef as null", async () => {
      const state = await manager.create();

      expect(state.playerRef).toBeNull();
      expect(state.worldRef).toBeNull();
    });

    test("new adventures persist refs to disk as null", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as AdventureState;

      expect(loadedState.playerRef).toBeNull();
      expect(loadedState.worldRef).toBeNull();
    });

    test("new adventures do NOT include npcs, diceLog, combatState, or removed fields (TD-6)", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      const content = await readFile(statePath, "utf-8");
      // Use Record<string, unknown> to check for field presence without type constraint
      const loadedState = JSON.parse(content) as Record<string, unknown>;

      // These fields should not be present in new adventures
      expect(loadedState["npcs"]).toBeUndefined();
      expect(loadedState["diceLog"]).toBeUndefined();
      expect(loadedState["combatState"]).toBeUndefined();
      // Removed fields should not be present (Issue #157)
      expect(loadedState["systemDefinition"]).toBeUndefined();
      expect(loadedState["worldState"]).toBeUndefined();
      expect(loadedState["playerCharacter"]).toBeUndefined();
    });

    test("loads adventures with existing playerRef/worldRef values", async () => {
      // Create state with refs set
      const adventureId = "adventure-with-refs";
      const sessionToken = randomUUID();
      const adventureDir = join(TEST_ADVENTURES_DIR, adventureId);
      await mkdir(adventureDir, { recursive: true });

      const stateWithRefs = {
        id: adventureId,
        sessionToken,
        agentSessionId: null,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentScene: {
          description: "Adventure with refs",
        },
        currentTheme: {
          mood: "calm",
          genre: "high-fantasy",
          region: "village",
          backgroundUrl: null,
        },
        playerRef: "players/kael-thouls",
        worldRef: "worlds/eldoria",
      };

      const statePath = join(adventureDir, "state.json");
      await writeFile(statePath, JSON.stringify(stateWithRefs, null, 2), "utf-8");

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(adventureId, sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.playerRef).toBe("players/kael-thouls");
        expect(result.state.worldRef).toBe("worlds/eldoria");
      }
    });
  });

  describe("updatePlayerRef()", () => {
    test("updates playerRef and saves", async () => {
      await manager.create();

      await manager.updatePlayerRef("players/kael-thouls");

      const state = manager.getState();
      expect(state?.playerRef).toBe("players/kael-thouls");
    });

    test("persists playerRef to disk", async () => {
      const state = await manager.create();

      await manager.updatePlayerRef("players/test-character");

      // Reload and verify
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.playerRef).toBe("players/test-character");
      }
    });

    test("throws error when no state loaded", async () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);

      let errorThrown = false;
      try {
        await freshManager.updatePlayerRef("players/test");
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("No state loaded");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("updateWorldRef()", () => {
    test("updates worldRef and saves", async () => {
      await manager.create();

      await manager.updateWorldRef("worlds/eldoria");

      const state = manager.getState();
      expect(state?.worldRef).toBe("worlds/eldoria");
    });

    test("persists worldRef to disk", async () => {
      const state = await manager.create();

      await manager.updateWorldRef("worlds/test-world");

      // Reload and verify
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.worldRef).toBe("worlds/test-world");
      }
    });

    test("throws error when no state loaded", async () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);

      let errorThrown = false;
      try {
        await freshManager.updateWorldRef("worlds/test");
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("No state loaded");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("getCurrentAdventureDir()", () => {
    test("returns null when no state loaded", () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      expect(freshManager.getCurrentAdventureDir()).toBeNull();
    });

    test("returns adventure directory path after state created", async () => {
      const state = await manager.create();
      const adventureDir = manager.getCurrentAdventureDir();

      expect(adventureDir).not.toBeNull();
      expect(adventureDir).toBe(resolve(TEST_ADVENTURES_DIR, state.id));
    });

    test("returns adventure directory path after state loaded", async () => {
      const state = await manager.create();

      // Create new manager and load
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      await newManager.load(state.id, state.sessionToken);

      const adventureDir = newManager.getCurrentAdventureDir();
      expect(adventureDir).not.toBeNull();
      expect(adventureDir).toBe(resolve(TEST_ADVENTURES_DIR, state.id));
    });
  });

  describe("updateXpStyle()", () => {
    test("updates xpStyle to frequent", async () => {
      await manager.create();

      await manager.updateXpStyle("frequent");

      const state = manager.getState();
      expect(state?.xpStyle).toBe("frequent");
    });

    test("updates xpStyle to milestone", async () => {
      await manager.create();

      await manager.updateXpStyle("milestone");

      const state = manager.getState();
      expect(state?.xpStyle).toBe("milestone");
    });

    test("updates xpStyle to combat-plus", async () => {
      await manager.create();

      await manager.updateXpStyle("combat-plus");

      const state = manager.getState();
      expect(state?.xpStyle).toBe("combat-plus");
    });

    test("persists xpStyle to disk", async () => {
      const state = await manager.create();

      await manager.updateXpStyle("milestone");

      // Reload and verify
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.xpStyle).toBe("milestone");
      }
    });

    test("throws error when no state loaded", async () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);

      let errorThrown = false;
      try {
        await freshManager.updateXpStyle("frequent");
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("No state loaded");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("panel persistence (REQ-F-11, REQ-F-12, REQ-F-13)", () => {
    const createTestPanel = (
      id: string,
      persistent: boolean,
      content = "Test content"
    ): Panel => ({
      id,
      title: `Panel ${id}`,
      content,
      position: "sidebar",
      persistent,
      createdAt: new Date().toISOString(),
    });

    test("new adventures initialize with empty panels array", async () => {
      const state = await manager.create();

      expect(state.panels).toEqual([]);
    });

    test("getPanels() returns empty array when no state loaded", () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const panels = freshManager.getPanels();

      expect(panels).toEqual([]);
    });

    test("getPanels() returns current panels array", async () => {
      await manager.create();
      const panel = createTestPanel("weather", true);

      await manager.setPanels([panel]);

      const panels = manager.getPanels();
      expect(panels).toHaveLength(1);
      expect(panels[0].id).toBe("weather");
    });

    test("setPanels() updates panels and saves", async () => {
      await manager.create();
      const panel = createTestPanel("weather", true);

      await manager.setPanels([panel]);

      const state = manager.getState();
      expect(state?.panels).toHaveLength(1);
      expect(state?.panels?.[0].id).toBe("weather");
    });

    test("setPanels() throws error when no state loaded", async () => {
      const freshManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const panel = createTestPanel("weather", true);

      let errorThrown = false;
      try {
        await freshManager.setPanels([panel]);
      } catch (error) {
        errorThrown = true;
        expect((error as Error).message).toContain("No state loaded");
      }
      expect(errorThrown).toBe(true);
    });

    test("save() filters out non-persistent panels (REQ-F-12)", async () => {
      const state = await manager.create();
      const persistentPanel = createTestPanel("weather", true);
      const nonPersistentPanel = createTestPanel("temp-alert", false);

      await manager.setPanels([persistentPanel, nonPersistentPanel]);

      // Verify in-memory state has both panels
      expect(manager.getState()?.panels).toHaveLength(2);

      // Read from disk to verify only persistent panel was saved
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");
      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as AdventureState;

      expect(loadedState.panels).toHaveLength(1);
      expect(loadedState.panels?.[0].id).toBe("weather");
      expect(loadedState.panels?.[0].persistent).toBe(true);
    });

    test("save() preserves empty panels array when all are non-persistent", async () => {
      const state = await manager.create();
      const nonPersistentPanel = createTestPanel("temp-alert", false);

      await manager.setPanels([nonPersistentPanel]);

      // Read from disk
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");
      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as AdventureState;

      expect(loadedState.panels).toEqual([]);
    });

    test("load() handles missing panels field gracefully (legacy state)", async () => {
      // Create state without panels field (simulating legacy adventure)
      const adventureId = "legacy-adventure";
      const sessionToken = randomUUID();
      const adventureDir = join(TEST_ADVENTURES_DIR, adventureId);
      await mkdir(adventureDir, { recursive: true });

      const legacyState = {
        id: adventureId,
        sessionToken,
        agentSessionId: null,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentScene: {
          description: "Legacy adventure",
        },
        currentTheme: {
          mood: "calm",
          genre: "high-fantasy",
          region: "village",
          backgroundUrl: null,
        },
        playerRef: null,
        worldRef: null,
        // Note: no panels field
      };

      const statePath = join(adventureDir, "state.json");
      await writeFile(statePath, JSON.stringify(legacyState, null, 2), "utf-8");

      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(adventureId, sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.panels).toEqual([]);
      }
    });

    test("load() restores persistent panels from disk (REQ-F-11)", async () => {
      // Create state and add persistent panel
      const state = await manager.create();
      const persistentPanel = createTestPanel("weather", true, "Sunny, 72F");

      await manager.setPanels([persistentPanel]);

      // Create new manager and load
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.panels).toHaveLength(1);
        expect(result.state.panels?.[0].id).toBe("weather");
        expect(result.state.panels?.[0].content).toBe("Sunny, 72F");
        expect(result.state.panels?.[0].persistent).toBe(true);
      }
    });

    test("multiple persistent panels are preserved in order", async () => {
      const state = await manager.create();
      const panel1 = createTestPanel("weather", true, "Content 1");
      const panel2 = createTestPanel("faction", true, "Content 2");
      const panel3 = createTestPanel("temp", false, "Content 3");
      const panel4 = createTestPanel("quests", true, "Content 4");

      await manager.setPanels([panel1, panel2, panel3, panel4]);

      // Reload and verify order
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.panels).toHaveLength(3);
        expect(result.state.panels?.[0].id).toBe("weather");
        expect(result.state.panels?.[1].id).toBe("faction");
        expect(result.state.panels?.[2].id).toBe("quests");
      }
    });

    test("panels with overlay position preserve x/y coordinates", async () => {
      const state = await manager.create();
      const overlayPanel: Panel = {
        id: "mini-map",
        title: "Mini Map",
        content: "Map content",
        position: "overlay",
        persistent: true,
        x: 75,
        y: 25,
        createdAt: new Date().toISOString(),
      };

      await manager.setPanels([overlayPanel]);

      // Reload and verify coordinates
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.panels?.[0].x).toBe(75);
        expect(result.state.panels?.[0].y).toBe(25);
      }
    });

    test("panels field in state.json matches REQ-F-13 schema", async () => {
      const state = await manager.create();
      const panel = createTestPanel("weather", true);

      await manager.setPanels([panel]);

      // Read from disk and verify panels key exists
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");
      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as Record<string, unknown>;

      expect(loadedState).toHaveProperty("panels");
      expect(Array.isArray(loadedState["panels"])).toBe(true);
    });
  });
});
