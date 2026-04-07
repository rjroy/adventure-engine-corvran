---
title: "Commission: Implement adventure file structure (prompt instructions + tests)"
date: 2026-04-06
status: completed
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement the adventure file structure changes per the plan at `.lore/plans/adventure-file-structure-plan.md`.\n\n**Read the plan first.** It covers both phases:\n- **Phase 1**: Replace the File Tools instruction text and update the Onboarding section in `packages/backend/src/services/prompt-service.ts`. The plan provides exact target text for both changes.\n- **Phase 2**: Update existing tests and add new tests in `packages/backend/tests/prompt-service.test.ts`. Steps 2.1-2.5 are detailed in the plan.\n\nThe spec is at `.lore/specs/adventure-file-structure.md`. The plan maps every requirement to a phase.\n\nKey constraints:\n- `adventure-service.ts` is UNTOUCHED. No changes to what the engine reads.\n- `AdventureState` interface is unchanged. Section order in prompt assembly is unchanged.\n- Use the spec's exact instruction text for the File Tools section (REQ-AFS-12).\n- The integration test (Step 2.4) uses hardcoded string fixtures, not live file reads.\n\nRun `bun test packages/backend/tests/prompt-service.test.ts` to confirm all tests pass when done."
dependencies: []
linked_artifacts:
  - packages/backend/src/services/prompt-service.ts

  - packages/backend/tests/prompt-service.test.ts
  - packages/backend/tests/prompt-service.test.ts
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
  - timestamp: 2026-04-06T21:52:55.737Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-06T21:53:20.996Z
    event: progress_report
    reason: "Starting Phase 1: Updating File Tools and Onboarding instructions in prompt-service.ts"
  - timestamp: 2026-04-06T21:54:31.453Z
    event: progress_report
    reason: "Phase 1 and Phase 2 complete. File tool instructions and onboarding updated to describe two-layer structure. All 21 prompt-service tests pass. Full backend suite: 268 tests pass."
  - timestamp: 2026-04-06T21:54:38.753Z
    event: result_submitted
    reason: "## Adventure File Structure Implementation - Complete\n\n### Phase 1: Updated Prompt Instructions\n✅ **File Tools section** (`prompt-service.ts` lines 97-115): Replaced flat-file instructions with two-layer structure description including:\n- Bootstrap files explanation (character.md summary, world.md index)\n- Reference files explanation (typed subdirectories, <type>/<name>.md pattern)\n- Read-on-demand guidance\n- When state changes (update reference file + index)\n- When introducing new elements (write reference file + index entry)\n- System file protection (don't modify adventure.md or history.md)\n\n✅ **Onboarding section** (`prompt-service.ts` lines 70-82): Updated to describe creating both layers:\n- Bootstrap summary to `character.md` + full character sheet to `characters/<name>.md`\n- Index to `world.md` + at least one reference file in `locations/`\n\n### Phase 2: Updated Tests\n✅ **Updated test: \"instructions include file tool guidance\"** (line 132-150): Changed assertions to check for:\n- two-layer structure, Bootstrap files, Reference files\n- characters/, locations/, system file protection\n\n✅ **Updated test: \"onboarding mentions writing to files\"** (line 152-166): Changed assertions to check for:\n- bootstrap summary to `character.md`, full character sheet\n- characters/<name>.md, world.md, locations/\n\n✅ **New test: \"file tool instructions describe two-layer convention (REQ-AFS-12)\"** (line 307-352): Comprehensive snapshot test verifying:\n- Two-layer structure description\n- Bootstrap files section with all elements\n- Reference files section with pattern examples\n- Read-on-demand guidance\n- State change rules\n- New element rules\n- System file protection\n\n✅ **New test: \"prompt from mature adventure contains bootstrap content, not full reference data (REQ-AFS-1)\"** (line 354-399): Integration test with the-golden-age content verifying:\n- Bootstrap content is present (character name, pointers, world orientation)\n- Detailed reference content is NOT present\n- Index directory structure is present\n\n### Verification\n- All 21 prompt-service tests: **PASS**\n- Full backend test suite (268 tests): **PASS** (0 failures)\n- No changes to adventure-service.ts, AdventureState interface, or section order\n- All requirements from plan satisfied\n\n### Files Modified\n- `packages/backend/src/services/prompt-service.ts` (2 changes: File Tools + Onboarding)\n- `packages/backend/tests/prompt-service.test.ts` (4 tests: 2 updated, 2 new)"
  - timestamp: 2026-04-06T21:54:44.399Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Phase 1 and Phase 2 complete. File tool instructions and onboarding updated to describe two-layer structure. All 21 prompt-service tests pass. Full backend suite: 268 tests pass."
projectName: corvran
---
## Adventure File Structure Implementation - Complete

### Phase 1: Updated Prompt Instructions
✅ **File Tools section** (`prompt-service.ts` lines 97-115): Replaced flat-file instructions with two-layer structure description including:
- Bootstrap files explanation (character.md summary, world.md index)
- Reference files explanation (typed subdirectories, <type>/<name>.md pattern)
- Read-on-demand guidance
- When state changes (update reference file + index)
- When introducing new elements (write reference file + index entry)
- System file protection (don't modify adventure.md or history.md)

✅ **Onboarding section** (`prompt-service.ts` lines 70-82): Updated to describe creating both layers:
- Bootstrap summary to `character.md` + full character sheet to `characters/<name>.md`
- Index to `world.md` + at least one reference file in `locations/`

### Phase 2: Updated Tests
✅ **Updated test: "instructions include file tool guidance"** (line 132-150): Changed assertions to check for:
- two-layer structure, Bootstrap files, Reference files
- characters/, locations/, system file protection

✅ **Updated test: "onboarding mentions writing to files"** (line 152-166): Changed assertions to check for:
- bootstrap summary to `character.md`, full character sheet
- characters/<name>.md, world.md, locations/

✅ **New test: "file tool instructions describe two-layer convention (REQ-AFS-12)"** (line 307-352): Comprehensive snapshot test verifying:
- Two-layer structure description
- Bootstrap files section with all elements
- Reference files section with pattern examples
- Read-on-demand guidance
- State change rules
- New element rules
- System file protection

✅ **New test: "prompt from mature adventure contains bootstrap content, not full reference data (REQ-AFS-1)"** (line 354-399): Integration test with the-golden-age content verifying:
- Bootstrap content is present (character name, pointers, world orientation)
- Detailed reference content is NOT present
- Index directory structure is present

### Verification
- All 21 prompt-service tests: **PASS**
- Full backend test suite (268 tests): **PASS** (0 failures)
- No changes to adventure-service.ts, AdventureState interface, or section order
- All requirements from plan satisfied

### Files Modified
- `packages/backend/src/services/prompt-service.ts` (2 changes: File Tools + Onboarding)
- `packages/backend/tests/prompt-service.test.ts` (4 tests: 2 updated, 2 new)
