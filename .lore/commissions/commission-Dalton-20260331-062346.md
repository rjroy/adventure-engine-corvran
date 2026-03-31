---
title: "Commission: Dynamic Mood System: Phases 1-3 (Shared Types, Utility Services, Adventure Config)"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phases 1-3 of the dynamic mood system plan at `.lore/plans/dynamic-mood-system.md`. Read the full plan before starting.\n\n**Phase 1: Shared Types** — Add MoodStateSchema, MoodEventSchema, and extend AdventureDetailSchema with currentMood in `packages/shared/src/schemas/adventures.ts`.\n\n**Phase 2: Backend Utility Services** — Create `image-gen.ts` and `color-extract.ts` in `packages/backend/src/services/`. Add `culori` dependency. Write full test suites per plan (image-gen.test.ts, color-extract.test.ts). Use `pngjs` for PNG decoding unless Bun has a native option. Check the plan's \"Implementation Notes for Dalton\" section for PNG decoder and test guidance.\n\n**Phase 3: Adventure Config and Persistence** — Extend `parseAdventureConfig` with `artStyle` and `mood` fields. Add `setMood` to adventure service. Update `getAdventure` to populate `currentMood`. Write all tests specified in the plan.\n\nEach phase must leave `tsc --build` and `bun test` green. Commit after each phase."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T13:23:46.793Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T13:24:37.900Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
