---
specification: [.sdd/specs/2025-12-17-multi-adventure-support.md](./../specs/2025-12-17-multi-adventure-support.md)
plan: [.sdd/plans/2025-12-18-multi-adventure-support-plan.md](./../plans/2025-12-18-multi-adventure-support-plan.md)
status: Draft
version: 1.0.0
created: 2025-12-18
last_updated: 2025-12-18
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Multi-Adventure Support - Task Breakdown

## Task Summary
Total: 12 tasks | Complexity Distribution: 4×S, 6×M, 2×L

## Foundation

### TASK-001: Add Slug Generation Utilities
**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Create slug generation and validation functions in validation.ts per TD-1.

**Acceptance Criteria**:
- [ ] `generateSlug(name: string, existingDir: string)` truncates to 64 chars, lowercases, replaces non-alphanumeric with hyphens, collapses multiple hyphens
- [ ] Collision detection appends `-2`, `-3`, etc. when directory exists
- [ ] `validateSlug(slug: string)` rejects path traversal patterns
- [ ] Unit tests cover: basic conversion, special characters, collision suffix, path traversal rejection

**Files**:
- Modify: `backend/src/validation.ts`
- Create: `backend/tests/unit/slug-generation.test.ts`

**Testing**: `bun test slug-generation`

---

### TASK-002: Extend AdventureState Type and Manager
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Add `playerRef` and `worldRef` fields to AdventureState, update AdventureStateManager per TD-2, TD-3, TD-6.

**Acceptance Criteria**:
- [ ] `AdventureState` interface includes `playerRef: string | null` and `worldRef: string | null`
- [ ] `create()` initializes refs as `null`, does NOT initialize `npcs`, `diceLog`, `combatState`
- [ ] `load()` defaults missing refs to `null` (backward compat)
- [ ] `updatePlayerRef(ref: string)` and `updateWorldRef(ref: string)` methods added
- [ ] Existing adventures without refs load successfully (fallback mode)
- [ ] Unit tests verify: new state structure, backward compat loading, ref updates

**Files**:
- Modify: `backend/src/types/state.ts`
- Modify: `backend/src/adventure-state.ts`
- Modify: `backend/tests/unit/adventure-state.test.ts` (or create if needed)

**Testing**: `bun test adventure-state`

---

## Core Managers

### TASK-003: Create PlayerManager Class
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Implement PlayerManager for CRUD operations on players/ directory per plan architecture.

**Acceptance Criteria**:
- [ ] `PlayerManager` class with constructor taking `projectDir: string`
- [ ] `create(name: string)` generates slug, creates `players/{slug}/` with empty `sheet.md` and `state.md` templates
- [ ] `exists(slug: string)` checks directory existence
- [ ] `list()` returns `{ slug, name }[]` by reading player directories (name from sheet.md or slug)
- [ ] `getPath(slug: string)` returns validated path via `safeResolvePath()`
- [ ] Atomic directory creation with restrictive permissions (0o700)
- [ ] Unit tests cover: create, exists, list, path traversal rejection

**Files**:
- Create: `backend/src/player-manager.ts`
- Create: `backend/tests/unit/player-manager.test.ts`

**Testing**: `bun test player-manager`

---

### TASK-004: Create WorldManager Class
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Implement WorldManager for CRUD operations on worlds/ directory per plan architecture.

**Acceptance Criteria**:
- [ ] `WorldManager` class with constructor taking `projectDir: string`
- [ ] `create(name: string)` generates slug, creates `worlds/{slug}/` with empty templates (`world_state.md`, `locations.md`, `characters.md`, `quests.md`)
- [ ] `exists(slug: string)` checks directory existence
- [ ] `list()` returns `{ slug, name }[]` by reading world directories
- [ ] `getPath(slug: string)` returns validated path via `safeResolvePath()`
- [ ] Atomic directory creation with restrictive permissions (0o700)
- [ ] Unit tests cover: create, exists, list, path traversal rejection

**Files**:
- Create: `backend/src/world-manager.ts`
- Create: `backend/tests/unit/world-manager.test.ts`

**Testing**: `bun test world-manager`

---

## MCP Tools

