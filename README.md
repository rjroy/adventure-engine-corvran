# Adventure Engine of Corvran

<img src="docs/logo/corvran-engine-logo.png" align="right" width="128" height="128" alt="Adventure Engine Corvran Logo">

An AI-powered game master for immersive tabletop RPG adventures. Corvran guides you through rich, interactive stories with dynamic theming, procedural imagery, and persistent world state—all through a web interface.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg) 
![Development](https://img.shields.io/badge/development-active-orange.svg)
![SDD](https://img.shields.io/badge/methodology-SDD-teal.svg)

## The Experience

When you start an adventure, Corvran becomes your game master. You describe your actions, and Corvran responds with narrative, NPC dialogue, dice rolls, and consequences. The interface adapts to the story's mood—colors shift, fonts change, and background images transform as the narrative evolves.

**Features:**
- **Streaming Narrative** — Responses appear in real-time as Corvran composes them
- **Dynamic Theming** — The UI reflects the story's mood: calm, tense, ominous, triumphant, or mysterious
- **AI Backgrounds** — Procedurally generated images match the current scene (requires Replicate API)
- **Session Persistence** — Pick up where you left off across browser sessions
- **Character & World Management** — Persistent character sheets, world state, NPCs, and quests

## Running the Server

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Authentication for Claude Agent SDK (one of):
  - OAuth via `claude` CLI (run `claude` to set up)
  - `ANTHROPIC_API_KEY` environment variable
- Optional: [Replicate API Token](https://replicate.com/) (for AI-generated backgrounds)

### Quick Start

```bash
# Clone and install dependencies
git clone https://github.com/rjroy/adventure-engine-corvran.git
cd adventure-engine-corvran
cd backend && bun install
cd ../frontend && bun install

# Build frontend and start server
cd frontend && bun run build
cd ../backend && bun run start

# Open http://localhost:3000 in your browser
```

If you haven't configured OAuth via `claude` CLI, set `ANTHROPIC_API_KEY` before starting.

### Environment Variables

Optional variables (create `backend/.env` or export):

| Variable | Default | Description |
|----------|---------|-------------|
| `REPLICATE_API_TOKEN` | — | Enables AI-generated background images |
| `PORT` | `3000` | Server port |
| `HOST` | `localhost` | Server hostname |
| `ADVENTURES_DIR` | `backend/adventures` | Adventure save location |
| `STATIC_ROOT` | `frontend/dist` | Built frontend files |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

Paths are computed as absolute paths at startup relative to the project structure.

Without `REPLICATE_API_TOKEN`, the server uses static fallback images instead of AI-generated ones.

### Using Claude Code Plugin

If you use [Claude Code](https://claude.ai/code), the `corvran` plugin provides a convenient way to launch adventures:

```bash
# From any adventure project directory
/corvran:enter-world
```

This builds the frontend and starts the server in the background.

## Development

### Project Structure

```
adventure-engine-corvran/
├── backend/           # Bun server with Claude Agent SDK
│   ├── assets/        # Static assets (backgrounds)
│   └── adventures/    # Saved adventure data
├── frontend/          # React + Vite web interface
├── shared/            # WebSocket protocol types
├── corvran/           # Claude Code plugin
└── d20-system/        # D20 RPG rules plugin
```

### Commands

**Backend** (from `backend/`):
```bash
bun run dev              # Watch mode with hot reload
bun run test             # Run all tests
bun run test:unit        # Unit tests only
bun run test:integration # Integration tests
bun run typecheck        # TypeScript validation
bun run lint             # ESLint
```

**Frontend** (from `frontend/`):
```bash
bun run dev          # Vite dev server (port 5173)
bun run test         # Run tests once
bun run test:watch   # Watch mode
bun run typecheck
bun run lint
```

**Development Workflow**: Run backend and frontend dev servers in separate terminals. The frontend proxies API requests to the backend.

### Code Style

- TypeScript strict mode
- ESLint with type-checked rules
- Prettier: double quotes, semicolons, trailing commas (es5)
- Unused variables must start with `_`

### Testing

Run tests from the respective directories using the commands above. Set `MOCK_SDK=true` to run backend tests without the Agent SDK.

### Critical Dependencies

**Zod must stay at version 3.x** — The Claude Agent SDK requires Zod 3.24.x. Do not upgrade to Zod 4.x without verifying SDK compatibility.

## Architecture

The server uses the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk) to run Corvran as an AI game master. State persists in markdown files that Corvran reads and writes during gameplay.

- **Frontend ↔ Backend**: WebSocket for real-time streaming, HTTP for adventure management
- **Backend ↔ Claude**: Agent SDK `query()` calls with MCP tools for game mechanics
- **State**: Markdown files for character sheets, world state, NPCs, quests

## Status

**Active Development** — Core gameplay functional, expanding features.

## License

MIT
