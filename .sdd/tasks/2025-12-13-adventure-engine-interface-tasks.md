---
specification: [.sdd/specs/2025-12-13-adventure-engine-interface.md](./../specs/2025-12-13-adventure-engine-interface.md)
plan: [.sdd/plans/2025-12-13-adventure-engine-interface-plan.md](./../plans/2025-12-13-adventure-engine-interface-plan.md)
status: Ready for Implementation
version: 1.0.0
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Adventure Engine Interface - Task Breakdown

## Task Summary
Total: 14 tasks | Complexity Distribution: 3×S, 8×M, 3×L

## Foundation

### TASK-001: Project Structure and Configuration
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Set up the monorepo structure with frontend/, backend/, and shared/ directories. Configure TypeScript, ESLint, and package.json files for each package with proper dependencies.

**Acceptance Criteria**:
- [ ] `frontend/package.json` with React 19, Vite, TypeScript dependencies
- [ ] `backend/package.json` with Hono, Claude Agent SDK, Bun types
- [ ] `tsconfig.json` in both frontend and backend with strict mode
- [ ] `eslint.config.js` in both packages per project conventions
- [ ] `shared/` directory exists for protocol types
- [ ] `bun install` succeeds in both packages

**Files**:
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/eslint.config.js`
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/eslint.config.js`
- Create: `shared/protocol.ts`

**Testing**: Run `bun install && bun run typecheck` in both packages

---

### TASK-002: WebSocket Protocol Types
**Priority**: Critical | **Complexity**: S | **Dependencies**: TASK-001

**Description**: Define the shared TypeScript types for WebSocket communication between frontend and backend as specified in TD-4 of the plan.

**Acceptance Criteria**:
- [ ] `ClientMessage` union type with `player_input`, `start_adventure`, `ping`
- [ ] `ServerMessage` union type with all response types (gm_response_*, adventure_loaded, error, pong)
- [ ] `ErrorCode` type with defined error codes
- [ ] `NarrativeEntry` interface for history entries
- [ ] Types exported and importable from both frontend and backend

**Files**:
- Create: `shared/protocol.ts`
- Create: `frontend/src/types/protocol.ts` (re-export or copy)
- Create: `backend/src/types/protocol.ts` (re-export or copy)

**Testing**: TypeScript compiles without errors; types are usable in both packages

---

## Backend

### TASK-003: Adventure State Persistence
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Implement `AdventureState` class that handles loading, saving, and validating adventure state from the filesystem. State stored as JSON in `adventures/{id}/` directory.

**Acceptance Criteria**:
- [ ] `create(id)` initializes new adventure with UUID, token, empty state
- [ ] `load(id)` reads from `adventures/{id}/state.json` and `history.json`
- [ ] `save()` atomically writes state (temp file + rename) per risk mitigation
- [ ] `appendHistory(entry)` adds to history and persists
- [ ] Corruption detection: returns error if JSON parse fails (REQ-F-27)
- [ ] Validates session token on load

**Files**:
- Create: `backend/src/adventure-state.ts`
- Create: `backend/src/types/state.ts` (AdventureState, NarrativeHistory interfaces)

**Testing**: Unit tests for create, load, save, corruption detection with mocked filesystem

---

### TASK-004: Hono Server with WebSocket Support
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Set up Hono application with WebSocket upgrade using `hono/bun`. Implement REST endpoints for adventure management and WebSocket lifecycle handlers.

**Acceptance Criteria**:
- [ ] `POST /adventure/new` creates adventure, returns `{ adventureId, sessionToken }`
- [ ] `GET /adventure/:id` returns adventure metadata
- [ ] `GET /ws` upgrades to WebSocket with token and adventureId validation
- [ ] WebSocket handlers: onOpen, onMessage, onClose, onError
- [ ] Ping/pong heartbeat handling
- [ ] Server exports `{ fetch, websocket }` for Bun

**Files**:
- Create: `backend/src/server.ts`
- Create: `backend/src/index.ts` (entry point)

**Testing**: Integration tests for REST endpoints; WebSocket connection test

---

### TASK-005: Game Session with Input Queue
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-003, TASK-004

**Description**: Implement `GameSession` class that manages the interaction between WebSocket connections and the Claude Agent SDK. Includes input queuing to prevent race conditions (REQ-F-18).

