// MCP Tools Tests
// Unit tests for MCP tool callbacks interface and server creation
//
// Note: The SDK's createSdkMcpServer returns McpSdkServerConfigWithInstance
// which doesn't expose tools directly for testing. We test:
// 1. Server creation (name, instance)
// 2. GMMcpCallbacks interface (compile-time verification)
// 3. Callback type signatures
//
// Integration testing of actual tool invocation is done in mcp-tool-use.test.ts

import { describe, test, expect, mock } from "bun:test";
import {
  createGMMcpServer,
  createGMMcpServerWithCallbacks,
  type GMMcpCallbacks,
  type ThemeChangeHandler,
  type XpStyleChangeHandler,
  type SetCharacterHandler,
  type SetWorldHandler,
  type ListCharactersHandler,
  type ListWorldsHandler,
  type CreatePanelHandler,
  type UpdatePanelHandler,
  type DismissPanelHandler,
  type ListPanelsHandler,
} from "../../src/gm-prompt";
import type { PlayerInfo } from "../../src/player-manager";
import type { WorldInfo } from "../../src/world-manager";

/**
 * Create mock callbacks for testing
 */
function createMockCallbacks(): GMMcpCallbacks {
  return {
    onThemeChange: mock<ThemeChangeHandler>(() => Promise.resolve()),
    onXpStyleChange: mock<XpStyleChangeHandler>(() => Promise.resolve()),
    onSetCharacter: mock<SetCharacterHandler>(() => Promise.resolve("players/test-character")),
    onSetWorld: mock<SetWorldHandler>(() => Promise.resolve("worlds/test-world")),
    onListCharacters: mock<ListCharactersHandler>(() => Promise.resolve([])),
    onListWorlds: mock<ListWorldsHandler>(() => Promise.resolve([])),
    onCreatePanel: mock<CreatePanelHandler>(() => Promise.resolve({ success: true })),
    onUpdatePanel: mock<UpdatePanelHandler>(() => Promise.resolve({ success: true })),
    onDismissPanel: mock<DismissPanelHandler>(() => Promise.resolve({ success: true })),
    onListPanels: mock<ListPanelsHandler>(() => Promise.resolve([])),
  };
}

describe("createGMMcpServerWithCallbacks", () => {
  describe("server creation", () => {
    test("creates MCP server with correct name", () => {
      const callbacks = createMockCallbacks();
      const server = createGMMcpServerWithCallbacks(callbacks);

      expect(server).toBeDefined();
      expect(server.name).toBe("adventure-gm");
    });

    test("server has instance property", () => {
      const callbacks = createMockCallbacks();
      const server = createGMMcpServerWithCallbacks(callbacks);

      expect(server.instance).toBeDefined();
    });
  });
});

describe("createGMMcpServer (legacy)", () => {
  test("creates MCP server with correct name", () => {
    const server = createGMMcpServer(
      mock(() => Promise.resolve()),
      mock(() => Promise.resolve())
    );

    expect(server).toBeDefined();
    expect(server.name).toBe("adventure-gm");
  });

  test("server has instance property", () => {
    const server = createGMMcpServer(
      mock(() => Promise.resolve()),
      mock(() => Promise.resolve())
    );

    expect(server.instance).toBeDefined();
  });
});

