# Adventure Engine of Corvran

Monorepo with three packages: `packages/shared`, `packages/backend`, `packages/web`.

## Architecture

- Daemon-first: the backend is the application, web is just a client
- AI interaction goes through `@earendil-works/pi-coding-agent` for both the streaming GM loop and out-of-loop summarization. Summarization builds a fresh bound session per call so extension hooks (e.g. `pi-fallback-provider`'s `streamSimple`) apply.
- Route/service split with DI factories (see `.lore/reference/architecture-pattern.md`)
- The `SessionRunner` interface is event-callback shaped (`onTextDelta`/`onToolUse`/`onDone`/`onError`), not iterator-shaped — see `services/session-runner.ts`. Tests inject `createMockSessionRunner(script)`.
- The compaction service depends on a `SummarizeFn` (text in, text out), not on any agent loop. Tests inject a stub directly.
- Shared Zod schemas in `@corvran/shared`, imported by both backend and web. Custom tool input schemas live in pi-agent's `typebox`.
- Model selection is deferred to `session.modelRegistry.find` after `bindExtensions` so extension-registered providers are visible. Configure via `MODEL=provider/modelId` and `COMPACTION_MODEL=provider/modelId`; omit either to use pi's settings default (`~/.pi/agent/settings.json`).

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
