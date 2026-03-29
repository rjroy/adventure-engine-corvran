---
title: "Commission: Fix Spec Review Findings: Gitignore and Naming"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix two findings from Thorne's spec compliance review.\n\n**Read first:**\n- `.lore/commissions/commission-Thorne-20260329-113941.md` (spec review with findings)\n\n**Fix 1 — F1 (Priority): Sample adventure not tracked by git.**\nThe `.gitignore` ignores `adventures/` then tries to negate with `!adventures/lost-mines/`, but git does not re-include children of an ignored parent directory. The sample adventure files exist on disk but aren't committed.\n\nFix the `.gitignore` pattern so `adventures/lost-mines/` is properly tracked. The correct pattern is:\n```\nadventures/\n!adventures/lost-mines/\n!adventures/lost-mines/**\n```\nOr alternatively, don't ignore the adventures directory at all and just ignore specific things within it that shouldn't be tracked.\n\nAfter fixing the gitignore, verify the sample adventure files (`adventures/lost-mines/character.md` and `adventures/lost-mines/world.md`) are tracked by running `git ls-files adventures/` or `git status`.\n\n**Fix 2 — F3: Rename `adventureExists()` to something accurate.**\nIn `packages/backend/src/services/adventure-service.ts`, the function `adventureExists()` validates ID format (no `/`, no `..`), not filesystem existence. Rename it to reflect what it actually does — something like `validateAdventureId()` or `isValidAdventureId()`. Update all call sites.\n\n**After fixes:**\n- `tsc --build` must be clean\n- `bun test` must pass\n- `git ls-files adventures/` must show the sample adventure files"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T18:54:28.169Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T18:54:28.171Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