describe("GMMcpCallbacks interface", () => {
  test("interface has all required callback types", () => {
    // This test verifies the interface structure at compile time
    const callbacks: GMMcpCallbacks = {
      onThemeChange: () => Promise.resolve(),
      onXpStyleChange: () => Promise.resolve(),
      onSetCharacter: () => Promise.resolve("players/test"),
      onSetWorld: () => Promise.resolve("worlds/test"),
      onListCharacters: () => Promise.resolve([]),
      onListWorlds: () => Promise.resolve([]),
      onCreatePanel: () => Promise.resolve({ success: true }),
      onUpdatePanel: () => Promise.resolve({ success: true }),
      onDismissPanel: () => Promise.resolve({ success: true }),
      onListPanels: () => Promise.resolve([]),
    };

    // All properties should be defined
    expect(callbacks.onThemeChange).toBeDefined();
    expect(callbacks.onXpStyleChange).toBeDefined();
    expect(callbacks.onSetCharacter).toBeDefined();
    expect(callbacks.onSetWorld).toBeDefined();
    expect(callbacks.onListCharacters).toBeDefined();
    expect(callbacks.onListWorlds).toBeDefined();
    expect(callbacks.onCreatePanel).toBeDefined();
    expect(callbacks.onUpdatePanel).toBeDefined();
    expect(callbacks.onDismissPanel).toBeDefined();
    expect(callbacks.onListPanels).toBeDefined();
  });

  test("callbacks accept correct parameter types", async () => {
    const callbacks = createMockCallbacks();

    // Test ThemeChangeHandler signature
    await callbacks.onThemeChange("calm", "high-fantasy", "village", false, undefined);
    expect(callbacks.onThemeChange).toHaveBeenCalledWith("calm", "high-fantasy", "village", false, undefined);

    // Test XpStyleChangeHandler signature
    await callbacks.onXpStyleChange("frequent");
    expect(callbacks.onXpStyleChange).toHaveBeenCalledWith("frequent");

    // Test SetCharacterHandler signature
    const charRef = await callbacks.onSetCharacter("Kael Thouls", true);
    expect(callbacks.onSetCharacter).toHaveBeenCalledWith("Kael Thouls", true);
    expect(typeof charRef).toBe("string");

    // Test SetWorldHandler signature
    const worldRef = await callbacks.onSetWorld("Eldoria", true);
    expect(callbacks.onSetWorld).toHaveBeenCalledWith("Eldoria", true);
    expect(typeof worldRef).toBe("string");

    // Test ListCharactersHandler signature
    const characters = await callbacks.onListCharacters();
    expect(callbacks.onListCharacters).toHaveBeenCalled();
    expect(Array.isArray(characters)).toBe(true);

    // Test ListWorldsHandler signature
    const worlds = await callbacks.onListWorlds();
    expect(callbacks.onListWorlds).toHaveBeenCalled();
    expect(Array.isArray(worlds)).toBe(true);
  });

  test("SetCharacterHandler returns correct type", async () => {
    const handler: SetCharacterHandler = (name, _isNew) => {
      return Promise.resolve(`players/${name.toLowerCase().replace(/\s+/g, "-")}`);
    };

    const result = await handler("Kael Thouls", true);
    expect(result).toBe("players/kael-thouls");
  });

  test("SetWorldHandler returns correct type", async () => {
    const handler: SetWorldHandler = (name, _isNew) => {
      return Promise.resolve(`worlds/${name.toLowerCase().replace(/\s+/g, "-")}`);
    };

    const result = await handler("Eldoria", true);
    expect(result).toBe("worlds/eldoria");
  });

  test("ListCharactersHandler returns correct type", async () => {
    const characters: PlayerInfo[] = [
      { slug: "kael-thouls", name: "Kael Thouls" },
      { slug: "luna-shadowmere", name: "Luna Shadowmere" },
    ];

    const handler: ListCharactersHandler = () => Promise.resolve(characters);

    const result = await handler();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("kael-thouls");
    expect(result[0].name).toBe("Kael Thouls");
  });

  test("ListWorldsHandler returns correct type", async () => {
    const worlds: WorldInfo[] = [
      { slug: "eldoria", name: "Eldoria" },
      { slug: "dark-realms", name: "Dark Realms" },
    ];

    const handler: ListWorldsHandler = () => Promise.resolve(worlds);

    const result = await handler();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("eldoria");
    expect(result[0].name).toBe("Eldoria");
  });
});

