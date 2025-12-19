---
specification: [.sdd/specs/2025-12-18-alternative-feedback-windows.md](./../specs/2025-12-18-alternative-feedback-windows.md)
status: Approved
version: 1.0.0
created: 2025-12-18
last_updated: 2025-12-18
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Alternative Feedback Windows - Technical Plan

## Overview

This plan describes a panel system enabling the GM to display contextual information (weather, tickers, alerts, faction standings) in dedicated UI windows without interrupting narrative flow. The architecture follows established patterns:

1. **Protocol Extension**: New `panel_create`, `panel_update`, `panel_dismiss` WebSocket message types
2. **MCP Tools**: `create_panel`, `update_panel`, `dismiss_panel`, `list_panels` tools for GM control
3. **State Persistence**: Panel state stored in `state.json` under `panels` key for session restoration
4. **Frontend Components**: `InfoPanel` component with `PanelContext` for centralized state management

The system prioritizes simplicity (static display only), security (markdown sanitization), and consistency (theme inheritance via CSS variables).

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │PanelContext │───▶│  InfoPanel  │───▶│ Positioned in       │    │
│  │  Provider   │     │ Components  │     │ sidebar/header/     │    │
│  └─────────────┘     └─────────────┘     │ overlay zones       │    │
│         ▲                                └─────────────────────┘    │
│         │ panel_* messages                                          │
│  ┌──────┴──────┐                                                    │
│  │ useWebSocket│                                                    │
│  └──────┬──────┘                                                    │
└─────────┼───────────────────────────────────────────────────────────┘
          │ WebSocket
┌─────────┴───────────────────────────────────────────────────────────┐
│                         Backend (Bun/Hono)                          │
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────────────┐   │
│  │ GameSession │───▶│PanelManager │───▶│   StateManager       │   │
│  │(GM tools)   │     │ (validation)│     │   (persistence)      │   │
│  └─────────────┘     └─────────────┘     └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **PanelContext** | Holds active panels array, provides add/update/remove methods, local minimize state |
| **InfoPanel** | Renders single panel with title, markdown content, minimize button |
| **PanelManager** | Backend validation (limit, uniqueness, size), persistence coordination |
| **GameSession** | MCP tool handlers, WebSocket message emission |

## Technical Decisions

### TD-1: Three-Message Protocol Pattern
**Choice**: Separate `panel_create`, `panel_update`, `panel_dismiss` messages rather than single `panel_sync`
**Requirements**: REQ-F-1, REQ-F-2, REQ-F-3, REQ-NF-3
**Rationale**:
- Matches existing protocol patterns (`gm_response_start/chunk/end`, `theme_change`)
- Granular messages are more efficient than syncing entire panel state on each change
- Frontend can apply targeted updates without diffing full state
- Alternative (single `panels_sync` with full array) wastes bandwidth, complicates change detection

### TD-2: PanelContext for Frontend State
**Choice**: React Context at App root, mirroring `ThemeContext` pattern
**Requirements**: REQ-F-4, REQ-F-16, REQ-F-17, REQ-F-18
**Rationale**:
- Centralized state for all active panels enables consistent ordering (REQ-F-22)
- Minimize state stored locally in context (browser-only, not persisted - REQ-F-18)
- Components throughout the tree can access panel state without prop drilling
- Alternative (Redux) overkill for simple panel list with infrequent updates

### TD-3: Markdown Content with Sanitization
**Choice**: Use `react-markdown` with restricted allowedElements, no HTML pass-through
**Requirements**: REQ-F-6, REQ-NF-5
**Rationale**:
- `react-markdown` already available in frontend dependencies for narrative rendering
- Allowlist approach: only permit `p`, `strong`, `em`, `ul`, `ol`, `li` elements
- Disables `raw` mode to prevent XSS via embedded HTML
- Alternative (DOMPurify) more complex; react-markdown's built-in restrictions sufficient

