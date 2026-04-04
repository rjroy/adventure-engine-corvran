---
title: "Commission: Fix: Apocrypha plugin review findings (F1-F5)"
date: 2026-04-04
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Read Thorne's review at `.lore/commissions/commission-Thorne-20260404-073337.md`. Address ALL five findings:\n\n**F1 (MEDIUM): ap-combat encounter flow contradicts player-rolls-everything**\nFile: `plugins/apocrypha-system/skills/ap-combat/SKILL.md`, line 113\nChange \"Player rolls (or GM rolls for environment/trap effects that the player reacts to)\" to \"Player rolls (if the trigger is a trap or environment effect, the player rolls their reaction to it).\"\n\n**F2 (LOW): Adversary tier-to-difficulty mapping is prescriptive**\nFile: `plugins/apocrypha-system/skills/ap-adversaries/SKILL.md`, lines 24-28 and 69-75\nReframe the Difficulty column as guidance: \"Typical difficulty range for this tier. Adjust based on the fiction and the specific action.\" Fix Step 5's rigid \"Choose based on the adversary's tier\" language similarly.\n\n**F3 (LOW): Bootstrap section structure**\nFile: `plugins/apocrypha-system/bootstrap.md`\nMove \"Player-Rolls-Everything Combat\" out of the Stress System section into its own `##` heading. The rest of the section split (Hope/Fear and Stress as separate headings) is defensible and can stay.\n\n**F4 (LOW): Encounter template \"Round\" terminology**\nFile: `plugins/apocrypha-system/skills/ap-combat/references/encounter-template.md`, lines 35-36\nChange \"Round 2\" and \"Round 3\" in the HTML comment examples to \"Action 2\" and \"Action 3\".\n\n**F5 (LOW): Missing rationale for keyword exclusions**\nFile: `plugins/apocrypha-system/skills/ap-players/SKILL.md`, scoping guidelines section\nAdd one sentence to the scoping principle: \"Exclusions prevent the keyword's applicability from gradually expanding beyond its intended scope.\"\n\nAll fixes are surgical text edits. No structural changes needed."
dependencies:
  - commission-Thorne-20260404-073337
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-04T15:06:09.604Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T15:06:09.606Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
