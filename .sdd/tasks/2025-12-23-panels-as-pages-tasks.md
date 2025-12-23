---
specification: [.sdd/specs/2025-12-23-panels-as-pages.md](./../specs/2025-12-23-panels-as-pages.md)
plan: [.sdd/plans/2025-12-23-panels-as-pages-plan.md](./../plans/2025-12-23-panels-as-pages-plan.md)
status: Draft
version: 1.0.0
created: 2025-12-23
last_updated: 2025-12-23
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Panels as Pages - Task Breakdown

## Task Summary
Total: 12 tasks | Complexity Distribution: 4×S, 6×M, 2×L

## Foundation

### TASK-001: Add gray-matter dependency
**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Add `gray-matter` package for YAML frontmatter parsing.

**Acceptance Criteria**:
- [ ] `gray-matter` added to backend `package.json`
- [ ] Package installs successfully with `bun install`
- [ ] Type definitions available (built-in or `@types/gray-matter`)

**Files**: Modify: `backend/package.json`

**Testing**: `bun install` succeeds, `import matter from 'gray-matter'` compiles

---

### TASK-002: Create panel file parser module
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create `panel-file-parser.ts` with frontmatter parsing, validation, and panel ID derivation.

**Acceptance Criteria**:
- [ ] `PanelFrontmatterSchema` validates `title` (1-64 chars), `position` (enum), `priority` (optional enum, default medium)
- [ ] `parsePanelFile(content: string)` returns `{ frontmatter, body }` or validation error
- [ ] `derivePanelId(filePath: string)` extracts ID from filename (alphanumeric + hyphens, max 32 chars)
- [ ] `isPanelPath(path: string, playerRef: string)` checks if path matches `{playerRef}/panels/*.md`
- [ ] Validation errors include specific field/constraint that failed

**Files**: Create: `backend/src/services/panel-file-parser.ts`

**Testing**: Unit tests for valid/invalid frontmatter, ID derivation edge cases, path matching

---

## Backend Services

### TASK-003: Implement PostToolUse hook handler
**Priority**: Critical | **Complexity**: L | **Dependencies**: TASK-002

**Description**: Add PostToolUse hook to SDK query in `game-session.ts` to detect panel file operations.

**Acceptance Criteria**:
- [ ] PostToolUse hook registered in SDK query options
- [ ] Hook filters for Write tool calls matching `{playerRef}/panels/*.md`
- [ ] Hook detects Bash `rm` commands targeting panel files
- [ ] On panel file write: read file, parse frontmatter, emit `panel_create` or `panel_update`
- [ ] On panel file delete: emit `panel_dismiss`
- [ ] Invalid frontmatter logged as warning, panel skipped (no crash)
- [ ] Validation errors stored in session state array, cleared after delivery to GM

**Files**: Modify: `backend/src/game-session.ts`

**Testing**: Integration tests for create/update/delete detection, invalid file handling

---

### TASK-004: Track known panels for delete detection
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Track panels sent to frontend to detect deletions (file existed, now gone).

**Acceptance Criteria**:
- [ ] Session tracks set of known panel IDs
- [ ] On `panel_create`, add ID to set
- [ ] On `panel_dismiss`, remove ID from set
- [ ] On Bash tool with potential panel operations, verify filesystem state
- [ ] Emit `panel_dismiss` for panels in set but not on disk

**Files**: Modify: `backend/src/game-session.ts`

**Testing**: Unit test for state tracking, integration test for delete detection

---

### TASK-005: Add GM validation feedback mechanism
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Store panel validation errors and include them in next GM turn.

**Acceptance Criteria**:
- [ ] Validation errors stored in session state array, cleared after delivery
- [ ] On next query, errors prepended to system prompt as `## Panel Validation Errors` section
- [ ] Error format: `Panel file validation failed: {filename} - {error message}`
- [ ] Multiple errors batched together in single section

**Files**: Modify: `backend/src/game-session.ts`

**Testing**: Integration test: write invalid file → next turn sees error message

---

### TASK-006: Remove PanelManager in-memory state
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Simplify or remove `panel-manager.ts` - files are now source of truth.

**Acceptance Criteria**:
- [ ] Remove `panels: Map<string, Panel>` storage
- [ ] Remove CRUD methods (create, update, dismiss, list, restore)
- [ ] Delete `panel-manager.ts` entirely (validation moved to `panel-file-parser.ts` in TASK-002)
- [ ] Remove panel state sync with AdventureStateManager

**Files**:
- Modify or Delete: `backend/src/services/panel-manager.ts`
- Modify: `backend/src/adventure-state.ts` (remove `panels` field references)

**Testing**: Existing tests updated/removed, no panel state in `state.json`

---

## MCP Tools & GM Prompt

### TASK-007: Remove panel MCP tools
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Remove all four panel MCP tools and their callbacks.

**Acceptance Criteria**:
- [ ] Remove `createCreatePanelTool()`, `createUpdatePanelTool()`, `createDismissPanelTool()`, `createListPanelsTool()`
- [ ] Remove `onCreatePanel`, `onUpdatePanel`, `onDismissPanel`, `onListPanels` from `GMMcpCallbacks`
- [ ] Remove panel tools from `allowedTools` array in `game-session.ts`
- [ ] No references to `mcp__adventure-gm__*_panel` remain

