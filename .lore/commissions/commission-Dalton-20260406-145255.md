---
title: "Commission: Implement adventure file structure (prompt instructions + tests)"
date: 2026-04-06
status: dispatched
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement the adventure file structure changes per the plan at `.lore/plans/adventure-file-structure-plan.md`.\n\n**Read the plan first.** It covers both phases:\n- **Phase 1**: Replace the File Tools instruction text and update the Onboarding section in `packages/backend/src/services/prompt-service.ts`. The plan provides exact target text for both changes.\n- **Phase 2**: Update existing tests and add new tests in `packages/backend/tests/prompt-service.test.ts`. Steps 2.1-2.5 are detailed in the plan.\n\nThe spec is at `.lore/specs/adventure-file-structure.md`. The plan maps every requirement to a phase.\n\nKey constraints:\n- `adventure-service.ts` is UNTOUCHED. No changes to what the engine reads.\n- `AdventureState` interface is unchanged. Section order in prompt assembly is unchanged.\n- Use the spec's exact instruction text for the File Tools section (REQ-AFS-12).\n- The integration test (Step 2.4) uses hardcoded string fixtures, not live file reads.\n\nRun `bun test packages/backend/tests/prompt-service.test.ts` to confirm all tests pass when done."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: haiku

activity_timeline:
  - timestamp: 2026-04-06T21:52:55.630Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-06T21:52:55.632Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
