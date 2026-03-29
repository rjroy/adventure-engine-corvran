import { Hono } from "hono";
import { resolve } from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import type { FileOps, RouteModule } from "./types.js";
import { createAdventureService } from "./services/adventure-service.js";
import { createAdventureRoutes } from "./routes/adventure-routes.js";
import { createHealthRoutes } from "./routes/health-routes.js";
import { createHelpRoutes } from "./registry.js";

/** Production FileOps backed by node:fs/promises */
function createRealFileOps(): FileOps {
  return {
    async readDir(path: string): Promise<string[]> {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    },
    async readFile(path: string): Promise<string> {
      return readFile(path, "utf-8");
    },
    async fileExists(path: string): Promise<boolean> {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    resolvePath(...segments: string[]): string {
      return resolve(...segments);
    },
  };
}

export interface AppConfig {
  adventuresPath: string;
  pluginPaths: string[];
}

export function resolveConfig(): AppConfig {
  const adventuresPath = resolve(process.env.ADVENTURES_PATH || "./adventures");
  const repoRoot = process.cwd();
  const pluginPaths = [
    resolve(repoRoot, "plugins/corvran"),
    resolve(repoRoot, "plugins/d20-system"),
    resolve(repoRoot, "plugins/daggerheart-system"),
  ];
  return { adventuresPath, pluginPaths };
}

export function createApp(deps?: { fileOps?: FileOps; adventuresPath?: string }): Hono {
  const config = resolveConfig();
  const fileOps = deps?.fileOps ?? createRealFileOps();
  const adventuresPath = deps?.adventuresPath ?? config.adventuresPath;

  const adventureService = createAdventureService({ fileOps, adventuresPath });

  const adventureModule = createAdventureRoutes({ adventureService });
  const healthModule = createHealthRoutes();

  const contentModules: RouteModule[] = [adventureModule, healthModule];
  const helpModule = createHelpRoutes(contentModules);

  const app = new Hono();
  for (const mod of [...contentModules, helpModule]) {
    app.route("/", mod.routes);
  }

  return app;
}
