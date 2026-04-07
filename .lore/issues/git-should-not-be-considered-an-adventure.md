---
title: "`.git` Should not be considered an adventure"
date: 2026-04-05
status: resolved
---

## Resolution

Fixed in `packages/backend/src/services/adventure-service.ts` by adding a check to `isValidAdventureId()` to reject any directory or ID starting with `.`. This prevents hidden files and directories (`.git`, `.env`, `.github`, etc.) from being listed as adventures.

**Changes:**
- Added `if (id.startsWith(".")) return false;` as the first check in `isValidAdventureId()`
- Added 3 tests to `isValidAdventureId` suite: `.git`, `.env`, `.github` are all rejected
- Added test to `listAdventures` suite: verifies that hidden directories are excluded from the listing even when present on disk