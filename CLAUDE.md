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

**Client → Server**: `player_input`, `start_adventure`, `ping`
**Server → Client**: `gm_response_start/chunk/end` (streaming), `adventure_loaded`, `theme_change`, `error`, `pong`

WebSocket URL: `ws://localhost:3000/ws?token={sessionToken}&adventureId={adventureId}`

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

## Code Style

- TypeScript strict mode enabled
- ESLint with type-checked rules
- Prettier: double quotes, semicolons, trailing commas (es5)
- Unused variables must start with `_`

## Project Management

Tasks and issues are tracked in GitHub Project 6 "Adventure Engine Corvran".

```bash
gh project item-list 6 --owner @me              # List all items
gh issue list --repo rjroy/adventure-engine-corvran  # List open issues
```

**Labels**: security, testing, architecture, documentation, operations, performance, build, plugin, type-safety, error-handling, priority:critical, priority:medium, question

### Updating Project Fields

Project ID: `PVT_kwHOAAM2FM4BKlWC`

**Priority** (field: `PVTSSF_lAHOAAM2FM4BKlWCzg6aG5s`):
| Value | Option ID |
|-------|-----------|
| P0 | `79628723` |
| P1 | `0a877460` |
| P2 | `da944a9c` |

**Size** (field: `PVTSSF_lAHOAAM2FM4BKlWCzg6aG5w`):
| Value | Option ID |
|-------|-----------|
| XS | `911790be` |
| S | `b277fb01` |
| M | `86db8eb3` |
| L | `853c8207` |
| XL | `2d0801e2` |

To update a field:
```bash
# Get item ID for an issue
gh project item-list 6 --owner @me --format json | jq -r '.items[] | select(.content.number == ISSUE_NUM) | .id'

# Set field value
gh project item-edit --project-id PVT_kwHOAAM2FM4BKlWC --id ITEM_ID \
  --field-id FIELD_ID --single-select-option-id OPTION_ID
```
