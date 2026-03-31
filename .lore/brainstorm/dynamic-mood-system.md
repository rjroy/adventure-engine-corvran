---
title: Dynamic Mood System
date: 2026-03-30
status: draft
tags: [mood, themes, ux, atmosphere, visual, gm-tools, sse, mcp]
modules: [backend, web, shared]
related: [.lore/issues/dynamic-mood-themes.md, .lore/vision.md]
---

# Brainstorm: Dynamic Mood System

## Header

**Vision status:** Approved (`2026-03-28`). All proposals evaluated against its principles.

**Context scanned:**
- `.lore/vision.md` — all five principles, noted tensions
- `.lore/issues/dynamic-mood-themes.md` — original issue (color palette + background image; asks about truly dynamic color from 1-2 seed values)
- `.lore/brainstorm/` — four previous brainstorms (adventure-creation-flow, conversation-history, mvp-scope, rpg-system-loading); none address mood
- `packages/backend/src/services/dice-tool.ts` — MCP tool pattern reference
- `packages/backend/src/services/session-runner.ts` — tool wiring
- `packages/backend/src/routes/adventure-routes.ts` — SSE event emission (text, tool_use, done, error)
- `packages/web/lib/use-adventure-stream.ts` — SSE parsing and event routing
- `packages/web/app/adventure/[id]/page.tsx` — rendering and tool event display
- `packages/web/app/globals.css` — CSS custom property structure (LCH throughout)
- `packages/shared/src/schemas/adventures.ts` — current SSE event schemas

**Recent brainstorm check:** No prior brainstorm on mood. New ground.

---

## What We're Working With

The SSE stream currently emits four event types: `text`, `tool_use`, `done`, `error`. The `use-adventure-stream` hook at `packages/web/lib/use-adventure-stream.ts:50` routes each by `eventType` string. Adding a fifth event type is a clean, additive change — the parser already handles unknown types gracefully (it just falls through).

The CSS variable structure in `packages/web/app/globals.css:13` uses LCH colors for everything: backgrounds, text, accents, GM accent, borders. LCH's perceptual uniformity means that rotating the hue angle preserves perceived brightness — a 60° hue shift reads as "equally bright, different mood" rather than "darker or lighter scene." The color architecture was already designed to accommodate this even if nobody named that intention.

The dice tool at `packages/backend/src/services/dice-tool.ts` shows exactly how to add a new MCP tool: define it with `createSdkMcpServer`, add it to the server in `session-runner.ts`, add it to `allowedTools`. The pattern is three-file change, tested independently.

The `adventure.md` frontmatter already carries `system` and now `name`/`concept` (from the adventure creation work). Adding a `mood` field is an additive frontmatter change.

---

## Proposals

### Proposal 1: The GM Calls a Mood Tool, Not a Text Marker

**Evidence:** Two alternative approaches compete here:

- **Text markers**: The GM embeds `[MOOD: dark_forest]` in the response text. The frontend parses it out and strips it from the displayed text.
- **MCP tool**: The GM calls `set_mood(preset: "dark_forest")`. The backend detects the tool call in the `msg.type === "user"` block at `adventure-routes.ts:236` and emits a dedicated `mood` SSE event instead of a `tool_use` event.

Text markers are fragile. The GM is a language model. Format instructions ("always wrap mood changes in `[MOOD:]` markers") will drift over extended sessions, especially when the model is also maintaining narrative, tracking rules, and managing tool calls. When the marker is missing or malformed, the frontend either displays the raw marker in the story text (immersion break) or misses the mood change silently.

The MCP tool is structurally enforced. The GM either calls the tool or it doesn't. There's no partial compliance. The tool call arrives as a structured object with validated arguments. The dice tool at `dice-tool.ts:12` uses the same pattern for exactly this reason.

**Proposal:** Add `set_mood` to the corvran MCP server as a second tool alongside `roll_dice`. The tool accepts a `preset` string (e.g., `"dark_forest"`, `"throne_room"`, `"arcane_tower"`) and an optional `hue` number (LCH hue angle, 0–360). The backend handler in `adventure-routes.ts` detects `set_mood` in the tool result path and emits a `mood` event to the SSE stream rather than a `tool_use` event — the mood change is invisible in the chat log. The frontend handles `mood` events in `use-adventure-stream.ts` and forwards them via a callback.

