---
title: "Commission: Adventure System Integration: Phase 4 - Bootstrap Prompt Authoring"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 of the Adventure System Integration plan at `.lore/plans/adventure-system-integration.md`. Read the plan and spec at `.lore/specs/adventure-system-integration.md` thoroughly before starting. Also read the brainstorm at `.lore/brainstorm/rpg-system-loading.md` for the draft bootstrap prompts (section 3).\n\n**IMPORTANT: Read Thorne's review at `.lore/reviews/adventure-system-integration-phase3.md` first. If Thorne couldn't write the file, check the commission artifact at `.lore/commissions/commission-Thorne-20260329-213425.md` for findings in the activity timeline. Address ALL findings before starting Phase 4 work.**\n\n## What to create\n\nPhase 4 is creative content. No code changes. Two bootstrap prompt markdown files.\n\n**Step 4.1**: Author `plugins/d20-system/bootstrap.md`\n- Read existing skill files in `plugins/d20-system/skills/` first to avoid contradicting them\n- Cover all six areas from REQ-SYS-11: system identity, core mechanics, dice convention (with mcp__corvran__roll_dice examples), narrative philosophy, key vocabulary, onboarding guidance\n- **REQ-SYS-12**: No comparative framing. Do not mention Daggerheart, FATE, Pathfinder, or any other system by name.\n- 400-800 words. Injected into every message prompt, so keep it focused.\n- Dice examples must use the exact `mcp__corvran__roll_dice` JSON schema (groups with n, d, optional label, optional modifier, optional threshold)\n\n**Step 4.2**: Author `plugins/daggerheart-system/bootstrap.md`\n- Read existing skill files in `plugins/daggerheart-system/skills/` first\n- Same six areas, Daggerheart-specific: Duality Dice (2d12 labeled hope/fear), Hope/Fear economy, Spotlight flow, Experiences, Domains, Stress/HP\n- Dice convention: labeled groups `{ \"groups\": [{ \"n\": 1, \"d\": 12, \"label\": \"hope\" }, { \"n\": 1, \"d\": 12, \"label\": \"fear\" }], \"modifier\": [trait] }`\n- **REQ-SYS-12**: No comparative framing. No references to D&D, d20, or any other system.\n- 400-800 words.\n\n**Step 4.3**: Verify files exist and full test suite still passes:\n```bash\ncat plugins/d20-system/bootstrap.md | head -5\ncat plugins/daggerheart-system/bootstrap.md | head -5\nbun test packages/backend/tests/\n```\n\n## Done when\n- Both bootstrap files exist with all six REQ-SYS-11 areas covered\n- No comparative framing (REQ-SYS-12)\n- Dice tool examples use correct JSON schema\n- All tests still pass"
dependencies:
  - commission-Thorne-20260329-213425
linked_artifacts:
  - plugins/d20-system/bootstrap.md

  - plugins/daggerheart-system/bootstrap.md
  - plugins/daggerheart-system/bootstrap.md
