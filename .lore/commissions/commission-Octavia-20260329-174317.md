---
title: "Commission: Prepare Implementation Plan: Engine Dice Tool"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/engine-dice-tool.md`. \n\nRead the spec thoroughly, then read the current codebase to understand what exists today and what needs to change. The plan should be a phased, ordered sequence of work that Dalton can execute.\n\nKey files to examine:\n- `packages/backend/src/services/session-runner.ts` (where the MCP server gets registered)\n- `packages/backend/src/app.ts` (config and DI wiring)\n- `plugins/corvran/skills/dice-roller/` (what gets removed)\n- `plugins/d20-system/skills/d20-combat/SKILL.md` and other skill files listed in REQ-DICE-15 (cross-plugin references to update)\n- `plugins/daggerheart-system/skills/dh-combat/SKILL.md` and other DH skill files\n- The Agent SDK types to verify `createSdkMcpServer` and `mcpServers` usage\n\nThe plan needs to cover:\n1. Creating the dice tool module with DI pattern\n2. Integrating it into the session runner\n3. Removing the old dice-roller skill\n4. Updating all cross-plugin references in system plugin skill files\n5. Tests at each phase\n6. Build verification\n\nEach phase should have a clear review gate. Write the plan to `.lore/plans/engine-dice-tool.md`."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T00:43:17.442Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:43:17.444Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
