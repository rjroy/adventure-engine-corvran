import { Hono } from "hono";
import type { OperationDefinition, RouteModule } from "./types";

export interface OperationTree {
  [root: string]: {
    [feature: string]: OperationDefinition[];
  };
}

export function buildOperationTree(operations: OperationDefinition[]): OperationTree {
  const tree: OperationTree = {};
  for (const op of operations) {
    const { root, feature } = op.hierarchy;
    if (!tree[root]) tree[root] = {};
    if (!tree[root][feature]) tree[root][feature] = [];
    tree[root][feature].push(op);
  }
  return tree;
}

export function createHelpRoutes(modules: RouteModule[]): RouteModule {
  const helpOp: OperationDefinition = {
    operationId: "system.help",
    name: "help",
    description: "List all available operations",
    invocation: { method: "GET", path: "/help" },
    hierarchy: { root: "system", feature: "discovery" },
    idempotent: true,
  };

  const allOperations = [...modules.flatMap((m) => m.operations), helpOp];
  const tree = buildOperationTree(allOperations);

  const routes = new Hono();

  routes.get("/help", (c) => {
    return c.json({ operations: allOperations, tree });
  });

  return { routes, operations: [helpOp] };
}
