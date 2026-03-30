---
title: "Commission: Prepare Implementation Plan: Adventure System Integration"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/adventure-system-integration.md`. \n\nRead the spec thoroughly, then read the current codebase to understand what exists today and what needs to change. The plan should be a phased, ordered sequence of work that Dalton can execute.\n\nKey files to examine:\n- `packages/backend/src/app.ts` (config, DI wiring, current hardcoded plugin paths)\n- `packages/backend/src/services/session-runner.ts` (current plugin path handling, RunQueryParams)\n- `packages/backend/src/services/prompt-service.ts` (current prompt assembly, AdventureState)\n- `packages/backend/src/services/adventure-service.ts` (adventure listing, detail)\n- `packages/backend/src/routes/adventure-routes.ts` (message handler, where resolution will happen)\n- `packages/shared/src/schemas.ts` (AdventureListItemSchema, AdventureDetailSchema)\n- `packages/backend/tests/` (existing test patterns)\n- The existing plugin directories in `plugins/` to understand what manifests need to be created\n\nImportant context:\n- The Engine Dice Tool spec has already been implemented. The session runner now has `mcpServers` with the corvran dice tool. Check the current state of `session-runner.ts` before planning changes to it.\n- The spec references the dice tool spec for Instructions text updates (REQ-SYS-22 point 6). Check whether the dice tool changes are already in place.\n- Each phase needs a clear review gate with Thorne.\n- **Critical pattern**: When planning a Dalton → Thorne → Dalton chain, each Dalton commission after a review MUST include \"Read Thorne's review at [path]. Address ALL findings before starting this phase's work.\" The dependency system ensures ordering but not awareness.\n\nWrite the plan to `.lore/plans/adventure-system-integration.md`."
dependencies: []
linked_artifacts:
  - .lore/plans/adventure-system-integration.md

activity_timeline:
  - timestamp: 2026-03-30T04:09:32.896Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:09:32.899Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T04:09:32.930Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T04:09:41.313Z
    event: progress_report
    reason: "Starting plan preparation. Reading the spec and key codebase files."
  - timestamp: 2026-03-30T04:11:05.229Z
    event: progress_report
    reason: "Finished reading all key files. Spec, current codebase, existing test patterns, and dice tool state are all mapped. The dice tool is fully implemented (Phases 1-3 complete). Writing the plan now."
  - timestamp: 2026-03-30T04:12:17.094Z
    event: progress_report
    reason: "Context fully mapped. Writing the four-phase implementation plan now."
  - timestamp: 2026-03-30T04:19:54.223Z
    event: progress_report
    reason: "Plan written and reviewed. Addressed all three reviewer findings: made the Phase 2 shim explicit as a sub-step, committed to Approach B for createApp (registry built before createApp, passed via AppDeps), and added two missing test cases to Phase 3. Plan is ready."
  - timestamp: 2026-03-30T04:20:07.861Z
    event: result_submitted
    reason: "Implementation plan written to `.lore/plans/adventure-system-integration.md`. Four phases:\n\n**Phase 1 (Foundation)**: Create corvran-plugin.json manifests, build plugin registry module, build adventure.md parser. All new code, no changes to existing files.\n\n**Phase 2 (Service Changes)**: Add `system` to shared schemas, update adventure service to read adventure.md, move `pluginPaths` from `SessionRunnerConfig` to `RunQueryParams`, update prompt service with bootstrap support and Instructions text dice tool reference. Includes a temporary `pluginPaths: []` shim in the route to keep the build green.\n\n**Phase 3 (Integration Wiring)**: Update `AppConfig` to use `pluginsDir`, build registry at startup (passed via `AppDeps`, keeping `createApp` synchronous), implement per-adventure plugin resolution and bootstrap reading in the message handler. This is where the behavioral change takes effect.\n\n**Phase 4 (Bootstrap Content)**: Author d20-system and daggerheart-system bootstrap prompts with system-specific onboarding, dice conventions, and vocabulary.\n\nEach phase has a Thorne review gate. Each Dalton commission after a review includes explicit instructions to read and address the review findings. The plan was reviewed by the plan-reviewer agent; three findings were addressed (explicit shim sub-step, committed to Approach B for async startup, added two missing test cases)."
  - timestamp: 2026-03-30T04:20:12.183Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Plan written and reviewed. Addressed all three reviewer findings: made the Phase 2 shim explicit as a sub-step, committed to Approach B for createApp (registry built before createApp, passed via AppDeps), and added two missing test cases to Phase 3. Plan is ready."
projectName: corvran
---
Implementation plan written to `.lore/plans/adventure-system-integration.md`. Four phases:

**Phase 1 (Foundation)**: Create corvran-plugin.json manifests, build plugin registry module, build adventure.md parser. All new code, no changes to existing files.

**Phase 2 (Service Changes)**: Add `system` to shared schemas, update adventure service to read adventure.md, move `pluginPaths` from `SessionRunnerConfig` to `RunQueryParams`, update prompt service with bootstrap support and Instructions text dice tool reference. Includes a temporary `pluginPaths: []` shim in the route to keep the build green.

**Phase 3 (Integration Wiring)**: Update `AppConfig` to use `pluginsDir`, build registry at startup (passed via `AppDeps`, keeping `createApp` synchronous), implement per-adventure plugin resolution and bootstrap reading in the message handler. This is where the behavioral change takes effect.

**Phase 4 (Bootstrap Content)**: Author d20-system and daggerheart-system bootstrap prompts with system-specific onboarding, dice conventions, and vocabulary.

Each phase has a Thorne review gate. Each Dalton commission after a review includes explicit instructions to read and address the review findings. The plan was reviewed by the plan-reviewer agent; three findings were addressed (explicit shim sub-step, committed to Approach B for async startup, added two missing test cases).
