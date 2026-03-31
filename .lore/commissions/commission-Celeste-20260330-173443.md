---
title: "Commission: Brainstorm: GM mood system integration design"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Celeste
workerDisplayTitle: "Guild Visionary"
prompt: "Brainstorm how to integrate a dynamic mood/theme system into the Adventure Engine where the GM (AI) can change the web client's visual atmosphere during play.\n\n## Context\n\nThe Adventure Engine previously had a mood system that did two things:\n- Changed the color palette\n- Changed the background image\n\nWe're redesigning this for the current architecture: Hono backend daemon on Unix socket, Next.js web client, Claude Agent SDK for AI. The GM streams responses via SSE. See `.lore/issues/dynamic-mood-themes.md` for the original issue.\n\n## Questions to Explore\n\n1. **GM interface**: How does the GM (AI) communicate mood changes? Options include:\n   - A dedicated MCP tool (like the dice tool) that the GM calls\n   - Structured metadata in the response stream\n   - Special SSE event types alongside text/tool_use/done\n   - Something else?\n\n2. **Data model**: What does a \"mood\" look like as data? Just colors? Colors + background image URL? A named preset with overrides? How much creative freedom does the GM get vs. picking from presets?\n\n3. **Backend flow**: How do mood changes flow through the system? Stored per-adventure? Ephemeral per-session? Persisted in adventure files?\n\n4. **Web client application**: How does the frontend receive and apply mood changes? CSS custom properties? Inline styles? Theme provider? How do transitions work (instant, fade, gradual)?\n\n5. **Background images**: Where do they come from? AI-generated? Stock? Pre-bundled? What are the performance implications of swapping background images mid-session?\n\n6. **Scope boundaries**: What's the MVP mood system vs. the full vision? What can we ship first that's useful without being overengineered?\n\n## Constraints\n\n- The GM is a Claude AI agent using the Claude Agent SDK\n- Communication between backend and frontend is SSE streaming\n- The web client is Next.js App Router\n- Keep it simple. The mood system should enhance immersion without adding complexity that fights the core chat flow.\n\n## Output\n\nSave brainstorm to `.lore/brainstorm/dynamic-mood-system.md`. Present multiple approaches with tradeoffs, then recommend a direction. Don't over-commit to one answer; this is exploration."
dependencies: []
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
