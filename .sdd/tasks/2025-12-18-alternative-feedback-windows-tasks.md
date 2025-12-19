---
specification: [.sdd/specs/2025-12-18-alternative-feedback-windows.md](./../specs/2025-12-18-alternative-feedback-windows.md)
plan: [.sdd/plans/2025-12-18-alternative-feedback-windows-plan.md](./../plans/2025-12-18-alternative-feedback-windows-plan.md)
status: Approved
version: 1.0.0
created: 2025-12-18
last_updated: 2025-12-18
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Alternative Feedback Windows - Task Breakdown

## Task Summary
Total: 12 tasks | Complexity Distribution: 4×S, 6×M, 2×L

## Foundation

### TASK-001: Define Panel Protocol Types
**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Add panel-related types and Zod schemas to shared protocol.

**Acceptance Criteria**:
- [ ] `Panel` interface defined with id, title, content, position, persistent, x?, y?, createdAt
- [ ] `PanelPosition` type defined as union: "sidebar" | "header" | "overlay"
- [ ] `PanelCreateMessage`, `PanelUpdateMessage`, `PanelDismissMessage` interfaces added
- [ ] Zod schemas for all panel messages with proper validation
- [ ] Message types added to `ServerMessage` union

**Files**: Modify: `shared/protocol.ts`

**Testing**: TypeScript compilation passes; schemas reject invalid payloads

---

### TASK-002: Implement PanelManager Backend Service
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create backend service for panel validation and state management.

**Acceptance Criteria**:
- [ ] `PanelManager` class with methods: `create()`, `update()`, `dismiss()`, `list()`, `getAll()`
- [ ] Validates 5-panel limit (REQ-F-14)
- [ ] Validates unique IDs (REQ-F-15)
- [ ] Validates 2KB content limit using `Buffer.byteLength()` (REQ-F-21)
- [ ] Validates ID format: alphanumeric + hyphens, max 32 chars
- [ ] Returns descriptive errors for all failure cases
- [ ] Tracks creation order for stacking (REQ-F-22)

**Files**: Create: `backend/src/services/panel-manager.ts`

**Testing**: Unit tests for all validation scenarios and CRUD operations

---

## Backend Integration

### TASK-003: Add Panel State Persistence
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Extend adventure state to persist panels across sessions.

**Acceptance Criteria**:
- [ ] `AdventureState` interface includes `panels: Panel[]`
- [ ] `save()` filters out non-persistent panels before writing
- [ ] `load()` returns panels array (empty if not present in legacy state)
- [ ] Schema migration handles missing `panels` field gracefully

**Files**: Modify: `backend/src/adventure-state.ts`

**Testing**: Unit tests for save/load with persistent and non-persistent panels

---

### TASK-004: Create Panel MCP Tools
**Priority**: Critical | **Complexity**: L | **Dependencies**: TASK-002, TASK-003

**Description**: Implement MCP tools for GM panel control.

**Acceptance Criteria**:
- [ ] `create_panel` tool with parameters: id, title, content, position, persistent, x?, y?
- [ ] `update_panel` tool with parameters: id, content
- [ ] `dismiss_panel` tool with parameter: id
- [ ] `list_panels` tool returns array of current panels
- [ ] Callbacks wired: `onCreatePanel`, `onUpdatePanel`, `onDismissPanel`, `onListPanels`
- [ ] GameSession emits `panel_create`, `panel_update`, `panel_dismiss` WebSocket messages
- [ ] Tool descriptions include POSITIONS guidance and LIMITS warnings (5 panels, 2KB)

**Files**:
- Modify: `backend/src/gm-prompt.ts` (add tools)
- Modify: `backend/src/game-session.ts` (wire callbacks, emit messages)

**Testing**: Integration tests for tool execution and WebSocket message emission

---

### TASK-005: Update GM System Prompt
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-004

**Description**: Add panel usage guidance to GM prompt.

**Acceptance Criteria**:
- [ ] PANEL GUIDANCE section added to `buildGMSystemPrompt()`
- [ ] Explains when to use panels vs narrative text
- [ ] Documents position choices (sidebar for status, header for alerts, overlay for special)
- [ ] Warns about 5-panel limit and 2KB content limit

**Files**: Modify: `backend/src/gm-prompt.ts`

**Testing**: Verify prompt includes panel guidance; manual review of guidance quality

---

## Frontend - State Management

### TASK-006: Create PanelContext Provider
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-001

**Description**: React context for centralized panel state management.

**Acceptance Criteria**:
- [ ] `PanelContext` with panels array and minimized set
- [ ] `addPanel()`, `updatePanel()`, `removePanel()` actions
- [ ] `toggleMinimize()` action for local minimize state (REQ-F-18)
- [ ] `usePanels()` hook for component access
- [ ] Panels ordered by createdAt for consistent stacking (REQ-F-22)

**Files**: Create: `frontend/src/contexts/PanelContext.tsx`

**Testing**: Unit tests for all state mutations and minimize toggle

---

### TASK-007: Integrate Panels into useWebSocket Hook
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-006

**Description**: Handle panel WebSocket messages in existing hook.

