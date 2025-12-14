---
specification: [.sdd/specs/2025-12-13-dynamic-theming.md](./../specs/2025-12-13-dynamic-theming.md)
plan: [.sdd/plans/2025-12-13-dynamic-theming-plan.md](./../plans/2025-12-13-dynamic-theming-plan.md)
status: Ready for Implementation
version: 1.0.0
created: 2025-12-13
last_updated: 2025-12-13
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Dynamic Theming System - Task Breakdown

## Task Summary
Total: 15 tasks | Complexity Distribution: 4×S, 7×M, 4×L

## Foundation Tasks

### TASK-001: Define Theme Types and Protocol Extension
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Create shared TypeScript types for themes, moods, genres, and regions. Extend the WebSocket protocol with `theme_change` message type.

**Acceptance Criteria**:
- [ ] `ThemeMood`, `Genre`, `Region` types defined in `shared/protocol.ts`
- [ ] `ThemeChangePayload` interface matches spec (mood, genre, region, backgroundUrl, transitionDuration)
- [ ] `ServerMessage` union includes `theme_change` type
- [ ] Types exported and importable by both frontend and backend

**Files**: Modify: `shared/protocol.ts`

**Testing**: TypeScript compiles without errors; types are usable in both frontend/backend

---

### TASK-002: Create Theme Configuration File
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Create `themes.json` with all 5 mood definitions (calm, tense, ominous, triumphant, mysterious). Each mood defines colors, fonts, and accent styles per the plan's `ThemeDefinition` interface.

**Acceptance Criteria**:
- [ ] All 5 moods defined with complete color palettes
- [ ] Each mood includes: primary, secondary, background, surface, surfaceAlt, border, text, textSecondary, textMuted, playerBg, playerBorder, gmBg, gmBorder, error, errorBg colors
- [ ] Each mood includes font family with web-safe fallbacks
- [ ] Each mood includes accent styles (borderStyle, shadowColor, shadowBlur)
- [ ] Color definitions follow WCAG-compatible values (verified by TASK-013 script)

**Files**: Create: `frontend/src/themes.json`

**Testing**: JSON validates against TypeScript interface; manual spot-check using WebAIM contrast checker

---

### TASK-003: Create Image Catalog Database Schema
**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Create SQLite schema for image catalog with tables for mood/genre/region-tagged images. Include migration script.

**Acceptance Criteria**:
- [ ] SQLite schema defined per plan: id, mood, genre, region, file_path, prompt, created_at
- [ ] UNIQUE constraint on (mood, genre, region) combination
- [ ] Index on (mood, genre, region) for efficient queries
- [ ] Migration script creates tables idempotently

**Files**: Create: `backend/src/db/schema.sql`, Create: `backend/src/db/migrate.ts`

**Testing**: Migration runs successfully; inserting duplicate mood+genre+region fails

---

## Backend Services

### TASK-004: Implement Image Catalog Service
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Create `ImageCatalogService` class that queries and stores image metadata in SQLite. Implements the `BackgroundImageService` interface from the plan.

**Acceptance Criteria**:
- [ ] `findImage(mood, genre, region)` returns existing image path or null
- [ ] `storeImage(mood, genre, region, filePath, prompt)` inserts new record
- [ ] `getFallback(mood)` returns mood-specific fallback image path
- [ ] Uses `bun:sqlite` for database operations
- [ ] Handles path validation (rejects `..` sequences)

**Files**: Create: `backend/src/services/image-catalog.ts`

**Testing**: Unit tests for find/store/fallback operations; integration test with actual SQLite file

---

### TASK-005: Implement art-gen-mcp Integration
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-004

**Description**: Create service that calls art-gen-mcp via MCP protocol to generate background images. Implements image prompt construction from mood+genre+region+narrative context.

**Acceptance Criteria**:
- [ ] MCP client connects to art-gen-mcp subprocess
- [ ] `generateImage(mood, genre, region, narrativeContext?)` constructs prompt and calls art-gen-mcp
- [ ] Generated images saved to catalog directory
- [ ] 30-second timeout triggers fallback behavior
- [ ] Rate limiting: max 5 generations per session (counter tracked in GameSession state)

**Files**: Create: `backend/src/services/image-generator.ts`

**Testing**: Integration test with mocked MCP server; timeout behavior test; rate limit enforcement test

---

### TASK-006: Implement BackgroundImageService Orchestrator
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-004, TASK-005

**Description**: Create orchestrator service that implements catalog-first strategy: search catalog, generate if miss, return fallback on failure.

