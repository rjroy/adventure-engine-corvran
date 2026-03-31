---
title: Dynamic Mood System
date: 2026-03-30
status: approved
tags: [mood, themes, ux, atmosphere, visual, gm-tools, sse, mcp, image-generation, color, replicate]
modules: [backend, web, shared]
related: [.lore/issues/dynamic-mood-themes.md, .lore/brainstorm/dynamic-mood-system.md, .lore/research/dynamic-color-palettes.md, .lore/specs/engine-dice-tool.md]
req-prefix: MOOD
---

# Spec: Dynamic Mood System

## Overview

The GM can shift the visual atmosphere of the adventure at any time by calling a `set_mood` MCP tool with a natural-language description of the scene. The backend generates an image from that description, extracts the dominant color to derive a palette seed, and emits a `mood` SSE event carrying the hue angle and image path. The frontend applies a hue-rotated palette and a low-opacity background image simultaneously. Mood is persisted to `adventure.md` frontmatter so the atmosphere is restored on page reload without another generation call.

This is the complete V1 scope. The system replaces a prior mood implementation that is no longer present. This spec starts from scratch.

---

## Entry Points

- GM calls `mcp__corvran__set_mood` during gameplay when the scene changes or the emotional atmosphere shifts
- `POST /adventures/:id/message` stream emits a `mood` SSE event when the tool fires
- `GET /adventures/:id` includes `currentMood` in the response so the page can apply the atmosphere on mount

---

## Requirements

### Data Structures

**REQ-MOOD-01: MoodState type**

Define `MoodState` in `packages/shared/src/schemas/adventures.ts`:

```typescript
export const MoodStateSchema = z.object({
  hue: z.number().min(0).max(360),            // OKLCH hue angle, degrees
  description: z.string(),                    // GM's original scene description
  imagePath: z.string().optional(),           // relative path within adventure dir, e.g. "mood.png"
});

export type MoodState = z.infer<typeof MoodStateSchema>;
```

**REQ-MOOD-02: Mood SSE event schema**

Add `MoodEventSchema` alongside the existing SSE event schemas in `packages/shared/src/schemas/adventures.ts`:

```typescript
export const MoodEventSchema = z.object({
  hue: z.number(),
  description: z.string(),
  imagePath: z.string().optional(),   // absent when image generation failed
});
```

**REQ-MOOD-03: AdventureDetailSchema extended**

Add `currentMood` to `AdventureDetailSchema` in `packages/shared/src/schemas/adventures.ts`:

```typescript
export const AdventureDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  character: z.string().nullable(),
  world: z.string().nullable(),
  hasHistory: z.boolean(),
  system: z.string().nullable(),
  concept: z.string().nullable(),
  currentMood: MoodStateSchema.nullable(),   // null if no mood has been set
});
```

**REQ-MOOD-04: AdventureConfig extended**

Extend `AdventureConfig` in `packages/backend/src/services/adventure-config.ts` with mood and art style fields:

```typescript
export interface AdventureConfig {
  system: string | null;
  name: string | null;
  concept: string | null;
  artStyle: string | null;       // optional art style for image generation
  mood: {
    hue: number;
    description: string;
    imagePath: string | null;
  } | null;
  warning?: string;
}
```

**REQ-MOOD-05: adventure.md frontmatter fields**

The following fields are stored in `adventure.md` YAML frontmatter:

```yaml
---
name: The Shattered Vale
system: daggerheart-system
art_style: "Dark oil painting, baroque chiaroscuro, muted earth tones"
mood_hue: 142
mood_description: "Ancient forest clearing at dawn, mist through old-growth trees"
mood_image: mood.png
---
```

- `art_style`: optional. If present, prepended to the GM's description when generating the mood image. Provides visual coherence across all mood changes within an adventure. Set during creation or updated by the player at any time.
- `mood_hue`: OKLCH hue angle, 0–360. Persisted after each successful mood change.
- `mood_description`: The GM's last mood description. Persisted for display and context.
- `mood_image`: Filename of the generated image, relative to the adventure directory (always `mood.png`). Absent if no image has been generated.

`parseAdventureConfig` in `adventure-config.ts` must be extended to read all four new fields using the same regex-per-field pattern as `system` and `name`. Numeric fields (`mood_hue`) are parsed with `parseFloat`; invalid values produce `null`, not an error.

---

### MCP Tool

**REQ-MOOD-06: Tool registration**

