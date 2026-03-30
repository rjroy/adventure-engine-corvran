import { Hono } from "hono";
import type { PluginRegistry } from "../services/plugin-registry.js";
import type { OperationDefinition, RouteModule } from "../types.js";

export function createSystemRoutes(deps: {
  pluginRegistry: PluginRegistry;
}): RouteModule {
  const { pluginRegistry } = deps;
  const routes = new Hono();

  routes.get("/systems", (c) => {
    const systems = pluginRegistry.availableSystems();
    return c.json({ systems });
  });

  const operations: OperationDefinition[] = [{
    operationId: "systems.list",
    name: "list",
    description: "List available RPG systems",
    invocation: { method: "GET", path: "/systems" },
    hierarchy: { root: "systems", feature: "discovery" },
    idempotent: true,
  }];

  return { routes, operations };
}
