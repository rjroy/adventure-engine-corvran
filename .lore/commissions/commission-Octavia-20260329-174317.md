---
title: "Commission: Prepare Implementation Plan: Engine Dice Tool"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/engine-dice-tool.md`. \n\nRead the spec thoroughly, then read the current codebase to understand what exists today and what needs to change. The plan should be a phased, ordered sequence of work that Dalton can execute.\n\nKey files to examine:\n- `packages/backend/src/services/session-runner.ts` (where the MCP server gets registered)\n- `packages/backend/src/app.ts` (config and DI wiring)\n- `plugins/corvran/skills/dice-roller/` (what gets removed)\n- `plugins/d20-system/skills/d20-combat/SKILL.md` and other skill files listed in REQ-DICE-15 (cross-plugin references to update)\n- `plugins/daggerheart-system/skills/dh-combat/SKILL.md` and other DH skill files\n- The Agent SDK types to verify `createSdkMcpServer` and `mcpServers` usage\n\nThe plan needs to cover:\n1. Creating the dice tool module with DI pattern\n2. Integrating it into the session runner\n3. Removing the old dice-roller skill\n4. Updating all cross-plugin references in system plugin skill files\n5. Tests at each phase\n6. Build verification\n\nEach phase should have a clear review gate. Write the plan to `.lore/plans/engine-dice-tool.md`."
dependencies: []
linked_artifacts:
  - .lore/plans/engine-dice-tool.md

activity_timeline:
  - timestamp: 2026-03-30T00:43:17.442Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:43:17.444Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T00:43:17.470Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T00:43:24.340Z
    event: progress_report
    reason: "Starting plan preparation. Reading the spec and all key codebase files in parallel."
  - timestamp: 2026-03-30T00:44:09.637Z
    event: progress_report
    reason: "All source material read. Verified SDK types (createSdkMcpServer, tool, McpSdkServerConfigWithInstance, mcpServers in Options). Identified all 21 cross-plugin dice-roller references across 8 files. Now drafting the plan."
  - timestamp: 2026-03-30T00:49:46.131Z
    event: result_submitted
    reason: "Plan written to `.lore/plans/engine-dice-tool.md` and committed.\n\nThree phases with review gates:\n- **Phase 1**: Build `dice-tool.ts` module with DI pattern, Zod schema, MCP server via `createSdkMcpServer`. 22+ unit tests covering arithmetic, thresholds, labels, validation, and edge cases.\n- **Phase 2**: Wire into session runner (create at construction time, add to `mcpServers` and `allowedTools`). Build verification.\n- **Phase 3**: Delete `plugins/corvran/skills/dice-roller/`, replace all 21 cross-plugin references across 8 files with `mcp__corvran__roll_dice` examples, remove fallback sections. Grep verification.\n\nPlan reviewer ran and surfaced three findings, all addressed:\n1. Step 3.4 (advantage/disadvantage docs) was mislabeled as REQ-DICE-18 (out of scope). Merged into Step 3.3 as inline replacement documentation per REQ-DICE-15.\n2. SDK version discrepancy (`package.json` says `^0.1.69`, installed was 0.1.77). Added verification note for implementer.\n3. Validation test strategy gap (Zod runs in handler, not in pure `rollDice`). Clarified that validation tests must invoke the handler path."
  - timestamp: 2026-03-30T00:49:50.738Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All source material read. Verified SDK types (createSdkMcpServer, tool, McpSdkServerConfigWithInstance, mcpServers in Options). Identified all 21 cross-plugin dice-roller references across 8 files. Now drafting the plan."
projectName: corvran
---
Plan written to `.lore/plans/engine-dice-tool.md` and committed.

Three phases with review gates:
- **Phase 1**: Build `dice-tool.ts` module with DI pattern, Zod schema, MCP server via `createSdkMcpServer`. 22+ unit tests covering arithmetic, thresholds, labels, validation, and edge cases.
- **Phase 2**: Wire into session runner (create at construction time, add to `mcpServers` and `allowedTools`). Build verification.
- **Phase 3**: Delete `plugins/corvran/skills/dice-roller/`, replace all 21 cross-plugin references across 8 files with `mcp__corvran__roll_dice` examples, remove fallback sections. Grep verification.

Plan reviewer ran and surfaced three findings, all addressed:
1. Step 3.4 (advantage/disadvantage docs) was mislabeled as REQ-DICE-18 (out of scope). Merged into Step 3.3 as inline replacement documentation per REQ-DICE-15.
2. SDK version discrepancy (`package.json` says `^0.1.69`, installed was 0.1.77). Added verification note for implementer.
3. Validation test strategy gap (Zod runs in handler, not in pure `rollDice`). Clarified that validation tests must invoke the handler path.
