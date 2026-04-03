---
title: "Commission: Review: Compaction Notification Phase B"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the Phase B implementation of compaction notifications (client-side consumption).\n\nRead the plan at `.lore/plans/compaction-notification-plan.md` (Phase B section) and the spec at `.lore/specs/compaction-system-spec.md` (REQ-COMP-45).\n\nAlso verify that any Phase A review findings were addressed.\n\nReview focus areas from the plan:\n- `onCompacted` callback doesn't interfere with streaming state (isStreaming stays true, streamingMessage untouched)\n- History re-fetch doesn't clear the streaming message\n- `CompactResponseSchema` validation matches the server's emission format\n- `onCompacted` parameter position consistent with existing hook API\n- Test coverage for the hook-level event parsing\n\nFiles to review:\n- `packages/web/lib/use-adventure-stream.ts` (compacted event branch)\n- `packages/web/app/adventure/[id]/page.tsx` (handleCompacted callback, wiring)\n- Any new test files for the hook\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260403-080056
linked_artifacts:
  - packages/web/lib/use-adventure-stream.ts

  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/tests/use-adventure-stream.test.ts
  - packages/backend/src/services/compact-tool.ts
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/tests/use-adventure-stream.test.ts
  - packages/backend/src/services/compact-tool.ts
activity_timeline:
  - timestamp: 2026-04-03T15:01:05.207Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:01:05.209Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T15:17:31.390Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T15:17:31.393Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T15:17:31.421Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T15:17:43.977Z
    event: progress_report
    reason: "Starting Phase B review. Reading plan, spec, and dependency commission first."
  - timestamp: 2026-04-03T15:18:51.060Z
    event: progress_report
    reason: "All source files read. Verifying Phase A fix F1 (confirmed: try/catch applied at compact-tool.ts:24-28). Now analyzing Phase B implementation against spec and plan requirements."
  - timestamp: 2026-04-03T15:20:12.551Z
    event: progress_report
    reason: "Phase B review nearly complete. Found 1 MEDIUM finding (test coverage gap). Phase A fixes verified. Preparing final report."
  - timestamp: 2026-04-03T15:21:10.874Z
    event: result_submitted
    reason: "## Phase B Review: Client-Side Compaction Notification\n\n### Phase A Fix Verification\n\n**F1 (MEDIUM) — Fixed.** `compact-tool.ts:24-28` now wraps `emitCompactedEvent` in its own try/catch with `console.error`, matching the mood tool pattern. Emission failure no longer corrupts the tool result.\n\n**F2 (MEDIUM) — Addressed.** Test at `message-threshold.test.ts:494` renamed to `compact_history tool_use is suppressed from SSE events (REQ-COMP-44, Step A.4)`, accurately scoping it to suppression rather than emission. Dalton documented the infrastructure limitation. The full wiring integration test gap remains, but the rename eliminates the misleading name.\n\n---\n\n### Findings\n\n**F1 (MEDIUM): Tests validate SSE parsing mechanics, not the hook's behavioral contract**\n\nFile: `packages/web/tests/use-adventure-stream.test.ts:241-307`\n\nThe 4 tests in \"compacted event parsing\" use standalone `parseSSEChunk`/`parseSSEChunks` helper functions that replicate the hook's line-by-line parsing logic. They prove the parsing is correct but don't exercise `useAdventureStream` itself.\n\nThe plan (Step B.3) specifies three assertions:\n1. `onCompacted` is called with `{ archived: \"past/scene-003.md\", previousSize: 145230, newSize: 4820 }`\n2. `isStreaming` remains true\n3. `streamingMessage` is not cleared\n\nNone of these appear in the tests. The tests don't import `useAdventureStream`, `CompactResponseSchema`, or any React testing utilities. They verify that \"a compacted event is parseable as SSE\" but not that \"the hook calls the callback and preserves streaming state when it receives one.\"\n\nThe parsing tests are valuable (they catch cross-chunk reassembly bugs, invalid payload handling). But the spec's AI Validation section and the plan both call for hook-level behavioral tests, and those are absent.\n\nFix: Add a test that exercises `useAdventureStream` with a mock fetch returning a stream containing a `compacted` event mid-stream. Assert that the `onCompacted` callback fires with the validated payload, that `isStreaming` remains true during the stream, and that `streamingMessage` continues accumulating text after the compacted event. This requires either a React testing framework (react-testing-library with renderHook) or a manual mock that captures the hook's callback invocations.\n\n---\n\n**F2 (LOW): `handleCompacted` discards the `CompactResponse` payload**\n\nFile: `packages/web/app/adventure/[id]/page.tsx:33`\n\n`handleCompacted` receives `_result: CompactResponse` but ignores it, re-fetching history from the server instead. This is correct per the plan and spec (REQ-COMP-45 specifies re-fetching). However, REQ-COMP-42 notes the payload \"lets the client show feedback without a second request.\" The payload could provide a brief status message (\"Scene archived to past/scene-003.md\") without adding a network round-trip. Not a defect, just an unused opportunity the spec explicitly left open.\n\n---\n\n### Requirement Coverage\n\n| Requirement | Status | Evidence |\n|-------------|--------|----------|\n| REQ-COMP-45 (hook handles compacted event) | Satisfied | `use-adventure-stream.ts:103-107`: compacted branch uses `CompactResponseSchema.safeParse()`, calls `onCompacted` callback. |\n| REQ-COMP-45 (streaming state preserved) | Satisfied | Compacted branch touches neither `isStreaming` nor `streamingMessage`. Only calls `onCompacted`. |\n| REQ-COMP-45 (history re-fetch on callback) | Satisfied | `page.tsx:33-44`: `handleCompacted` fetches `/api/daemon/adventures/${id}/history`, replaces `messages` state. |\n| REQ-COMP-45 (streaming continues after compacted) | Satisfied | `streamingMessage` is separate React state from `messages`. Replacing `messages` via `setMessages` does not affect the in-progress streaming display. |\n| REQ-COMP-48 (shared schema reuse) | Satisfied | Hook imports `CompactResponseSchema` from `@corvran/shared`. Same schema used for both SSE validation and REST endpoint response. |\n| REQ-COMP-45 (test coverage) | Partially satisfied | Parsing mechanics tested. Hook behavioral contract (callback invocation, streaming state preservation) untested. See F1. |\n\n### Implementation Quality\n\nThe implementation is clean and follows established patterns well. The `compacted` branch mirrors the `mood` branch structure. The `handleCompacted` callback correctly uses `useCallback` with `[id]` dependency. The `onCompacted` parameter position (third positional arg) is consistent with the plan's decision to defer an options-object refactor.\n\nThe async `handleCompacted` called from synchronous `processLine` is fire-and-forget, which is correct: the Promise's catch handles errors, and React batches the resulting state update. No unhandled rejection risk."
  - timestamp: 2026-04-03T15:21:18.946Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Phase B review nearly complete. Found 1 MEDIUM finding (test coverage gap). Phase A fixes verified. Preparing final report."