**Acceptance Criteria**:
- [ ] `getBackgroundImage(mood, genre, region, forceGenerate?)` follows cascade: catalog → generate → fallback
- [ ] Respects `force_generate` flag to skip catalog lookup
- [ ] Stores newly generated images in catalog with tags
- [ ] Returns URL path suitable for frontend consumption
- [ ] Handles all error cases gracefully with fallback

**Files**: Create: `backend/src/services/background-image.ts`

**Testing**: Unit tests for each cascade path; error handling tests

---

### TASK-007: Add set_theme Tool to GM
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-006, TASK-015

**Description**: Extend GameSession to include `set_theme` tool in GM's available tools. Process tool calls to emit `theme_change` WebSocket messages.

**Acceptance Criteria**:
- [ ] `set_theme` tool defined per plan's schema (mood required, force_generate optional)
- [ ] Tool added to GM's `allowedTools` array
- [ ] Tool calls processed in `generateGMResponse()` to emit theme_change messages
- [ ] Genre and region derived from adventure state
- [ ] Debounce: ignore duplicate mood within 1 second

**Files**: Modify: `backend/src/game-session.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit test for tool call processing; E2E test: mock GM response with `set_theme` tool_use → verify `theme_change` WebSocket message emitted with correct mood/genre/region

---

## Frontend Theme Engine

### TASK-008: Create ThemeContext Provider
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-001, TASK-002

**Description**: Implement React context for theme state management. Loads themes.json at startup, applies CSS variables to `:root`, manages transitions.

**Acceptance Criteria**:
- [ ] `ThemeProvider` component wraps App
- [ ] `useTheme()` hook returns current mood, isTransitioning, backgroundUrl
- [ ] Initializes with "calm" theme synchronously (no flash)
- [ ] CSS variables updated via `document.documentElement.style.setProperty()`
- [ ] Debounces rapid theme changes (1 second)
- [ ] Resets to "calm" on WebSocket reconnection

**Files**: Create: `frontend/src/contexts/ThemeContext.tsx`, Modify: `frontend/src/App.tsx` (wrap with ThemeProvider)

**Testing**: Unit tests for state transitions, debouncing; integration test with mock WebSocket

---

### TASK-009: Handle theme_change WebSocket Messages
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-001, TASK-008

**Description**: Extend `useWebSocket` hook to handle `theme_change` messages and update ThemeContext.

**Acceptance Criteria**:
- [ ] `theme_change` message type handled in WebSocket message router
- [ ] Payload validated (invalid mood logs warning, maintains current theme)
- [ ] ThemeContext's mood setter called with new mood
- [ ] Background URL passed to ThemeContext

**Files**: Modify: `frontend/src/hooks/useWebSocket.ts`

**Testing**: Unit test for message handling; integration test with ThemeContext

---

### TASK-010: Implement Background Layer Component
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-008

**Description**: Create two-layer background component with fade+blur transitions. Handles async image loading without visible "blank" states.

**Acceptance Criteria**:
- [ ] Two absolutely-positioned image layers for crossfade
- [ ] New image loads in hidden layer, fades in on `onload`
- [ ] Blur filter during transition per plan (TD-7)
- [ ] Transition duration from ThemeContext (default 1500ms)
- [ ] CSS transitions achieve 60fps (GPU-accelerated)

**Files**: Create: `frontend/src/components/BackgroundLayer.tsx`, Create: `frontend/src/components/BackgroundLayer.css`

**Testing**: Visual regression test; performance test for frame drops

---

### TASK-011: Add New CSS Variables for Theming
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-002

**Description**: Extend `index.css` with new CSS variables for fonts and accents that themes will control.

**Acceptance Criteria**:
- [ ] `--font-family` variable added (currently inline in body selector)
- [ ] `--accent-border-style` variable added for NarrativeEntry borders
- [ ] `--accent-shadow` variable added for panel shadows
- [ ] Default values match existing "calm" appearance

**Files**: Modify: `frontend/src/index.css`

**Testing**: Visual inspection that existing UI unchanged after adding variables

---

## Integration & Polish

### TASK-012: Integrate Theme Components into App
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-008, TASK-009, TASK-010, TASK-011

**Description**: Wire up ThemeProvider in App.tsx, add BackgroundLayer, ensure all theme changes propagate correctly.

**Acceptance Criteria**:
- [ ] `ThemeProvider` wraps App at root level
- [ ] `BackgroundLayer` rendered behind main content
- [ ] Theme changes from WebSocket update UI correctly
- [ ] Input field focus/content preserved during transitions (REQ-NF-3)
- [ ] Adventures start with "calm" theme

**Files**: Modify: `frontend/src/App.tsx`

**Testing**: E2E test for full theme change flow; focus preservation test

---

### TASK-013: Add WCAG Validation Script
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create build-time script that validates all theme color combinations meet WCAG 2.1 AA contrast requirements.

**Acceptance Criteria**:
- [ ] Script reads themes.json and checks all text/background combinations
- [ ] Fails with clear error if any combination below 4.5:1 ratio
- [ ] Integrates with build process (fails CI if contrast invalid)
- [ ] Reports which specific combinations fail

**Files**: Create: `frontend/scripts/validate-contrast.ts`, Modify: `frontend/package.json` (add script)

**Testing**: Intentionally fail contrast on one color, verify script catches it

---

### TASK-014: Add Fallback Background Images
**Priority**: Medium | **Complexity**: L | **Dependencies**: TASK-004, TASK-006

**Description**: Create or source 5 default background images (one per mood) that serve as fallbacks when generation fails.

**Acceptance Criteria**:
- [ ] 5 mood-appropriate background images in `backend/assets/backgrounds/`
- [ ] Images are royalty-free or generated
- [ ] Resolution appropriate for full-screen display (1920x1080 minimum)
- [ ] `getFallback()` returns correct image per mood
- [ ] Images served statically by backend

**Files**: Create: `backend/assets/backgrounds/` (5 images), Modify: `backend/src/server.ts` (static file serving)

**Testing**: Disconnect art-gen-mcp, verify fallback images load

---

### TASK-015: Define set_theme Tool Schema
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-001

**Description**: Define the `set_theme` tool schema with description and input_schema per plan's GM Tool Definition. This schema tells Claude when and how to use the theme-changing tool.

**Acceptance Criteria**:
- [ ] Tool schema defined with name "set_theme" and descriptive guidance for when to use each mood
- [ ] Input schema with required `mood` property (enum of 5 moods)
- [ ] Optional `force_generate` boolean property
- [ ] Tool description explains narrative use cases (calm for peaceful moments, tense for danger, etc.)
- [ ] Tool added to GM system prompt or tools configuration

**Files**: Modify: `backend/src/gm-prompt.ts`

**Testing**: GM prompt includes tool definition; schema validates against Claude tool use format

---

## Dependency Graph
```
TASK-001 (Types) ─┬─> TASK-007 (GM Tool Processing)
                  ├─> TASK-008 (ThemeContext)
                  ├─> TASK-009 (WS Handler)
                  └─> TASK-015 (Tool Schema)

