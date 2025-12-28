# ADR 002: App-Level WebSocket Context

## Status

Accepted

## Context

iOS Safari 26 introduced a regression where WebSocket connections cannot be created during React component transitions. When a user clicked an adventure:

1. `App` renders `AdventureMenu` initially
2. User clicks adventure → state changes to render `GameView`
3. `GameView` mounts and calls `useWebSocket` hook
4. Hook creates `new WebSocket(url)`
5. Safari creates the WebSocket object but **never sends the HTTP upgrade request**
6. Connection stuck in `CONNECTING` state forever (no `onopen`, `onerror`, or `onclose`)

The `memory-loop` project (similar architecture) worked because it creates the WebSocket immediately on page load in `VaultSelect`, not during a component transition.

This was discovered while investigating issue #238.

## Decision

Move WebSocket connection management from a per-component hook to an app-level React context.

The WebSocket connects on initial page load and stays connected across component transitions. When a user selects an adventure, the existing connection sends an `authenticate` message rather than creating a new connection.

## Rationale

- Safari iOS 26 is a shipped browser version affecting real users
- No server-side workaround exists for Safari's client-side WebSocket creation bug
- The `memory-loop` pattern (connect on page load) is proven to work on Safari
- App-level connection provides better control over connection lifecycle
- Authentication can be sent as a message rather than requiring a new connection

## Consequences

### Positive

- Works on iOS Safari 26 (and likely future versions)
- Single WebSocket connection for entire session (more efficient)
- Automatic reconnection preserves adventure context
- Cleaner separation: connection lifecycle vs adventure authentication
- Smaller bundle size (removed 1300+ lines of hook code and tests)

### Negative

- WebSocket connects before user selects an adventure (minor resource use)
- Must handle unauthenticated state in server (connection exists before adventure selected)
- Context dependency order matters (`WebSocketProvider` must be inside `ThemeProvider` and `PanelProvider`)

## Implementation

### Key Files

| File | Role |
|------|------|
| `frontend/src/contexts/WebSocketContext.tsx` | Provides shared WebSocket connection |
| `frontend/src/App.tsx` | Wraps app in `WebSocketProvider`, `GameView` uses context |
| `backend/src/server.ts` | Accepts `adventureId` from authenticate message |
| `shared/protocol.ts` | `adventureId` optional field in authenticate payload |

### Connection Flow

```
Page Load → WebSocketProvider mounts → WebSocket connects
                                              ↓
User clicks adventure → GameView mounts → authenticate message sent
                                              ↓
                                    Server loads adventure
```

### Deleted Files

- `frontend/src/hooks/useWebSocket.ts` - Replaced by context
- `frontend/tests/unit/useWebSocket.test.tsx` - Tests moved/simplified

## Related Issues

- #238: iOS safari cannot run an adventure
- PR #239: fix: iOS Safari WebSocket compatibility
