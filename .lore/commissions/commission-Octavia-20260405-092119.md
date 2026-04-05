---
title: "Commission: Plan: Adventure File Structure (AFS spec)"
date: 2026-04-05
status: dispatched
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for `.lore/specs/adventure-file-structure.md`.\n\n**Your task:** Read the spec thoroughly, read the current codebase (especially `packages/backend/src/services/prompt-service.ts`, `packages/backend/src/services/adventure-service.ts`, and any existing prompt assembly or file tool instruction logic), and produce a phased implementation plan.\n\n**The plan should:**\n1. Identify what already exists and what needs to change\n2. Break the work into sequential phases that Dalton can execute as commissions\n3. Each phase should have clear inputs, outputs, files touched, and test expectations\n4. Flag any ambiguities or gaps between the spec and the current code\n5. Account for the test/review requirements in the spec's AI Validation section\n6. Reference the existing adventure at `/home/rjroy/.corvran/adventures/the-golden-age/` as the target format example, and `/home/rjroy/.corvran/adventures/new-arcana/` as the current flat format\n\n**Key context from the spec:**\n- This is mostly a prompt-service change (what gets assembled into the system prompt) plus updated file tool instructions\n- The engine reads the same files it always has; the change is in what those files *contain* and what instructions the GM gets\n- Convention over enforcement: no engine-side validation of file content semantics\n- Reference `.lore/reference/architecture-pattern.md` for the project's DI and service patterns\n\n**Output:** Write the plan to `.lore/plans/adventure-file-structure-plan.md`. Follow existing plan format conventions in `.lore/plans/` if any exist."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-05T16:21:19.912Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-05T16:21:19.915Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
