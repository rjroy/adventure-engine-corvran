---
title: "Commission: Fix: .git should not be considered an adventure"
date: 2026-04-05
status: completed
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix the bug described in `.lore/issues/git-should-not-be-considered-an-adventure.md`: the adventures scanner picks up `.git` (and likely other dotfiles/directories) as adventure directories.\n\nFind where adventures are scanned/listed (likely in `packages/backend/`), and filter out hidden directories (those starting with `.`). This is a small, targeted fix.\n\nWrite tests to confirm `.git` and other dotfiles are excluded from adventure listings.\n\nWhen the fix is complete, update `.lore/issues/git-should-not-be-considered-an-adventure.md` to set `status: resolved` and add a brief note about what was changed."
dependencies: []
linked_artifacts:
  - .lore/issues/git-should-not-be-considered-an-adventure.md

resource_overrides:
  model: haiku

activity_timeline:
  - timestamp: 2026-04-05T15:38:33.150Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-05T15:38:33.151Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-05T15:38:33.178Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-05T15:38:46.169Z
    event: progress_report
    reason: "Starting bug fix: filtering hidden directories from adventure listings. Reading issue and locating adventure scanner code in backend."
  - timestamp: 2026-04-05T15:39:04.569Z
    event: progress_report
    reason: "Located adventure scanner in adventure-service.ts. Found that isValidAdventureId() doesn't filter hidden directories. Implementing fix and tests."
  - timestamp: 2026-04-05T15:39:36.110Z
    event: result_submitted
    reason: "Fixed bug where hidden directories (`.git`, `.env`, `.github`, etc.) were being picked up as adventures.\n\n**Implementation:**\n- Modified `isValidAdventureId()` in `packages/backend/src/services/adventure-service.ts` to reject any ID starting with `.` \n- Added 3 new tests to `isValidAdventureId` test suite verifying `.git`, `.env`, and `.github` are rejected\n- Added test to `listAdventures` test suite verifying hidden directories are excluded from listings\n\n**Verification:**\n- All 266 backend tests pass\n- TypeScript builds cleanly\n- Issue marked as resolved with summary of changes\n\nThe fix is minimal and focused: a single line that filters out hidden directories at the validation point, which prevents them from being included in adventure listings."
  - timestamp: 2026-04-05T15:39:38.776Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Located adventure scanner in adventure-service.ts. Found that isValidAdventureId() doesn't filter hidden directories. Implementing fix and tests."
projectName: corvran
---
Fixed bug where hidden directories (`.git`, `.env`, `.github`, etc.) were being picked up as adventures.

**Implementation:**
- Modified `isValidAdventureId()` in `packages/backend/src/services/adventure-service.ts` to reject any ID starting with `.` 
- Added 3 new tests to `isValidAdventureId` test suite verifying `.git`, `.env`, and `.github` are rejected
- Added test to `listAdventures` test suite verifying hidden directories are excluded from listings

**Verification:**
- All 266 backend tests pass
- TypeScript builds cleanly
- Issue marked as resolved with summary of changes

The fix is minimal and focused: a single line that filters out hidden directories at the validation point, which prevents them from being included in adventure listings.
