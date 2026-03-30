import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { MessageRequestSchema, CreateAdventureRequestSchema } from "@corvran/shared";
import { type AdventureService, DuplicateAdventureError } from "../services/adventure-service.js";
import type { HistoryService } from "../services/history-service.js";
import type { SessionRunner } from "../services/session-runner.js";
import type { PluginRegistry } from "../services/plugin-registry.js";
import { assembleSystemPrompt } from "../services/prompt-service.js";
import { parseAdventureConfig } from "../services/adventure-config.js";
import type { FileOps, OperationDefinition, RouteModule } from "../types.js";

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
  pluginRegistry?: PluginRegistry;
  fileOps?: FileOps;
}): RouteModule {
  const { adventureService, historyService, sessionRunner, pluginRegistry, fileOps } = deps;
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
    const history = await historyService.readHistory(adventurePath);

    // Append player message (REQ-MVP-16 step 1)
    await historyService.appendPlayerMessage(adventurePath, message);

    // Resolve plugins per-adventure (REQ-SYS-19)
    const pluginPaths: string[] = pluginRegistry
      ? pluginRegistry.corePlugins.map((p) => p.path)
      : [];
    let systemBootstrap: string | null = null;

    if (pluginRegistry && fileOps) {
      const adventureConfigPath = fileOps.resolvePath(adventurePath, "adventure.md");
      let systemAlias: string | null = null;
      if (await fileOps.fileExists(adventureConfigPath)) {
        const content = await fileOps.readFile(adventureConfigPath);
        const config = parseAdventureConfig(content);
        systemAlias = config.system;
        if (config.warning) {
          console.warn(`[adventure-routes] ${id}: ${config.warning}`);
        }
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

    // Assemble system prompt (REQ-MVP-12, REQ-SYS-22)
    const systemPrompt = assembleSystemPrompt({
      character: adventure.character,
      world: adventure.world,
      history,
      systemBootstrap,
      concept: adventure.concept ?? null,
    });

    // Set up abort for client disconnect
    const abortController = new AbortController();

    // Run the SDK query with per-adventure plugin paths (REQ-SYS-18)
    const queryResult = sessionRunner.runQuery({
      systemPrompt,
      playerMessage: message,
      adventurePath,
      pluginPaths,
      abortController,
    });

    // Stream SSE events
    return streamSSE(c, async (stream) => {
      let accumulatedText = "";
      // Track pending tool invocations so we can pair them with results
      const pendingTools = new Map<string, string>();

      stream.onAbort(() => {
        abortController.abort();
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
  ];

  return { routes, operations };
}
