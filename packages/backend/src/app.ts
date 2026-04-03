import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolve } from "node:path";
import { readdir, readFile as fsReadFile, writeFile as fsWriteFile, appendFile as fsAppendFile, stat, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileOps, RouteModule } from "./types";
import { createAdventureService } from "./services/adventure-service";
import { createAdventureRoutes } from "./routes/adventure-routes";
import { createHealthRoutes } from "./routes/health-routes";
import { createHelpRoutes } from "./registry";
import { createHistoryService } from "./services/history-service";
import { createSessionRunner, type QueryFn, type SessionRunner } from "./services/session-runner";
import type { PluginRegistry } from "./services/plugin-registry";
import { createCompactionService } from "./services/compaction-service";
import { createSystemRoutes } from "./routes/system-routes";

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
    async stat(path: string): Promise<{ mtime: Date } | null> {
      try {
        const s = await stat(path);
        return { mtime: s.mtime };
      } catch {
        return null;
      }
    },
    async readFileBytes(path: string): Promise<Uint8Array> {
      return new Uint8Array(await fsReadFile(path));
    },
    async deleteFile(path: string): Promise<void> {
      await unlink(path);
    },
    async readFiles(path: string): Promise<string[]> {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((e) => e.isFile()).map((e) => e.name);
    },
    resolvePath(...segments: string[]): string {
      return resolve(...segments);
    },
  };
}

export interface AppConfig {
  corvranHome: string;
  adventuresPath: string;
  pluginsDir: string;
}

export function resolveConfig(): AppConfig {
  const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
  const corvranHome = resolve(process.env.CORVRAN_HOME || `${home}/.corvran`);
  const adventuresPath = resolve(process.env.ADVENTURES_PATH || `${corvranHome}/adventures`);
  const repoRoot = process.cwd();
  const pluginsDir = resolve(repoRoot, "plugins");
  return { corvranHome, adventuresPath, pluginsDir };
}

export interface AppDeps {
  fileOps?: FileOps;
  adventuresPath?: string;
  queryFn?: QueryFn;
  model?: string;
  pluginRegistry?: PluginRegistry;
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
  // Compaction service needs queryFn for Haiku summarization calls
  const compactionService = deps?.queryFn
    ? createCompactionService({ fileOps, queryFn: deps.queryFn })
    : undefined;

  let sessionRunner: SessionRunner | undefined;
  if (deps?.queryFn) {
    sessionRunner = createSessionRunner({
      queryFn: deps.queryFn,
      config: {
        model: deps.model ?? process.env.MODEL ?? "sonnet",
      },
      fileOps,
      compactionService,
    });
  }

  const adventureModule = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
    compactionService,
    pluginRegistry: deps?.pluginRegistry,
    fileOps,
  });
  const healthModule = createHealthRoutes();

  const contentModules: RouteModule[] = [adventureModule, healthModule];

  if (deps?.pluginRegistry) {
    const systemModule = createSystemRoutes({ pluginRegistry: deps.pluginRegistry });
    contentModules.push(systemModule);
  }

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
