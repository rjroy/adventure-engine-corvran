---
title: "Commission: Phase 4: Lobby and Creation Wizard"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n**FIRST**: Read Thorne's Phase 3 review. Check the commission result for commission-Thorne-20260330-121348. Address ALL findings before starting Phase 4 work.\n\n## Scope\n\nPhase 4: Lobby and Creation Wizard. Rebuilds the web client root page, removes auto-redirect, adds adventure cards with new fields, adds creation wizard modal, removes `hasCharacter`/`hasWorld` from schema. Web + shared.\n\nRead the full plan for Phase 4 details (Steps 4.1-4.5). Key changes:\n\n1. **Remove `hasCharacter`/`hasWorld`** from `AdventureListItemSchema` and adventure service.\n2. **Rebuild lobby page** (`packages/web/app/page.tsx`): Remove auto-redirect, sort adventures (new first then by lastPlayed desc), redesign adventure cards with name/system badge/concept snippet/character name/state/last played.\n3. **Build creation wizard**: Modal with system picker (fetches `GET /api/daemon/systems`), concept textarea, name input. Submit calls `POST /api/daemon/adventures`, navigates on success, shows errors inline.\n4. **Rebuild empty state**: \"No adventures yet. Start one.\" with New Adventure button.\n5. **CSS updates** for new layout.\n\nNote: If this exceeds ~800 lines, split lobby redesign from creation wizard into separate commits. But keep it one commission.\n\n## Verification\n\n`bun run build` succeeds (typecheck + Next.js build). Manual verification points listed in plan Step 4.5."
dependencies:
  - commission-Thorne-20260330-121348
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