describe("callback handler behavior", () => {
  describe("SetCharacterHandler", () => {
    test("handles new character creation", async () => {
      const handler: SetCharacterHandler = (name, isNew) => {
        if (isNew) {
          return Promise.resolve(`players/${name.toLowerCase().replace(/\s+/g, "-")}`);
        }
        // For existing, assume name is already slug
        return Promise.resolve(`players/${name}`);
      };

      const newCharRef = await handler("Brave Hero", true);
      expect(newCharRef).toBe("players/brave-hero");
    });

    test("handles existing character selection", async () => {
      const handler: SetCharacterHandler = (name, isNew) => {
        if (isNew) {
          return Promise.resolve(`players/${name.toLowerCase().replace(/\s+/g, "-")}`);
        }
        return Promise.resolve(`players/${name}`);
      };

      const existingRef = await handler("kael-thouls", false);
      expect(existingRef).toBe("players/kael-thouls");
    });

    test("can throw errors for invalid input", async () => {
      const handler: SetCharacterHandler = (name, _isNew) => {
        if (!name || name.trim().length === 0) {
          return Promise.reject(new Error("Character name cannot be empty"));
        }
        return Promise.resolve(`players/${name}`);
      };

      // eslint-disable-next-line @typescript-eslint/await-thenable -- handler returns Promise but ESLint doesn't see it
      await expect(handler("", true)).rejects.toThrow("Character name cannot be empty");
    });
  });

  describe("SetWorldHandler", () => {
    test("handles new world creation", async () => {
      const handler: SetWorldHandler = (name, isNew) => {
        if (isNew) {
          return Promise.resolve(`worlds/${name.toLowerCase().replace(/\s+/g, "-")}`);
        }
        return Promise.resolve(`worlds/${name}`);
      };

      const newWorldRef = await handler("Fantasy Kingdom", true);
      expect(newWorldRef).toBe("worlds/fantasy-kingdom");
    });

    test("handles existing world selection", async () => {
      const handler: SetWorldHandler = (name, isNew) => {
        if (isNew) {
          return Promise.resolve(`worlds/${name.toLowerCase().replace(/\s+/g, "-")}`);
        }
        return Promise.resolve(`worlds/${name}`);
      };

      const existingRef = await handler("eldoria", false);
      expect(existingRef).toBe("worlds/eldoria");
    });

    test("can throw errors for invalid input", async () => {
      const handler: SetWorldHandler = (name, _isNew) => {
        if (!name || name.trim().length === 0) {
          return Promise.reject(new Error("World name cannot be empty"));
        }
        return Promise.resolve(`worlds/${name}`);
      };

      // eslint-disable-next-line @typescript-eslint/await-thenable -- handler returns Promise but ESLint doesn't see it
      await expect(handler("", true)).rejects.toThrow("World name cannot be empty");
    });
  });

  describe("ListCharactersHandler", () => {
    test("returns empty array when no characters exist", async () => {
      const handler: ListCharactersHandler = () => Promise.resolve([]);

      const result = await handler();
      expect(result).toEqual([]);
    });

    test("returns sorted list of characters", async () => {
      const characters: PlayerInfo[] = [
        { slug: "zara", name: "Zara" },
        { slug: "alpha", name: "Alpha" },
        { slug: "mira", name: "Mira" },
      ];

      const handler: ListCharactersHandler = () => {
        return Promise.resolve([...characters].sort((a, b) => a.slug.localeCompare(b.slug)));
      };

      const result = await handler();
      expect(result.map(c => c.slug)).toEqual(["alpha", "mira", "zara"]);
    });
  });

  describe("ListWorldsHandler", () => {
    test("returns empty array when no worlds exist", async () => {
      const handler: ListWorldsHandler = () => Promise.resolve([]);

      const result = await handler();
      expect(result).toEqual([]);
    });

    test("returns sorted list of worlds", async () => {
      const worlds: WorldInfo[] = [
        { slug: "zephyr-isles", name: "Zephyr Isles" },
        { slug: "ancient-realm", name: "Ancient Realm" },
        { slug: "middle-earth", name: "Middle Earth" },
      ];

      const handler: ListWorldsHandler = () => {
        return Promise.resolve([...worlds].sort((a, b) => a.name.localeCompare(b.name)));
      };

      const result = await handler();
      expect(result.map(w => w.name)).toEqual(["Ancient Realm", "Middle Earth", "Zephyr Isles"]);
    });
  });
});

describe("type exports", () => {
  test("ThemeChangeHandler type is exported", () => {
    const handler: ThemeChangeHandler = () => Promise.resolve();
    expect(typeof handler).toBe("function");
  });

  test("XpStyleChangeHandler type is exported", () => {
    const handler: XpStyleChangeHandler = () => Promise.resolve();
    expect(typeof handler).toBe("function");
  });

  test("SetCharacterHandler type is exported", () => {
    const handler: SetCharacterHandler = () => Promise.resolve("players/test");
    expect(typeof handler).toBe("function");
  });

  test("SetWorldHandler type is exported", () => {
    const handler: SetWorldHandler = () => Promise.resolve("worlds/test");
    expect(typeof handler).toBe("function");
  });

  test("ListCharactersHandler type is exported", () => {
    const handler: ListCharactersHandler = () => Promise.resolve([]);
    expect(typeof handler).toBe("function");
  });

  test("ListWorldsHandler type is exported", () => {
    const handler: ListWorldsHandler = () => Promise.resolve([]);
    expect(typeof handler).toBe("function");
  });

  test("GMMcpCallbacks type is exported", () => {
    const callbacks: GMMcpCallbacks = {
      onThemeChange: () => Promise.resolve(),
      onXpStyleChange: () => Promise.resolve(),
      onSetCharacter: () => Promise.resolve("players/test"),
      onSetWorld: () => Promise.resolve("worlds/test"),
      onListCharacters: () => Promise.resolve([]),
      onListWorlds: () => Promise.resolve([]),
      onCreatePanel: () => Promise.resolve({ success: true }),
      onUpdatePanel: () => Promise.resolve({ success: true }),
      onDismissPanel: () => Promise.resolve({ success: true }),
      onListPanels: () => Promise.resolve([]),
    };
    expect(callbacks).toBeDefined();
  });

  test("CreatePanelHandler type is exported", () => {
    const handler: CreatePanelHandler = () => Promise.resolve({ success: true });
    expect(typeof handler).toBe("function");
  });

  test("UpdatePanelHandler type is exported", () => {
    const handler: UpdatePanelHandler = () => Promise.resolve({ success: true });
    expect(typeof handler).toBe("function");
  });

  test("DismissPanelHandler type is exported", () => {
    const handler: DismissPanelHandler = () => Promise.resolve({ success: true });
    expect(typeof handler).toBe("function");
  });

  test("ListPanelsHandler type is exported", () => {
    const handler: ListPanelsHandler = () => Promise.resolve([]);
    expect(typeof handler).toBe("function");
  });
});