### TASK-005: Implement Character/World MCP Tools
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-002, TASK-003, TASK-004

**Description**: Add `set_character`, `set_world`, `list_characters`, `list_worlds` MCP tools per TD-8.

**Acceptance Criteria**:
- [ ] `set_character({ name, is_new })` - sets `playerRef` in state, creates directory if `is_new`
- [ ] `set_world({ name, is_new })` - sets `worldRef` in state, creates directory if `is_new`
- [ ] `list_characters()` - returns available characters from players/
- [ ] `list_worlds()` - returns available worlds from worlds/
- [ ] Tools registered in `createGMMcpServer()` alongside existing `set_theme`, `set_xp_style`
- [ ] Callbacks wired to PlayerManager, WorldManager, AdventureStateManager
- [ ] Unit tests for each tool with mocked managers

**Files**:
- Modify: `backend/src/gm-prompt.ts` (add tool definitions and creation functions)
- Modify: `backend/src/game-session.ts` (wire callbacks)
- Create: `backend/tests/unit/mcp-tools.test.ts`

**Testing**: `bun test mcp-tools`

---

## GM Prompt Integration

### TASK-006: Update GM Prompt for Dynamic Paths
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Modify `buildGMSystemPrompt()` to use dynamic paths based on refs per TD-4.

**Acceptance Criteria**:
- [ ] Function accepts optional `playerRef` and `worldRef` parameters
- [ ] When refs present: file references use `./{playerRef}/sheet.md`, `./{playerRef}/state.md`, `./{worldRef}/world_state.md`, etc.
- [ ] When refs null: adds minimal instruction to invoke `character-world-init` skill
- [ ] Legacy fallback: when refs null, file references remain `./player.md`, `./world_state.md` (backward compat)
- [ ] Unit tests verify: prompt with refs, prompt without refs (skill trigger), legacy fallback paths

**Files**:
- Modify: `backend/src/gm-prompt.ts`
- Modify: `backend/tests/unit/gm-prompt.test.ts` (or create if needed)

**Testing**: `bun test gm-prompt`

---

### TASK-007: Wire GameSession to New Components
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-003, TASK-004, TASK-005, TASK-006

**Description**: Update GameSession to initialize managers and pass refs to prompt builder.

**Acceptance Criteria**:
- [ ] GameSession creates PlayerManager and WorldManager instances
- [ ] `initialize()` auto-creates missing ref directories if `playerRef`/`worldRef` are set but directories don't exist (TD-5)
- [ ] `buildGMSystemPrompt()` called with current `playerRef`/`worldRef` from state
- [ ] MCP tool callbacks update state and trigger directory creation
- [ ] Integration test: new adventure flow with character/world selection

**Files**:
- Modify: `backend/src/game-session.ts`
- Create: `backend/tests/integration/multi-adventure.test.ts`

**Testing**: `bun test multi-adventure`

---

## Corvran Skill

### TASK-008: Create character-world-init Skill
**Priority**: Medium | **Complexity**: L | **Dependencies**: TASK-005

**Description**: Create corvran skill with initialization guidance and markdown templates per TD-9.

**Acceptance Criteria**:
- [ ] Skill directory at `corvran/skills/character-world-init/`
- [ ] `SKILL.md` contains:
  - Trigger conditions (when refs are null)
  - Instructions to use `list_characters`/`list_worlds` tools
  - How to present options to player (existing vs new)
  - How to call `set_character`/`set_world` tools
  - Markdown structure templates for `sheet.md`, `state.md`
  - Markdown structure templates for `world_state.md`, `locations.md`, `characters.md`, `quests.md`
  - Example well-formed files
- [ ] Skill is discoverable by GM when invoked

**Files**:
- Create: `corvran/skills/character-world-init/SKILL.md`

**Testing**: Manual - verify skill loads correctly in Claude Code

---

## Testing & Validation

### TASK-009: Integration Tests for Acceptance Criteria
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-007

**Description**: Create integration tests covering all spec acceptance tests.

