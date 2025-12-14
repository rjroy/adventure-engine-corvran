---
specification: [.sdd/specs/2025-12-13-dynamic-theming.md](./../specs/2025-12-13-dynamic-theming.md)
status: Approved
version: 1.0.0
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Dynamic Theming System - Technical Plan

## Overview

The Dynamic Theming System enables Adventure Engine Corvran to adapt its visual presentation based on narrative mood. The GM AI determines theme shifts during gameplay, triggering changes to colors, fonts, and background images. The architecture uses a three-tier approach:

1. **Protocol Extension**: New WebSocket message type `theme_change` from server to client
2. **Frontend Theme Engine**: React context-based state management with CSS variable application
3. **Background Image Service**: Catalog-first approach with art-gen-mcp fallback generation

The system prioritizes performance (CSS variable updates <50ms), graceful degradation (fallbacks at every failure point), and accessibility (WCAG 2.1 AA compliance).

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │ ThemeContext│───▶│CSS Variables│───▶│ All UI Components   │    │
│  │  Provider   │     │  (index.css)│     │ (via var() refs)    │    │
│  └─────────────┘     └─────────────┘     └─────────────────────┘    │
│         ▲                                                           │
│         │ theme_change                                              │
│  ┌──────┴──────┐                                                    │
│  │ useWebSocket│                                                    │
│  └──────┬──────┘                                                    │
└─────────┼───────────────────────────────────────────────────────────┘
          │ WebSocket
┌─────────┴───────────────────────────────────────────────────────────┐
│                         Backend (Bun/Hono)                          │
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────────────┐   │
│  │ GameSession │───▶│BackgroundImg│───▶│   art-gen-mcp        │   │
│  │(GM decides) │     │   Service   │     │   (Replicate)        │   │
│  └─────────────┘     └──────┬──────┘     └──────────────────────┘   │
│                             │                                       │
│                      ┌──────▼──────┐                                │
│                      │Image Catalog│                                │
│                      │  (SQLite)   │                                │
│                      └─────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **ThemeContext** | Holds current mood, applies CSS variables, manages transitions |
| **BackgroundImageService** | Queries catalog, requests generation, manages URLs |
| **ImageCatalog** | SQLite persistence for mood/genre/region-tagged images |
| **GameSession** | Interprets GM output for theme commands, emits protocol messages |

### UI Component Theming Mechanics

Theme changes propagate to UI components via CSS variable inheritance:

1. **ThemeContext** receives `theme_change` WebSocket message
2. For each variable in the theme definition, calls `document.documentElement.style.setProperty()`
3. All components automatically re-render with new colors/fonts because they reference `var(--*)` tokens

**Font Switching** (REQ-F-19):
- `--font-family` variable set on `:root`, inherited by `body` and all descendants
- Each theme specifies a font stack with web-safe fallbacks (e.g., `'Cinzel', Georgia, serif`)
- Font files preloaded via `<link rel="preload">` tags in index.html for common fonts

**Decoration Switching** (REQ-F-20):
- `--accent-border-style` controls border-left style on NarrativeEntry (solid, dashed, dotted)
- `--accent-shadow` controls box-shadow on panels and cards
- CSS rules reference these variables: `box-shadow: var(--accent-shadow);`

**Narrative Entry Styling** (REQ-F-21):
- Player messages use `--color-player-bg` and `--color-player-border`
- GM messages use `--color-gm-bg` and `--color-gm-border`
- These variables already exist in index.css and are theme-specific
- On theme change, message backgrounds shift to match mood (e.g., darker for ominous)

## Technical Decisions

### TD-1: CSS Variable Updates via JavaScript
**Choice**: Update CSS variables on `:root` via `document.documentElement.style.setProperty()`
**Requirements**: REQ-F-18, REQ-NF-1
**Rationale**:
- Existing codebase uses CSS variables extensively (`--color-primary`, `--color-background`, etc.)
- Direct property updates are synchronous and complete in <1ms (well under 50ms target)
- No need for CSS-in-JS libraries or runtime style injection
- Maintains existing BEM class structure - components already reference variables
- Alternative (CSS class swapping) would require duplicating all color definitions per theme

