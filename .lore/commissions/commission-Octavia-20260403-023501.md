---
title: "Commission: Spec Addendum: Compaction Notification to Active Chat Sessions"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Add requirements to the compaction system spec at `.lore/specs/compaction-system-spec.md` for notifying active chat sessions when compaction occurs.\n\n**The gap**: When compaction is triggered by threshold (Phase 2) or by the GM tool (Phase 4), the server-side history changes but the web client's in-memory message list becomes stale. The client has no way to know compaction happened. Only player-initiated compaction (Phase 3 button) refreshes the display, because the client explicitly re-fetches history after the POST succeeds.\n\n**Context to read**:\n- Current spec: `.lore/specs/compaction-system-spec.md`\n- Current plan: `.lore/plans/compaction-system-plan.md`\n- The SSE streaming implementation: `packages/backend/src/routes/adventure-routes.ts` (the message handler streams SSE events to the client)\n- The client-side stream consumer: `packages/web/app/adventure/[id]/page.tsx` and any `use-adventure-stream` hook\n- How mood events are emitted (this is the existing pattern for server-to-client custom events): search for `emitMoodEvent` and `mood` SSE events in the adventure routes and client code\n\n**What to spec**:\n- How the server signals to the active client that compaction happened during a turn (threshold-triggered or GM tool-triggered)\n- How the client responds to that signal (re-fetch history, replace displayed messages with the compacted state)\n- Whether the notification should include any payload (e.g., the archive path, the recap text) or just be a \"refresh your history\" signal\n- Edge cases: what if the client is mid-stream when compaction happens? What if the compaction fails (archive reversed) — should any event still be emitted?\n\nFollow the existing SSE event pattern used by mood events. Add new REQ-COMP-4x requirements. Update the spec's Phase coverage table if needed.\n\nDo NOT modify the plan — that will be a separate commission after this spec addendum is reviewed."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T09:35:01.217Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T09:35:01.220Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
