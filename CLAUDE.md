# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**This project uses `bun`, not npm.** Always use `bun run`, `bun test`, `bun add`, etc.

## Build & Development Commands

**Backend** (in `/backend`):
```bash
bun run dev              # Watch mode with hot reload
bun run test             # All tests (unit + integration)
bun run test:unit        # Unit tests only
bun test tests/unit/game-session.test.ts  # Single test file
bun run typecheck        # TypeScript validation
bun run lint             # ESLint
```

**Frontend** (in `/frontend`, uses Vite + Vitest):
```bash
bun run dev              # Vite dev server (port 5173)
bun run test             # Run tests once
bun run test:watch       # Watch mode
bun run test -- useWebSocket.test.tsx  # Single test file
bun run typecheck
bun run lint
```

**E2E** (in `/e2e`, uses Playwright):
```bash
bun test                 # Run tests (starts backend + frontend automatically)
bun run test:headed      # Visible browser
bun run test:debug       # Debug mode
```

**Development Workflow**: Run backend (`cd backend && bun run dev`) and frontend (`cd frontend && bun run dev`) in separate terminals.

## Architecture

### WebSocket Protocol

Frontend and backend communicate via WebSocket. Protocol types are defined in `/shared/protocol.ts` and re-exported by both sides.

**Client → Server**: `authenticate`, `player_input`, `start_adventure`, `ping`
**Server → Client**: `gm_response_start/chunk/end` (streaming), `adventure_loaded`, `theme_change`, `error`, `pong`

WebSocket URL: `ws://localhost:3000/ws?adventureId={adventureId}`
Token: Sent via `authenticate` message after connection (not in URL for security)

### Claude Agent SDK Integration

`GameSession` (`/backend/src/game-session.ts`) uses the Agent SDK's `query()` function. System prompts are built by `buildGMSystemPrompt()` in `/backend/src/gm-prompt.ts`, which includes MCP tools for dynamic theming.

**Mock Mode**: Set `MOCK_SDK=true` to use `/backend/src/mock-sdk.ts` instead of real SDK (used by E2E tests).

### State Persistence

Adventures persist to `/adventures/{adventureId}/` with `state.json` (core state) and `history.json` (narrative entries).

### Theme System

Backend triggers `theme_change` messages during narrative. Frontend (`/frontend/src/contexts/ThemeContext.tsx`) applies CSS variables from `/frontend/src/themes.json` based on mood.

**Valid Moods**: calm, tense, ominous, triumphant, mysterious

### Image Generation

Catalog-first strategy: `ImageCatalogService` searches `/assets/backgrounds` before `ImageGeneratorService` generates via Replicate API (`REPLICATE_API_TOKEN` required).

## Adding New Features

**New message type**:
1. Add to union in `/shared/protocol.ts`
2. Handle in `/backend/src/server.ts` WebSocket onMessage
3. Handle in frontend (App.tsx or useWebSocket)

**New theme mood**:
1. Add to `ThemeMood` union in `/shared/protocol.ts`
2. Add descriptor in `/backend/src/services/image-generator.ts`
3. Add theme in `/frontend/src/themes.json`
4. Add to `VALID_MOODS` in `/backend/src/gm-prompt.ts`

## Environment Variables

**Backend**:
- `PORT` (default 3000)
- `ADVENTURES_DIR` (default ./adventures)
- `REPLICATE_API_TOKEN` (required for image generation)
- `MOCK_SDK` (set "true" for testing without Agent SDK)
- `ALLOWED_ORIGINS` (comma-separated list, defaults to `http://localhost:5173,http://localhost:3000`)
- `LOG_LEVEL` (default "info") - Set log verbosity: "debug", "info", "warn", "error"
- `LOG_FILE` (default enabled) - Set to "false" to disable rotating file logs in `backend/logs/`
- `NODE_ENV` (default unset) - Set to "production" for JSON log output, otherwise uses pretty format
- `MAX_CONNECTIONS` (default 100) - Maximum concurrent WebSocket connections
- `INPUT_TIMEOUT` (default 60000) - Timeout in milliseconds for input processing (minimum 1000ms)

## Critical Dependencies

**Zod must stay at version 3.x** - The Claude Agent SDK requires Zod 3.24.x. Zod 4.x has breaking API changes that cause MCP tools to fail with `keyValidator._parse is not a function`. All three packages (backend, frontend, shared) are pinned to `zod: 3.24.1`. Do NOT upgrade Zod without verifying SDK compatibility.

## Code Style

- TypeScript strict mode enabled
- ESLint with type-checked rules
- Prettier: double quotes, semicolons, trailing commas (es5)
- Unused variables must start with `_`

## Project Management

Tasks and issues are tracked in GitHub Project 6 "Adventure Engine Corvran". Use Compass Rose plugin commands for project operations:

- `/compass-rose:backlog` - Review and analyze backlog items
- `/compass-rose:next-item` - Get highest-priority ready item
- `/compass-rose:start-work [issue]` - Begin work on an item
- `/compass-rose:add-item` - Create new issue with project fields
- `/compass-rose:reprioritize` - Codebase-aware priority recommendations

**Labels**: security, testing, architecture, documentation, operations, performance, build, plugin, type-safety, error-handling, priority:critical, priority:medium, question

**Status options**: Backlog, Ready, In progress, In review, Done
