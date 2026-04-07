import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { MessageRequestSchema, CreateAdventureRequestSchema } from "@corvran/shared";
import type { FileTreeNode } from "@corvran/shared";
import { type AdventureService, DuplicateAdventureError } from "../services/adventure-service";
import type { HistoryService } from "../services/history-service";
import type { SessionRunner } from "../services/session-runner";
import type { PluginRegistry } from "../services/plugin-registry";
import { assembleSystemPrompt } from "../services/prompt-service";
import { parseAdventureConfig } from "../services/adventure-config";
import { type CompactionService, CompactionInProgressError, HistoryTooShortError } from "../services/compaction-service";
import type { FileOps, OperationDefinition, RouteModule } from "../types";

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".csv"]);

export function isBinaryPath(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return !TEXT_EXTENSIONS.has(ext);
}

export async function buildFileTree(
  fileOps: FileOps,
  dirPath: string,
  relativePath: string,
): Promise<FileTreeNode[]> {
  const entries = await fileOps.readDirEntries(dirPath);

  // Sort: directories first (alpha), then files (alpha)
  const dirs = entries.filter((e) => e.type === "directory").sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((e) => e.type === "file").sort((a, b) => a.name.localeCompare(b.name));

  const nodes: FileTreeNode[] = [];

  for (const dir of dirs) {
    const childRelPath = relativePath ? `${relativePath}/${dir.name}` : dir.name;
    const childAbsPath = fileOps.resolvePath(dirPath, dir.name);
    const children = await buildFileTree(fileOps, childAbsPath, childRelPath);
    nodes.push({ name: dir.name, path: childRelPath, type: "directory", children });
  }

  for (const file of files) {
    const childRelPath = relativePath ? `${relativePath}/${file.name}` : file.name;
    nodes.push({ name: file.name, path: childRelPath, type: "file" });
  }

  return nodes;
}

export interface CompactionConfig {
  historyThreshold: number;
  worldThreshold: number;
}

function isValidId(id: string): boolean {
  return !id.includes("/") && !id.includes("..");
}

/** Check if an SDK error string indicates context/token overflow */
function isContextOverflowError(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes("context") || lower.includes("token") || lower.includes("too long");
}

