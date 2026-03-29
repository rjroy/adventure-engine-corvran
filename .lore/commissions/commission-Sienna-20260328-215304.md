---
title: "Commission: MVP Visual Design and Mockups"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Sienna
workerDisplayTitle: "Guild Illuminator"
prompt: "Design the visual aesthetic and create mockups for the Adventure Engine of Corvran MVP.\n\n## Source Material\n\n1. **`.lore/specs/mvp.md`** — The MVP spec. This defines exactly what the application does. Read it fully. The two views are:\n   - **Adventure List** (`/`): Shows available adventures with context hints (\"New adventure\" / \"Continue\"). If one adventure, auto-navigate. If none, explain how to create one.\n   - **Adventure Play** (`/adventure/[id]`): Conversation view with streaming text, player input at bottom, tool use displayed inline (dice rolls etc.), stop button during GM response.\n\n2. **`.lore/vision.md`** — The vision document. Key quote: \"The story is the product.\" Everything serves the conversation. The UI should not compete with the narrative.\n\n3. **`.lore/art/`** — Existing art assets. Review all of them for visual direction:\n   - `logo.png` — The project logo\n   - `corvran-engine-background.webp` — Background art\n   - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — Favicons (for color palette reference)\n\n## What to Produce\n\nCreate mockups in a `.pen` file that cover:\n\n1. **Adventure List view** — The landing screen. How adventures are presented, the empty state (\"no adventures yet\"), and the \"one adventure\" auto-navigate case can just be noted, not mocked.\n2. **Adventure Play view** — The main experience. This is where the player spends 99% of their time. Show:\n   - Conversation history with Player and GM messages visually distinguished\n   - Streaming GM response in progress\n   - Player input area\n   - Tool use display (dice rolls) inline in the conversation\n   - The \"Stop\" button during GM response\n3. **Visual aesthetic** — Color palette, typography, and overall feel that fits a collaborative storytelling application. The existing art assets should inform the direction.\n\n## Design Principles\n\n- **The conversation is the product.** The UI is a frame for the story, not a dashboard. Nothing should distract from reading and writing.\n- **Dark, atmospheric, but readable.** This is a TTRPG companion. Think warm tavern, not sterile chat app. But legibility comes first.\n- **Minimal chrome.** The spec says \"adventure list, conversation view, input box. Nothing else.\" The UI should reflect that restraint.\n- **The background art exists.** Use it or reference it for atmosphere, but don't let it overpower the text.\n\n## Constraints\n\n- This is a localhost app. No auth screens, no onboarding flows, no account management.\n- The MVP has exactly two views. Don't design for views that don't exist yet.\n- The spec defers \"panels, theming, background images\" as post-MVP. But the mockup should establish the visual foundation that those features would build on."
dependencies: []
linked_artifacts:
  - .lore/art/mockup-adventure-list.html

  - .lore/art/mockup-adventure-play.html
  - .lore/art/corvran-visual-brief.md
  - .lore/art/mockup-adventure-play.html
  - .lore/art/corvran-visual-brief.md
