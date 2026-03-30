---
title: "Commission: Engine Dice Tool: Phase 3 - Remove Old Dice-Roller and Update References"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 of the Engine Dice Tool plan at `.lore/plans/engine-dice-tool.md`. Read the plan thoroughly before starting. This phase touches only plugin markdown files; no TypeScript changes.\n\n## What to do\n\n**Step 3.1**: Delete the entire `plugins/corvran/skills/dice-roller/` directory (3 files: SKILL.md, scripts/roll.sh, scripts/roll.test.sh). Verify `plugins/corvran/skills/` still contains only `gm-craft/`.\n\n**Step 3.2**: Update d20-system skill files (4 files, 14 replacements + fallback section removals). The plan has exact file paths, line numbers, and replacement JSON for each. Key pattern:\n\nBefore:\n```bash\nbash \"${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh\" \"1d20+5\"\n```\n\nAfter:\n```\nUse the mcp__corvran__roll_dice tool:\n{ \"groups\": [{ \"n\": 1, \"d\": 20 }], \"modifier\": 5 }\n```\n\nFiles: `d20-combat/SKILL.md`, `d20-players/SKILL.md`, `d20-monsters/SKILL.md`, `d20-monsters/references/npc-example.md`. Remove all \"Dice Roller Fallback\" / \"Fallback Without Dice Roller\" sections.\n\n**Step 3.3**: Update daggerheart-system skill files (4 files, 7 replacements + fallback section removals). Daggerheart `DdD` notation becomes labeled groups per REQ-DICE-16:\n\n```\n{ \"groups\": [{ \"n\": 1, \"d\": 12, \"label\": \"hope\" }, { \"n\": 1, \"d\": 12, \"label\": \"fear\" }], \"modifier\": 3 }\n```\n\nFiles: `dh-combat/SKILL.md`, `dh-players/SKILL.md`, `dh-domains/SKILL.md`, `dh-adversaries/references/stat-block-example.md`. Remove all fallback sections. In `dh-combat/SKILL.md`, add advantage/disadvantage pattern notes per the plan (advantage: add labeled d6 group; disadvantage: separate call, subtract narratively).\n\n**Step 3.4**: Verify no references remain:\n```bash\ngrep -r 'corvran/skills/dice-roller' plugins/\n```\nExpected: zero matches.\n\n**Step 3.5**: Build verification:\n```bash\ncd packages/backend && bunx tsc --noEmit\nbun test packages/backend/tests/\n```\n\n## Done when\n- `plugins/corvran/skills/dice-roller/` is gone\n- All 21 bash invocations replaced with mcp__corvran__roll_dice examples\n- All fallback sections removed\n- Grep returns zero matches for old references\n- Build and tests pass"
dependencies:
  - commission-Thorne-20260329-180031
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T01:00:48.761Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T01:00:48.763Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T01:27:57.293Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T01:27:57.296Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
