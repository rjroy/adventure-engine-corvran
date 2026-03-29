---
title: "Commission: Fix Visual Brief Compliance Findings"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix two visual brief compliance findings from Thorne's review.\n\n**Read first:**\n- `.lore/commissions/commission-Thorne-20260329-113951.md` (visual brief review with findings)\n- `.lore/art/corvran-visual-brief.md` (the authoritative visual brief)\n\n**Fix 1 — F-TYPO-1:** `packages/web/app/globals.css` line 64 adds `\"Palatino Linotype\"` to the serif font stack. The brief specifies `Georgia, \"Times New Roman\", serif` only. Remove `\"Palatino Linotype\"` from the stack.\n\n**Fix 2 — F-COMP-1:** The `.errorCode` CSS class exists in `packages/web/app/adventure/[id]/page.module.css` (lines 312-318) but is never applied in the component (`packages/web/app/adventure/[id]/page.tsx` lines 139-143). The brief requires monospace treatment for file references in error text. Apply the `.errorCode` class to file references (like `history.md`) in error messages.\n\n**After fixes:**\n- `tsc --build` must be clean\n- `bun test` must pass\n- Visually inspect that the font stack and error styling match the brief"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T18:50:44.484Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T18:50:44.486Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