### TD-4: MCP Tools with Callback Pattern
**Choice**: Add panel tools to existing `createGMMcpServerWithCallbacks` structure
**Requirements**: REQ-F-1, REQ-F-2, REQ-F-3, REQ-F-4
**Rationale**:
- Follows established pattern from `set_theme`, `set_character`, `set_world` tools
- Callbacks wired in `GameSession` for validation and WebSocket emission
- GM's prompt updated to include panel tool descriptions and guidelines
- Alternative (separate MCP server) fragments tool configuration

### TD-5: Backend Validation Before Emission
**Choice**: Validate all constraints (limit, uniqueness, size) in `PanelManager` before WebSocket message
**Requirements**: REQ-F-14, REQ-F-15, REQ-F-19, REQ-F-20, REQ-F-21
**Rationale**:
- Fail fast: reject invalid operations before touching state or network
- Backend is authoritative for panel state; frontend trusts incoming messages
- Validation errors returned to GM via tool result, not sent to frontend
- Prevents malformed data from ever reaching client

### TD-6: State Persistence in state.json
**Choice**: Add `panels` array to existing `AdventureState` interface
**Requirements**: REQ-F-11, REQ-F-12, REQ-F-13
**Rationale**:
- Follows existing pattern for theme persistence (`currentTheme` in `state.json`)
- Only persistent panels stored; non-persistent panels filtered on save
- Restored on adventure load, sent with `adventure_loaded` or as immediate `panel_create` messages
- Alternative (separate panels.json) fragments state, complicates atomic writes

### TD-7: CSS Variable Inheritance for Theming
**Choice**: Panels use existing CSS variables (`--color-surface`, `--color-border`, etc.)
**Requirements**: REQ-NF-4
**Rationale**:
- Automatic theme inheritance when mood changes - no panel-specific styling code
- Consistent with NarrativeLog, InputField, and other components
- Panel-specific variables (`--panel-bg`, `--panel-border`) alias theme variables
- Alternative (hardcoded panel colors) breaks theme cohesion

### TD-8: Position-Based Rendering Zones
**Choice**: Three fixed zones (sidebar, header, overlay) with CSS Grid/Flexbox layout
**Requirements**: REQ-F-5, REQ-F-7, REQ-F-22, REQ-NF-2
**Rationale**:
- Sidebar: Right edge, vertical stack, doesn't obscure narrative log
- Header: Top edge, horizontal flow, for status tickers
- Overlay: Absolute positioned, uses percentage-based x/y from panel config
- Fixed zones simplify layout; overlay handles edge cases needing precise positioning

### TD-9: 2KB Content Limit Validation
**Choice**: Validate content length in backend before any processing
**Requirements**: REQ-F-21
**Rationale**:
- Prevents abuse (massive panels affecting performance or memory)
- 2KB allows ~2000 words of plain text - ample for status displays
- Validation uses `Buffer.byteLength()` for accurate UTF-8 size
- Error returned immediately without modifying state

### TD-10: System.md Panel Types Deferred to Post-MVP
**Choice**: Defer REQ-F-8, REQ-F-9, REQ-F-10 (System.md panel type definitions) to a future enhancement
**Requirements**: REQ-F-8, REQ-F-9, REQ-F-10 (deferred)
**Rationale**:
- Core panel functionality (create, update, dismiss) provides immediate value
- System.md parsing adds complexity: markdown parsing, schema validation, default merging
- GM can achieve same results with explicit parameters - no capability loss
- Deferral allows faster MVP delivery; types can be added when usage patterns emerge
- Alternative (implement now) delays core feature for optional enhancement

## Data Model

### Panel Schema (shared/protocol.ts)

```typescript
interface Panel {
  id: string;           // Unique identifier (e.g., "weather", "ticker-1")
  title: string;        // Display header
  content: string;      // Markdown text (max 2KB)
  position: PanelPosition;
  persistent: boolean;  // Survives session end
  x?: number;           // Overlay only: 0-100 percentage from left
  y?: number;           // Overlay only: 0-100 percentage from top
  createdAt: string;    // ISO timestamp for ordering
}

type PanelPosition = "sidebar" | "header" | "overlay";
```