export function createAdventureRoutes(deps: {
  adventureService: AdventureService;
  historyService?: HistoryService;
  sessionRunner?: SessionRunner;
  compactionService?: CompactionService;
  compactionConfig?: CompactionConfig;
  pluginRegistry?: PluginRegistry;
  fileOps?: FileOps;
}): RouteModule {
  const { adventureService, historyService, sessionRunner, compactionService, compactionConfig, pluginRegistry, fileOps } = deps;
  const routes = new Hono();

  routes.get("/adventures", async (c) => {
    const adventures = await adventureService.listAdventures();
    return c.json({ adventures });
  });

  routes.get("/adventures/:id", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }
    return c.json(adventure);
  });

  routes.get("/adventures/:id/history", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    const history = await adventureService.getHistory(id);
    return c.json(history);
  });

  routes.get("/adventures/:id/files", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }
    if (!fileOps) {
      return c.json({ error: "File operations unavailable" }, 503);
    }

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    const adventurePath = adventureService.getAdventurePath(id);
    const tree = await buildFileTree(fileOps, adventurePath, "");
    return c.json({ tree });
  });

  routes.get("/adventures/:id/file", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }
    if (!fileOps) {
      return c.json({ error: "File operations unavailable" }, 503);
    }

    const relativePath = c.req.query("path");
    if (!relativePath) {
      return c.json({ error: "Missing required query parameter: path" }, 400);
    }

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    // Path traversal check (REQ-VF-7)
    const adventurePath = adventureService.getAdventurePath(id);
    const resolvedPath = fileOps.resolvePath(adventurePath, relativePath);
    const normalizedRoot = fileOps.resolvePath(adventurePath);
    if (!resolvedPath.startsWith(normalizedRoot + "/")) {
      return c.json({ error: "Invalid path" }, 400);
    }

    // Reject directory requests (REQ-VF-5 — endpoint returns content of a single file)
    const pathStat = await fileOps.stat(resolvedPath);
    if (pathStat?.isDirectory) {
      return c.json({ error: "File not found" }, 404);
    }

    // Binary classification (REQ-VF-9)
    if (isBinaryPath(relativePath)) {
      return c.json({ path: relativePath, content: null, binary: true });
    }

    // File existence check (REQ-VF-8)
    if (!(await fileOps.fileExists(resolvedPath))) {
      return c.json({ error: "File not found" }, 404);
    }

    const content = await fileOps.readFile(resolvedPath);
    return c.json({ path: relativePath, content, binary: false });
  });

  routes.post("/adventures", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = CreateAdventureRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Name is required (1-100 chars). Concept max 1000 chars." }, 400);
    }

    const { name, system, concept } = parsed.data;

    if (system !== null) {
      if (!pluginRegistry) {
        return c.json({ error: "System validation unavailable" }, 503);
      }
      const resolved = pluginRegistry.resolveSystem(system);
      if (!resolved) {
        const available = pluginRegistry.availableSystems().map(s => s.alias).join(", ");
        return c.json({
          error: `System '${system}' is not installed. Available systems: ${available}.`,
        }, 400);
      }
    }

    try {
      const adventure = await adventureService.createAdventure({ name, system, concept });
      return c.json({ adventure }, 201);
    } catch (err) {
      if (err instanceof DuplicateAdventureError) {
        return c.json({ error: err.message }, 409);
      }
      throw err;
    }
  });

  routes.post("/adventures/:id/message", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }

    if (!historyService || !sessionRunner) {
      return c.json({ error: "AI integration not configured" }, 503);
    }

    // Validate request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = MessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Message is required and must be non-empty" }, 400);
    }
    const { message } = parsed.data;

    // Verify adventure exists
    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    // Read adventure state (fresh each turn per REQ-MVP-17)
    const adventurePath = adventureService.getAdventurePath(id);
    let history = await historyService.readHistory(adventurePath);

    // Resolve plugins per-adventure (REQ-SYS-19)
    const pluginPaths: string[] = pluginRegistry
      ? pluginRegistry.corePlugins.map((p) => p.path)
      : [];
    let systemBootstrap: string | null = null;
    let artStyle: string | null = null;

    if (pluginRegistry && fileOps) {
      const adventureConfigPath = fileOps.resolvePath(adventurePath, "adventure.md");
      let systemAlias: string | null = null;
      if (await fileOps.fileExists(adventureConfigPath)) {
        const content = await fileOps.readFile(adventureConfigPath);
        const config = parseAdventureConfig(content);
        systemAlias = config.system;
        artStyle = config.artStyle ?? null;
        if (config.warning) {
          console.warn(`[adventure-routes] ${id}: ${config.warning}`);
        }
      }

      // Override art style if artstyle.md exists
      const artstyleConfigPath = fileOps.resolvePath(adventurePath, "artstyle.md");
      if (await fileOps.fileExists(artstyleConfigPath)) {
        artStyle = (await fileOps.readFile(artstyleConfigPath)).trim();
      }

      if (systemAlias) {
        const systemPlugin = pluginRegistry.resolveSystem(systemAlias);
        if (!systemPlugin) {
          const available = pluginRegistry.availableSystems().map(s => s.alias).join(", ");
          return c.json({
            error: `Adventure '${id}' declares system '${systemAlias}' but no matching plugin is installed. Available systems: ${available}.`,
          }, 400);
        }
        pluginPaths.push(systemPlugin.path);

        // Read bootstrap if declared (REQ-SYS-23)
        if (systemPlugin.manifest.bootstrap) {
          const bootstrapPath = fileOps.resolvePath(
            systemPlugin.path,
            systemPlugin.manifest.bootstrap,
          );
          if (await fileOps.fileExists(bootstrapPath)) {
            systemBootstrap = await fileOps.readFile(bootstrapPath);
          }
        }
      }
    }

    // Stream SSE events with runQuery inside streamSSE (Architectural Decision 2)
    return streamSSE(c, async (stream) => {
      // Re-bind inside callback so TS narrows after the null guard above
      let currentAdventure = adventure;
      let accumulatedText = "";
      // Track pending tool invocations so we can pair them with results
      const pendingTools = new Map<string, string>();

      const abortController = new AbortController();
      stream.onAbort(() => {
        abortController.abort();
      });

      // Threshold checks inside streamSSE so we can emit events (REQ-COMP-43, REQ-COMP-26)
      if (compactionService && compactionConfig) {
        // History threshold (REQ-COMP-7, REQ-COMP-8)
        if (history && history.length >= compactionConfig.historyThreshold) {
          try {
            const result = await compactionService.compactHistory(adventurePath, {
              character: currentAdventure.character ?? undefined,
              world: currentAdventure.world ?? undefined,
            });
            // Emit compacted event (REQ-COMP-42, REQ-COMP-43)
            await stream.writeSSE({
              event: "compacted",
              data: JSON.stringify(result),
            });
            history = await historyService.readHistory(adventurePath);
          } catch (err) {
            // REQ-COMP-46: failed compaction emits no event
            if (err instanceof CompactionInProgressError) {
              // REQ-COMP-29: skip and proceed with original
            } else {
              // REQ-COMP-41: Haiku failure, archive reversed, proceed with original
              console.warn(`[adventure-routes] ${id}: history compaction failed, proceeding with original`, err);
            }
          }
        }

        // World threshold (REQ-COMP-9, REQ-COMP-10: history-first ordering)
        // No SSE event for world compaction (REQ-COMP-47)
        if (currentAdventure.world && currentAdventure.world.length >= compactionConfig.worldThreshold) {
          try {
            await compactionService.compactWorld(adventurePath);
            const refreshed = await adventureService.getAdventure(id);
            if (refreshed) {
              currentAdventure = refreshed;
            }
          } catch (err) {
            if (err instanceof CompactionInProgressError) {
              // REQ-COMP-29: skip and proceed with original
            } else {
              console.warn(`[adventure-routes] ${id}: world compaction failed, proceeding with original`, err);
            }
          }
        }
      }

      // Append player message after threshold checks (REQ-COMP-26)
      await historyService.appendPlayerMessage(adventurePath, message);

      // Assemble system prompt with possibly-compacted state (REQ-COMP-13)
      const systemPrompt = assembleSystemPrompt({
        character: currentAdventure.character,
        world: currentAdventure.world,
        history,
        systemBootstrap,
        concept: currentAdventure.concept ?? null,
        compactionEnabled: !!compactionService,
      });

      // Run the SDK query with per-adventure plugin paths (REQ-SYS-18)
      const queryResult = sessionRunner.runQuery({
        systemPrompt,
        playerMessage: message,
        adventureId: id,
        adventurePath,
        artStyle,
        pluginPaths,
        abortController,
        setMood: (mood) => adventureService.setMood(id, mood),
        emitMoodEvent: (payload) =>
          stream.writeSSE({ event: "mood", data: JSON.stringify(payload) }),
        emitCompactedEvent: (result) =>
          stream.writeSSE({ event: "compacted", data: JSON.stringify(result) }),
      });

      try {
        for await (const msg of queryResult) {
          if (msg.type === "stream_event") {
            // Text deltas from streaming
            const event = msg.event;
            if (
              event.type === "content_block_delta" &&
              "delta" in event &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              accumulatedText += text;
              await stream.writeSSE({ event: "text", data: JSON.stringify({ text }) });
            }
          } else if (msg.type === "assistant") {
            // Collect tool invocations; defer emission until we have results
            for (const block of msg.message.content) {
              if (block.type === "tool_use") {
                pendingTools.set(block.id, block.name);
              }
            }
          } else if (msg.type === "user") {
            // Pair tool results with their invocations and emit
            if (Array.isArray(msg.message.content)) {
              for (const block of msg.message.content) {
                if (block.type === "tool_result") {
                  const toolName = pendingTools.get(block.tool_use_id) ?? "tool";
                  pendingTools.delete(block.tool_use_id);
                  // Suppress set_mood and compact_history from tool_use SSE events.
                  // These tools have dedicated SSE event channels (mood, compacted).
                  // MCP tools are prefixed as mcp__{server}__{tool} by the SDK.
                  if (toolName === "set_mood" || toolName === "mcp__corvran__set_mood") continue;
                  if (toolName === "compact_history" || toolName === "mcp__corvran__compact_history") continue;
                  const result = typeof block.content === "string"
                    ? block.content
                    : JSON.stringify(block.content);
                  await stream.writeSSE({
                    event: "tool_use",
                    data: JSON.stringify({ name: toolName, result }),
                  });
                }
              }
            }
          } else if (msg.type === "result") {
            if (msg.subtype === "success") {
              // Use the result field for the full response (more reliable than accumulated text)
              const fullResponse = msg.result;
              await historyService.appendGMResponse(adventurePath, fullResponse);
              await stream.writeSSE({
                event: "done",
                data: JSON.stringify({ fullResponse }),
              });
            } else {
              // Error result
              const errors = msg.errors;
              const overflowError = errors.find(isContextOverflowError);
              const errorMessage = overflowError
                ? "Adventure history is too long. Edit history.md to shorten it."
                : errors.join("; ");
              await stream.writeSSE({
                event: "error",
                data: JSON.stringify({ error: errorMessage }),
              });
            }
          }
        }
      } catch (err: unknown) {
        // Handle AbortError (client disconnect)
        if (err instanceof Error && err.name === "AbortError") {
          // Append partial response to history
          if (accumulatedText) {
            await historyService.appendGMResponse(adventurePath, accumulatedText);
          }
          return;
        }

        // Handle other errors
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ error: errorMessage }),
        });
      }
    });
  });

  // Serve mood image for an adventure (REQ-MOOD-25)
  routes.get("/adventures/:id/mood-image", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) return c.json({ error: "Invalid adventure ID" }, 400);
    if (!fileOps) return c.json({ error: "File operations unavailable" }, 503);

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    const adventurePath = adventureService.getAdventurePath(id);
    const moodImagePath = fileOps.resolvePath(adventurePath, "mood.png");

    if (!(await fileOps.fileExists(moodImagePath))) {
      return c.json({ error: "No mood image" }, 404);
    }

    const imageBytes = await fileOps.readFileBytes(moodImagePath);
    return new Response(imageBytes as unknown as BodyInit, {
      headers: { "Content-Type": "image/png" },
    });
  });

  // POST /adventures/:id/compact (REQ-COMP-15, REQ-COMP-28)
  routes.post("/adventures/:id/compact", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }

    if (!compactionService) {
      return c.json({ error: "Compaction not configured" }, 503);
    }

    const adventure = await adventureService.getAdventure(id);
    if (!adventure) {
      return c.json({ error: "Adventure not found" }, 404);
    }

    const adventurePath = adventureService.getAdventurePath(id);
    try {
      const result = await compactionService.compactHistory(adventurePath, {
        character: adventure.character ?? undefined,
        world: adventure.world ?? undefined,
      });
      return c.json(result);
    } catch (err) {
      if (err instanceof HistoryTooShortError) {
        return c.json({ error: "History is empty or too short to compact." }, 400);
      }
      if (err instanceof CompactionInProgressError) {
        return c.json({ error: "Compaction is already running for this adventure." }, 409);
      }
      const reason = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: `Compaction failed: ${reason}` }, 500);
    }
  });

  const operations: OperationDefinition[] = [
    {
      operationId: "adventures.list",
      name: "list",
      description: "List all available adventures",
      invocation: { method: "GET", path: "/adventures" },
      hierarchy: { root: "adventures", feature: "discovery" },
      idempotent: true,
    },
    {
      operationId: "adventures.get",
      name: "get",
      description: "Get adventure details by ID",
      invocation: { method: "GET", path: "/adventures/:id" },
      hierarchy: { root: "adventures", feature: "detail" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
      ],
      idempotent: true,
    },
    {
      operationId: "adventures.history.get",
      name: "history",
      description: "Get adventure conversation history",
      invocation: { method: "GET", path: "/adventures/:id/history" },
      hierarchy: { root: "adventures", feature: "history" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
      ],
      idempotent: true,
    },
    {
      operationId: "adventures.create",
      name: "create",
      description: "Create a new adventure",
      invocation: { method: "POST", path: "/adventures" },
      hierarchy: { root: "adventures", feature: "creation" },
      requestSchema: CreateAdventureRequestSchema,
      idempotent: false,
    },
    {
      operationId: "adventures.message.send",
      name: "message",
      description: "Send a message in an adventure (streaming SSE response)",
      invocation: { method: "POST", path: "/adventures/:id/message" },
      hierarchy: { root: "adventures", feature: "play" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
        { name: "message", in: "body", required: true, description: "Player message text" },
      ],
      idempotent: false,
    },
    {
      operationId: "adventures.moodImage.get",
      name: "moodImage",
      description: "Get the current mood image for an adventure",
      invocation: { method: "GET", path: "/adventures/:id/mood-image" },
      hierarchy: { root: "adventures", feature: "mood" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
      ],
      idempotent: true,
    },
    {
      operationId: "adventures.compact",
      name: "compact",
      description: "Compact adventure history (archive and create recap)",
      invocation: { method: "POST", path: "/adventures/:id/compact" },
      hierarchy: { root: "adventures", feature: "compaction" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
      ],
      idempotent: false,
    },
    {
      operationId: "adventures.files.list",
      name: "files",
      description: "Get the complete file tree for an adventure",
      invocation: { method: "GET", path: "/adventures/:id/files" },
      hierarchy: { root: "adventures", feature: "files" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
      ],
      idempotent: true,
    },
    {
      operationId: "adventures.file.get",
      name: "file",
      description: "Get the content of a single adventure file",
      invocation: { method: "GET", path: "/adventures/:id/file" },
      hierarchy: { root: "adventures", feature: "files" },
      parameters: [
        { name: "id", in: "path", required: true, description: "Adventure directory name" },
        { name: "path", in: "query", required: true, description: "Relative path to file" },
      ],
      idempotent: true,
    },
  ];

  return { routes, operations };
}
