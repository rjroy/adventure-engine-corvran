import { Hono } from "hono";
import type { OperationDefinition, RouteModule } from "../types";

export function createHealthRoutes(): RouteModule {
  const routes = new Hono();

  routes.get("/health", (c) => {
    return c.json({ status: "ok", version: "0.1.0" });
  });

  const operations: OperationDefinition[] = [
    {
      operationId: "system.health",
      name: "health",
      description: "Check daemon health status",
      invocation: { method: "GET", path: "/health" },
      hierarchy: { root: "system", feature: "health" },
      idempotent: true,
    },
  ];

  return { routes, operations };
}
