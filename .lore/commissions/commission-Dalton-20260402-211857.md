---
title: "Commission: Build: Compaction System Phase 1 — CompactionService"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the compaction system plan at `.lore/plans/compaction-system-plan.md`.\n\nRead the full plan first. Phase 1 covers Steps 1.1 through 1.5:\n\n1. Add `deleteFile` and `readFiles` to the `FileOps` interface in `types.ts`, with production implementations in `app.ts` and mock implementations in `tests/helpers/mock-file-ops.ts`.\n2. Create `packages/backend/src/services/compaction-service.ts` with `createCompactionService(deps)` factory following the DI pattern.\n3. Write the history and world summarization prompts as constants in the compaction service module.\n4. Implement the query result text extraction.\n5. Write comprehensive tests at `packages/backend/tests/services/compaction-service.test.ts` covering all nine test cases listed in Step 1.4.\n6. Wire the CompactionService into DI in `app.ts`.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md`\n- Architecture: `.lore/reference/architecture-pattern.md`\n- Existing patterns: `packages/backend/src/services/session-runner.ts`, `packages/backend/src/services/dice-tool.ts`\n- Test infrastructure: `packages/backend/tests/helpers/mock-file-ops.ts`, `packages/backend/tests/helpers/mock-query.ts`\n\nAll tests must pass before declaring complete. Run `bun test` from `packages/backend`."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T04:18:57.060Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:18:57.061Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
