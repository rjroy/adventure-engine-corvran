---
title: "Commission: Review: Compaction Notification Phase A"
date: 2026-04-03
status: blocked
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the Phase A implementation of compaction notifications.\n\nRead the plan at `.lore/plans/compaction-notification-plan.md` (Phase A section) and the spec at `.lore/specs/compaction-system-spec.md` (REQ-COMP-42 through REQ-COMP-48).\n\nReview focus areas from the plan:\n- Message handler restructuring: threshold check, player message append, and prompt assembly all moved inside `streamSSE`. Did anything get left outside that depends on compacted state?\n- Event emission ordering: `compacted` event fires before `text` events begin\n- `compact_history` suppressed from `tool_use` SSE events (same pattern as `set_mood`)\n- Failed compaction emits NO event (REQ-COMP-46)\n- World compaction emits NO event (REQ-COMP-47)\n- `emitCompactedEvent` callback wired through compact-tool.ts → session-runner.ts → adventure-routes.ts following the mood event pattern\n- Test coverage: 6 new test cases as specified in Step A.5\n\nFiles to review:\n- `packages/backend/src/routes/adventure-routes.ts` (restructured message handler)\n- `packages/backend/src/services/compact-tool.ts` (emitCompactedEvent callback)\n- `packages/backend/src/services/session-runner.ts` (RunQueryParams change)\n- `packages/shared/src/schemas/adventures.ts` (schema export)\n- `packages/backend/tests/routes/message-threshold.test.ts` (new SSE event tests)\n- `packages/backend/tests/services/compact-tool.test.ts` (callback tests)\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260403-080033
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T15:00:44.401Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:00:44.403Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
