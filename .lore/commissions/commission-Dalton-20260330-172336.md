---
title: "Commission: Fix deferred adventure service findings (F2, F3, F5, path validation)"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix four deferred findings in the adventure service code. All are small, targeted fixes.\n\n## F2: Duplicated adventure config reading\n\n`packages/backend/src/services/adventure-service.ts` has nearly identical 10-line blocks in `listAdventures` (lines 79-89) and `getAdventure` (lines 133-143) that read adventure.md, parse it with `parseAdventureConfig`, extract fields, and log warnings. Extract a shared helper within the service (e.g. `readAdventureConfig(adventurePath: string)`) that returns the parsed config or null if the file doesn't exist. Both functions should call this helper.\n\n## F3: Stale docstring in prompt-service\n\n`packages/backend/src/services/prompt-service.ts` line 10 says \"Assembles the system prompt per REQ-MVP-12\" but the route that calls it (adventure-routes.ts:182) references both REQ-MVP-12 and REQ-SYS-22. Update the prompt-service docstring to reference both requirements.\n\n## F5: Single-quoted YAML values not stripped\n\n`packages/backend/src/services/adventure-config.ts` lines 40-41: the regex `/^system:\\s*\"?([^\"\\n]*)\"?\\s*$/m` handles double-quoted values but not single-quoted ones. `system: 'daggerheart'` would capture `'daggerheart'` with quotes intact, silently failing system alias resolution. Fix both the `system` and `name` field regexes to also strip single quotes. Add test cases for single-quoted values in the adventure-config tests.\n\n## Path validation in listAdventures\n\n`listAdventures()` iterates `readDir` entries without calling `isValidAdventureId()`, while `getAdventure()` validates. Add the validation call to `listAdventures` to skip invalid entries. This is defensive consistency, not a current bug.\n\n## Testing\n\nRun `bun test` after all changes. All existing tests must pass and new test cases for single-quoted YAML values must be added."
dependencies: []
linked_artifacts:
  - packages/backend/src/services/adventure-service.ts

  - packages/backend/src/services/adventure-config.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/tests/services/adventure-config.test.ts
  - packages/backend/src/services/adventure-config.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/tests/services/adventure-config.test.ts
activity_timeline:
  - timestamp: 2026-03-31T00:23:36.785Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:23:36.789Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-31T00:23:36.818Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T00:23:49.764Z
    event: progress_report
    reason: "Read all three target files. Starting implementation of all four fixes."
  - timestamp: 2026-03-31T00:25:23.826Z
    event: result_submitted
    reason: "All four findings fixed, tests pass (232/232), types clean.\n\n**F2 (duplicated config reading):** Extracted `readAdventureConfig(adventurePath, label)` helper in adventure-service.ts. Both `listAdventures` and `getAdventure` now call it instead of duplicating the 10-line read/parse/warn block.\n\n**F3 (stale docstring):** Updated prompt-service.ts docstring from \"per REQ-MVP-12\" to \"per REQ-MVP-12 and REQ-SYS-22\".\n\n**F5 (single-quoted YAML values):** Replaced the `\"?([^\"\\n]*)\"?` regex pattern with alternation-based matching `(?:\"([^\"\\n]*)\"|'([^'\\n]*)'|([^\\n]*))` for both `system` and `name` fields. This handles double-quoted, single-quoted, and unquoted values correctly, including values with apostrophes inside double quotes (e.g., `\"Dragon's Lair\"`). Added 2 new test cases for single-quoted system and name values.\n\n**Path validation in listAdventures:** Added `if (!isValidAdventureId(entry)) continue;` at the top of the loop, matching the validation `getAdventure` already performs."
  - timestamp: 2026-03-31T00:25:28.351Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read all three target files. Starting implementation of all four fixes."
projectName: corvran
---
All four findings fixed, tests pass (232/232), types clean.

**F2 (duplicated config reading):** Extracted `readAdventureConfig(adventurePath, label)` helper in adventure-service.ts. Both `listAdventures` and `getAdventure` now call it instead of duplicating the 10-line read/parse/warn block.

**F3 (stale docstring):** Updated prompt-service.ts docstring from "per REQ-MVP-12" to "per REQ-MVP-12 and REQ-SYS-22".

**F5 (single-quoted YAML values):** Replaced the `"?([^"\n]*)"?` regex pattern with alternation-based matching `(?:"([^"\n]*)"|'([^'\n]*)'|([^\n]*))` for both `system` and `name` fields. This handles double-quoted, single-quoted, and unquoted values correctly, including values with apostrophes inside double quotes (e.g., `"Dragon's Lair"`). Added 2 new test cases for single-quoted system and name values.

**Path validation in listAdventures:** Added `if (!isValidAdventureId(entry)) continue;` at the top of the loop, matching the validation `getAdventure` already performs.
