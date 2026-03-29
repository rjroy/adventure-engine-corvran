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

## Runtime Data

The daemon stores runtime data in `~/.corvran/` (override with `CORVRAN_HOME`):
- `~/.corvran/corvran.sock` — Unix socket for daemon communication
- `~/.corvran/adventures/` — adventure definitions

Both backend and web proxy derive paths from `CORVRAN_HOME`. Individual paths can be overridden:
- `DAEMON_SOCKET` — backend socket path (default: `$CORVRAN_HOME/corvran.sock`)
- `DAEMON_SOCKET_PATH` — web proxy socket path (default: `$CORVRAN_HOME/corvran.sock`)
- `ADVENTURES_PATH` — adventure directory (default: `$CORVRAN_HOME/adventures`)

Plugins remain in the repo (`plugins/`) since they're application code, not user data.

## Development

- `bun run dev` — starts daemon + Next.js dev server
- `bun run build` — typechecks, then builds web for production
- `bun run start` — starts daemon + built web app

## Building

- `tsc --build` from root compiles all packages via project references
- `bun install` from root wires up workspace dependencies

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@corvran/shared` | `packages/shared/` | Zod schemas and inferred types for API contracts |
| `@corvran/backend` | `packages/backend/` | Hono daemon on Unix socket |
| `@corvran/web` | `packages/web/` | Next.js App Router client |
