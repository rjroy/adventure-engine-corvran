---
title: "Commission: Build: Compaction Notification Phase B — Client-Side Consumption"
date: 2026-04-03
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase B of the compaction notification plan at `.lore/plans/compaction-notification-plan.md`.\n\n**Before starting Phase B, read Thorne's Phase A review.** Address ALL findings before proceeding. Check the most recent Thorne commission result for Phase A review findings.\n\nPhase B covers Steps B.1 through B.3:\n\n1. Add `compacted` event handling to `useAdventureStream` hook (`packages/web/lib/use-adventure-stream.ts`). Add `onCompacted` callback parameter. Parse the event with `CompactResponseSchema.safeParse()`. The callback must NOT interfere with streaming state (isStreaming stays true, streamingMessage is not cleared).\n2. Wire `onCompacted` in the page component (`packages/web/app/adventure/[id]/page.tsx`). The callback re-fetches history via `GET /api/daemon/adventures/:id/history` and replaces the `messages` state. The streaming message is untouched.\n3. Write hook-level tests verifying: `onCompacted` fires with parsed payload, `isStreaming` remains true, `streamingMessage` is not cleared.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-45)\n- Plan: `.lore/plans/compaction-notification-plan.md` (Phase B section)\n- Existing mood event client handling in `use-adventure-stream.ts`\n\nTypecheck clean (`tsc --build` from root). Run any web-side tests if they exist."
dependencies:
  - commission-Thorne-20260403-080044
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T15:00:56.633Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T15:00:56.635Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
