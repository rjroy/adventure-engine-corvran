---
specification: [.sdd/specs/2025-12-23-panels-as-pages.md](./../specs/2025-12-23-panels-as-pages.md)
status: Approved
version: 1.0.0
created: 2025-12-23
last_updated: 2025-12-23
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Panels as Pages - Technical Plan

## Overview

This plan describes the architectural approach for transitioning from MCP-tool-based panel management to a file-based system where panels are markdown files with frontmatter in `{playerRef}/panels/`. The core insight is leveraging the SDK's `PostToolUse` hook to detect file writes and emit panel WebSocket messages, eliminating the need for custom MCP tools while maintaining frontend compatibility.

**Key Strategies**:
- Hook into SDK `PostToolUse` events to detect panel file writes (no file watching needed)
- Parse YAML frontmatter for panel metadata, markdown body for content
- Emit existing `panel_create`/`panel_update`/`panel_dismiss` WebSocket messages (frontend unchanged)
- Remove four MCP tools and simplify GM prompt instructions

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude Agent SDK                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ GM (Claude)  │───>│ Write Tool   │───>│ PostToolUse Hook     │  │
│  │              │    │ (files)      │    │ (fires after write)  │  │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘  │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │
                                     Hook provides: tool name, args (file path)
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend (game-session.ts)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PostToolUse Handler                                           │  │
│  │ - Check: Is path {playerRef}/panels/*.md?                     │  │
│  │ - Read file, parse frontmatter                                │  │
│  │ - Validate schema                                             │  │
│  │ - Emit WebSocket message                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ panel_create    │    │ panel_update    │    │ panel_dismiss   │ │
│  │ (new file)      │    │ (overwrite)     │    │ (file deleted)  │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket (unchanged message format)
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (unchanged)                          │
│  PanelContext receives messages, updates state, renders panels       │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Responsibility | Changes |
|-----------|---------------|---------|
| `game-session.ts` | SDK query orchestration | Add PostToolUse hook handler |
| `gm-prompt.ts` | MCP tools, GM instructions | Remove 4 panel MCP tools, update panel docs |
| `panel-file-parser.ts` | **NEW** - Parse panel files | Frontmatter extraction, validation |
| `services/panel-manager.ts` | Panel validation, state | Simplify (remove in-memory state tracking) |
| `shared/protocol.ts` | WebSocket messages | No changes (REQ-NF-4) |
| `PanelContext.tsx` | Frontend panel state | No changes (REQ-NF-4) |
| `corvran/skills/panel-patterns/` | GM guidance | Rewrite for file-based approach |

## Technical Decisions

### TD-1: SDK PostToolUse Hook for Change Detection

**Choice**: Use SDK `PostToolUse` hook to detect panel file writes instead of file watching or polling.

**Requirements**: REQ-F-1, REQ-F-8, REQ-F-9, REQ-F-10, Explicit Constraint (no file watching)

**Rationale**:
- The SDK provides a `PostToolUse` hook that fires after every tool execution, including `Write` operations
- Hook receives tool name and arguments (which include file path for Write)
- This eliminates need for file watchers/polling which would add complexity and have timing issues
- We already intercept SDK messages in `game-session.ts` - adding hook handling is natural
- Path-based filtering (`{playerRef}/panels/*.md`) at location REQ-F-1 specifies is deterministic and testable

**Alternatives Considered**:
- **File watching (inotify/fsevents)**: Rejected - adds OS-specific complexity, timing races with SDK writes, resource overhead for idle watching
- **Polling**: Rejected - inefficient (constant disk reads), timing races, doesn't know when writes complete
- **MCP tool result inspection**: Rejected - PostToolUse is cleaner, fires for all file operations not just MCP

**Implementation Approach**:
1. In `game-session.ts`, add `PostToolUse` callback to SDK query options
2. Filter for `Write` tool calls where path matches `{playerRef}/panels/*.md`
3. After write completes, read file and parse frontmatter
4. Emit appropriate WebSocket message based on operation

### TD-2: Frontmatter Schema with Zod Validation

**Choice**: Define panel frontmatter schema using Zod for validation.

**Requirements**: REQ-F-4, REQ-F-5, REQ-F-6, REQ-NF-3, REQ-F-25

**Rationale**:
- Project already uses Zod extensively for validation (shared/protocol.ts, server validation)
- Zod provides clear error messages for GM feedback (REQ-F-26)
- Schema can be shared with TypeScript types for compile-time safety
- Matches existing pattern: `PanelSchema` in protocol.ts can inform frontmatter schema

**Schema Design**:
```typescript
const PanelFrontmatterSchema = z.object({
  title: z.string().min(1).max(64),
  position: z.enum(["sidebar", "header", "overlay"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
```

### TD-3: YAML Frontmatter Parsing with gray-matter

**Choice**: Use `gray-matter` library for frontmatter parsing.

**Requirements**: REQ-F-4, REQ-F-5, REQ-F-6, REQ-F-7

**Rationale**:
- Industry-standard library for frontmatter parsing (used by Jekyll, Gatsby, etc.)
- Already handles edge cases (empty content, malformed YAML, etc.)
- Returns both frontmatter object and content body in one call
- Small, well-maintained dependency with no transitive dependencies

**Alternative Considered**: Manual regex parsing - rejected due to YAML complexity (multi-line strings, escaping, etc.)

### TD-4: Panel ID Derived from Filename

**Choice**: Derive panel ID from filename (without `.md` extension).

**Requirements**: REQ-F-2, REQ-F-3

**Rationale**:
- Filesystem already enforces uniqueness within a directory
- Simpler than requiring ID in frontmatter (one less field to validate)
- Matches existing pattern: character/world slugs derived from directory names
- Validation: alphanumeric + hyphens, max 32 chars (same as current PanelSchema)

**Implementation**:
```typescript
function derivePanelId(filePath: string): string | null {
  const filename = path.basename(filePath, '.md');
  if (!/^[a-zA-Z0-9-]{1,32}$/.test(filename)) return null;
  return filename;
}
```

### TD-5: Priority-Based Display Ordering

**Choice**: Frontend enforces position limits using `priority` field, file modification time, and lexicographic filename as tie-breaker.

**Requirements**: REQ-F-12, REQ-F-13, REQ-F-14, REQ-F-15, REQ-F-27

**Rationale**:
- Position limits (2 sidebar, 2 header, 1 overlay) are display concerns, not data concerns
- All panels remain as files (persistence), only visibility is affected
- Priority (high > medium > low) determines which panels show when limit exceeded
- Modification time (oldest first) breaks ties within same priority
- REQ-F-27: When modification times are identical, lexicographic filename ordering provides deterministic tie-breaking
- This keeps backend simple (just parses and forwards) while frontend handles display logic

**Ordering Algorithm** (frontend implementation):
```
1. Group panels by position
2. For each position, sort by:
   a. priority (high > medium > low)
   b. modification time (oldest first)
   c. filename lexicographically (a-z) for identical timestamps
3. Display only first N panels per position limit (2 sidebar, 2 header, 1 overlay)
```

**Note**: Spec states frontend enforces limits (REQ-F-12), so this requires no backend logic for limit enforcement - backend sends all panels, frontend filters for display.

### TD-6: Delete Detection via PostToolUse on Bash rm

**Choice**: Detect panel deletion when SDK executes file removal commands.

**Requirements**: REQ-F-10

**Rationale**:
- SDK doesn't have a dedicated "Delete" tool, but `Bash` tool can execute `rm` commands
- We can detect `rm` or `unlink` in Bash commands targeting panel paths
- Alternative: If SDK adds a Delete tool, we can handle that directly in PostToolUse
- We track known panels to detect removals (file exists in our state but not on disk)

**Implementation Approach**:
1. PostToolUse handler checks for Bash tool with `rm` command matching panel path pattern
2. Also: On any panel directory operation, compare known panels vs filesystem state
3. For any panel that existed but no longer has a file, emit `panel_dismiss`

### TD-7: GM Notification via Query Tool for Validation Errors

**Choice**: When panel file validation fails, log warning and notify GM in next SDK response.

**Requirements**: REQ-F-25, REQ-F-26

**Rationale**:
- We cannot directly "talk back" to the GM during a turn - the response is already being generated
- The SDK `query` tool result can include feedback that the GM sees
- By returning validation error in the next turn, GM can correct the file
- This aligns with existing patterns: SDK tool results provide feedback to Claude

**Implementation**:
- Store validation errors in session state
- On next query, prepend error context to system prompt or include in first tool result
- Error format: `Panel file validation failed: {filename} - {error message}`

### TD-8: Simplified PanelManager (State Removed)

**Choice**: Remove in-memory panel state tracking from PanelManager; files are source of truth.

**Requirements**: REQ-F-11 (all file panels are persistent)

**Rationale**:
- Current PanelManager tracks panels in memory and syncs to state.json
- With file-based approach, panel files ARE the state - no memory layer needed
- PanelManager can be reduced to validation utilities only, or removed entirely
- Simplifies architecture: no dual state to keep in sync

**What to Keep**:
- Validation functions (ID format, content size, position values)
- Move to `panel-file-parser.ts` or keep as utility module

**What to Remove**:
- `panels: Map<string, Panel>` in-memory storage
- CRUD methods (create, update, dismiss, list, restore)
- State sync with AdventureStateManager

### TD-9: MCP Tool Removal and GM Prompt Restructure

**Choice**: Remove all four panel MCP tools and rewrite GM prompt instructions for file-based approach.

**Requirements**: REQ-F-16, REQ-F-17, REQ-F-18, REQ-F-19, REQ-F-20, REQ-F-21, REQ-F-22, REQ-F-23, REQ-F-24

**Rationale**:
- Primary goal per spec Executive Summary: "reduces cognitive load on the LLM (no panel-specific tool documentation needed)"
- File operations are already familiar to the GM - leverages existing knowledge rather than adding new tool surface
- Removes ~200 lines of MCP tool code from `gm-prompt.ts`
- GM prompt becomes shorter and clearer (50%+ reduction per REQ success criteria)

**MCP Tools to Remove** (REQ-F-16-20):
| Tool | Function | Location |
|------|----------|----------|
| `create_panel` | Create new panel | `gm-prompt.ts:createCreatePanelTool()` |
| `update_panel` | Update panel content | `gm-prompt.ts:createUpdatePanelTool()` |
| `dismiss_panel` | Remove panel | `gm-prompt.ts:createDismissPanelTool()` |
| `list_panels` | List active panels | `gm-prompt.ts:createListPanelsTool()` |

Also remove from `GMMcpCallbacks` interface:
- `onCreatePanel`, `onUpdatePanel`, `onDismissPanel`, `onListPanels`

And remove from `allowedTools` array in `game-session.ts`:
- `mcp__adventure-gm__create_panel`
- `mcp__adventure-gm__update_panel`
- `mcp__adventure-gm__dismiss_panel`
- `mcp__adventure-gm__list_panels`

**GM Prompt Updates** (REQ-F-21-23):

Replace current panel section (~80 lines of tool documentation) with file-based instructions:

```markdown
## INFO PANELS (File-Based)

Display contextual information via markdown files in `{playerRef}/panels/`.

**Create panel**: Write file at `{playerRef}/panels/{id}.md` with frontmatter:
```yaml
---
title: Panel Title
position: sidebar|header|overlay
priority: low|medium|high  # optional, default: medium
---
Panel content in markdown...
```

**Update panel**: Overwrite the file with new content
**Remove panel**: Delete the file
**List panels**: Read the `{playerRef}/panels/` directory

**Position Limits**: Frontend displays max 2 sidebar, 2 header, 1 overlay.
When limits exceeded, higher priority panels shown first.

**Panel ID**: Filename without `.md` (alphanumeric + hyphens, max 32 chars)
```

**Corvran Skill Rewrite** (REQ-F-24):

Update `corvran/skills/panel-patterns/SKILL.md`:
- Replace all `create_panel`/`update_panel`/`dismiss_panel` MCP tool references with file operations
- Update "Using This Skill" section with file-based workflow
- Update examples to show frontmatter syntax instead of tool calls
- Keep all pattern templates (weather, status, timer, etc.) - only change how they're created

## Data Model

### Panel File Structure

**Location**: `{PROJECT_DIR}/{playerRef}/panels/{panel-id}.md`

**Example**: `/path/to/project/players/kael-thouls/panels/weather-status.md`

```markdown
---
title: Current Weather
position: sidebar
priority: medium
---

**Heavy Rain**
- Visibility: 60ft
- Ranged attacks: Disadvantage
- Duration: 2 hours remaining
```

### Frontmatter Fields

| Field | Type | Required | Constraints | Default |
|-------|------|----------|-------------|---------|
| `title` | string | Yes | 1-64 chars | - |
| `position` | enum | Yes | sidebar, header, overlay | - |
| `priority` | enum | No | low, medium, high | medium |

### Derived Fields

| Field | Source |
|-------|--------|
| `id` | Filename without `.md` |
| `content` | Markdown body after frontmatter |
| `createdAt` | File creation time (stat) |
| `persistent` | Always `true` (all file panels persist) |

## Integration Points

### SDK PostToolUse Hook

**Integration Type**: Event callback
**Data Flow**: SDK → Backend (hook fires after tool execution)

The SDK `query()` function accepts options including hooks. We'll use `PostToolUse`:

```typescript
const sdkQuery = query({
  prompt: input,
  options: {
    // ... existing options ...
    hooks: {
      PostToolUse: async (toolName: string, args: unknown) => {
        await this.handlePostToolUse(toolName, args);
      },
    },
  },
});
```

### Existing WebSocket Messages (Unchanged)

**Integration Type**: Message passing
**Data Flow**: Backend → Frontend (via WebSocket)

Messages emitted remain identical to current implementation:
- `panel_create`: Full `Panel` object payload
- `panel_update`: `{ id, content }` payload
- `panel_dismiss`: `{ id }` payload

### AdventureStateManager

**Integration Type**: State persistence
**Changes**: Remove panel-related methods

Current methods to remove:
- `getPanels()` - panels live in files now
- `setPanels()` - no longer needed
- `panels` field in AdventureState interface - remove

**Migration**: Existing `state.json` `panels` array will be ignored; file-based panels take precedence.

## Error Handling, Performance, Security

### Error Strategy

| Error Type | Handling | User Feedback |
|------------|----------|---------------|
| Invalid frontmatter | Log warning, skip panel | GM notified next turn (REQ-F-26) |
| Missing required field | Log warning, skip panel | GM notified with specific field |
| Title >64 chars | Log warning, skip panel | GM notified with limit |
| Invalid filename | Log warning, skip panel | GM notified with format |
| File read failure | Log error, skip panel | GM sees panel not created |

**Non-crash Guarantee** (REQ-F-25, REQ-NF-2): All validation failures are logged and skipped - server never crashes on bad panel files.

### Performance Targets

- **File change detection latency**: <500ms from SDK event (REQ-NF-1)
  - PostToolUse hook fires immediately after tool completes
  - File read + parse + emit: <50ms typical (small files, local disk)
  - Latency is aspirational; SDK timing not under our control

- **File parse overhead**: Negligible
  - Panel files are small (<2KB content guideline)
  - gray-matter parsing is fast (<5ms for typical files)

### Security Measures

- **XSS Prevention** (REQ-NF-5): Panel content sanitized by frontend markdown renderer (existing implementation)
- **Path Traversal**: Panel path must be within `{playerRef}/panels/` - reject paths with `..`
- **Content Size**: No hard enforcement needed (2KB is guideline), but validate for sanity

## Testing Strategy

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| `panel-file-parser.ts` | Frontmatter parsing, validation, edge cases |
| `derivePanelId()` | Filename validation, edge cases |
| PostToolUse handler | Path filtering, operation detection |

**Coverage Target**: 90%+ for new parsing logic

### Integration Tests

| Scenario | Verification |
|----------|--------------|
| Create panel via file write | WebSocket `panel_create` received with correct payload |
| Update panel via file overwrite | WebSocket `panel_update` received |
| Delete panel via file removal | WebSocket `panel_dismiss` received |
| Invalid frontmatter | Server logs warning, no WebSocket message, GM notified next turn |
| Position limit display | Frontend shows only allowed panels per position |

### Acceptance Tests (from Spec)

1. **Create Panel via File**: GM writes valid panel file → frontend displays panel
2. **Update Panel via File**: GM overwrites file → frontend updates content
3. **Delete Panel via File**: GM deletes file → frontend removes panel
4. **Invalid Frontmatter**: Missing `position` → server logs, panel not created
5. **Position Limit with Priority**: 3rd sidebar panel with high priority → high-priority shows, lowest hidden
6. **Scrollable Content**: Panel with 100+ lines → scrollable, not truncated

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK hook API changes | Low | High | Pin SDK version, test on upgrade |
| File write timing issues | Low | Medium | PostToolUse fires after completion, inherently safe |
| GM writes malformed YAML | Medium | Low | Graceful degradation, feedback to GM |
| Large panel files slow parsing | Low | Low | Content guideline <50 lines, gray-matter is fast |
| Delete detection edge cases | Medium | Medium | Track known panels, verify filesystem state |
| Migration from existing state.json panels | Low | Low | Ignore old panels array; file-based takes precedence; no active users yet |

## Dependencies

### Technical

| Dependency | Purpose | Notes |
|------------|---------|-------|
| `gray-matter` | Frontmatter parsing | Add to backend package.json |
| Claude Agent SDK | PostToolUse hook | Already installed, verify hook support |
| Zod | Schema validation | Already installed |

### Team/Coordination

- **GM Prompt Update**: Coordinate with changes to corvran plugin skills
- **Documentation**: Update panel-patterns skill for file-based approach

## Out of Scope (Frontend-Only Requirements)

The following spec requirements require no backend changes:

| Requirement | Reason |
|-------------|--------|
| REQ-F-28 | Panel rendering with fixed max dimensions and scrollable content - frontend CSS/component concern |
| REQ-F-29 | GM lists panels via directory reading - GM uses existing SDK Read/Glob tools on `{playerRef}/panels/` |

## Open Questions

- [ ] Confirm exact SDK `PostToolUse` hook signature and available tool arguments
- [ ] Decide: Should we support `x`/`y` overlay positioning in frontmatter or remove overlay coordinates entirely?
