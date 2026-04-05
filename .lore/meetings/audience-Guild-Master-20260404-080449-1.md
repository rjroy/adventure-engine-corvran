---
title: "Audience with Guild Master"
date: 2026-04-04
status: closed
tags: [meeting]
worker: Guild Master
workerDisplayTitle: "Guild Master"
agenda: "Next up"
deferred_until: ""
linked_artifacts: []
meeting_log:
  - timestamp: 2026-04-04T15:04:49.484Z
    event: opened
    reason: "User started audience"
  - timestamp: 2026-04-04T19:20:15.624Z
    event: closed
    reason: "User closed audience"
---
MEETING NOTES: Corvran RPG System and Compaction System Delivery
2026-04-04

SUMMARY

Work across 59 commissions delivered four major systems to the adventure-engine-corvran repository. The Compaction System provides automated narrative condensing of adventure histories when message counts exceed configured thresholds, with server-side threshold detection, SSE notifications, player endpoints, and GM compact tool integration. The Apocrypha RPG System is a complete keyword-based tabletop RPG framework with 2d12 dice resolution, Hope/Fear economies, stress mechanics, and adversary tiers. Two supporting specifications document the generalized RPG plugin architecture and detailed Apocrypha mechanical rules. Scene Boundaries research synthesizes TTRPG narrative structure patterns from external sources.

Pull request #258 consolidates all work with 91 files changed and 9,272 insertions. The compaction system required three phases of implementation (threshold triggers, client-side consumption, notification delivery) with phased review and fixes. The Apocrypha plugin required resolution of internal specification questions (title selection, dice choice, outcome merging) captured during implementation and addressed via five findings from external review.

All code changes pass typecheck, linting, and test suites. Pre-commit hooks verified against production build.

KEY DECISIONS

Apocrypha System Title: Selected over working title "Keyword RPG System" to provide project identity distinct from specification.

Dice Resolution: Changed from 2d6 to 2d12 to accommodate four-outcome framework (Success, Success with Cost, Failure with Hope, Failure) within natural probability bands.

Outcome Merging: Tied and double-roll criticals consolidated into single "critical on doubles, no token spend" rule rather than separate mechanics.

Review Approach: Apocrypha plugin underwent external review by Thorne (five findings recorded: one MEDIUM on encounter flow contradiction, four LOW on tier-difficulty mapping, bootstrap section structure, terminology, and rationale documentation).

ARTIFACTS PRODUCED

.lore/specs/compaction-system-spec.md — 41 requirements covering threshold detection, SSE emission, player endpoint, GM compact tool, and admin configuration.

.lore/specs/keyword-rpg-system.md — 55 requirements across mechanics (2d12, Hope/Fear, stress, adversaries, progression, character creation).

.lore/specs/rpg-system-plugin-spec.md — 34 requirements for generalized plugin structure, bootstrap conventions, skill packages, reference templates.

.lore/plans/compaction-system-plan.md and .lore/plans/compaction-notification-plan.md — phased implementation guides with DI wiring and test strategy.

.lore/research/scene-boundaries.md — narrative transition patterns in TTRPGs and interactive fiction.

plugins/apocrypha-system/ — complete plugin with bootstrap, four skill packages (ap-rules, ap-players, ap-combat, ap-adversaries), and reference templates.

packages/backend/src/services/compaction-service.ts, compact-tool.ts — CompactionService with threshold tracking and fire-on-threshold behavior.

Commission records across 59 artifacts documenting worker output, progress states, and review findings.

OPEN ITEMS

Five findings from Apocrypha plugin review (Thorne): F1 (MEDIUM) — ap-combat encounter flow step 3 parenthetical suggests GM rolls for traps, contradicting player-rolls-everything spec; requires rewording to clarify player reaction rolls. F2-F5 (LOW) — tier-difficulty mapping framing, bootstrap section structure, encounter template terminology ("Round" vs "Action"), and missing rationale for exclusions in keyword design.

One abandoned commission: Dalton's "Make commission view sidebar collapsible" (paused, not merged).

PR #258 awaits review before merge to master.