**Acceptance Criteria**:
- [ ] `panel_create` message calls `addPanel()`
- [ ] `panel_update` message calls `updatePanel()`
- [ ] `panel_dismiss` message calls `removePanel()`
- [ ] Error handling for malformed messages

**Files**: Modify: `frontend/src/hooks/useWebSocket.ts`

**Testing**: Unit tests with mock WebSocket messages

---

## Frontend - Components

### TASK-008: Create InfoPanel Component
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-006

**Description**: Individual panel display component.

**Acceptance Criteria**:
- [ ] Renders title bar with minimize button
- [ ] Renders markdown content via `react-markdown` with allowedElements: `p`, `strong`, `em`, `ul`, `ol`, `li`
- [ ] Collapsed state shows only title bar (REQ-F-16, REQ-F-17)
- [ ] Inherits theme styling via CSS variables (REQ-NF-4)
- [ ] `React.memo` for performance optimization

**Files**:
- Create: `frontend/src/components/InfoPanel.tsx`
- Create: `frontend/src/components/InfoPanel.css`

**Testing**: Unit tests for render states, minimize toggle, markdown sanitization

---

### TASK-009: Create PanelZone Layout Components
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-008

**Description**: Container components for positioned panel rendering.

**Acceptance Criteria**:
- [ ] `SidebarPanelZone` renders sidebar panels in vertical stack
- [ ] `HeaderPanelZone` renders header panels in horizontal flow
- [ ] `OverlayPanelContainer` renders overlay panels with absolute positioning
- [ ] Zones filter panels by position from context
- [ ] Layout doesn't obscure narrative log (REQ-NF-2)

**Files**:
- Create: `frontend/src/components/PanelZones.tsx`
- Create: `frontend/src/components/PanelZones.css`
- Modify: `frontend/src/App.tsx` (add PanelProvider and zone components)

**Testing**: Visual verification; unit tests for panel filtering by position

---

## Testing

### TASK-010: Backend Unit and Integration Tests
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-004

**Description**: Comprehensive backend test coverage for panel system.

**Acceptance Criteria**:
- [ ] PanelManager unit tests: limit, uniqueness, size validation
- [ ] GameSession integration tests: tool execution → WebSocket emission
- [ ] State persistence tests: save/load persistent panels
- [ ] Error tests for REQ-F-19: invalid position, exceeded limit, content too large
- [ ] Error tests for REQ-F-20: update/dismiss non-existent panel
- [ ] Error tests for REQ-F-21: content exceeds 2KB

**Files**:
- Create: `backend/tests/unit/panel-manager.test.ts`
- Modify: `backend/tests/integration/game-session.test.ts` (add panel tests)

**Testing**: `bun run test` passes with >80% coverage on panel code

---

### TASK-011: Frontend Unit Tests
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-009

**Description**: React component and context test coverage.

**Acceptance Criteria**:
- [ ] PanelContext tests: state mutations, minimize toggle
- [ ] InfoPanel tests: markdown rendering, collapse/expand
- [ ] PanelZone tests: correct panel filtering
- [ ] useWebSocket integration: message handling

**Files**:
- Create: `frontend/tests/PanelContext.test.tsx`
- Create: `frontend/tests/InfoPanel.test.tsx`

**Testing**: `bun run test` passes with >80% coverage on panel code

---

### TASK-012: E2E Panel Flow Tests
**Priority**: Medium | **Complexity**: L | **Dependencies**: TASK-010, TASK-011

**Description**: End-to-end tests for complete panel lifecycle.

**Acceptance Criteria**:
- [ ] Test: GM creates panel → visible in sidebar
- [ ] Test: GM updates panel → content changes in place
- [ ] Test: GM dismisses panel → removed from UI
- [ ] Test: Create 5 panels → 6th fails with error
- [ ] Test: Reload adventure → persistent panels restored
- [ ] Test: Player minimize/expand interaction

**Files**: Create: `e2e/tests/panels.spec.ts`

**Testing**: `bun test` in e2e directory passes

---

## Dependency Graph
```
TASK-001 (Protocol) ──┬─> TASK-002 (PanelManager) ──┬─> TASK-004 (MCP Tools) ─> TASK-005 (Prompt)
                      │                              │
                      ├─> TASK-003 (Persistence) ────┘
                      │
                      └─> TASK-006 (Context) ─> TASK-007 (WebSocket) ─> TASK-008 (InfoPanel) ─> TASK-009 (Zones)

TASK-004 ─> TASK-010 (Backend Tests)
TASK-009 ─> TASK-011 (Frontend Tests)
TASK-010 + TASK-011 ─> TASK-012 (E2E Tests)
```

## Implementation Order
**Phase 1** (Foundation): TASK-001
**Phase 2** (Backend): TASK-002, TASK-003, TASK-006 (parallel)
**Phase 3** (Integration): TASK-004, TASK-007 (parallel after deps)
**Phase 4** (UI): TASK-005, TASK-008, TASK-009
**Phase 5** (Testing): TASK-010, TASK-011, TASK-012

## Notes
- **Parallelization**: TASK-002/003/006 can proceed in parallel after TASK-001
- **Critical path**: TASK-001 → TASK-002 → TASK-004 → TASK-010 → TASK-012
