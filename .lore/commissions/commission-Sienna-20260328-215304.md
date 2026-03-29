---
title: "Commission: MVP Visual Design and Mockups"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Sienna
workerDisplayTitle: "Guild Illuminator"
prompt: "Design the visual aesthetic and create mockups for the Adventure Engine of Corvran MVP.\n\n## Source Material\n\n1. **`.lore/specs/mvp.md`** — The MVP spec. This defines exactly what the application does. Read it fully. The two views are:\n   - **Adventure List** (`/`): Shows available adventures with context hints (\"New adventure\" / \"Continue\"). If one adventure, auto-navigate. If none, explain how to create one.\n   - **Adventure Play** (`/adventure/[id]`): Conversation view with streaming text, player input at bottom, tool use displayed inline (dice rolls etc.), stop button during GM response.\n\n2. **`.lore/vision.md`** — The vision document. Key quote: \"The story is the product.\" Everything serves the conversation. The UI should not compete with the narrative.\n\n3. **`.lore/art/`** — Existing art assets. Review all of them for visual direction:\n   - `logo.png` — The project logo\n   - `corvran-engine-background.webp` — Background art\n   - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — Favicons (for color palette reference)\n\n## What to Produce\n\nCreate mockups in a `.pen` file that cover:\n\n1. **Adventure List view** — The landing screen. How adventures are presented, the empty state (\"no adventures yet\"), and the \"one adventure\" auto-navigate case can just be noted, not mocked.\n2. **Adventure Play view** — The main experience. This is where the player spends 99% of their time. Show:\n   - Conversation history with Player and GM messages visually distinguished\n   - Streaming GM response in progress\n   - Player input area\n   - Tool use display (dice rolls) inline in the conversation\n   - The \"Stop\" button during GM response\n3. **Visual aesthetic** — Color palette, typography, and overall feel that fits a collaborative storytelling application. The existing art assets should inform the direction.\n\n## Design Principles\n\n- **The conversation is the product.** The UI is a frame for the story, not a dashboard. Nothing should distract from reading and writing.\n- **Dark, atmospheric, but readable.** This is a TTRPG companion. Think warm tavern, not sterile chat app. But legibility comes first.\n- **Minimal chrome.** The spec says \"adventure list, conversation view, input box. Nothing else.\" The UI should reflect that restraint.\n- **The background art exists.** Use it or reference it for atmosphere, but don't let it overpower the text.\n\n## Constraints\n\n- This is a localhost app. No auth screens, no onboarding flows, no account management.\n- The MVP has exactly two views. Don't design for views that don't exist yet.\n- The spec defers \"panels, theming, background images\" as post-MVP. But the mockup should establish the visual foundation that those features would build on."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T04:53:04.355Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T04:53:04.357Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
