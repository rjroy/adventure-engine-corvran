# Adventure Engine of Corvran

Monorepo with three packages: `packages/shared`, `packages/backend`, `packages/web`.

## Architecture

- Daemon-first: the backend is the application, web is just a client
- All AI interaction uses `@anthropic-ai/claude-agent-sdk` only (no `@anthropic-ai/sdk`, no other LLM libraries)
- Route/service split with DI factories (see `.lore/reference/architecture-pattern.md`)
- Shared Zod schemas in `@corvran/shared`, imported by both backend and web

## Testing

- Use `bun test` for all tests
- **Do not use `mock.module()`** - it causes infinite loops in bun and creates brittle tests
- Use dependency injection: pass dependencies as parameters, not imports
- Tests live alongside source in `tests/` directories within each package

## Development

Two processes run separately:

- `bun run dev:daemon` — starts the backend on `./corvran.sock`
- `bun run dev:web` — starts Next.js dev server (proxies to daemon via socket)
- `bun run dev` — starts both

Environment defaults (set automatically by dev scripts):
- `DAEMON_SOCKET=./corvran.sock` — backend listens here
- `DAEMON_SOCKET_PATH=./corvran.sock` — web proxy connects here
- `ADVENTURES_PATH=./adventures/` — where the daemon looks for adventures

A sample adventure is provided at `adventures/lost-mines/`.

## Building

- `tsc --build` from root compiles all packages via project references
- `bun install` from root wires up workspace dependencies

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@corvran/shared` | `packages/shared/` | Zod schemas and inferred types for API contracts |
| `@corvran/backend` | `packages/backend/` | Hono daemon on Unix socket |
| `@corvran/web` | `packages/web/` | Next.js App Router client |