### TD-2: React Context for Theme State
**Choice**: Single `ThemeContext` provider at App root with `useTheme()` hook
**Requirements**: REQ-F-6, REQ-F-22, REQ-F-23
**Rationale**:
- Provides centralized state for current mood, transition status, background URL
- Enables debouncing logic in one place (REQ-F-23: 1 second debounce)
- Alternative (Redux/Zustand) unnecessary for simple state that changes infrequently
- Components only need to read theme state, not dispatch complex actions

### TD-3: SQLite for Image Catalog
**Choice**: SQLite database in backend for image metadata persistence
**Requirements**: REQ-F-7, REQ-F-10, REQ-F-12
**Rationale**:
- Single-file database, no external service dependencies
- Supports indexed queries by mood + genre + region combination
- Backend already runs on Bun which has excellent SQLite support via `bun:sqlite`
- Alternative (JSON file) doesn't scale well with hundreds of images, no efficient querying
- Alternative (PostgreSQL) overkill for single-instance deployment

### TD-4: External Theme Definitions File
**Choice**: `themes.json` configuration file for all mood definitions
**Requirements**: REQ-F-1, REQ-F-2, REQ-F-3, REQ-NF-6
**Rationale**:
- Satisfies REQ-F-3 explicitly: "Theme definitions are data-driven (JSON/config), not hard-coded"
- Single source of truth for colors, fonts, and accent styles per mood
- Easy to add new moods without code changes
- Can be validated at startup for WCAG compliance
- Loaded once on frontend init, cached in ThemeContext

### TD-5: Catalog-First Image Strategy
**Choice**: Always search catalog before generating new images
**Requirements**: REQ-F-10, REQ-F-11, REQ-NF-5, REQ-NF-7
**Rationale**:
- Image generation is expensive ($0.10-0.50) and slow (10-30 seconds)
- Most gameplay will cycle through similar mood/genre/region combinations
- Catalog hit avoids API costs and provides instant background change
- Only generate when truly novel combination requested
- Background URL served immediately from catalog; generation is async fallback

### TD-6: art-gen-mcp via MCP Protocol
**Choice**: Call art-gen-mcp tools directly from backend via MCP client
**Requirements**: REQ-F-11, REQ-F-14
**Rationale**:
- art-gen-mcp already exists in the repository with Replicate integration
- MCP protocol provides structured tool interface with progress callbacks
- Handles Replicate API complexity (polling, timeout, file download)
- Alternative (direct Replicate API) would duplicate existing functionality
- Backend spawns MCP server as subprocess; communicates via stdio

### TD-7: Fade+Blur Transition Effect
**Choice**: CSS transitions on background with opacity/blur filter combination
**Requirements**: REQ-F-15, REQ-F-16, REQ-NF-3
**Rationale**:
- Pure CSS transitions leverage GPU acceleration for 60fps (REQ-F-15)
- Two-layer background approach: old image fades out while new fades in
- Blur softens the transition, hides loading artifacts
- Duration configurable via CSS variable (default 1500ms per REQ-F-16)
- No JavaScript animation frame loops needed
- Input elements remain interactive during transition (REQ-NF-3)

### TD-8: GM Tool-Based Theme Commands
**Choice**: Extend GM prompt to include a `set_theme` tool that emits theme changes
**Requirements**: REQ-F-4, REQ-F-5
**Rationale**:
- Claude Agent SDK already configured with tool support in GameSession
- Adding a custom tool is cleaner than parsing narrative text for mood keywords
- Tool parameters map directly to protocol: mood, genre, region, force_generate
- GM decides narratively when mood shifts warrant theme change
- Alternative (sentiment analysis) too unreliable, misses intentional mood shifts

