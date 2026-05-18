import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolve } from "node:path";
import { readdir, readFile as fsReadFile, writeFile as fsWriteFile, appendFile as fsAppendFile, stat, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { completeSimple } from "@earendil-works/pi-ai";
import type { FileOps, RouteModule } from "./types";
import { createAdventureService } from "./services/adventure-service";
import { createAdventureRoutes } from "./routes/adventure-routes";
import { createHealthRoutes } from "./routes/health-routes";
import { createHelpRoutes } from "./registry";
import { createHistoryService } from "./services/history-service";
import {
  createSessionRunner,
  resolveModel,
  type SessionRunner,
} from "./services/session-runner";
import type { PluginRegistry } from "./services/plugin-registry";
import {
  createCompactionService,
  type CompactionService,
  type SummarizeFn,
} from "./services/compaction-service";
import type { CompactionConfig } from "./routes/adventure-routes";
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
    async stat(path: string): Promise<{ mtime: Date; isDirectory: boolean } | null> {
      try {
        const s = await stat(path);
        return { mtime: s.mtime, isDirectory: s.isDirectory() };
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
    async readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]> {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "directory" : "file",
      }));
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
  /** Pre-built session runner. When omitted, one is built using the production pi-agent path. */
  sessionRunner?: SessionRunner;
  /** Pre-built compaction service. When omitted, one is built using pi-ai's completeSimple. */
  compactionService?: CompactionService;
  /** Default model alias or "provider/modelId" for the GM agent. */
  model?: string;
  /** Default model alias or "provider/modelId" for compaction summarization. */
  compactionModel?: string;
  /** Disable AI integration entirely (no session runner, no compaction). */
  noAi?: boolean;
  pluginRegistry?: PluginRegistry;
}

/** Production summarize fn backed by pi-ai's completeSimple. One-shot LLM call. */
function createSummarizeFn(modelString: string): SummarizeFn {
  const model = resolveModel(modelString);
  return async ({ systemPrompt, text, signal }) => {
    const message = await completeSimple(
      model,
      {
        systemPrompt,
        messages: [{ role: "user", content: text, timestamp: Date.now() }],
      },
      { signal },
    );
    const out = message.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("");
    if (!out) {
      throw new Error("Summarization returned no text content");
    }
    return out;
  };
}

export function createApp(deps?: AppDeps): Hono {
  const fileOps = deps?.fileOps ?? createRealFileOps();
  // Only resolve environment config when deps don't already provide adventuresPath
  const config = !deps?.adventuresPath ? resolveConfig() : undefined;
  const adventuresPath = deps?.adventuresPath ?? config!.adventuresPath;

  const adventureService = createAdventureService({ fileOps, adventuresPath });
  const historyService = createHistoryService({ fileOps });

  const compactionModel = deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku";
  const gmModel = deps?.model ?? process.env.MODEL ?? "sonnet";

  // Production wiring: build compaction + session runner from the pi-agent path.
  // Tests inject `noAi: true` to skip AI integration entirely, or pass pre-built
  // sessionRunner/compactionService for narrower integration tests.
  let compactionService: CompactionService | undefined = deps?.compactionService;
  if (!compactionService && !deps?.noAi) {
    compactionService = createCompactionService({
      fileOps,
      summarize: createSummarizeFn(compactionModel),
    });
  }

  let sessionRunner: SessionRunner | undefined = deps?.sessionRunner;
  if (!sessionRunner && !deps?.noAi) {
    sessionRunner = createSessionRunner({
      config: { model: gmModel },
      fileOps,
      compactionService,
    });
  }

  const compactionConfig: CompactionConfig | undefined = compactionService
    ? {
        historyThreshold: parseInt(process.env.HISTORY_COMPACT_THRESHOLD || "150000", 10),
        worldThreshold: parseInt(process.env.WORLD_COMPACT_THRESHOLD || "200000", 10),
      }
    : undefined;

  const adventureModule = createAdventureRoutes({
    adventureService,
    historyService,
    sessionRunner,
    compactionService,
    compactionConfig,
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