Add `set_mood` to the corvran MCP server. The server is already named `corvran`; the AI sees the tool as `mcp__corvran__set_mood`. The tool lives in a new file `packages/backend/src/services/mood-tool.ts`, following the same module shape as `dice-tool.ts`. The factory function is `createMoodTool`.

**REQ-MOOD-07: Tool input schema**

```typescript
{
  description: string   // natural-language scene atmosphere description (required, 1–500 chars)
}
```

The description is the only parameter. The GM provides a scene description; the system derives everything else. The GM does not provide hue values, image styles, or any technical parameters.

**REQ-MOOD-08: Tool output**

The tool returns the string `"mood set"` on success, or a brief error description if image generation failed (e.g., `"mood set (image generation failed — using fallback hue)"`). The GM receives this as a tool result. It is short enough that the GM does not weave it into narrative.

**REQ-MOOD-09: Session runner registration**

In `packages/backend/src/services/session-runner.ts`:
- `createMoodTool` is called with the adventure's context (adventure ID and adventure path, needed to save the image and write frontmatter)
- The tool instance is included in the `mcpServers.corvran` definition alongside `roll_dice`
- `"mcp__corvran__set_mood"` is added to the `allowedTools` array

Because `set_mood` requires per-adventure context (the adventure path), the mood tool instance is created per-session, not once at construction time. The dice tool (stateless) remains constructed once; the mood tool is constructed per-query invocation.

**REQ-MOOD-10: Tool handler execution order**

When the GM calls `set_mood`, the tool handler must:

1. Read `art_style` from the adventure's `adventure.md` frontmatter (if present)
2. Construct the image prompt: `artStyle ? "${artStyle}. ${description}" : description`
3. Call the Replicate API to generate a mood image (REQ-MOOD-11 through REQ-MOOD-13)
4. On image generation success:
   a. Extract the dominant OKLCH hue from the image (REQ-MOOD-15)
   b. Save `mood.png` to the adventure directory
   c. Write `mood_hue`, `mood_description`, and `mood_image: mood.png` to `adventure.md` frontmatter
5. On image generation failure:
   a. Derive fallback hue from description keywords (REQ-MOOD-17)
   b. Write `mood_hue` and `mood_description` to `adventure.md` frontmatter (no `mood_image`)
6. Emit the `mood` SSE event (REQ-MOOD-18)
7. Return the tool result string (REQ-MOOD-08)

The SSE event fires only after image generation and persistence are complete (or have failed). The GM's narrative continues streaming in parallel during this processing; the mood event will arrive after the text delta stream for that message segment.

---

### Image Generation

**REQ-MOOD-11: Replicate API call**

The backend calls Replicate's predictions API using `FLUX Schnell` (`black-forest-labs/flux-schnell`) synchronously via the `Prefer: wait` header. This avoids polling and completes in roughly 2–5 seconds total round-trip.

Request shape:
```
POST https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions
Authorization: Token ${REPLICATE_API_TOKEN}
Content-Type: application/json
Prefer: wait

{ "input": { "prompt": "<art_style + description>" } }
```

A successful response (HTTP 200 with `status: "succeeded"`) includes an `output` array containing the image URL. The implementation lives in a new utility module `packages/backend/src/services/image-gen.ts`, exporting `generateMoodImage(prompt: string): Promise<string | null>`. Returns the image URL on success, `null` on failure.

**REQ-MOOD-12: Prompt construction**

The image prompt is `art_style ? \`${artStyle}. ${description}\` : description`. The art style is prepended verbatim. No additional prompt engineering is applied at the tool level. The GM's description is used unchanged.

**REQ-MOOD-13: Image storage**

The generated image is downloaded from the Replicate output URL and saved to `<adventurePath>/mood.png`, overwriting any previous mood image. No cleanup of previous images is needed — there is only ever one mood image per adventure. The download must complete before the tool handler proceeds; do not return the tool result before the file is written.

The backend does not implement a CDN or URL signing. The image is served directly from disk via a new backend endpoint (REQ-MOOD-25).

**REQ-MOOD-14: Image generation failure handling**

If the Replicate API call fails (network error, non-200 status, timeout after 30 seconds, `status: "failed"`), the tool does not throw or crash the session. It:
- Falls back to the keyword-derived hue (REQ-MOOD-17)
- Proceeds without `imagePath` in the persisted mood state and SSE event
- Returns `"mood set (image generation failed — using fallback hue)"` to the GM
- Logs the error server-side at WARN level with the adventure ID and error details

