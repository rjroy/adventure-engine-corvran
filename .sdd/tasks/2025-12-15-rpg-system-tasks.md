---
specification: [.sdd/specs/2025-12-15-rpg-system.md](./../specs/2025-12-15-rpg-system.md)
plan: [.sdd/plans/2025-12-15-rpg-system-plan.md](./../plans/2025-12-15-rpg-system-plan.md)
status: Ready for Implementation
version: 1.0.0
created: 2025-12-15
last_updated: 2025-12-15
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# RPG System Integration - Task Breakdown

## Task Summary
Total: 18 tasks | Complexity Distribution: 3×S, 12×M, 3×L

## Phase 1: Foundation (Types & Data Model)

### TASK-001: Define RPG Type Definitions
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Create TypeScript interfaces for all RPG-related data structures in the shared protocol.

**Acceptance Criteria**:
- [ ] `NPC` interface with id, name, stats, skills, hp, conditions, inventory, reward, isHostile, notes, templateName
- [ ] `NPCReward` interface with xp, loot, storyFlag
- [ ] `DiceLogEntry` interface with id, timestamp, expression, individualRolls, total, context, visible, requestedBy
- [ ] `CombatState` interface with active, round, initiativeOrder, currentIndex, structure
- [ ] `CombatantEntry` interface with name, initiative, isPlayer, conditions
- [ ] `InventoryItem` interface with name, quantity, equipped, properties
- [ ] `SystemDefinition` interface with rawContent, diceTypes, hasAttributes, hasSkills, hasCombat, hasNPCTemplates, filePath
- [ ] Extended `PlayerCharacter` type with stats, skills, hp, conditions, inventory, xp, level
- [ ] All types exported from shared protocol

**Files**: Modify: `shared/protocol.ts`

**Testing**: TypeScript compilation passes; types importable by backend and frontend

---

### TASK-002: Extend AdventureState Schema
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Extend the Zod schema and TypeScript types for AdventureState to include RPG fields.

**Acceptance Criteria**:
- [ ] `playerCharacter` schema extended with optional stats, skills, hp, conditions, inventory, xp, level
- [ ] `npcs` array field added to state schema
- [ ] `diceLog` array field added to state schema
- [ ] `combatState` field added (nullable)
- [ ] `systemDefinition` field added (nullable)
- [ ] Backward compatibility: adventures without RPG fields load successfully
- [ ] State persistence includes new fields

**Files**: Modify: `backend/src/services/adventure-state.ts`

**Testing**: Unit tests for state serialization/deserialization with and without RPG fields

---

## Phase 2: Dice System

### TASK-003: Implement Dice Expression Parser
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create a parser for standard dice notation (NdX+M format) supporting all required dice types.

**Acceptance Criteria**:
- [ ] Parse polyhedral dice: d4, d6, d8, d10, d12, d20, d100
- [ ] Parse Fudge dice: dF (results -1, 0, +1)
- [ ] Parse multiple dice: 2d6, 3d8, 4dF
- [ ] Parse modifiers: +N, -N (e.g., 2d6+3, 1d20-2)
- [ ] (Stretch) Parse combined expressions: 2d6+1d4+5 (not required by spec, but useful for complex systems)
- [ ] Return parsed structure: {dice: [{count, sides}], modifier}
- [ ] Return clear error for invalid expressions (d7, 2d-6, etc.)
- [ ] Performance: parse in <10ms

**Files**: Create: `backend/src/services/dice-parser.ts`

**Testing**: Unit tests covering all dice types, modifiers, combined expressions, and error cases

---

### TASK-004: Implement Dice Roller Service
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Create a service that executes dice rolls using secure randomness and logs results.

**Acceptance Criteria**:
- [ ] Roll parsed dice expressions using `crypto.randomInt()`
- [ ] Fudge dice: random selection from [-1, 0, +1]
- [ ] Return individual roll results and total
- [ ] Generate UUID for each roll
- [ ] Create DiceLogEntry with timestamp, expression, rolls, total, context, visibility
- [ ] Append to state.diceLog
- [ ] Implement log rotation (keep last 1000 entries)
- [ ] Performance: roll in <100ms including logging

