---
title: "Commission: Fix: Compaction System — Final Review Findings (F1, F2)"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Two findings from Thorne's full compaction system review. Fix both.\n\n**F1 (MEDIUM): `AppDeps` missing `compactionModel` field**\n\nFile: `packages/backend/src/app.ts`\n\nThe `AppDeps` interface (lines 83-89) is missing a `compactionModel?: string` field. The current code reads directly from env var:\n```\nconst compactionModel = process.env.COMPACTION_MODEL ?? \"haiku\";\n```\n\nIt should follow the full DI chain like the session runner model does:\n```\nconst compactionModel = deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? \"haiku\";\n```\n\nFix: Add `compactionModel?: string` to the `AppDeps` interface. Update line 104 to use the full chain.\n\n**F2 (LOW): Silent failure on history refresh after compaction**\n\nFile: `packages/web/app/adventure/[id]/page.tsx` (around lines 118-122)\n\nAfter a successful `POST /compact`, the client fetches `GET /history` to refresh the display. If this refresh fetch fails, no error is shown and the old messages remain. Add an else branch when `historyRes.ok` is false that shows an error like \"Compaction succeeded but failed to refresh display. Please reload the page.\"\n\nRun `bun test` from `packages/backend` and `tsc --build` from root to verify."
dependencies: []
linked_artifacts:
  - packages/backend/src/app.ts

  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/app/adventure/[id]/page.tsx
activity_timeline:
  - timestamp: 2026-04-03T09:24:26.349Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T09:24:26.351Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T09:24:26.381Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T09:24:59.038Z
    event: result_submitted
    reason: "Fixed both findings from Thorne's compaction review.\n\n**F1 (MEDIUM):** Added `compactionModel?: string` to `AppDeps` interface and updated the assignment to use the full DI chain: `deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? \"haiku\"`. Tests can now inject the compaction model directly.\n\n**F2 (LOW):** Added else branch after history refresh fetch. When `historyRes.ok` is false, sets error: \"Compaction succeeded but failed to refresh display. Please reload the page.\"\n\nVerification: 512 tests pass, `tsc --build` clean."
  - timestamp: 2026-04-03T09:25:02.144Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: ""
projectName: corvran
---
Fixed both findings from Thorne's compaction review.

**F1 (MEDIUM):** Added `compactionModel?: string` to `AppDeps` interface and updated the assignment to use the full DI chain: `deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku"`. Tests can now inject the compaction model directly.

**F2 (LOW):** Added else branch after history refresh fetch. When `historyRes.ok` is false, sets error: "Compaction succeeded but failed to refresh display. Please reload the page."

Verification: 512 tests pass, `tsc --build` clean.
