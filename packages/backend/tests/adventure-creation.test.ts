import { describe, test, expect } from "bun:test";
import { createApp } from "../src/app";
import { createMockFileOps, type MockFileOps } from "./helpers/mock-file-ops";
import type { PluginRegistry } from "../src/services/plugin-registry";

const ADVENTURES_ROOT = "/test/adventures";

function createMockPluginRegistry(): PluginRegistry {
  return {
    corePlugins: [],
    resolveSystem(alias: string) {
      if (alias === "d20") {
        return {
          manifest: { name: "d20-system", type: "system", alias: "d20", description: "Classic d20" },
          path: "/plugins/d20-system",
        };
      }
      if (alias === "daggerheart") {
        return {
          manifest: { name: "daggerheart-system", type: "system", alias: "daggerheart", description: "Hope and fear" },
          path: "/plugins/daggerheart-system",
        };
      }
      return null;
    },
    availableSystems() {
      return [
        { alias: "d20", description: "Classic d20" },
        { alias: "daggerheart", description: "Hope and fear" },
      ];
    },
  };
}

function buildApp(files: Record<string, string> = {}) {
  const fileOps = createMockFileOps(files);
  const app = createApp({
    fileOps,
    adventuresPath: ADVENTURES_ROOT,
    pluginRegistry: createMockPluginRegistry(),
  });
  return { app, fileOps };
}

describe("POST /adventures", () => {
  test("creates adventure with system and concept (201)", async () => {
    const { app, fileOps } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "The Healer's Burden",
        system: "d20",
        concept: "A story about a reluctant healer.",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.adventure.id).toBe("the-healers-burden");
    expect(body.adventure.name).toBe("The Healer's Burden");
    expect(body.adventure.system).toBe("d20");
    expect(body.adventure.concept).toBe("A story about a reluctant healer.");
    expect(body.adventure.hasHistory).toBe(false);
    expect(body.adventure.characterName).toBeNull();
    expect(body.adventure.lastPlayed).toBeNull();
  });

  test("writes correct adventure.md for system + concept", async () => {
    const { app, fileOps } = buildApp();

    await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "The Healer's Burden",
        system: "d20",
        concept: "A story about a reluctant healer.",
      }),
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/the-healers-burden/adventure.md`);
    expect(content).toBe("---\nname: The Healer's Burden\nsystem: d20\n---\n\nA story about a reluctant healer.\n");
  });

  test("writes correct adventure.md for freeform with concept", async () => {
    const { app, fileOps } = buildApp();

    await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Free Roam",
        system: null,
        concept: "Explore the wilds.",
      }),
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/free-roam/adventure.md`);
    expect(content).toBe("---\nname: Free Roam\n---\n\nExplore the wilds.\n");
  });

  test("writes correct adventure.md for freeform without concept", async () => {
    const { app, fileOps } = buildApp();

    await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Free Roam",
        system: null,
        concept: null,
      }),
    });

    const content = fileOps.getStore().get(`${ADVENTURES_ROOT}/free-roam/adventure.md`);
    expect(content).toBe("---\nname: Free Roam\n---\n");
  });

  test("creates freeform adventure with null system (201)", async () => {
    const { app } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Free Roam",
        system: null,
        concept: null,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.adventure.id).toBe("free-roam");
    expect(body.adventure.system).toBeNull();
    expect(body.adventure.concept).toBeNull();
  });

  test("creates adventure with null concept (201)", async () => {
    const { app } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Quick Start",
        system: "daggerheart",
        concept: null,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.adventure.concept).toBeNull();
    expect(body.adventure.system).toBe("daggerheart");
  });

  test("returns 400 for invalid system alias", async () => {
    const { app } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad System",
        system: "pathfinder",
        concept: null,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("pathfinder");
    expect(body.error).toContain("d20");
    expect(body.error).toContain("daggerheart");
  });

  test("returns 409 for duplicate slug", async () => {
    const { app } = buildApp({
      [`${ADVENTURES_ROOT}/my-quest/adventure.md`]: "---\nname: My Quest\n---\n",
    });

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "My Quest",
        system: null,
        concept: null,
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("An adventure with this name already exists.");
  });

  test("returns 400 for missing name", async () => {
    const { app } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: null,
        concept: null,
      }),
    });

    expect(res.status).toBe(400);
  });

  test("returns 400 for empty name", async () => {
    const { app } = buildApp();

    const res = await app.request("/adventures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        system: null,
        concept: null,
      }),
    });

    expect(res.status).toBe(400);
  });
});
