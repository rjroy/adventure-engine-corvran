---
title: "Commission: Build: Compaction Notification Phase A — Server-Side SSE Emission"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase A of the compaction notification plan at `.lore/plans/compaction-notification-plan.md`.\n\nRead the full plan first. Phase A covers Steps A.1 through A.5:\n\n1. Verify `CompactResponseSchema` and its inferred type are exported from `packages/shared`.\n2. Restructure the message handler in `adventure-routes.ts`: move the threshold check block inside `streamSSE`, move player message append and prompt assembly inside too (they depend on possibly-compacted history). After successful history compaction, emit a `compacted` SSE event with the `CompactionResult` payload.\n3. Add `emitCompactedEvent` callback to `compact-tool.ts` deps, `RunQueryParams` in `session-runner.ts`, and define the callback in the route's `streamSSE` block alongside `emitMoodEvent`.\n4. Suppress `compact_history` / `mcp__corvran__compact_history` from `tool_use` SSE events, same pattern as `set_mood` suppression.\n5. Write/update tests: 3 new cases in `message-threshold.test.ts` (SSE event on threshold, no event on failure, no event for world), 2 new cases in `compact-tool.test.ts` (emitCompactedEvent called/not called), and 1 integration test for GM tool SSE emission.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-42 through REQ-COMP-48)\n- Plan: `.lore/plans/compaction-notification-plan.md` (Phase A section)\n- Mood event pattern: search for `emitMoodEvent` in adventure-routes.ts, session-runner.ts, mood-tool.ts\n\nAll tests must pass (`bun test` from `packages/backend`). Typecheck clean (`tsc --build` from root)."
dependencies: []
linked_artifacts:
  - packages/backend/src/routes/adventure-routes.ts

  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-04-03T15:00:33.037Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:00:33.039Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T15:00:33.069Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T15:00:47.656Z
    event: progress_report
    reason: "Read plan and spec. Now reading source files: adventure-routes.ts, compact-tool.ts, session-runner.ts, shared schemas, and existing tests."
  - timestamp: 2026-04-03T15:03:14.673Z
    event: progress_report
    reason: "Step A.1 verified (schema already exported). Implementing A.2 (route restructure), A.3 (emitCompactedEvent callback wiring), A.4 (tool_use suppression)."
  - timestamp: 2026-04-03T15:05:29.076Z
    event: progress_report
    reason: "Steps A.1-A.4 implemented, all 512 existing tests pass. Writing Step A.5 tests: 3 threshold SSE event tests, 2 compact-tool callback tests, 1 GM tool integration test."
  - timestamp: 2026-04-03T15:07:19.498Z
    event: result_submitted
    reason: "Phase A implemented. All steps complete, 518 tests pass, typecheck clean.\n\n**Step A.1** (shared schema): Verified `CompactResponseSchema` and `CompactResponse` type already exported from `@corvran/shared`. No changes needed.\n\n**Step A.2** (route restructure): Moved threshold checks, player message append, and prompt assembly inside the `streamSSE` callback. After successful history compaction, the route now emits `event: compacted` with the `CompactionResult` payload on the active stream. World compaction emits no event (REQ-COMP-47). Failed compaction emits no event (REQ-COMP-46). Plugin resolution stays outside `streamSSE` to preserve HTTP 400 error responses for invalid system plugins.\n\n**Step A.3** (emitCompactedEvent wiring): Added `emitCompactedEvent` callback to `CompactToolDeps` (compact-tool.ts), `RunQueryParams` (session-runner.ts), and wired it through from the route's `streamSSE` block. The compact tool calls the callback after successful compaction, before returning the tool result.\n\n**Step A.4** (tool_use suppression): `compact_history` and `mcp__corvran__compact_history` are now suppressed from `tool_use` SSE events, matching the existing `set_mood` suppression pattern.\n\n**Step A.5** (tests): 6 new tests added:\n- `message-threshold.test.ts`: compacted SSE event on threshold (verifies payload + event ordering), no event on failure, event for history but not world\n- `compact-tool.test.ts`: emitCompactedEvent called on success (verifies CompactionResult fields), emitCompactedEvent not called on failure\n- `message-threshold.test.ts`: GM tool integration test (compact_history suppressed from tool_use events)\n\n**Decision**: Plugin resolution kept outside `streamSSE` (deviates from plan) because it doesn't depend on compacted state and needs HTTP 400 error responses for missing system plugins."
  - timestamp: 2026-04-03T15:07:24.473Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Steps A.1-A.4 implemented, all 512 existing tests pass. Writing Step A.5 tests: 3 threshold SSE event tests, 2 compact-tool callback tests, 1 GM tool integration test."
projectName: corvran
---
Phase A implemented. All steps complete, 518 tests pass, typecheck clean.

**Step A.1** (shared schema): Verified `CompactResponseSchema` and `CompactResponse` type already exported from `@corvran/shared`. No changes needed.

**Step A.2** (route restructure): Moved threshold checks, player message append, and prompt assembly inside the `streamSSE` callback. After successful history compaction, the route now emits `event: compacted` with the `CompactionResult` payload on the active stream. World compaction emits no event (REQ-COMP-47). Failed compaction emits no event (REQ-COMP-46). Plugin resolution stays outside `streamSSE` to preserve HTTP 400 error responses for invalid system plugins.

**Step A.3** (emitCompactedEvent wiring): Added `emitCompactedEvent` callback to `CompactToolDeps` (compact-tool.ts), `RunQueryParams` (session-runner.ts), and wired it through from the route's `streamSSE` block. The compact tool calls the callback after successful compaction, before returning the tool result.

**Step A.4** (tool_use suppression): `compact_history` and `mcp__corvran__compact_history` are now suppressed from `tool_use` SSE events, matching the existing `set_mood` suppression pattern.

**Step A.5** (tests): 6 new tests added:
- `message-threshold.test.ts`: compacted SSE event on threshold (verifies payload + event ordering), no event on failure, event for history but not world
- `compact-tool.test.ts`: emitCompactedEvent called on success (verifies CompactionResult fields), emitCompactedEvent not called on failure
- `message-threshold.test.ts`: GM tool integration test (compact_history suppressed from tool_use events)

**Decision**: Plugin resolution kept outside `streamSSE` (deviates from plan) because it doesn't depend on compacted state and needs HTTP 400 error responses for missing system plugins.

## Decisions

**Should plugin resolution (system lookup, bootstrap read) move inside streamSSE along with threshold checks and prompt assembly?**
Keep plugin resolution outside streamSSE. Only move threshold checks, player message append, and prompt assembly inside.
*Reasoning: Plugin resolution doesn't depend on compacted state (it reads adventure.md config, not history or world). Moving it inside streamSSE would prevent returning HTTP 400 for invalid system plugins, forcing error reporting through the SSE stream instead of clean HTTP responses. The plan's rationale for moving things inside is "they depend on possibly-compacted history" which doesn't apply to plugin resolution.*
