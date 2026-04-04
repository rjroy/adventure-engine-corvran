---
title: "Commission: Review apocrypha-system plugin"
date: 2026-04-04
status: dispatched
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the `plugins/apocrypha-system/` directory built by Dalton.\n\n## Review Against Two Specs\n\n1. **Plugin structure**: `.lore/specs/rpg-system-plugin-spec.md` — verify every REQ-PLG requirement is satisfied. Check directory layout, both manifests, bootstrap sections, skill format, naming conventions, reference files, License.md.\n2. **Game system substance**: `.lore/specs/keyword-rpg-system.md` — verify every REQ-KW requirement is represented in the plugin content. The bootstrap and skills together must cover the complete Apocrypha system. No requirement should be missing or misrepresented.\n\n## Review Focus\n\n- **Bootstrap completeness**: All six sections present? Under 3000 words? Dice examples use correct `mcp__corvran__roll_dice` JSON format with labeled groups? Fear tracking in adventure.md frontmatter mentioned? GM instructed to spend Fear actively?\n- **Keyword scoping**: Does the players skill teach proper keyword scoping with positive scope AND explicit exclusions (REQ-KW-5)?\n- **Combat model**: Player-rolls-everything (REQ-KW-30A/B/C)? No initiative? Adversary stress dealing on success (REQ-KW-27)?\n- **Stress system accuracy**: Light vs deep stress, -3 cap, crisis definition, death-is-player-choice (REQ-KW-25A), stress spread on maxed keywords (REQ-KW-26A)?\n- **Hope/Fear economy**: Correct token caps (6/12), correct spending options, criticals generate no tokens (REQ-KW-15)?\n- **Adversary tiers**: Minor/standard/major with correct stress thresholds and Fear ability scaling (REQ-KW-34-35)? Per-keyword vs aggregate tracking (REQ-KW-29A)?\n- **Skill cross-references**: Do skills reference each other appropriately? Does the combat skill point to ap-rules for authoritative wording?\n- **No content duplication**: Bootstrap provides foundation, skills provide depth. Nothing restated between them.\n- **Consistency with existing plugins**: Compare conventions against `plugins/daggerheart-system/` for SKILL.md description quality, reference file format, placeholder syntax.\n\nSurface all findings. Do not triage or defer."
dependencies:
  - commission-Dalton-20260404-073113
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-04T14:33:37.047Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T14:33:37.048Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-04T14:50:55.200Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-04T14:50:55.204Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
