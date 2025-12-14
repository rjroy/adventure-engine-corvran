---
specification: [.sdd/specs/2025-12-13-adventure-engine-interface.md](./../specs/2025-12-13-adventure-engine-interface.md)
status: Approved
version: 1.0.0
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Adventure Engine Interface - Technical Plan

## Overview

This plan details the architecture for building a web-based interactive fiction system powered by the Claude Agent SDK. The system consists of a React frontend communicating via WebSocket with a Hono/Bun backend that invokes Claude as the game master through the Agent SDK's streaming capabilities.

The key technical challenges are: (1) bridging WebSocket messages to the Agent SDK's async generator pattern, (2) maintaining conversation context across reconnections, and (3) streaming Claude's responses token-by-token to the browser. The architecture prioritizes simplicity—single-user operation, filesystem persistence, and minimal dependencies.

## Architecture

### System Context

*Addresses REQ-F-1 (three-component architecture): web frontend, application server, Claude Agent SDK integration.*

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Browser                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     React Frontend                                │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │  │
│  │  │ NarrativeLog│  │ InputField   │  │ ConnectionStatus        │   │  │
│  │  │ (scrollable)│  │ (player cmd) │  │ (connected/reconnecting)│   │  │
│  │  └─────────────┘  └──────────────┘  └─────────────────────────┘   │  │
│  │                         │                                         │  │
│  │                    WebSocket Client                               │  │
│  │                         │                                         │  │
│  └─────────────────────────┼─────────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────────────┘
                             │ WebSocket (ws://localhost:3001/ws)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Bun Server                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Hono Application                             │  │
│  │  ┌─────────────────┐  ┌───────────────────────────────────────┐   │  │
│  │  │ REST Routes     │  │ WebSocket Handler                     │   │  │
│  │  │ POST /adventure │  │ - upgradeWebSocket()                  │   │  │
│  │  │ GET /adventure  │  │ - onMessage → GameSession.handleInput │   │  │
│  │  └─────────────────┘  │ - onClose → cleanup                   │   │  │
│  │                       └───────────────────────────────────────┘   │  │
│  │                                    │                              │  │
│  │                       ┌────────────▼────────────┐                 │  │
│  │                       │      GameSession        │                 │  │
│  │                       │ - Claude Agent SDK query│                 │  │
│  │                       │ - State persistence     │                 │  │
│  │                       │ - Input queue           │                 │  │
│  │                       └────────────┬────────────┘                 │  │
│  └────────────────────────────────────┼──────────────────────────────┘  │
└───────────────────────────────────────┼─────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
┌──────────────────────┐  ┌─────────────────────────┐  ┌─────────────────┐
│  Claude Agent SDK    │  │  Filesystem             │  │  Project Dir    │
│  - query() with      │  │  - adventures/          │  │  (cwd for SDK)  │
│    streaming         │  │    ├─ {id}/             │  │                 │
│  - systemPrompt      │  │    │  ├─ state.json     │  │                 │
│  - tools (Read/Write)│  │    │  └─ history.json   │  │                 │
└──────────────────────┘  └─────────────────────────┘  └─────────────────┘
```

### Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **React Frontend** | Display narrative, capture input, manage WebSocket connection | `frontend/src/` |
| **Hono Server** | HTTP/WebSocket routing, session lifecycle | `backend/src/server.ts` |
| **GameSession** | Agent SDK integration, state management, input queuing | `backend/src/game-session.ts` |
| **AdventureState** | State persistence, load/save operations | `backend/src/adventure-state.ts` |
| **WebSocket Protocol** | Message format definitions | `shared/protocol.ts` |

### Directory Structure

```
adventure-engine-corvran/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── enter-world/
│       ├── SKILL.md
│       └── scripts/
│           └── launch-world.sh
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── NarrativeLog.tsx
│       │   ├── InputField.tsx
│       │   └── ConnectionStatus.tsx
│       ├── hooks/
│       │   └── useWebSocket.ts
│       └── types/
│           └── protocol.ts
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── server.ts
│       ├── game-session.ts
│       ├── adventure-state.ts
│       └── types/
│           └── protocol.ts
├── shared/
│   └── protocol.ts          # Shared type definitions
└── adventures/              # Runtime data directory
    └── {adventure-id}/
        ├── state.json
        └── history.json
```

## Technical Decisions

### TD-1: Claude Agent SDK Integration Pattern

**Choice**: Use the Agent SDK `query()` function with streaming and filesystem tools, wrapped in a session manager

**Requirements**: REQ-F-5, REQ-F-6, REQ-F-7, REQ-F-8, REQ-F-9, REQ-F-10

**Rationale**:
- The Agent SDK provides `query()` which returns an async generator that streams `SDKMessage` objects—this maps directly to our need for token-by-token streaming
- For conversation continuity (REQ-F-7), we use the `resume` option with session IDs rather than manually managing conversation history
- The SDK's `systemPrompt` option lets us inject adventure context (world state, current scene) at the start of each interaction (REQ-F-8)
- Claude's built-in `Read` and `Write` tools can be enabled to allow the GM to persist narrative state to adventure files (REQ-F-10), which is simpler than implementing custom MCP tools for the MVP

**Implementation approach**:
```typescript
const query = await agentQuery({
  prompt: playerInput,
  options: {
    resume: adventureSessionId,  // Continues conversation
    systemPrompt: buildGMSystemPrompt(adventureState),
    tools: { type: 'preset', preset: 'claude_code' },  // Includes Read/Write
    allowedTools: ['Read', 'Write'],  // Restrict to file operations only
    cwd: adventureDirectory,  // Sandbox to adventure folder
    includePartialMessages: true,  // For token streaming
  }
});
```

### TD-2: Frontend Framework and Build Tool

**Choice**: React 19 + Vite + TypeScript

**Requirements**: REQ-F-11, REQ-F-12, REQ-F-13, REQ-F-14, REQ-NF-3, REQ-NF-4

**Rationale**:
- **React**: Natural fit for the streaming narrative display—state updates trigger re-renders as tokens arrive. Modern React hooks provide clean WebSocket lifecycle management
- **Vite**: Fast development server with HMR, simple configuration, excellent TypeScript support. Standard choice for React projects in 2025
- **TypeScript**: Type safety for WebSocket protocol ensures frontend/backend contract alignment

**Alternatives considered**:
- **Svelte/SvelteKit**: Lighter weight but React is more widely known, reducing onboarding friction
- **Vanilla JS**: Would work for this simple UI but loses type safety benefits

### TD-3: Backend Framework Selection

**Choice**: Hono on Bun runtime

**Requirements**: REQ-F-2, REQ-F-3, REQ-F-17, REQ-NF-4

**Rationale**:
- **Hono**: Provides WebSocket helper (`upgradeWebSocket` from `hono/bun`) with clean lifecycle hooks (onOpen, onMessage, onClose, onError). REST routing for adventure management endpoints. Minimal API surface keeps implementation simple
- **Bun**: Native WebSocket support without additional dependencies. Fast startup, built-in TypeScript execution. Matches spec requirement (Technical Context)
- **Pattern**: Hono's `upgradeWebSocket` returns event handlers; Bun requires exporting `websocket` alongside `fetch`:

```typescript
import { Hono } from 'hono';
import { upgradeWebSocket, websocket } from 'hono/bun';

const app = new Hono();
app.get('/ws', upgradeWebSocket((c) => ({
  onOpen(event, ws) { /* ... */ },
  onMessage(event, ws) { /* ... */ },
  onClose() { /* ... */ },
})));

export default { fetch: app.fetch, websocket };
```

**Alternatives considered**:
- **Express + ws**: Would work but requires more dependencies, less native Bun integration
- **Fastify**: Similar capability but Hono is lighter and WebSocket support is better documented

### TD-4: WebSocket Protocol Design

**Choice**: JSON messages with discriminated union types

**Requirements**: REQ-F-2, REQ-F-6, REQ-F-14, REQ-F-26

**Rationale**:
- JSON is human-readable for debugging, natively supported in browsers
- Discriminated unions (`type` field) enable exhaustive type checking in TypeScript
- Separate message types for different concerns: player input, GM response chunks, connection status, errors

**Protocol messages** (client → server):
- `{ type: 'player_input', payload: { text: string } }`
- `{ type: 'start_adventure', payload: { adventureId?: string } }`
- `{ type: 'ping' }` (heartbeat)

**Protocol messages** (server → client):
- `{ type: 'gm_response_start', payload: { messageId: string } }`
- `{ type: 'gm_response_chunk', payload: { messageId: string, text: string } }`
- `{ type: 'gm_response_end', payload: { messageId: string } }`
- `{ type: 'adventure_loaded', payload: { adventureId: string, history: NarrativeEntry[] } }`
- `{ type: 'error', payload: { code: string, message: string, retryable: boolean } }`
- `{ type: 'pong' }` (heartbeat response)

### TD-5: State Persistence Strategy

**Choice**: JSON files in `adventures/{id}/` directory with separate state and history files

**Requirements**: REQ-F-19, REQ-F-21, REQ-F-22, REQ-F-23, REQ-F-24

**Rationale**:
- **Filesystem**: Spec explicitly prohibits external databases (Explicit Constraints). JSON files are human-readable (REQ-F-23) and can be manually edited for debugging
- **Separate files**: `state.json` for current world state (small, overwritten often), `history.json` for narrative log (append-only, can grow large). This separation allows efficient partial reads
- **Adventure isolation**: Each adventure has its own directory, preventing data crossover (REQ-F-24)

**File structure**:
```
adventures/{uuid}/
├── state.json       # Current world state, player data, scene
└── history.json     # Full narrative log (player inputs + GM responses)
```

### TD-6: Input Queue for Race Condition Prevention

**Choice**: FIFO queue in GameSession that holds inputs during Claude processing

**Requirements**: REQ-F-18

**Rationale**:
- Player may send multiple messages while Claude is generating a response
- Without queuing, these could interleave unpredictably or cause the Agent SDK session to receive concurrent prompts
- Simple solution: queue inputs, process sequentially after current response completes

**Implementation**:
- `GameSession` maintains `inputQueue: string[]` and `isProcessing: boolean`
- `onMessage` pushes to queue; if not processing, starts processing
- After each response completes, check queue for next input

### TD-7: Connection Recovery Strategy

**Choice**: Client-side reconnection with exponential backoff, server-side session persistence

**Requirements**: REQ-F-20, REQ-F-26, REQ-NF-2, Success Criteria 5

**Rationale**:
- Frontend handles reconnection logic—simpler than server-side push
- Exponential backoff (1s → 2s → 4s → 8s, max 30s) prevents thundering herd on server recovery
- Server persists session state to disk; on reconnect, client sends adventure ID, server loads state

**Flow**:
1. WebSocket disconnects unexpectedly
2. Frontend shows "Reconnecting..." status
3. Frontend attempts reconnect with backoff
4. On reconnect, frontend sends `start_adventure` with existing adventureId
5. Server loads persisted state, sends `adventure_loaded` with history
6. Player can continue

### TD-8: GM System Prompt Structure

**Choice**: Dynamic system prompt built from adventure state at each turn

**Requirements**: REQ-F-8, Success Criteria 3

**Rationale**:
- Claude needs context about current scene, world state, and player history to maintain narrative consistency
- The Agent SDK's `systemPrompt` option accepts a string that can be constructed dynamically
- Including key narrative facts in the system prompt ensures Claude has context even if conversation history is truncated

**Prompt template structure**:
```
You are the Game Master for an interactive text adventure.

CURRENT SCENE: {scene description}
WORLD STATE: {key facts about the world}
PLAYER CHARACTER: {relevant player info}

Guidelines:
- Respond to player actions with vivid, engaging narrative
- Maintain consistency with established facts
- Ask clarifying questions if player intent is ambiguous
- Keep responses focused and actionable
```

### TD-9: Session Token Authentication

**Choice**: Simple session token generated on adventure start, validated on WebSocket connection

**Requirements**: REQ-NF-5

**Rationale**:
- Spec requires authentication but this is single-user local operation
- Heavy auth systems (OAuth, JWT with refresh) are overkill
- Simple approach: generate random token when adventure starts, store in browser localStorage, include in WebSocket URL query param, server validates

**Implementation**:
- `POST /adventure/new` returns `{ adventureId, sessionToken }`
- WebSocket connects to `/ws?token={sessionToken}&adventureId={adventureId}`
- Server validates token matches stored token for that adventure
- Tokens stored in adventure state file

## Data Model

*Addresses REQ-F-4 (unique adventure identifiers), REQ-F-21 (state contents), REQ-F-15 (browser storage for adventure ID).*

### Adventure State (`state.json`)

```typescript
interface AdventureState {
  id: string;                    // UUID
  sessionToken: string;          // Auth token
  agentSessionId: string | null; // Claude Agent SDK session ID for resume
  createdAt: string;             // ISO 8601
  lastActiveAt: string;          // ISO 8601
  currentScene: {
    description: string;         // Current narrative context
    location: string;            // Where the player is
  };
  worldState: Record<string, unknown>;  // Flexible world facts
  playerCharacter: {
    name: string | null;
    attributes: Record<string, unknown>;
  };
}
```

### Narrative History (`history.json`)

```typescript
interface NarrativeHistory {
  entries: NarrativeEntry[];
}

interface NarrativeEntry {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  type: 'player_input' | 'gm_response';
  content: string;
}
```

### WebSocket Protocol Types

```typescript
// Client → Server
type ClientMessage =
  | { type: 'player_input'; payload: { text: string } }
  | { type: 'start_adventure'; payload: { adventureId?: string } }
  | { type: 'ping' };

// Server → Client
type ServerMessage =
  | { type: 'gm_response_start'; payload: { messageId: string } }
  | { type: 'gm_response_chunk'; payload: { messageId: string; text: string } }
  | { type: 'gm_response_end'; payload: { messageId: string } }
  | { type: 'adventure_loaded'; payload: { adventureId: string; history: NarrativeEntry[] } }
  | { type: 'error'; payload: { code: ErrorCode; message: string; retryable: boolean } }
  | { type: 'pong' };

type ErrorCode =
  | 'INVALID_TOKEN'
  | 'ADVENTURE_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'GM_ERROR'
  | 'STATE_CORRUPTED';
```

## API Design

### REST Endpoints

**POST /adventure/new**
Create a new adventure.

Request: `{}`
Response: `{ adventureId: string, sessionToken: string }`

**GET /adventure/:id**
Get adventure metadata (not full history).

Response: `{ id: string, createdAt: string, lastActiveAt: string, currentScene: SceneInfo }`

### WebSocket Endpoint

**GET /ws**
Upgrade to WebSocket connection.

Query params:
- `token` (required): Session token
- `adventureId` (required): Adventure to connect to

The WebSocket protocol is defined in TD-4.

## Integration Points

### Claude Agent SDK

**Integration type**: Direct library usage via `@anthropic-ai/claude-agent-sdk`
**Data flow**: GameSession → query() → async generator → stream chunks → WebSocket → Frontend

**Key SDK options used**:
- `resume`: Session ID for conversation continuity
- `systemPrompt`: Dynamic GM context
- `tools`: File read/write for state persistence
- `allowedTools`: Restricted to safe operations
- `cwd`: Adventure directory as sandbox
- `includePartialMessages`: Enable token streaming

### Existing Plugin Infrastructure

**Integration type**: Launched via `enter-world` skill
**Data flow**: Claude Code invokes skill → launch-world.sh → starts Bun server → opens browser

**Updates needed to launch-world.sh**:
```bash
# Start backend server
cd "$PROJECT_DIR/adventure-engine-corvran/backend"
bun run start &
SERVER_PID=$!

# Wait for server ready
sleep 2

# Open browser
xdg-open http://localhost:3000 || open http://localhost:3000

# Log
echo "Adventure Engine started (PID: $SERVER_PID)" >> "$LOG_FILE"
```

## Error Handling, Performance, Security

### Error Strategy

*Addresses REQ-F-25, REQ-F-27, REQ-F-28.*

**Approach**: Graceful degradation with user-friendly messages

- **Claude API errors** (REQ-F-25): Catch SDK errors, map to user-friendly messages:
  - Rate limit → "The game master needs a moment. Please try again."
  - Overloaded → "The game master is thinking deeply. Please wait."
  - Other → "Something went wrong. Please try again."
  - All errors include `retryable: boolean` in response
- **WebSocket errors**: Automatic reconnection with status indicator
- **State corruption** (REQ-F-27): Detect on load (JSON parse failure), offer "Start Fresh" option

### Performance Targets

- **REQ-NF-1**: Response streaming begins within 3 seconds
  - Achieved by: Direct SDK streaming, no buffering, immediate WebSocket forwarding
- **Acceptance Test 1**: Initial scene within 5 seconds
  - Achieved by: Pre-built system prompt, no file loading on first turn

### Security Measures

- **REQ-NF-5**: Session token authentication prevents unauthorized access
- **Filesystem sandboxing**: Agent SDK `cwd` restricts file operations to adventure directory
- **Input validation**: Sanitize player input (length limits, no control characters)
- **No remote code execution**: Agent SDK tools limited to Read/Write

## Testing Strategy

### Unit Tests

**Target**: Core business logic in isolation

**Key areas**:
- `GameSession`: Input queuing, state transitions
- `AdventureState`: Load/save operations, corruption detection
- Protocol type parsing and validation

**Approach**: Mock Agent SDK, test state management logic

### Integration Tests

**Key scenarios**:
1. **New adventure flow**: Connect → start adventure → receive initial narrative
2. **Conversation continuity**: Multiple turns → state persists correctly
3. **Reconnection**: Disconnect → reconnect → history restored
4. **Error handling**: Mock Claude error → user sees friendly message

**Approach**: Use Bun's test runner, mock Agent SDK responses

### End-to-End Tests

**Key scenarios** (map to Acceptance Tests):
1. New Adventure Start
2. Player Input Response
3. Session Persistence
4. Streaming Display
5. Connection Recovery
6. Error Display
7. State File Integrity
8. Multiple Adventures

**Approach**: Playwright for browser automation, real server with mocked Agent SDK

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent SDK streaming format changes | Low | High | Pin SDK version, test on upgrade |
| Claude response latency exceeds 5s target | Medium | Medium | Optimize system prompt size, consider caching common scenarios |
| WebSocket message ordering issues | Low | Medium | Include message IDs, sequence numbers for debugging |
| State file corruption from crash during write | Low | High | Write to temp file first, atomic rename |
| Session token in URL logged by proxies | Low | Low | Document local-only usage; for future: use WebSocket auth message instead |

## Dependencies

### Technical Dependencies

**Frontend** (package.json):
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

**Backend** (package.json):
```json
{
  "dependencies": {
    "hono": "^4.6.0",
    "@anthropic-ai/claude-agent-sdk": "^0.1.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.7.0"
  }
}
```

### System Dependencies

- Bun runtime (v1.1+)
- Node.js 20+ (for frontend build tools)
- Claude API key (ANTHROPIC_API_KEY environment variable)

## Open Questions

- [x] Should the `enter-world` skill launch the server and open a browser, or just the server? → **Resolved**: Both
- [x] What default world/scenario should new adventures start with? → **Resolved**: Open-ended prompt
- [x] Should adventure state include undo/rollback capability? → **Resolved**: No mechanical undo
- [ ] Should we implement a "typing indicator" while Claude is generating?
- [ ] Maximum history size before truncation for context window management?
