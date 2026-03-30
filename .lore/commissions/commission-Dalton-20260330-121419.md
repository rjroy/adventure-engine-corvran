---
title: "Commission: Phase 5: Concept in GM Prompt"
date: 2026-03-30
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 5 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n**FIRST**: Read Thorne's Phase 4 review. Check the commission result for commission-Thorne-20260330-121411. Address ALL findings before starting Phase 5 work.\n\n## Scope\n\nPhase 5: Concept in GM Prompt. Wires concept text into prompt assembly. Backend-only, ~50 lines.\n\nRead the full plan for Phase 5 details (Steps 5.1-5.4). Key changes:\n\n1. **Add `concept: string | null` to `AdventureState`** in prompt-service.ts.\n2. **Add `## Adventure Concept` section** in `assembleSystemPrompt`, positioned after Identity/Principles and before Adventure State. Only included when concept is non-null.\n3. **Pass concept from adventure routes**: The `getAdventure` response already includes `concept` after Phase 2.\n4. **Update tests**: New test cases for concept present/null/ordering. Update existing tests that construct `AdventureState` to include `concept: null`.\n\n## Verification\n\nAll backend tests pass. `bun run build` typechecks clean."
dependencies:
  - commission-Thorne-20260330-121411
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T19:14:19.112Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:14:19.114Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
