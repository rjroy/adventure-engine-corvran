---
title: "Commission: Adventure System Integration: Phase 3 - Integration Wiring"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 of the Adventure System Integration plan at `.lore/plans/adventure-system-integration.md`. Read the plan and spec at `.lore/specs/adventure-system-integration.md` thoroughly before starting.\n\n**IMPORTANT: Read Thorne's review at `.lore/reviews/adventure-system-integration-phase2.md` first. If Thorne couldn't write the file, check the commission artifact at `.lore/commissions/commission-Thorne-20260329-213356.md` for findings in the activity timeline. Address ALL findings before starting Phase 3 work.**\n\n## What to change\n\nPhase 3 connects the registry, per-adventure resolution, and bootstrap reading. This is the highest-risk phase.\n\n**Step 3.1**: Update `packages/backend/src/app.ts`:\n- Change `AppConfig`: replace `pluginPaths: string[]` with `pluginsDir: string`\n- Change `resolveConfig()`: `const pluginsDir = resolve(repoRoot, \"plugins\")`\n- Add `pluginRegistry` and `fileOps` to `AppDeps`\n- Pass registry and fileOps to `createAdventureRoutes`\n- Remove `pluginPaths` from session runner construction (pass only `model`)\n- Update `packages/backend/src/index.ts`: build registry with `await buildPluginRegistry(config.pluginsDir, fileOps)` before `createApp`, pass registry through deps. Bun supports top-level await.\n\n**Step 3.2**: Update `packages/backend/src/routes/adventure-routes.ts`:\n- Add `pluginRegistry` and `fileOps` to deps\n- In POST message handler, implement the resolution flow (plan has exact code):\n  1. Read adventure.md, parse config\n  2. Resolve plugin paths (core + system if declared)\n  3. If unknown alias, return HTTP 400 with error per REQ-SYS-4\n  4. Read bootstrap file if declared and exists\n  5. Pass systemBootstrap to assembleSystemPrompt\n  6. Pass pluginPaths per-query to runQuery\n- Remove the temporary `pluginPaths: []` shim from Phase 2\n\n**Step 3.3**: Write integration tests in `packages/backend/tests/message-route.test.ts`:\n- Adventure with `system: daggerheart` resolves to corvran + daggerheart-system paths\n- Adventure with `system: d20` resolves to corvran + d20-system paths  \n- Adventure with no adventure.md resolves to corvran only\n- Adventure with unknown system returns HTTP 400 with expected error\n- Bootstrap content appears in system prompt when present\n- Bootstrap file missing from disk: graceful skip, no error\n- No bootstrap for freeform adventures\n\nUpdate `buildTestApp` to construct a mock plugin registry.\n\n**Step 3.4**: Verify:\n```bash\ntsc --build\nbun test packages/backend/tests/\ngrep -r 'pluginPaths.*:.*string\\[\\]' packages/backend/src/services/session-runner.ts  # expect no matches\n```\n\n## Done when\n- App builds registry at startup from manifest scanning\n- Routes resolve plugins per-adventure\n- Unknown system returns HTTP 400 with available systems list\n- Bootstrap content injected into prompt when present\n- All tests pass, full workspace build green"
dependencies:
  - commission-Thorne-20260329-213356
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T04:34:15.732Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:34:15.734Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T04:48:56.584Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T04:48:56.586Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
