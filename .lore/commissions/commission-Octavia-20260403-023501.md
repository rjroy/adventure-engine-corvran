---
title: "Commission: Spec Addendum: Compaction Notification to Active Chat Sessions"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Add requirements to the compaction system spec at `.lore/specs/compaction-system-spec.md` for notifying active chat sessions when compaction occurs.\n\n**The gap**: When compaction is triggered by threshold (Phase 2) or by the GM tool (Phase 4), the server-side history changes but the web client's in-memory message list becomes stale. The client has no way to know compaction happened. Only player-initiated compaction (Phase 3 button) refreshes the display, because the client explicitly re-fetches history after the POST succeeds.\n\n**Context to read**:\n- Current spec: `.lore/specs/compaction-system-spec.md`\n- Current plan: `.lore/plans/compaction-system-plan.md`\n- The SSE streaming implementation: `packages/backend/src/routes/adventure-routes.ts` (the message handler streams SSE events to the client)\n- The client-side stream consumer: `packages/web/app/adventure/[id]/page.tsx` and any `use-adventure-stream` hook\n- How mood events are emitted (this is the existing pattern for server-to-client custom events): search for `emitMoodEvent` and `mood` SSE events in the adventure routes and client code\n\n**What to spec**:\n- How the server signals to the active client that compaction happened during a turn (threshold-triggered or GM tool-triggered)\n- How the client responds to that signal (re-fetch history, replace displayed messages with the compacted state)\n- Whether the notification should include any payload (e.g., the archive path, the recap text) or just be a \"refresh your history\" signal\n- Edge cases: what if the client is mid-stream when compaction happens? What if the compaction fails (archive reversed) — should any event still be emitted?\n\nFollow the existing SSE event pattern used by mood events. Add new REQ-COMP-4x requirements. Update the spec's Phase coverage table if needed.\n\nDo NOT modify the plan — that will be a separate commission after this spec addendum is reviewed."
dependencies: []
linked_artifacts:
  - .lore/specs/compaction-system-spec.md

activity_timeline:
  - timestamp: 2026-04-03T09:35:01.217Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T09:35:01.220Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T09:35:01.249Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T09:35:08.867Z
    event: progress_report
    reason: "Reading current spec, plan, and SSE implementation patterns to understand the existing architecture before drafting requirements."
  - timestamp: 2026-04-03T09:35:43.963Z
    event: progress_report
    reason: "Context gathered. I've read: the full spec (41 requirements), the plan's phase structure, the SSE streaming pattern in adventure-routes.ts (mood events via stream.writeSSE), the client-side stream consumer (use-adventure-stream.ts handles mood events inline), and the page component's compact handler (fetches history after player-triggered compaction). Now drafting the REQ-COMP-4x notification requirements."
  - timestamp: 2026-04-03T09:38:30.155Z
    event: result_submitted
    reason: "Added seven new requirements (REQ-COMP-42 through REQ-COMP-48) to the compaction system spec for client notification when server-side compaction occurs. Changes to `.lore/specs/compaction-system-spec.md`:\n\n**New section: \"Client Notification on Server-Side Compaction\"** (between Web Client and Edge Cases)\n- REQ-COMP-42: Defines the `compacted` SSE event format, reusing the `CompactResponse` schema payload\n- REQ-COMP-43: Threshold trigger emission — requires moving the threshold check inside `streamSSE` so the stream is open when the event fires\n- REQ-COMP-44: GM tool emission — `emitCompactedEvent` callback via DI, same pattern as `emitMoodEvent`\n- REQ-COMP-45: Client handling — `useAdventureStream` gains `onCompacted` callback; page component re-fetches history without clearing the in-progress streaming message\n- REQ-COMP-46: Failed compaction emits no event\n- REQ-COMP-47: World compaction emits no event (not visible to client)\n- REQ-COMP-48: Shared schema reuses `CompactResponseSchema`\n\n**Modified requirements:**\n- REQ-COMP-26: Updated message handler sequence to show threshold check inside `streamSSE` (steps renumbered 1-9)\n- REQ-COMP-34: Superseded with cross-reference to REQ-COMP-42–48\n\n**Updated sections:**\n- Incremental Delivery: Phase 2 now includes threshold notification (REQ-COMP-42/43/45-48), Phase 3 adds GM tool notification (REQ-COMP-44)\n- Success Criteria: Added criterion for client display updating without page reload\n- AI Validation: Added four test cases (threshold SSE event, GM tool SSE event, no event on failure, client callback)\n\n**Note for plan update:** REQ-COMP-43 requires moving the threshold check from outside `streamSSE` to inside it. The current plan (Phase 2) has the check outside. This restructuring should be addressed in the plan update commission. The notification requirements split across plan Phases 3 and 4 (matching spec Phases 2 and 3)."
  - timestamp: 2026-04-03T09:38:38.642Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Context gathered. I've read: the full spec (41 requirements), the plan's phase structure, the SSE streaming pattern in adventure-routes.ts (mood events via stream.writeSSE), the client-side stream consumer (use-adventure-stream.ts handles mood events inline), and the page component's compact handler (fetches history after player-triggered compaction). Now drafting the REQ-COMP-4x notification requirements."
projectName: corvran
---
Added seven new requirements (REQ-COMP-42 through REQ-COMP-48) to the compaction system spec for client notification when server-side compaction occurs. Changes to `.lore/specs/compaction-system-spec.md`:

**New section: "Client Notification on Server-Side Compaction"** (between Web Client and Edge Cases)
- REQ-COMP-42: Defines the `compacted` SSE event format, reusing the `CompactResponse` schema payload
- REQ-COMP-43: Threshold trigger emission — requires moving the threshold check inside `streamSSE` so the stream is open when the event fires
- REQ-COMP-44: GM tool emission — `emitCompactedEvent` callback via DI, same pattern as `emitMoodEvent`
- REQ-COMP-45: Client handling — `useAdventureStream` gains `onCompacted` callback; page component re-fetches history without clearing the in-progress streaming message
- REQ-COMP-46: Failed compaction emits no event
- REQ-COMP-47: World compaction emits no event (not visible to client)
- REQ-COMP-48: Shared schema reuses `CompactResponseSchema`

**Modified requirements:**
- REQ-COMP-26: Updated message handler sequence to show threshold check inside `streamSSE` (steps renumbered 1-9)
- REQ-COMP-34: Superseded with cross-reference to REQ-COMP-42–48

**Updated sections:**
- Incremental Delivery: Phase 2 now includes threshold notification (REQ-COMP-42/43/45-48), Phase 3 adds GM tool notification (REQ-COMP-44)
- Success Criteria: Added criterion for client display updating without page reload
- AI Validation: Added four test cases (threshold SSE event, GM tool SSE event, no event on failure, client callback)

**Note for plan update:** REQ-COMP-43 requires moving the threshold check from outside `streamSSE` to inside it. The current plan (Phase 2) has the check outside. This restructuring should be addressed in the plan update commission. The notification requirements split across plan Phases 3 and 4 (matching spec Phases 2 and 3).
