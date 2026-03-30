import type { FileOps } from "../types.js";

export interface PluginManifest {
  name: string;
  type: "core" | "system";
  aliases: string[];
  bootstrap?: string;
}

export interface PluginEntry {
  manifest: PluginManifest;
  path: string;
}

export interface PluginRegistry {
  corePlugins: PluginEntry[];
  resolveSystem(alias: string): PluginEntry | null;
  availableAliases(): string[];
}

const MANIFEST_FILE = "corvran-plugin.json";

function isValidManifest(
  data: unknown,
): data is PluginManifest {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (obj.type !== "core" && obj.type !== "system") return false;
  if (!Array.isArray(obj.aliases)) return false;
  return true;
}

export async function buildPluginRegistry(
  pluginsDir: string,
  fileOps: FileOps,
  warn: (msg: string) => void = console.warn,
): Promise<PluginRegistry> {
  const corePlugins: PluginEntry[] = [];
  const aliasMap = new Map<string, PluginEntry>();

  const dirs = await fileOps.readDir(pluginsDir);

  for (const dir of dirs) {
    const pluginPath = fileOps.resolvePath(pluginsDir, dir);
    const manifestPath = fileOps.resolvePath(pluginPath, MANIFEST_FILE);

    if (!(await fileOps.fileExists(manifestPath))) {
      continue;
    }

    let raw: string;
    try {
      raw = await fileOps.readFile(manifestPath);
    } catch {
      warn(`[plugin-registry] Failed to read ${manifestPath}, skipping`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      warn(`[plugin-registry] Invalid JSON in ${manifestPath}, skipping`);
      continue;
    }

    if (!isValidManifest(parsed)) {
      warn(
        `[plugin-registry] Invalid manifest in ${manifestPath} (missing required fields), skipping`,
      );
      continue;
    }

    const entry: PluginEntry = { manifest: parsed, path: pluginPath };

    if (parsed.type === "core") {
      corePlugins.push(entry);
    }

    for (const alias of parsed.aliases) {
      const existing = aliasMap.get(alias);
      if (existing) {
        warn(
          `[plugin-registry] Duplicate alias "${alias}" claimed by "${existing.manifest.name}" and "${parsed.name}"`,
        );
      }
      aliasMap.set(alias, entry);
    }
  }

  return {
    corePlugins,
    resolveSystem(alias: string): PluginEntry | null {
      const entry = aliasMap.get(alias);
      if (!entry || entry.manifest.type !== "system") return null;
      return entry;
    },
    availableAliases(): string[] {
      const aliases: string[] = [];
      for (const [alias, entry] of aliasMap) {
        if (entry.manifest.type === "system") {
          aliases.push(alias);
        }
      }
      return aliases;
    },
  };
}
