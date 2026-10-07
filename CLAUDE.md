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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