### TD-9: Theme Initialization and Session Management
**Choice**: Initialize with "calm" theme synchronously in App component; reset to default on WebSocket reconnection
**Requirements**: REQ-F-24, REQ-NF-8
**Rationale**:
- Synchronous initialization prevents any flash of unstyled content
- ThemeContext loads themes.json once at startup, immediately applies "calm" CSS variables
- Session state is ephemeral - no persistence across page reloads or reconnections
- On WebSocket disconnect/reconnect, backend sends `adventure_loaded` which triggers theme reset
- Alternative (persisting theme in localStorage) creates complexity with stale state and sync issues

### TD-10: UI Component Theming via CSS Variables
**Choice**: All components consume theme via CSS variable references; fonts via `--font-family`, decorations via `--accent-*` variables
**Requirements**: REQ-F-19, REQ-F-20, REQ-F-21
**Rationale**:
- Existing components already use `var(--color-*)` - extend pattern to fonts and decorations
- Font family applied to `body` selector, inherits to all children automatically
- Border styles and shadows applied via new `--accent-border-style`, `--accent-shadow` variables
- NarrativeEntry component's `--color-player-bg`, `--color-gm-bg` variables already exist (REQ-F-21)
- No component code changes needed - CSS variable updates propagate automatically
- Alternative (inline styles per component) would require prop drilling and rerenders

### TD-11: Type Validation and WCAG Compliance
**Choice**: Validate mood/genre/region at protocol boundary; validate WCAG compliance at build time
**Requirements**: REQ-F-8, REQ-F-9, REQ-NF-4
**Rationale**:
- TypeScript enum types enforce valid values at compile time
- Runtime validation in theme_change handler rejects invalid values with warning (REQ-F-22 overlap)
- WCAG contrast validation runs as build-time script using `wcag-contrast-checker` library
- themes.json validated on CI - fails build if any color combination below 4.5:1 ratio
- Genre/region enums defined once in shared/protocol.ts, used by both backend and frontend
- Alternative (runtime WCAG checks) unnecessary - themes are static configuration

### TD-12: Background Image Loading Strategy
**Choice**: Two-layer background with preload, async fade-in, and cascade fallback
**Requirements**: REQ-F-13, REQ-F-17, REQ-NF-2
**Rationale**:
- Background container has two absolutely-positioned image layers
- Current image stays visible while new image loads in hidden layer
- On image `onload`, trigger CSS transition to fade new layer in over old
- Fallback cascade: catalog match → generate async → previous image → mood-specific fallback image
- Preload via `new Image().src = url` when possible (e.g., during narrative streaming)
- Alternative (single background with loading state) causes visible "blank" period during load

## Data Model

### Theme Definition Schema (themes.json)

```typescript
interface ThemeDefinition {
  mood: 'calm' | 'tense' | 'ominous' | 'triumphant' | 'mysterious';
  colors: {
    primary: string;       // Accent color (buttons, links)
    secondary: string;     // Secondary accent
    background: string;    // Main background
    surface: string;       // Card/panel backgrounds
    surfaceAlt: string;    // Alternate surface
    border: string;        // Border color
    text: string;          // Primary text
    textSecondary: string; // Secondary text
    textMuted: string;     // Muted text
    playerBg: string;      // Player message background
    playerBorder: string;  // Player message border
    gmBg: string;          // GM message background
    gmBorder: string;      // GM message border
    error: string;         // Error text
    errorBg: string;       // Error background
  };
  fonts: {
    family: string;        // Font stack with fallbacks
  };
  accents: {
    borderStyle: string;   // e.g., 'solid', 'dashed'
    shadowColor: string;   // Box shadow color
    shadowBlur: string;    // Box shadow blur radius
  };
}
```

### Image Catalog Schema (SQLite)

