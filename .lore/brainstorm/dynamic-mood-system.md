---
title: Dynamic Mood System
date: 2026-03-30
status: resolved
tags: [mood, themes, ux, atmosphere, visual, gm-tools, sse, mcp, image-generation, color]
modules: [backend, web, shared]
related: [.lore/specs/dynamic-mood-system.md, .lore/issues/dynamic-mood-themes.md, .lore/vision.md, .lore/research/dynamic-color-palettes.md, .lore/research/replicate-image-generation.md]
---

# Brainstorm: Dynamic Mood System

## Header

**Vision status:** Approved (`2026-03-28`). All proposals evaluated against its principles.

**Context scanned:**
- `.lore/vision.md` — all five principles, noted tensions
- `.lore/issues/dynamic-mood-themes.md` — original issue (color palette + background image; asks about truly dynamic color from 1-2 seed values)
- `.lore/research/dynamic-color-palettes.md` — OKLCH tonal palettes, culori library, accessibility enforcement, CSS custom property transitions
- `.lore/research/replicate-image-generation.md` — Replicate API, FLUX models, `art-gen-mcp` server, cost/latency analysis
- `.lore/brainstorm/` — four previous brainstorms (adventure-creation-flow, conversation-history, mvp-scope, rpg-system-loading); none address mood
- `packages/backend/src/services/dice-tool.ts` — MCP tool pattern reference
- `packages/backend/src/services/session-runner.ts` — tool wiring
- `packages/backend/src/routes/adventure-routes.ts` — SSE event emission (text, tool_use, done, error)
- `packages/web/lib/use-adventure-stream.ts` — SSE parsing and event routing
- `packages/web/app/adventure/[id]/page.tsx` — rendering and tool event display
- `packages/web/app/globals.css` — CSS custom property structure (OKLCH throughout, two hue families: indigo 270 backgrounds, amber 78/85 text and accents)
- `packages/shared/src/schemas/adventures.ts` — current SSE event schemas

**Recent brainstorm check:** No prior brainstorm on mood. New ground.

---

## What We're Working With

The SSE stream currently emits four event types: `text`, `tool_use`, `done`, `error`. The `use-adventure-stream` hook at `packages/web/lib/use-adventure-stream.ts:50` routes each by `eventType` string. Adding a fifth event type is a clean, additive change — the parser already handles unknown types gracefully (it just falls through).

The CSS variable structure in `packages/web/app/globals.css:13` uses OKLCH colors for everything. The palette uses two hue families: indigo (hue 270) for backgrounds at low chroma (0.045), and amber (hue 78-85) for text and accents at varying chroma. GM accent sits at hue 238. Derived variants use `color-mix()` for dim, border, and hover states. This is important: the mood system doesn't need to replace every variable. It needs to shift the base hues, and the `color-mix()` derivations follow automatically.

The dice tool at `packages/backend/src/services/dice-tool.ts` shows exactly how to add a new MCP tool: define it with `createSdkMcpServer`, add it to the server in `session-runner.ts`, add it to `allowedTools`. The pattern is three-file change, tested independently.

The `adventure.md` frontmatter already carries `system` and now `name`/`concept` (from the adventure creation work). Adding mood fields is an additive frontmatter change.

The color palette research (`.lore/research/dynamic-color-palettes.md`) establishes that OKLCH tonal palette generation from a seed hue is well-understood: lock chroma to a curve (low at extremes, high at midtones), step lightness, and the result is accessible by construction. The `culori/fn` library handles OKLCH conversion and contrast computation at ~3-5kB tree-shaken.

The Replicate research (`.lore/research/replicate-image-generation.md`) establishes that AI image generation is fast and cheap: FLUX Schnell generates in ~2 seconds at $0.003/image. An existing `art-gen-mcp` MCP server handles the full lifecycle (generate, download before URL expiry, save to disk). The `Prefer: wait` header enables synchronous generation, eliminating polling.

---

## Proposals

### Proposal 1: The GM Calls a Mood Tool, Not a Text Marker

**Evidence:** Two alternative approaches compete here:

