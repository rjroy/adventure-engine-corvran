---
title: Commission batch cleanup (2026-03-28 to 2026-03-30)
date: 2026-03-30
status: complete
tags: [retro, commissions, cleanup]
---

## Context

46 commissions across five workers (Dalton: 20, Thorne: 14, Octavia: 9, Verity: 2, Sienna: 1), spanning two days of greenfield MVP development. Work organized into five major chains: MVP Phases 1-5 with fix passes, iOS mobile UX, Engine Dice Tool (3 phases), Adventure System Integration (4 phases), and supporting spec/plan/brainstorm work. One active commission (Octavia cleanup) excluded.

## What Worked

The chain pattern (spec, plan, implement with review gates, fix) produced clean results. Every chain completed with all requirements satisfied. Thorne review gates caught real defects: the missed `d20-magic/SKILL.md` in dice tool Phase 3 would have shipped broken, and the comparative framing in Daggerheart skill files was a content quality issue invisible to automated checks.

Parallel dispatch of spec+research commissions (Octavia writing specs while Verity researched RPG systems) was efficient. The brainstorm-to-spec-to-plan pipeline for both Engine Dice Tool and Adventure System Integration produced tight requirement traceability.

## Loose Threads

### Deferred LOW findings from Adventure System Phase 2 review

Three Thorne findings explicitly deferred by Dalton during Phase 3 implementation:

- **F2**: Duplicated `adventure.md` reading logic in `adventure-service.ts`. `listAdventures` and `getAdventure` both parse adventure config with ~10 lines of copied code. Low risk but a maintenance smell.
- **F3**: Docstring in prompt-service references REQ-MVP-12 but not REQ-SYS-22 (the requirement it now primarily implements).
- **F5**: Regex YAML parser captures single-quoted values with quotes intact. `system: 'daggerheart'` would resolve as `'daggerheart'` (with quotes), not `daggerheart`.

F5 is the most consequential of these. A quoted YAML value would fail system alias resolution silently.

### Lost Phase 3 review findings

Thorne's Adventure System Phase 3 review (commission 213425) wrote findings to `.lore/reviews/adventure-system-integration-phase3.md`, but the file was in a worktree that was cleaned up. The commission result body only says "Created the file." Whatever findings Thorne raised during that review are unrecoverable from the commission artifact. The Phase 4 bootstrap authoring commission noted the loss but proceeded without the findings.

### Verity's RPG research is unconsumed

`.lore/research/llm-optimized-rpg-systems.md` contains survey findings on 11 RPG system categories, five pillars for LLM-native design, and a reference to the ChatRPG academic study's narrator/archivist agent separation pattern. No subsequent commission references this research. It was framed as informing "a custom RPG system for the Adventure Engine" but that work hasn't started.

### listAdventures path validation gap

`listAdventures()` iterates `readDir` entries without calling `isValidAdventureId()`. Since the entries come from the filesystem (not user input), risk is low, but it's inconsistent with `getAdventure()` which validates. Noted in Dalton's Phase 2 result but never addressed.

## Infrastructure Issues

**Duplicate `linked_artifacts`**: 18 of 20 Dalton commissions and Sienna's commission have every entry in `linked_artifacts` doubled. Systematic, not one-off. Likely a bug in the commission creation or update path.

**Thorne write blocker**: 5 of 14 Thorne commissions could not write review files (no write tools available). Review content was captured in commission result bodies instead, which worked but means review artifacts referenced in `linked_artifacts` were never created. The Phase 3 adventure system review was the one case where writing succeeded (via a worktree), but the worktree cleanup destroyed the file.

**Verity resource_overrides failure**: Commission 140900 abandoned immediately due to invalid `resource_overrides.model` value (`claude-sonnet-4-6`). Retried successfully as 140917 without overrides.

**Inconsistent test counts**: Test counts vary across Dalton commissions (218, 206, 137, 104, 112, 114, 188) with scope changes often unexplained. Not incorrect per se, but makes regression tracking difficult across the chain.

## Lessons

**WARN-level findings get dropped from fix commissions.** The "Fix All Review Findings" commission (112913) consumed 14 specific fixes but omitted Phase 2's DEFECT-1 (/help omits system.help). The defect was actually fixed in the code (system.help is included in allOperations), so it was resolved implicitly, but the explicit tracking gap confirms the pattern: if a finding isn't in the fix list, it's invisible. This is already in worker memory but worth reinforcing.

**Worktree cleanup destroys review artifacts.** When a review commission writes to a file in a worktree, that file vanishes when the worktree is cleaned up. The commission result body should capture findings inline, not just reference an external file. Thorne's commissions that couldn't write files actually preserved more information (in the result body) than the one that could.

**Commission chain awareness needs explicit wiring.** The Guild Master meeting (135324) captured this lesson: every Dalton commission after a review must explicitly include "read the review, address findings." Dependency ordering alone doesn't create awareness; the prompt must direct attention to the predecessor's output.