```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY,           -- UUID
  mood TEXT NOT NULL,            -- calm|tense|ominous|triumphant|mysterious
  genre TEXT NOT NULL,           -- sci-fi|steampunk|low-fantasy|etc
  region TEXT NOT NULL,          -- city|village|forest|etc
  file_path TEXT NOT NULL,       -- Absolute path to image file
  prompt TEXT,                   -- Original generation prompt
  created_at TEXT NOT NULL,      -- ISO timestamp

  UNIQUE(mood, genre, region)    -- One image per combination
);

CREATE INDEX idx_mood_genre_region ON images(mood, genre, region);
```

### ThemeState (Frontend)

```typescript
interface ThemeState {
  currentMood: ThemeMood;
  pendingMood: ThemeMood | null;  // During transition
  backgroundUrl: string | null;
  isTransitioning: boolean;
  transitionDuration: number;     // ms, default 1500
  lastChangeTime: number;         // For debouncing
}

type ThemeMood = 'calm' | 'tense' | 'ominous' | 'triumphant' | 'mysterious';
```

## API Design

### WebSocket Protocol Extension

**New Server Message Type: `theme_change`**

```typescript
type ServerMessage =
  | { type: "theme_change"; payload: ThemeChangePayload }
  // ... existing types ...

interface ThemeChangePayload {
  mood: ThemeMood;
  genre: Genre;
  region: Region;
  backgroundUrl: string | null;  // null = use fallback/generate
  transitionDuration?: number;   // Override default, in ms
}

type ThemeMood = 'calm' | 'tense' | 'ominous' | 'triumphant' | 'mysterious';
type Genre = 'sci-fi' | 'steampunk' | 'low-fantasy' | 'high-fantasy' |
             'horror' | 'modern' | 'historical';
type Region = 'city' | 'village' | 'forest' | 'desert' | 'mountain' |
              'ocean' | 'underground' | 'castle' | 'ruins';
```

### GM Tool Definition

```typescript
const setThemeTool = {
  name: "set_theme",
  description: `Change the visual theme based on narrative mood.
    Use when story reaches emotional turning points:
    - calm: peaceful, safe moments
    - tense: conflict, danger approaching
    - ominous: dread, foreboding, horror
    - triumphant: victory, achievement, joy
    - mysterious: intrigue, secrets, wonder`,
  input_schema: {
    type: "object",
    properties: {
      mood: {
        type: "string",
        enum: ["calm", "tense", "ominous", "triumphant", "mysterious"]
      },
      force_generate: {
        type: "boolean",
        description: "Force new image generation even if cached exists"
      }
    },
    required: ["mood"]
  }
};
```

### Background Image Service API

```typescript
interface BackgroundImageService {
  // Find existing image or return null
  findImage(mood: ThemeMood, genre: Genre, region: Region): Promise<string | null>;

  // Generate new image, store in catalog, return URL
  generateImage(
    mood: ThemeMood,
    genre: Genre,
    region: Region,
    narrativeContext?: string
  ): Promise<string>;

  // Get fallback image for mood (always available)
  getFallback(mood: ThemeMood): string;
}
```

## Integration Points

### WebSocket Handler (server.ts)
- **Purpose**: Route theme_change messages to frontend
- **Data Flow**: GameSession emits theme command → server.ts sends to client WebSocket
- **Changes**: Add `theme_change` to ServerMessage type, no handler needed (pass-through)

### GameSession (game-session.ts)
- **Purpose**: Process GM tool calls for `set_theme`
- **Data Flow**: GM response contains tool_use → extract parameters → call BackgroundImageService → emit theme_change
- **Changes**: Add tool result handler in `generateGMResponse()`, integrate BackgroundImageService

### art-gen-mcp Integration
- **Purpose**: Generate background images when catalog misses
- **Data Flow**: BackgroundImageService → MCP client → art-gen-mcp subprocess → Replicate API
- **Dependencies**: MCP client library, REPLICATE_API_TOKEN environment variable
- **Note**: MCP server spawned on-demand, not persistent