**Acceptance Criteria**:
- [ ] Test 1: New adventure with new character → files at `players/{slug}/`
- [ ] Test 2: New adventure with existing character → refs point to existing
- [ ] Test 3: Two adventures same character → state shared
- [ ] Test 4: Two adventures different characters → state isolated
- [ ] Test 5: World sharing → changes in one adventure visible in other
- [ ] Test 6: Backward compatibility → legacy adventure loads with root files
- [ ] Test 7: State.json cleanup → new state lacks npcs/diceLog/combatState
- [ ] Test 8: Missing ref auto-create → directory created on load
- [ ] Test 9: Slug collision → second character gets `-2` suffix

**Files**:
- Modify: `backend/tests/integration/multi-adventure.test.ts`

**Testing**: `bun test:integration`

---

### TASK-010: Update Existing Tests for New State Shape
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-002

**Description**: Update existing tests that depend on AdventureState to handle new fields.

**Acceptance Criteria**:
- [ ] All existing unit tests pass with new state shape
- [ ] Test fixtures updated to include `playerRef`/`worldRef` where needed
- [ ] Mock state objects updated in game-session tests
- [ ] No regressions in existing functionality

**Files**:
- Modify: `backend/tests/unit/game-session.test.ts`
- Modify: `backend/tests/integration/mcp-tool-use.test.ts`
- Modify: Any other tests using AdventureState mocks

**Testing**: `bun run test`

---

## Documentation

### TASK-011: Update CLAUDE.md with New Architecture
**Priority**: Low | **Complexity**: S | **Dependencies**: TASK-007, TASK-008

**Description**: Document new file organization and MCP tools in project CLAUDE.md.

**Acceptance Criteria**:
- [ ] File-Based State Management section updated with players/ and worlds/ structure
- [ ] MCP Tools section lists `set_character`, `set_world`, `list_characters`, `list_worlds`
- [ ] New skill `character-world-init` mentioned
- [ ] Backward compatibility behavior documented

**Files**:
- Modify: `CLAUDE.md`

**Testing**: Review for accuracy

---

### TASK-012: Bump Plugin Version for Skill Discovery
**Priority**: Low | **Complexity**: S | **Dependencies**: TASK-008

**Description**: Bump corvran plugin version to trigger skill reload in Claude Code.

**Acceptance Criteria**:
- [ ] `corvran/plugin.json` version field incremented
- [ ] Plugin reloads correctly showing new skill

**Files**:
- Modify: `corvran/plugin.json`

**Testing**: Manual - verify plugin reloads in Claude Code

---

## Dependency Graph
```
TASK-001 (Slug Utils) ──┬──> TASK-003 (PlayerManager) ──┐
                        └──> TASK-004 (WorldManager) ───┼──> TASK-005 (MCP Tools) ──┐
                                                        │                            │
TASK-002 (State Types) ─────────────────────────────────┼──> TASK-006 (GM Prompt) ──┼──> TASK-007 (GameSession) ──> TASK-009 (Integration Tests)
                        │                               │                            │
                        └──> TASK-010 (Update Tests)    └────────────────────────────┘
                                                                                     │
                                                        TASK-008 (Skill) ────────────┤
                                                                                     │
                                                        TASK-011 (Docs) <────────────┘
                                                        TASK-012 (Plugin) <── TASK-008
```

## Implementation Order

**Phase 1 - Foundation** (can parallelize):
- TASK-001: Slug utilities
- TASK-002: State type changes

**Phase 2 - Core Components** (can parallelize after Phase 1):
- TASK-003: PlayerManager
- TASK-004: WorldManager
- TASK-010: Update existing tests

**Phase 3 - Integration** (sequential):
- TASK-005: MCP tools
- TASK-006: GM prompt updates
- TASK-007: GameSession wiring

**Phase 4 - Skill & Testing** (can parallelize):
- TASK-008: character-world-init skill
- TASK-009: Integration tests

**Phase 5 - Finalization**:
- TASK-011: Documentation
- TASK-012: Plugin version bump

## Notes
- **Parallelization**: TASK-001 and TASK-002 can run concurrently; TASK-003 and TASK-004 can run concurrently
- **Critical path**: TASK-001 → TASK-003 → TASK-005 → TASK-007 → TASK-009
- **Risk mitigation**: Run full test suite after each phase to catch regressions early