**Acceptance Criteria**:
- [ ] Maintains `inputQueue` and `isProcessing` state
- [ ] `handleInput(text)` queues input; processes if not busy
- [ ] Processes queue sequentially after each response completes
- [ ] Sends `gm_response_start`, `gm_response_chunk`, `gm_response_end` messages
- [ ] Updates adventure state after each GM response
- [ ] Handles multiple rapid inputs without dropping any

**Files**:
- Create: `backend/src/game-session.ts`

**Testing**: Unit tests for queue behavior with mocked Agent SDK

---

### TASK-006: Claude Agent SDK Integration
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-005

**Description**: Integrate Claude Agent SDK with streaming response handling. Build dynamic GM system prompt from adventure state. Configure tools and sandbox per TD-1.

**Acceptance Criteria**:
- [ ] Uses `query()` with `resume` for conversation continuity
- [ ] Builds system prompt from current scene, world state, player info (TD-8)
- [ ] Streams tokens via async generator to WebSocket
- [ ] Configures `allowedTools: ['Read', 'Write']` with `cwd` sandbox
- [ ] Stores and reuses `agentSessionId` for conversation continuity
- [ ] Response streaming begins within 3 seconds (REQ-NF-1)

**Files**:
- Modify: `backend/src/game-session.ts`
- Create: `backend/src/gm-prompt.ts` (system prompt builder)

**Testing**: Integration test with mocked Agent SDK; verify streaming events

---

### TASK-007: Backend Error Handling
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-006

**Description**: Implement error handling for Claude API errors, WebSocket errors, and state corruption. Map errors to user-friendly messages per REQ-F-25.

**Acceptance Criteria**:
- [ ] Rate limit errors → "The game master needs a moment. Please try again."
- [ ] Overloaded errors → "The game master is thinking deeply. Please wait."
- [ ] Generic errors → "Something went wrong. Please try again."
- [ ] All error responses include `retryable: boolean`
- [ ] State corruption offers "Start Fresh" option
- [ ] Errors logged with detail for debugging (REQ-F-28)

**Files**:
- Create: `backend/src/error-handler.ts`
- Modify: `backend/src/game-session.ts`

**Testing**: Unit tests for each error type mapping

---

## Frontend

### TASK-008: React App with Vite Setup
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-001

**Description**: Initialize React application with Vite, create entry point and App component shell. Configure Vite for development proxy to backend.

**Acceptance Criteria**:
- [ ] `vite.config.ts` with React plugin and WebSocket proxy to localhost:3001
- [ ] `index.html` with root mount point
- [ ] `src/main.tsx` renders App
- [ ] `src/App.tsx` shell with basic layout
- [ ] `bun run dev` starts development server

**Files**:
- Create: `frontend/vite.config.ts`, `frontend/index.html`
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`

**Testing**: Dev server starts, shows placeholder content

---

### TASK-009: WebSocket Hook with Reconnection
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002, TASK-008

**Description**: Create `useWebSocket` hook that manages WebSocket connection with exponential backoff reconnection (TD-7). Handles connection state and message dispatching.

**Acceptance Criteria**:
- [ ] Connects with token and adventureId from URL params
- [ ] Exposes connection status: connected, disconnected, reconnecting
- [ ] Implements exponential backoff: 1s → 2s → 4s → 8s, max 30s
- [ ] Automatic reconnection within 30 seconds (REQ-NF-2)
- [ ] Sends ping, receives pong for heartbeat
- [ ] Provides `sendMessage(msg)` function
- [ ] Returns parsed `ServerMessage` via callback

**Files**:
- Create: `frontend/src/hooks/useWebSocket.ts`

**Testing**: Unit tests for reconnection logic with mock WebSocket

---

### TASK-010: Narrative Log Component
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-009

**Description**: Build `NarrativeLog` component that displays scrollable history of player inputs and GM responses. Supports streaming display with typewriter effect (REQ-F-13).

**Acceptance Criteria**:
- [ ] Scrollable container showing all narrative entries
- [ ] Distinguishes player input vs GM response visually
- [ ] Typewriter effect for streaming GM responses
- [ ] Auto-scrolls to bottom on new content
- [ ] Handles `gm_response_start/chunk/end` message sequence
- [ ] Displays history from `adventure_loaded` message

**Files**:
- Create: `frontend/src/components/NarrativeLog.tsx`
- Create: `frontend/src/components/NarrativeEntry.tsx`

**Testing**: Renders history correctly; streaming updates display progressively

---

### TASK-011: Input Field and Connection Status
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-009

**Description**: Build `InputField` for player commands and `ConnectionStatus` indicator. Input disabled during disconnection.

**Acceptance Criteria**:
- [ ] Text input with submit button/Enter key
- [ ] Clears input after submit
- [ ] Disabled when disconnected or GM is responding
- [ ] Connection status shows: Connected (green), Disconnected (red), Reconnecting (yellow)
- [ ] Status updates based on WebSocket hook state

**Files**:
- Create: `frontend/src/components/InputField.tsx`
- Create: `frontend/src/components/ConnectionStatus.tsx`

**Testing**: Components render correctly; input disabled in appropriate states

---

### TASK-012: Adventure Management UI
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-010, TASK-011

**Description**: Build UI for starting new adventures and resuming existing ones. Persists adventure ID in localStorage (REQ-F-15, REQ-F-16).

**Acceptance Criteria**:
- [ ] "New Adventure" button calls `POST /adventure/new`
- [ ] "Resume Adventure" option if adventureId in localStorage
- [ ] Saves adventureId and sessionToken to localStorage on new adventure
- [ ] Clears localStorage and shows menu on "Start Fresh" after corruption
- [ ] Displays adventure list if multiple adventures exist

**Files**:
- Create: `frontend/src/components/AdventureMenu.tsx`
- Modify: `frontend/src/App.tsx`

**Testing**: Can create new adventure, resume existing one

---

## Integration

### TASK-013: Enter-World Skill Update
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-004, TASK-008

**Description**: Update the `enter-world` skill to launch both backend server and open browser. Ensure clean startup and shutdown.

**Acceptance Criteria**:
- [ ] `launch-world.sh` starts backend server (`bun run start`)
- [ ] Waits for server ready before opening browser
- [ ] Opens `http://localhost:3000` in default browser
- [ ] Logs server PID for later shutdown
- [ ] Works on Linux (xdg-open) and macOS (open)

