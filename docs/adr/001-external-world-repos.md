# ADR 001: External World Repositories

## Status

Accepted

## Context

The Adventure Engine needs to support multiple worlds. Two approaches were considered:

1. **External world repos** - worlds exist in separate directories/repositories
2. **Subdirectories within server** - worlds bundled inside `backend/worlds/`

This decision was prompted by architecture questions raised in issues #22, #23, and #24.

## Decision

Use external world repositories.

Worlds are independent directories passed to the engine via `PROJECT_DIR`. The server is decoupled from world content.

## Rationale

- Personal use case prioritizes flexibility over beginner-friendly bundling
- No need for built-in worlds
- Clean separation of concerns (engine vs content)
- Current implementation already supports this pattern
- Worlds can be versioned independently

## Consequences

### Positive

- Worlds can be managed as independent projects
- Server codebase stays lean
- Easy to switch between worlds
- World authors have full control over their content

### Negative

- Users must understand directory/path concepts
- No "just works" bundled experience
- Each world needs its own setup

## Implementation

Already implemented:

- `launch-world.sh` accepts project directory argument
- `PROJECT_DIR` env var passed to backend
- SDK sandbox operates in world directory

### Key Files

| File | Role |
|------|------|
| `corvran/skills/enter-world/scripts/launch-world.sh` | Entry point, sets PROJECT_DIR |
| `backend/src/game-session.ts` | Uses PROJECT_DIR for SDK sandbox |
| `backend/src/adventure-state.ts` | Manages ADVENTURES_DIR separately |

## Related Issues

- #22: Multi-world design: Am I overcomplicating this?
- #23: Should I embrace that this is a server with data? (closed)
- #24: Alternative: server with agent + world subdirectories?
