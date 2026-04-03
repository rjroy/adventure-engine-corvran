---
title: "Commission: Build: Compaction System Phase 4 — GM Compact Tool"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the compaction system plan at `.lore/plans/compaction-system-plan.md`.\n\n**Before starting Phase 4 work, read Thorne's Phase 1 review findings. Address ALL findings before proceeding.** Check the most recent Thorne commission result for Phase 1 review findings. Fix every issue Thorne raised, regardless of severity.\n\nPhase 4 covers Steps 4.1 through 4.4:\n\n1. Create `packages/backend/src/services/compact-tool.ts` following the `dice-tool.ts` pattern. Export `createCompactToolDef(deps)`.\n2. Register the tool on the corvran MCP server in `session-runner.ts`. Add `mcp__corvran__compact_history` to `allowedTools`. Pass `fileOps` and `compactionService` to the session runner factory.\n3. Add GM system prompt guidance in `prompt-service.ts` with the verbatim text from REQ-COMP-13. Add `compactionEnabled` flag to conditionally include it.\n4. Write tests at `packages/backend/tests/services/compact-tool.test.ts` covering all five test cases in Step 4.4.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-11 through REQ-COMP-14, REQ-COMP-27, REQ-COMP-30)\n- Plan: `.lore/plans/compaction-system-plan.md` (Phase 4 section)\n- Existing tool pattern: `packages/backend/src/services/dice-tool.ts`\n- Session runner: `packages/backend/src/services/session-runner.ts`\n- Prompt service: `packages/backend/src/services/prompt-service.ts`\n\nAll tests must pass before declaring complete. Run `bun test` from `packages/backend`."
dependencies:
  - commission-Thorne-20260402-211905
linked_artifacts:
  - packages/backend/src/services/compact-tool.ts

  - packages/backend/src/services/compaction-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/src/services/compaction-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/compact-tool.test.ts
activity_timeline:
  - timestamp: 2026-04-03T04:19:49.217Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:19:49.219Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T04:27:26.056Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T04:27:26.121Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T04:27:26.148Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T04:27:34.783Z
    event: progress_report
    reason: "Starting Phase 4. Reading plan, spec, Thorne's Phase 1 review, and existing patterns."
  - timestamp: 2026-04-03T04:29:04.706Z
    event: progress_report
    reason: "All context gathered. Fixing Thorne's 3 findings (F1: missing timeout, F2: type assertions, F3: deleteFile rollback), then implementing Phase 4 steps 4.1-4.4."
  - timestamp: 2026-04-03T04:32:14.733Z
    event: result_submitted
    reason: "## Phase 4 Complete: GM Compact Tool and System Prompt Guidance\n\n### Thorne Phase 1 Findings Fixed (all 3)\n\n**F1 (MEDIUM)**: Added 60-second timeout to Haiku call via `AbortController` + `setTimeout`, cleared in `finally` block. Prevents indefinite lock hold on hung Haiku calls (REQ-COMP-41).\n\n**F2 (LOW)**: Replaced type assertions (`as { result: string }`) with runtime property checks (`\"result\" in msg && typeof msg.result === \"string\"`). Added comment explaining SDK type limitation.\n\n**F3 (LOW)**: Wrapped `deleteFile` in try-catch with archive rollback. If delete fails after archive write, the archive is cleaned up to prevent two copies on disk.\n\n### Phase 4 Implementation\n\n**Step 4.1 — `compact-tool.ts`**: Created `createCompactToolDef(deps)` following the dice-tool pattern. Tool name: `compact_history`, empty input schema (REQ-COMP-11). Handler calls `compactionService.compactHistory()`, returns confirmation with archive path (REQ-COMP-12). Catches `HistoryTooShortError` and `CompactionInProgressError` with appropriate messages. No minimum length bypass (REQ-COMP-14).\n\n**Step 4.2 — Session runner registration**: Added `fileOps` and `compactionService` as optional deps to `createSessionRunner`. When both provided, creates the compact tool with a `getAdventureContext` callback that reads `character.md` and `world.md` at tool-call time (not stale from turn start). Tool added to both the MCP server tools array and the `allowedTools` array (REQ-COMP-27). Backward compatible: runners without compaction deps work as before.\n\n**Step 4.3 — GM system prompt guidance**: Added `compactionEnabled` flag to `AdventureState`. When true, appends the verbatim REQ-COMP-13 guidance as a `## History Compaction` subsection after the Instructions section.\n\n**Step 4.4 — Tests**: All 5 test cases pass:\n1. Tool definition shape (name, description, input schema)\n2. Successful compaction (returns confirmation with archive path)\n3. Short history (returns \"too short\" message)\n4. Concurrent compaction (returns \"already in progress\" message)\n5. MCP integration (runner accepts compaction deps, backward compat)\n\n### DI Wiring (app.ts)\n\nReordered to create `compactionService` before `sessionRunner` so it can be passed as a dependency. Both `fileOps` and `compactionService` now flow to the session runner.\n\n### Verification\n\n- TypeScript: clean compile, no errors\n- Tests: 479 pass, 0 fail across 33 files"
  - timestamp: 2026-04-03T04:32:20.762Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All context gathered. Fixing Thorne's 3 findings (F1: missing timeout, F2: type assertions, F3: deleteFile rollback), then implementing Phase 4 steps 4.1-4.4."