**Files**:
- Modify: `skills/enter-world/scripts/launch-world.sh`
- Modify: `skills/enter-world/SKILL.md` if needed

**Testing**: Running skill starts server and opens browser successfully

---

### TASK-014: End-to-End Testing
**Priority**: Medium | **Complexity**: L | **Dependencies**: All above tasks

**Description**: Implement end-to-end tests covering all acceptance tests from the spec using Playwright.

**Acceptance Criteria**:
- [ ] Test 1: New Adventure Start - player receives initial narrative within 5s
- [ ] Test 2: Player Input Response - streaming response to "look around"
- [ ] Test 3: Session Persistence - close/reopen browser, history intact
- [ ] Test 4: Streaming Display - 500+ word response displays progressively
- [ ] Test 5: Connection Recovery - force disconnect, reconnects within 10s
- [ ] Test 6: Error Display - rate limit shows friendly message
- [ ] Test 7: State File Integrity - valid JSON after 10 exchanges
- [ ] Test 8: Multiple Adventures - switch between A and B without crossover

**Files**:
- Create: `e2e/` directory with Playwright config and tests
- Create: `e2e/adventure.spec.ts`

**Testing**: All Playwright tests pass with mocked Agent SDK

---

## Dependency Graph
```
TASK-001 ──┬──> TASK-002 ──┬──> TASK-003 ──┬──> TASK-004 ──┬──> TASK-005 ──> TASK-006 ──> TASK-007
           │               │               │               │
           │               │               └───────────────┴──> TASK-013
           │               │
           └──> TASK-008 ──┼──> TASK-009 ──┬──> TASK-010 ──┬──> TASK-012
                           │               │               │
                           │               └──> TASK-011 ──┘
                           │
                           └──> TASK-013

All tasks ──> TASK-014
```

## Implementation Order

**Phase 1** (Foundation): TASK-001, TASK-002
- Can parallelize: TASK-001 alone, then TASK-002

**Phase 2** (Backend Core): TASK-003, TASK-004, TASK-008
- Can parallelize: TASK-003+TASK-004 (backend) with TASK-008 (frontend)

**Phase 3** (Core Features): TASK-005, TASK-006, TASK-009, TASK-010, TASK-011
- Can parallelize: Backend (005→006) with Frontend (009→010, 011)

**Phase 4** (Integration): TASK-007, TASK-012, TASK-013
- TASK-007 can happen alongside TASK-012, TASK-013

**Phase 5** (Validation): TASK-014

## Notes

- **Parallelization**: Frontend and backend tracks can proceed in parallel after Phase 1
- **Critical path**: TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-014
- **Risk areas**: TASK-006 (Agent SDK integration) has highest uncertainty - may need iteration