**Tradeoffs:**
- The MCP tool is another piece of machinery between the GM and the story. But it's a bounded, one-argument tool — less machinery than the dice roller, and explicitly bounded by the vision's concern about tools overriding storytelling.
- Text markers feel more "natural" for an LLM — it's producing text anyway. But the failure modes (malformed markers in narrative, missed changes) are worse than the overhead of a tool call.

**Vision alignment:**
- Anti-goal check: No anti-goals violated. The tool is a game-atmosphere signal, not an RPG mechanic. It doesn't replace narrative judgment.
- Principle 0 (Story is the Product): The tool serves the story by changing atmosphere. It is not the story. The fact that mood changes are invisible in the chat log (not shown as `tool_use` events) is important — the machinery stays below the surface.
- Principle 4 (Progressive Simplification): "If the AI can do it with standard tools, remove the custom tool." Could the GM use the `Write` tool to write a mood file? Yes, but that creates no real-time signal to the frontend — it requires polling or file-watch infrastructure, which is more complexity, not less. The MCP tool is the simpler path.
- Principle 2 (Teach, Don't Code): The preset list goes into the bootstrap prompt as a reference. The GM learns what presets exist the same way it learns game mechanics.

**Scope:** Small. Mirrors the dice tool exactly. Three files: `dice-tool.ts` (add `set_mood`), `session-runner.ts` (add to `allowedTools`), `adventure-routes.ts` (intercept and emit `mood` event instead of `tool_use`).

---

### Proposal 2: Named Presets With One Optional Hue Override

**Evidence:** The issue explicitly asks: "Can the color palette change be truly dynamic by providing 1 or a few arbitrary colors?" The CSS variable structure in `globals.css:13` already uses LCH values with explicit hue angles (`oklch(65% 0.135 78)` for amber accent, `oklch(70% 0.075 238)` for GM blue). LCH hue rotation preserves perceptual brightness — this is why the existing colors were specified this way.

**The spectrum of approaches:**

**Option A: Named presets only.** The GM picks from `dark_forest`, `arcane_tower`, `dungeon_deep`, `arid_wastes`, `twilight_court`, and so on. The backend holds a map of preset name → color values. Simple, predictable, instruct-able.

**Option B: Single seed color, fully derived palette.** The GM provides one color (hex or LCH components). The system derives the full set: background shifts toward the hue at very low luminance, accent is set to the seed color's hue at high chroma, GM accent is the seed's complement (hue ± 180°), borders and dims are computed via `color-mix`. This answers the issue's "truly dynamic" question directly.

**Option C: Named preset + optional hue override.** Presets handle the common case. A `hue` parameter (0–360 LCH angle) overrides the base palette hue when the GM wants something more specific. The frontend's derivation logic takes the preset's luminance and chroma values and replaces only the hue. Most presets become entries in a `name → hue` map; the derivation logic is what generates the rest.

Option C is the right shape. Presets are instruct-able (Principle 2) — you can tell the GM "use `dark_forest` for woodland scenes, `void_realm` for extradimensional travel." The hue override gives the GM access to the full 360° hue wheel when the presets don't cover the exact atmosphere. The derivation logic is reused — presets become convenience aliases for hue values plus a luminance/chroma tuning that overrides the defaults.

**The derivation is not guesswork.** The existing palette variables give us the ground truth:
- `--bg-base`: always dark (L ~7%). Hue follows the scene hue at low saturation.
- `--bg-surface`, `--bg-elevated`: L 12%, 17%. Same hue relationship.
- `--accent`: L 64%, C ~60. This is the "hot" accent — highest chroma in the palette.
- `--gm-accent`: L 68%, C 24. A cooler, lower-chroma secondary accent.
- `--text-primary`: L 89%, C ~9. Near-white. Hue tracks warm/cool loosely.

A minimal preset (`dark_forest`) is just `hue: 142` (green). The derivation logic applies it across the variable map. The `void` preset (current defaults) is `hue: 285`. Switching between presets is a hue substitution in LCH space.

**Research note:** The issue calls out that color research is needed. The specific question is: given an LCH hue angle H, what chroma values for background vs. accent read as "moody and immersive" rather than "garish" or "washed out"? This is a palette tuning problem, not an algorithm problem. The derivation logic needs tested values per luminance level. This is real work, but bounded work — it's a lookup table with maybe 10-20 entries, not a generative color science problem.

**Proposal:** The `set_mood` tool accepts `preset: string` and optional `hue: number`. The backend emits both fields in the `mood` SSE event. The frontend applies them to CSS custom properties: `--accent`, `--gm-accent`, `--bg-base`, `--bg-surface`, `--bg-elevated`, `--text-primary`. The derivation logic lives in the web client (no backend color math needed — the frontend already owns the CSS).

**Scope:** Small (named presets only, hardcoded values) to Medium (full LCH derivation with palette research).

---

### Proposal 3: Mood State Belongs in adventure.md Frontmatter

**Evidence:** Principle 1 ("Markdown is Memory") states: "all game-meaningful state lives in markdown files." The `adventure.md` frontmatter already stores `name`, `system`, and `concept`. The adventure service at `packages/backend/src/services/adventure-config.ts` parses this frontmatter for the message route. If the GM sets a `dark_forest` atmosphere mid-session and the player returns the next day, they should not load into the default violet-blue palette before the first message arrives.

**Two options:**

**Ephemeral:** Mood is carried only in SSE events. Persists for the duration of a browser session. Lost on page refresh. Simple to implement — no backend state, no file writes in the tool handler.

**Persistent (adventure.md):** The `set_mood` tool handler writes the mood to `adventure.md` frontmatter (`mood: dark_forest` or `mood_hue: 142`). On load, the `GET /adventures/:id` response includes the current mood. The adventure page applies the mood on initial render before the first message.

Ephemeral feels wrong here. The adventure's atmosphere is game-meaningful state — the GM set it deliberately to match the scene. Losing it on refresh creates a moment of visual discontinuity ("wait, weren't we in the dungeon?") that breaks immersion.

**Proposal:** The `set_mood` tool handler does two things: emits a `mood` SSE event (real-time) AND writes the mood value to `adventure.md` frontmatter (persistence). Writing frontmatter is an Edit tool call the session runner can already make — but that path runs through the GM's tool loop. It's cleaner for the MCP tool handler itself to write the frontmatter directly, bypassing the tool loop. The backend adventure service exposes a `setMood(adventureId, mood)` method. The tool handler calls it. The `GET /adventures/:id` response includes `currentMood` in `AdventureDetailSchema`. The adventure page reads it and applies it on mount.

**Tradeoffs:**
- The MCP tool now has a side effect (file write) beyond its SSE emission. This is acceptable; the dice tool also has side effects (history entries are not written by the tool, but this is the same pattern extended).
- If the tool handler writes to disk and the write fails, the SSE event already fired. The mood applied on-screen but wasn't persisted. This is a minor inconsistency. Acceptable for V1.

**Vision alignment:**
- Principle 1 (Markdown is Memory): This proposal satisfies it directly. The mood is game-meaningful state; it lives in markdown.
- Principle 4: No new infrastructure. The adventure service already reads and writes frontmatter.

**Scope:** Small. Adding a `setMood` method to the adventure service and reading `currentMood` on detail load.

---

### Proposal 4: CSS Custom Properties Applied at the Document Root

**Evidence:** `globals.css:13` defines all visual variables in `:root`. The existing palette is already well-structured and semantic — changing `--accent` changes the player send button, the GM message accent, every hover state that references it. The cascade does the work.

The question is how the frontend applies mood changes:

**Option A: React state + CSS-in-JS or inline style on the root element.** A `ThemeProvider` context wraps the app and injects `style` props. Adds React infrastructure for something CSS handles natively.

**Option B: `document.documentElement.style.setProperty()` directly.** No React state, no context, no provider. The `use-adventure-stream` hook receives a mood event, calls into a `applyMood(preset, hue)` utility, which calls `setProperty` for each variable. The mood is CSS state, not React state. This is the right separation — visual atmosphere belongs to the document, not the component tree.

**On transitions:** CSS custom properties don't transition unless declared with `@property`. Modern browsers support this. Declaring `--accent`, `--bg-base`, and `--gm-accent` as `<color>` properties via `@property` in `globals.css` enables smooth transitions. The transition duration is set on `:root` or on the page element. `transition: --accent 1.5s ease, --bg-base 2s ease` produces a gradual atmospheric shift. The longer transition (2s) prevents the visual lurch of a hard cut.

**Proposal:** Apply mood by calling `document.documentElement.style.setProperty()` for each affected variable. Add `@property` declarations for the variables that need to animate. Add a CSS `transition` on the document root for those properties. No React context, no theme provider. On page load, apply the adventure's `currentMood` (from the detail endpoint) during the initial data fetch using the same utility. When a `mood` SSE event arrives, call the utility again — the CSS transition handles the gradual shift.

**Tradeoffs:**
- `@property` is well-supported (Chrome 85+, Firefox 128+, Safari 15.4+). Not a compatibility concern.
- Direct DOM mutation from React is usually a smell — but this is exactly the use case `setProperty` is designed for. The alternative (pushing colors through React state) would cause unnecessary re-renders on every text delta.

**Vision alignment:**
- Principle 4 (Progressive Simplification): No new infrastructure. Existing CSS structure is the hook.
- Principle 0: The transition is atmospheric — slow, not jarring. The story continues uninterrupted.

**Scope:** Small. One utility function, `@property` declarations in `globals.css`, transition declarations.

---

### Proposal 5: Background Images Are a Phase Two Problem

**Evidence:** The original mood system changed both color palette and background image. The issue asks about both. The current page has no background image handling. Adding background images requires: asset storage (where do they live?), serving them efficiently, handling loading states, managing visual transitions between images, and deciding whether images are pre-bundled, stock, or AI-generated.

Each of these sub-problems is non-trivial:
- **Pre-bundled assets**: Fixed, no external deps, but large binary files in the repo and a limited set of options.
- **Stock photos**: Unsplash API or similar. Runtime external dependency. Requires API key management.
- **AI-generated**: Server-side image generation during play. Slow (seconds), expensive (API cost), complex (generation endpoint, storage, CDN).

Meanwhile, color atmosphere alone is a meaningful feature. The LCH palette gives access to the full hue wheel. A dungeon scene with hue 285 (deep blue) → hue 15 (rust red, torchlight) → hue 142 (sickly green, poison lair) tells the player something about each location without a single image.

Background images, when they arrive, should layer on top of the color system, not replace it. The mood tool's `preset` can eventually resolve to both a hue and an optional background image key. That's additive, not structural.

**Proposal:** Background images are explicitly out of scope for the mood system V1. The MCP tool, SSE event, and CSS variable application are all designed without them. When background images are added, they extend the existing `mood` event with an `imageKey` field and the frontend adds an image application step. The color system remains the foundation.

**Vision alignment:**
- Principle 0 (Story is the Product): "When a feature starts accumulating its own requirements, its own complexity, its own reason for existing, check it against this principle." Background images have substantial requirements of their own. Deferring is not a concession; it's principle in action.

**Scope:** Zero. This is a scope exclusion, not an implementation.

---

### Proposal 6: Mood Changes Are Transparent in the Narrative Layer

**Evidence:** The current `tool_use` SSE event rendering in `page.tsx:286` shows tool events as `ToolEvent` components: a die icon and the result string. This works for dice rolls — the player wants to see "rolled 3d6: total 14." It is wrong for mood changes. "set_mood: dark_forest" appearing in the chat feed is machinery visible to the player. The story didn't just mention that the GM is adjusting the color palette.

The backend SSE handler at `adventure-routes.ts:239` currently emits `tool_use` for every tool result. The fix is conditional: if the tool name is `set_mood`, emit `mood` instead of `tool_use`. The tool result carries no narrative information — its only job is to trigger a visual state change in the frontend.

**Proposal:** In `adventure-routes.ts`, add a check in the tool result handling block:
```
if (toolName === "set_mood") {
  // emit mood event, not tool_use
} else {
  // emit tool_use as before
}
```

The frontend's `use-adventure-stream.ts` adds a handler for `mood` events. The hook's return type gains an `onMoodChange` callback (or the hook calls `applyMood` directly). The chat feed never shows the mood change as a tool event.

**Tradeoffs:**
- This is a minimal change, but it establishes a precedent: some tools are "meta" (invisible in chat) and some are "narrative" (visible). The dice roll is narrative (it has story meaning: the player failed their check). The mood change is meta (it has only atmospheric meaning). This is a useful distinction that may apply to future tools.

**Vision alignment:**
- Principle 0: The story's surface should show only what belongs there. The GM's atmospheric adjustments are real, but they're not player-visible events.
- Principle 4: No new categories, just a conditional. The simplest possible differentiation.

**Scope:** Trivial. Two conditional blocks, one in the backend route and one in the frontend hook.

---

## Recommended Direction

This is the MVP shape: five decisions, each minimal, all composable.

**1. Tool:** Add `set_mood(preset: string, hue?: number)` to the corvran MCP server. Wire it alongside `roll_dice`. The tool validates the preset name against a small allowed set.

**2. SSE event:** Emit `mood` in `adventure-routes.ts` when the tool fires. Intercept the tool result before `tool_use` emission. The `mood` event carries `{ preset: string, hue?: number }`.

**3. Data model:** Ship named presets only (`void`, `dark_forest`, `dungeon_deep`, `arcane_glow`, `arid_wastes`, `twilight_court`, `torchlight`). Map each to an LCH hue angle. The `hue` parameter override is in the tool schema but optional — presets handle 90% of cases. The LCH derivation research is deferred; preset values are authored by hand from tested CSS values.

**4. Persistence:** Write mood to `adventure.md` frontmatter via the tool handler. Include `currentMood` in `GET /adventures/:id`. Apply on page mount. No polling.

**5. Frontend:** `applyMood(preset, hue)` utility calls `setProperty` on `:root`. Add `@property` for `--accent`, `--gm-accent`, `--bg-base`. Add `transition` declarations. No React state, no theme provider.

**What makes this the right first step:** The dice tool proved the MCP pattern scales cleanly. The CSS variable structure is already designed for this. The persistence path is already understood from adventure-config parsing. The biggest unknown is the LCH palette derivation — but the named-preset path sidesteps that for the MVP. When the palette research is done, `hue` overrides become the path from presets to fully dynamic color.

**What's explicitly deferred:** Background images, full LCH derivation from arbitrary seed colors, transition tuning, preset expansion beyond the initial seven.

---

## Open Questions

1. **Preset naming and instruction:** What are the exact names, and how are they described in the bootstrap prompt? The GM needs instruct-able categories that map to storytelling moments, not technical color descriptions. "Use `dungeon_deep` when the party enters an underground space" is instruct-able. "Use hue 220" is not.

2. **Does the GM set mood proactively or reactively?** Should the bootstrap prompt instruct the GM to set mood at the start of each scene? Or only when the atmosphere shifts? The former creates consistent visual state; the latter respects Principle 4 (don't add calls if not needed). The recommendation is: instruct the GM to set mood at the beginning of a new scene or location, and to change it when the emotional tenor of the scene shifts (danger, wonder, dread). Silence is a valid choice.

3. **What does the MCP tool return to the GM?** The dice tool returns the roll result, which the GM uses in the narrative. The mood tool has nothing to return — it's a side-effect tool. A short acknowledgment (`"mood set: dark_forest"`) is fine. The GM doesn't need this in the narrative; it's invisible.

4. **Does mood survive adventure continuation vs. fresh session?** If the last session ended in `dungeon_deep` and history.md records all the preceding narrative, but the GM reads the history and decides the current scene has moved to a new location — should the old mood persist on load until the GM changes it? Yes: persist the last set mood, and trust the GM to change it when the scene changes.