activity_timeline:
  - timestamp: 2026-03-29T04:53:04.355Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T04:53:04.357Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T04:53:04.798Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T04:53:11.036Z
    event: progress_report
    reason: "Starting commission: reading source materials and examining existing art assets before making any design decisions."
  - timestamp: 2026-03-29T04:53:47.964Z
    event: progress_report
    reason: "Art analysis complete. Raven-door motif, dark atmospheric background (deep misty blue-gray), amber/gold accent from portal glow. Formulating creative direction before opening Pencil."
  - timestamp: 2026-03-29T04:54:15.922Z
    event: progress_report
    reason: "Pencil unavailable. Building HTML/CSS mockups directly — consistent with documented approach for UI work requiring readable text. Creating both views with full creative brief."
  - timestamp: 2026-03-29T04:56:53.635Z
    event: progress_report
    reason: "Both HTML mockups written. Opening in browser to verify visually before writing the creative brief."
  - timestamp: 2026-03-29T04:59:20.095Z
    event: result_submitted
    reason: "Visual design brief and HTML mockups complete for the Adventure Engine of Corvran MVP.\n\n**Creative decisions made:**\n\nPalette derived directly from the existing background art — deep night-sky base (`lch(7% 7 284)`), cave-stone surfaces (`lch(13% 12 285)`), aged-parchment text (`lch(89% 9 90)`), amber-gold portal glow (`lch(64% 60 79)`) as the primary accent. GM messages use a muted blue accent (`lch(60% 30 133)`) — the world's voice is cooler and more distant than the player's warm amber.\n\nTypography is Georgia serif throughout the conversation. This is a reading experience. The text should feel like a novel, not a dashboard. System sans handles chrome only.\n\nLayout: full-height flex with no sidebars, no panels. The conversation column is 720px centered and takes every pixel between the 52px header and the input bar. Nothing competes with the text.\n\n**Message distinction:** Left-aligned full-width for both GM and player messages (no chat bubbles — long-form GM responses can run 200+ words and chat bubble widths destroy that). The amber/blue left borders and label colors do the visual work instead.\n\n**Four interaction states mocked for the Play view:** idle (player's turn), streaming (GM responding with Stop button active), new adventure (empty state), and error (context overflow).\n\n**Tool events:** Inline in the GM message block — sage green italic with die icon. Not a sidebar. Part of the reading flow.\n\n**Cost:** Zero API calls. HTML/CSS mockups produce better results than FLUX for UI work requiring readable text (documented in Generation Notes).\n\n**Artifacts produced:**\n- `.lore/art/mockup-adventure-list.html` — Adventure List view (two states: adventures exist, empty state)\n- `.lore/art/mockup-adventure-play.html` — Adventure Play view (four states: idle, streaming, new adventure, error)\n- `.lore/art/corvran-visual-brief.md` — Full creative brief with implementation notes for the developer"
  - timestamp: 2026-03-29T04:59:32.943Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Both HTML mockups written. Opening in browser to verify visually before writing the creative brief."
projectName: corvran
---
Visual design brief and HTML mockups complete for the Adventure Engine of Corvran MVP.

**Creative decisions made:**

Palette derived directly from the existing background art — deep night-sky base (`lch(7% 7 284)`), cave-stone surfaces (`lch(13% 12 285)`), aged-parchment text (`lch(89% 9 90)`), amber-gold portal glow (`lch(64% 60 79)`) as the primary accent. GM messages use a muted blue accent (`lch(60% 30 133)`) — the world's voice is cooler and more distant than the player's warm amber.

Typography is Georgia serif throughout the conversation. This is a reading experience. The text should feel like a novel, not a dashboard. System sans handles chrome only.

Layout: full-height flex with no sidebars, no panels. The conversation column is 720px centered and takes every pixel between the 52px header and the input bar. Nothing competes with the text.

**Message distinction:** Left-aligned full-width for both GM and player messages (no chat bubbles — long-form GM responses can run 200+ words and chat bubble widths destroy that). The amber/blue left borders and label colors do the visual work instead.

**Four interaction states mocked for the Play view:** idle (player's turn), streaming (GM responding with Stop button active), new adventure (empty state), and error (context overflow).

**Tool events:** Inline in the GM message block — sage green italic with die icon. Not a sidebar. Part of the reading flow.

**Cost:** Zero API calls. HTML/CSS mockups produce better results than FLUX for UI work requiring readable text (documented in Generation Notes).

**Artifacts produced:**
- `.lore/art/mockup-adventure-list.html` — Adventure List view (two states: adventures exist, empty state)
- `.lore/art/mockup-adventure-play.html` — Adventure Play view (four states: idle, streaming, new adventure, error)
- `.lore/art/corvran-visual-brief.md` — Full creative brief with implementation notes for the developer

## Decisions

**How to produce mockups when Pencil is unavailable?**
Build HTML/CSS mockups saved to .lore/art/. This is documented in worker memory as the correct fallback for UI work requiring readable text.
*Reasoning: FLUX renders garbled UI text, and Pencil is unreachable. HTML gives exact control over typography, spacing, and color — which is what matters most for a conversation-centric UI where text is the product.*