**Files**: Create: `backend/src/services/dice-roller.ts`

**Testing**: Unit tests for roll distribution (statistical validation), log entry creation, log rotation

---

### TASK-005: Implement roll_dice MCP Tool
**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-004

**Description**: Create MCP tool that exposes dice rolling to the GM with Zod schema validation.

**Acceptance Criteria**:
- [ ] Tool registered with name "roll_dice"
- [ ] Parameters: expression (string), context (optional string), visible (boolean, default true)
- [ ] Validates expression before rolling
- [ ] Returns: expression, individualRolls, modifiers, total, visible, logId
- [ ] Error response for invalid expressions includes valid examples
- [ ] Tool description documents supported dice types and notation

**Files**: Create: `backend/src/mcp-tools/roll-dice.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Integration test with mock SDK verifying tool call → response flow

---

## Phase 3: System Definition Loading

### TASK-006: Implement System Loader Service
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-001

**Description**: Create service to read and validate System.md or System/*.md files from adventure directories.

**Acceptance Criteria**:
- [ ] Load single `System.md` file if present
- [ ] Load multiple `System/*.md` files and concatenate
- [ ] Validate required section: dice types declaration
- [ ] Detect optional sections: attributes, skills, combat, NPC templates
- [ ] Return SystemDefinition with rawContent, detected features, filePath
- [ ] Return null for adventures without system definitions (no error)
- [ ] Error messages include file path and specific validation failure
- [ ] Performance: load in <500ms for typical System.md

**Files**: Create: `backend/src/services/system-loader.ts`

**Testing**: Unit tests for valid/invalid markdown, missing sections, multi-file loading, error messages

---

### TASK-007: Integrate System Loader with Adventure Loading
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-006

**Description**: Call SystemLoader during adventure initialization and cache result in state.

**Acceptance Criteria**:
- [ ] SystemLoader.load() called in GameSession.initialize()
- [ ] Result stored in state.systemDefinition
- [ ] Adventures without systems continue loading normally (null systemDefinition)
- [ ] System loading errors logged but don't block adventure start

**Files**: Modify: `backend/src/game-session.ts`

**Testing**: Integration test verifying system loaded on adventure start

---

### TASK-008: Update GM Prompt with System Rules
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-007

**Description**: Include system definition content and tool instructions in GM system prompt when available.

**Acceptance Criteria**:
- [ ] System rules section added to prompt if systemDefinition present
- [ ] Resolution mechanics clearly presented for GM interpretation
- [ ] NPC templates section included when hasNPCTemplates=true
- [ ] RPG tool usage instructions added (dice, damage, combat, NPC tools)
- [ ] Prompt omits RPG sections for adventures without systems
- [ ] Character creation guidance: instruct GM to guide player through attribute/skill assignment per system rules at adventure start
- [ ] Character persistence: instruct GM to store character data in playerCharacter state via existing Write tool pattern

**Files**: Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit test verifying prompt content with/without system definition

**Note**: Character creation is emergent from GM behavior - the prompt instructs the GM to guide players through creation conversationally (REQ-F-6, REQ-F-7, REQ-F-8), validate inputs against system constraints (REQ-F-31), and persist using state.json (REQ-F-9). No separate tool needed; GM uses existing state persistence.

---

## Phase 4: Character Management

### TASK-009: Implement get_character MCP Tool
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-002

**Description**: Create MCP tool that returns current player character state.

**Acceptance Criteria**:
- [ ] Tool registered with name "get_character"
- [ ] No required parameters
- [ ] Returns current playerCharacter from state (name, stats, skills, hp, conditions, inventory, xp, level)
- [ ] Returns appropriate message if character not yet created

**Files**: Create: `backend/src/mcp-tools/get-character.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit test for tool response with populated and empty character

---

### TASK-010: Implement apply_damage MCP Tool
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create MCP tool for applying damage/healing to player or NPCs with incapacitation detection.

**Acceptance Criteria**:
- [ ] Tool registered with name "apply_damage"
- [ ] Parameters: target (player|npc), npcName (optional), amount (number), damageType (optional), applyConditions (optional array)
- [ ] Updates HP: reduces for positive amount, increases for negative (healing)
- [ ] HP bounds checking: cannot go below 0 or above max
- [ ] Applies conditions if specified
- [ ] Returns incapacitated=true when HP reaches 0
- [ ] Returns updated HP, conditions, incapacitation status

**Files**: Create: `backend/src/mcp-tools/apply-damage.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit tests for damage, healing, bounds, conditions, incapacitation

---

## Phase 5: NPC Management

### TASK-011: Implement create_npc MCP Tool
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-002, TASK-006

**Description**: Create MCP tool for creating NPCs from templates or ad-hoc.

**Acceptance Criteria**:
- [ ] Tool registered with name "create_npc"
- [ ] Parameters: name (required), templateName (optional), stats, skills, hp, reward, isHostile, notes
- [ ] Validates name uniqueness against existing NPCs
- [ ] If templateName provided, extract defaults from systemDefinition.rawContent (parse NPC template section)
- [ ] Apply parameter overrides to template defaults
- [ ] Generate UUID for npc.id
- [ ] Add NPC to state.npcs array
- [ ] Returns created NPC with success message

**Files**: Create: `backend/src/mcp-tools/create-npc.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit tests for template creation, ad-hoc creation, duplicate name rejection

---

### TASK-012: Implement update_npc MCP Tool
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-011

**Description**: Create MCP tool for updating existing NPC properties.

**Acceptance Criteria**:
- [ ] Tool registered with name "update_npc"
- [ ] Parameters: name (required), updates object with optional stats, skills, hp, conditions, inventory, reward, isHostile, notes
- [ ] Finds NPC by name (case-sensitive)
- [ ] Applies partial updates (unspecified fields unchanged)
- [ ] Returns error if NPC not found (with list of valid names)
- [ ] Returns updated NPC with list of changes made

**Files**: Create: `backend/src/mcp-tools/update-npc.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit tests for partial updates, not-found error, change reporting

---

### TASK-013: Implement remove_npc MCP Tool
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-011

**Description**: Create MCP tool for removing NPCs from state.

**Acceptance Criteria**:
- [ ] Tool registered with name "remove_npc"
- [ ] Parameters: name (required), reason (optional: defeated|fled|departed|other)
- [ ] Finds and removes NPC from state.npcs array
- [ ] If NPC in combatState.initiativeOrder, removes from there too
- [ ] Returns removed NPC data (including reward info for GM to apply)
- [ ] Returns error if NPC not found

**Files**: Create: `backend/src/mcp-tools/remove-npc.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit tests for removal, combat state cleanup, not-found error

---

## Phase 6: Combat System

### TASK-014: Implement manage_combat MCP Tool
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-002, TASK-011

**Description**: Create MCP tool for managing combat lifecycle (start, advance, end).

**Acceptance Criteria**:
- [ ] Tool registered with name "manage_combat"
- [ ] Parameters: action (start|next_turn|end), combatants (for start: array of {name, initiativeRoll, isPlayer})
- [ ] Start: creates combatState, sorts combatants by initiative, sets currentIndex=0
- [ ] next_turn: advances currentIndex, wraps to 0 and increments round at end
- [ ] Skips incapacitated combatants (condition check)
- [ ] End: clears combatState to null
- [ ] Returns current combat state after action

**Files**: Create: `backend/src/mcp-tools/manage-combat.ts`, Modify: `backend/src/gm-prompt.ts`

**Testing**: Unit tests for start, turn advancement, round wrap, end, skip incapacitated

---

## Phase 7: Integration & Polish

### TASK-015: Register All MCP Tools in GM MCP Server
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-005, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014

**Description**: Consolidate all RPG tools into the GM MCP server alongside existing set_theme.

**Acceptance Criteria**:
- [ ] All 7 RPG tools registered: roll_dice, get_character, apply_damage, create_npc, update_npc, remove_npc, manage_combat
- [ ] Tools only available when systemDefinition is present (conditional registration)
- [ ] Existing set_theme tool unchanged
- [ ] Tools receive state manager for persistence

**Files**: Modify: `backend/src/gm-prompt.ts`

**Testing**: Integration test verifying all tools callable

---

### TASK-016: Implement Mock SDK Support for RPG Tools
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-015

**Description**: Extend mock SDK to handle RPG tool calls for E2E testing.

**Acceptance Criteria**:
- [ ] Keyword triggers added: "roll", "attack", "check", "combat", "goblin", "enemy", "npc"
- [ ] Mock roll_dice returns deterministic values (e.g., always 15 for d20)
- [ ] Mock create_npc creates NPC in state
- [ ] Mock apply_damage updates HP
- [ ] Mock manage_combat manages combat state
- [ ] Mock responses follow same schema as real tools
- [ ] Existing mock behaviors unchanged

**Files**: Modify: `backend/src/mock-sdk.ts`

**Testing**: E2E test exercising RPG tool mocks

---

### TASK-017: Create Reference System.md Template
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-006

**Description**: Create a d20-like reference system definition that adventure creators can copy.

**Acceptance Criteria**:
- [ ] Complete System.md with all sections: Dice, Resolution Mechanics, Attributes, Skills, Combat, NPC Templates
- [ ] d20-like rules: d20+modifier vs DC, 6 attributes, skill list, turn-based combat
- [ ] At least 3 NPC templates: Goblin, Slime, Wolf (per plan examples)
- [ ] Clear formatting suitable for GM interpretation
- [ ] Comments/notes for adventure creators on customization
- [ ] Placed in docs/examples/ or similar location
- [ ] Templates successfully loaded by SystemLoader and parseable by create_npc tool

**Files**: Create: `docs/examples/System.md`

**Testing**: SystemLoader successfully parses the template; create_npc can extract template defaults; manual review for clarity

---

### TASK-018: Write Integration and E2E Tests
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-016

**Description**: Create comprehensive test coverage for RPG system integration.

**Acceptance Criteria**:
- [ ] Integration test: full dice roll flow (call → log → response)
- [ ] Integration test: combat lifecycle with player and NPCs
- [ ] Integration test: NPC lifecycle (create → combat → damage → remove)
- [ ] Integration test: no-system fallback (adventure without System.md)
- [ ] E2E test: dice roll visibility (visible appears in narrative)
- [ ] E2E test: character persistence across reload
- [ ] All tests pass with MOCK_SDK=true
- [ ] Coverage target: 80% for new code

**Files**: Create: `backend/tests/integration/rpg-system.test.ts`, `e2e/tests/rpg-system.spec.ts`

**Testing**: Tests themselves validate the acceptance criteria

---

## Dependency Graph
```
TASK-001 ──┬──> TASK-002 ──┬──> TASK-009
           │               ├──> TASK-010
           │               ├──> TASK-011 ──┬──> TASK-012
           │               │               ├──> TASK-013
           │               │               └──> TASK-014
           │               │
           ├──> TASK-003 ──> TASK-004 ──> TASK-005
           │
           └──> TASK-006 ──┬──> TASK-007 ──> TASK-008
                           └──> TASK-011
                           └──> TASK-017

TASK-005, 009, 010, 011, 012, 013, 014 ──> TASK-015 ──> TASK-016 ──> TASK-018
```

## Implementation Order

**Phase 1** (Foundation, 2×M): TASK-001, TASK-002
**Phase 2** (Dice, 3×M): TASK-003, TASK-004, TASK-005
**Phase 3** (System Loading, 1×L + 1×S + 1×M): TASK-006, TASK-007, TASK-008
**Phase 4** (Character, 1×S + 1×M): TASK-009, TASK-010
**Phase 5** (NPCs, 1×L + 2×M): TASK-011, TASK-012, TASK-013
**Phase 6** (Combat, 1×L): TASK-014
**Phase 7** (Integration, 1×S + 3×M): TASK-015, TASK-016, TASK-017, TASK-018

## Notes

- **Parallelization**: After TASK-001, Phases 2 and 3 can run in parallel. Within Phase 5, TASK-012 and TASK-013 can run in parallel after TASK-011.
- **Critical path**: TASK-001 → TASK-002 → TASK-011 → TASK-014 → TASK-015 → TASK-016 → TASK-018
- **Testing throughout**: Each task includes its own unit test criteria; integration tests consolidate in TASK-018