### State Extension (types/state.ts)

```typescript
interface AdventureState {
  // ... existing fields ...
  panels: Panel[];  // Only persistent panels saved
}
```

### Frontend Panel State

```typescript
interface PanelState {
  panels: Panel[];           // All active panels (persistent + non-persistent)
  minimized: Set<string>;    // Panel IDs currently minimized (local-only)
}
```

## API Design

### WebSocket Protocol Extension

**New Server Message Types:**

```typescript
// Panel created by GM
interface PanelCreateMessage {
  type: "panel_create";
  payload: Panel;
}

// Panel content updated
interface PanelUpdateMessage {
  type: "panel_update";
  payload: {
    id: string;
    content: string;  // New content only - other fields immutable
  };
}

// Panel dismissed
interface PanelDismissMessage {
  type: "panel_dismiss";
  payload: {
    id: string;
  };
}
```

### MCP Tool Definitions

```typescript
const createPanelTool = tool(
  "create_panel",
  `Create a new info panel to display contextual information.
Panels appear in designated UI zones without interrupting narrative flow.

POSITIONS:
- sidebar: Right side of screen, for persistent status (weather, stats)
- header: Top of screen, for tickers and alerts
- overlay: Floating panel at specific coordinates (for special displays)

LIMITS: Maximum 5 concurrent panels. Content max 2KB.`,
  {
    id: z.string().min(1).max(32).describe("Unique panel identifier"),
    title: z.string().min(1).max(64).describe("Panel header text"),
    content: z.string().max(2048).describe("Markdown content"),
    position: z.enum(["sidebar", "header", "overlay"]),
    persistent: z.boolean().describe("Survive session reload"),
    x: z.number().min(0).max(100).optional().describe("Overlay X position %"),
    y: z.number().min(0).max(100).optional().describe("Overlay Y position %"),
  },
  async (args) => { /* validation + emit */ }
);

const updatePanelTool = tool(
  "update_panel",
  `Update an existing panel's content. Use for dynamic displays like weather changes or score updates.`,
  {
    id: z.string().describe("Panel ID to update"),
    content: z.string().max(2048).describe("New markdown content"),
  },
  async (args) => { /* validation + emit */ }
);

const dismissPanelTool = tool(
  "dismiss_panel",
  `Remove a panel from the UI.`,
  { id: z.string().describe("Panel ID to dismiss") },
  async (args) => { /* validation + emit */ }
);

const listPanelsTool = tool(
  "list_panels",
  `List all currently active panels.`,
  {},
  async () => { /* return panel list */ }
);
```

### System.md Panel Types (Optional)

```markdown
## Feedback Panels

Available panel types for this genre:

### weather
- position: sidebar
- persistent: false
- Use for: Current weather conditions in the adventure world

### faction-standing
- position: sidebar
- persistent: true
- Use for: Player's reputation with various factions

