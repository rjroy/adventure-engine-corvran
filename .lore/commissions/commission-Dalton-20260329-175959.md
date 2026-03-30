---
title: "Commission: Engine Dice Tool: Phase 1 - Build Module and Tests"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the Engine Dice Tool plan at `.lore/plans/engine-dice-tool.md`. Read the plan and the spec at `.lore/specs/engine-dice-tool.md` thoroughly before starting.\n\n## What to build\n\n**Step 1.1**: Create `packages/backend/src/services/dice-tool.ts`\n- Factory function `createDiceTool(deps?)` returning `McpSdkServerConfigWithInstance`\n- Also export `rollDice` as a pure function for testability (accepts validated input, returns result)\n- MCP server named `corvran`, tool named `roll_dice`\n- Uses `createSdkMcpServer` and `tool` from `@anthropic-ai/claude-agent-sdk`\n- Zod input schema per REQ-DICE-2 with validation per REQ-DICE-12 and caps per REQ-DICE-13\n- Output per REQ-DICE-3, returned as JSON string in text content block per REQ-DICE-4\n- Injected randomness per REQ-DICE-11, defaulting to Math.random per REQ-DICE-10\n- Follow the project's DI factory pattern (see existing services in `packages/backend/src/services/`)\n\n**SDK version note**: Before writing imports, verify that `createSdkMcpServer` and `tool` are exported by the installed SDK version. Check `node_modules/@anthropic-ai/claude-agent-sdk/`. If they're missing, run `bun add @anthropic-ai/claude-agent-sdk@latest`.\n\n**Step 1.2**: Create `packages/backend/tests/services/dice-tool.test.ts`\n- Create the `services/` subdirectory under tests (new pattern per REQ-DICE-20)\n- All tests inject deterministic random function\n- 22+ tests covering: arithmetic (6), thresholds (4), labels (3), edge cases (5), validation errors (3), integration (1)\n- See the plan for exact test cases and expected values\n\n**Step 1.3**: Run tests, verify all pass\n```bash\nbun test packages/backend/tests/services/dice-tool.test.ts\n```\n\nAlso run the full backend suite to confirm nothing breaks:\n```bash\nbun test packages/backend/tests/\n```\n\n## Done when\n- `dice-tool.ts` exports `createDiceTool` and `rollDice`\n- All 22+ tests pass\n- Full backend test suite still passes\n- TypeScript builds clean (`bunx tsc --noEmit` from `packages/backend`)"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T00:59:59.381Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:59:59.383Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