`REPLICATE_API_TOKEN` is a required environment variable when image generation is enabled. If the variable is absent at server startup, log a WARN and disable image generation for all mood tool calls; all calls fall back to keyword-derived hue silently.

---

### Color Extraction

**REQ-MOOD-15: Dominant hue extraction**

After saving `mood.png` to disk, the backend extracts the dominant color from the image server-side. The implementation decodes the PNG, samples every Nth pixel (N chosen to limit processing time to under 100ms for typical generation output sizes), and finds the most frequent hue bucket using an OKLCH hue histogram with 36 buckets (10° each).

The extraction logic lives in `packages/backend/src/services/color-extract.ts`, exporting `extractDominantHue(imagePath: string): Promise<number>`. Returns a hue angle in degrees [0, 360).

**REQ-MOOD-16: OKLCH conversion**

The extracted dominant color (in sRGB from the PNG) must be converted to OKLCH to obtain the hue angle. Use the `culori/fn` package for the conversion. The conversion pulls only `useMode`, `modeOklch`, and `converter` from `culori/fn` (tree-shaken import). Add `culori` to `packages/backend/package.json` dependencies.

**REQ-MOOD-17: Fallback keyword→hue map**

When image generation fails, or when the extracted hue cannot be determined (e.g., entirely achromatic image), the backend derives a fallback hue from the GM's description using this keyword map:

| Keywords | Hue |
|---|---|
| fire, flame, lava, ember, inferno, burning | 20 |
| blood, crimson, war, rage | 5 |
| forest, tree, moss, vine, growth, verdant | 142 |
| ocean, sea, water, river, tide | 220 |
| sky, air, wind, dawn, sunrise, morning | 195 |
| night, void, darkness, shadow, abyss | 270 |
| ice, snow, frost, tundra, glacier | 205 |
| desert, sand, stone, ruin, ancient | 50 |
| magic, arcane, mystical, ethereal, fey | 300 |
| poison, plague, decay, rot, corruption | 120 |

Match by checking if the description (lowercased) contains any keyword. Use the first match in order of the table. If no keyword matches, use the default hue of 270 (the current palette hue).

---

### SSE Event

**REQ-MOOD-18: `mood` event type**

The `set_mood` tool result does not emit a `tool_use` SSE event. It emits a `mood` event instead. This keeps mood changes invisible in the chat log — the player sees the visual shift; they do not see "set_mood: deep underground cavern" appear as a tool event in the narrative feed.

**REQ-MOOD-19: Event payload**

```typescript
// SSE event structure
event: "mood"
data: JSON.stringify({
  hue: number,            // OKLCH hue angle, 0–360
  description: string,    // GM's original description
  imagePath?: string,     // present when image was generated; absent on fallback
})
```

`imagePath` when present is the relative path within the adventure directory, e.g., `"mood.png"`. The frontend constructs the full URL as `/api/daemon/adventures/:id/mood-image`.

**REQ-MOOD-20: Backend conditional in adventure-routes.ts**

In the `msg.type === "user"` block in `packages/backend/src/routes/adventure-routes.ts` where `tool_result` blocks are processed, add a check before emitting:

```typescript
if (toolName === "set_mood") {
  // The mood tool handler has already fired its SSE event internally.
  // Do not emit a tool_use event for this tool.
} else {
  await stream.writeSSE({
    event: "tool_use",
    data: JSON.stringify({ name: toolName, result }),
  });
}
```

