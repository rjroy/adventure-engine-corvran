// Adventure State Manager Tests
// Unit tests for state persistence, loading, and corruption detection

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AdventureStateManager } from "../../src/adventure-state";
import type { NarrativeEntry } from "../../../shared/protocol";
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

    test("initializes with empty world state", async () => {
      const state = await manager.create();

      expect(state.currentScene.description).toBe(
        "The adventure is just beginning. The world awaits your imagination."
      );
      expect(state.currentScene.location).toBe("Unknown");
      expect(state.worldState).toEqual({});
      expect(state.playerCharacter.name).toBeNull();
      expect(state.playerCharacter.attributes).toEqual({});
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

    test("updates location when provided", async () => {
      await manager.create();
      const newDescription = "You stand in a dark forest.";
      const newLocation = "Dark Forest";

      await manager.updateScene(newDescription, newLocation);

      const state = manager.getState();
      expect(state?.currentScene.description).toBe(newDescription);
      expect(state?.currentScene.location).toBe(newLocation);
    });

    test("preserves location when not provided", async () => {
      await manager.create();
      const state = manager.getState();
      const originalLocation = state?.currentScene.location;

      await manager.updateScene("New description");

      expect(state?.currentScene.location).toBe(originalLocation);
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

  describe("RPG system fields", () => {
    test("new adventures initialize with empty RPG fields", async () => {
      const state = await manager.create();

      expect(state.npcs).toEqual([]);
      expect(state.diceLog).toEqual([]);
      expect(state.combatState).toBeNull();
      expect(state.systemDefinition).toBeNull();
    });

    test("new adventures persist RPG fields to disk", async () => {
      const state = await manager.create();
      const statePath = join(TEST_ADVENTURES_DIR, state.id, "state.json");

      const content = await readFile(statePath, "utf-8");
      const loadedState = JSON.parse(content) as AdventureState;

      expect(loadedState.npcs).toEqual([]);
      expect(loadedState.diceLog).toEqual([]);
      expect(loadedState.combatState).toBeNull();
      expect(loadedState.systemDefinition).toBeNull();
    });

    test("loads legacy adventures without RPG fields (backward compatibility)", async () => {
      // Create an old-style state without RPG fields
      const adventureId = "legacy-test-adventure";
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
          location: "Legacy Location",
        },
        worldState: {},
        playerCharacter: {
          name: "Legacy Hero",
          attributes: { strength: 10 },
        },
        currentTheme: {
          mood: "calm",
          genre: "high-fantasy",
          region: "village",
          backgroundUrl: null,
        },
        // No RPG fields - simulating old state.json
      };

      const statePath = join(adventureDir, "state.json");
      await writeFile(statePath, JSON.stringify(legacyState, null, 2), "utf-8");

      // Load the legacy state
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(adventureId, sessionToken);

      // Verify successful load with migrated RPG fields
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.npcs).toEqual([]);
        expect(result.state.diceLog).toEqual([]);
        expect(result.state.combatState).toBeNull();
        expect(result.state.systemDefinition).toBeNull();
        // Verify original fields are preserved
        expect(result.state.playerCharacter.name).toBe("Legacy Hero");
        expect(result.state.playerCharacter.attributes).toEqual({ strength: 10 });
      }
    });

    test("saves and reloads adventures with RPG data", async () => {
      const state = await manager.create();

      // Modify state with RPG data
      if (state.npcs) {
        state.npcs.push({
          id: "npc-1",
          name: "Test Goblin",
          stats: { strength: 8, dexterity: 14 },
          hp: { current: 7, max: 7 },
          conditions: [],
          inventory: [],
          isHostile: true,
        });
      }

      if (state.diceLog) {
        state.diceLog.push({
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          expression: "1d20+3",
          individualRolls: [15],
          total: 18,
          context: "Attack roll",
          visible: true,
          requestedBy: "system",
        });
      }

      if (state.combatState !== undefined) {
        state.combatState = {
          active: true,
          round: 1,
          initiativeOrder: [
            { name: "Player", initiative: 15, isPlayer: true, conditions: [] },
            { name: "Test Goblin", initiative: 12, isPlayer: false, conditions: [] },
          ],
          currentIndex: 0,
          structure: "turn-based",
        };
      }

      await manager.save();

      // Reload and verify
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.npcs).toHaveLength(1);
        expect(result.state.npcs?.[0].name).toBe("Test Goblin");
        expect(result.state.diceLog).toHaveLength(1);
        expect(result.state.diceLog?.[0].expression).toBe("1d20+3");
        expect(result.state.combatState?.active).toBe(true);
        expect(result.state.combatState?.round).toBe(1);
      }
    });

    test("handles playerCharacter with extended RPG properties", async () => {
      const state = await manager.create();

      // Update playerCharacter with RPG properties
      state.playerCharacter = {
        name: "Adventurer",
        attributes: { background: "warrior" },
        stats: { strength: 16, dexterity: 14, constitution: 15 },
        skills: { athletics: 5, stealth: 2 },
        hp: { current: 25, max: 30 },
        conditions: ["blessed"],
        inventory: [
          { name: "Longsword", quantity: 1, equipped: true },
          { name: "Health Potion", quantity: 3 },
        ],
        xp: 1500,
        level: 3,
      };

      await manager.save();

      // Reload and verify
      const newManager = new AdventureStateManager(TEST_ADVENTURES_DIR);
      const result = await newManager.load(state.id, state.sessionToken);

      expect(result.success).toBe(true);
      if (result.success) {
        const pc = result.state.playerCharacter;
        expect(pc.name).toBe("Adventurer");
        expect(pc.stats).toEqual({ strength: 16, dexterity: 14, constitution: 15 });
        expect(pc.skills).toEqual({ athletics: 5, stealth: 2 });
        expect(pc.hp).toEqual({ current: 25, max: 30 });
        expect(pc.conditions).toEqual(["blessed"]);
        expect(pc.inventory).toHaveLength(2);
        expect(pc.xp).toBe(1500);
        expect(pc.level).toBe(3);
      }
    });
  });
});
