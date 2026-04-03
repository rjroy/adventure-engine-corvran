---
title: "Implementation plan: compaction-notification"
date: 2026-04-03
status: approved
tags: [plan, compaction, sse, notification, client-sync]
modules: [backend, shared, web]
related: [.lore/specs/compaction-system-spec.md, .lore/plans/compaction-system-plan.md]
---

# Plan: Compaction Notification

This plan covers only the notification gap: REQ-COMP-42 through REQ-COMP-48, plus the restructuring of REQ-COMP-26 (moving the threshold check inside `streamSSE`). All four original compaction phases are implemented. This is the delta.

Two phases. Phase A handles the server-side emission and the shared schema. Phase B handles client-side consumption. Phase A is backend-only; Phase B is web-only. They could be implemented in either order, but A first means the events are flowing before the client tries to consume them, which makes integration testing straightforward.

## Spec Reference

**Spec**: `.lore/specs/compaction-system-spec.md`

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-COMP-42 | A | `compacted` SSE event format and payload |
| REQ-COMP-43 | A | Threshold trigger moves inside `streamSSE`, emits event |
| REQ-COMP-44 | A | GM tool emits event via `emitCompactedEvent` callback |
| REQ-COMP-45 | B | Client `useAdventureStream` handles `compacted` event |
| REQ-COMP-46 | A | No event on failed compaction |
| REQ-COMP-47 | A | No event on world compaction |
| REQ-COMP-48 | A | Shared schema reuses `CompactResponseSchema` |

## Codebase Context

### The Restructuring Problem

The threshold check currently runs at `adventure-routes.ts:147-183`, *before* `streamSSE` is entered at line 248. The SSE stream doesn't exist yet when compaction fires, so there's no stream to emit events on.

REQ-COMP-43 requires moving the threshold check *inside* the `streamSSE` callback. This is a structural change to the message handler, not just adding an event emission.

### Files That Will Change

**`packages/backend/src/routes/adventure-routes.ts`** (493 LOC). The message handler needs restructuring (Phase A). The threshold check block (lines 147-183) moves inside the `streamSSE` callback (currently starting at line 248). The `runQuery` call and its `emitMoodEvent` pattern (line 268) is the template for `emitCompactedEvent`.

**`packages/backend/src/services/compact-tool.ts`** (41 LOC). The tool handler needs an `emitCompactedEvent` callback in its deps interface, called on successful compaction (Phase A).

**`packages/backend/src/services/session-runner.ts`** (112 LOC). `RunQueryParams` gains `emitCompactedEvent` (Phase A). The callback is passed through to `createCompactToolDef` at line 66-78.

**`packages/shared/src/schemas/adventures.ts`** (111 LOC). Export an alias or verify `CompactResponseSchema` is usable as the SSE event schema (Phase A). Currently at line 102-106.

**`packages/web/lib/use-adventure-stream.ts`** (173 LOC). The `processLine` function gains a `compacted` event branch, alongside the existing `mood` branch at line 94-102 (Phase B).

**`packages/web/app/adventure/[id]/page.tsx`** (~270+ LOC). The `useAdventureStream` call gains an `onCompacted` callback that re-fetches history and replaces displayed messages (Phase B).

### No New Files

All changes are modifications to existing files. No new services, no new test files beyond what's described below.

### The Mood Event Pattern

This is the pattern to follow. The flow for `emitMoodEvent`:

1. **Route defines the callback** (`adventure-routes.ts:268-269`): `emitMoodEvent: (payload) => stream.writeSSE({ event: "mood", data: JSON.stringify(payload) })`
2. **Session runner passes it through** (`session-runner.ts:59`): to `createMoodToolDef({ ..., emitMoodEvent: params.emitMoodEvent })`
3. **Tool calls the callback** on success
4. **Client parses the event** (`use-adventure-stream.ts:94-102`): `MoodEventSchema.safeParse(parsed)`, then calls `applyMood()`

