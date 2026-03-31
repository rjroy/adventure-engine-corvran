---
title: "Commission: Brainstorm: GM mood system integration design"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Celeste
workerDisplayTitle: "Guild Visionary"
prompt: "Brainstorm how to integrate a dynamic mood/theme system into the Adventure Engine where the GM (AI) can change the web client's visual atmosphere during play.\n\n## Context\n\nThe Adventure Engine previously had a mood system that did two things:\n- Changed the color palette\n- Changed the background image\n\nWe're redesigning this for the current architecture: Hono backend daemon on Unix socket, Next.js web client, Claude Agent SDK for AI. The GM streams responses via SSE. See `.lore/issues/dynamic-mood-themes.md` for the original issue.\n\n## Questions to Explore\n\n1. **GM interface**: How does the GM (AI) communicate mood changes? Options include:\n   - A dedicated MCP tool (like the dice tool) that the GM calls\n   - Structured metadata in the response stream\n   - Special SSE event types alongside text/tool_use/done\n   - Something else?\n\n2. **Data model**: What does a \"mood\" look like as data? Just colors? Colors + background image URL? A named preset with overrides? How much creative freedom does the GM get vs. picking from presets?\n\n3. **Backend flow**: How do mood changes flow through the system? Stored per-adventure? Ephemeral per-session? Persisted in adventure files?\n\n4. **Web client application**: How does the frontend receive and apply mood changes? CSS custom properties? Inline styles? Theme provider? How do transitions work (instant, fade, gradual)?\n\n5. **Background images**: Where do they come from? AI-generated? Stock? Pre-bundled? What are the performance implications of swapping background images mid-session?\n\n6. **Scope boundaries**: What's the MVP mood system vs. the full vision? What can we ship first that's useful without being overengineered?\n\n## Constraints\n\n- The GM is a Claude AI agent using the Claude Agent SDK\n- Communication between backend and frontend is SSE streaming\n- The web client is Next.js App Router\n- Keep it simple. The mood system should enhance immersion without adding complexity that fights the core chat flow.\n\n## Output\n\nSave brainstorm to `.lore/brainstorm/dynamic-mood-system.md`. Present multiple approaches with tradeoffs, then recommend a direction. Don't over-commit to one answer; this is exploration."
dependencies: []
linked_artifacts:
  - .lore/brainstorm/dynamic-mood-system.md

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-03-31T00:34:43.512Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:34:43.514Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-31T00:34:43.541Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T00:34:52.278Z
    event: progress_report
    reason: "Reading vision, existing issue, recent brainstorms, and relevant codebase patterns before drafting proposals."
  - timestamp: 2026-03-31T00:37:23.302Z
    event: progress_report
    reason: "Context gathered. Codebase read: session-runner, dice-tool, adventure-routes, use-adventure-stream, shared schemas, globals.css. Now drafting proposals."
  - timestamp: 2026-03-31T00:39:43.624Z
    event: result_submitted
    reason: "Brainstorm complete. Six proposals across the five design questions, grounded in codebase evidence and evaluated against the approved vision.\n\n**Recommended direction (five composable MVP decisions):**\n\n1. **GM interface**: MCP tool `set_mood(preset, hue?)` alongside the dice tool. Structured, validated, no format compliance risk from inline markers.\n\n2. **SSE event**: New `mood` event type in adventure-routes. Intercepted from the tool result path so mood changes never appear as `tool_use` chat events.\n\n3. **Data model**: Named presets (`void`, `dark_forest`, `dungeon_deep`, `arcane_glow`, `arid_wastes`, `twilight_court`, `torchlight`) mapped to LCH hue angles. Optional `hue` override in tool schema for cases presets don't cover. Full LCH derivation research deferred.\n\n4. **Persistence**: Tool handler writes `mood` to `adventure.md` frontmatter. `GET /adventures/:id` includes `currentMood`. Page applies it on mount — atmosphere survives refresh.\n\n5. **Frontend**: `applyMood()` utility calls `document.documentElement.style.setProperty()` on `:root` variables. `@property` declarations in globals.css enable CSS transitions. No React context, no theme provider.\n\n**Background images deferred**: color atmosphere alone is meaningful; images accumulate their own requirements and fight Principle 0.\n\n**Key observation**: The LCH color structure in globals.css was already designed for this — hue angles are explicit in every variable. The mood system is not fighting the existing design; it's completing something the CSS was already trying to say.\n\nArtifact: `.lore/brainstorm/dynamic-mood-system.md`"
  - timestamp: 2026-03-31T00:39:52.296Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Context gathered. Codebase read: session-runner, dice-tool, adventure-routes, use-adventure-stream, shared schemas, globals.css. Now drafting proposals."
projectName: corvran
---
Brainstorm complete. Six proposals across the five design questions, grounded in codebase evidence and evaluated against the approved vision.

**Recommended direction (five composable MVP decisions):**

1. **GM interface**: MCP tool `set_mood(preset, hue?)` alongside the dice tool. Structured, validated, no format compliance risk from inline markers.

2. **SSE event**: New `mood` event type in adventure-routes. Intercepted from the tool result path so mood changes never appear as `tool_use` chat events.

3. **Data model**: Named presets (`void`, `dark_forest`, `dungeon_deep`, `arcane_glow`, `arid_wastes`, `twilight_court`, `torchlight`) mapped to LCH hue angles. Optional `hue` override in tool schema for cases presets don't cover. Full LCH derivation research deferred.

4. **Persistence**: Tool handler writes `mood` to `adventure.md` frontmatter. `GET /adventures/:id` includes `currentMood`. Page applies it on mount — atmosphere survives refresh.

5. **Frontend**: `applyMood()` utility calls `document.documentElement.style.setProperty()` on `:root` variables. `@property` declarations in globals.css enable CSS transitions. No React context, no theme provider.

**Background images deferred**: color atmosphere alone is meaningful; images accumulate their own requirements and fight Principle 0.

**Key observation**: The LCH color structure in globals.css was already designed for this — hue angles are explicit in every variable. The mood system is not fighting the existing design; it's completing something the CSS was already trying to say.

Artifact: `.lore/brainstorm/dynamic-mood-system.md`
