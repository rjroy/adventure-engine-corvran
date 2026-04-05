---
title: "Commission: Plan: Adventure File Structure (AFS spec)"
date: 2026-04-05
status: completed
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/adventure-file-structure.md`.\n\n**Your task:** Read the spec thoroughly, read the current codebase (especially `packages/backend/src/services/prompt-service.ts`, `packages/backend/src/services/adventure-service.ts`, and any existing prompt assembly or file tool instruction logic), and produce a phased implementation plan.\n\n**The plan should:**\n1. Identify what already exists and what needs to change\n2. Break the work into sequential phases that Dalton can execute as commissions\n3. Each phase should have clear inputs, outputs, files touched, and test expectations\n4. Flag any ambiguities or gaps between the spec and the current code\n5. Account for the test/review requirements in the spec's AI Validation section\n6. Reference the existing adventure at `/home/rjroy/.corvran/adventures/the-golden-age/` as the target format example, and `/home/rjroy/.corvran/adventures/new-arcana/` as the current flat format\n\n**Key context from the spec:**\n- This is mostly a prompt-service change (what gets assembled into the system prompt) plus updated file tool instructions\n- The engine reads the same files it always has; the change is in what those files *contain* and what instructions the GM gets\n- Convention over enforcement: no engine-side validation of file content semantics\n- Reference `.lore/reference/architecture-pattern.md` for the project's DI and service patterns\n\n**Output:** Write the plan to `.lore/plans/adventure-file-structure-plan.md`. Follow existing plan format conventions in `.lore/plans/` if any exist."
dependencies: []
linked_artifacts:
  - .lore/plans/adventure-file-structure-plan.md

activity_timeline:
  - timestamp: 2026-04-05T16:21:19.912Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-05T16:21:19.915Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-05T16:21:19.946Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-05T16:21:28.586Z
    event: progress_report
    reason: "Starting plan preparation. Reading the spec, existing plans for format conventions, and key source files."
  - timestamp: 2026-04-05T16:22:05.658Z
    event: progress_report
    reason: "Read spec, both reference adventures, prompt-service, adventure-service, adventure-routes, and architecture reference. Now checking existing tests and the chat route's prompt assembly call site to complete the picture before writing the plan."
  - timestamp: 2026-04-05T16:22:25.274Z
    event: progress_report
    reason: "All context gathered. Writing the plan now. Key observations: (1) prompt-service is a single pure function, 121 lines; (2) the File Tools instruction section needs full replacement with the spec's two-layer text; (3) onboarding section needs updated language about the two-layer structure; (4) adventure-service needs no changes (REQ-AFS-7); (5) the-golden-age already demonstrates the target format; new-arcana demonstrates the flat format."
  - timestamp: 2026-04-05T16:24:21.471Z
    event: result_submitted
    reason: "Plan written to `.lore/plans/adventure-file-structure-plan.md`.\n\nTwo phases, single Dalton commission. The change is contained to `prompt-service.ts` (replace File Tools instruction text with two-layer convention from REQ-AFS-12, update onboarding prose for REQ-AFS-11) and its test file (update 2 existing tests, add 2 new tests including an integration test with the-golden-age-shaped fixtures).\n\nKey finding: adventure-service.ts needs zero changes. The engine already reads the right files; only the instructions about what those files should contain are changing. The `AdventureState` interface and section ordering are unchanged.\n\nThree items deferred per spec: adventure migration (STUB), onboarding interaction flow (STUB), summarization agent (STUB). Existing flat-format adventures like `new-arcana` continue to work unchanged."
  - timestamp: 2026-04-05T16:24:26.019Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All context gathered. Writing the plan now. Key observations: (1) prompt-service is a single pure function, 121 lines; (2) the File Tools instruction section needs full replacement with the spec's two-layer text; (3) onboarding section needs updated language about the two-layer structure; (4) adventure-service needs no changes (REQ-AFS-7); (5) the-golden-age already demonstrates the target format; new-arcana demonstrates the flat format."
projectName: corvran
---
Plan written to `.lore/plans/adventure-file-structure-plan.md`.

Two phases, single Dalton commission. The change is contained to `prompt-service.ts` (replace File Tools instruction text with two-layer convention from REQ-AFS-12, update onboarding prose for REQ-AFS-11) and its test file (update 2 existing tests, add 2 new tests including an integration test with the-golden-age-shaped fixtures).

Key finding: adventure-service.ts needs zero changes. The engine already reads the right files; only the instructions about what those files should contain are changing. The `AdventureState` interface and section ordering are unchanged.

Three items deferred per spec: adventure migration (STUB), onboarding interaction flow (STUB), summarization agent (STUB). Existing flat-format adventures like `new-arcana` continue to work unchanged.