The `compacted` event follows this pattern exactly, with the compact tool and `CompactResponseSchema` substituted for mood tool and `MoodEventSchema`.

## Implementation Steps

### Phase A: Server-Side Emission

Build both emission paths (threshold and GM tool) and the shared schema. Everything is backend + shared.

**Dalton commission**: Implement Phase A.
**Thorne commission**: Review Phase A.

#### Step A.1: Verify Shared Schema (REQ-COMP-48)

**Files**: `packages/shared/src/schemas/adventures.ts`, `packages/shared/src/index.ts`
**Addresses**: REQ-COMP-48

`CompactResponseSchema` already exists at `adventures.ts:102-106` with `{ archived: string, previousSize: number, newSize: number }`. REQ-COMP-48 says to reuse this same shape for the SSE event.

Check that `CompactResponseSchema` is exported from the shared package index (`packages/shared/src/index.ts`). If not, add the export. Also export the inferred type: `export type CompactResponse = z.infer<typeof CompactResponseSchema>`.

The client will use `CompactResponseSchema.safeParse()` to validate the SSE event payload, the same way `MoodEventSchema.safeParse()` is used for mood events.

This is a verification step, not a creation step. If the schema and type are already exported, nothing to do.

#### Step A.2: Restructure Message Handler (REQ-COMP-43, REQ-COMP-26, REQ-COMP-46, REQ-COMP-47)

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-COMP-43, REQ-COMP-26, REQ-COMP-46, REQ-COMP-47

This is the largest change. The threshold check block must move from outside `streamSSE` to inside it.

**Current flow** (lines 142-353):
```
142: Read history
147: Threshold checks (outside streamSSE)
185: Append player message
248: Enter streamSSE
259:   runQuery (inside streamSSE)
```

**New flow** per REQ-COMP-26 (updated):
```
Read adventure state, read history (outside streamSSE, as before)
Enter streamSSE
  Check history threshold; if exceeded, compact, emit `compacted` event, re-read history
  Check world threshold; if exceeded, compact, re-read world (no event per REQ-COMP-47)
  Append player message
  Assemble system prompt (moved inside streamSSE)
  runQuery
```

Concrete changes:

1. **Move the threshold check block** (current lines 147-183) to immediately after `const abortController = new AbortController();` inside the `streamSSE` callback (after line 253).

2. **After successful history compaction**, emit the `compacted` event on the stream:
   ```typescript
   const result = await compactionService.compactHistory(adventurePath, {
     character: adventure.character ?? undefined,
     world: adventure.world ?? undefined,
   });
   await stream.writeSSE({
     event: "compacted",
     data: JSON.stringify(result),
   });
   history = await historyService.readHistory(adventurePath);
   ```

3. **On failure, emit nothing** (REQ-COMP-46). The existing catch blocks already swallow errors and proceed. No change to the error paths.

4. **World compaction emits no event** (REQ-COMP-47). The world threshold block stays as-is, no `writeSSE` call.

5. **Move the player message append and prompt assembly** inside `streamSSE` too, since they depend on the (possibly compacted) history. The `appendPlayerMessage` call (currently line 186), plugin resolution (lines 188-235), and `assembleSystemPrompt` call (lines 237-245) all move inside the `streamSSE` callback, after the threshold checks and before `runQuery`.

**Why prompt assembly moves too**: The system prompt uses the history value. If the threshold check compacts history inside `streamSSE`, the prompt must be assembled after that, also inside `streamSSE`. Otherwise the prompt uses pre-compaction history.

**What stays outside**: Adventure existence check, request parsing, reading initial adventure state and history. These don't need the stream and can fail with normal HTTP error responses (400, 404, 503). Moving them inside `streamSSE` would require error handling through the stream rather than clean HTTP responses.

**Risk**: This is a structural refactor of the message handler. The logic doesn't change (threshold check, append, prompt, query), only its location within the function. But the indentation shift is significant. Test coverage from `message-threshold.test.ts` and `message-route.test.ts` should catch regressions.

