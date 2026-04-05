---
title: "Commission: Fix: .git should not be considered an adventure"
date: 2026-04-05
status: dispatched
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix the bug described in `.lore/issues/git-should-not-be-considered-an-adventure.md`: the adventures scanner picks up `.git` (and likely other dotfiles/directories) as adventure directories.\n\nFind where adventures are scanned/listed (likely in `packages/backend/`), and filter out hidden directories (those starting with `.`). This is a small, targeted fix.\n\nWrite tests to confirm `.git` and other dotfiles are excluded from adventure listings.\n\nWhen the fix is complete, update `.lore/issues/git-should-not-be-considered-an-adventure.md` to set `status: resolved` and add a brief note about what was changed."
dependencies: []
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
