---
title: "Commission: Research: dynamic color palette generation from arbitrary GM colors"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Verity
workerDisplayTitle: "Guild Pathfinder"
prompt: "Research how to dynamically generate a full, accessible UI color palette from 1-3 arbitrary colors provided at runtime.\n\n## Context\n\nThe Adventure Engine of Corvran has a Game Master (AI) that narrates tabletop RPG adventures. We want the GM to be able to set a \"mood\" during play that changes the web client's color palette dynamically. The GM would provide 1-3 colors (e.g., a primary mood color), and the UI needs to derive a complete, accessible palette from those inputs.\n\n## Research Questions\n\n1. **Color theory approaches**: What algorithms exist for generating complementary, analogous, or triadic palettes from a single seed color? Which produce the most aesthetically pleasing results for UI use?\n\n2. **CSS custom properties at runtime**: What's the current best practice for swapping an entire color palette via CSS custom properties dynamically? Any performance considerations?\n\n3. **Accessibility**: How do you guarantee WCAG contrast ratios when the palette is generated dynamically? Are there libraries that enforce this as a constraint during generation?\n\n4. **Existing libraries**: Survey libraries that do this (e.g., chroma.js, culori, polished, color2k, huet, radix-colors, open-color generation). Compare size, API, and suitability for runtime palette generation in a Next.js app.\n\n5. **Prior art**: Any examples of apps/games that change their entire UI palette dynamically based on content or AI decisions? How do they handle transitions?\n\n6. **Color space**: Should generation happen in HSL, LCH, OKLCH, or another perceptually uniform space? What are the tradeoffs?\n\n## Output\n\nSave findings to `.lore/research/dynamic-color-palettes.md`. Structure as: summary of approach recommendations, then detailed findings per question. Include concrete library recommendations with size/tradeoff analysis."
dependencies: []
linked_artifacts:
  - .lore/research/dynamic-color-palettes.md

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
  - timestamp: 2026-03-31T00:34:28.818Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T00:34:35.250Z
    event: progress_report
    reason: "Starting research on dynamic UI color palette generation. Checking existing lore first, then gathering external sources."
  - timestamp: 2026-03-31T00:34:45.843Z
    event: progress_report
    reason: "Gathering external sources: color theory algorithms, CSS custom properties patterns, accessibility constraints, and library comparisons."
  - timestamp: 2026-03-31T00:37:29.698Z
    event: progress_report
    reason: "Research gathered across all six question areas. Now synthesizing findings and writing the research artifact."
  - timestamp: 2026-03-31T00:40:34.110Z
    event: result_submitted
    reason: "Research complete. Findings saved to `.lore/research/dynamic-color-palettes.md`.\n\n**Top-line conclusions:**\n\n1. **Color space**: Use OKLCH. It is perceptually uniform (unlike HSL), fixes LCH's blue/purple hue drift, and has native CSS support in all major browsers since 2025. It is the only viable space for programmatic palette generation with accessibility guarantees.\n\n2. **Algorithm**: Fixed-lightness tonal palette. Take the input hue, step lightness from 97% to 12% across nine stops with a chroma curve (low at extremes, peak at midtones). Assign UI semantic roles to specific stops. This is the same model used by Radix Colors, Tailwind, and Material You — just in OKLCH instead of HSL.\n\n3. **Library**: `culori/fn` (tree-shakeable). OKLCH-native, provides `wcagContrast()`, bundles to ~3-5kB when only OKLCH functions are imported. chroma.js is a reasonable fallback (13.5kB, no OKLCH, better scale/blending API). Skip `@material/material-color-utilities` (1.06MB) unless the Material You aesthetic is explicitly desired.\n\n4. **CSS runtime**: Batch-update all CSS custom properties on `document.documentElement` in one synchronous block. Add `transition` to consuming properties (not variables) for smooth mood swaps. Use `@property` registration only for animated variables.\n\n5. **Accessibility**: WCAG 2.1 (4.5:1) is still the legal standard. OKLCH's perceptual uniformity means text/background contrast is predictable: programmatically verify with `wcagContrast()` and adjust lightness incrementally until the pair passes. APCA is the future (WCAG 3.0 candidate) but not yet required.\n\n6. **Prior art**: Spotify (album art → dominant color → background gradient), Material You (wallpaper → HCT tonal palette → system UI), Apple Music. All use the same structural pattern: extract or accept seed → generate tonal ranges → assign to semantic roles → check text legibility threshold."
  - timestamp: 2026-03-31T00:40:52.243Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Research gathered across all six question areas. Now synthesizing findings and writing the research artifact."
projectName: corvran
---
Research complete. Findings saved to `.lore/research/dynamic-color-palettes.md`.

**Top-line conclusions:**

1. **Color space**: Use OKLCH. It is perceptually uniform (unlike HSL), fixes LCH's blue/purple hue drift, and has native CSS support in all major browsers since 2025. It is the only viable space for programmatic palette generation with accessibility guarantees.

2. **Algorithm**: Fixed-lightness tonal palette. Take the input hue, step lightness from 97% to 12% across nine stops with a chroma curve (low at extremes, peak at midtones). Assign UI semantic roles to specific stops. This is the same model used by Radix Colors, Tailwind, and Material You — just in OKLCH instead of HSL.

3. **Library**: `culori/fn` (tree-shakeable). OKLCH-native, provides `wcagContrast()`, bundles to ~3-5kB when only OKLCH functions are imported. chroma.js is a reasonable fallback (13.5kB, no OKLCH, better scale/blending API). Skip `@material/material-color-utilities` (1.06MB) unless the Material You aesthetic is explicitly desired.

4. **CSS runtime**: Batch-update all CSS custom properties on `document.documentElement` in one synchronous block. Add `transition` to consuming properties (not variables) for smooth mood swaps. Use `@property` registration only for animated variables.

5. **Accessibility**: WCAG 2.1 (4.5:1) is still the legal standard. OKLCH's perceptual uniformity means text/background contrast is predictable: programmatically verify with `wcagContrast()` and adjust lightness incrementally until the pair passes. APCA is the future (WCAG 3.0 candidate) but not yet required.

6. **Prior art**: Spotify (album art → dominant color → background gradient), Material You (wallpaper → HCT tonal palette → system UI), Apple Music. All use the same structural pattern: extract or accept seed → generate tonal ranges → assign to semantic roles → check text legibility threshold.