#### Step A.3: Add `emitCompactedEvent` to GM Tool Path (REQ-COMP-44)

**Files**: `packages/backend/src/services/compact-tool.ts`, `packages/backend/src/services/session-runner.ts`, `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-COMP-44

Three files change, following the `emitMoodEvent` pattern exactly:

**compact-tool.ts**: Add `emitCompactedEvent` to `CompactToolDeps`:
```typescript
export interface CompactToolDeps {
  compactionService: CompactionService;
  adventurePath: string;
  getAdventureContext: () => Promise<{ character?: string; world?: string }>;
  emitCompactedEvent: (result: CompactionResult) => Promise<void>;  // new
}
```

In the handler's success path (line 22-27), call the callback after compaction succeeds:
```typescript
const result = await compactionService.compactHistory(adventurePath, context);
await deps.emitCompactedEvent(result);  // new: emit before returning tool result
return {
  content: [
    { type: "text", text: `History compacted. Scene archived to ${result.archived}.` },
  ],
};
```

Import `CompactionResult` from `./compaction-service`.

**Type note**: The callback type uses `CompactionResult` (the service's return type), not `CompactResponse` (the shared schema type). These types are structurally identical (`{ archived: string, previousSize: number, newSize: number }`), so TypeScript's structural typing makes the service result directly assignable to `CompactResponse` at the serialization boundary (the route's `JSON.stringify`). Using the service type in the tool avoids coupling the tool to the shared package.

**session-runner.ts**: Add `emitCompactedEvent` to `RunQueryParams`:
```typescript
export interface RunQueryParams {
  // ... existing fields ...
  emitCompactedEvent: (result: CompactionResult) => Promise<void>;  // new
}
```

Pass it through to `createCompactToolDef` at lines 66-78:
```typescript
const compactToolDef = createCompactToolDef({
  compactionService,
  adventurePath,
  getAdventureContext: async () => { ... },
  emitCompactedEvent: params.emitCompactedEvent,  // new
});
```

Import `CompactionResult` from `./compaction-service`.

**Caller impact**: Every call site constructing `RunQueryParams` needs the new field. The only production caller is `adventure-routes.ts` (line 259), addressed above. Test files that construct `RunQueryParams` directly (grep for `runQuery(` and `RunQueryParams` before starting) will also need updating with a no-op callback: `emitCompactedEvent: async () => {}`.

**adventure-routes.ts**: Define the callback in the `streamSSE` block, alongside `emitMoodEvent` (line 268):
```typescript
emitMoodEvent: (payload) =>
  stream.writeSSE({ event: "mood", data: JSON.stringify(payload) }),
emitCompactedEvent: (result) =>
  stream.writeSSE({ event: "compacted", data: JSON.stringify(result) }),
```

#### Step A.4: Suppress `compact_history` from `tool_use` SSE Events

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-COMP-44 (implied)

The message handler emits `tool_use` SSE events for tool results (lines 296-311). `set_mood` is already suppressed at line 300-302:
```typescript
if (toolName === "set_mood" || toolName === "mcp__corvran__set_mood") continue;
```

Add `compact_history` to the suppression. The existing pattern is a single `if` with OR conditions, so extend it or add a parallel `if` (either works, match whichever style the code uses at implementation time):
```typescript
if (toolName === "compact_history" || toolName === "mcp__corvran__compact_history") continue;
```

Rationale: The `compacted` SSE event is the intended notification channel. Emitting *both* a `tool_use` event and a `compacted` event for the same compaction would confuse the client and show raw tool output ("History compacted. Scene archived to past/scene-003.md.") in the tool events area of the UI.

#### Step A.5: Write Phase A Tests

**Files**: `packages/backend/tests/routes/message-threshold.test.ts` (existing), `packages/backend/tests/services/compact-tool.test.ts` (existing)
**Addresses**: REQ-COMP-42, REQ-COMP-43, REQ-COMP-44, REQ-COMP-46

Update existing test files with new test cases from the spec's AI Validation section:

**In `message-threshold.test.ts`** (threshold SSE event tests):

1. **Compacted SSE event on threshold**: History exceeds threshold, send a message, parse the SSE stream. Verify a `compacted` event is emitted with `archived`, `previousSize`, `newSize` fields *before* the `text` events begin. The response is an SSE stream; parse it line by line and check event ordering.

2. **No compacted event on failure**: Mock the Haiku call to fail during threshold-triggered compaction. Verify no `compacted` event is emitted and the stream proceeds with `text` and `done` events normally.

3. **No compacted event for world**: Both thresholds exceeded. Verify a `compacted` event fires for history but not for world.

**In `compact-tool.test.ts`** (GM tool emission tests):

4. **emitCompactedEvent called on success**: Mock compactionService.compactHistory succeeds. Verify `emitCompactedEvent` was called with the `CompactionResult`. This tests the callback invocation, not the SSE emission (that's the route's job).

5. **emitCompactedEvent not called on failure**: Mock compactionService.compactHistory throws. Verify `emitCompactedEvent` was not called (REQ-COMP-46).

**In `message-threshold.test.ts` or a new `message-gm-compact.test.ts`** (GM tool SSE stream integration test, from spec AI Validation):

6. **Compacted SSE event from GM tool**: Mock a `query()` call where the AI invokes `compact_history`. Parse the SSE stream. Verify a `compacted` event is emitted during the stream (between `text` events, before `done`). This tests the full wiring: compact tool calls `emitCompactedEvent`, session runner passes through to route, route writes SSE. This is a route-level integration test using `buildTestApp`, not a unit test of the tool in isolation.

---

### Phase B: Client-Side Consumption

Handle the `compacted` event in the stream hook and refresh displayed history.

**Dalton commission**: Implement Phase B.
**Thorne commission**: Review Phase B.

#### Step B.1: Add `compacted` Event Handling to `useAdventureStream` (REQ-COMP-45)

**Files**: `packages/web/lib/use-adventure-stream.ts`
**Addresses**: REQ-COMP-45

Add an `onCompacted` callback parameter to `useAdventureStream`, following the pattern of the existing `onComplete` parameter:

```typescript
export function useAdventureStream(
  adventureId: string,
  onComplete?: (text: string) => void,
  onCompacted?: (result: CompactResponse) => void,  // new
): UseAdventureStreamReturn {
```

In `processLine`, add a `compacted` event branch alongside the `mood` branch (after line 102):

```typescript
} else if (eventType === "compacted") {
  const compactParsed = CompactResponseSchema.safeParse(parsed);
  if (compactParsed.success) {
    onCompacted?.(compactParsed.data);
  }
}
```

Import `CompactResponseSchema` and `CompactResponse` from `@corvran/shared`.

**Key behavior per REQ-COMP-45**: The `compacted` event does NOT clear the streaming message, stop streaming, or otherwise interfere with the in-progress turn. The GM's response continues to stream normally after the event. The callback fires, the page component handles the history refresh, and streaming continues.

#### Step B.2: Wire `onCompacted` in the Page Component (REQ-COMP-45)

**Files**: `packages/web/app/adventure/[id]/page.tsx`
**Addresses**: REQ-COMP-45

Add an `onCompacted` callback that re-fetches history and replaces the message list:

```typescript
const handleCompacted = useCallback(async (result: CompactResponse) => {
  try {
    const historyRes = await fetch(`/api/daemon/adventures/${id}/history`);
    if (historyRes.ok) {
      const data = await historyRes.json() as { history: string | null };
      setMessages(data.history ? parseHistory(data.history) : []);
    }
  } catch {
    // History refresh failed silently; the page will show stale messages
    // until the next reload. This is acceptable: the server state is correct.
  }
}, [id]);
```

Pass it to `useAdventureStream`:

```typescript
const { isStreaming, streamingMessage, error, sendMessage, stop } =
  useAdventureStream(id, handleStreamComplete, handleCompacted);
```

**Behavior during an active stream** (REQ-COMP-45 step 3): The `handleCompacted` callback replaces the `messages` state with compacted history. The `streamingMessage` (the GM's in-progress response) is untouched because it's separate state. The UI shows `[compacted recap messages] + [GM's streaming response]`. When the turn completes and `handleStreamComplete` fires, it appends the GM's full response to the (already compacted) message list, which matches what `history.md` contains.

**No inline status message**: Unlike player-triggered compaction (which shows "Creating recap..."), server-side compaction is fast and invisible. The message list simply shortens as the recap replaces the full history. No loading indicator is needed.

#### Step B.3: Write Phase B Tests

**Files**: New test file in `packages/web/` (e.g., `packages/web/lib/__tests__/use-adventure-stream.test.ts` or co-located)
**Addresses**: REQ-COMP-45

The spec's AI Validation section calls for:

1. **Client callback on compacted event**: Simulate a `compacted` SSE event in the stream. Verify the `onCompacted` callback fires with the parsed `CompactResponse` payload. The hook test verifies callback invocation; the actual history re-fetch is the page component's responsibility.

This is a unit test of the hook's event parsing. It needs to construct a mock SSE stream that includes a `compacted` event among `text` events. The test verifies:
- `onCompacted` is called with `{ archived: "past/scene-003.md", previousSize: 145230, newSize: 4820 }`
- `isStreaming` remains true (the stream is still active)
- `streamingMessage` is not cleared

Testing the page component's `handleCompacted` (the fetch + setMessages logic) is harder without a component testing framework. If the project has one, add a test. If not, the hook-level test is sufficient for this phase.

---

## Delegation Guide

| Phase | Dalton Commission | Thorne Commission | Dependencies |
|-------|-------------------|-------------------|--------------|
| A | Implement server-side SSE emission (threshold restructure, GM tool callback, shared schema, tool suppression, tests) | Review Phase A | All 4 original phases complete |
| B | Implement client-side `compacted` event handling (hook, page component, tests) | Review Phase B | Phase A complete and reviewed |

Phase B depends on Phase A because the client needs a running server that emits `compacted` events to integration test against. The hook unit test (B.3) can be written independently, but the full flow requires Phase A.

**Review focus areas:**

- **Phase A**: Message handler restructuring (did prompt assembly move inside `streamSSE`?). Event emission ordering (does `compacted` fire before `text` events?). `compact_history` suppressed from `tool_use` events. Failed compaction emits no event. World compaction emits no event.
- **Phase B**: `onCompacted` doesn't interfere with streaming state. History re-fetch doesn't clear streaming message. `CompactResponseSchema` validation matches the server's emission format.

## Spec Ambiguities and Pre-Implementation Decisions

### Resolved by this plan

1. **Prompt assembly location after restructuring.** The spec (REQ-COMP-43) says to move the threshold check inside `streamSSE`. It doesn't explicitly say "also move prompt assembly." But prompt assembly depends on the (possibly compacted) history, so it must follow the threshold check. This plan moves player message append, plugin resolution, and prompt assembly inside `streamSSE` too. Everything between the threshold check and `runQuery` stays together.

2. **`compact_history` tool_use suppression.** The spec doesn't mention suppressing the tool from `tool_use` SSE events, but the `set_mood` tool is already suppressed (line 300-302) because it has its own event channel. Same logic applies: `compact_history` has the `compacted` event as its dedicated notification channel. Emitting both would be redundant and confusing.

3. **`onCompacted` parameter position.** The hook currently takes `(adventureId, onComplete?)`. Adding `onCompacted` as a third positional parameter works for now, but if more callbacks accumulate, an options object would be cleaner. This plan uses the positional approach for consistency with the existing API. Refactoring to an options object is a separate concern.

### Open questions (don't block starting)

1. **Error feedback on compacted-event history refresh failure.** If `handleCompacted` fails to fetch updated history, the plan silently ignores it (the server state is correct, the client is stale until reload). The spec doesn't prescribe error UX for this case. Worth confirming during review whether a subtle status message would be better.
