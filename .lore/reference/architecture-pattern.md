---
title: Daemon-First Architecture Pattern
status: current
tags: [architecture, reference, portable]
date: 2026-04-04
---

# Daemon-First Architecture Pattern

The daemon is the application. Everything else is a client.

Web, CLI, and agents don't make decisions or hold state. They relay user intent to the daemon and render what comes back. If the daemon stops, there is no application. If a client stops, nothing is lost.

## Hard Constraint: Claude Agent SDK Only

All AI functionality uses `@anthropic-ai/claude-agent-sdk`. No other AI or LLM library is permitted. This means:

- **No `@anthropic-ai/sdk`** (the raw API client). The raw SDK bills per-token. The Agent SDK routes through Claude Code's OAuth, which means no separate API key and no per-token cost.
- **No other LLM libraries** (OpenAI, LangChain, LlamaIndex, etc.). One SDK, one model provider, one integration surface.

This is a cost and architecture constraint, not a preference. The Agent SDK gives us Claude Code integration and OAuth for free. The raw API does not.

The "One Entry Point for SDK Calls" section below describes how SDK usage is structured within the codebase.

## Three Clients, One App

| System | Stack | Role |
|--------|-------|------|
| **Daemon** | Hono on Unix socket via `Bun.serve()` | The application. Owns all state, logic, and coordination. |
| **Web** | Next.js App Router (server + client components) | Read-only UI. Calls daemon REST API for writes. |
| **CLI** | Plain bun scripts | Discovers operations from daemon at runtime. No built-in catalog. |

The daemon runs on a Unix socket (or TCP for cross-platform). Web and CLI never touch the filesystem, config, or internal state directly.

### Why CLI Matters

The CLI isn't a convenience interface. It's what makes the daemon usable by other agents.

An agent with shell access can discover what the daemon offers, invoke operations, and read results without a custom client library. The operations registry and runtime discovery serve this directly: agents learn the surface the same way humans do.

**When you make a thing, you make a CLI.**

## Daemon Internals

### Route/Service Split with DI Factories

Every route file is a factory: `createXRoutes(deps) → RouteModule`. Each factory receives only the slice of dependencies it needs. Production wiring lives in one place, which builds real deps and passes them down.

```typescript
type RouteModule = {
  routes: Hono;
  operations: OperationDefinition[];
};
```

Tests provide mock deps. The app can start with a fallback if production setup fails.

### One Entry Point for SDK Calls

All LLM interaction flows through a single session runner that wraps `@anthropic-ai/claude-agent-sdk`. No direct SDK calls from routes, services, or domain logic.

The runner owns tool resolution, prompt assembly, model selection, and MCP server composition. Callers describe what they need. The runner decides how to talk to the SDK.

This isn't about abstraction for its own sake. When SDK calls scatter across the codebase, every caller reinvents error handling, streaming, and tool resolution. One entry point means one place to fix, observe, and evolve. It also enforces the constraint that all AI interaction goes through the Agent SDK (see "Hard Constraint" above).

### Tool Definitions as DI Factories

Custom tools follow the same factory pattern as routes and services: `createXToolDef(deps) → ToolDefinition`. Each tool factory receives only the callbacks and services it needs. Pure logic is extracted from the tool handler and exported separately for direct testing.

```typescript
// Pure logic, tested without MCP overhead
export function rollDice(input: RollDiceInput, random: () => number): RollDiceOutput { ... }

// Factory wraps pure logic in the SDK's tool() wrapper
export function createDiceToolDef(deps?: { random?: () => number }) {
  return tool("roll_dice", "...", InputSchema, async (args) => {
    const result = rollDice(args, deps?.random ?? Math.random);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
}
```

The session runner composes tool definitions into an MCP server using `createSdkMcpServer()` and passes it to the Agent SDK query. This is how custom tools get surfaced to the AI without scattering SDK integration across tool files.

```typescript
const corvranServer = createSdkMcpServer({
  name: "corvran",
  tools: [diceToolDef, moodToolDef, compactToolDef],
});

return queryFn({
  prompt: playerMessage,
  options: { mcpServers: { corvran: corvranServer }, ... },
});
```

## Operations Registry and CLI Discovery

Routes export `OperationDefinition` objects with hierarchy metadata. The registry builds a navigation tree.

```typescript
interface OperationDefinition {
  operationId: string;          // "project.status.get"
  name: string;                 // "get"
  description: string;
  invocation: { method: string; path: string };
  requestSchema?: ZodType;
  hierarchy: { root: string; feature: string };
  parameters?: OperationParameter[];
  idempotent: boolean;
}
```

CLI fetches the tree from `/help` endpoints. Progressive discovery:

```
mycli help                    → Full tree
mycli project help            → Subtree
mycli project status get      → Operation details
```

The CLI binary contains no operation catalog. The daemon is the source of truth.

## SSE Streaming

Route handlers use Hono's `streamSSE` helper to stream events directly to clients. There is no intermediate EventBus or pub/sub layer. The route handler owns the SSE stream lifecycle: it opens the stream, runs the session query, writes events as they arrive, and closes the stream when the query completes or the client disconnects.

This inline approach works when there's a single consumer per stream (the HTTP client that initiated the request). If you need multiple subscribers or cross-request event delivery, introduce a bus then, not before.

Socket idle timeout must be disabled (`idleTimeout: 0`) for long-lived SSE connections. Bun's type definition for this is overly strict; a type assertion (`0 as never`) may be needed.

## State Model

All durable state is in YAML and markdown files. No database.

Humans can inspect and edit state files directly. This is a feature, not a limitation. When something goes wrong, you open a file and read it.

## Type Boundaries

- **Shared types** live in a common package. Never import from daemon or web packages.
- **Daemon types** stay in the daemon. Consider branded types (e.g., `ProjectId`, `SessionId`) when multiple ID namespaces coexist and could be confused at call sites.
- **Web types** derive from API responses, not from daemon internals.

## Testing Seams

DI factories are the primary testing seam. Every external dependency is injectable:

- **`fileOps`**: A single interface wrapping all filesystem operations (`readFile`, `writeFile`, `readDir`, `fileExists`, `stat`, etc.). Tests provide in-memory implementations. This is the dominant DI seam in practice: most services need filesystem access, and a single interface keeps the injection surface narrow.
- **`queryFn`**: Mock LLM responses (return test event generators that yield the message types your code handles).
- **Service interfaces**: Services like `adventureService`, `historyService`, `compactionService` are injected into route factories. Tests can stub individual service methods without replacing the filesystem layer.
- Hono's `app.request()` test client with injected deps for integration-level route testing.
- `fs.mkdtemp()` for temp directories, env vars for path isolation when testing against real filesystems.

**Type export conventions:** Services export an explicit interface (`AdventureService`) plus a factory function (`createAdventureService`). For simpler services where the interface would duplicate the return type, `ReturnType<typeof createX>` is a valid shorthand. Both patterns coexist; pick the one that communicates the contract clearly.

Never `mock.module()` (causes infinite loops in bun). Design for dependency injection instead.

### Config Resolution

Config resolution (`resolveConfig()`) lives in the app factory module, not in the entry point. The factory conditionally resolves environment config only when DI deps don't provide the needed values. This avoids env coupling in tests: test callers pass paths and functions directly, and the factory never touches `process.env`.

```typescript
// Only resolves env config when deps don't provide what we need
const config = (!deps?.adventuresPath || !deps?.queryFn) ? resolveConfig() : undefined;
const adventuresPath = deps?.adventuresPath ?? config!.adventuresPath;
```
