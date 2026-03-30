---
title: "Commission: Fix Engine Dice Tool: Phase 3 Review Findings"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Thorne's final review of the Engine Dice Tool found two defects. Fix both.\n\n## Defect 1: d20-magic/SKILL.md missed entirely\n\n`plugins/d20-system/skills/d20-magic/SKILL.md` was not in the original plan and was never touched. It has 4 broken bash references to the old dice roller:\n\n- Line 40: `bash \"${CLAUDE_PLUGIN_ROOT}/skills/dice-roller/scripts/roll.sh\" \"1d20+7\"`\n- Line 117: `bash \"${CLAUDE_PLUGIN_ROOT}/skills/dice-roller/scripts/roll.sh\" \"1d20+2\"`\n- Line 137: `bash \"${CLAUDE_PLUGIN_ROOT}/skills/dice-roller/scripts/roll.sh\" \"1d20+7\"`\n- Line 139: `bash \"${CLAUDE_PLUGIN_ROOT}/skills/dice-roller/scripts/roll.sh\" \"3d8\"`\n\nReplace each with the equivalent mcp__corvran__roll_dice tool call:\n- `\"1d20+7\"` → `{ \"groups\": [{ \"n\": 1, \"d\": 20 }], \"modifier\": 7 }`\n- `\"1d20+2\"` → `{ \"groups\": [{ \"n\": 1, \"d\": 20 }], \"modifier\": 2 }`\n- `\"3d8\"` → `{ \"groups\": [{ \"n\": 3, \"d\": 8 }] }`\n\nAlso update the surrounding prose from \"use the dice-roller skill\" to \"Use the mcp__corvran__roll_dice tool\".\n\nIf there is a \"Dice Roller Fallback\" or similar section in this file, remove it.\n\n## Defect 2: Stale \"dice-roller skill\" prose in 6 files\n\nThe following files still reference \"dice-roller skill\" or \"corvran dice-roller skill\" in their prose, even though the bash invocations were replaced. Update these references to say \"mcp__corvran__roll_dice tool\" instead:\n\n1. `plugins/daggerheart-system/skills/dh-players/SKILL.md` (line 356: \"Use the dice-roller skill for any randomization\")\n2. `plugins/daggerheart-system/skills/dh-adversaries/references/stat-block-example.md` (line 187: \"Use the corvran dice-roller skill for attack resolution\")\n3. `plugins/d20-system/skills/d20-players/SKILL.md` (line 197: \"Use the dice-roller skill for all randomization\")\n4. `plugins/d20-system/skills/d20-monsters/SKILL.md` (line 147: \"Use the corvran dice-roller skill for randomized values\")\n5. `plugins/d20-system/skills/d20-monsters/references/npc-example.md` (line 130: \"Use the corvran dice-roller skill for randomized rolls\")\n6. `plugins/d20-system/skills/d20-magic/SKILL.md` (line 37: \"use the dice-roller skill\") — this one is part of Defect 1 but listed here for completeness\n\n## Verification\n\nAfter all fixes, run:\n```bash\ngrep -r 'dice-roller' plugins/\n```\n\nExpected: **zero matches**. No references to \"dice-roller\" (skill, script, or otherwise) should remain anywhere in the plugins directory.\n\nAlso run:\n```bash\ngrep -r 'CLAUDE_PLUGIN_ROOT.*roll\\.sh' plugins/\n```\n\nExpected: zero matches.\n\nBuild and test verification:\n```bash\ncd packages/backend && bunx tsc --noEmit\nbun test packages/backend/tests/\n```"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T01:42:07.283Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T01:42:07.285Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