projectName: corvran
---
## Phase B Review: Client-Side Compaction Notification

### Phase A Fix Verification

**F1 (MEDIUM) — Fixed.** `compact-tool.ts:24-28` now wraps `emitCompactedEvent` in its own try/catch with `console.error`, matching the mood tool pattern. Emission failure no longer corrupts the tool result.

**F2 (MEDIUM) — Addressed.** Test at `message-threshold.test.ts:494` renamed to `compact_history tool_use is suppressed from SSE events (REQ-COMP-44, Step A.4)`, accurately scoping it to suppression rather than emission. Dalton documented the infrastructure limitation. The full wiring integration test gap remains, but the rename eliminates the misleading name.

---

### Findings

**F1 (MEDIUM): Tests validate SSE parsing mechanics, not the hook's behavioral contract**

File: `packages/web/tests/use-adventure-stream.test.ts:241-307`

The 4 tests in "compacted event parsing" use standalone `parseSSEChunk`/`parseSSEChunks` helper functions that replicate the hook's line-by-line parsing logic. They prove the parsing is correct but don't exercise `useAdventureStream` itself.

The plan (Step B.3) specifies three assertions:
1. `onCompacted` is called with `{ archived: "past/scene-003.md", previousSize: 145230, newSize: 4820 }`
2. `isStreaming` remains true
3. `streamingMessage` is not cleared

