---
title: "Commission: Phase 4: Lobby and Creation Wizard"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n**FIRST**: Read Thorne's Phase 3 review. Check the commission result for commission-Thorne-20260330-121348. Address ALL findings before starting Phase 4 work.\n\n## Scope\n\nPhase 4: Lobby and Creation Wizard. Rebuilds the web client root page, removes auto-redirect, adds adventure cards with new fields, adds creation wizard modal, removes `hasCharacter`/`hasWorld` from schema. Web + shared.\n\nRead the full plan for Phase 4 details (Steps 4.1-4.5). Key changes:\n\n1. **Remove `hasCharacter`/`hasWorld`** from `AdventureListItemSchema` and adventure service.\n2. **Rebuild lobby page** (`packages/web/app/page.tsx`): Remove auto-redirect, sort adventures (new first then by lastPlayed desc), redesign adventure cards with name/system badge/concept snippet/character name/state/last played.\n3. **Build creation wizard**: Modal with system picker (fetches `GET /api/daemon/systems`), concept textarea, name input. Submit calls `POST /api/daemon/adventures`, navigates on success, shows errors inline.\n4. **Rebuild empty state**: \"No adventures yet. Start one.\" with New Adventure button.\n5. **CSS updates** for new layout.\n\nNote: If this exceeds ~800 lines, split lobby redesign from creation wizard into separate commits. But keep it one commission.\n\n## Verification\n\n`bun run build` succeeds (typecheck + Next.js build). Manual verification points listed in plan Step 4.5."
dependencies:
  - commission-Thorne-20260330-121348
linked_artifacts:
  - packages/shared/src/schemas/adventures.ts

  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/tests/adventure-creation.test.ts
  - packages/backend/tests/system-routes.test.ts
  - packages/backend/tests/adventure-service.test.ts
  - packages/backend/tests/routes.test.ts
  - packages/shared/tests/schemas.test.ts
  - packages/web/app/page.tsx
  - packages/web/app/page.module.css
  - packages/web/tests/mock-api.test.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/tests/adventure-creation.test.ts
  - packages/backend/tests/system-routes.test.ts
  - packages/backend/tests/adventure-service.test.ts
  - packages/backend/tests/routes.test.ts
  - packages/shared/tests/schemas.test.ts
  - packages/web/app/page.tsx
  - packages/web/app/page.module.css
  - packages/web/tests/mock-api.test.ts