### Frontend CSS Variables (index.css)
- **Purpose**: Apply theme colors/fonts to all components
- **Data Flow**: ThemeContext updates → setProperty() on :root → components render with new values
- **Changes**: No CSS changes needed; existing variables already referenced everywhere

## Error Handling, Performance, Security

### Error Strategy
- **Invalid mood**: Log warning, maintain current theme (REQ-F-22)
- **Image generation failure**: Use fallback image, continue with theme colors (REQ-NF-5)
- **Image generation timeout**: 30 second timeout triggers fallback (REQ-NF-7)
- **WebSocket disconnect during transition**: Transition completes locally; reconnect resumes current state
- **MCP server crash**: Catch exception, log, return fallback URL

### Performance Targets
- **CSS variable update**: <50ms (REQ-NF-1) - achieved via direct DOM manipulation
- **Theme application**: <500ms for colors/fonts (Success Criteria #1)
- **Background load**: Preload when possible (REQ-NF-2); async fade-in
- **Image generation**: <30 seconds with progress feedback
- **Transition rendering**: 60fps via CSS transitions and GPU compositing

### Security Measures
- **Image URLs**: Only serve images from controlled catalog directory
- **Path traversal**: Validate image paths, reject `..` sequences
- **MCP subprocess**: Sandboxed to image output directory
- **Rate limiting**: Debounce prevents rapid theme changes; consider per-session generation limits

## Testing Strategy

### Unit Tests
- **ThemeContext**: State transitions, debouncing logic, CSS variable application
- **BackgroundImageService**: Catalog queries, fallback selection, prompt construction
- **ImageCatalog**: SQLite operations, query accuracy
- **Coverage Target**: 80% for new code

### Integration Tests
- **Theme change flow**: Mock WebSocket message → verify CSS variables updated
- **Image generation**: Mock art-gen-mcp → verify catalog storage → verify URL returned
- **GM tool handling**: Mock Claude response with set_theme → verify protocol message emitted

### E2E Tests
- **Full theme cycle**: Player action → GM responds with theme change → UI updates
- **Fallback behavior**: Disconnect art-gen-mcp → verify fallback image used
- **Accessibility**: Automated WCAG contrast checks on all 5 themes

### Performance Tests
- **Transition smoothness**: Verify no dropped frames during theme change
- **Memory**: No leaks from repeated theme changes
- **Concurrent**: Multiple rapid theme changes don't cause race conditions

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| art-gen-mcp generation slow/expensive | Medium | Medium | Catalog-first approach minimizes generation; budget alerts |
| WCAG contrast failures in theme designs | Medium | High | Pre-validate all themes at build time; contrast checker in CI |
| MCP subprocess management complexity | Medium | Medium | Use existing patterns from other MCP integrations; graceful restart |
| Theme flashing on page load | Low | Medium | Initialize with default theme immediately; async background load |
| SQLite concurrent access issues | Low | Low | Single writer (backend), read-only catalog queries |
| Image catalog storage growth | Low | Low | Implement cleanup for unused images after 30 days; monitor disk usage |

## Dependencies

### Technical
- **bun:sqlite**: Built-in SQLite support (already available)
- **MCP SDK**: `@anthropic-ai/mcp-sdk` for MCP client (new dependency)
- **art-gen-mcp**: Existing repository component (Python, subprocess)
- **REPLICATE_API_TOKEN**: Required environment variable for image generation

### Team
- **Design review**: Font selections and accent styles for each mood
- **Accessibility audit**: WCAG validation of color combinations

## Open Questions

- [x] What specific font families for each mood? → Addressed in themes.json design; specific fonts TBD during implementation based on Google Fonts availability
- [x] Rate limiting for image generation per session? → Implement 5 generations per session limit with counter in GameSession state
