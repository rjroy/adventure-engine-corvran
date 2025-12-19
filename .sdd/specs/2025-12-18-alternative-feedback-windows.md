---
version: 1.2.0
status: Approved
created: 2025-12-18
last_updated: 2025-12-18
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
linked_issue: https://github.com/rjroy/adventure-engine-corvran/issues/143
---

# Alternative Feedback Windows Specification

## Executive Summary

The GM currently communicates with players through two channels: narrative text (streamed responses) and theme changes (mood, background images). This limits the GM's ability to convey ambient, contextual, or status information that doesn't fit naturally into narrative prose.

This feature introduces a flexible "info panel" system where the GM can create, update, and dismiss auxiliary UI windows during gameplay. These panels can display weather, news tickers, faction standings, health warnings, or any genre-appropriate information. The System.md file can pre-define common panel types for a genre, while the GM retains the ability to create ad-hoc panels dynamically.

## User Story

As a **GM (Claude agent)**, I want to display contextual information in dedicated UI panels, so that I can communicate ambient details without interrupting narrative flow.

As a **player**, I want to see genre-appropriate status displays (weather, tickers, alerts), so that I feel more immersed in the game world.

## Stakeholders

- **Primary**: Players experiencing the game UI
- **Secondary**: GM agent (needs MCP tools to control panels), System authors (define genre-specific panels)
- **Tertiary**: Frontend developers (maintain UI components), Backend developers (maintain MCP tools)

## Success Criteria

1. GM can create, update, and dismiss info panels via MCP tools
2. Panels render in configurable positions (sidebar, header, overlay)
3. System.md can pre-define available panel types for a genre
4. Panel state persists across session reloads (configurable per panel)
5. Maximum of 5 concurrent panels enforced to prevent UI clutter

## Functional Requirements

### Panel Lifecycle

- **REQ-F-1**: GM can create a new info panel with a unique ID, position, and initial content
- **REQ-F-2**: GM can update an existing panel's content by ID
- **REQ-F-3**: GM can dismiss (remove) a panel by ID
- **REQ-F-4**: GM can list all currently active panels

### Panel Properties

- **REQ-F-5**: Each panel has: `id` (unique string), `title` (display header), `content` (markdown text), `position` (sidebar|header|overlay), `persistent` (boolean)
- **REQ-F-6**: Panel content supports basic markdown (bold, italic, lists) for formatting
- **REQ-F-7**: Overlay panels include optional `x`, `y` coordinates (percentage-based positioning)

### Persistence

- **REQ-F-11**: Panels marked `persistent: true` are saved to adventure state and restored on reload
- **REQ-F-12**: Panels marked `persistent: false` are discarded on session end
- **REQ-F-13**: Panel state is stored in `state.json` under a `panels` key

### Limits

- **REQ-F-14**: Maximum 5 concurrent panels enforced; creation fails with error if limit exceeded
- **REQ-F-15**: Panel IDs must be unique; creating panel with existing ID fails with error (use `update_panel` to modify)

### Player Interaction

- **REQ-F-16**: Players can minimize any panel to a collapsed icon/bar
- **REQ-F-17**: Minimized panels can be expanded by player click
- **REQ-F-18**: Panel minimize state is local to the browser session (not persisted server-side)

### Error Handling

- **REQ-F-19**: Invalid panel operations return error messages: invalid position, exceeded limit, content too large, non-existent ID
- **REQ-F-20**: When updating/dismissing non-existent panel ID, system returns "panel not found" error
- **REQ-F-21**: When panel content exceeds 2KB, creation/update fails before sending to frontend

### Panel Ordering

- **REQ-F-22**: When multiple panels share same position, panels stack in creation order (oldest first)

## Non-Functional Requirements

- **REQ-NF-1** (Performance): Panel updates must appear within 100ms of WebSocket message receipt
- **REQ-NF-2** (Usability): Panels must not obscure the primary narrative log; sidebar/header preferred for critical info
- **REQ-NF-3** (Maintainability): Panel protocol messages follow existing patterns (`panel_create`, `panel_update`, `panel_dismiss`)
- **REQ-NF-4** (Consistency): Panel styling inherits from current theme (colors, fonts, borders)
- **REQ-NF-5** (Security): Panel markdown content must be sanitized before rendering to prevent XSS attacks

## Explicit Constraints (DO NOT)

- Do NOT allow panels to contain interactive elements (buttons, inputs) - display only
- Do NOT auto-scroll or animate panel content - static display updated on command
- Do NOT allow panels to play audio or trigger notifications
- Do NOT exceed 5 concurrent panels
- Do NOT allow panel content larger than 2KB (prevents abuse)
- Do NOT add System.md panel type definitions - GM specifies all parameters explicitly

## Technical Context

- **Existing Stack**: Bun backend, React frontend, WebSocket protocol in `/shared/protocol.ts`
- **Integration Points**:
  - MCP tools in `/backend/src/gm-prompt.ts`
  - WebSocket handlers in `/backend/src/server.ts`
  - State persistence in `/backend/src/game-session.ts`
  - Theme context for styling in `/frontend/src/contexts/ThemeContext.tsx`
- **Patterns to Respect**:
  - Message types follow `{type, payload}` pattern
  - Zod schemas for validation
  - Tool status messages for GM actions

## Acceptance Tests

1. **Create Panel**: GM calls `create_panel` with id="weather", position="sidebar", content="Sunny, 72F" → Panel appears in sidebar
2. **Update Panel**: GM calls `update_panel` with id="weather", content="Rainy, 55F" → Panel content updates in place
3. **Dismiss Panel**: GM calls `dismiss_panel` with id="weather" → Panel removed from UI
4. **Persistence**: Create panel with persistent=true, reload adventure → Panel restored with same content
5. **Limit Enforcement**: Create 5 panels, attempt 6th → Error returned, 5 panels unchanged
6. **Theme Inheritance**: Change theme to "ominous" → Active panels update styling to match
7. **Error - Duplicate ID**: Create panel id="weather", then create another panel id="weather" → Error returned, original panel unchanged
8. **Multi-panel Stacking**: Create 3 sidebar panels → All three visible, stacked in creation order
9. **Player Minimize**: Player clicks minimize on panel → Panel collapses to icon; click again → Panel expands

## Out of Scope

- Real-time streaming content within panels (e.g., live updating clocks)
- Player-created panels
- Panel templates/macros for GM convenience
- Mobile-specific panel layouts
- Player-controlled panel dragging/repositioning (GM controls placement)

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
