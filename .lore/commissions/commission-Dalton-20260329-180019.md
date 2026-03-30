---
title: "Commission: Engine Dice Tool: Phase 2 - Wire Into Session Runner"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 2 of the Engine Dice Tool plan at `.lore/plans/engine-dice-tool.md`. Read the plan before starting. Phase 1 must be complete before this runs.\n\n## What to change\n\n**Step 2.1**: Update `packages/backend/src/services/session-runner.ts`\n\nFour changes:\n1. Import `createDiceTool` from `./dice-tool.js`\n2. Create the dice MCP server once at construction time (after destructuring deps, before runQuery): `const diceMcpServer = createDiceTool();`\n3. Add `mcpServers: { corvran: diceMcpServer }` to the query options passed to `queryFn`\n4. Add `\"mcp__corvran__roll_dice\"` to `allowedTools` (but NOT to `tools`, which controls built-in tools): `allowedTools: [...TOOLS, \"mcp__corvran__roll_dice\"]`\n\n**Step 2.2**: Verify build\n```bash\ncd packages/backend && bunx tsc --noEmit\n```\n\n**Step 2.3**: Run full backend test suite\n```bash\nbun test packages/backend/tests/\n```\n\nAll existing tests must still pass. The mock queryFn in message-route tests receives the new options but doesn't validate them, so nothing should break.\n\n## Done when\n- Session runner creates dice MCP server at construction time\n- Every query includes the dice tool in mcpServers and allowedTools\n- TypeScript builds clean\n- All tests pass"
dependencies:
  - commission-Thorne-20260329-180009
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T01:00:19.783Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T01:00:19.786Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T01:22:12.942Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T01:22:12.947Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