The `mood` SSE event is emitted from within the `set_mood` tool handler itself (not from the route's `tool_result` processing), so the route handler simply suppresses the `tool_use` emission for this tool name.

The `stream` object must be passed into the mood tool factory so the tool handler can call `stream.writeSSE` directly. This is the same stream reference used by the route handler to emit `text` and `tool_use` events.

---

### Persistence

**REQ-MOOD-21: Frontmatter write**

After a successful mood change, write (or update) the mood fields in `adventure.md` frontmatter. The write uses a regex-replace approach: scan the existing frontmatter for `mood_hue:`, `mood_description:`, and `mood_image:` lines and replace them; add them if absent. This must not disturb other frontmatter fields or the concept body.

The adventure service exposes a `setMood(adventureId: string, mood: MoodState): Promise<void>` method responsible for reading `adventure.md`, updating the relevant frontmatter fields, and writing the file back. If `mood.imagePath` is absent (fallback path), remove any existing `mood_image:` line rather than leaving a stale path.

**REQ-MOOD-22: parseAdventureConfig extension**

`parseAdventureConfig` at `packages/backend/src/services/adventure-config.ts` must be extended to read and return:

- `artStyle`: string | null (from `art_style:` frontmatter field, stripped of quotes)
- `mood`: `{ hue: number; description: string; imagePath: string | null } | null` — populated when all of `mood_hue` (parseable number) and `mood_description` are present; otherwise null. `imagePath` is null if `mood_image` is absent.

**REQ-MOOD-23: Adventure detail response**

`GET /adventures/:id` returns `currentMood` in the response body. When `AdventureConfig.mood` is non-null, it maps to `currentMood` in the response. When null, `currentMood: null` is returned.

The `AdventureDetailSchema` in `packages/shared/src/schemas/adventures.ts` already includes `currentMood: MoodStateSchema.nullable()` per REQ-MOOD-03. The backend adventure detail handler must be updated to populate this field.

---

### Image Serving

**REQ-MOOD-25: GET /adventures/:id/mood-image**

Add a new route to `packages/backend/src/routes/adventure-routes.ts` that reads and returns the mood image file:

```
GET /adventures/:id/mood-image
```

Response: the raw PNG file with `Content-Type: image/png`. Returns 404 with a JSON error body if the adventure does not exist or has no mood image on disk.

The Next.js proxy at `packages/web/app/api/daemon/[...path]/route.ts` already passes all requests through; no proxy changes are needed. The frontend constructs the URL as `/api/daemon/adventures/:id/mood-image`.

---

### Frontend Application

**REQ-MOOD-26: `applyMood` utility**

Create `packages/web/lib/apply-mood.ts` exporting:

```typescript
export function applyMood(hue: number, imageSrc?: string): void
```

This function is the single entry point for all mood applications: SSE event arrival, page mount from `currentMood`, and default reset. It must not trigger React re-renders.

**REQ-MOOD-27: CSS variable updates**

`applyMood` calls `document.documentElement.style.setProperty()` for the following variables, deriving values from the seed hue `H`:

| Variable | Value |
|---|---|
| `--bg-base` | `oklch(20% 0.045 ${H})` |
| `--bg-surface` | `oklch(25% 0.045 ${H})` |
| `--bg-elevated` | `oklch(30% 0.045 ${H})` |
| `--text-primary` | `oklch(90% 0.024 ${(H + 175) % 360})` |
| `--text-secondary` | `oklch(65% 0.024 ${(H + 175) % 360})` |
| `--text-tertiary` | `oklch(45% 0.024 ${(H + 175) % 360})` |
| `--accent` | `oklch(65% 0.135 ${(H + 168) % 360})` |
| `--accent-hover` | `oklch(85% 0.135 ${(H + 168) % 360})` |
| `--gm-accent` | `oklch(70% 0.075 ${(H + 328) % 360})` |

Lightness and chroma values are fixed constants from the current palette. Only hues rotate. The `color-mix()` derived variables (`--accent-dim`, `--accent-border`, `--gm-accent-dim`, `--gm-border`) recalculate automatically because they reference the base variables.

The following variables are NOT updated by `applyMood`; they have fixed semantic meanings and must remain stable across mood changes:
- `--badge-new`, `--badge-new-text`, `--badge-cont`, `--badge-cont-text`
- `--tool-accent`, `--tool-accent-dim`, `--tool-accent-border`
- `--stop-red-*`, `--error-*`
- All typography variables

**REQ-MOOD-28: `@property` declarations**

Add `@property` registrations in `packages/web/app/globals.css` for the nine base color variables listed in REQ-MOOD-27. Each registration:

```css
@property --bg-base {
  syntax: '<color>';
  initial-value: oklch(20% 0.045 270);
  inherits: true;
}
```

Use the current default value (hue 270 for backgrounds, 85 for text/accent, 238 for GM) as `initial-value`. `@property` registration is required for CSS transitions on custom properties to work. Browser support: Chrome 85+, Firefox 128+, Safari 15.4+. No polyfill needed for this project's target audience.

**REQ-MOOD-29: CSS transitions**

Add transition declarations to `packages/web/app/globals.css` for the registered variables:

```css
:root {
  transition:
    --bg-base 2s ease,
    --bg-surface 2s ease,
    --bg-elevated 2s ease,
    --text-primary 1.5s ease,
    --text-secondary 1.5s ease,
    --text-tertiary 1.5s ease,
    --accent 1.5s ease,
    --accent-hover 1.5s ease,
    --gm-accent 1.5s ease;
}
```

Backgrounds transition over 2 seconds; text and accent over 1.5 seconds. The asymmetry prevents a jarring visual lurch where text changes before the background it sits on has finished shifting. Do not add transitions to the `color-mix()` derived variables or semantic variables.

**REQ-MOOD-30: Background image layer**

Add a fixed-position `<div>` behind all content in the adventure page layout (`packages/web/app/adventure/[id]/page.tsx` or its layout parent). This element:

- Has `position: fixed`, `inset: 0`, `z-index: -1`, `pointer-events: none`
- Displays the mood background image with `background-size: cover`, `background-position: center`
- Has `opacity: 0.1` (10% — atmospheric texture, not competing with text)
- Starts with no background image (transparent, invisible)

`applyMood` sets `backgroundImage` on this element by ID (`mood-bg-layer`). On image swap, set the new image directly; the browser's own rendering handles the repaint. A CSS crossfade between two layers is deferred to a future enhancement.

**REQ-MOOD-31: SSE hook integration**

In `packages/web/lib/use-adventure-stream.ts`, add handling for the `mood` event type. When a `mood` event arrives:

1. Parse the payload as `MoodEventSchema`
2. Construct the image URL: `imagePath ? \`/api/daemon/adventures/${adventureId}/mood-image\` : undefined`
3. Call `applyMood(hue, imageUrl)`

The mood event does not update any React state and does not trigger a re-render. `applyMood` operates only on the DOM.

**REQ-MOOD-32: Page mount application**

In the adventure page component, after the `GET /adventures/:id` fetch completes, if `currentMood` is non-null:

1. Construct the image URL: `currentMood.imagePath ? \`/api/daemon/adventures/${adventureId}/mood-image\` : undefined`
2. Call `applyMood(currentMood.hue, imageUrl)`

This restores the atmosphere on page load before any messages arrive. Apply synchronously during the render cycle after data is available, not in a `useEffect` that fires after paint (which would produce a visible flash of the default palette).

---

### Bootstrap Prompt

**REQ-MOOD-33: GM-craft skill instructions**

Add the following instructions to `plugins/corvran/skills/gm-craft/SKILL.md` (or its equivalent system prompt section, wherever GM behavior instructions live):

```markdown
## Mood and Atmosphere

Use the `mcp__corvran__set_mood` tool when the scene changes or the emotional atmosphere shifts significantly. A mood change can mark a scene transition.

Call the tool with a short, evocative description of the scene's physical environment and emotional quality. Include sensory details that define the atmosphere. Examples:
- "Deep underground cavern, bioluminescent fungi on damp stone walls, the distant sound of water"
- "Windswept clifftop fortress at dusk, siege fires in the valley below, the smell of smoke"
- "Candlelit archive, dust motes in amber light, the rustle of ancient pages"

Do not describe colors, art styles, or visual parameters. Describe the scene. The system generates the visuals.

Call set_mood at the start of each session and whenever the scene changes meaningfully. Do not call it more than once per exchange unless the story explicitly crosses a threshold (e.g., the party enters a new environment mid-scene).
```

---

### Scope Boundaries

**REQ-MOOD-34: In scope for V1**

- `set_mood` MCP tool with a single `description` parameter
- Replicate API integration (FLUX Schnell, synchronous) with 30-second timeout
- Server-side dominant color extraction from generated PNG
- OKLCH hue-rotation palette applied via `setProperty()` on 9 CSS custom properties
- `@property` declarations and CSS transitions for smooth atmospheric shift
- Fixed-position background image layer at 10% opacity
- `mood` SSE event type (suppressed `tool_use` emission for this tool)
- adventure.md frontmatter persistence: `art_style`, `mood_hue`, `mood_description`, `mood_image`
- `currentMood` in `GET /adventures/:id` response
- `GET /adventures/:id/mood-image` endpoint for image serving
- Page mount mood restoration
- Keyword fallback hue map (10 keyword groups)
- `REPLICATE_API_TOKEN` environment variable gate

**REQ-MOOD-35: Out of scope (future)**

- Multiple saved mood images per adventure (only the most recent is kept)
- Higher-quality Replicate models (FLUX Dev, FLUX Pro). The model string is the only change needed to upgrade; document this at the call site.
- Crossfade animation between background images (replace with fade-in/fade-out two-layer approach)
- Player-visible mood history or mood name labeling
- Per-mood transition timing tuning
- `culori` library on the frontend for contrast verification (OKLCH structural guarantees make this unnecessary for V1 given fixed lightness values)
- GM-provided art style overrides per mood call (art style lives in adventure frontmatter, not the tool)
- Scene cards, sidebars, or full-prominence image display

---

## Testing

**REQ-MOOD-36: mood-tool.ts unit tests**

Tests at `packages/backend/tests/services/mood-tool.test.ts`:

- Tool returns `"mood set"` when image generation succeeds
- Tool returns the fallback message when image generation returns null
- Prompt construction: when `artStyle` is present, it is prepended to `description`
- Prompt construction: when `artStyle` is absent, description is used alone
- `setMood` is called with the correct hue and description after successful generation
- `setMood` is called with fallback hue when generation fails

These tests inject mock dependencies for image generation, color extraction, and the adventure service. No real Replicate calls in tests.

**REQ-MOOD-37: image-gen.ts unit tests**

Tests at `packages/backend/tests/services/image-gen.test.ts`:

- Returns image URL string on successful Replicate response (`status: "succeeded"`, `output` array present)
- Returns null on non-200 HTTP status
- Returns null on `status: "failed"` in response body
- Returns null on network error (injected fetch throws)
- Prompt is included in the request body

Tests inject a mock HTTP client. No real network calls.

**REQ-MOOD-38: color-extract.ts unit tests**

Tests at `packages/backend/tests/services/color-extract.test.ts`:

- Returns a number in [0, 360) for a valid PNG with clear dominant hue
- Returns the neutral fallback (270) for an achromatic image (all grays)
- Correctly identifies distinct hue families (warm vs. cool dominant colors)

Tests use small synthetic PNG data or fixture images; no Replicate output needed.

**REQ-MOOD-39: parseAdventureConfig tests**

Extend the existing config parser tests to cover:

- Parses `art_style` field (quoted and unquoted)
- Parses `mood_hue`, `mood_description`, `mood_image` as a complete mood object
- Returns `mood: null` when mood fields are absent
- Returns `mood: null` when `mood_hue` is present but not a valid number
- `imagePath` is null in mood when `mood_image` field is absent

**REQ-MOOD-40: apply-mood.ts unit tests**

Tests at `packages/web/tests/lib/apply-mood.test.ts`:

- Correct OKLCH strings set for all 9 variables at a given hue
- Hue offsets are applied correctly (text at H+175, accent at H+168, GM at H+328 mod 360)
- Background image layer gets `backgroundImage` set when `imageSrc` provided
- Background image layer `backgroundImage` is cleared (empty string) when `imageSrc` absent

Tests mock `document.documentElement.style.setProperty` and the background layer element via jsdom or equivalent.

**REQ-MOOD-41: Keyword fallback tests**

Tests at `packages/backend/tests/services/mood-tool.test.ts` (same file as REQ-MOOD-36):

- Each keyword group maps to the correct hue
- First match wins when multiple keywords appear in the description
- Default hue 270 returned when no keyword matches
- Matching is case-insensitive

---

## Assumptions

1. The Replicate `Prefer: wait` header is supported for FLUX Schnell and produces a synchronous response with the completed prediction. Based on Replicate API documentation and the research at `.lore/research/dynamic-color-palettes.md`.

2. FLUX Schnell output URLs are temporary. The image is downloaded and saved before the URL expires (~1 hour). Generation-to-download happens within the tool handler, well within the expiry window.

3. `@property` CSS registration is supported by all target browsers for this project. Browser support data: Chrome 85+, Firefox 128+, Safari 15.4+. Assumed adequate.

4. The hue offset constants (text at +175, accent at +168, GM at +328) preserve legibility and visual coherence across the full hue range. These are derived from the current palette's hue relationships. Edge cases at extreme hues (near 0°/360°) are handled correctly by modulo arithmetic. If specific hue combinations produce poor contrast, the constants may need tuning in implementation — but the structural guarantee from fixed OKLCH lightness values (text 90%/background 20%) ensures WCAG 4.5:1 is met regardless of hue.

5. Only `adventure-routes.ts` emits SSE events. The `set_mood` tool handler receives the `stream` reference as an injected dependency. This requires that the session runner (or its factory) receive and pass the stream reference to the mood tool factory per-invocation. This is a departure from how the dice tool is wired (no stream access needed for dice). Verify the session runner's structure before implementation.

6. The adventure service's `setMood` method reads and writes `adventure.md` synchronously within a single tool call. Concurrent mood changes in the same adventure are not expected and are not guarded against in V1.

7. `culori` is added as a backend dependency only. The frontend does not use `culori`; all color math is template-literal hue rotation using the fixed constants above.
