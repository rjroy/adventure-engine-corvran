---
version: 1.1.0
status: Approved
created: 2025-12-13
last_updated: 2025-12-14
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Dynamic Theming System Specification

## Executive Summary

Adventure Engine Corvran will dynamically adapt its visual presentation based on narrative mood and events. The GM AI determines theme shifts, triggering changes to colors, fonts, background images, and UI decorations. Transitions use dramatic fade+blur effects for immersive storytelling.

Background images are AI-generated on major narrative shifts using the Replicate API. The system supports 5 core emotional moods (calm, tense, ominous, triumphant, mysterious), with the architecture supporting future expansion.

## User Story

As a player, I want the game's visual atmosphere to shift with the story's mood, so that I feel more immersed in dramatic moments.

## Stakeholders

- **Primary**: Players experiencing adventures
- **Secondary**: Adventure authors/GMs defining theme palettes
- **Tertiary**: Infrastructure team (image generation API costs), developers maintaining theme system

## Success Criteria

1. Theme style changes (colors, fonts) apply within 500ms of GM triggering mood shift
2. Background image generation completes within 30 seconds; theme applies immediately with fallback background
3. Transitions render at 60fps without disrupting gameplay flow
4. All theme states pass WCAG 2.1 AA contrast requirements

## Functional Requirements

### Theme Definition
- **REQ-F-1**: System supports exactly 5 predefined mood themes: calm, tense, ominous, triumphant, mysterious
- **REQ-F-2**: Each theme defines: primary/secondary colors, text colors, background colors, font family, background image URL, accent decorations
- **REQ-F-3**: Theme definitions are data-driven (JSON/config), not hard-coded

### AI-Driven Theme Selection
- **REQ-F-4**: GM AI can emit theme change commands via the WebSocket protocol
- **REQ-F-5**: Theme commands specify target mood and optional transition style
- **REQ-F-6**: Frontend receives and applies theme changes in response to GM messages

### Background Image Management
- **REQ-F-7**: Images are stored persistently using filename-based tagging convention: `{mood}-{genre}-{region}-{timestamp}.png`
- **REQ-F-8**: Supported genres: sci-fi, steampunk, low-fantasy, high-fantasy, horror, modern, historical
- **REQ-F-9**: Supported regions: city, village, forest, desert, mountain, ocean, underground, castle, ruins
- **REQ-F-10**: On mood shift, system first searches for existing image matching mood + genre + region
- **REQ-F-11**: New image generated via Replicate API only when no suitable match exists
- **REQ-F-12**: Generated images are saved with filename convention and automatically discoverable via glob search
- **REQ-F-13**: Fallback to mood-specific default image (e.g., calm.jpg) if generation fails; no previous image tracking
- **REQ-F-14**: Image prompts are constructed from theme mood + genre + region + narrative context

### Transitions
- **REQ-F-15**: Theme transitions must be visually smooth without jarring cuts or flashing
- **REQ-F-16**: Transition duration is configurable (default: 1500ms)
- **REQ-F-17**: Background image loads asynchronously and fades in when ready

### UI Theming Scope
- **REQ-F-18**: Colors apply to all existing CSS variables (primary, secondary, background, surface, text, borders)
- **REQ-F-19**: Fonts can change per theme (with web-safe fallbacks)
- **REQ-F-20**: UI decorations include: border styles and shadow effects
- **REQ-F-21**: Narrative entry styling adapts to theme (player/GM message styling)

### Error Handling
- **REQ-F-22**: System must validate theme_change mood values; invalid values maintain current theme
- **REQ-F-23**: System must debounce rapid theme changes (ignore duplicate mood within 1 second)
- **REQ-F-24**: Adventures start with default "calm" theme
- **REQ-F-25**: System shall rate-limit image generation to maximum 5 generations per session
- **REQ-F-26**: Backend shall also debounce theme changes (1 second duplicate mood filter) in addition to frontend debouncing

## Non-Functional Requirements