### news-ticker
- position: header
- persistent: false
- Use for: Scrolling announcements or rumors
```

When GM references a type defined in System.md, the tool auto-fills defaults from the definition.

## Integration Points

### GameSession (game-session.ts)
- **Purpose**: Wire MCP tool callbacks for panel operations
- **Changes**:
  - Add `onCreatePanel`, `onUpdatePanel`, `onDismissPanel`, `onListPanels` to `GMMcpCallbacks`
  - Create `PanelManager` instance for validation
  - Emit `panel_*` WebSocket messages after successful operations

### AdventureStateManager (adventure-state.ts)
- **Purpose**: Persist and restore panel state
- **Changes**:
  - Add `panels: Panel[]` to `AdventureState` interface
  - Filter non-persistent panels on save
  - Include panels in `load()` result

### WebSocket Handler (server.ts)
- **Purpose**: Route panel messages to frontend
- **Changes**:
  - Add `panel_create`, `panel_update`, `panel_dismiss` to `ServerMessageSchema`
  - No handler logic needed - pass-through like `theme_change`

### useWebSocket Hook (hooks/useWebSocket.ts)
- **Purpose**: Dispatch panel messages to context
- **Changes**:
  - Import and use `usePanels` hook
  - On `panel_create`: call `addPanel(payload)`
  - On `panel_update`: call `updatePanel(id, content)`
  - On `panel_dismiss`: call `removePanel(id)`

### App.tsx
- **Purpose**: Render panel zones
- **Changes**:
  - Add `PanelProvider` wrapper (sibling to `ThemeProvider`)
  - Add `<PanelZone position="sidebar" />` in layout
  - Add `<PanelZone position="header" />` above narrative
  - Add `<PanelOverlay />` for floating panels

### GM Prompt (gm-prompt.ts)
- **Purpose**: Guide GM on panel usage
- **Changes**:
  - Add panel tools to allowed tools list
  - Add PANEL GUIDANCE section explaining when/how to use panels
  - Reference System.md panel types if defined

## Error Handling, Performance, Security

### Error Strategy
- **Duplicate ID**: Return error "Panel with ID exists, use update_panel to modify"
- **Limit exceeded**: Return error "Maximum 5 panels active"
- **Content too large**: Return error "Content exceeds 2KB limit"
- **Panel not found**: Return error "Panel ID not found" for update/dismiss
- **Invalid position**: Zod validation rejects at tool boundary

### Performance Targets (REQ-NF-1)
- **Panel render**: <16ms (one frame) for create/update - well under 100ms requirement
- **Markdown parse**: `react-markdown` lazy evaluation, memoized output
- **State update**: Minimal re-renders via React.memo on InfoPanel
- **WebSocket overhead**: <100 bytes per message (ID + small content)

### Security Measures
- **Content sanitization**: react-markdown allowlist prevents XSS
- **Size limits**: 2KB prevents resource exhaustion
- **ID validation**: Alphanumeric + hyphens only, max 32 chars
- **No interactive elements**: Constraint prevents injection vectors

## Testing Strategy

### Unit Tests
- **PanelManager**: Validation logic (limit, uniqueness, size)
- **PanelContext**: State mutations (add, update, remove, minimize)
- **InfoPanel**: Markdown rendering, minimize toggle
- **Coverage Target**: 80% for new panel code

### Integration Tests
- **Panel lifecycle**: Create → Update → Dismiss flow
- **Persistence**: Create persistent panel → reload → verify restored
- **Limit enforcement**: Create 5 panels → attempt 6th → verify rejection
- **Theme inheritance**: Change theme → verify panel styling updates

### E2E Tests (Playwright)
- **Full panel flow**: GM creates panel → verify visible in UI
- **Multi-panel**: Create sidebar + header panels → verify positioning
- **Minimize/expand**: Click minimize → verify collapsed → click expand → verify restored

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Panel obscures critical UI elements | Medium | Medium | Limit to 5 panels; sidebar/header avoid narrative zone |
| Large content affects performance | Low | Medium | 2KB limit; lazy markdown rendering |
| GM over-uses panels | Low | Low | Document best practices in prompt; limit enforcement |
| Persistence bloat | Low | Low | Non-persistent default; manual cleanup via dismiss |
| System.md panel types add complexity | Low | Low | Types are optional enhancement, not required |

## Dependencies

### Technical
- **react-markdown**: Already in frontend dependencies
- **Zod schemas**: Existing validation infrastructure
- **CSS variables**: Existing theming system

### Team
- **None**: Self-contained feature, no external dependencies

## Deferred Features

The following spec requirements are deferred to post-MVP:

- **REQ-F-8**: System.md can define a `## Feedback Panels` section
- **REQ-F-9**: GM can reference panel types by name to create with defaults
- **REQ-F-10**: GM can override default properties for system-defined panels

See TD-10 for rationale. These features can be added in a follow-up enhancement once core panel functionality is validated.

## Open Questions

- [ ] Should overlay panels have z-index control, or fixed layering?
  - Recommendation: Fixed layering (creation order), avoid complexity
