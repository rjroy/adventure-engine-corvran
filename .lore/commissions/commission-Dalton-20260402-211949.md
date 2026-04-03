---
title: "Commission: Build: Compaction System Phase 4 — GM Compact Tool"
date: 2026-04-03
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the compaction system plan at `.lore/plans/compaction-system-plan.md`.\n\n**Before starting Phase 4 work, read Thorne's Phase 1 review findings. Address ALL findings before proceeding.** Check the most recent Thorne commission result for Phase 1 review findings. Fix every issue Thorne raised, regardless of severity.\n\nPhase 4 covers Steps 4.1 through 4.4:\n\n1. Create `packages/backend/src/services/compact-tool.ts` following the `dice-tool.ts` pattern. Export `createCompactToolDef(deps)`.\n2. Register the tool on the corvran MCP server in `session-runner.ts`. Add `mcp__corvran__compact_history` to `allowedTools`. Pass `fileOps` and `compactionService` to the session runner factory.\n3. Add GM system prompt guidance in `prompt-service.ts` with the verbatim text from REQ-COMP-13. Add `compactionEnabled` flag to conditionally include it.\n4. Write tests at `packages/backend/tests/services/compact-tool.test.ts` covering all five test cases in Step 4.4.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-11 through REQ-COMP-14, REQ-COMP-27, REQ-COMP-30)\n- Plan: `.lore/plans/compaction-system-plan.md` (Phase 4 section)\n- Existing tool pattern: `packages/backend/src/services/dice-tool.ts`\n- Session runner: `packages/backend/src/services/session-runner.ts`\n- Prompt service: `packages/backend/src/services/prompt-service.ts`\n\nAll tests must pass before declaring complete. Run `bun test` from `packages/backend`."
dependencies:
  - commission-Thorne-20260402-211905
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T04:19:49.217Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:19:49.219Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