None of these appear in the tests. The tests don't import `useAdventureStream`, `CompactResponseSchema`, or any React testing utilities. They verify that "a compacted event is parseable as SSE" but not that "the hook calls the callback and preserves streaming state when it receives one."

The parsing tests are valuable (they catch cross-chunk reassembly bugs, invalid payload handling). But the spec's AI Validation section and the plan both call for hook-level behavioral tests, and those are absent.

Fix: Add a test that exercises `useAdventureStream` with a mock fetch returning a stream containing a `compacted` event mid-stream. Assert that the `onCompacted` callback fires with the validated payload, that `isStreaming` remains true during the stream, and that `streamingMessage` continues accumulating text after the compacted event. This requires either a React testing framework (react-testing-library with renderHook) or a manual mock that captures the hook's callback invocations.

---

**F2 (LOW): `handleCompacted` discards the `CompactResponse` payload**

File: `packages/web/app/adventure/[id]/page.tsx:33`

`handleCompacted` receives `_result: CompactResponse` but ignores it, re-fetching history from the server instead. This is correct per the plan and spec (REQ-COMP-45 specifies re-fetching). However, REQ-COMP-42 notes the payload "lets the client show feedback without a second request." The payload could provide a brief status message ("Scene archived to past/scene-003.md") without adding a network round-trip. Not a defect, just an unused opportunity the spec explicitly left open.

---

### Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-COMP-45 (hook handles compacted event) | Satisfied | `use-adventure-stream.ts:103-107`: compacted branch uses `CompactResponseSchema.safeParse()`, calls `onCompacted` callback. |
| REQ-COMP-45 (streaming state preserved) | Satisfied | Compacted branch touches neither `isStreaming` nor `streamingMessage`. Only calls `onCompacted`. |
| REQ-COMP-45 (history re-fetch on callback) | Satisfied | `page.tsx:33-44`: `handleCompacted` fetches `/api/daemon/adventures/${id}/history`, replaces `messages` state. |
| REQ-COMP-45 (streaming continues after compacted) | Satisfied | `streamingMessage` is separate React state from `messages`. Replacing `messages` via `setMessages` does not affect the in-progress streaming display. |
| REQ-COMP-48 (shared schema reuse) | Satisfied | Hook imports `CompactResponseSchema` from `@corvran/shared`. Same schema used for both SSE validation and REST endpoint response. |
| REQ-COMP-45 (test coverage) | Partially satisfied | Parsing mechanics tested. Hook behavioral contract (callback invocation, streaming state preservation) untested. See F1. |

### Implementation Quality

The implementation is clean and follows established patterns well. The `compacted` branch mirrors the `mood` branch structure. The `handleCompacted` callback correctly uses `useCallback` with `[id]` dependency. The `onCompacted` parameter position (third positional arg) is consistent with the plan's decision to defer an options-object refactor.

The async `handleCompacted` called from synchronous `processLine` is fire-and-forget, which is correct: the Promise's catch handles errors, and React batches the resulting state update. No unhandled rejection risk.

## Decisions

**Was Phase A finding F1 (missing try/catch on emitCompactedEvent in compact-tool.ts) addressed?**
F1 is fixed. compact-tool.ts:24-28 now wraps `emitCompactedEvent` in its own try/catch with console.error logging, matching the mood tool pattern.
*Reasoning: Compared compact-tool.ts:24-28 against the fix prescription. The try/catch is correctly scoped: only wraps the emission call, not the compaction itself. The tool result (line 29-33) is returned regardless of emission success.*

**Was Phase A finding F2 (GM tool integration test doesn't verify compacted SSE event emission) addressed?**
F2 partially addressed. The test was renamed to `compact_history tool_use is suppressed from SSE events (REQ-COMP-44, Step A.4)` at line 494, accurately scoping it to suppression verification rather than emission verification. The full wiring integration test gap remains, but the rename eliminates the misleading test name.
*Reasoning: Read message-threshold.test.ts:494. The rename is honest about what the test covers. Dalton's commission notes document the infrastructure limitation (mock query doesn't invoke real MCP tool handlers). The emission wiring is covered at unit level (compact-tool.test.ts) and route level (threshold tests). Acceptable given the test infrastructure constraints.*

