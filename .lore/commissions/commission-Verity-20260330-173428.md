---
title: "Commission: Research: dynamic color palette generation from arbitrary GM colors"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Verity
workerDisplayTitle: "Guild Pathfinder"
prompt: "Research how to dynamically generate a full, accessible UI color palette from 1-3 arbitrary colors provided at runtime.\n\n## Context\n\nThe Adventure Engine of Corvran has a Game Master (AI) that narrates tabletop RPG adventures. We want the GM to be able to set a \"mood\" during play that changes the web client's color palette dynamically. The GM would provide 1-3 colors (e.g., a primary mood color), and the UI needs to derive a complete, accessible palette from those inputs.\n\n## Research Questions\n\n1. **Color theory approaches**: What algorithms exist for generating complementary, analogous, or triadic palettes from a single seed color? Which produce the most aesthetically pleasing results for UI use?\n\n2. **CSS custom properties at runtime**: What's the current best practice for swapping an entire color palette via CSS custom properties dynamically? Any performance considerations?\n\n3. **Accessibility**: How do you guarantee WCAG contrast ratios when the palette is generated dynamically? Are there libraries that enforce this as a constraint during generation?\n\n4. **Existing libraries**: Survey libraries that do this (e.g., chroma.js, culori, polished, color2k, huet, radix-colors, open-color generation). Compare size, API, and suitability for runtime palette generation in a Next.js app.\n\n5. **Prior art**: Any examples of apps/games that change their entire UI palette dynamically based on content or AI decisions? How do they handle transitions?\n\n6. **Color space**: Should generation happen in HSL, LCH, OKLCH, or another perceptually uniform space? What are the tradeoffs?\n\n## Output\n\nSave findings to `.lore/research/dynamic-color-palettes.md`. Structure as: summary of approach recommendations, then detailed findings per question. Include concrete library recommendations with size/tradeoff analysis."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-03-31T00:34:28.777Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:34:28.779Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
