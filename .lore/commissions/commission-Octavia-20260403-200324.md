---
title: "Commission: Process USER NOTEs and OPEN questions in keyword RPG system spec"
date: 2026-04-04
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Read `.lore/specs/keyword-rpg-system.md` thoroughly. The spec contains inline USER NOTEs and OPEN questions scattered throughout.\n\nYour task: process every USER NOTE and OPEN question in the document. For each one:\n\n1. **Understand the context** — read the surrounding spec text to understand what the note/question is about and what constraints already exist.\n2. **Research if needed** — check `.lore/research/llm-optimized-rpg-systems.md` and any other relevant lore artifacts for prior art or decisions that inform the answer.\n3. **Resolve what you can** — where the note or question has a clear answer based on the spec's own design principles, the research, or RPG design best practices, write the resolution directly into the spec (removing the USER NOTE / OPEN marker).\n4. **Sharpen what you can't** — where the question genuinely requires the user's creative judgment (aesthetic preference, tone, scope decisions), rewrite the note to be more specific and actionable. Replace vague \"what should we do about X?\" with concrete options and tradeoffs.\n5. **Track your work** — at the end of the spec (or in a summary section), list what you resolved and what remains open with your recommended options.\n\nDo NOT strip the user's voice or design intent from the spec. You're clarifying and resolving, not rewriting the design. The spec's existing decisions (keyword characters, 2d6 hope/fear, token economy, act-based progression) are settled unless a USER NOTE explicitly reopens them."
dependencies: []
linked_artifacts:
  - .lore/specs/keyword-rpg-system.md

activity_timeline:
  - timestamp: 2026-04-04T03:03:24.494Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T03:03:24.495Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T03:03:34.081Z
    event: status_failed
    reason: "Session error: Claude Code returned an error result: You've hit your limit · resets 10pm (America/Los_Angeles)"
  - timestamp: 2026-04-04T13:16:36.335Z
    event: status_pending
    reason: "Redispatched for retry"
    from: "failed"
    to: "pending"
  - timestamp: 2026-04-04T13:16:36.337Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T13:16:36.367Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-04T13:16:49.958Z
    event: progress_report
    reason: "Read the full spec (403 lines). Identified 9 USER NOTEs and 9 OPEN questions. Now reading research docs to inform resolutions."
  - timestamp: 2026-04-04T13:18:19.989Z
    event: progress_report
    reason: "Cataloged 13 USER NOTEs and 9 OPEN questions. Cross-referenced with research docs. Most items have clear user direction. Planning resolutions now: title → Apocrypha, 2d6 → 2d12, tie/double merge, progression gut, defeat resolved, stress cap resolved, combat model resolved. Beginning edits."
  - timestamp: 2026-04-04T13:23:15.052Z
    event: result_submitted
    reason: "Processed all 13 USER NOTEs and 9 OPEN questions in `.lore/specs/keyword-rpg-system.md`. Every inline marker has been resolved or converted to a proper requirement.\n\n**Resolved (user gave clear direction):**\n1. **Title**: \"Apocrypha\" applied as working title\n2. **Dice**: 2d6 → 2d12 throughout (matches Daggerheart's reasoning: ~8.3% critical rate vs ~16.7%)\n3. **Difficulty scale**: Recalculated for 2d12: Routine 10, Moderate 14, Hard 17, Desperate 20\n4. **Tie/double merge**: REQ-KW-15 and REQ-KW-16 merged. Ties ARE doubles on 2d12. No tokens on criticals, either direction. Critical success is its own reward.\n5. **Narrative token spending**: Woven into REQ-KW-20. Token spending must be narrated in fiction, never bare mechanics.\n6. **Fear location**: Resolved to `adventure.md` frontmatter (REQ-KW-21A)\n7. **Player defeat**: Option 2 confirmed. Death is always player choice. Added reasoning: keeps GM willing to spend Fear. (REQ-KW-25A)\n8. **Stress cap**: -3 floor confirmed. GM spreads stress with narrative justification. (REQ-KW-26A)\n9. **Adversary stress**: Per-keyword for standard/major, aggregate for minor. (REQ-KW-29A)\n10. **Combat procedure**: Player-rolls-everything confirmed. Added surprise reactions (player still rolls) and failure-as-Fear-spending-opportunity. (REQ-KW-30A/B/C)\n11. **Progression**: Gutted the formula. Level up on narrative milestones, three-act structure as lens not formula. Off-by-one question eliminated. (REQ-KW-37, REQ-KW-38)\n12. **Deep stress resolution**: Converted to bootstrap instruction guidance (REQ-KW-48A)\n13. **Fear tracking UX**: Deferred as secondary concern\n\n**Structural changes:**\n- Open Questions Index replaced with Resolved Questions table (all 9 resolved with cross-references)\n- New Deferred Concerns section for non-blocking items\n- Character sheet progression log simplified (milestone-based, no arc/act columns)\n- Success criteria updated for 2d12\n- REQ-KW-16 marked as removed (merged into REQ-KW-15)\n\n**Nothing remains open.** Two items are deferred (Fear display UX, deep stress hardening) but neither blocks spec approval."
  - timestamp: 2026-04-04T13:23:18.942Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Cataloged 13 USER NOTEs and 9 OPEN questions. Cross-referenced with research docs. Most items have clear user direction. Planning resolutions now: title → Apocrypha, 2d6 → 2d12, tie/double merge, progression gut, defeat resolved, stress cap resolved, combat model resolved. Beginning edits."
