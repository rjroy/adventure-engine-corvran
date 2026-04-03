---
title: "Commission: Plan: Compaction Notification — Implementation from Spec Addendum"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for the new compaction notification requirements that were just added to the spec.\n\nRead the updated spec at `.lore/specs/compaction-system-spec.md` — focus on the new REQ-COMP-4x requirements added in the latest update (the compaction notification addendum).\n\nRead the existing plan at `.lore/plans/compaction-system-plan.md` for context on what's already built.\n\nThe plan should cover ONLY the new notification work (the gap between what's implemented and what the spec now requires). All four original phases are already implemented and reviewed. This plan is for the delta.\n\nReference the existing codebase patterns:\n- SSE streaming in `packages/backend/src/routes/adventure-routes.ts` (message handler)\n- Mood event emission pattern (`emitMoodEvent` in adventure routes and session runner)\n- Client-side stream consumption in `packages/web/app/adventure/[id]/page.tsx`\n- Any `use-adventure-stream` hooks or similar\n\nWrite the plan to `.lore/plans/compaction-notification-plan.md`."
dependencies:
  - commission-Octavia-20260403-023501
linked_artifacts:
  - .lore/plans/compaction-notification-plan.md

activity_timeline:
  - timestamp: 2026-04-03T09:41:27.393Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T09:41:27.395Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T09:41:27.423Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T09:41:36.427Z
    event: progress_report
    reason: "Reading the updated spec, existing plan, and referenced codebase patterns."
  - timestamp: 2026-04-03T09:43:17.195Z
    event: progress_report
    reason: "Context complete. I've read the spec (REQ-COMP-42 through REQ-COMP-48), the existing 4-phase plan, the adventure routes (threshold checks, SSE streaming, compact endpoint), the session runner (emitMoodEvent pattern), the compact tool, the useAdventureStream hook (mood event handling), and the shared schemas. Now writing the notification plan."
  - timestamp: 2026-04-03T09:47:19.195Z
    event: progress_report
    reason: "Plan drafted and reviewed. Three findings to address: (1) CompactionResult vs CompactResponse type mismatch, (2) missing GM-tool SSE integration test, (3) RunQueryParams callers need updating note. Applying fixes now."
  - timestamp: 2026-04-03T09:48:55.721Z
    event: result_submitted
    reason: "Wrote the implementation plan at `.lore/plans/compaction-notification-plan.md` covering REQ-COMP-42 through REQ-COMP-48 (compaction notification addendum).\n\n**Structure**: Two phases.\n\n**Phase A (server-side emission)**: Restructure the message handler to move threshold checks inside `streamSSE` (so the stream exists when we need to emit events). Add `compacted` SSE event emission after successful threshold-triggered compaction. Add `emitCompactedEvent` callback through the compact tool and session runner (same DI pattern as `emitMoodEvent`). Suppress `compact_history` from `tool_use` SSE events. Six test cases including the GM-tool SSE stream integration test from the spec's AI Validation section.\n\n**Phase B (client-side consumption)**: Add `compacted` event handling to `useAdventureStream` hook (alongside existing `mood` handling). Wire `onCompacted` callback in the page component to re-fetch history and replace displayed messages without disturbing the in-progress streaming response. One test case for hook callback invocation.\n\n**Key decisions documented**: (1) Prompt assembly moves inside `streamSSE` along with the threshold check, because prompt depends on possibly-compacted history. (2) `compact_history` suppressed from `tool_use` events (same rationale as `set_mood`). (3) Callback type uses `CompactionResult` (service type), not `CompactResponse` (shared schema), since they're structurally identical and this avoids coupling the tool to the shared package.\n\n**Reviewed** by plan-reviewer sub-agent. Three findings addressed: type mismatch clarified, missing GM-tool SSE integration test added, RunQueryParams caller impact flagged."
  - timestamp: 2026-04-03T09:49:03.774Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Plan drafted and reviewed. Three findings to address: (1) CompactionResult vs CompactResponse type mismatch, (2) missing GM-tool SSE integration test, (3) RunQueryParams callers need updating note. Applying fixes now."
projectName: corvran
---
Wrote the implementation plan at `.lore/plans/compaction-notification-plan.md` covering REQ-COMP-42 through REQ-COMP-48 (compaction notification addendum).

**Structure**: Two phases.

**Phase A (server-side emission)**: Restructure the message handler to move threshold checks inside `streamSSE` (so the stream exists when we need to emit events). Add `compacted` SSE event emission after successful threshold-triggered compaction. Add `emitCompactedEvent` callback through the compact tool and session runner (same DI pattern as `emitMoodEvent`). Suppress `compact_history` from `tool_use` SSE events. Six test cases including the GM-tool SSE stream integration test from the spec's AI Validation section.

**Phase B (client-side consumption)**: Add `compacted` event handling to `useAdventureStream` hook (alongside existing `mood` handling). Wire `onCompacted` callback in the page component to re-fetch history and replace displayed messages without disturbing the in-progress streaming response. One test case for hook callback invocation.

**Key decisions documented**: (1) Prompt assembly moves inside `streamSSE` along with the threshold check, because prompt depends on possibly-compacted history. (2) `compact_history` suppressed from `tool_use` events (same rationale as `set_mood`). (3) Callback type uses `CompactionResult` (service type), not `CompactResponse` (shared schema), since they're structurally identical and this avoids coupling the tool to the shared package.

**Reviewed** by plan-reviewer sub-agent. Three findings addressed: type mismatch clarified, missing GM-tool SSE integration test added, RunQueryParams caller impact flagged.