activity_timeline:
  - timestamp: 2026-03-30T19:14:04.380Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:14:04.382Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T19:32:32.033Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T19:32:32.036Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T19:32:32.062Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T19:32:44.654Z
    event: progress_report
    reason: "Reading Thorne's Phase 3 review. Found 2 MEDIUM and 3 LOW findings. Will address all before starting Phase 4."
  - timestamp: 2026-03-30T19:33:36.356Z
    event: progress_report
    reason: "Starting work. First fixing Thorne's 5 findings (F1-F5), then implementing Phase 4 (schema cleanup, lobby rebuild, creation wizard)."
  - timestamp: 2026-03-30T19:36:19.279Z
    event: progress_report
    reason: "Thorne's findings F1-F5 all addressed. Schema cleanup done (hasCharacter/hasWorld removed). All tests pass. Now building the lobby page and creation wizard."
  - timestamp: 2026-03-30T19:38:30.082Z
    event: result_submitted
    reason: "## Phase 4 Complete: Lobby and Creation Wizard\n\n### Thorne Phase 3 Findings Addressed (all 5)\n\n- **F1 (MEDIUM)**: System validation now fails closed. Returns 503 when `pluginRegistry` absent and `system` is non-null.\n- **F2 (MEDIUM)**: Error messages aligned to spec. System not found: `System '<value>' is not installed. Available systems: <list>.` Duplicate: `An adventure with this name already exists.`\n- **F3 (LOW)**: Removed quotes from `name` value in adventure.md output. Now matches spec examples.\n- **F4 (LOW)**: Added 3 tests verifying written adventure.md content (system+concept, freeform+concept, freeform without concept).\n- **F5 (LOW)**: Renamed misleading test to \"returns systems from registry regardless of core plugins\".\n\n### Phase 4 Implementation\n\n**Step 4.1: Schema cleanup**\n- Removed `hasCharacter` and `hasWorld` from `AdventureListItemSchema` in shared package\n- Removed from `adventure-service.ts` `listAdventures()` and `createAdventure()` return values\n- Updated all tests across shared, backend, and web packages (17 files affected)\n\n**Step 4.2: Lobby page rebuild**\n- Removed auto-redirect (was lines 23-26)\n- Client-side sort: new adventures first (lastPlayed null, alphabetical), then by lastPlayed descending\n- Redesigned `AdventureCard`: name, system badge, concept snippet (100 char), character name, state badge, relative timestamp\n- Added `relativeTime` helper (just now / Xm ago / Xh ago / Xd ago)\n- \"New Adventure\" button in page heading and header\n\n**Step 4.3: Creation wizard**\n- Modal with backdrop dismiss\n- System picker: fetches `GET /api/daemon/systems`, renders selectable options with alias + description, \"Freeform\" preselected\n- Concept textarea with 1000 char limit and live counter\n- Name input defaulting to \"Untitled Adventure\"\n- Submit calls `POST /api/daemon/adventures`, navigates on 201, shows inline errors on 409/other\n- Disabled state during submission\n\n**Step 4.4: CSS updates**\n- Wizard modal, overlay, system picker, form fields, error display\n- Updated header layout (left group + new button)\n- System badge styling on adventure cards\n- Concept snippet and character name meta line\n\n### Verification\n\n- `bun run build` passes (typecheck + Next.js production build)\n- 214 tests pass across 17 files, 0 failures"
  - timestamp: 2026-03-30T19:38:33.717Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Thorne's findings F1-F5 all addressed. Schema cleanup done (hasCharacter/hasWorld removed). All tests pass. Now building the lobby page and creation wizard."
projectName: corvran
---
## Phase 4 Complete: Lobby and Creation Wizard

### Thorne Phase 3 Findings Addressed (all 5)

- **F1 (MEDIUM)**: System validation now fails closed. Returns 503 when `pluginRegistry` absent and `system` is non-null.
- **F2 (MEDIUM)**: Error messages aligned to spec. System not found: `System '<value>' is not installed. Available systems: <list>.` Duplicate: `An adventure with this name already exists.`
- **F3 (LOW)**: Removed quotes from `name` value in adventure.md output. Now matches spec examples.
- **F4 (LOW)**: Added 3 tests verifying written adventure.md content (system+concept, freeform+concept, freeform without concept).
- **F5 (LOW)**: Renamed misleading test to "returns systems from registry regardless of core plugins".

### Phase 4 Implementation

**Step 4.1: Schema cleanup**
- Removed `hasCharacter` and `hasWorld` from `AdventureListItemSchema` in shared package
- Removed from `adventure-service.ts` `listAdventures()` and `createAdventure()` return values
- Updated all tests across shared, backend, and web packages (17 files affected)

**Step 4.2: Lobby page rebuild**
- Removed auto-redirect (was lines 23-26)
- Client-side sort: new adventures first (lastPlayed null, alphabetical), then by lastPlayed descending
- Redesigned `AdventureCard`: name, system badge, concept snippet (100 char), character name, state badge, relative timestamp
- Added `relativeTime` helper (just now / Xm ago / Xh ago / Xd ago)
- "New Adventure" button in page heading and header

**Step 4.3: Creation wizard**
- Modal with backdrop dismiss
- System picker: fetches `GET /api/daemon/systems`, renders selectable options with alias + description, "Freeform" preselected
- Concept textarea with 1000 char limit and live counter
- Name input defaulting to "Untitled Adventure"
- Submit calls `POST /api/daemon/adventures`, navigates on 201, shows inline errors on 409/other
- Disabled state during submission

**Step 4.4: CSS updates**
- Wizard modal, overlay, system picker, form fields, error display
- Updated header layout (left group + new button)
- System badge styling on adventure cards
- Concept snippet and character name meta line

### Verification

- `bun run build` passes (typecheck + Next.js production build)
- 214 tests pass across 17 files, 0 failures