**Does the `onCompacted` callback interfere with streaming state (isStreaming, streamingMessage)?**
No interference. The compacted branch in processLine (use-adventure-stream.ts:103-107) only calls onCompacted. It does not touch isStreaming, streamingMessage, or error state. The page component's handleCompacted (page.tsx:33-44) only calls setMessages. Streaming continues normally.
*Reasoning: Traced every state mutation in the compacted event path. Hook: only onCompacted callback invocation. Page: only setMessages via fetch. Neither touches isStreaming or streamingMessage. The GM's in-progress response continues to display through the separate streamingMessage state. After done fires, handleStreamComplete appends the full response to the updated (compacted) messages list.*

**Does the CompactResponseSchema validation match the server's emission format?**
Match confirmed. The server emits `JSON.stringify(result)` where `result` is a `CompactionResult` with `{ archived: string, previousSize: number, newSize: number }`. The client validates with `CompactResponseSchema` which is `z.object({ archived: z.string(), previousSize: z.number(), newSize: z.number() })`. Structurally identical.
*Reasoning: Compared CompactResponseSchema (shared/schemas/adventures.ts:102-106) against CompactionResult type used in adventure-routes.ts emission and compact-tool.ts emission. TypeScript structural typing makes the service result directly assignable. The schema's safeParse will accept the server payload.*

**Do the Phase B tests adequately cover the hook-level event parsing for compacted events?**
The 4 tests (lines 241-307) cover: correct payload parsing, non-disruption of text accumulation, invalid payload handling, and cross-chunk reassembly. However, the tests validate generic SSE parsing mechanics, not the hook's actual behavior. They use standalone parseSSEChunk/parseSSEChunks helpers that mirror the hook's logic but don't exercise the hook itself. The spec's AI Validation requires: "Verify the onCompacted callback fires with the parsed CompactResponse payload" and "isStreaming remains true" and "streamingMessage is not cleared." None of these three assertions appear in the tests.
*Reasoning: The test file's parseSSEChunk/parseSSEChunks functions (lines 16-87) replicate the hook's line-by-line parsing logic. They prove the parsing is correct but don't prove the hook calls onCompacted, or that isStreaming/streamingMessage state is preserved. The tests don't import useAdventureStream, CompactResponseSchema, or any React testing utilities. The plan (Step B.3) and spec (AI Validation) both specify that the hook test should verify callback invocation and streaming state preservation. This is a gap: the parsing is tested but the hook's behavioral contract is not.*

**Is there a problem with handleCompacted being async when called from the synchronous processLine context?**
No problem. The callback invocation at use-adventure-stream.ts:106 is `onCompacted?.(compactParsed.data)`. The return value is ignored (fire-and-forget). handleCompacted (page.tsx:33) is async, so it returns a Promise, but since processLine doesn't await it, the async fetch runs independently. If the fetch fails, the catch block handles it silently. The only consequence is that setMessages from the async fetch may resolve after subsequent SSE events have been processed, but React batches state updates so this is fine.
*Reasoning: Traced the call chain: processLine (sync) → onCompacted (fire-and-forget) → handleCompacted (async, returns Promise). The unhandled Promise is not a bug here because: (1) handleCompacted has its own try/catch so no unhandled rejection, (2) the fetch is genuinely fire-and-forget since the stream continues regardless, (3) React's state batching handles the async setMessages correctly. This is the same pattern as if any other callback were async.*

**Is the unused _result parameter in handleCompacted intentional and acceptable?**
LOW finding. handleCompacted (page.tsx:33) names its parameter `_result: CompactResponse` with an underscore prefix, indicating it's unused. The function re-fetches history rather than using the result payload. This is correct behavior per REQ-COMP-45 (the callback re-fetches history from the server). However, the result payload could be logged or used for a status message ("Scene archived to past/scene-003.md"). The underscore prefix is honest about current usage. Not a defect, just a note.
*Reasoning: The plan (Step B.2) specifies re-fetching history, not using the payload for display. The spec (REQ-COMP-42) notes the payload "lets the client show feedback without a second request" but doesn't require it. The current implementation is spec-compliant. The underscore prefix correctly signals the parameter is received but unused.*