- **Text markers**: The GM embeds `[MOOD: dark_forest]` in the response text. The frontend parses it out and strips it from the displayed text.
- **MCP tool**: The GM calls `set_mood(...)`. The backend detects the tool call in the `msg.type === "user"` block at `adventure-routes.ts:236` and emits a dedicated `mood` SSE event instead of a `tool_use` event.

Text markers are fragile. The GM is a language model. Format instructions ("always wrap mood changes in `[MOOD:]` markers") will drift over extended sessions, especially when the model is also maintaining narrative, tracking rules, and managing tool calls. When the marker is missing or malformed, the frontend either displays the raw marker in the story text (immersion break) or misses the mood change silently.

The MCP tool is structurally enforced. The GM either calls the tool or it doesn't. There's no partial compliance. The tool call arrives as a structured object with validated arguments. The dice tool at `dice-tool.ts:12` uses the same pattern for exactly this reason.

**Proposal:** Add `set_mood` to the corvran MCP server as a second tool alongside `roll_dice`. The tool accepts a single parameter: a natural-language `description` of the atmosphere (e.g., "deep underground cavern, bioluminescent fungi, damp stone"). The backend generates an image from the description (prepended with the adventure's `art_style`), extracts the dominant color, derives the palette hue, and emits a `mood` event to the SSE stream rather than a `tool_use` event. The mood change is invisible in the chat log. The tool returns a minimal confirmation (`"mood set"`).

**Tradeoffs:**
- The MCP tool is another piece of machinery between the GM and the story. But it's a bounded tool, and explicitly bounded by the vision's concern about tools overriding storytelling.
- Text markers feel more "natural" for an LLM — it's producing text anyway. But the failure modes (malformed markers in narrative, missed changes) are worse than the overhead of a tool call.

**Vision alignment:**
- Anti-goal check: No anti-goals violated. The tool is a game-atmosphere signal, not an RPG mechanic. It doesn't replace narrative judgment.
- Principle 0 (Story is the Product): The tool serves the story by changing atmosphere. It is not the story. The fact that mood changes are invisible in the chat log (not shown as `tool_use` events) is important — the machinery stays below the surface.
- Principle 4 (Progressive Simplification): "If the AI can do it with standard tools, remove the custom tool." Could the GM use the `Write` tool to write a mood file? Yes, but that creates no real-time signal to the frontend. The MCP tool is the simpler path.
- Principle 2 (Teach, Don't Code): The GM learns when to set mood from the bootstrap prompt instructions, the same way it learns game mechanics.

**Scope:** Small. Mirrors the dice tool exactly. Three files: tool definition, `session-runner.ts` (add to `allowedTools`), `adventure-routes.ts` (intercept and emit `mood` event instead of `tool_use`).

---

### Proposal 2: Image-First Color Extraction and OKLCH Palette Derivation

**Evidence:** The issue explicitly asks: "Can the color palette change be truly dynamic by providing 1 or a few arbitrary colors?" The color palette research answers yes, and the image generation research provides a better source for those colors than the GM guessing at hue angles.

The Spotify/Apple Music pattern (documented in the color palette research, Q5) extracts dominant colors from content and derives the UI palette from them. The same approach applies here: the generated mood image is the content, and the dominant color becomes the palette seed. This guarantees that the color palette and the background image match, because the image is the source of truth for both.

The existing CSS palette in `globals.css:13` uses two hue families. Backgrounds are indigo (hue 270) at low chroma (0.045) and varying lightness (20%, 25%, 30%). Text is amber (hue 85) at low chroma (0.024) and varying lightness (90%, 65%, 45%). The primary accent is amber (hue 78) at high chroma (0.135). GM accent is blue (hue 238) at moderate chroma (0.075). These relationships (lightness levels, chroma levels, the gap between background hue and text/accent hue) are the palette's architecture. Mood changes rotate the hues while preserving this architecture.

**The derivation from an extracted seed hue H:**
- Background family: hue = H, chroma = 0.045 (unchanged), lightness = 20%/25%/30% (unchanged)
- Text family: hue = H + complement offset (current palette uses ~175° separation between bg hue 270 and text hue 85), chroma = 0.024, lightness = 90%/65%/45%
- Primary accent: hue = text hue (or close), chroma = 0.135, lightness = 65%/85%
- GM accent: hue = H + offset (current palette uses ~-32° from bg hue 270 to GM hue 238), chroma = 0.075, lightness = 70%

The `color-mix()` derived variants (`--accent-dim`, `--gm-accent-dim`, borders) recalculate automatically when the base variables change. Only the base variables need updating.

For accessibility: OKLCH lightness is perceptually uniform. The lightness gap between text (90%) and background (20%) exceeds WCAG 4.5:1 contrast across all hues. The `culori/fn` library provides `wcagContrast()` for verification, but the structural guarantee from fixed lightness values means edge cases should be rare.

**Color extraction options:** Color Thief (K-means clustering, ~7kB), Vibrant.js (quantization with population weighting), or canvas-based extraction (no dependency, draw the image to a canvas, sample pixels, find the dominant hue). Canvas extraction is the lightest approach and sufficient when we only need a single dominant hue, not a full palette.

**Proposal:** The backend generates the mood image, then extracts the dominant color from it (server-side, using canvas or a lightweight library). It converts the dominant color to OKLCH, takes the hue angle, and includes it in the `mood` SSE event alongside the image path. The frontend receives the hue and derives the full palette by rotating the existing variable architecture. The derivation logic is template-literal OKLCH strings (`oklch(20% 0.045 ${hue})`). No separate hue parameter on the tool. No GM instruction about color.

**Fallback (image generation failure):** Extract a keyword from the GM's description to derive a fallback hue via a simple keyword map ("forest" → 142, "fire" → 15, "void" → 285). If no keyword matches, use a neutral hue (the default 270). Return the outcome to the GM.

**Tradeoffs:**
- Hue rotation preserves the palette's character but can produce unexpected combinations at certain angles. Hue 60 (yellow) backgrounds at low chroma read as warm and inviting; hue 0 (red) backgrounds at low chroma read as ominous. Both are valid atmospheric choices.
- The complement offset between background and text hue is a design decision. The current palette's ~175° separation works; smaller separations (analogous palettes) could also work for specific moods. The MVP uses the fixed offset; tuning is a future problem.
- Color extraction adds a processing step but removes an instruction burden. The GM describes scenes; the system figures out what color a cavern should be.

**Vision alignment:**
- Principle 0: Dynamic color serves the story. The GM describes the atmosphere; the system extracts the visual identity. The player sees a shift in tone, not a UI setting.
- Principle 2: The GM provides a description, not color coordinates. No technical knowledge required.
- Principle 4: No new infrastructure beyond the MCP tool. The existing CSS variable structure is the hook. `color-mix()` derivations work automatically.

**Scope:** Small-Medium. One utility function for palette derivation, one for color extraction (server-side). No new frontend dependencies for the MVP path if using canvas extraction.

---

### Proposal 3: Mood State Belongs in adventure.md Frontmatter

**Evidence:** Principle 1 ("Markdown is Memory") states: "all game-meaningful state lives in markdown files." The `adventure.md` frontmatter already stores `name`, `system`, and `concept`. The adventure service at `packages/backend/src/services/adventure-config.ts` parses this frontmatter for the message route. If the GM sets a mood mid-session and the player returns the next day, they should not load into the default palette before the first message arrives.

**Two options:**

**Ephemeral:** Mood is carried only in SSE events. Persists for the duration of a browser session. Lost on page refresh. Simple to implement — no backend state, no file writes in the tool handler.

**Persistent (adventure.md):** The `set_mood` tool handler writes the mood to `adventure.md` frontmatter. On load, the `GET /adventures/:id` response includes the current mood. The adventure page applies the mood on initial render before the first message.

Ephemeral feels wrong here. The adventure's atmosphere is game-meaningful state — the GM set it deliberately to match the scene. Losing it on refresh creates a moment of visual discontinuity that breaks immersion.

**What gets persisted:** The frontmatter stores `mood_hue` (number), `mood_description` (string), and `mood_image` (path to the generated image, relative to the adventure directory). On load, the frontend applies the hue immediately (instant, no generation needed) and loads the background image from disk. The image is already generated and saved; no Replicate call on reload.

**Proposal:** The `set_mood` tool handler does two things: emits a `mood` SSE event (real-time) AND writes the mood values to `adventure.md` frontmatter (persistence). The backend adventure service exposes a `setMood(adventureId, mood)` method. The `GET /adventures/:id` response includes `currentMood` in `AdventureDetailSchema`. The adventure page reads it and applies palette + background image on mount. No polling.

**Tradeoffs:**
- The MCP tool now has a side effect (file write) beyond its SSE emission. This is acceptable; the dice tool also has side effects.
- If the tool handler writes to disk and the write fails, the SSE event already fired. The mood applied on-screen but wasn't persisted. This is a minor inconsistency. Acceptable for V1.

**Vision alignment:**
- Principle 1 (Markdown is Memory): This proposal satisfies it directly. The mood is game-meaningful state; it lives in markdown.
- Principle 4: No new infrastructure. The adventure service already reads and writes frontmatter.

**Scope:** Small. Adding a `setMood` method to the adventure service and reading `currentMood` on detail load.

---

### Proposal 4: CSS Custom Properties + Background Image Layer

**Evidence:** `globals.css:13` defines all visual variables in `:root`. The existing palette is already well-structured and semantic — changing `--accent` changes the player send button, the GM message accent, every hover state that references it. The cascade does the work.

**Color application:** `document.documentElement.style.setProperty()` directly. No React state, no context, no provider. The `use-adventure-stream` hook receives a mood event, calls into an `applyMood(hue, imagePath)` utility, which calls `setProperty` for each variable. The mood is CSS state, not React state. This is the right separation — visual atmosphere belongs to the document, not the component tree.

**Transitions:** CSS custom properties don't transition unless declared with `@property`. Modern browsers support this. Declaring the base color variables as `<color>` properties via `@property` in `globals.css` enables smooth transitions. `transition: --bg-base 2s ease, --accent 1.5s ease` produces a gradual atmospheric shift. The longer transition (2s) on backgrounds prevents the visual lurch of a hard cut.

The color palette research confirms: transitions should be on the consuming properties when `@property` isn't used, or directly on the variables when `@property` is declared. Both work; `@property` is cleaner and better supported than the research initially suggested (Chrome 85+, Firefox 128+, Safari 15.4+).

**Background image:** A `<div>` behind the content (or a pseudo-element on `body`) displays the generated image. CSS `background-image` with `background-size: cover` and low `opacity` (0.08-0.15) creates an atmospheric texture without competing with the text. The transition between images uses a crossfade: load the new image into a second layer, fade it in, fade the old one out.

**Proposal:** Apply mood by:
1. Calling `setProperty()` for each affected CSS variable (hue rotation)
2. Setting the background image on an atmospheric layer behind the content
3. Using `@property` declarations and CSS `transition` for smooth shifts

On page load, apply the adventure's `currentMood` (from the detail endpoint) during the initial data fetch using the same utility. When a `mood` SSE event arrives, call the utility again.

**Tradeoffs:**
- Direct DOM mutation from React is usually a smell, but this is exactly the use case `setProperty` is designed for. The alternative (pushing colors through React state) would cause unnecessary re-renders on every text delta.
- Low-opacity background images work for atmospheric texture but won't showcase detailed artwork. This is intentional — the image is atmosphere, not illustration. If detailed scene art becomes a goal, it needs its own display area (sidebar, modal, scene card), not a fullscreen background competing with readability.

**Vision alignment:**
- Principle 4 (Progressive Simplification): No new infrastructure. Existing CSS structure is the hook.
- Principle 0: The transition is atmospheric — slow, not jarring. The story continues uninterrupted.

**Scope:** Small. One utility function, `@property` declarations in `globals.css`, transition declarations, one background image layer element.

---

### Proposal 5: AI-Generated Background Images via Replicate

**Evidence:** The issue asks for both color palette and background image changes. The previous implementation had both. The vision (Principle 0) explicitly names "background images" as a tool on the table that serves the story.

The Replicate research eliminates the obstacles:
- **Generation speed:** FLUX Schnell generates in ~2 seconds (under 1 second server-side processing + network latency). The GM is still streaming narrative; the player hasn't read enough to notice.
- **Cost:** $0.003/image (FLUX Schnell). At 20 mood changes per session, that's $0.06. Negligible.
- **Output handling:** Replicate output URLs expire after 1 hour. The backend downloads the image immediately and saves it to the adventure directory. On reload, the image is served from disk.
- **API pattern:** `POST /v1/models/black-forest-labs/flux-schnell/predictions` with `Prefer: wait` header. Synchronous. No polling needed.
- **Existing tooling:** The `art-gen-mcp` server at `/home/rjroy/Projects/wyrd-gateway/art-gen-mcp/` already handles the full lifecycle: generate, download, save to disk, return local path. However, that's an external MCP server, not something the corvran backend calls directly. The pattern is a useful reference, not a dependency.

**How it works in the mood flow:**

The `set_mood` tool receives a `description` from the GM (e.g., "deep underground cavern, bioluminescent fungi, damp stone"). The backend:
1. Prepends the adventure's `art_style` to the description to form the image prompt
2. Calls the Replicate API to generate an image
3. Downloads the result, overwriting the previous mood image in the adventure directory
4. Extracts the dominant color from the image and converts to an OKLCH hue angle
5. Emits a single `mood` SSE event with `{ hue, description, imagePath }`
6. Writes `mood_hue`, `mood_description`, `mood_image` to `adventure.md` frontmatter
7. Returns `"mood set"` to the GM

**Art style:** An `art_style` field in `adventure.md` frontmatter defines the visual identity for the adventure. Set during creation or by the player at any time. Example: "Woodcut engraving style with limited muted palette, rough textures, and stark contrast." The GM's scene description is short ("crumbling library, dust motes in fading light"); the art style wraps it in visual coherence. Different adventures get different aesthetics without the tool knowing or caring.

**Proposal:** The `set_mood` tool handler calls the Replicate API (FLUX Schnell, synchronous via `Prefer: wait`) with `art_style + description` as the prompt. The generated image overwrites the previous mood image in the adventure directory. The dominant color is extracted and the hue, image path, and description are delivered as a single `mood` SSE event. The frontend applies palette and image together.

**Tradeoffs:**
- External API dependency. If Replicate is down, the mood change falls back to keyword-derived hue with no image. Image generation is the primary path but not a hard requirement.
- Cost accumulates. At $0.003/image it's negligible for individual sessions. Worth logging but not worth gating.
- Image quality from FLUX Schnell is the lowest tier. For V1 this is fine — the image is displayed at low opacity as atmospheric texture, not as showcase art. If higher quality is wanted later, FLUX Dev ($0.025/image) or FLUX Pro ($0.055/image) are drop-in replacements (same API, different model string).
- The backend needs network access to Replicate. This is an external runtime dependency that doesn't exist today. Requires `REPLICATE_API_TOKEN` in the environment.
- Only the most recent mood image is kept per adventure. Each mood change overwrites the previous. No cleanup logic needed.

**Vision alignment:**
- Principle 0 (Story is the Product): "Background images... serve the story. They are not the story." An atmospheric background generated from the GM's scene description serves the story. The GM decides when the atmosphere shifts; the system visualizes it.
- Principle 4 (Progressive Simplification): One API call, one download, one file write, one color extraction. The complexity is bounded. The `Prefer: wait` pattern eliminates async orchestration.
- Principle 2 (Teach, Don't Code): The GM provides a natural-language description. The art style provides visual context. No technical knowledge required.

**Scope:** Medium. Requires: Replicate API integration in the backend (HTTP client, auth, download), mood image file per adventure, color extraction, SSE event for delivery, frontend image layer with crossfade.

---

### Proposal 6: Mood Changes Are Transparent in the Narrative Layer

**Evidence:** The current `tool_use` SSE event rendering in `page.tsx:286` shows tool events as `ToolEvent` components: a die icon and the result string. This works for dice rolls — the player wants to see "rolled 3d6: total 14." It is wrong for mood changes. "set_mood: deep underground cavern" appearing in the chat feed is machinery visible to the player. The story didn't just mention that the GM is adjusting the color palette.

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
- This establishes a precedent: some tools are "meta" (invisible in chat) and some are "narrative" (visible). The dice roll is narrative (it has story meaning: the player failed their check). The mood change is meta (it has only atmospheric meaning). This is a useful distinction that may apply to future tools.

**Vision alignment:**
- Principle 0: The story's surface should show only what belongs there. The GM's atmospheric adjustments are real, but they're not player-visible events.
- Principle 4: No new categories, just a conditional. The simplest possible differentiation.

**Scope:** Trivial. Two conditional blocks, one in the backend route and one in the frontend hook.

---

## Recommended Direction

Seven decisions, composable. Image-first: the generated image is the source of truth for everything visual.

**1. Tool:** Add `set_mood(description: string)` to the corvran MCP server. Wire it alongside `roll_dice`. One parameter. The GM describes the scene atmosphere in natural language. The system handles everything else.

**2. Image generation:** The backend calls Replicate (FLUX Schnell, ~1s server-side + network latency, $0.003/image) with the GM's `description` prepended by the adventure's `art_style`. Downloads the result to the adventure directory, overwriting the previous mood image. The GM is still streaming narrative while this happens; the player hasn't read far enough to notice.

**3. Color extraction:** Extract the dominant color from the generated image (Color Thief, Vibrant.js, or canvas-based extraction). Convert to OKLCH. The extracted hue becomes the seed for the palette. Color and image are guaranteed to match because the image is the source.

**4. Palette derivation:** The frontend rotates the existing CSS palette's hue angles to the extracted hue while preserving lightness, chroma, and the relationships between hue families. Template-literal OKLCH strings; `culori/fn` only if contrast verification proves necessary. `@property` declarations in `globals.css` enable smooth CSS transitions.

**5. SSE event:** Emit a single `mood` event carrying `{ hue: number, description: string, imagePath: string }` once the image is generated and the hue is extracted. The frontend applies palette and background image together. On image generation failure, fall back to a keyword-derived hue from the description (or a neutral hue if no keyword matches), emit the `mood` event without `imagePath`, and return the outcome to the GM.

**6. Persistence:** Write `mood_hue`, `mood_description`, and `mood_image` to `adventure.md` frontmatter via the tool handler. Add `art_style` to adventure frontmatter (set during creation or by the player). Include `currentMood` in `GET /adventures/:id`. Apply palette + load image on page mount. No polling. No Replicate call on reload (image is already on disk). Only the most recent mood image is kept per adventure.

**7. Frontend application:** `applyMood(hue, imagePath)` utility calls `setProperty` on `:root` for the hue-rotated palette. A background image layer at low opacity (0.08-0.15) with crossfade handles image swaps. No React state, no theme provider.

**What makes this the right shape:** The GM describes the atmosphere in words. The system generates an image, extracts the dominant color, derives the palette, and delivers both in a single event. Color and image always match. The player sees the world change around the story without any visible machinery. One tool parameter. One SSE event. The art style lives with the adventure, not the tool.

**What's explicitly deferred:** Higher-quality image models (FLUX Dev/Pro), the `culori` library (only if contrast verification proves necessary), transition timing tuning, the question of whether images should ever be displayed at full prominence (scene cards, sidebars) rather than low-opacity backgrounds.

---

## Resolved Questions

1. **Hue source:** Extract from the generated image. No hue parameter on the tool. The image is the source of truth for the color palette. On image generation failure, fall back to keyword-derived hue from description, then to a neutral hue.

2. **Image prompt style:** `art_style` field in `adventure.md` frontmatter, prepended to the GM's scene description at generation time. The GM writes scene descriptions, not style prompts. Different adventures get different aesthetics. Example: "Woodcut engraving style with limited muted palette, rough textures, and stark contrast."

3. **When to set mood:** At each scene, and sometimes the mood change defines the scene transition. Bootstrap prompt instruction: "Call `set_mood` when the scene changes or when the emotional atmosphere shifts. A mood change can mark a scene transition."

4. **Tool return value:** Minimal confirmation: `"mood set"`. Enough to prevent invalid use of the tool, nothing the GM would weave into narrative.

5. **Image generation failure:** Fall back to keyword-derived hue from description. If no keyword matches, use a neutral hue. Return what happened as the tool result so the GM has context. No frontend error indication; the absence of a background image is just a less rich atmosphere. Log server-side.

6. **Image storage:** Keep only the most recent mood image per adventure. Each mood change overwrites the previous. No cleanup logic needed.
