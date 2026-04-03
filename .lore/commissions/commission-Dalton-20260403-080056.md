---
title: "Commission: Build: Compaction Notification Phase B — Client-Side Consumption"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase B of the compaction notification plan at `.lore/plans/compaction-notification-plan.md`.\n\n**Before starting Phase B, read Thorne's Phase A review.** Address ALL findings before proceeding. Check the most recent Thorne commission result for Phase A review findings.\n\nPhase B covers Steps B.1 through B.3:\n\n1. Add `compacted` event handling to `useAdventureStream` hook (`packages/web/lib/use-adventure-stream.ts`). Add `onCompacted` callback parameter. Parse the event with `CompactResponseSchema.safeParse()`. The callback must NOT interfere with streaming state (isStreaming stays true, streamingMessage is not cleared).\n2. Wire `onCompacted` in the page component (`packages/web/app/adventure/[id]/page.tsx`). The callback re-fetches history via `GET /api/daemon/adventures/:id/history` and replaces the `messages` state. The streaming message is untouched.\n3. Write hook-level tests verifying: `onCompacted` fires with parsed payload, `isStreaming` remains true, `streamingMessage` is not cleared.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-45)\n- Plan: `.lore/plans/compaction-notification-plan.md` (Phase B section)\n- Existing mood event client handling in `use-adventure-stream.ts`\n\nTypecheck clean (`tsc --build` from root). Run any web-side tests if they exist."
dependencies:
  - commission-Thorne-20260403-080044
linked_artifacts:
  - packages/backend/src/services/compact-tool.ts

  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/web/lib/use-adventure-stream.ts
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/tests/use-adventure-stream.test.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/web/lib/use-adventure-stream.ts
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/tests/use-adventure-stream.test.ts
activity_timeline:
  - timestamp: 2026-04-03T15:00:56.633Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:00:56.635Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T15:12:25.462Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T15:12:25.466Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T15:12:25.495Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T15:12:54.032Z
    event: progress_report
    reason: "Reading Thorne's Phase A review. Two MEDIUM findings to address before Phase B: F1 (missing try/catch on emitCompactedEvent in compact-tool.ts) and F2 (GM tool integration test missing compacted event assertion). Reading affected files now."
  - timestamp: 2026-04-03T15:13:25.150Z
    event: progress_report
    reason: "Fixing Phase A findings (F1: try/catch in compact-tool.ts, F2: test assertion gap) and implementing Phase B (B.1: hook compacted event, B.2: page component wiring, B.3: tests)."
  - timestamp: 2026-04-03T15:17:23.301Z
    event: result_submitted
    reason: "## Phase B Complete: Client-Side Compaction Notification\n\n### Phase A Findings Fixed\n\n**F1 (MEDIUM)**: Wrapped `emitCompactedEvent` in try/catch in `compact-tool.ts:24`, matching the mood tool's error-isolation pattern. Emission failure no longer corrupts the tool result.\n\n**F2 (MEDIUM)**: Renamed the GM tool integration test to accurately reflect its scope (tool_use suppression, not emission verification). Added a comment documenting the infrastructure limitation: mock query doesn't execute real MCP tool handlers, so `emitCompactedEvent` is never invoked. Updated `buildTestApp` to pass `compactionService` and `fileOps` to `createSessionRunner` so the compact tool is at least registered when deps are provided. The emission wiring is covered at unit level (compact-tool.test.ts) and route level (threshold tests).\n\n### Phase B Implementation\n\n**B.1: Hook `compacted` event handling** (`packages/web/lib/use-adventure-stream.ts`)\n- Added `onCompacted?: (result: CompactResponse) => void` parameter\n- Added `compacted` event branch in `processLine` using `CompactResponseSchema.safeParse()`\n- Callback fires without interfering with streaming state (isStreaming stays true, streamingMessage untouched)\n- Added `onCompacted` to `sendMessage` dependency array\n\n**B.2: Page component wiring** (`packages/web/app/adventure/[id]/page.tsx`)\n- Added `handleCompacted` callback that re-fetches history via `GET /api/daemon/adventures/:id/history` and replaces `messages` state\n- Silent failure on fetch error (server state is correct, client stale until reload)\n- Passed to `useAdventureStream` as third argument\n\n**B.3: Tests** (`packages/web/tests/use-adventure-stream.test.ts`)\n- 4 new tests in \"compacted event parsing\" describe block:\n  - Compacted event parsed with correct payload\n  - Compacted event does not disrupt text accumulation\n  - Invalid compacted payload handled gracefully\n  - Compacted event split across chunks is reassembled\n\n### Verification\n- `tsc --build`: clean\n- 610 tests pass, 0 failures across 47 files"
  - timestamp: 2026-04-03T15:17:31.101Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Fixing Phase A findings (F1: try/catch in compact-tool.ts, F2: test assertion gap) and implementing Phase B (B.1: hook compacted event, B.2: page component wiring, B.3: tests)."
projectName: corvran
---
## Phase B Complete: Client-Side Compaction Notification

### Phase A Findings Fixed

**F1 (MEDIUM)**: Wrapped `emitCompactedEvent` in try/catch in `compact-tool.ts:24`, matching the mood tool's error-isolation pattern. Emission failure no longer corrupts the tool result.

**F2 (MEDIUM)**: Renamed the GM tool integration test to accurately reflect its scope (tool_use suppression, not emission verification). Added a comment documenting the infrastructure limitation: mock query doesn't execute real MCP tool handlers, so `emitCompactedEvent` is never invoked. Updated `buildTestApp` to pass `compactionService` and `fileOps` to `createSessionRunner` so the compact tool is at least registered when deps are provided. The emission wiring is covered at unit level (compact-tool.test.ts) and route level (threshold tests).

### Phase B Implementation

**B.1: Hook `compacted` event handling** (`packages/web/lib/use-adventure-stream.ts`)
- Added `onCompacted?: (result: CompactResponse) => void` parameter
- Added `compacted` event branch in `processLine` using `CompactResponseSchema.safeParse()`
- Callback fires without interfering with streaming state (isStreaming stays true, streamingMessage untouched)
- Added `onCompacted` to `sendMessage` dependency array

**B.2: Page component wiring** (`packages/web/app/adventure/[id]/page.tsx`)
- Added `handleCompacted` callback that re-fetches history via `GET /api/daemon/adventures/:id/history` and replaces `messages` state
- Silent failure on fetch error (server state is correct, client stale until reload)
- Passed to `useAdventureStream` as third argument

**B.3: Tests** (`packages/web/tests/use-adventure-stream.test.ts`)
- 4 new tests in "compacted event parsing" describe block:
  - Compacted event parsed with correct payload
  - Compacted event does not disrupt text accumulation
  - Invalid compacted payload handled gracefully
  - Compacted event split across chunks is reassembled

### Verification
- `tsc --build`: clean
- 610 tests pass, 0 failures across 47 files
