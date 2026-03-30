---
title: "Commission: Phase 2: Adventure Config and List Schema Expansion"
date: 2026-03-30
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 2 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n**FIRST**: Read Thorne's Phase 1 review. Check the commission result for commission-Thorne-20260330-121313. Address ALL findings before starting Phase 2 work.\n\n## Scope\n\nPhase 2: Adventure Config and List Schema Expansion. Adds `stat` to FileOps, expands config parser for `name` and `concept`, updates shared schemas, updates adventure service. Backend + shared, no web changes.\n\nRead the full plan for Phase 2 details (Steps 2.1-2.6). Key changes:\n\n1. **Add `stat` to FileOps** interface, production impl, and mock.\n2. **Expand adventure config parser** to extract `name` and `concept` from adventure.md.\n3. **Update shared schemas**: `AdventureListItemSchema` gains `concept`, `characterName`, `lastPlayed`. Add `SystemInfoSchema`, `SystemsResponseSchema`, `CreateAdventureRequestSchema`, `CreateAdventureResponseSchema`. Keep `hasCharacter`/`hasWorld` until Phase 4.\n4. **Update adventure service**: `listAdventures` and `getAdventure` populate new fields.\n5. **Write tests** for all new behavior.\n\n## Verification\n\nAll backend tests pass. `bun run build` typechecks clean (web still compiles because hasCharacter/hasWorld kept)."
dependencies:
  - commission-Thorne-20260330-121313
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T19:13:23.065Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:13:23.068Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
