---
title: "Commission: Review: Compaction Notification Phase A"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the Phase A implementation of compaction notifications.\n\nRead the plan at `.lore/plans/compaction-notification-plan.md` (Phase A section) and the spec at `.lore/specs/compaction-system-spec.md` (REQ-COMP-42 through REQ-COMP-48).\n\nReview focus areas from the plan:\n- Message handler restructuring: threshold check, player message append, and prompt assembly all moved inside `streamSSE`. Did anything get left outside that depends on compacted state?\n- Event emission ordering: `compacted` event fires before `text` events begin\n- `compact_history` suppressed from `tool_use` SSE events (same pattern as `set_mood`)\n- Failed compaction emits NO event (REQ-COMP-46)\n- World compaction emits NO event (REQ-COMP-47)\n- `emitCompactedEvent` callback wired through compact-tool.ts → session-runner.ts → adventure-routes.ts following the mood event pattern\n- Test coverage: 6 new test cases as specified in Step A.5\n\nFiles to review:\n- `packages/backend/src/routes/adventure-routes.ts` (restructured message handler)\n- `packages/backend/src/services/compact-tool.ts` (emitCompactedEvent callback)\n- `packages/backend/src/services/session-runner.ts` (RunQueryParams change)\n- `packages/shared/src/schemas/adventures.ts` (schema export)\n- `packages/backend/tests/routes/message-threshold.test.ts` (new SSE event tests)\n- `packages/backend/tests/services/compact-tool.test.ts` (callback tests)\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260403-080033
linked_artifacts:
  - packages/backend/src/routes/adventure-routes.ts

  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/session-runner.ts
  - packages/shared/src/schemas/adventures.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/session-runner.ts
  - packages/shared/src/schemas/adventures.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
