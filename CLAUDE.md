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

**Development Workflow**: Run backend (`cd backend && bun run dev`) and frontend (`cd frontend && bun run dev`) in separate terminals.

## Architecture

### WebSocket Protocol

Frontend and backend communicate via WebSocket. Protocol types are defined in `/shared/protocol.ts` and re-exported by both sides.

**Client → Server**: `authenticate`, `player_input`, `start_adventure`, `ping`
**Server → Client**: `gm_response_start/chunk/end` (streaming), `adventure_loaded`, `theme_change`, `error`, `pong`

WebSocket URL: `ws://localhost:3000/ws?adventureId={adventureId}`
Token: Sent via `authenticate` message after connection (not in URL for security)

### Claude Agent SDK Integration

`GameSession` (`/backend/src/game-session.ts`) uses the Agent SDK's `query()` function. System prompts are built by `buildGMSystemPrompt()` in `/backend/src/gm-prompt.ts`.

**File-Based State Management**: The GM (Claude) reads and writes markdown files directly for all game state. File paths are dynamic based on the adventure's `playerRef` and `worldRef`:

**When playerRef/worldRef are set** (multi-adventure mode):
- `./System.md` - RPG rules (read-only, defines game mechanics)
- `./{playerRef}/sheet.md` - Character sheet (stats, inventory, abilities)
- `./{playerRef}/state.md` - Character narrative state
- `./{worldRef}/world_state.md` - Established world facts
- `./{worldRef}/locations.md` - Known places
- `./{worldRef}/characters.md` - NPCs and their details
- `./{worldRef}/quests.md` - Active quests

**When refs are null** (legacy/new adventure mode):
- Uses legacy paths: `./player.md`, `./world_state.md`, etc.
- GM invokes `character-world-init` skill to set up character/world

**Directory Structure** (with multi-adventure support):
```
{PROJECT_DIR}/
├── System.md              # RPG rules (shared)
├── players/
│   ├── kael-thouls/       # Character directory
│   │   ├── sheet.md       # Character stats
│   │   └── state.md       # Narrative state
│   └── other-character/
└── worlds/
    ├── eldoria/           # World directory
    │   ├── world_state.md
    │   ├── locations.md
    │   ├── characters.md
    │   └── quests.md
    └── other-world/
```

**MCP Tools**:
- `set_theme` - UI theme updates (mood, genre, region)
- `set_xp_style` - Player XP preference (frequent/milestone/combat-plus)
- `set_character` - Select or create a character (sets `playerRef`)
- `set_world` - Select or create a world (sets `worldRef`)
- `list_characters` - List available characters from `players/` directory
- `list_worlds` - List available worlds from `worlds/` directory

**Corvran Skills**:
- `dice-roller` - Bash script for dice expressions (outputs JSON with rolls and total)
- `character-world-init` - Guides GM through character/world setup when refs are null

**Plugin Reloading**: To reload plugin changes (skills, commands, CLAUDE.md) in Claude Code, bump the `version` field in the plugin's `plugin.json`. Version changes trigger automatic reloading.

**Mock Mode**: Set `MOCK_SDK=true` to use `/backend/src/mock-sdk.ts` instead of real SDK (used by E2E tests).

### State Persistence

Adventures persist to `/adventures/{adventureId}/` with `state.json` (session metadata) and `history.json` (conversation log). Game state is maintained in markdown files within the adventure directory.

### Theme System

Backend triggers `theme_change` messages during narrative. Frontend (`/frontend/src/contexts/ThemeContext.tsx`) applies CSS variables from `/frontend/src/themes.json` based on mood.

**Valid Moods**: calm, tense, ominous, triumphant, mysterious

### Image Generation

The server uses a two-tier image system initialized at startup:

1. **Image Catalog** (required): Pre-loads and validates background images from `BACKGROUNDS_DIR`
   - Server startup fails if directory doesn't exist
   - Logs warning if `calm.jpg` fallback is missing
   - Pre-caches all PNG filenames for fast lookup

2. **Image Generator** (optional): Enables AI generation via Replicate API
   - Server starts normally if `REPLICATE_API_TOKEN` is not set
   - Logs warning and continues in catalog-only mode
   - Generation requests fail gracefully, falling back to catalog images

**Startup Behavior**:
- Missing `BACKGROUNDS_DIR`: Server fails with error
- Missing `REPLICATE_API_TOKEN`: Server starts with warning, catalog-only mode
- Both present: Full functionality (catalog + generation)

Catalog-first strategy: `ImageCatalogService` searches `/assets/backgrounds` before `ImageGeneratorService` generates via Replicate API.

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
- `ADVENTURES_DIR` (default `{backend}/adventures`) - Adventure save data directory
- `STATIC_ROOT` (default `{project}/frontend/dist`) - Frontend static files
- `LOGS_DIR` (default `{backend}/logs`) - Log file output directory
- `BACKGROUNDS_DIR` (default `{backend}/assets/backgrounds`) - **Required**: Background images directory - Directory must exist at startup with at least `calm.jpg` fallback image
- `REPLICATE_API_TOKEN` (optional for image generation) - Server starts without this, but AI image generation will be disabled
- `MOCK_SDK` (set "true" for testing without Agent SDK)
- `ALLOWED_ORIGINS` (comma-separated list, defaults to `http://localhost:5173,http://localhost:3000`)
- `LOG_LEVEL` (default "info") - Set log verbosity: "debug", "info", "warn", "error"
- `LOG_FILE` (default enabled) - Set to "false" to disable rotating file logs
- `NODE_ENV` (default unset) - Set to "production" for JSON log output, otherwise uses pretty format
- `MAX_CONNECTIONS` (default 100) - Maximum concurrent WebSocket connections
- `INPUT_TIMEOUT` (default 60000) - Timeout in milliseconds for input processing (minimum 1000ms)

Note: All path defaults are computed as absolute paths at startup, so the server works correctly regardless of the current working directory.

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
