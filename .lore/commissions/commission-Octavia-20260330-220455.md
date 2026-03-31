---
title: "Commission: Spec: dynamic mood theme system"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a specification for the dynamic mood theme system based on Celeste's brainstorm at `.lore/brainstorm/dynamic-mood-system.md` and Verity's research at `.lore/research/dynamic-color-palettes.md`.\n\nRead both documents thoroughly before writing the spec. The brainstorm explores integration approaches and the research covers color palette generation techniques.\n\n## Context\n\nThe Adventure Engine's GM (AI) should be able to change the web client's visual atmosphere during play. The previous system changed color palette and background image. See `.lore/issues/dynamic-mood-themes.md` for the original issue.\n\n## Spec Requirements\n\nThe spec should define:\n- What a \"mood\" is as a data structure\n- How the GM triggers mood changes (tool, SSE event, etc.)\n- How mood data flows from backend to frontend\n- How the frontend applies palette and background changes\n- Persistence model (per-adventure, per-session, etc.)\n- MVP scope vs. future enhancements\n\nGround the spec in what the research and brainstorm recommend. Don't re-explore options that Celeste already evaluated; pick the recommended direction and define it precisely.\n\nSave to `.lore/specs/dynamic-mood-system.md`. Use the project's standard spec format if one exists in `.lore/specs/`, otherwise use clear requirements with IDs (REQ-MOOD-XX)."
dependencies:
  - commission-Verity-20260330-173428
  - commission-Celeste-20260330-173443
linked_artifacts:
  - .lore/specs/dynamic-mood-system.md

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-03-31T05:04:55.361Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T05:04:55.363Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-31T05:04:55.391Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T05:05:01.115Z
    event: progress_report
    reason: "Reading source documents: brainstorm, research, and original issue before drafting spec."
  - timestamp: 2026-03-31T05:06:55.231Z
    event: progress_report
    reason: "All source material read. Writing the spec now."
  - timestamp: 2026-03-31T05:09:30.034Z
    event: progress_report
    reason: "Spec written. Reviewing for completeness and accuracy before submitting."
  - timestamp: 2026-03-31T05:10:02.605Z
    event: result_submitted
    reason: "Spec written at `.lore/specs/dynamic-mood-system.md`.\n\nThe spec covers the full V1 scope based on Celeste's brainstorm and Verity's color research:\n\n**What a mood is:** `MoodState` carries a hue angle (OKLCH), the GM's description, and an optional image path. Persisted in `adventure.md` frontmatter as `mood_hue`, `mood_description`, `mood_image`. Exposed via `currentMood` on `GET /adventures/:id`.\n\n**How the GM triggers it:** `set_mood(description: string)` MCP tool on the corvran server, auto-approved. The GM describes the scene atmosphere in natural language. No technical parameters.\n\n**How mood data flows:** Tool handler → Replicate (FLUX Schnell, synchronous) → color extraction → `adventure.md` write → `mood` SSE event (suppressed `tool_use` emission). The mood change is invisible in the chat log.\n\n**How the frontend applies it:** `applyMood(hue, imageSrc?)` utility calls `setProperty()` on 9 CSS custom properties using fixed hue offsets from the current palette (text at +175°, accent at +168°, GM at +328°). `@property` declarations in `globals.css` enable CSS transitions (backgrounds 2s, text/accent 1.5s). A fixed-position background image layer at 10% opacity shows the generated image.\n\n**Persistence model:** Per-adventure, permanent. Page mount restores atmosphere from `currentMood` before first message. Only the most recent mood image is kept (`mood.png` in the adventure directory).\n\n**MVP vs. future:** All image generation, color extraction, SSE handling, CSS transitions, and page mount restoration are in scope. Deferred: crossfade animations, multiple image history, higher-quality Replicate models, player-visible mood labels, frontend `culori` library."
  - timestamp: 2026-03-31T05:10:11.657Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Spec written. Reviewing for completeness and accuracy before submitting."
projectName: corvran
---
Spec written at `.lore/specs/dynamic-mood-system.md`.

The spec covers the full V1 scope based on Celeste's brainstorm and Verity's color research:

**What a mood is:** `MoodState` carries a hue angle (OKLCH), the GM's description, and an optional image path. Persisted in `adventure.md` frontmatter as `mood_hue`, `mood_description`, `mood_image`. Exposed via `currentMood` on `GET /adventures/:id`.

**How the GM triggers it:** `set_mood(description: string)` MCP tool on the corvran server, auto-approved. The GM describes the scene atmosphere in natural language. No technical parameters.

**How mood data flows:** Tool handler → Replicate (FLUX Schnell, synchronous) → color extraction → `adventure.md` write → `mood` SSE event (suppressed `tool_use` emission). The mood change is invisible in the chat log.

**How the frontend applies it:** `applyMood(hue, imageSrc?)` utility calls `setProperty()` on 9 CSS custom properties using fixed hue offsets from the current palette (text at +175°, accent at +168°, GM at +328°). `@property` declarations in `globals.css` enable CSS transitions (backgrounds 2s, text/accent 1.5s). A fixed-position background image layer at 10% opacity shows the generated image.

**Persistence model:** Per-adventure, permanent. Page mount restores atmosphere from `currentMood` before first message. Only the most recent mood image is kept (`mood.png` in the adventure directory).

**MVP vs. future:** All image generation, color extraction, SSE handling, CSS transitions, and page mount restoration are in scope. Deferred: crossfade animations, multiple image history, higher-quality Replicate models, player-visible mood labels, frontend `culori` library.
