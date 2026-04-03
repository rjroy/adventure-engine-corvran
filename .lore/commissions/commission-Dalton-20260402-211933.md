---
title: "Commission: Build: Compaction System Phase 3 — Player Endpoint and Web Button"
date: 2026-04-03
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 of the compaction system plan at `.lore/plans/compaction-system-plan.md`.\n\n**Before starting Phase 3 work, read Thorne's Phase 1 review findings. Address ALL findings before proceeding.** Check the most recent Thorne commission result for Phase 1 review findings. Fix every issue Thorne raised, regardless of severity.\n\nPhase 3 covers Steps 3.1 through 3.5:\n\n1. Add `CompactResponseSchema` and `CompactErrorSchema` to `packages/shared/src/schemas/adventures.ts`. Export from shared package index.\n2. Add `POST /adventures/:id/compact` endpoint to `adventure-routes.ts` with proper error codes (400/404/409/500).\n3. Add Compact button to `packages/web/app/adventure/[id]/page.tsx` with confirmation dialog, disable logic, and inline status.\n4. Add Next.js API proxy route at `packages/web/app/api/daemon/adventures/[id]/compact/route.ts` following the existing Node.js `http.request` with `socketPath` proxy pattern.\n5. Write endpoint tests at `packages/backend/tests/routes/compact-endpoint.test.ts` covering all five test cases in Step 3.5.\n\nReference:\n- Spec: `.lore/specs/compaction-system-spec.md` (REQ-COMP-15, REQ-COMP-28, REQ-COMP-31 through REQ-COMP-33)\n- Plan: `.lore/plans/compaction-system-plan.md` (Phase 3 section)\n- Existing proxy pattern: `packages/web/app/api/daemon/` routes\n- Existing play view: `packages/web/app/adventure/[id]/page.tsx`\n\nAll tests must pass before declaring complete. Run `bun test` from `packages/backend`."
dependencies:
  - commission-Thorne-20260402-211905
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T04:19:33.607Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:19:33.609Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
