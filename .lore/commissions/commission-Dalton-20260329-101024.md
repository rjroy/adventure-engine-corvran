---
title: "Commission: MVP Phase 4: Web Client"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 4 from `.lore/plans/mvp-implementation.md`: Web Client.\n\n**Read the full plan first** — the Phase 4 section has exact specifications.\n**Read the visual brief:** `.lore/art/corvran-visual-brief.md` — this is your primary design reference.\n**Read the mockups:** `.lore/art/mockup-adventure-list.html` and `.lore/art/mockup-adventure-play.html` — pixel-level guidance.\n\n**What to build:**\n1. Global styles (`app/globals.css`) — CSS custom properties for the full palette (using LCH color space as specified in the plan), typography (Georgia serif body, system sans chrome, 16px/1.8 line-height), streaming cursor animation. Use var() references everywhere, color-mix(in lch, ...) for alpha variants.\n2. Root layout (`app/layout.tsx`) — dark theme, metadata \"Adventure Engine of Corvran\"\n3. Adventure List view (`app/page.tsx`) — two states: adventures exist (centered 600px, \"Choose Your Adventure\" heading, cards with amber borders, status badges) and no adventures (raven icon, mkdir instruction). Single-adventure auto-redirect.\n4. Adventure Play view (`app/adventure/[id]/page.tsx`) — four states: mid-conversation idle, streaming, new adventure, error. Full-height layout, 720px conversation width, GM/Player message styling per brief.\n5. SSE client hook (`lib/use-adventure-stream.ts`) — useAdventureStream(adventureId), manages streaming state, text accumulation, tool events, done/error handling, stop.\n6. Conversation rendering — parse history into Player/GM blocks, markdown rendering for GM messages, auto-scroll with step scroll.\n7. Input component — textarea auto-resize to 120px, amber border on focus, Send/Stop button swap, Enter to send.\n8. Mock API (`app/api/daemon/[...path]/route.ts`) — temporary mock returning hardcoded JSON for GET endpoints and simulated SSE for POST message. This mock is replaced by the real proxy in Phase 5.\n\n**Critical details:**\n- NO TAILWIND. CSS custom properties + CSS modules (.module.css files). Only globals.css for custom properties and resets.\n- Palette uses LCH color space (see plan for exact values)\n- color-mix rules: -dim = 15% mix, -border = 30% mix\n- Georgia is system-wide, no web font imports\n- Scroll: step scroll (no behavior: 'smooth'), scrollIntoView on last message during streaming\n- Stop button same position as Send, visually distinct (red vs amber)\n- Tool events inline in GM message flow (sage green italic, ⚄ die icon)\n- Install a markdown renderer for GM message bodies (react-markdown or similar)\n\n**Tests required:**\n- Component tests for both views with mocked fetch responses\n- SSE hook test: mock fetch returning SSE stream, verify event processing\n- History parsing: correct splitting and label detection\n- Empty state: mkdir instruction shown\n- Single adventure: auto-redirect behavior"
dependencies:
  - commission-Thorne-20260329-100901
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T17:10:24.855Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:10:24.857Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-29T17:44:35.286Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-29T17:44:35.308Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
