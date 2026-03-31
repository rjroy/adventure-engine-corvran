import { describe, expect, it } from "bun:test";
import { createMockFileOps } from "../helpers/mock-file-ops";
import { buildPluginRegistry } from "../../src/services/plugin-registry";

const PLUGINS_DIR = "/plugins";

function manifest(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: "test-plugin",
    type: "system",
    alias: "test",
    ...overrides,
  });
}

describe("buildPluginRegistry", () => {
  it("parses a valid manifest with all fields", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/my-plugin/corvran-plugin.json`]: manifest({
        name: "my-plugin",
        type: "system",
        alias: "my",
        description: "A test system",
        bootstrap: "bootstrap.md",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    const entry = registry.resolveSystem("my");
    expect(entry).not.toBeNull();
    expect(entry!.manifest.name).toBe("my-plugin");
    expect(entry!.manifest.bootstrap).toBe("bootstrap.md");
    expect(entry!.manifest.description).toBe("A test system");
  });

  it("parses a manifest without optional bootstrap field", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/core/corvran-plugin.json`]: manifest({
        name: "core",
        type: "core",
        alias: "core",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.corePlugins).toHaveLength(1);
    expect(registry.corePlugins[0].manifest.bootstrap).toBeUndefined();
  });

  it("skips directories without corvran-plugin.json", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/no-manifest/some-file.txt`]: "hello",
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.corePlugins).toHaveLength(0);
    expect(registry.availableSystems()).toEqual([]);
  });

  it("skips manifest with missing name field and warns", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/bad/corvran-plugin.json`]: JSON.stringify({
        type: "system",
        alias: "bad",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );
    expect(registry.availableSystems()).toEqual([]);
    expect(warnings.some((w) => w.includes("missing required fields"))).toBe(
      true,
    );
  });

  it("skips manifest with missing type field and warns", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/bad/corvran-plugin.json`]: JSON.stringify({
        name: "bad",
        alias: "bad",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );
    expect(registry.availableSystems()).toEqual([]);
    expect(warnings.some((w) => w.includes("missing required fields"))).toBe(
      true,
    );
  });

  it("skips manifest with missing alias field and warns", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/bad/corvran-plugin.json`]: JSON.stringify({
        name: "bad",
        type: "system",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );
    expect(registry.availableSystems()).toEqual([]);
    expect(warnings.some((w) => w.includes("missing required fields"))).toBe(
      true,
    );
  });

  it("skips manifest with malformed JSON and warns", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/bad/corvran-plugin.json`]: "{ not valid json",
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );
    expect(registry.availableSystems()).toEqual([]);
    expect(warnings.some((w) => w.includes("Invalid JSON"))).toBe(true);
  });

  it("builds registry from multiple plugins, separating core and system", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/corvran/corvran-plugin.json`]: manifest({
        name: "corvran",
        type: "core",
        alias: "corvran",
      }),
      [`${PLUGINS_DIR}/d20-system/corvran-plugin.json`]: manifest({
        name: "d20-system",
        type: "system",
        alias: "d20",
        description: "d20 system",
        bootstrap: "bootstrap.md",
      }),
      [`${PLUGINS_DIR}/daggerheart-system/corvran-plugin.json`]: manifest({
        name: "daggerheart-system",
        type: "system",
        alias: "daggerheart",
        description: "Daggerheart system",
        bootstrap: "bootstrap.md",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.corePlugins).toHaveLength(1);
    expect(registry.corePlugins[0].manifest.name).toBe("corvran");
    const systems = registry.availableSystems();
    const aliases = systems.map((s) => s.alias).sort();
    expect(aliases).toEqual(["d20", "daggerheart"]);
  });

  it("resolves alias to the correct plugin entry", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/d20-system/corvran-plugin.json`]: manifest({
        name: "d20-system",
        type: "system",
        alias: "d20",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    const entry = registry.resolveSystem("d20");
    expect(entry).not.toBeNull();
    expect(entry!.manifest.name).toBe("d20-system");
    expect(entry!.path).toContain("d20-system");
  });

  it("returns null for unrecognized alias", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/d20-system/corvran-plugin.json`]: manifest({
        name: "d20-system",
        type: "system",
        alias: "d20",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.resolveSystem("pathfinder")).toBeNull();
  });

  it("availableSystems returns SystemInfo for system plugins with description", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/corvran/corvran-plugin.json`]: manifest({
        name: "corvran",
        type: "core",
        alias: "corvran",
      }),
      [`${PLUGINS_DIR}/d20-system/corvran-plugin.json`]: manifest({
        name: "d20-system",
        type: "system",
        alias: "d20",
        description: "Classic d20 fantasy",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.availableSystems()).toEqual([
      { alias: "d20", description: "Classic d20 fantasy" },
    ]);
  });

  it("availableSystems excludes system plugins without description and warns", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/d20-system/corvran-plugin.json`]: manifest({
        name: "d20-system",
        type: "system",
        alias: "d20",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );
    expect(registry.availableSystems()).toEqual([]);
    expect(
      warnings.some((w) => w.includes("no description") && w.includes("d20-system")),
    ).toBe(true);
  });

  it("detects duplicate alias and warns naming both plugins", async () => {
    const warnings: string[] = [];
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/alpha/corvran-plugin.json`]: manifest({
        name: "alpha",
        type: "system",
        alias: "shared-alias",
      }),
      [`${PLUGINS_DIR}/beta/corvran-plugin.json`]: manifest({
        name: "beta",
        type: "system",
        alias: "shared-alias",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps, (msg) =>
      warnings.push(msg),
    );

    expect(
      warnings.some(
        (w) =>
          w.includes("shared-alias") &&
          w.includes("alpha") &&
          w.includes("beta"),
      ),
    ).toBe(true);

    // The second plugin wins (deterministic from sorted readDir)
    const entry = registry.resolveSystem("shared-alias");
    expect(entry).not.toBeNull();
  });

  it("resolveSystem returns null for core plugin alias", async () => {
    const fileOps = createMockFileOps({
      [`${PLUGINS_DIR}/corvran/corvran-plugin.json`]: manifest({
        name: "corvran",
        type: "core",
        alias: "corvran",
      }),
    });

    const registry = await buildPluginRegistry(PLUGINS_DIR, fileOps);
    expect(registry.resolveSystem("corvran")).toBeNull();
  });
});
