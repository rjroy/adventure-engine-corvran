import { describe, test, expect } from "bun:test";
import { createApp } from "../src/app";
import { createMockFileOps } from "./helpers/mock-file-ops";
import type { PluginRegistry } from "../src/services/plugin-registry";

const ADVENTURES_ROOT = "/test/adventures";

function buildApp(registry: PluginRegistry) {
  return createApp({
    fileOps: createMockFileOps(),
    adventuresPath: ADVENTURES_ROOT,
    pluginRegistry: registry,
    noAi: true,
  });
}

describe("GET /systems", () => {
  test("returns system plugins with alias and description", async () => {
    const registry: PluginRegistry = {
      corePlugins: [],
      resolveSystem: () => null,
      availableSystems: () => [
        { alias: "d20", description: "Classic d20 fantasy" },
        { alias: "daggerheart", description: "Hope and fear drive the story" },
      ],
    };

    const app = buildApp(registry);
    const res = await app.request("/systems");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.systems).toHaveLength(2);
    expect(body.systems[0]).toEqual({ alias: "d20", description: "Classic d20 fantasy" });
    expect(body.systems[1]).toEqual({ alias: "daggerheart", description: "Hope and fear drive the story" });
  });

  test("returns systems from registry regardless of core plugins", async () => {
    const registry: PluginRegistry = {
      corePlugins: [{ manifest: { name: "corvran", type: "core", alias: "corvran" }, path: "/plugins/corvran" }],
      resolveSystem: () => null,
      availableSystems: () => [
        { alias: "d20", description: "Classic d20" },
      ],
    };

    const app = buildApp(registry);
    const res = await app.request("/systems");
    const body = await res.json();
    expect(body.systems).toHaveLength(1);
    expect(body.systems[0].alias).toBe("d20");
  });

  test("returns empty array when no system plugins installed", async () => {
    const registry: PluginRegistry = {
      corePlugins: [],
      resolveSystem: () => null,
      availableSystems: () => [],
    };

    const app = buildApp(registry);
    const res = await app.request("/systems");
    const body = await res.json();
    expect(body.systems).toEqual([]);
  });
});
