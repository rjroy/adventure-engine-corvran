---
title: "Commission: Plan Fix: Compaction System — Update for Configurable Model"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Update the compaction system plan at `.lore/plans/compaction-system-plan.md` to reflect the spec changes.\n\n**Read the updated spec first** at `.lore/specs/compaction-system-spec.md`. The spec was just updated to fix the model configuration approach: instead of hardcoding `'claude-haiku-4-5-20251001'`, the compaction service now receives a configurable model string (default `\"haiku\"`) following the same pattern as the session runner's `SessionRunnerConfig.model`.\n\n**What to update in the plan**:\n\n1. **Phase 1 (Step 1.1)**: The `createCompactionService(deps)` factory needs a `model` config in its dependencies, not a hardcoded model in the queryFn call. Update the deps type and the implementation description.\n2. **Phase 1 (Step 1.3)**: The queryFn call options should use the configured model, not the hardcoded string.\n3. **\"QueryFn for Compaction\" section** (around line 105): Replace the hardcoded model reference with the configurable pattern.\n4. **Phase 1 (Step 1.5)**: The DI wiring in `app.ts` needs to pass the model config (from `COMPACTION_MODEL` env var, default `\"haiku\"`) to the compaction service factory.\n5. **Any other references** to the old hardcoded model string throughout the plan.\n\nAlso add a note to the plan about the cleanup situation: Dalton will need to resolve merge conflicts in `app.ts` and `compaction-service.ts` from the abandoned Phase 2/3 commissions before implementing the remaining phases. The plan should mention that the cleanup commission (which follows this plan update) needs to:\n- Resolve all merge conflict markers\n- Apply Thorne's Phase 1 findings (F1: 60s timeout, F2: type assertions, F3: deleteFile rollback comment)\n- Apply Thorne's Phase 4 findings (F1: compactionEnabled never wired, F2: no prompt guidance test, F3: allowedTools verification)\n- Fix the model config to use the updated spec pattern\n- Then implement Phases 2 and 3 cleanly\n\nReference: `packages/backend/src/app.ts` and `packages/backend/src/services/session-runner.ts` for the existing model config pattern."
dependencies:
  - commission-Octavia-20260403-014820
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T08:48:36.256Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T08:48:36.258Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T08:49:45.369Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T08:49:45.371Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
