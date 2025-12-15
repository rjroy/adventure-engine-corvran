# Request ID Tracking Implementation Plan

## Problem Statement

Cannot correlate log entries across a single request. When a player sends input, logs are generated across multiple functions (message parsing, GameSession processing, SDK calls, image generation, etc.) but there's no common identifier linking them.

## Current State

- **Logger**: Pino with child logger support, rotating file output
- **Connection tracking**: `connId` (e.g., `conn_1_1734567890123`) per WebSocket connection
- **Adventure tracking**: `adventureId` per session
- **Gap**: No request-level correlation - each log entry is independent

## Solution: Request ID Propagation

### Approach: Child Logger Passing

Use Pino's child logger feature to create request-scoped loggers that automatically include `reqId` in all log output.

**Why this approach:**
1. No function signature changes needed beyond the entry point
2. Pino child loggers are lightweight (just add context)
3. Consistent with existing logger.child() usage in error-handler.ts
4. Works naturally with async operations

### Request ID Format

```
req_{connId}_{counter}_{timestamp}
```

Example: `req_conn_1_1734567890123_42_1734567891000`

- Includes connId for connection correlation
- Counter prevents collisions within same millisecond
- Timestamp for chronological ordering

### Implementation Steps

#### Step 1: Add Request Logger Factory (logger.ts)

Add helper function to create request-scoped child loggers:

```typescript
let requestCounter = 0;

export function createRequestLogger(
  connId: string,
  adventureId?: string
): { logger: pino.Logger; reqId: string } {
  const reqId = `req_${connId}_${++requestCounter}_${Date.now()}`;
  const childLogger = logger.child({
    reqId,
    connId,
    ...(adventureId && { adventureId }),
  });
  return { logger: childLogger, reqId };
}
```

#### Step 2: Update GameSession to Accept Request Logger

Modify `processInput` to accept an optional request logger:

```typescript
async processInput(
  playerInput: string,
  requestLogger?: pino.Logger
): Promise<void> {
  const log = requestLogger ?? logger;
  // Use log.info(), log.warn(), etc. throughout
}
```

#### Step 3: Update Server WebSocket Handler (server.ts)

In `onMessage`, create request logger and pass to GameSession:

```typescript
case "player_input": {
  const { logger: reqLogger, reqId } = createRequestLogger(
    connId,
    conn.adventureId
  );
  reqLogger.info({ input: msg.input }, "Processing player input");

  await conn.gameSession.processInput(msg.input, reqLogger);
  break;
}
```

#### Step 4: Propagate Logger Through Service Calls

When GameSession calls services (ImageCatalogService, ImageGeneratorService), pass the request logger:

```typescript
// In handleThemeChange
const result = await this.imageCatalogService.getBackgroundImage(
  themeChange.mood,
  requestLogger
);
```

Update service methods to accept optional logger parameter.

### Files to Modify

1. **`backend/src/logger.ts`**
   - Add `createRequestLogger()` function
   - Export request counter for testing

2. **`backend/src/server.ts`**
   - Import `createRequestLogger`
   - Create request logger in `onMessage` for `player_input`
   - Pass logger to `GameSession.processInput()`

3. **`backend/src/game-session.ts`**
   - Update `processInput()` signature to accept optional logger
   - Use request logger throughout method
   - Pass logger to service calls and callbacks

4. **`backend/src/services/image-catalog.ts`** (optional)
   - Accept optional logger in `getBackgroundImage()`

5. **`backend/src/services/image-generator.ts`** (optional)
   - Accept optional logger in generation methods

### Log Output Example

Before:
```json
{"level":30,"time":1734567890123,"msg":"Processing player input"}
{"level":30,"time":1734567890200,"msg":"SDK message"}
{"level":30,"time":1734567890300,"msg":"Theme change detected"}
{"level":30,"time":1734567890400,"msg":"Background image retrieved"}
```

After:
```json
{"level":30,"time":1734567890123,"reqId":"req_conn_1_1_1734567890123","connId":"conn_1_1734567890000","adventureId":"abc-123","msg":"Processing player input"}
{"level":30,"time":1734567890200,"reqId":"req_conn_1_1_1734567890123","connId":"conn_1_1734567890000","adventureId":"abc-123","msg":"SDK message"}
{"level":30,"time":1734567890300,"reqId":"req_conn_1_1_1734567890123","connId":"conn_1_1734567890000","adventureId":"abc-123","msg":"Theme change detected"}
{"level":30,"time":1734567890400,"reqId":"req_conn_1_1_1734567890123","connId":"conn_1_1734567890000","adventureId":"abc-123","msg":"Background image retrieved"}
```

Now you can grep for `reqId: "req_conn_1_1_1734567890123"` to see all logs from a single request.

### Testing Strategy

1. **Unit tests** for `createRequestLogger()`:
   - Verify reqId format
   - Verify counter increments
   - Verify child logger includes context

2. **Integration test**:
   - Send player input
   - Capture logs
   - Verify all logs for that request share same reqId

### Scope Boundaries

**In scope:**
- Request ID generation and format
- Logger propagation for `player_input` messages
- Core GameSession logging with reqId

**Out of scope (future work):**
- Request ID for other message types (ping, authenticate, start_adventure)
- HTTP endpoint request tracking
- Distributed tracing integration
- Log aggregation/search infrastructure

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Performance overhead | Pino child loggers are optimized; negligible impact |
| Breaking existing log parsing | reqId is additive; existing fields unchanged |
| Memory leaks from logger refs | Request loggers are short-lived; GC handles cleanup |

## Acceptance Criteria

1. All logs from a single `player_input` request share the same `reqId`
2. `reqId` includes `connId` for connection correlation
3. Existing log fields (`adventureId`, `connId`) still present
4. No breaking changes to existing log consumers
5. Unit tests pass for request logger creation