activity_timeline:
  - timestamp: 2026-04-03T15:00:44.401Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:00:44.403Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T15:07:24.765Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T15:07:24.769Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T15:07:24.799Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T15:07:31.835Z
    event: progress_report
    reason: "Starting Phase A review. Reading plan, spec, and referenced commission artifact."
  - timestamp: 2026-04-03T15:07:49.642Z
    event: progress_report
    reason: "All source files and tests read. Analyzing against plan and spec requirements. Checking shared package exports and cross-referencing with mood event pattern."
  - timestamp: 2026-04-03T15:11:46.685Z
    event: progress_report
    reason: "Review complete. 2 findings (both MEDIUM). Preparing final report with requirement-by-requirement coverage."
  - timestamp: 2026-04-03T15:12:18.978Z
    event: result_submitted
    reason: "## Phase A Review: Compaction Notifications\n\n### Findings\n\n**F1 (MEDIUM): `emitCompactedEvent` not error-isolated in compact-tool.ts**\n\nFile: `packages/backend/src/services/compact-tool.ts:24`\n\n`await deps.emitCompactedEvent(result)` is called without a try/catch wrapper. If the SSE write fails (client disconnect, stream closed), the error propagates to the outer catch at line 30, which reports \"Compaction failed\" to the AI. But compaction already succeeded at line 23. The AI then operates on false information: it may retry compaction or tell the player it failed.\n\nThe mood tool at `mood-tool.ts:107-114` demonstrates the correct pattern: wrap event emission in its own try/catch, log the error, continue to tool result. The compact tool was supposed to follow this exact pattern per the plan's \"follows the `emitMoodEvent` pattern exactly\" directive.\n\nFix: Wrap lines 24 in a try/catch that logs and continues:\n```typescript\nconst result = await compactionService.compactHistory(adventurePath, context);\ntry {\n  await deps.emitCompactedEvent(result);\n} catch (err) {\n  console.error(`[compact-tool] failed to emit compacted event:`, err);\n}\nreturn { content: [{ type: \"text\", text: `History compacted...` }] };\n```\n\n---\n\n**F2 (MEDIUM): GM tool integration test doesn't verify `compacted` SSE event emission**\n\nFile: `packages/backend/tests/routes/message-threshold.test.ts:492-542`\n\nThe test is titled \"compacted SSE event from GM tool during streaming (REQ-COMP-44 integration)\" but only asserts tool_use suppression (lines 532-537). It does not assert that a `compacted` event appears in the SSE stream. The plan explicitly requires: \"Verify a `compacted` event is emitted during the stream (between text events, before done).\"\n\nThe test cannot verify event emission because `buildTestApp` creates the session runner without `compactionService`/`fileOps` (line 62-65), so no compact tool handler is created. The mock query produces pre-fabricated events that bypass the tool handler entirely. The callback `emitCompactedEvent` is passed to `runQuery` but never reaches a tool handler.\n\nThe tool_use suppression assertion is valid (Step A.4) but belongs under that step's coverage, not REQ-COMP-44 integration. The full wiring path (tool handler → emitCompactedEvent → route SSE write) remains untested at the integration level.\n\nFix: Either enhance `buildTestApp` to pass `compactionService`/`fileOps` to the session runner (so the compact tool handler is created and can be invoked by a real SDK tool flow), or add a separate integration test that exercises the full wiring. At minimum, add an assertion that a `compacted` event appears in the parsed events.\n\n---\n\n### Requirement Coverage\n\n| Requirement | Status | Evidence |\n|-------------|--------|----------|\n| REQ-COMP-42 | Satisfied | `adventure-routes.ts:216-219`: `compacted` event emitted with `CompactionResult` payload via `stream.writeSSE`. Payload matches `CompactResponseSchema`. |\n| REQ-COMP-43 | Satisfied | Threshold check moved inside `streamSSE` callback (lines 207-249). Event emitted before `runQuery` (line 265), guaranteeing it precedes `text` events. Test at line 356 verifies ordering. |\n| REQ-COMP-44 | Satisfied with defect | Callback wired through `compact-tool.ts:10` → `session-runner.ts:28,79` → `adventure-routes.ts:276-277`. Follows mood event pattern. But F1 (missing try/catch) means emission failure corrupts the tool result. |\n| REQ-COMP-46 | Satisfied | Route catch block (lines 221-229) emits nothing on failure. Tool catch block (compact-tool.ts:30-38) returns error text without calling `emitCompactedEvent`. Tests verify both paths. |\n| REQ-COMP-47 | Satisfied | World compaction block (lines 232-248) has no `stream.writeSSE` call. Test at line 447 verifies exactly one `compacted` event when both thresholds fire. |\n| REQ-COMP-48 | Satisfied | `CompactResponseSchema` and `CompactResponse` type exported from `packages/shared/src/index.ts` (lines 18, 39). Schema matches service's `CompactionResult` structurally. |\n| REQ-COMP-26 | Satisfied | Full restructuring correct. Threshold checks, player message append, prompt assembly all inside `streamSSE`. Plugin resolution correctly remains outside (documented decision). No stale state reaches prompt assembly. |\n\n### Decision Validation\n\nDalton's decision to keep plugin resolution outside `streamSSE` is sound. Plugin resolution reads `adventure.md` config (system alias, art style), which doesn't change during compaction. Keeping it outside preserves HTTP 400 error responses for invalid system plugins rather than forcing error reporting through the SSE stream.\n\n### Test Coverage\n\n6 new test cases as specified. 5 are correct and complete. The 6th (GM tool integration, F2) tests tool_use suppression correctly but doesn't verify the `compacted` event emission the plan requires."
  - timestamp: 2026-04-03T15:12:25.167Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Review complete. 2 findings (both MEDIUM). Preparing final report with requirement-by-requirement coverage."
projectName: corvran
---
## Phase A Review: Compaction Notifications

### Findings

**F1 (MEDIUM): `emitCompactedEvent` not error-isolated in compact-tool.ts**

