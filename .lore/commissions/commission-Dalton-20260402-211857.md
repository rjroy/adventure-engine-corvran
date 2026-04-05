---
title: "Commission: Build: Compaction System Phase 1 — CompactionService"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the compaction system plan at `.lore/plans/compaction-system-plan.md`.\n\nRead the full plan first. Phase 1 covers Steps 1.1 through 1.5:\n\n1. Add `deleteFile` and `readFiles` to the `FileOps` interface in `types.ts`, with production implementations in `app.ts` and mock implementations in `tests/helpers/mock-file-ops.ts`.\n2. Create `packages/backend/src/services/compaction-service.ts` with `createCompactionService(deps)` factory following the DI pattern.\n3. Write the history and world summarization prompts as constants in the compaction service module.\n4. Implement the query result text extraction.\n5. Write comprehensive tests at `packages/backend/tests/services/compaction-service.test.ts` covering all nine test cases listed in Step 1.4.\n6. Wire the CompactionService into DI in `app.ts`.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md`\n- Architecture: `.lore/reference/architecture-pattern.md`\n- Existing patterns: `packages/backend/src/services/session-runner.ts`, `packages/backend/src/services/dice-tool.ts`\n- Test infrastructure: `packages/backend/tests/helpers/mock-file-ops.ts`, `packages/backend/tests/helpers/mock-query.ts`\n\nAll tests must pass before declaring complete. Run `bun test` from `packages/backend`."
dependencies: []
linked_artifacts:
  - packages/backend/src/services/compaction-service.ts

  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/src/types.ts
  - packages/backend/src/app.ts
  - packages/backend/src/index.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/src/types.ts
  - packages/backend/src/app.ts
  - packages/backend/src/index.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
  - packages/backend/src/routes/adventure-routes.ts
activity_timeline:
  - timestamp: 2026-04-03T04:18:57.060Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:18:57.061Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T04:18:57.091Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T04:19:22.432Z
    event: progress_report
    reason: "Reading plan, spec, and existing source files. Phase 1 scope is clear: FileOps extensions, CompactionService factory, summarization prompts, query result extraction, 9 test cases, DI wiring."
  - timestamp: 2026-04-03T04:19:43.127Z
    event: progress_report
    reason: "Context gathered. Starting Step 1.1: Adding deleteFile and readFiles to FileOps interface, then creating compaction-service.ts."
  - timestamp: 2026-04-03T04:21:41.099Z
    event: progress_report
    reason: "FileOps extended, compaction-service.ts created, DI wired in app.ts, adventure-routes accepts compactionService. Typecheck passes. Writing tests now."
  - timestamp: 2026-04-03T04:23:29.184Z
    event: result_submitted
    reason: "Phase 1 of the compaction system is implemented and verified. All 474 tests pass (10 new), typecheck clean.\n\n**What was built:**\n\n1. **FileOps interface extended** (`types.ts:11-12`): Added `deleteFile(path)` and `readFiles(path)` methods.\n   - Production implementations in `app.ts` using `fs.unlink` and `readdir` filtered for `isFile()`\n   - Mock implementations in `mock-file-ops.ts` operating on the in-memory store\n   - Stub implementations in `index.ts` (startup-only FileOps that doesn't need these)\n\n2. **CompactionService** (`compaction-service.ts`, 185 LOC): `createCompactionService({ fileOps, queryFn })` factory with:\n   - `compactHistory(adventurePath, context?)` - archive-summarize-save pipeline for history.md\n   - `compactWorld(adventurePath)` - same pipeline for world.md with world-specific prompt\n   - `isCompacting(adventurePath)` - concurrency check\n   - Per-adventure concurrency lock via in-memory Set, released in `finally` block\n   - Haiku failure reversal: restores original file and cleans up archive on error\n   - Short/missing history guard (< 500 chars throws HistoryTooShortError)\n   - Sequential numbering: scans `past/` for highest existing number, never gap-fills\n   - History prompt includes character.md and world.md as reference context when provided\n   - Custom error types: `CompactionInProgressError`, `HistoryTooShortError`\n\n3. **Summarization prompts**: Two constants following REQ-COMP-16 through REQ-COMP-20 verbatim. History prompt preserves all seven required categories and establishes recency weighting. World prompt consolidates reference documents.\n\n4. **DI wiring** (`app.ts`): CompactionService created alongside SessionRunner when queryFn is available, passed to adventure routes as optional dep.\n\n5. **Tests** (`compaction-service.test.ts`, 10 tests covering all 9 required cases plus world sequence independence):\n   - Pipeline: archive + summary + cleanup verified\n   - Sequential numbering with gap detection\n   - Short history / missing history rejection\n   - Concurrency lock + CompactionInProgressError\n   - Haiku failure reversal + lock cleanup\n   - Context passed to Haiku (character + world in system prompt, correct model/options)\n   - Verbatim archive (byte-identical with unicode content)\n   - World compaction with world-NNN naming and world-specific prompt\n   - World/scene numbering independence"
  - timestamp: 2026-04-03T04:23:36.815Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "FileOps extended, compaction-service.ts created, DI wired in app.ts, adventure-routes accepts compactionService. Typecheck passes. Writing tests now."
projectName: corvran
---
Phase 1 of the compaction system is implemented and verified. All 474 tests pass (10 new), typecheck clean.

**What was built:**

1. **FileOps interface extended** (`types.ts:11-12`): Added `deleteFile(path)` and `readFiles(path)` methods.
   - Production implementations in `app.ts` using `fs.unlink` and `readdir` filtered for `isFile()`
   - Mock implementations in `mock-file-ops.ts` operating on the in-memory store
   - Stub implementations in `index.ts` (startup-only FileOps that doesn't need these)

2. **CompactionService** (`compaction-service.ts`, 185 LOC): `createCompactionService({ fileOps, queryFn })` factory with:
   - `compactHistory(adventurePath, context?)` - archive-summarize-save pipeline for history.md
   - `compactWorld(adventurePath)` - same pipeline for world.md with world-specific prompt
   - `isCompacting(adventurePath)` - concurrency check
   - Per-adventure concurrency lock via in-memory Set, released in `finally` block
   - Haiku failure reversal: restores original file and cleans up archive on error
   - Short/missing history guard (< 500 chars throws HistoryTooShortError)
   - Sequential numbering: scans `past/` for highest existing number, never gap-fills
   - History prompt includes character.md and world.md as reference context when provided
   - Custom error types: `CompactionInProgressError`, `HistoryTooShortError`

3. **Summarization prompts**: Two constants following REQ-COMP-16 through REQ-COMP-20 verbatim. History prompt preserves all seven required categories and establishes recency weighting. World prompt consolidates reference documents.

4. **DI wiring** (`app.ts`): CompactionService created alongside SessionRunner when queryFn is available, passed to adventure routes as optional dep.

5. **Tests** (`compaction-service.test.ts`, 10 tests covering all 9 required cases plus world sequence independence):
   - Pipeline: archive + summary + cleanup verified
   - Sequential numbering with gap detection
   - Short history / missing history rejection
   - Concurrency lock + CompactionInProgressError
   - Haiku failure reversal + lock cleanup
   - Context passed to Haiku (character + world in system prompt, correct model/options)
   - Verbatim archive (byte-identical with unicode content)
   - World compaction with world-NNN naming and world-specific prompt
   - World/scene numbering independence
