---
specification: [.sdd/specs/2025-12-15-rpg-system.md](./../specs/2025-12-15-rpg-system.md)
status: Draft
version: 1.0.0
created: 2025-12-15
last_updated: 2025-12-15
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# RPG System Integration - Technical Plan

## Overview

This plan adds a pluggable RPG framework to Adventure Engine, enabling adventures to define game mechanics (attributes, skills, dice rolls, combat) in markdown files. The architecture introduces:

1. **System Definition Parser**: Reads `System.md` or `System/*.md` from adventure directories, extracts RPG rules as narrative context for the GM
2. **Dice MCP Tool**: Provides auditable randomization with configurable visibility
3. **Character Management MCP Tools**: Support for creation, skill checks, and combat resolution
4. **Extended State Persistence**: Character data, dice logs, and combat state in `state.json`

The design preserves backward compatibility—adventures without system definitions continue as pure narrative. The GM (Claude) interprets system rules and calls MCP tools to resolve mechanics, keeping all game logic in markdown rather than code.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Adventure Directory                             │
│  ┌─────────────┐                                                     │
│  │ System.md   │──── RPG rules (dice, attributes, skills, combat)   │
│  │ or System/* │                                                     │
│  └─────────────┘                                                     │
└────────┬────────────────────────────────────────────────────────────┘
         │ Read at adventure start
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (Bun/Hono)                          │
│  ┌─────────────────┐     ┌──────────────────────────────────────┐   │
│  │ SystemLoader    │────▶│  GM System Prompt (gm-prompt.ts)     │   │
│  │ (system-loader  │     │  • System rules appended to prompt   │   │
│  │      .ts)       │     │  • Tools: dice, check, combat        │   │
│  └─────────────────┘     └──────────────────────────────────────┘   │
│                                      │                               │
│                                      ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    MCP Tools (RPG)                            │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │  │roll_dice│  │skill_check│  │apply_damage │  │get_character│ │  │
│  │  └─────────┘  └──────────┘  └─────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                      │                               │
│                                      ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              AdventureStateManager (adventure-state.ts)       │  │
│  │  • playerCharacter (attributes, skills, HP)                   │  │
│  │  • diceLog[] (audit trail)                                    │  │
│  │  • combatState (initiative, turn order)                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ WebSocket (existing protocol)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  • No changes required for core RPG functionality                   │
│  • Character sheet: displayed as narrative via get_character tool   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **SystemLoader** | Parse `System.md`/`System/*.md`, validate required sections, provide rules text to prompt builder |
| **buildGMSystemPrompt** | Include system rules + RPG tool instructions in GM prompt |
| **roll_dice tool** | Parse dice expressions, generate results, log with visibility flag |
| **skill_check tool** | Resolve checks using system-defined mechanics, return success/partial/failure |
| **apply_damage tool** | Update character HP/conditions, handle incapacitation rules |
| **get_character tool** | Return current character state for GM reference |
| **AdventureStateManager** | Persist character data, dice logs, combat state |

### Data Flow: Skill Check

1. Player describes action: "I try to pick the lock"
2. GM reads system rules (from prompt context), decides this is a Dexterity-based Lockpicking check
3. GM calls `skill_check` tool with `{skill: "Lockpicking", difficulty: 15, attribute: "Dexterity"}`
4. Tool retrieves character's DEX modifier (+2), system dice type (d20), calls internal dice roller
5. Roll: 13 + 2 = 15, meets DC 15 → success
6. Tool logs roll `{expression: "1d20+2", result: 15, context: "Lockpicking vs DC 15", visible: true}`
7. Tool returns `{outcome: "success", roll: 15, target: 15, message: "Success!"}`
8. GM narrates: "The lock clicks open. Your nimble fingers make quick work of the mechanism."

## Technical Decisions

### TD-1: System Definitions as Narrative Markdown
**Choice**: System rules in markdown format, read by GM as natural language (not parsed into structured schema)
**Requirements**: REQ-F-1, REQ-F-2, REQ-F-3, REQ-F-4, REQ-NF-3
**Rationale**:
- Spec explicitly states "narrative markdown format (not structured JSON schema)"
- Claude excels at interpreting natural language rules
- Adventure creators can write rules in prose without learning a schema
- Existing Read tool pattern already provides file access to GM
- Alternative (JSON schema) would require code changes for each new mechanic

### TD-2: MCP Tools for Mechanical Resolution
**Choice**: Implement dice rolling and skill checks as MCP tools (like existing `set_theme`)
**Requirements**: REQ-F-11-15 (dice), REQ-F-16-19 (skill checks), REQ-F-14 (logging), REQ-NF-4 (auditability), REQ-NF-6 (testability)
**Rationale**:
- Existing `set_theme` tool pattern proves MCP tool integration works
- Tools provide auditable, deterministic outcomes that GM cannot fabricate
- Zod schemas ensure type-safe parameters
- Mock SDK support via `onToolUse` callback (already implemented for `set_theme`)
- Alternative (GM generates dice results in narrative) loses auditability

### TD-3: Dice Expression Parser in Tool Implementation
**Choice**: Parse standard dice notation (e.g., "2d6+3", "4dF") in `roll_dice` tool
**Requirements**: REQ-F-11, REQ-F-12, REQ-F-13, REQ-F-30
**Rationale**:
- Dice notation is universal across RPG systems
- Parser handles: `NdX` (polyhedral), `NdF` (Fudge), modifiers (`+N`, `-N`)
- Invalid expressions return structured errors with valid alternatives
- Keep parser simple—complex expressions can be multiple rolls
- Library option: `dice-roller-parser` exists but adds dependency; simple regex parser sufficient

### TD-4: Visibility Flag in Dice Log
**Choice**: Each dice log entry includes `visible: boolean` field
**Requirements**: REQ-F-15, REQ-NF-4
**Rationale**:
- GM perception checks should be hidden (player shouldn't know if they failed)
- Player attack rolls should be visible (transparency builds trust)
- GM specifies visibility when calling `roll_dice`
- Frontend can filter history display by visibility (future enhancement)
- Audit log always contains all rolls regardless of visibility

### TD-5: Character State in playerCharacter Object
**Choice**: Extend existing `playerCharacter` in `state.json` with typed RPG fields
**Requirements**: REQ-F-9, REQ-F-25, REQ-F-26, REQ-F-27, REQ-F-28
**Rationale**:
- `playerCharacter` already exists with `name` and generic `attributes`
- Add typed fields: `stats`, `skills`, `hp`, `conditions`, `inventory`, `xp`
- Maintain backward compatibility—adventures without systems ignore new fields
- Single location for character data simplifies persistence
- Alternative (separate character.json) fragments state, complicates loading

### TD-6: Combat State Object
**Choice**: Add `combatState` to adventure state for tracking combat encounters
**Requirements**: REQ-F-20, REQ-F-21, REQ-F-24
**Rationale**:
- Combat needs persistent state: initiative order, current combatant, round number
- Null when not in combat, populated when combat begins
- Cleared when combat ends
- GM tool `start_combat`/`end_combat` manages lifecycle
- Supports turn-based and hybrid combat models (narrative combat needs no state)

### TD-7: System Loader as Utility Module
**Choice**: Create `system-loader.ts` module to read/validate system definitions
**Requirements**: REQ-F-1, REQ-F-29, REQ-NF-7
**Rationale**:
- Separates file I/O from prompt building
- Validates required sections exist (dice types minimum)
- Returns parsed system or null (for adventures without systems)
- Called once at adventure load, result cached in memory
- Error messages include file path and missing section name

### TD-8: Character Creation via Narrative Prompts
**Choice**: GM guides character creation through conversation, not structured UI
**Requirements**: REQ-F-6, REQ-F-7, REQ-F-8
**Rationale**:
- Spec states "Interactive questions presented as narrative dialogue"
- GM reads system attribute/skill schema, generates appropriate questions
- Player responds naturally: "I want to be strong but not very smart"
- GM interprets and assigns values, confirms with player
- Alternative (frontend form) would require UI changes and break narrative immersion

### TD-9: Character Sheet via Narrative Display
**Choice**: Character sheet viewable on demand via `get_character` tool output formatted in narrative
**Requirements**: REQ-F-10, REQ-NF-5
**Rationale**:
- Player can request "show my character" → GM calls `get_character` → formats stats in narrative response
- Satisfies REQ-F-10 (character sheet viewable on demand) without frontend changes
- Preserves backward compatibility—old frontends work with new backend (REQ-NF-5)
- Visual character sheet UI is out of scope per spec ("text-based for now")
- Future `character_sheet` message type can be added for richer display without core changes

### TD-10: Single Dice Tool with Multi-Roll Support
**Choice**: One `roll_dice` tool handles all dice types and multi-die expressions
**Requirements**: REQ-F-11, REQ-F-12, REQ-F-13
**Rationale**:
- Single tool reduces prompt complexity for GM
- Expression parser handles: `d20`, `2d6+3`, `4dF`, `d100`
- Returns individual die results + total for transparency
- Alternative (separate tools per die type) clutters tool list unnecessarily

### TD-11: Skill Check Tool Delegates to Dice Tool
**Choice**: `skill_check` internally calls `roll_dice`, then applies system rules
**Requirements**: REQ-F-16, REQ-F-17, REQ-F-18, REQ-F-19 (outcome logging)
**Rationale**:
- Avoids duplicate dice rolling logic
- Skill check adds: modifier lookup, difficulty comparison, success degree
- GM provides context (skill name, difficulty, attribute) from system rules
- Tool returns structured result: `{outcome, roll, modifiers, target}`
- All skill check outcomes logged via internal `roll_dice` call (satisfies REQ-F-19)
- System-agnostic: works with d20+mod vs DC, 2d6 PbtA, 4dF Fate

### TD-12: Combat Damage via apply_damage Tool
**Choice**: `apply_damage` tool handles all HP changes and condition tracking
**Requirements**: REQ-F-22 (damage calculation), REQ-F-23 (automatic health tracking), REQ-F-32 (incapacitation)
**Rationale**:
- GM calculates damage using system rules and `roll_dice` tool
- `apply_damage` receives calculated damage amount, updates character HP
- Automatic bounds checking (HP cannot go below 0 or above max)
- Returns incapacitation status when HP reaches 0 per system rules
- Conditions (poisoned, etc.) applied alongside damage when appropriate

### TD-13: Character Creation Input Validation
**Choice**: GM validates player input against system constraints during creation
**Requirements**: REQ-F-31 (validate inputs against system constraints)
**Rationale**:
- System.md defines valid ranges (e.g., "attributes 8-18")
- GM reads constraints, validates player responses before assigning
- Invalid input → GM asks for correction with clear explanation
- Example: "STR of 25 is too high. This system uses 8-18 range. What value would you like?"
- No code-level validation needed—GM enforces constraints narratively

## Data Model

### Extended AdventureState

```typescript
interface AdventureState {
  // ... existing fields ...

  playerCharacter: {
    name: string | null;
    attributes: Record<string, unknown>; // Legacy generic

    // NEW: Typed RPG fields
    stats?: Record<string, number>;      // STR: 14, DEX: 16, etc.
    skills?: Record<string, number>;     // Stealth: +5, Persuasion: +2
    hp?: { current: number; max: number };
    conditions?: string[];               // ["poisoned", "frightened"]
    inventory?: InventoryItem[];
    xp?: number;
    level?: number;
  };

  // NEW: Dice audit log
  diceLog?: DiceLogEntry[];

  // NEW: Combat tracking
  combatState?: CombatState | null;

  // NEW: System definition cache (parsed on load)
  systemDefinition?: SystemDefinition | null;
}

interface DiceLogEntry {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  expression: string;            // "2d6+3"
  individualRolls: number[];     // [4, 2]
  total: number;                 // 9
  context: string;               // "Athletics check vs DC 15"
  visible: boolean;              // true = player sees, false = GM only
  requestedBy: "gm" | "system";  // Who initiated the roll
}

interface CombatState {
  active: boolean;
  round: number;
  initiativeOrder: CombatantEntry[];
  currentIndex: number;          // Index into initiativeOrder
  structure: "turn-based" | "narrative" | "hybrid";
}

interface CombatantEntry {
  name: string;
  initiative: number;
  isPlayer: boolean;
  conditions: string[];
}

interface InventoryItem {
  name: string;
  quantity: number;
  equipped?: boolean;
  properties?: Record<string, unknown>;
}

interface SystemDefinition {
  rawContent: string;            // Full markdown text for prompt
  diceTypes: string[];           // ["d20", "d6", "dF"] - validated
  hasAttributes: boolean;
  hasSkills: boolean;
  hasCombat: boolean;
  filePath: string;              // For error reporting
}
```

### System.md Expected Structure

```markdown
# Adventure System

## Dice
This adventure uses the d20 system. Roll 1d20 + modifiers against difficulty.

## Attributes
- Strength (STR): Physical power
- Dexterity (DEX): Agility and reflexes
- Constitution (CON): Endurance
- Intelligence (INT): Knowledge and reasoning
- Wisdom (WIS): Perception and insight
- Charisma (CHA): Force of personality

Starting values: 8-18 range, point buy or roll 4d6 drop lowest.

## Skills
Skills are linked to attributes:
- Athletics (STR)
- Stealth (DEX)
- Investigation (INT)
- Perception (WIS)
- Persuasion (CHA)

## Combat
Turn-based combat with initiative (d20 + DEX modifier).
Actions per turn: 1 action, 1 bonus action, movement.
Attack: d20 + modifier vs AC. Damage: weapon die + STR/DEX.
```

## API Design

### MCP Tool: roll_dice

```typescript
const rollDiceTool = tool(
  "roll_dice",
  `Roll dice using standard notation. Supports:
- Polyhedral: d4, d6, d8, d10, d12, d20, d100
- Fudge: dF (results: -1, 0, +1)
- Multiple: 2d6, 3d8
- Modifiers: 2d6+3, 1d20-2
- Combined: 2d6+1d4+5

Returns individual rolls and total for transparency.`,
  {
    expression: z.string().describe("Dice expression (e.g., '2d6+3', '4dF', '1d20')"),
    context: z.string().optional().describe("What this roll is for (e.g., 'Attack roll')"),
    visible: z.boolean().default(true).describe("Whether player sees the result"),
  },
  async (args) => {
    // Parse and validate expression
    // Generate random results
    // Log to diceLog
    // Return structured result
  }
);
```

**Response Schema**:
```typescript
interface DiceRollResult {
  expression: string;
  individualRolls: number[];  // Each die result
  modifiers: number;          // Sum of +/- modifiers
  total: number;
  visible: boolean;
  logId: string;              // Reference to audit log entry
}
```

**Error Cases**:
- Invalid die type (e.g., "d7") → Error with valid types list
- Invalid expression syntax → Error with example valid expressions
- Negative dice count → Error

### MCP Tool: skill_check

```typescript
const skillCheckTool = tool(
  "skill_check",
  `Resolve a skill check using the adventure's system rules.
Automatically looks up character modifiers and applies system mechanics.

For d20 systems: rolls d20 + skill modifier vs difficulty
For 2d6 PbtA: rolls 2d6 + stat, interprets 6-/7-9/10+
For Fate/Fudge: rolls 4dF + skill vs difficulty ladder`,
  {
    skill: z.string().describe("Skill name (e.g., 'Stealth', 'Persuasion')"),
    difficulty: z.number().optional().describe("Target number (DC) if applicable"),
    attribute: z.string().optional().describe("Override attribute (defaults to skill's linked attr)"),
    advantage: z.boolean().optional().describe("Roll with advantage (best of 2)"),
    disadvantage: z.boolean().optional().describe("Roll with disadvantage (worst of 2)"),
    visible: z.boolean().default(true).describe("Whether player sees the roll"),
  },
  async (args) => {
    // Look up character skill/attribute modifiers
    // Determine roll type from system definition
    // Call internal dice roller
    // Compare to difficulty, determine outcome
    // Log roll
    // Return result with outcome
  }
);
```

**Response Schema**:
```typescript
interface SkillCheckResult {
  skill: string;
  attribute: string;
  modifier: number;
  roll: DiceRollResult;
  difficulty?: number;
  outcome: "critical_success" | "success" | "partial_success" | "failure" | "critical_failure";
  margin: number;           // How much over/under difficulty
  message: string;          // Human-readable result
}
```

### MCP Tool: apply_damage

```typescript
const applyDamageTool = tool(
  "apply_damage",
  `Apply damage or healing to a character. Handles:
- HP reduction/increase with bounds checking
- Condition application (if damage causes status effects)
- Incapacitation detection (HP reaches 0)`,
  {
    target: z.enum(["player", "npc"]).describe("Who takes the damage"),
    npcName: z.string().optional().describe("NPC name if target is 'npc'"),
    amount: z.number().describe("Positive for damage, negative for healing"),
    damageType: z.string().optional().describe("Type of damage (e.g., 'fire', 'slashing')"),
    applyConditions: z.array(z.string()).optional().describe("Conditions to apply"),
  },
  async (args) => {
    // Update HP
    // Apply conditions
    // Check for incapacitation
    // Return updated state
  }
);
```

### MCP Tool: get_character

```typescript
const getCharacterTool = tool(
  "get_character",
  `Retrieve current character state including stats, skills, HP, conditions, and inventory.
Use before making decisions that depend on character capabilities.`,
  {},
  async () => {
    // Return current playerCharacter state
  }
);
```

### MCP Tool: manage_combat

```typescript
const manageCombatTool = tool(
  "manage_combat",
  `Manage combat encounters: start, advance turn, end combat.`,
  {
    action: z.enum(["start", "next_turn", "end"]).describe("Combat action"),
    combatants: z.array(z.object({
      name: z.string(),
      initiativeRoll: z.number().optional(),
      isPlayer: z.boolean(),
    })).optional().describe("Combatants for 'start' action"),
  },
  async (args) => {
    // Start: create combatState, sort by initiative
    // next_turn: advance currentIndex
    // end: clear combatState
  }
);
```

## Integration Points

### SystemLoader Integration (new file: system-loader.ts)
- **Purpose**: Read and validate system definitions at adventure load
- **Data Flow**: `GameSession.initialize()` → `SystemLoader.load(projectDir)` → cache in state
- **Dependencies**: Node.js fs for file reading, glob for System/* pattern

### GM Prompt Integration (gm-prompt.ts)
- **Purpose**: Include system rules and RPG tool instructions in prompt
- **Changes**:
  - Add system rules section if `systemDefinition` present
  - Add tool usage instructions for dice/check/combat tools
  - Conditional: omit RPG sections for adventures without systems
- **Data Flow**: `buildGMSystemPrompt(state)` checks `state.systemDefinition`

### MCP Server Integration (gm-prompt.ts)
- **Purpose**: Register RPG tools alongside existing `set_theme`
- **Changes**: Extend `createThemeMcpServer` → `createGMMcpServer` with all tools
- **Pattern**: Same as existing tool registration, add to `tools` array

### GameSession Integration (game-session.ts)
- **Purpose**: Handle RPG tool callbacks, update state
- **Changes**:
  - Add tool handlers for `roll_dice`, `skill_check`, `apply_damage`, `manage_combat`
  - Update `onToolUse` callback in mock SDK to handle new tools
  - Pass state manager to tools for persistence

### Mock SDK Integration (mock-sdk.ts)
- **Purpose**: Support RPG tools in E2E tests
- **Changes**:
  - Add keyword triggers for dice/combat scenarios
  - Implement `onToolUse` callback routing for new tools
  - Return deterministic mock results for test predictability

## Error Handling, Performance, Security

### Error Strategy
- **Missing System.md**: Adventure continues as pure narrative (REQ-NF-5)
- **Malformed System.md**: Log warning with file path and issue, continue without mechanics (REQ-F-29)
- **Invalid dice expression**: Return structured error with valid examples (REQ-F-30)
- **Character not created**: Tools return error prompting character creation (REQ-F-31)
- **HP reaches zero**: Return incapacitation status, let GM handle per system rules (REQ-F-32)

### Performance Targets
- **Dice roll resolution**: <100ms including logging (REQ-NF-1)
- **Skill check resolution**: <200ms including dice roll (REQ-NF-2)
- **System loading**: One-time at adventure start, <500ms for typical System.md

### Security Measures
- **Dice randomness**: Use `crypto.randomInt()` for unpredictable results
- **No seed exposure**: Seeds never logged or returned to client (Constraint)
- **Path validation**: System.md paths validated against adventure directory (existing pattern)

## Testing Strategy

### Unit Tests
- **Dice parser**: Expression parsing, edge cases (d100, dF, modifiers)
- **Roll distribution**: Statistical validation of randomness (chi-square test)
- **Skill check**: Modifier lookup, outcome determination, all outcome types
- **System loader**: Valid/invalid markdown, missing sections
- **Coverage target**: 80% for new code

### Integration Tests
- **Full skill check flow**: Mock SDK → tool call → state update → response
- **Combat lifecycle**: Start → turn advancement → end
- **Character creation**: Narrative prompts → stat assignment → persistence
- **No-system fallback**: Adventure without System.md works as before

### E2E Tests
- **Dice roll visibility**: Verify visible rolls appear in narrative, hidden don't
- **Combat encounter**: Player enters combat → initiative → turns → victory/defeat
- **Character persistence**: Create character → reload adventure → character intact

### Mock SDK Extensions
- Add keyword triggers: "roll", "attack", "check", "combat"
- Mock tool responses with deterministic values for test reproducibility

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GM misinterprets complex system rules | Medium | Medium | Provide clear examples in System.md template; validate common patterns |
| Dice log grows unbounded | Low | Low | Implement log rotation (keep last 1000 entries); archive older entries |
| Character creation UX confusion | Medium | Medium | Document expected flow; provide System.md template with clear prompts |
| Combat state corruption on disconnect | Low | Medium | Validate combat state on reconnect; auto-end combat after timeout |
| System.md format divergence across adventures | Medium | Low | Ship reference implementation; document expected sections |

## Dependencies

### Technical
- **crypto**: Built-in Node.js module for secure randomness
- **zod**: Already used for schema validation (v3.x)
- **glob**: May need for `System/*.md` pattern matching (evaluate bun native)

### Team
- **Reference System.md**: Need d20-like template for adventures to copy
- **Documentation**: Update adventure creator guide with system definition format

## Open Questions

- [x] Dice notation library vs custom parser? → Custom parser (simple regex, no dependency)
- [x] Maximum dice log size? → 1000 entries with rotation
- [ ] Should hidden rolls appear in audit log export? → TBD, default to yes for debugging
- [ ] Combat timeout duration for auto-end? → Suggest 10 minutes of inactivity