projectName: corvran
---
## Phase 4 Complete: GM Compact Tool and System Prompt Guidance

### Thorne Phase 1 Findings Fixed (all 3)

**F1 (MEDIUM)**: Added 60-second timeout to Haiku call via `AbortController` + `setTimeout`, cleared in `finally` block. Prevents indefinite lock hold on hung Haiku calls (REQ-COMP-41).

**F2 (LOW)**: Replaced type assertions (`as { result: string }`) with runtime property checks (`"result" in msg && typeof msg.result === "string"`). Added comment explaining SDK type limitation.

**F3 (LOW)**: Wrapped `deleteFile` in try-catch with archive rollback. If delete fails after archive write, the archive is cleaned up to prevent two copies on disk.

### Phase 4 Implementation

**Step 4.1 — `compact-tool.ts`**: Created `createCompactToolDef(deps)` following the dice-tool pattern. Tool name: `compact_history`, empty input schema (REQ-COMP-11). Handler calls `compactionService.compactHistory()`, returns confirmation with archive path (REQ-COMP-12). Catches `HistoryTooShortError` and `CompactionInProgressError` with appropriate messages. No minimum length bypass (REQ-COMP-14).

**Step 4.2 — Session runner registration**: Added `fileOps` and `compactionService` as optional deps to `createSessionRunner`. When both provided, creates the compact tool with a `getAdventureContext` callback that reads `character.md` and `world.md` at tool-call time (not stale from turn start). Tool added to both the MCP server tools array and the `allowedTools` array (REQ-COMP-27). Backward compatible: runners without compaction deps work as before.

**Step 4.3 — GM system prompt guidance**: Added `compactionEnabled` flag to `AdventureState`. When true, appends the verbatim REQ-COMP-13 guidance as a `## History Compaction` subsection after the Instructions section.

**Step 4.4 — Tests**: All 5 test cases pass:
1. Tool definition shape (name, description, input schema)
2. Successful compaction (returns confirmation with archive path)
3. Short history (returns "too short" message)
4. Concurrent compaction (returns "already in progress" message)
5. MCP integration (runner accepts compaction deps, backward compat)

### DI Wiring (app.ts)

Reordered to create `compactionService` before `sessionRunner` so it can be passed as a dependency. Both `fileOps` and `compactionService` now flow to the session runner.

### Verification

- TypeScript: clean compile, no errors
- Tests: 479 pass, 0 fail across 33 files