File: `packages/backend/src/services/compact-tool.ts:24`

`await deps.emitCompactedEvent(result)` is called without a try/catch wrapper. If the SSE write fails (client disconnect, stream closed), the error propagates to the outer catch at line 30, which reports "Compaction failed" to the AI. But compaction already succeeded at line 23. The AI then operates on false information: it may retry compaction or tell the player it failed.

The mood tool at `mood-tool.ts:107-114` demonstrates the correct pattern: wrap event emission in its own try/catch, log the error, continue to tool result. The compact tool was supposed to follow this exact pattern per the plan's "follows the `emitMoodEvent` pattern exactly" directive.

Fix: Wrap lines 24 in a try/catch that logs and continues:
```typescript
const result = await compactionService.compactHistory(adventurePath, context);
try {
  await deps.emitCompactedEvent(result);
} catch (err) {
  console.error(`[compact-tool] failed to emit compacted event:`, err);
}
return { content: [{ type: "text", text: `History compacted...` }] };
```

---

**F2 (MEDIUM): GM tool integration test doesn't verify `compacted` SSE event emission**

File: `packages/backend/tests/routes/message-threshold.test.ts:492-542`

The test is titled "compacted SSE event from GM tool during streaming (REQ-COMP-44 integration)" but only asserts tool_use suppression (lines 532-537). It does not assert that a `compacted` event appears in the SSE stream. The plan explicitly requires: "Verify a `compacted` event is emitted during the stream (between text events, before done)."

The test cannot verify event emission because `buildTestApp` creates the session runner without `compactionService`/`fileOps` (line 62-65), so no compact tool handler is created. The mock query produces pre-fabricated events that bypass the tool handler entirely. The callback `emitCompactedEvent` is passed to `runQuery` but never reaches a tool handler.

The tool_use suppression assertion is valid (Step A.4) but belongs under that step's coverage, not REQ-COMP-44 integration. The full wiring path (tool handler → emitCompactedEvent → route SSE write) remains untested at the integration level.

Fix: Either enhance `buildTestApp` to pass `compactionService`/`fileOps` to the session runner (so the compact tool handler is created and can be invoked by a real SDK tool flow), or add a separate integration test that exercises the full wiring. At minimum, add an assertion that a `compacted` event appears in the parsed events.

---

### Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-COMP-42 | Satisfied | `adventure-routes.ts:216-219`: `compacted` event emitted with `CompactionResult` payload via `stream.writeSSE`. Payload matches `CompactResponseSchema`. |
| REQ-COMP-43 | Satisfied | Threshold check moved inside `streamSSE` callback (lines 207-249). Event emitted before `runQuery` (line 265), guaranteeing it precedes `text` events. Test at line 356 verifies ordering. |
| REQ-COMP-44 | Satisfied with defect | Callback wired through `compact-tool.ts:10` → `session-runner.ts:28,79` → `adventure-routes.ts:276-277`. Follows mood event pattern. But F1 (missing try/catch) means emission failure corrupts the tool result. |
| REQ-COMP-46 | Satisfied | Route catch block (lines 221-229) emits nothing on failure. Tool catch block (compact-tool.ts:30-38) returns error text without calling `emitCompactedEvent`. Tests verify both paths. |
| REQ-COMP-47 | Satisfied | World compaction block (lines 232-248) has no `stream.writeSSE` call. Test at line 447 verifies exactly one `compacted` event when both thresholds fire. |
| REQ-COMP-48 | Satisfied | `CompactResponseSchema` and `CompactResponse` type exported from `packages/shared/src/index.ts` (lines 18, 39). Schema matches service's `CompactionResult` structurally. |
| REQ-COMP-26 | Satisfied | Full restructuring correct. Threshold checks, player message append, prompt assembly all inside `streamSSE`. Plugin resolution correctly remains outside (documented decision). No stale state reaches prompt assembly. |

### Decision Validation

