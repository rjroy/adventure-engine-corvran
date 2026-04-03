---
title: "Commission: Build: Compaction System — Full Cleanup and Phases 2-3"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "This is a cleanup and completion commission. Previous parallel commissions for Phases 2, 3, and 4 all independently fixed Phase 1 review findings, creating merge conflicts. Phase 4 landed cleanly. Phases 2 and 3 were abandoned. The spec and plan have been updated to fix a model configuration bug.\n\n**Read the updated plan first**: `.lore/plans/compaction-system-plan.md`\n**Read the updated spec**: `.lore/specs/compaction-system-spec.md`\n\n**Step 1: Resolve merge conflicts**\n\nFiles with conflict markers:\n- `packages/backend/src/app.ts` (duplicate compactionService creation, lines ~120-134)\n- `packages/backend/src/services/compaction-service.ts` (abortController conflict, lines ~208-212)\n\nResolve all `<<<<<<<`, `=======`, `>>>>>>>` markers. Keep the correct version of each section. After resolving, the code must compile cleanly (`tsc --build` from root).\n\n**Step 2: Fix model configuration**\n\nThe compaction service currently hardcodes `model: \"claude-haiku-4-5-20251001\"`. Per the updated spec and plan:\n- Add `model` to the compaction service's deps (default: `\"haiku\"`)\n- Read `COMPACTION_MODEL` env var in `app.ts`, pass to the compaction service factory\n- The SDK accepts short names (`\"haiku\"`, `\"sonnet\"`, `\"opus\"`) and resolves to latest automatically\n\n**Step 3: Apply ALL review findings**\n\nThorne's Phase 1 findings (from commission-Thorne-20260402-211905):\n- F1 MEDIUM: Missing 60s timeout on Haiku call\n- F2 LOW: Type assertions in extractQueryResult\n- F3 LOW: No comment explaining deleteFile rollback behavior\n\nThorne's Phase 4 findings (from commission-Thorne-20260402-211956):\n- F1 HIGH: `compactionEnabled` flag never wired to `assembleSystemPrompt` in the route\n- F2 MEDIUM: No test for prompt guidance text\n- F3 LOW: MCP integration test doesn't verify `allowedTools` contains `compact_history`\n\nRead both Thorne review commission files for full details.\n\n**Step 4: Implement Phase 2 (Threshold Trigger)**\n\nFollow the updated plan's Phase 2 section. Steps 2.1-2.3: threshold config, message handler modification, integration tests. Six test cases required.\n\n**Step 5: Implement Phase 3 (Player Endpoint and Web Button)**\n\nFollow the updated plan's Phase 3 section. Steps 3.1-3.5: shared schemas, compact endpoint, web button, proxy route, endpoint tests. Five test cases required.\n\n**Verification**: All tests pass (`bun test` from `packages/backend`), typecheck clean (`tsc --build` from root), no merge conflict markers anywhere in the codebase."
dependencies:
  - commission-Octavia-20260403-014836
linked_artifacts: []

resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-04-03T08:48:55.500Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T08:48:55.501Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T08:51:59.218Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T08:51:59.221Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