- **REQ-NF-1** (Performance): Theme CSS variable updates complete in <50ms; no layout thrashing
- **REQ-NF-2** (Performance): Background images load asynchronously with fade-in on ready (explicit preloading deferred)
- **REQ-NF-3** (Usability): Theme transitions must not interrupt text input or reading flow
- **REQ-NF-4** (Accessibility): All theme color combinations meet WCAG 2.1 AA contrast (4.5:1 for text)
- **REQ-NF-5** (Reliability): Image generation failures degrade gracefully (use cached/fallback)
- **REQ-NF-6** (Maintainability): Theme definitions externalized for easy addition of new moods
- **REQ-NF-7** (Reliability): Image generation timeout after 30 seconds triggers fallback behavior
- **REQ-NF-8** (State): Theme state is session-scoped; reconnection resets to adventure default theme

## Explicit Constraints (DO NOT)

- Do NOT include audio/sound features (visual only for MVP)
- Do NOT generate images on every GM response (only on major mood shifts)
- Do NOT block UI interaction during theme transitions
- Do NOT hard-code theme values in component CSS
- Do NOT require page refresh for theme changes

## Technical Context

- **Existing Stack**: React 19, TypeScript, Vite, CSS variables in index.css
- **Integration Points**:
  - WebSocket protocol (add new message type for theme commands)
  - Replicate API (image generation via replicate npm package)
  - Existing CSS variable system in index.css
- **Patterns to Respect**:
  - BEM CSS naming convention
  - Component-scoped CSS files
  - Protocol types in shared/protocol.ts

## Protocol Extension

The WebSocket protocol must support theme change commands that specify:
- Target mood identifier (one of the 5 predefined moods)
- Genre identifier (sci-fi, steampunk, low-fantasy, high-fantasy, horror, modern, historical)
- Region identifier (city, village, forest, desert, mountain, ocean, underground, castle, ruins)
- Optional flag to force new image generation (skip catalog search)
- Optional narrative context for image prompt construction
- Optional transition duration override

Detailed protocol message structure will be defined in the plan phase.

## Acceptance Tests

1. **Theme Switch**: When GM emits theme_change with mood="ominous", UI transitions to dark palette within 500ms
2. **Catalog Match**: When image exists for mood+genre+region combo, that image loads without calling Replicate API
3. **Catalog Miss**: When no matching image exists, Replicate API generates new image and stores it with filename tags
4. **Image Tagging**: Generated images appear in catalog with correct mood, genre, and region tags
5. **Fallback Handling**: When image generation fails, previous background persists; no visible error to user
6. **Contrast Validation**: All 5 theme states pass automated WCAG AA contrast checks
7. **Input Continuity**: Theme transition mid-typing does not lose input field focus or content
8. **Transition Smoothness**: Theme transition renders at 60fps without jank

## Open Questions

- [x] What specific font families for each mood?
  - **Resolved**: Defined in themes.json. Each mood uses web-safe font stacks (system-ui based for readability).
- [x] Rate limiting for image generation per session?
  - **Resolved**: Maximum 5 generations per session (see REQ-F-25).

## Out of Scope

- Audio/ambient sound theming
- User-customizable themes
- Per-adventure theme configuration (all adventures use same mood palette)
- Animated background effects beyond fade transitions

## Architectural Rationale

This section documents key architectural decisions made during implementation that differ from or extend the original spec.

### Replicate API vs art-gen-mcp (REQ-F-11, REQ-F-12)

The implementation uses Replicate SDK directly instead of art-gen-mcp for:
1. Direct control over model selection and parameters (flux-schnell model)
2. Simplified error handling and timeout management with AbortController
3. Reduced dependency chain (one npm package vs MCP server)

### Filename-Based Catalog (REQ-F-7)

Images use a naming convention pattern (`{mood}-{genre}-{region}-{timestamp}.png`) instead of a separate metadata database. This approach:
1. Eliminates metadata synchronization issues
2. Makes catalog entries self-documenting
3. Enables simple glob-based search without additional infrastructure

### No Image Preloading (REQ-NF-2)

Explicit preloading was not implemented as async loading with fallback provides acceptable UX without complexity. The image fades in when ready, which is visually acceptable. May revisit if performance issues arise in user testing.

### Dual Debouncing (REQ-F-23, REQ-F-26)

Both frontend and backend implement 1-second debouncing for duplicate moods. This redundancy ensures:
1. Network latency doesn't cause duplicate image generations
2. Rapid Claude outputs don't overwhelm the system
3. Either layer can protect against rapid changes independently

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
