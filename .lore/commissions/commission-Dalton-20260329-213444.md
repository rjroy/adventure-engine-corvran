---
title: "Commission: Adventure System Integration: Phase 4 - Bootstrap Prompt Authoring"
date: 2026-03-30
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the Adventure System Integration plan at `.lore/plans/adventure-system-integration.md`. Read the plan and spec at `.lore/specs/adventure-system-integration.md` thoroughly before starting. Also read the brainstorm at `.lore/brainstorm/rpg-system-loading.md` for the draft bootstrap prompts (section 3).\n\n**IMPORTANT: Read Thorne's review at `.lore/reviews/adventure-system-integration-phase3.md` first. If Thorne couldn't write the file, check the commission artifact at `.lore/commissions/commission-Thorne-20260329-213425.md` for findings in the activity timeline. Address ALL findings before starting Phase 4 work.**\n\n## What to create\n\nPhase 4 is creative content. No code changes. Two bootstrap prompt markdown files.\n\n**Step 4.1**: Author `plugins/d20-system/bootstrap.md`\n- Read existing skill files in `plugins/d20-system/skills/` first to avoid contradicting them\n- Cover all six areas from REQ-SYS-11: system identity, core mechanics, dice convention (with mcp__corvran__roll_dice examples), narrative philosophy, key vocabulary, onboarding guidance\n- **REQ-SYS-12**: No comparative framing. Do not mention Daggerheart, FATE, Pathfinder, or any other system by name.\n- 400-800 words. Injected into every message prompt, so keep it focused.\n- Dice examples must use the exact `mcp__corvran__roll_dice` JSON schema (groups with n, d, optional label, optional modifier, optional threshold)\n\n**Step 4.2**: Author `plugins/daggerheart-system/bootstrap.md`\n- Read existing skill files in `plugins/daggerheart-system/skills/` first\n- Same six areas, Daggerheart-specific: Duality Dice (2d12 labeled hope/fear), Hope/Fear economy, Spotlight flow, Experiences, Domains, Stress/HP\n- Dice convention: labeled groups `{ \"groups\": [{ \"n\": 1, \"d\": 12, \"label\": \"hope\" }, { \"n\": 1, \"d\": 12, \"label\": \"fear\" }], \"modifier\": [trait] }`\n- **REQ-SYS-12**: No comparative framing. No references to D&D, d20, or any other system.\n- 400-800 words.\n\n**Step 4.3**: Verify files exist and full test suite still passes:\n```bash\ncat plugins/d20-system/bootstrap.md | head -5\ncat plugins/daggerheart-system/bootstrap.md | head -5\nbun test packages/backend/tests/\n```\n\n## Done when\n- Both bootstrap files exist with all six REQ-SYS-11 areas covered\n- No comparative framing (REQ-SYS-12)\n- Dice tool examples use correct JSON schema\n- All tests still pass"
dependencies:
  - commission-Thorne-20260329-213425
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T04:34:44.087Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:34:44.089Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
