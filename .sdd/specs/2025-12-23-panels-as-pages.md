---
version: 1.2.0
status: Approved
created: 2025-12-23
last_updated: 2025-12-23
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Panels as Pages Specification

## Executive Summary

Replace the current MCP-tool-based panel system with a file-based approach where panels are markdown files in `{playerRef}/panels/`. The LLM already knows how to use file tools, so storing panels as files with frontmatter metadata simplifies the GM prompt, eliminates custom panel MCP tools, and leverages existing SDK file operations.

This change reduces cognitive load on the LLM (no panel-specific tool documentation needed), makes panel content naturally persistent, and aligns with the codebase philosophy that "all state lives in markdown files."

## User Story

As the **GM (LLM)**, I want to manage panels using standard file read/write operations, so that I can use familiar tools without learning panel-specific MCP commands.

As a **developer**, I want fewer MCP tools to maintain, so that the codebase is simpler and the GM prompt is shorter.

## Stakeholders

- **Primary**: LLM (GM) - uses file tools instead of panel MCP tools
- **Secondary**: Backend developers - maintain simpler panel detection logic
- **Secondary**: Frontend - receives panel updates via existing WebSocket messages
- **Tertiary**: Players - benefit from more reliable panel persistence
- **Tertiary**: Future maintainers - simpler codebase to understand

## Success Criteria

1. GM prompt panel instructions reduced by at least 50% in line count
2. All four panel MCP tools (`create_panel`, `update_panel`, `dismiss_panel`, `list_panels`) removed
3. Panel files with valid frontmatter render correctly in UI
4. Panel file changes detected and processed after SDK file write events complete

## Functional Requirements

### Panel File Structure

- **REQ-F-1**: Panels stored as markdown files at `{playerRef}/panels/{panel-id}.md`
- **REQ-F-2**: Panel ID derived from filename (e.g., `weather-status.md` → ID `weather-status`)
- **REQ-F-3**: Filename validation: alphanumeric + hyphens only, max 32 chars (excluding `.md`)

### Frontmatter Schema

- **REQ-F-4**: Required frontmatter field `title` (string, max 64 chars)
- **REQ-F-5**: Required frontmatter field `position` (enum: `sidebar`, `header`, `overlay`)
- **REQ-F-6**: Optional frontmatter field `priority` (enum: `low`, `medium`, `high`; default `medium`) - influences display when position limits exceeded
- **REQ-F-7**: Panel content is markdown body after frontmatter (guideline: aim for <50 lines; no hard limit)

### Change Detection

- **REQ-F-8**: Server monitors SDK file write events for `{playerRef}/panels/*.md`
- **REQ-F-9**: On file create/update, parse frontmatter and send `panel_create` or `panel_update` WebSocket message
- **REQ-F-10**: On file delete, send `panel_dismiss` WebSocket message

### Panel Lifecycle

- **REQ-F-11**: All file-based panels are persistent (no non-persistent concept)
- **REQ-F-12**: Position-based panel limits enforced by frontend: 2 sidebar, 2 header, 1 overlay (5 total)
- **REQ-F-13**: When position limit exceeded, `priority` field determines which panels display (high > medium > low)
- **REQ-F-14**: Panel ordering within same priority determined by file modification time (oldest first)
- **REQ-F-15**: Panels exceeding position limits remain as files but are hidden from display (user can toggle visibility in future)

### MCP Tool Removal

- **REQ-F-16**: Remove `create_panel` MCP tool from `gm-prompt.ts`
- **REQ-F-17**: Remove `update_panel` MCP tool from `gm-prompt.ts`
- **REQ-F-18**: Remove `dismiss_panel` MCP tool from `gm-prompt.ts`
- **REQ-F-19**: Remove `list_panels` MCP tool from `gm-prompt.ts`
- **REQ-F-20**: Remove panel-related callbacks from `GMMcpCallbacks` interface

### GM Prompt Updates

- **REQ-F-21**: Update GM prompt panel section to document file-based approach
- **REQ-F-22**: Remove panel tool documentation from GM prompt
- **REQ-F-23**: Add frontmatter schema example to GM prompt
- **REQ-F-24**: Rewrite panel patterns skill at `corvran/skills/panel-patterns` for file-based approach

### Validation Feedback

- **REQ-F-25**: When panel file has invalid frontmatter, server logs warning and skips panel (does not crash)
- **REQ-F-26**: When validation fails (missing fields, title >64 chars), GM notified via `query` tool in next turn
- **REQ-F-27**: When multiple panels have identical modification times, ordering is lexicographic by filename

### Frontend Panel Display

- **REQ-F-28**: Panels rendered with fixed max dimensions and scrollable content area
- **REQ-F-29**: GM can list panels by reading the `{playerRef}/panels/` directory (no dedicated tool needed)

## Non-Functional Requirements

- **REQ-NF-1** (Performance): File change detection latency < 500ms from SDK event (aspirational; SDK timing not under our control)
- **REQ-NF-2** (Reliability): Invalid frontmatter files logged and skipped (not crash)
- **REQ-NF-3** (Maintainability): Panel file validation uses existing Zod schemas where possible
- **REQ-NF-4** (Consistency): Panel WebSocket messages unchanged (frontend compatibility)
- **REQ-NF-5** (Security): Panel markdown content sanitized before frontend rendering (XSS prevention via existing markdown renderer)

## Explicit Constraints (DO NOT)

- Do NOT add file watching/polling (rely solely on SDK file events)
- Do NOT support non-persistent panels (all file panels persist)
- Do NOT change frontend PanelContext or WebSocket message formats
- Do NOT create a new panels directory in adventure dir (use playerRef)
- Do NOT require LLM to call a refresh tool after file writes

## Technical Context

- **Existing Stack**: Bun runtime, Hono server, Claude Agent SDK, Zod validation
- **Integration Points**:
  - SDK `PostToolUse` hook - fires after each tool execution including file writes; provides tool name and arguments including file path
  - Existing WebSocket panel messages (`panel_create`, `panel_update`, `panel_dismiss`) - unchanged
  - PanelManager service - to be removed (replaced by file-based detection logic)
- **Patterns to Respect**:
  - State lives in markdown files (existing pattern for characters/worlds)
  - Frontmatter for metadata (matches existing System.md pattern)

## Acceptance Tests

1. **Create Panel via File**: GM writes `{playerRef}/panels/weather.md` with valid frontmatter → frontend displays panel in correct position
2. **Update Panel via File**: GM overwrites `{playerRef}/panels/weather.md` with new content → frontend updates panel content
3. **Delete Panel via File**: GM deletes `{playerRef}/panels/weather.md` → frontend removes panel
4. **Invalid Frontmatter**: GM writes panel file with missing `position` → server logs warning, panel not created
5. **Position Limit with Priority**: GM creates 3rd sidebar panel with `priority: high` → high-priority panel displays, lowest-priority sidebar panel hidden
6. **Scrollable Content**: GM creates panel with 100+ lines of content → panel displays with scroll bar, content not truncated

## Open Questions

All questions resolved:
- ~~What is the exact SDK file event structure?~~ → SDK provides `PostToolUse` hook that fires after tool execution with tool name and arguments (including file path for Write tool)
- ~~Should `list_panels` be replaced?~~ → No dedicated tool needed; GM reads `{playerRef}/panels/` directory directly (REQ-F-29)

## Out of Scope

- Player-initiated panel dismissal (remains local-only in frontend)
- Panel minimization (remains local-only in frontend)
- Panel drag position persistence (remains local-only in frontend)
- Real-time collaborative panel editing (single-user system)

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