activity_timeline:
  - timestamp: 2026-03-30T04:34:44.087Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:34:44.089Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T05:00:49.613Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T05:00:49.616Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T05:00:49.643Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T05:02:31.844Z
    event: progress_report
    reason: "Starting Phase 4. Thorne's review file was lost with the worktree cleanup, but commission shows review completed. Reading existing skill files for both systems before authoring bootstrap prompts."
  - timestamp: 2026-03-30T05:03:08.154Z
    event: progress_report
    reason: "All skill files reviewed for both systems. Writing d20-system/bootstrap.md and daggerheart-system/bootstrap.md now."
  - timestamp: 2026-03-30T05:05:26.538Z
    event: progress_report
    reason: "Both bootstrap files written and verified. d20: 702 words, Daggerheart: 788 words. All six REQ-SYS-11 areas covered. No comparative framing (REQ-SYS-12). Dice examples use correct mcp__corvran__roll_dice schema. 112 tests pass, 0 fail."
  - timestamp: 2026-03-30T05:05:41.974Z
    event: result_submitted
    reason: "Phase 4 complete. Two bootstrap prompt files authored.\n\n**plugins/d20-system/bootstrap.md** (702 words):\n- System identity: \"d20 System game using SRD 5.2 rules\"\n- Core mechanic: d20 + modifier vs target, advantage/disadvantage, six ability scores, proficiency\n- Dice convention: 5 examples using mcp__corvran__roll_dice (ability check, attack, damage, ability scores, advantage)\n- Narrative philosophy: heroic fantasy, vivid description, let dice determine outcomes\n- Key vocabulary: AC, HP, spell slots, proficiency, saving throw, conditions, initiative, etc.\n- Onboarding: 7-step character creation, world setup with hooks\n\n**plugins/daggerheart-system/bootstrap.md** (788 words):\n- System identity: \"Daggerheart game by Darrington Press\"\n- Core mechanic: Duality Dice (2d12 hope/fear), five outcomes with token/spotlight effects, six traits, Experiences\n- Dice convention: 3 examples with labeled hope/fear groups, advantage variant, damage\n- Narrative philosophy: collaborative storytelling, spotlight flow, spend tokens actively\n- Key vocabulary: 12 Daggerheart-specific terms (Duality Dice, Hope/Fear, Spotlight, Domains, Evasion, Stress, etc.)\n- Onboarding: 8-step character creation, world setup targeting first Duality Dice roll\n\n**Compliance**: Zero comparative framing in either file (REQ-SYS-12). No other system referenced by name. Dice examples use exact mcp__corvran__roll_dice JSON schema with groups, modifier, threshold, and labels.\n\n**Tests**: 112 pass, 0 fail across 8 test files.\n\n**Note**: Thorne's Phase 3 review file was lost when the worktree was cleaned up. The commission artifact confirms the review completed successfully. No specific findings were surfaced in the timeline."
  - timestamp: 2026-03-30T05:05:45.360Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Both bootstrap files written and verified. d20: 702 words, Daggerheart: 788 words. All six REQ-SYS-11 areas covered. No comparative framing (REQ-SYS-12). Dice examples use correct mcp__corvran__roll_dice schema. 112 tests pass, 0 fail."
projectName: corvran
---
Phase 4 complete. Two bootstrap prompt files authored.

**plugins/d20-system/bootstrap.md** (702 words):
- System identity: "d20 System game using SRD 5.2 rules"
- Core mechanic: d20 + modifier vs target, advantage/disadvantage, six ability scores, proficiency
- Dice convention: 5 examples using mcp__corvran__roll_dice (ability check, attack, damage, ability scores, advantage)
- Narrative philosophy: heroic fantasy, vivid description, let dice determine outcomes
- Key vocabulary: AC, HP, spell slots, proficiency, saving throw, conditions, initiative, etc.
- Onboarding: 7-step character creation, world setup with hooks

**plugins/daggerheart-system/bootstrap.md** (788 words):
- System identity: "Daggerheart game by Darrington Press"
- Core mechanic: Duality Dice (2d12 hope/fear), five outcomes with token/spotlight effects, six traits, Experiences
- Dice convention: 3 examples with labeled hope/fear groups, advantage variant, damage
- Narrative philosophy: collaborative storytelling, spotlight flow, spend tokens actively
- Key vocabulary: 12 Daggerheart-specific terms (Duality Dice, Hope/Fear, Spotlight, Domains, Evasion, Stress, etc.)
- Onboarding: 8-step character creation, world setup targeting first Duality Dice roll

**Compliance**: Zero comparative framing in either file (REQ-SYS-12). No other system referenced by name. Dice examples use exact mcp__corvran__roll_dice JSON schema with groups, modifier, threshold, and labels.

**Tests**: 112 pass, 0 fail across 8 test files.

**Note**: Thorne's Phase 3 review file was lost when the worktree was cleaned up. The commission artifact confirms the review completed successfully. No specific findings were surfaced in the timeline.