projectName: corvran
---
Processed all 13 USER NOTEs and 9 OPEN questions in `.lore/specs/keyword-rpg-system.md`. Every inline marker has been resolved or converted to a proper requirement.

**Resolved (user gave clear direction):**
1. **Title**: "Apocrypha" applied as working title
2. **Dice**: 2d6 → 2d12 throughout (matches Daggerheart's reasoning: ~8.3% critical rate vs ~16.7%)
3. **Difficulty scale**: Recalculated for 2d12: Routine 10, Moderate 14, Hard 17, Desperate 20
4. **Tie/double merge**: REQ-KW-15 and REQ-KW-16 merged. Ties ARE doubles on 2d12. No tokens on criticals, either direction. Critical success is its own reward.
5. **Narrative token spending**: Woven into REQ-KW-20. Token spending must be narrated in fiction, never bare mechanics.
6. **Fear location**: Resolved to `adventure.md` frontmatter (REQ-KW-21A)
7. **Player defeat**: Option 2 confirmed. Death is always player choice. Added reasoning: keeps GM willing to spend Fear. (REQ-KW-25A)
8. **Stress cap**: -3 floor confirmed. GM spreads stress with narrative justification. (REQ-KW-26A)
9. **Adversary stress**: Per-keyword for standard/major, aggregate for minor. (REQ-KW-29A)
10. **Combat procedure**: Player-rolls-everything confirmed. Added surprise reactions (player still rolls) and failure-as-Fear-spending-opportunity. (REQ-KW-30A/B/C)
11. **Progression**: Gutted the formula. Level up on narrative milestones, three-act structure as lens not formula. Off-by-one question eliminated. (REQ-KW-37, REQ-KW-38)
12. **Deep stress resolution**: Converted to bootstrap instruction guidance (REQ-KW-48A)
13. **Fear tracking UX**: Deferred as secondary concern

**Structural changes:**
- Open Questions Index replaced with Resolved Questions table (all 9 resolved with cross-references)
- New Deferred Concerns section for non-blocking items
- Character sheet progression log simplified (milestone-based, no arc/act columns)
- Success criteria updated for 2d12
- REQ-KW-16 marked as removed (merged into REQ-KW-15)

**Nothing remains open.** Two items are deferred (Fear display UX, deep stress hardening) but neither blocks spec approval.
