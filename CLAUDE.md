# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

**Backend** (in `/backend`, uses Bun):
```bash
npm run dev              # Watch mode with hot reload
npm run test             # All tests (unit + integration)
npm run test:unit        # Unit tests only
bun test tests/unit/game-session.test.ts  # Single test file
npm run typecheck        # TypeScript validation
npm run lint             # ESLint
```

**Frontend** (in `/frontend`, uses Vite + Vitest):
```bash
npm run dev              # Vite dev server (port 5173)
npm run test             # Run tests once
npm run test:watch       # Watch mode
npm run test -- useWebSocket.test.tsx  # Single test file
npm run typecheck
npm run lint
```

**E2E** (in `/e2e`, uses Playwright):
```bash
npm test                 # Run tests (starts backend + frontend automatically)
npm run test:headed      # Visible browser
npm run test:debug       # Debug mode
```

**Development Workflow**: Run backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`) in separate terminals.

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