Dalton's decision to keep plugin resolution outside `streamSSE` is sound. Plugin resolution reads `adventure.md` config (system alias, art style), which doesn't change during compaction. Keeping it outside preserves HTTP 400 error responses for invalid system plugins rather than forcing error reporting through the SSE stream.

### Test Coverage

6 new test cases as specified. 5 are correct and complete. The 6th (GM tool integration, F2) tests tool_use suppression correctly but doesn't verify the `compacted` event emission the plan requires.

## Decisions

**Does the emitCompactedEvent call in compact-tool.ts follow the established mood event pattern for error isolation?**
F1 (MEDIUM): compact-tool.ts:24 calls `await deps.emitCompactedEvent(result)` without a try/catch wrapper. If the SSE write fails (client disconnect, stream closed), the error propagates to the outer catch at line 30, causing the tool to report "Compaction failed: <reason>" to the AI even though compaction succeeded. The mood tool at mood-tool.ts:107-114 wraps its `emitMoodEvent` call in a dedicated try/catch to isolate emission failures from the tool result. The compact tool should follow the same pattern.
*Reasoning: Traced the error propagation path: compactHistory succeeds (data written) → emitCompactedEvent throws → catch at line 30 → falls through HistoryTooShortError and CompactionInProgressError checks → line 37-38 returns "Compaction failed: <stream error>". The AI then believes compaction failed and may retry or tell the player it failed, both incorrect. The mood tool demonstrates the correct pattern: wrap event emission in its own try/catch, log the error, continue to tool result. This is the pattern the plan explicitly says to follow.*

**Does the GM tool integration test verify compacted SSE event emission as specified by the plan?**
F2 (MEDIUM): The test at message-threshold.test.ts:492 ("compacted SSE event from GM tool during streaming") does not assert that a `compacted` SSE event is emitted. It only verifies tool_use suppression (lines 532-537) and done event existence (lines 540-541). The plan specifies: "Verify a `compacted` event is emitted during the stream (between text events, before done)." The spec's AI Validation says the same. The test cannot verify event emission because: (1) buildTestApp creates the session runner without compactionService/fileOps (line 62-65), so no compact tool is created, (2) the mock query produces events directly without invoking the tool handler, so emitCompactedEvent is never called.
*Reasoning: The tool_use suppression test is valid (Step A.4), but the test is titled and spec-referenced as an integration test for REQ-COMP-44 event emission. The actual integration path (compact tool handler calls emitCompactedEvent → session runner passes through → route writes SSE) is covered only at the unit level: compact-tool.test.ts tests the callback invocation, and the threshold tests verify SSE emission from the route. The gap is the full wiring test the plan explicitly calls for. To fix, the buildTestApp helper would need to pass compactionService and fileOps to createSessionRunner, and the test would need to use a real (or properly mocked) SDK tool flow rather than a mock query that produces pre-fabricated events.*

**Is the message handler restructuring correct per REQ-COMP-26 and REQ-COMP-43?**
The restructuring is correct. Threshold checks (lines 207-249), player message append (line 252), and prompt assembly (lines 255-262) are all inside the streamSSE callback. Plugin resolution (lines 146-193) correctly stays outside, as it doesn't depend on compacted state and needs HTTP 400 error responses. The event emission ordering is correct: compacted event fires at line 216-219 before runQuery at line 265, guaranteeing it precedes text events. The history variable is properly re-read after compaction (line 220) and the adventure object is refreshed after world compaction (lines 237-239).
*Reasoning: Traced the full data flow: history read (line 144) → streamSSE entered (line 196) → threshold check uses history variable (line 209) → compaction emits event and re-reads history (lines 216-220) → player message appended (line 252) → prompt assembled with updated history and adventure state (lines 255-262) → runQuery called (line 265). No stale state reaches prompt assembly. Dalton's decision to keep plugin resolution outside is sound and documented.*
