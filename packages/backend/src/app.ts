import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolve } from "node:path";
import { readdir, readFile as fsReadFile, writeFile as fsWriteFile, appendFile as fsAppendFile, stat, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileOps, RouteModule } from "./types.js";
import { createAdventureService } from "./services/adventure-service.js";
import { createAdventureRoutes } from "./routes/adventure-routes.js";
import { createHealthRoutes } from "./routes/health-routes.js";
import { createHelpRoutes } from "./registry.js";
import { createHistoryService } from "./services/history-service.js";
import { createSessionRunner, type QueryFn, type SessionRunner } from "./services/session-runner.js";

/** Production FileOps backed by node:fs/promises */
function createRealFileOps(): FileOps {
  return {
    async readDir(path: string): Promise<string[]> {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    },
    async readFile(path: string): Promise<string> {
      return fsReadFile(path, "utf-8");
    },
    async writeFile(path: string, content: string): Promise<void> {
      await mkdir(dirname(path), { recursive: true });
      await fsWriteFile(path, content, "utf-8");
    },
    async appendFile(path: string, content: string): Promise<void> {
      await mkdir(dirname(path), { recursive: true });
      await fsAppendFile(path, content, "utf-8");
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
  corvranHome: string;
  adventuresPath: string;
  pluginPaths: string[];
}

export function resolveConfig(): AppConfig {
  const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
  const corvranHome = resolve(process.env.CORVRAN_HOME || `${home}/.corvran`);
  const adventuresPath = resolve(process.env.ADVENTURES_PATH || `${corvranHome}/adventures`);
  const repoRoot = process.cwd();
  const pluginPaths = [
    resolve(repoRoot, "plugins/corvran"),
    resolve(repoRoot, "plugins/d20-system"),
    resolve(repoRoot, "plugins/daggerheart-system"),
  ];
  return { corvranHome, adventuresPath, pluginPaths };
}

export interface AppDeps {
  fileOps?: FileOps;
  adventuresPath?: string;
  queryFn?: QueryFn;
  model?: string;
}

export function createApp(deps?: AppDeps): Hono {
  const fileOps = deps?.fileOps ?? createRealFileOps();
  // Only resolve environment config when deps don't provide the values we need
  const config = (!deps?.adventuresPath || !deps?.queryFn) ? resolveConfig() : undefined;
  const adventuresPath = deps?.adventuresPath ?? config!.adventuresPath;

  const adventureService = createAdventureService({ fileOps, adventuresPath });
  const historyService = createHistoryService({ fileOps });

  // Session runner is only created when a queryFn is provided.
  // Tests that don't need SDK integration pass their own queryFn.
  // Production passes the real SDK query function.
  let sessionRunner: SessionRunner | undefined;
  if (deps?.queryFn) {
    sessionRunner = createSessionRunner({
      queryFn: deps.queryFn,
      config: {
        pluginPaths: config?.pluginPaths ?? [],
        model: deps.model ?? process.env.MODEL ?? "claude-sonnet-4-5-20250929",
      },
    });
  }

  const adventureModule = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
  });
  const healthModule = createHealthRoutes();

  const contentModules: RouteModule[] = [adventureModule, healthModule];
  const helpModule = createHelpRoutes(contentModules);

  const app = new Hono();

  // Request logging middleware
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[daemon] ${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
  });

  const tailscaleHostname = process.env.TAILSCALE_HOSTNAME || "gsai.raptor-piranha.ts.net";
  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:3000",
        `http://${tailscaleHostname}:3000`,
        `https://${tailscaleHostname}`,
      ],
    }),
  );

  for (const mod of [...contentModules, helpModule]) {
    app.route("/", mod.routes);
  }

  return app;
}
