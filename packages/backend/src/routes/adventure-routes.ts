import { Hono } from "hono";
import type { AdventureService } from "../services/adventure-service.js";
import type { OperationDefinition, RouteModule } from "../types.js";

function isValidId(id: string): boolean {
  return !id.includes("/") && !id.includes("..");
}

export function createAdventureRoutes(deps: {
  adventureService: AdventureService;
}): RouteModule {
  const { adventureService } = deps;
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

    const history = await adventureService.getHistory(id);
    return c.json(history);
  });

  // Stub for Phase 3: message endpoint
  routes.post("/adventures/:id/message", async (c) => {
    const id = c.req.param("id");
    if (!isValidId(id)) {
      return c.json({ error: "Invalid adventure ID" }, 400);
    }
    return c.json({ error: "Not implemented" }, 501);
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
