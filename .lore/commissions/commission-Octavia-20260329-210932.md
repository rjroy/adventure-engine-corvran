---
title: "Commission: Prepare Implementation Plan: Adventure System Integration"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/adventure-system-integration.md`. \n\nRead the spec thoroughly, then read the current codebase to understand what exists today and what needs to change. The plan should be a phased, ordered sequence of work that Dalton can execute.\n\nKey files to examine:\n- `packages/backend/src/app.ts` (config, DI wiring, current hardcoded plugin paths)\n- `packages/backend/src/services/session-runner.ts` (current plugin path handling, RunQueryParams)\n- `packages/backend/src/services/prompt-service.ts` (current prompt assembly, AdventureState)\n- `packages/backend/src/services/adventure-service.ts` (adventure listing, detail)\n- `packages/backend/src/routes/adventure-routes.ts` (message handler, where resolution will happen)\n- `packages/shared/src/schemas.ts` (AdventureListItemSchema, AdventureDetailSchema)\n- `packages/backend/tests/` (existing test patterns)\n- The existing plugin directories in `plugins/` to understand what manifests need to be created\n\nImportant context:\n- The Engine Dice Tool spec has already been implemented. The session runner now has `mcpServers` with the corvran dice tool. Check the current state of `session-runner.ts` before planning changes to it.\n- The spec references the dice tool spec for Instructions text updates (REQ-SYS-22 point 6). Check whether the dice tool changes are already in place.\n- Each phase needs a clear review gate with Thorne.\n- **Critical pattern**: When planning a Dalton → Thorne → Dalton chain, each Dalton commission after a review MUST include \"Read Thorne's review at [path]. Address ALL findings before starting this phase's work.\" The dependency system ensures ordering but not awareness.\n\nWrite the plan to `.lore/plans/adventure-system-integration.md`."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T04:09:32.896Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:09:32.899Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
