---
title: "Commission: Phase 3: Creation and Systems Endpoints"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n**FIRST**: Read Thorne's Phase 2 review. Check the commission result for commission-Thorne-20260330-121329. Address ALL findings before starting Phase 3 work.\n\n## Scope\n\nPhase 3: Creation and Systems Endpoints. Adds `POST /adventures`, `GET /systems`, slugify utility. Backend-only.\n\nRead the full plan for Phase 3 details (Steps 3.1-3.7). Key changes:\n\n1. **Create slugify utility** (`packages/backend/src/services/slugify.ts`): Pure function, tested against spec examples.\n2. **Add `createAdventure` to adventure service**: Slugify name, check for duplicates (throw for 409), write adventure.md, return AdventureListItem.\n3. **Create system routes** (`packages/backend/src/routes/system-routes.ts`): `GET /systems` returns available systems from plugin registry.\n4. **Add creation endpoint** to adventure routes: `POST /adventures` with validation, system check, 201/400/409 responses.\n5. **Wire system routes in app.ts**.\n6. **Write tests**: slugify, creation endpoint, systems endpoint.\n\n## Verification\n\nAll backend tests pass. `bun run build` typechecks clean."
dependencies:
  - commission-Thorne-20260330-121329
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T19:13:40.540Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:13:40.541Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T19:25:37.467Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T19:25:37.470Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
