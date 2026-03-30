---
title: "Commission: Clean Up Comparative Framing in Daggerheart Skill Files"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Thorne's final review of the Adventure System Integration flagged three Daggerheart skill files with comparative framing that references other game systems. This violates the spirit of REQ-SYS-12 (bootstrap prompts must be self-contained, no comparative framing). While REQ-SYS-12 technically targets only bootstrap files, the same principle applies to skill files: each system should stand on its own terms.\n\n## Files and locations\n\n1. **`plugins/daggerheart-system/skills/dh-combat/SKILL.md`** (line 9): Contains \"Unlike d20-style initiative\" or similar comparative framing\n2. **`plugins/daggerheart-system/skills/dh-players/SKILL.md`** (line 172): Contains \"unlike D&D AC\" or similar\n3. **`plugins/daggerheart-system/skills/dh-rules/SKILL.md`** (line 211): Contains \"unlike d20's single large file\" or similar\n\n## What to do\n\nRead each file, find the comparative references, and rewrite them to describe Daggerheart mechanics on their own terms without mentioning other systems.\n\n**The pattern**: Replace \"Unlike X in [other system]\" with a positive description of how Daggerheart works. For example:\n- \"Unlike d20-style initiative, spotlight flows from action outcomes\" → \"Spotlight flows from action outcomes\"\n- \"Unlike D&D AC, Evasion works as...\" → \"Evasion is the target number for attacks...\"\n\nDo a broader grep across all Daggerheart skill files to catch any other comparative references Thorne might have missed:\n\n```bash\ngrep -rni 'd&d\\|d20\\|pathfinder\\|fate\\|dungeons' plugins/daggerheart-system/skills/\n```\n\nFix all instances found, not just the three flagged.\n\n## Verification\n\nAfter cleanup:\n```bash\ngrep -rni 'd&d\\|d20\\|pathfinder\\|fate\\|dungeons' plugins/daggerheart-system/skills/\n```\n\nExpected: zero matches.\n\nAlso check the d20 system skills for any reverse references:\n```bash\ngrep -rni 'daggerheart\\|duality\\|hope.*fear\\|spotlight' plugins/d20-system/skills/\n```\n\nFix any found there too. Each system should be self-contained."
dependencies: []
linked_artifacts:
  - plugins/daggerheart-system/skills/dh-combat/SKILL.md

  - plugins/daggerheart-system/skills/dh-players/SKILL.md
  - plugins/daggerheart-system/skills/dh-rules/SKILL.md
  - plugins/daggerheart-system/skills/dh-players/SKILL.md
  - plugins/daggerheart-system/skills/dh-rules/SKILL.md
activity_timeline:
  - timestamp: 2026-03-30T05:20:53.157Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T05:20:53.159Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T05:20:53.185Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T05:21:38.530Z
    event: result_submitted
    reason: "Removed all comparative framing from three Daggerheart skill files:\n\n1. **dh-combat/SKILL.md** (line 9): \"Unlike d20-style initiative\" → \"instead of fixed initiative\" (describes Daggerheart's spotlight flow on its own terms)\n2. **dh-players/SKILL.md** (line 172): Removed \"(unlike D&D AC)\" parenthetical from Evasion description\n3. **dh-rules/SKILL.md** (line 211): \"unlike d20's single large file\" → rewritten as \"one per adversary\" (self-contained description)\n\nBroader grep confirmed no other d20/D&D/Pathfinder references in Daggerheart skills. The \"dungeons\" match in experience-template.md is a location type, not a system reference. D20 system skills had zero reverse references to Daggerheart. Both systems are now self-contained."
  - timestamp: 2026-03-30T05:21:42.261Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: ""
projectName: corvran
---
Removed all comparative framing from three Daggerheart skill files:

1. **dh-combat/SKILL.md** (line 9): "Unlike d20-style initiative" → "instead of fixed initiative" (describes Daggerheart's spotlight flow on its own terms)
2. **dh-players/SKILL.md** (line 172): Removed "(unlike D&D AC)" parenthetical from Evasion description
3. **dh-rules/SKILL.md** (line 211): "unlike d20's single large file" → rewritten as "one per adversary" (self-contained description)

Broader grep confirmed no other d20/D&D/Pathfinder references in Daggerheart skills. The "dungeons" match in experience-template.md is a location type, not a system reference. D20 system skills had zero reverse references to Daggerheart. Both systems are now self-contained.
