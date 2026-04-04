---
title: "Keyword RPG System (Apocrypha) Spec Review"
date: 2026-04-04
status: closed
tags: [meeting]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
agenda: "Discussing artifact: .lore/specs/keyword-rpg-system.md"
deferred_until: ""
linked_artifacts: []
meeting_log:
  - timestamp: 2026-04-04T13:41:36.192Z
    event: opened
    reason: "User started audience"
  - timestamp: 2026-04-04T13:41:44.331Z
    event: renamed
    reason: "Renamed to: Keyword RPG System (Apocrypha) Spec Review"
  - timestamp: 2026-04-04T13:45:30.554Z
    event: closed
    reason: "User closed audience"
---
**Apocrypha Spec Review - Status and Naming Update**

Octavia presented the Apocrypha spec (keyword RPG system for LLM game masters) in draft status with all 9 open questions resolved and 2 deferred concerns acknowledged. The spec covers character creation through keywords, 2d12 hope/fear resolution, a token economy giving GMs mechanical permission to spend Fear, keyword-targeted stress as consequences, player-rolls-everything combat, tiered adversary design, and narrative milestone progression. The core loop (roll, generate tokens, spend tokens on stress/complications) is self-reinforcing. The hallucination resistance strategy (no canonical content to misquote) is grounded in prior research and scoped to existing plugin architecture.

The meeting focused on naming consistency. The user requested that "Apocrypha" become the primary title throughout instead of "the keyword system" hedge phrasing. Octavia updated the spec frontmatter and heading accordingly. The filename (`keyword-rpg-system.md`) remains unchanged to preserve cross-references in the lore directory.

No implementation decisions were made. Octavia flagged two concerns requiring attention: Fear pool display requires app-level state surface work (secondary to game design); deep stress over-compliance hardening should be monitored during playtesting and the bootstrap tightened if the LLM clears deep stress too easily. The next step is explicit: determining whether the spec proceeds to approval, critical review, or hole-poking.

**Artifacts:** Apocrypha spec at `.lore/specs/keyword-rpg-system.md` with updated frontmatter title and cleared redundancy in overview section.

**Follow-up:** Direction for spec disposition (approval, review, or revision focus).
