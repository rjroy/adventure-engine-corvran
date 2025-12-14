---
version: 1.0.0
status: Approved
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Dynamic Theming System Specification

## Executive Summary

Adventure Engine Corvran will dynamically adapt its visual presentation based on narrative mood and events. The GM AI determines theme shifts, triggering changes to colors, fonts, background images, and UI decorations. Transitions use dramatic fade+blur effects for immersive storytelling.

Background images are AI-generated on major narrative shifts using the existing art-gen-mcp infrastructure. The system supports 5 core emotional moods (calm, tense, ominous, triumphant, mysterious), with the architecture supporting future expansion.

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
- **REQ-F-7**: Images are stored persistently with metadata tags: mood, genre, and region
- **REQ-F-8**: Supported genres: sci-fi, steampunk, low-fantasy, high-fantasy, horror, modern, historical
- **REQ-F-9**: Supported regions: city, village, forest, desert, mountain, ocean, underground, castle, ruins
- **REQ-F-10**: On mood shift, system first searches for existing image matching mood + genre + region
- **REQ-F-11**: New image generated via art-gen-mcp only when no suitable match exists
- **REQ-F-12**: Generated images are tagged and added to the persistent catalog
- **REQ-F-13**: Fallback to a default/previous image if generation fails
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

## Non-Functional Requirements

- **REQ-NF-1** (Performance): Theme CSS variable updates complete in <50ms; no layout thrashing
- **REQ-NF-2** (Performance): Background image preload before transition begins when possible
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
  - art-gen-mcp (image generation via existing MCP infrastructure)
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
2. **Catalog Match**: When image exists for mood+genre+region combo, that image loads without calling art-gen-mcp
3. **Catalog Miss**: When no matching image exists, art-gen-mcp generates new image and stores it with tags
4. **Image Tagging**: Generated images appear in catalog with correct mood, genre, and region tags
5. **Fallback Handling**: When image generation fails, previous background persists; no visible error to user
6. **Contrast Validation**: All 5 theme states pass automated WCAG AA contrast checks
7. **Input Continuity**: Theme transition mid-typing does not lose input field focus or content
8. **Transition Smoothness**: Theme transition renders at 60fps without jank

## Open Questions

- [ ] What specific font families for each mood? (deferred to plan phase - design decision)
- [ ] Rate limiting for image generation per session? (deferred to plan phase - operational concern)

## Out of Scope

- Audio/ambient sound theming
- User-customizable themes
- Per-adventure theme configuration (all adventures use same mood palette)
- Animated background effects beyond fade transitions

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
