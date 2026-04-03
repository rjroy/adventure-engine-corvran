---
title: "Commission: Build: Compaction Notification Phase A — Server-Side SSE Emission"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase A of the compaction notification plan at `.lore/plans/compaction-notification-plan.md`.\n\nRead the full plan first. Phase A covers Steps A.1 through A.5:\n\n1. Verify `CompactResponseSchema` and its inferred type are exported from `packages/shared`.\n2. Restructure the message handler in `adventure-routes.ts`: move the threshold check block inside `streamSSE`, move player message append and prompt assembly inside too (they depend on possibly-compacted history). After successful history compaction, emit a `compacted` SSE event with the `CompactionResult` payload.\n3. Add `emitCompactedEvent` callback to `compact-tool.ts` deps, `RunQueryParams` in `session-runner.ts`, and define the callback in the route's `streamSSE` block alongside `emitMoodEvent`.\n4. Suppress `compact_history` / `mcp__corvran__compact_history` from `tool_use` SSE events, same pattern as `set_mood` suppression.\n5. Write/update tests: 3 new cases in `message-threshold.test.ts` (SSE event on threshold, no event on failure, no event for world), 2 new cases in `compact-tool.test.ts` (emitCompactedEvent called/not called), and 1 integration test for GM tool SSE emission.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-42 through REQ-COMP-48)\n- Plan: `.lore/plans/compaction-notification-plan.md` (Phase A section)\n- Mood event pattern: search for `emitMoodEvent` in adventure-routes.ts, session-runner.ts, mood-tool.ts\n\nAll tests must pass (`bun test` from `packages/backend`). Typecheck clean (`tsc --build` from root)."
dependencies: []
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
