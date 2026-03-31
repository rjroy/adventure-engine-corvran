---
title: "Commission: Dynamic Mood System: Phases 4-5 (MCP Mood Tool, Backend Route Wiring)"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phases 4-5 of the dynamic mood system plan at `.lore/plans/dynamic-mood-system.md`. Read the full plan before starting.\n\n**Phase 4: MCP Mood Tool** — Create `mood-tool.ts` with `keywordHue`, `createMoodToolDef`, and `MoodToolDeps` interface. Refactor `dice-tool.ts` to export `createDiceToolDef()` alongside existing `createDiceTool()`. Write full test suite per plan. Existing dice tests must stay green.\n\n**Phase 5: Backend Route Wiring** — Restructure session-runner to use `createDiceToolDef` + `createMoodToolDef` in a combined server. Move `runQuery` inside `streamSSE` in adventure-routes.ts. Add `emitMoodEvent` and mood deps to `RunQueryParams`. Suppress `set_mood` from tool_use SSE events. Add `GET /adventures/:id/mood-image` endpoint. Check if `FileOps.readFileBytes` exists; add it if not.\n\nRead the plan's \"Implementation Notes for Dalton\" and \"Architectural Decisions\" sections carefully — they resolve ambiguities about tool composition, stream references, and DI patterns.\n\nEach phase must leave `tsc --build` and `bun test` green. Commit after each phase."
dependencies:
  - commission-Dalton-20260331-062346
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T13:23:56.992Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T13:31:51.892Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
