# Adventure Engine of Corvran

A set of tools for AI-driven tabletop RPG adventures. At its heart is a web-based immersive experience with real-time gameplay, dynamic theming, and procedural imagery—complemented by Claude Code plugin integration for terminal-based adventuring.

## Meet Corvran

Corvran is your game master. Equal parts wise storyteller and trickster, Corvran guides adventures with a singular goal: giving the player the experience they need—whether that's triumph, tension, mystery, or the quiet satisfaction of a puzzle solved.

The name follows the tradition of Wyrd Gateway's themed worlds. The corvid (crow/raven) evokes intelligence, mystery, and the watchful nature of a game master observing the unfolding tale.

## Vision

The Adventure Engine transforms AI into a game master capable of running rich, interactive RPG adventures. It handles the complexity of world management, rule arbitration, and narrative pacing while keeping the player at the center of the story.

## Core Design Goals

### Persistent World State
Track locations, NPCs, factions, and world events. Maintain consistency across sessions. Support time progression and world evolution.

### Character Management
Player character sheets with stats, inventory, and history. NPC relationships and disposition tracking. Character growth and development over time.

### Narrative Gameplay
Dramatic pacing and scene management. Meaningful choices with consequences. Balance between player agency and story structure.

### Flexible Rule Systems
Support for various RPG systems or system-agnostic play. Dice rolling and probability handling. Combat, skill checks, and resolution mechanics.

## Architecture

### Server (Immersive Experience)
The primary experience—a web application delivering real-time gameplay through WebSocket connections:
- Live narrative streaming with Corvran's responses
- Dynamic theming that shifts with the story's mood
- Procedural background imagery matching the current scene
- Session persistence across browser sessions

### Claude Code Plugin
Terminal-based adventure management integrated into your development workflow:
- Commands for starting and resuming adventures
- Character sheet management
- Quick session access without leaving the terminal

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPLICATE_API_TOKEN` | No* | — | API token for image generation via Replicate |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `localhost` | Server hostname to bind |
| `ADVENTURES_DIR` | No | `./adventures` | Directory for adventure state persistence |
| `STATIC_ROOT` | No | `../frontend/dist` | Directory for serving static frontend files |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed CORS origins |
| `LOG_LEVEL` | No | `info` | Log verbosity: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_FILE` | No | `true` | Set to `false` to disable rotating file logs in `backend/logs/` |
| `NODE_ENV` | No | — | Set to `production` for JSON log output |
| `MAX_CONNECTIONS` | No | `100` | Maximum concurrent WebSocket connections |
| `INPUT_TIMEOUT` | No | `60000` | Timeout in milliseconds for input processing (minimum 1000ms) |
| `MOCK_SDK` | No | — | Set to `true` to use mock SDK (for testing without Claude Agent SDK) |

\* Required only for image generation. Server runs without it using catalog/fallback images.

### Example `.env` file

```bash
# Required for image generation (optional otherwise)
REPLICATE_API_TOKEN=r8_your_token_here

# Optional - uncomment to override defaults
# PORT=3000
# HOST=localhost
# ADVENTURES_DIR=./adventures
# STATIC_ROOT=../frontend/dist
# ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
# LOG_LEVEL=info
# LOG_FILE=true
# NODE_ENV=production
# MAX_CONNECTIONS=100
# MOCK_SDK=true
```

## Status

**Active Development** — Core gameplay engine functional, expanding features.
