---
title: Adventure Engine of Corvran — Visual Design Brief
date: 2026-03-28
type: creative-brief
status: complete
commission: commission-Sienna-20260328-215304
---

# Visual Design Brief: Adventure Engine of Corvran MVP

## What This Commission Was

Design the visual aesthetic and create mockups for the two views of the MVP:
- **Adventure List** (`/`): the entry point
- **Adventure Play** (`/adventure/[id]`): the main experience

Source materials: existing logo, background art, favicons, the MVP spec, and the vision document.

---

## Reading the Existing Art

Before any color was chosen, the existing assets were examined:

**Logo / apple-touch-icon:** A raven with wings spread, silhouetted against a radiant ornate doorway. Black-on-white graphic illustration, bold and iconic. The raven is the identity symbol. The doorway signals threshold — entering a new story.

**Background art (`corvran-engine-background.webp`):** A dramatic fantasy landscape: dark misty mountains, a raven in flight, northern lights overhead. Four magical portals glow in distinct colors — amber/gold, green, red, white/purple — each feeding a flowing luminous stream toward a central vortex. Runic text etched into stone. The dominant atmospheric feel is **deep cool darkness punctuated by warm magical light**.

**Palette extracted from the background:**
- Base atmosphere: near-black blue-gray (`#13151e`) — the night sky behind the mountains
- Surface texture: dark stone (`#1c2030`) — cave walls, shadow areas
- Primary accent: amber-gold (`#c8922a` / `#f0b84a`) — the warmest portal, fire and candlelight
- Secondary accent: muted blue (`#7aadce`) — the cooler light of intelligence/reference

These match the vision's atmosphere: "warm tavern, not sterile chat app."

---

## Creative Direction

### Guiding principle

The vision says "The story is the product." The UI is a frame, not a feature. Every design decision was tested against: does this serve the text, or does it compete with it?

The answer shapes the entire aesthetic:
- Dark base, so text on it pops without eye strain during long sessions
- Serif body font, because this is a reading experience — stories feel like stories in Georgia, not in San Francisco
- Minimal chrome: two header elements (logo + adventure name), one input area, nothing else
- The conversation takes the full available height

### Atmosphere without theatrics

The background art is rich and dramatic. The UI doesn't try to replicate it — that would compete with the text. Instead, the UI borrows its palette and lets the background image remain the *world* the player is entering, not the frame they're reading through.

The amber accent appears in borders, badges, and the send button: a consistent throughline connecting to the existing art without reproducing it.

---

## Palette

| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | `#13151e` | Page background, the deepest layer |
| `--bg-surface` | `#1c2030` | Cards, header, input area, conversation panels |
| `--bg-elevated` | `#242840` | Hover states, active elements |
| `--text-primary` | `#e8e0d0` | All body text — warm off-white, aged parchment |
| `--text-secondary` | `#8a8a9a` | Labels, hints, meta information |
| `--text-tertiary` | `#5a5a6a` | Very muted — keyboard shortcuts, timestamps |
| `--amber` | `#c8922a` | Primary accent: send button, adventure name label, borders |
| `--amber-bright` | `#f0b84a` | Hover on amber elements |
| `--amber-border` | `rgba(200,146,42,0.28)` | Hairline borders throughout |
| `--gm-accent` | `#7aadce` | GM message label and left border — the world's voice is cooler |
| `--tool-accent` | `#7a9a6a` | Dice rolls, tool events — sage green, mechanical |
| `--stop-red` | `#b84040` | Stop button only — danger-adjacent but not alarming |

**Why GM text gets a different accent than player text:**
The GM represents the world — external, vast, slightly cool. The player is the warm point of agency (amber). Keeping these distinct helps the reader instantly orient when scanning the conversation.

---

## Typography

| Use | Stack | Size |
|-----|-------|------|
| Body / conversation | `Georgia, "Times New Roman", serif` | 16px / 1.8 line-height |
| Adventure name (display) | Same serif | 18–28px |
| UI chrome (labels, hints) | System sans | 11–14px |
| Tool events | Italic serif | 13px |
| Monospace (code hints) | `"SFMono-Regular", Consolas, monospace` | 13px |

The serif choice is deliberate: this is a reading experience. The player spends most of their time reading GM responses. Georgia at 16px with 1.8 line-height gives it the texture of a novel, not a dashboard.

---

## Adventure List View

**File:** `.lore/art/mockup-adventure-list.html`

Two states mocked:

### State: Adventures exist
- Centered layout, max-width 600px
- Page heading: "Choose Your Adventure" (serif, 28px)
- Adventure cards: dark surface background, amber hairline border, raven back-arrow on right
- Each card shows:
  - Adventure name (serif, 18px)
  - Status badge ("Continue" in muted blue, "New adventure" in sage green)
  - Secondary hint (which files exist — character, world, history)
- Hover: card background lightens to `--bg-elevated`, border brightens to solid amber
- All adventures are clickable — nothing is blocked

**Design decision on badges:** "New adventure" (green) vs "Continue" (blue) rather than a binary enabled/disabled. Green implies possibility, not lack. Blue implies ongoing momentum. Neither implies the player needs to do something before they can start.

### State: No adventures (empty state)
- Centered, much whitespace
- Muted raven icon at 25% opacity — the symbol is present but not demanding
- Plain language explanation (not an error)
- Shell command shown in a styled code block (`mkdir adventures/my-first-adventure`)
- Subdued instruction to restart and return

