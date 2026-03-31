---
title: "Commission: Fix deferred adventure service findings (F2, F3, F5, path validation)"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix four deferred findings in the adventure service code. All are small, targeted fixes.\n\n## F2: Duplicated adventure config reading\n\n`packages/backend/src/services/adventure-service.ts` has nearly identical 10-line blocks in `listAdventures` (lines 79-89) and `getAdventure` (lines 133-143) that read adventure.md, parse it with `parseAdventureConfig`, extract fields, and log warnings. Extract a shared helper within the service (e.g. `readAdventureConfig(adventurePath: string)`) that returns the parsed config or null if the file doesn't exist. Both functions should call this helper.\n\n## F3: Stale docstring in prompt-service\n\n`packages/backend/src/services/prompt-service.ts` line 10 says \"Assembles the system prompt per REQ-MVP-12\" but the route that calls it (adventure-routes.ts:182) references both REQ-MVP-12 and REQ-SYS-22. Update the prompt-service docstring to reference both requirements.\n\n## F5: Single-quoted YAML values not stripped\n\n`packages/backend/src/services/adventure-config.ts` lines 40-41: the regex `/^system:\\s*\"?([^\"\\n]*)\"?\\s*$/m` handles double-quoted values but not single-quoted ones. `system: 'daggerheart'` would capture `'daggerheart'` with quotes intact, silently failing system alias resolution. Fix both the `system` and `name` field regexes to also strip single quotes. Add test cases for single-quoted values in the adventure-config tests.\n\n## Path validation in listAdventures\n\n`listAdventures()` iterates `readDir` entries without calling `isValidAdventureId()`, while `getAdventure()` validates. Add the validation call to `listAdventures` to skip invalid entries. This is defensive consistency, not a current bug.\n\n## Testing\n\nRun `bun test` after all changes. All existing tests must pass and new test cases for single-quoted YAML values must be added."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T00:23:36.785Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:23:36.789Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
