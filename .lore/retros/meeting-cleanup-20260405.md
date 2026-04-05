---
title: Meeting batch cleanup (2026-03-29 to 2026-04-04)
date: 2026-04-05
status: complete
tags: [retro, meetings, cleanup]
---

## Context

16 meetings across three workers (Guild Master 9, Octavia 5, Celeste 1) plus the current open session. 14 closed, 2 declined (merge conflict notifications the user dismissed). Date range: 2026-03-29 to 2026-04-04.

Meetings followed a consistent pattern: discuss artifact, update artifact, close meeting. This means nearly all decisions landed in their linked specs, brainstorms, plans, and research docs. The meetings themselves were the vehicle, not the record.

## Untracked Decisions

Almost nothing fell through. Two items worth noting:

**iOS Safari viewport fix patterns.** The specific combination of `interactiveWidget: overlays-content`, `maximumScale: 1`, `userScalable: false` on the viewport meta tag, plus textarea `font-size: 16px` (not 15px) to prevent auto-zoom on input focus. This is in the code (layout.tsx, page.module.css) but the "why 16px specifically" rationale exists only in the Guild Master meeting notes. Desktop behavior is unaffected.

**Commission coordination failure pattern.** Parallel commissions fixing shared Phase 1 review findings independently caused merge conflicts (compaction Phases 2-3). The fix pattern: centralize review-finding fixes in a single commission before dispatching subsequent phases. This was captured in the commission cleanup retro but originated in meeting discussion.

## Patterns

**Artifact-first meetings.** Every Octavia and Celeste meeting was anchored to a specific artifact (brainstorm, research doc, spec). The meeting's job was to review, challenge, and update the artifact. This kept discussions focused and ensured decisions landed immediately. No meeting produced decisions that existed only in conversation.

**Guild Master as dispatch coordinator.** All 7 closed Guild Master meetings followed the same shape: assess current state, identify next work, commission it. The meetings are coordination overhead, not decision-making sessions. The decisions happen in the artifacts they commission.

**Declined meetings are merge conflict notifications.** Both declined meetings were automated requests to resolve non-.lore/ conflicts from commission branches. The user dismissed them and resolved conflicts through other means. Not a problem, but the declined meeting is a noisy artifact for what's really a merge notification.
