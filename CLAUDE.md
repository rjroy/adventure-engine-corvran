# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Adventure Engine of Corvran is an AI-powered tabletop RPG game master using the Claude Agent SDK. The backend runs a Claude agent as GM that streams narrative responses via WebSocket, while the frontend provides a dynamic themed interface with procedural background imagery.

## Development Commands

**Backend** (run from `backend/`):
```bash
bun run dev              # Watch mode with hot reload
bun run test             # All tests
bun run test:unit        # Unit tests only
bun run test:integration # Integration tests
bun test tests/unit/file.test.ts  # Single test file
bun run typecheck
bun run lint
```

**Frontend** (run from `frontend/`):
```bash
bun run dev          # Vite dev server (port 5173, proxies to backend)
bun run test         # Run tests once
bun run test:watch   # Watch mode
bun run typecheck
bun run lint
```

**Running the Full Stack**:
- Development: Run backend and frontend dev servers in separate terminals
- Production: `cd frontend && bun run build` then `cd ../backend && bun run start`

## Architecture

### Communication Flow

```
Frontend (React) ←→ WebSocket ←→ Backend (Hono) ←→ Claude Agent SDK
                                      ↓
                          MCP Tools for GM actions
                          (set_theme, panels, character/world management)
```

### Key Components

**Backend (`backend/src/`):**
- `server.ts` - Hono HTTP/WebSocket server, connection management, CSRF protection
- `game-session.ts` - Core gameplay loop: input queuing, SDK query orchestration, response streaming, abort handling
- `gm-prompt.ts` - Builds GM system prompt from adventure state; defines MCP tools (set_theme, panels, character/world ops)
- `adventure-state.ts` - Persists adventure state to JSON files in adventures directory
- `services/background-image.ts` - Catalog-first image strategy with Replicate fallback
- `services/history-compactor.ts` - Summarizes conversation history when it grows too long

**Frontend (`frontend/src/`):**
- `App.tsx` - Main game view, WebSocket message handling, state coordination
- `hooks/useWebSocket.ts` - WebSocket connection with auto-reconnect and heartbeat
- `contexts/ThemeContext.tsx` - Dynamic theming (colors/fonts/transitions) based on mood
- `contexts/PanelContext.tsx` - Manages info panels (sidebar, header, overlay)
- `components/` - NarrativeLog, InputField, BackgroundLayer, PanelZones, etc.

**Shared (`shared/`):**
- `protocol.ts` - Zod schemas for all WebSocket messages (ClientMessage, ServerMessage)
- Types: NarrativeEntry, ThemeMood, Genre, Region, Panel, PlayerCharacter, CombatState

**Plugins:**
- `corvran/` - Claude Code plugin for launching adventures from CLI
- `d20-system/` - SRD 5.2-compatible RPG mechanics (skills, templates, dice integration)

### State Management

Adventures persist in `backend/adventures/{adventureId}/`:
- `state.json` - Core adventure state (theme, scene, refs, agent session ID)
- `history.json` - Narrative history with optional compaction summary

Character/world state lives in markdown files within the project directory (PROJECT_DIR env var):
- `players/{slug}/sheet.md` - Character stats, inventory, abilities, current HP/conditions
- `players/{slug}/story.md` - Story arcs, objectives, recent narrative events
- `worlds/{slug}/world_state.md`, `locations.md`, `characters.md`, `quests.md`

The GM reads/writes these files directly using SDK file tools.

### WebSocket Protocol

Client messages: `authenticate`, `player_input`, `ping`, `abort`, `recap`
Server messages: `gm_response_start/chunk/end`, `adventure_loaded`, `theme_change`, `panel_create/update/dismiss`, `tool_status`, `error`

All messages are validated with Zod schemas in `shared/protocol.ts`.

## Testing

Set `MOCK_SDK=true` to run tests without the Agent SDK (uses mock responses from `backend/src/mock-sdk.ts`).

Backend tests use Bun's test runner. Frontend tests use Vitest with Testing Library.

## Critical Constraints

**Zod Version**: Must stay at 3.24.x. The Claude Agent SDK requires Zod 3.x. Do not upgrade to Zod 4.x.

**Player Agency**: The GM prompt enforces strict rules - never narrate player actions, only describe situations and consequences. All responses must end with clear player agency.

**Input Validation**: Player input is sanitized for prompt injection (`backend/src/validation.ts`). Role manipulation attempts are blocked.

## Code Style

- TypeScript strict mode
- ESLint with type-checked rules
- Unused variables must start with `_`
- Double quotes, semicolons, trailing commas (es5)
