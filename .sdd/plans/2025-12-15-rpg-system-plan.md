---
specification: [.sdd/specs/2025-12-15-rpg-system.md](./../specs/2025-12-15-rpg-system.md)
status: Approved
version: 1.1.0
created: 2025-12-15
last_updated: 2025-12-15
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# RPG System Integration - Technical Plan

## Overview

This plan adds a pluggable RPG framework to Adventure Engine, enabling adventures to define game mechanics (attributes, skills, dice rolls, combat, NPCs) in markdown files. The architecture introduces:

1. **System Definition Parser**: Reads `System.md` or `System/*.md` from adventure directories, extracts RPG rules and NPC templates as narrative context for the GM
2. **Dice MCP Tool**: Provides auditable randomization with configurable visibility
3. **Character & NPC Management MCP Tools**: Support for PC creation, NPC creation/management, skill checks, and combat resolution
4. **Extended State Persistence**: Player character, NPCs array, dice logs, and combat state in `state.json`

The design preserves backward compatibility—adventures without system definitions continue as pure narrative. The GM (Claude) interprets system rules and calls MCP tools to resolve mechanics, keeping all game logic in markdown rather than code. NPCs are managed with the same mechanical properties as the player character, enabling proper combat and skill check resolution.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Adventure Directory                             │
│  ┌─────────────┐                                                     │
│  │ System.md   │──── RPG rules (dice, attributes, skills, combat,   │
│  │ or System/* │     NPC templates like a monster manual)           │
│  └─────────────┘                                                     │
└────────┬────────────────────────────────────────────────────────────┘
         │ Read at adventure start
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (Bun/Hono)                          │
│  ┌─────────────────┐     ┌──────────────────────────────────────┐   │
│  │ SystemLoader    │────▶│  GM System Prompt (gm-prompt.ts)     │   │
│  │ (system-loader  │     │  • System rules appended to prompt   │   │
│  │      .ts)       │     │  • Tools: dice, check, combat, NPCs  │   │
│  └─────────────────┘     └──────────────────────────────────────┘   │
│                                      │                               │
│                                      ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    MCP Tools (RPG)                            │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │  │roll_dice│  │skill_check│  │apply_damage │  │get_character│ │  │
│  │  └─────────┘  └──────────┘  └─────────────┘  └────────────┘  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │  │
│  │  │create_npc│  │update_npc│  │remove_npc  │  │manage_combat│ │  │
│  │  └──────────┘  └──────────┘  └────────────┘  └─────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                      │                               │
│                                      ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              AdventureStateManager (adventure-state.ts)       │  │
│  │  • playerCharacter (attributes, skills, HP)                   │  │
│  │  • npcs[] (NPC instances with same properties as PC)          │  │
│  │  • diceLog[] (audit trail)                                    │  │
│  │  • combatState (initiative, turn order for PC + NPCs)         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ WebSocket (existing protocol)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  • No changes required for core RPG functionality                   │
│  • Character/NPC info: displayed as narrative via tools             │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **SystemLoader** | Parse `System.md`/`System/*.md`, validate required sections, extract NPC templates, provide rules text to prompt builder |
| **buildGMSystemPrompt** | Include system rules + NPC templates + RPG tool instructions in GM prompt |
| **roll_dice tool** | Parse dice expressions, generate results, log with visibility flag |
| **skill_check tool** | Resolve checks for PC or NPCs using system-defined mechanics |
| **apply_damage tool** | Update PC or NPC HP/conditions, handle incapacitation rules |
| **get_character tool** | Return current PC state for GM reference |
| **create_npc tool** | Create NPC from template or ad-hoc with stats, persist to state |
| **update_npc tool** | Modify existing NPC stats, conditions, or properties |
| **remove_npc tool** | Remove NPC from state (death, departure, etc.) |
| **manage_combat tool** | Handle initiative, turn order for both PC and NPCs |
| **AdventureStateManager** | Persist PC data, NPCs array, dice logs, combat state |

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

### TD-14: NPC Management via MCP Tools
**Choice**: Three dedicated MCP tools for NPC lifecycle: `create_npc`, `update_npc`, `remove_npc`
**Requirements**: REQ-F-33, REQ-F-34, REQ-F-37
**Rationale**:
- NPCs need full CRUD operations during play (combat, social encounters, etc.)
- Separate tools provide clear semantics vs. a single "manage_npc" with action parameter
- GM creates NPCs narratively: "A goblin emerges from the shadows" → calls `create_npc`
- `update_npc` handles stat changes, condition updates, inventory modifications
- `remove_npc` cleanly handles death, departure, or story-driven removal
- Alternative (single tool with action enum) harder for GM to discover correct usage

### TD-15: NPC State Mirrors Player Character
**Choice**: NPCs use identical data structure to `playerCharacter` with additional NPC-specific fields
**Requirements**: REQ-F-35, REQ-F-36, REQ-F-39
**Rationale**:
- Same properties: stats, skills, HP, conditions, inventory
- Enables code reuse: `apply_damage`, `skill_check` work on both PC and NPCs
- Additional NPC fields: `id` (unique identifier), `templateName` (if from template), `reward`
- Reward property defines XP, loot, or story outcomes when NPC is overcome
- Array storage (`npcs[]`) vs. map—simpler iteration for combat, easy serialization

### TD-16: NPC Templates in System Definition
**Choice**: NPC templates defined in System.md as narrative markdown (like a monster manual)
**Requirements**: REQ-F-5a, REQ-F-33
**Rationale**:
- Adventure creators define reusable NPC types: "Goblin", "Slime", "Dragon"
- GM reads templates from system rules, calls `create_npc` with template name
- Tool looks up template defaults, allows overrides (e.g., "Goblin Chieftain" with boosted HP)
- No strict schema—GM interprets template prose like other system rules
- Example: "## Goblin\nHP: 7, AC: 15, Attack: +4 (1d6 damage)\nReward: 25 XP"

### TD-17: NPC Identification by Unique Name
**Choice**: NPCs identified by unique name string within adventure scope
**Requirements**: REQ-F-36
**Rationale**:
- Names are natural for GM: "apply 5 damage to Goblin Scout" vs. "apply 5 damage to NPC id abc123"
- Uniqueness enforced at creation—`create_npc` rejects duplicate names
- For multiple similar NPCs, GM uses distinguishing names: "Goblin 1", "Goblin 2" or "Gruk", "Sniv"
- Alternative (UUID-only) breaks narrative flow, harder for GM to reference

### TD-18: NPC Incapacitation Handling
**Choice**: `apply_damage` returns incapacitation status; GM decides removal based on system rules
**Requirements**: REQ-F-38, REQ-F-32
**Rationale**:
- Different systems handle NPC death differently (instant removal, death saves, unconscious)
- Tool detects HP ≤ 0, returns `{incapacitated: true, hp: 0}` in response
- GM interprets system rules to decide: call `remove_npc` immediately, or apply "dying" condition
- Reward application is GM responsibility: "The goblin falls. You gain 25 XP."
- Keeps game logic in markdown, not hardcoded

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

  // NEW: NPC instances (same structure as playerCharacter + NPC-specific fields)
  npcs?: NPC[];

  // NEW: Dice audit log
  diceLog?: DiceLogEntry[];

  // NEW: Combat tracking
  combatState?: CombatState | null;

  // NEW: System definition cache (parsed on load)
  systemDefinition?: SystemDefinition | null;
}

/**
 * NPC instance - mirrors playerCharacter structure with additional fields
 */
interface NPC {
  id: string;                          // UUID for internal reference
  name: string;                        // Unique display name (e.g., "Goblin Scout")
  templateName?: string;               // Source template if created from one (e.g., "Goblin")

  // Same properties as playerCharacter
  stats?: Record<string, number>;      // STR: 10, DEX: 14, etc.
  skills?: Record<string, number>;     // Stealth: +4
  hp?: { current: number; max: number };
  conditions?: string[];               // ["prone", "frightened"]
  inventory?: InventoryItem[];

  // NPC-specific properties
  reward?: NPCReward;                  // What players get for overcoming this NPC
  isHostile?: boolean;                 // Combat disposition (default true for enemies)
  notes?: string;                      // GM notes about this NPC instance
}

/**
 * Reward for overcoming an NPC (defeating, persuading, etc.)
 */
interface NPCReward {
  xp?: number;                         // Experience points
  loot?: InventoryItem[];              // Items dropped/given
  storyFlag?: string;                  // Narrative progression marker
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
  hasNPCTemplates: boolean;      // Whether system defines NPC templates
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
Death: At 0 HP, creatures are incapacitated and removed from combat.

## NPC Templates

### Goblin
Small, cunning humanoid. Fights in groups, flees when outnumbered.
- HP: 7
- AC: 15 (leather armor, shield)
- Stats: STR 8, DEX 14, CON 10, INT 10, WIS 8, CHA 8
- Attack: Scimitar +4 (1d6+2 slashing)
- Skills: Stealth +6
- Reward: 25 XP

### Slime
Amorphous creature. Splits when damaged by slashing.
- HP: 22
- AC: 8
- Stats: STR 12, DEX 6, CON 16, INT 1, WIS 6, CHA 2
- Attack: Pseudopod +3 (1d6+1 bludgeoning + 1d6 acid)
- Immunities: Slashing damage (splits instead)
- Reward: 50 XP, Acidic Residue (alchemical component)

### Wolf
Pack hunter. Advantage on attacks when ally is adjacent.
- HP: 11
- AC: 13 (natural armor)
- Stats: STR 12, DEX 15, CON 12, INT 3, WIS 12, CHA 6
- Attack: Bite +4 (2d4+2 piercing, DC 11 STR or knocked prone)
- Skills: Perception +3, Stealth +4
- Reward: 25 XP, Wolf Pelt
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
  `Manage combat encounters: start, advance turn, end combat.
Combatants can include both player and NPCs.`,
  {
    action: z.enum(["start", "next_turn", "end"]).describe("Combat action"),
    combatants: z.array(z.object({
      name: z.string(),
      initiativeRoll: z.number().optional(),
      isPlayer: z.boolean(),
    })).optional().describe("Combatants for 'start' action (player + NPCs)"),
  },
  async (args) => {
    // Start: create combatState, sort by initiative
    // next_turn: advance currentIndex
    // end: clear combatState
  }
);
```

### MCP Tool: create_npc

```typescript
const createNpcTool = tool(
  "create_npc",
  `Create a new NPC, either from a system template or with custom stats.
NPCs persist in state and can participate in combat and skill checks.`,
  {
    name: z.string().describe("Unique display name (e.g., 'Goblin Scout', 'Gruk')"),
    templateName: z.string().optional().describe("Template to base NPC on (e.g., 'Goblin')"),
    // Override or set stats directly
    stats: z.record(z.number()).optional().describe("Attribute overrides (e.g., {STR: 12, DEX: 14})"),
    skills: z.record(z.number()).optional().describe("Skill modifiers (e.g., {Stealth: +4})"),
    hp: z.object({
      current: z.number(),
      max: z.number(),
    }).optional().describe("Hit points"),
    reward: z.object({
      xp: z.number().optional(),
      loot: z.array(z.string()).optional(),
      storyFlag: z.string().optional(),
    }).optional().describe("What players receive for overcoming this NPC"),
    isHostile: z.boolean().optional().default(true).describe("Combat disposition"),
    notes: z.string().optional().describe("GM notes about this NPC"),
  },
  async (args) => {
    // Validate unique name
    // If templateName provided, look up template defaults
    // Apply overrides from args
    // Generate UUID for id
    // Add to npcs array
    // Return created NPC
  }
);
```

**Response Schema**:
```typescript
interface CreateNpcResult {
  success: boolean;
  npc: NPC;                      // The created NPC
  message: string;               // "Created Goblin Scout from template Goblin"
}
```

**Error Cases**:
- Duplicate name → Error with existing NPC names listed
- Unknown template → Warning (creates ad-hoc NPC with provided stats)

### MCP Tool: update_npc

```typescript
const updateNpcTool = tool(
  "update_npc",
  `Update an existing NPC's properties. Use for stat changes, conditions, inventory, etc.
For HP changes from combat, prefer apply_damage tool for proper incapacitation handling.`,
  {
    name: z.string().describe("Name of NPC to update"),
    updates: z.object({
      stats: z.record(z.number()).optional(),
      skills: z.record(z.number()).optional(),
      hp: z.object({
        current: z.number(),
        max: z.number(),
      }).optional(),
      conditions: z.array(z.string()).optional(),
      inventory: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
      })).optional(),
      reward: z.object({
        xp: z.number().optional(),
        loot: z.array(z.string()).optional(),
        storyFlag: z.string().optional(),
      }).optional(),
      isHostile: z.boolean().optional(),
      notes: z.string().optional(),
    }).describe("Fields to update (partial update, unspecified fields unchanged)"),
  },
  async (args) => {
    // Find NPC by name
    // Apply partial updates
    // Persist to state
    // Return updated NPC
  }
);
```

**Response Schema**:
```typescript
interface UpdateNpcResult {
  success: boolean;
  npc: NPC;                      // The updated NPC
  changes: string[];             // ["HP: 7 → 3", "Added condition: prone"]
}
```

### MCP Tool: remove_npc

```typescript
const removeNpcTool = tool(
  "remove_npc",
  `Remove an NPC from the adventure state.
Use when NPC is defeated, departs, or is no longer relevant.
Returns the removed NPC data including any unclaimed rewards.`,
  {
    name: z.string().describe("Name of NPC to remove"),
    reason: z.enum(["defeated", "fled", "departed", "other"]).optional()
      .describe("Reason for removal (for narrative context)"),
  },
  async (args) => {
    // Find NPC by name
    // Remove from npcs array
    // Remove from combatState if in combat
    // Return removed NPC (so GM can apply rewards if applicable)
  }
);
```

**Response Schema**:
```typescript
interface RemoveNpcResult {
  success: boolean;
  npc: NPC;                      // The removed NPC (includes reward info)
  reason: string;
  message: string;               // "Goblin Scout was defeated. Reward: 25 XP"
}
```

## Integration Points

### SystemLoader Integration (new file: system-loader.ts)
- **Purpose**: Read and validate system definitions at adventure load
- **Data Flow**: `GameSession.initialize()` → `SystemLoader.load(projectDir)` → cache in state
- **Dependencies**: Node.js fs for file reading, glob for System/* pattern

### GM Prompt Integration (gm-prompt.ts)
- **Purpose**: Include system rules, NPC templates, and RPG tool instructions in prompt
- **Changes**:
  - Add system rules section if `systemDefinition` present
  - Include NPC templates (monster manual) for GM reference
  - Add tool usage instructions for dice/check/combat/NPC tools
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
  - Add tool handlers for `create_npc`, `update_npc`, `remove_npc`
  - Update `onToolUse` callback in mock SDK to handle new tools
  - Pass state manager to tools for persistence

### Mock SDK Integration (mock-sdk.ts)
- **Purpose**: Support RPG tools in E2E tests
- **Changes**:
  - Add keyword triggers for dice/combat/NPC scenarios
  - Implement `onToolUse` callback routing for new tools including NPC tools
  - Return deterministic mock results for test predictability
  - Mock NPC creation/combat scenarios for E2E test coverage

## Error Handling, Performance, Security

### Error Strategy
- **Missing System.md**: Adventure continues as pure narrative (REQ-NF-5)
- **Malformed System.md**: Log warning with file path and issue, continue without mechanics (REQ-F-29)
- **Invalid dice expression**: Return structured error with valid examples (REQ-F-30)
- **Character not created**: Tools return error prompting character creation (REQ-F-31)
- **HP reaches zero**: Return incapacitation status, let GM handle per system rules (REQ-F-32, REQ-F-38)
- **Duplicate NPC name**: Reject creation with list of existing NPC names (REQ-F-36)
- **Unknown NPC name**: Return error listing valid NPC names when update/remove fails
- **Unknown NPC template**: Warning (create ad-hoc NPC) not error, for flexibility

### Performance Targets
- **Dice roll resolution**: <100ms including logging (REQ-NF-1)
- **Skill check resolution**: <200ms including dice roll (REQ-NF-2)
- **System loading**: One-time at adventure start, <500ms for typical System.md
- **NPC operations**: <50ms for create/update/remove (simple state mutations)

### Security Measures
- **Dice randomness**: Use `crypto.randomInt()` for unpredictable results
- **No seed exposure**: Seeds never logged or returned to client (Constraint)
- **Path validation**: System.md paths validated against adventure directory (existing pattern)

## Testing Strategy

### Unit Tests
- **Dice parser**: Expression parsing, edge cases (d100, dF, modifiers)
- **Roll distribution**: Statistical validation of randomness (chi-square test)
- **Skill check**: Modifier lookup, outcome determination, all outcome types
- **System loader**: Valid/invalid markdown, missing sections, NPC template parsing
- **NPC tools**: Create/update/remove operations, unique name validation, template lookup
- **Coverage target**: 80% for new code

### Integration Tests
- **Full skill check flow**: Mock SDK → tool call → state update → response
- **Combat lifecycle**: Start → turn advancement → end (with PC and NPCs)
- **Character creation**: Narrative prompts → stat assignment → persistence
- **NPC lifecycle**: Create from template → participate in combat → apply damage → remove on death
- **NPC persistence**: Create NPC → reload adventure → NPC intact with all properties
- **No-system fallback**: Adventure without System.md works as before

### E2E Tests
- **Dice roll visibility**: Verify visible rolls appear in narrative, hidden don't
- **Combat encounter**: Player enters combat with NPCs → initiative → turns → victory/defeat
- **Character persistence**: Create character → reload adventure → character intact
- **NPC combat flow**: GM creates goblin → combat starts → player attacks → goblin HP updates → goblin defeated → reward applied
- **Multiple NPCs**: Create 3 goblins → combat with all → defeat each → state updated correctly

### Mock SDK Extensions
- Add keyword triggers: "roll", "attack", "check", "combat", "goblin", "enemy", "npc"
- Mock tool responses with deterministic values for test reproducibility
- Mock NPC template lookups for "Goblin", "Slime", "Wolf" test templates

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GM misinterprets complex system rules | Medium | Medium | Provide clear examples in System.md template; validate common patterns |
| Dice log grows unbounded | Low | Low | Implement log rotation (keep last 1000 entries); archive older entries |
| Character creation UX confusion | Medium | Medium | Document expected flow; provide System.md template with clear prompts |
| Combat state corruption on disconnect | Low | Medium | Validate combat state on reconnect; auto-end combat after timeout |
| System.md format divergence across adventures | Medium | Low | Ship reference implementation; document expected sections |
| NPC array grows unbounded | Medium | Low | Future enhancement: offload inactive NPCs; for now, document best practice of removing defeated NPCs |
| Duplicate NPC name collisions | Low | Low | Enforce unique names; suggest naming patterns ("Goblin 1", "Gruk") |
| NPC template/instance stat confusion | Medium | Medium | Clear tool documentation; template provides defaults, instance can override |
| Orphaned NPCs in combat state | Low | Medium | When NPC removed, also remove from combatState.initiativeOrder |

## Dependencies

### Technical
- **crypto**: Built-in Node.js module for secure randomness
- **zod**: Already used for schema validation (v3.x)
- **glob**: May need for `System/*.md` pattern matching (evaluate bun native)

### Team
- **Reference System.md**: Need d20-like template for adventures to copy (including NPC templates)
- **Documentation**: Update adventure creator guide with system definition format and NPC template section

## Open Questions

- [x] Dice notation library vs custom parser? → Custom parser (simple regex, no dependency)
- [x] Maximum dice log size? → 1000 entries with rotation
- [ ] Should hidden rolls appear in audit log export? → TBD, default to yes for debugging
- [ ] Combat timeout duration for auto-end? → Suggest 10 minutes of inactivity
- [ ] NPC offloading strategy? → Deferred to future enhancement per spec; monitor state size in practice
