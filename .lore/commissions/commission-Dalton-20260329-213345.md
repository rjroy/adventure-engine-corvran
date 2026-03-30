---
title: "Commission: Adventure System Integration: Phase 2 - Service and Schema Changes"
date: 2026-03-30
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 2 of the Adventure System Integration plan at `.lore/plans/adventure-system-integration.md`. Read the plan and spec at `.lore/specs/adventure-system-integration.md` thoroughly before starting.\n\n**IMPORTANT: Read Thorne's review at `.lore/reviews/adventure-system-integration-phase1.md` first. If Thorne couldn't write the file (read-only toolset), check the commission artifact at `.lore/commissions/commission-Thorne-20260329-213327.md` for findings in the activity timeline. Address ALL findings before starting Phase 2 work.**\n\n## What to change\n\nPhase 2 modifies existing services and schemas. No wiring changes to routes or app startup yet.\n\n**Step 2.1**: Add `system: z.string().nullable()` to both `AdventureListItemSchema` and `AdventureDetailSchema` in `packages/shared/src/schemas/adventures.ts` (REQ-SYS-24, REQ-SYS-25).\n\n**Step 2.2**: Update `packages/backend/src/services/adventure-service.ts` to read `adventure.md` during `listAdventures` and `getAdventure`, parse it with `parseAdventureConfig`, and return the `system` field (REQ-SYS-26). See the plan for the exact code pattern.\n\n**Step 2.3**: Update `packages/backend/src/services/session-runner.ts` - move `pluginPaths` from `SessionRunnerConfig` to `RunQueryParams` (REQ-SYS-18). Change line 35 from `config.pluginPaths` to `params.pluginPaths`.\n\n**Step 2.4**: Update `packages/backend/src/services/prompt-service.ts`:\n1. Add `systemBootstrap: string | null` to `AdventureState` (REQ-SYS-21)\n2. Append bootstrap to Identity section when present (REQ-SYS-22)\n3. Skip generic onboarding when bootstrap is present (REQ-SYS-22 point 4)\n4. Update Instructions text to reference dice tool instead of \"skills for dice rolls\"\n\n**Step 2.5**: Update existing tests:\n- `prompt-service.test.ts`: Add `systemBootstrap: null` to existing calls, add new tests for bootstrap inclusion, onboarding suppression, Instructions text\n- `adventure-service.test.ts`: Add `adventure.md` to mock stores, verify `system` field in list/detail\n- `message-route.test.ts`: Update `buildTestApp` for new `SessionRunnerConfig` (no `pluginPaths`)\n\n**Step 2.5 (compile shim)**: Add `pluginPaths: []` to the `runQuery` call in `adventure-routes.ts` as a temporary shim to keep the build green. Phase 3 replaces this with real resolution.\n\n**Step 2.6**: Verify:\n```bash\ncd packages/backend && bunx tsc --noEmit\nbun test packages/backend/tests/\ntsc --build\n```\n\n## Done when\n- Schemas have `system` field\n- Adventure service returns `system` from `adventure.md`\n- Session runner accepts `pluginPaths` per-query\n- Prompt service supports `systemBootstrap`\n- All tests pass, build is green"
dependencies:
  - commission-Thorne-20260329-213327
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T04:33:45.666Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:33:45.668Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