**Files**:
- Modify: `backend/src/gm-prompt.ts`
- Modify: `backend/src/game-session.ts`

**Testing**: Grep for removed tool names returns no results

---

### TASK-008: Update GM prompt panel documentation
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-007

**Description**: Replace tool-based panel documentation with file-based instructions.

**Acceptance Criteria**:
- [ ] Panel section reduced by 50%+ (per spec success criteria)
- [ ] Documents file location `{playerRef}/panels/{id}.md`
- [ ] Includes frontmatter schema example
- [ ] Explains create/update/delete via file operations
- [ ] Notes position limits (2 sidebar, 2 header, 1 overlay) and priority

**Files**: Modify: `backend/src/gm-prompt.ts`

**Testing**: Manual review; verify panel section reduced from ~80 lines (current) to <40 lines

---

### TASK-009: Update panel-patterns skill
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-008

**Description**: Rewrite `corvran/skills/panel-patterns/SKILL.md` for file-based approach.

**Acceptance Criteria**:
- [ ] Replace all MCP tool references with file operations
- [ ] Update examples to show frontmatter syntax
- [ ] Keep pattern templates (weather, status, timer, etc.)
- [ ] Update "Using This Skill" section

**Files**: Modify: `corvran/skills/panel-patterns/SKILL.md`

**Testing**: Manual review for consistency with new approach

---

## Testing

### TASK-010: Add panel file parser unit tests
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Comprehensive unit tests for panel parsing and validation.

**Acceptance Criteria**:
- [ ] Valid frontmatter parsing (all field combinations)
- [ ] Invalid frontmatter handling (missing fields, wrong types, over limits)
- [ ] Panel ID derivation (valid filenames, invalid chars, length limits)
- [ ] Path matching (correct player ref, edge cases)
- [ ] Error messages are specific and actionable

**Files**: Create: `backend/tests/unit/panel-file-parser.test.ts`

**Testing**: `bun run test:unit` passes, coverage >90% for parser module

---

### TASK-011: Add PostToolUse integration tests
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-003, TASK-004, TASK-005

**Description**: Integration tests for panel file detection and WebSocket emission.

**Acceptance Criteria**:
- [ ] Test: Write valid panel file → `panel_create` WebSocket message
- [ ] Test: Overwrite panel file → `panel_update` WebSocket message
- [ ] Test: Delete panel file via Write (empty) → `panel_dismiss` WebSocket message
- [ ] Test: Bash `rm` command on panel file → `panel_dismiss` WebSocket message
- [ ] Test: Invalid frontmatter → warning logged, no message sent
- [ ] Test: GM notification received for validation errors next turn

**Files**: Create: `backend/tests/integration/panel-files.test.ts`

**Testing**: `bun run test:integration` passes

---

## Documentation

### TASK-012: Update AdventureState interface
**Priority**: Low | **Complexity**: S | **Dependencies**: TASK-006

**Description**: Remove deprecated `panels` field from state types.

**Acceptance Criteria**:
- [ ] Remove `panels` field from `AdventureState` interface
- [ ] Update any type references
- [ ] Existing `state.json` files with `panels` array ignored (no migration needed)

**Files**:
- Modify: `backend/src/adventure-state.ts`
- Modify: `shared/types.ts` (if panel state types exist)

**Testing**: Typecheck passes, no references to removed fields

---

## Dependency Graph

```
TASK-001 (gray-matter)
    │
    ▼
TASK-002 (parser) ─────────────────────┐
    │                                   │
    ▼                                   ▼
TASK-003 (PostToolUse) ◄──────── TASK-010 (parser tests)
    │
    ├─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
TASK-004  TASK-005  TASK-006  TASK-007
(tracking) (feedback) (cleanup)  (MCP removal)
    │         │         │         │
    └─────────┴─────────┴─────────┤
                                  ▼
                            TASK-008 (GM prompt)
                                  │
                                  ▼
                            TASK-009 (skill update)

TASK-003 + TASK-004 + TASK-005 ──► TASK-011 (integration tests)
TASK-006 ──► TASK-012 (state cleanup)
```

## Implementation Order

**Phase 1 (Foundation)**: TASK-001, TASK-002
- Sequential: TASK-001 must complete before TASK-002

**Phase 2 (Core Backend)**: TASK-003, TASK-010
- TASK-003 and TASK-010 can run in parallel after Phase 1

**Phase 3 (Backend Features)**: TASK-004, TASK-005, TASK-006, TASK-007
- All can run in parallel after TASK-003
- TASK-006 and TASK-007 are independent

**Phase 4 (Prompt & Docs)**: TASK-008, TASK-009, TASK-012
- TASK-008 depends on TASK-007
- TASK-009 depends on TASK-008
- TASK-012 depends on TASK-006

**Phase 5 (Integration Tests)**: TASK-011
- Requires TASK-003, TASK-004, TASK-005

## Notes

- **Parallelization**: Phase 3 tasks (004-007) can be developed in parallel
- **Critical path**: 001 → 002 → 003 → 007 → 008 → 009
- **Frontend unchanged**: No frontend tasks needed (REQ-NF-4)
- **Frontend-only requirements** (no backend tasks needed):
  - REQ-F-27: Lexicographic tie-breaking (frontend sorting logic)
  - REQ-F-28: Scrollable panel content (frontend CSS)
  - REQ-F-29: GM lists panels via directory (uses existing SDK Read/Glob tools)