TASK-002 (themes.json) ─┬─> TASK-008 (ThemeContext)
                        ├─> TASK-011 (CSS Variables)
                        └─> TASK-013 (WCAG Script)

TASK-003 (DB Schema) ──> TASK-004 (Catalog Service) ─┬─> TASK-005 (art-gen-mcp)
                                                     └─> TASK-006 (Orchestrator)

TASK-005 (art-gen-mcp) ──> TASK-006 (Orchestrator) ─┬─> TASK-007 (GM Tool Processing)
                                                     └─> TASK-014 (Fallback Images)

TASK-015 (Tool Schema) ──> TASK-007 (GM Tool Processing)

TASK-008, TASK-009, TASK-010, TASK-011 ──> TASK-012 (App Integration)
```

## Implementation Order

**Phase 1 (Foundation)**: TASK-001, TASK-002, TASK-003, TASK-011
- Parallel: All four tasks can be done concurrently
- Establishes types, configuration, database schema, and CSS variables

**Phase 2 (Backend Services)**: TASK-004, TASK-005, TASK-015
- Sequential: TASK-004 first (catalog), then TASK-005 (image generation)
- Parallel: TASK-015 (tool schema) can run alongside TASK-004/005

**Phase 3 (Backend Integration)**: TASK-006, TASK-007, TASK-014
- Sequential: TASK-006 (orchestrator), then TASK-007 (GM tool uses orchestrator + schema)
- TASK-014 (fallback images) can run after TASK-006

**Phase 4 (Frontend Engine)**: TASK-008, TASK-009, TASK-010
- Sequential: TASK-008 first (context), then TASK-009 (depends on 008), TASK-010 (parallel with 009)
- Theme context, WebSocket handling, background component

**Phase 5 (Integration & Validation)**: TASK-012, TASK-013
- TASK-012 integrates all frontend components
- TASK-013 can run anytime after TASK-002

## Notes

- **Parallelization**: Phase 1 tasks (001-003, 011) are fully parallelizable. Phase 4 frontend tasks can largely run in parallel.
- **Critical path**: TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007 (backend image pipeline); TASK-015 must complete before TASK-007
- **Risk mitigation**: TASK-014 (fallback images) should be done early to unblock testing without art-gen-mcp dependency