**Design decision on empty state:** The spec says "show a message explaining how to create one." The instruction must be literal and actionable — a mkdir command — because this is a developer-facing localhost app. No gentle onboarding euphemism.

---

## Adventure Play View

**File:** `.lore/art/mockup-adventure-play.html`

Four states mocked:

### State 1: Mid-conversation (idle)
- Full-height layout: header (52px) + conversation (flex: 1) + input area (fixed bottom)
- Conversation max-width: 720px, centered
- Header: logo → back arrow → adventure name → "Adventure Engine" app label
- **GM messages**: muted blue left border (2px), "Game Master" label in `--gm-accent`, body in serif
- **Player messages**: amber left border (2px), "You" label in `--amber`, body in serif italic (slightly muted)
- Italic distinguishes player input as *action spoken* vs GM response as *world described*
- Input: dark background, amber border on focus, textarea grows up to 120px, "Send" button in amber

**Design decision on message layout:** No avatar bubbles. No chat-app alignment (player right, GM left). Both messages are left-aligned, full width. This is because the text is long-form narrative — chat bubble widths destroy readability in 200-word GM responses. The labels (Game Master / You) and border color do the distinguishing work that alignment usually does in chat UIs.

### State 2: GM streaming response
- Input area visually disabled (50% opacity, placeholder changes to "Waiting for the Game Master…")
- **Send button replaced by Stop button**: dark red background, solid red square icon, "Stop" label
- Streaming cursor: blinking 2px vertical line at text end (CSS animation, step-end)
- Tool use events rendered inline within the GM message block (before or after text depending on when they fire)
- Tool events: sage green text, italic, left border in tool-accent color, `⚄` die icon

**Design decision on Stop button:** The Stop button takes the exact same position as the Send button so the player's hand never has to hunt. It's visually distinct (red family vs amber family) so the player doesn't accidentally send a message when trying to stop. The red is dimmed — `stop-red-dim` background with `#e87070` text — because this is a "cancel a request" action, not a destructive/dangerous one.

**Design decision on tool events:** They render inline between GM text blocks, not as a separate panel or sidebar. The spec says "Show tool use events inline" and "in a visually distinct way." Sage green italic achieves distinct without breaking the reading flow. A player reading "you rolled 16, success" inline understands immediately — they don't need to look somewhere else.

### State 3: New adventure (no history)
- Full-height layout, conversation area empty
- Centered raven icon at 20% opacity + invitation text in serif
- "A new adventure awaits." — simple, evocative
- Input placeholder changes: "Introduce yourself or describe what you'd like to play…" — longer hint matches the wider open-ended expectation

### State 4: Error (context overflow)
- Error banner inline at top of conversation area (not a modal, not toast)
- Dark red background, `error-message` component
- Literal text from the spec: "Adventure history is too long. Edit history.md to shorten it."
- `history.md` styled in monospace within the sentence — makes it clear it's a file reference
- Input remains enabled — the player can still send a message (though it will likely error again)
- Previous conversation remains visible above the error

---

## What Was Deferred

These items are out of MVP scope (as specified) and not mocked:

- Background art overlaid on the conversation (deferred in spec)
- Theming panel / settings (deferred in spec)
- Character/world info panels
- Adventure creation UI (out of scope entirely — it's mkdir)
- Session timestamps or message metadata
- Markdown rendering within GM messages (the mockup shows plain text; the implementation should render markdown)

**Note on markdown rendering:** The spec says `history.md` uses `**Player:**` and `**GM:**` formatting. The web client should render GM message bodies as markdown. The mockup shows italic and bold inline in sample text, but a production implementation should run the message body through a markdown renderer. This is the one feature not mocked that will have significant visual impact — the GM can use headers, lists, and emphasis in responses.

---

## Implementation Notes for the Developer

These are observations that matter for the Next.js implementation:

1. **Font loading:** Georgia is available system-wide. No web font import needed. This is a feature — zero font flash, zero network dependency.

2. **Conversation scroll:** The conversation div needs `overflow-y: auto` and the JS should call `scrollIntoView` on the last message element as new text streams in. Smooth scrolling works but can feel laggy during fast streaming — step scroll on each chunk may feel more responsive.

3. **Input auto-resize:** The textarea grows to `max-height: 120px`. This needs a small JS listener on input events. Beyond 120px it scrolls internally.

4. **Streaming state:** The component has two modes — idle and streaming. The streaming flag should be React state, toggled when the SSE connection opens/closes. This single boolean drives: input disabled/enabled, Send/Stop button swap, placeholder text.

5. **Stop button behavior:** Clicking Stop closes the SSE connection. The backend aborts the SDK call and appends whatever the GM said to that point to `history.md`. The client should show the partial response that was already streamed — don't clear it. Just stop the cursor, re-enable the input.

6. **Tool events:** These arrive as SSE `tool_use` events with `{ name, result }`. The client doesn't need to know the tool name for MVP display — just show the `result` string in the tool event component. The `⚄` die icon can be generic for all tool use in MVP.

---

## Files Produced

| File | Contents |
|------|----------|
| `.lore/art/mockup-adventure-list.html` | Adventure List view — two states (adventures exist, empty state) |
| `.lore/art/mockup-adventure-play.html` | Adventure Play view — four states (idle, streaming, new adventure, error) |
| `.lore/art/corvran-visual-brief.md` | This document |

---

*Brief written by Sienna, Guild Illuminator. 2026-03-28.*
