---
specification: [.sdd/specs/2025-12-22-daggerheart-system.md](./../specs/2025-12-22-daggerheart-system.md)
status: Approved
version: 1.0.0
created: 2025-12-22
last_updated: 2025-12-22
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Daggerheart System Plugin - Technical Plan

## Overview

This plan implements a Claude Code plugin for Daggerheart RPG mechanics, mirroring the d20-system plugin architecture. The implementation has two key challenges:

1. **Dice roller extension**: Adding `DdD` notation for Duality Dice (2d12 with Hope/Fear semantics) to the existing corvran dice roller without breaking existing functionality
2. **Experience constraint safety**: Implementing bounded Experience definitions to prevent LLM semantic drift during gameplay

The plugin consists of 6 skills (dh-players, dh-combat, dh-adversaries, dh-domains, dh-rules, dh-init), an init command, and extends the shared dice roller.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                     Adventure Engine                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   corvran   │  │ d20-system  │  │   daggerheart-system    │  │
│  │   plugin    │  │   plugin    │  │        plugin           │  │
│  │             │  │             │  │                         │  │
│  │ dice-roller◄├──┤─────────────┼──┤ dh-players              │  │
│  │    skill    │  │ d20-players │  │ dh-combat               │  │
│  │             │  │ d20-combat  │  │ dh-adversaries          │  │
│  │             │  │ d20-magic   │  │ dh-domains              │  │
│  │             │  │ d20-monsters│  │ dh-rules                │  │
│  │             │  │ d20-rules   │  │                         │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              docs/research/daggerheart-srd/              │   │
│  │                    (SRD submodule)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Directory Structure

```
daggerheart-system/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── CLAUDE.md                    # Plugin-level guidance for Claude
├── dh-CLAUDE.md                 # Adventure-level GM guidance (merged via init)
├── System.md                    # Core Daggerheart rules (copied via init)
├── commands/
│   └── init.md                  # /daggerheart-system:init command
└── skills/
    ├── dh-players/
    │   ├── SKILL.md             # Character creation/advancement
    │   └── references/
    │       ├── sheet-template.md
    │       ├── sheet-example.md
    │       ├── state-template.md
    │       └── experience-template.md
    ├── dh-combat/
    │   ├── SKILL.md             # Combat flow, Hope/Fear economy
    │   └── references/
    │       ├── action-outcomes.md
    │       ├── encounter-template.md
    │       └── conditions.md
    ├── dh-adversaries/
    │   ├── SKILL.md             # Adversary creation/management
    │   └── references/
    │       ├── stat-block-template.md
    │       ├── stat-block-example.md
    │       └── encounter-building.md
    ├── dh-domains/
    │   ├── SKILL.md             # Domain cards and abilities
    │   └── references/
    │       └── domain-overview.md
    └── dh-rules/
        ├── SKILL.md             # SRD rule lookups
        ├── License.md           # DPCGL attribution
        └── references/
            └── srd -> ../../../../docs/research/daggerheart-srd  # Symlink
```

### Component Responsibilities

| Component | Responsibility | Key Requirements |
|-----------|---------------|------------------|
| **dice-roller** (corvran) | Extended to support `DdD` notation | REQ-F-1 to REQ-F-4 |
| **dh-players** | Character creation, Experiences, advancement | REQ-F-9 to REQ-F-15, REQ-F-28 to REQ-F-32 |
| **dh-combat** | Hope/Fear economy, action resolution, spotlight flow | REQ-F-16 to REQ-F-23 |
| **dh-adversaries** | Adversary stat blocks, encounter building | REQ-F-24 to REQ-F-27 |
| **dh-domains** | Domain card reference, Spellcast guidance | REQ-F-33 to REQ-F-35 |
| **dh-rules** | SRD search patterns, rule lookups | REQ-F-36 to REQ-F-38 |
| **init command** | Adventure setup, file copying/merging | REQ-F-5 to REQ-F-8 |

## Technical Decisions

### TD-1: Extend Existing Dice Roller vs. Create New Script

**Choice**: Extend the existing `corvran/skills/dice-roller/scripts/roll.sh`

**Requirements**: REQ-F-1, REQ-NF-6

**Rationale**: The spec explicitly requires extending the existing dice roller (REQ-F-1) and maintaining alignment with d20-system patterns (REQ-NF-6). A separate script would:
- Fragment the dice-rolling interface
- Require both plugins to maintain independent dice logic
- Break the pattern where all RPG plugins share dice infrastructure

The regex-based parser in `roll.sh` already handles expressions like `NdX+M`. We'll add a new pattern for `DdD+M` that produces an extended JSON output with Hope/Fear semantics.

### TD-2: Duality Dice Output Format

**Choice**: Extend JSON output with Hope/Fear fields while preserving backward compatibility

**Requirements**: REQ-F-2, REQ-NF-2

**Output Structure**:
```json
{
  "expression": "DdD+3",
  "rolls": [7, 4],
  "modifier": 3,
  "total": 14,
  "hope": 7,
  "fear": 4,
  "higher": "hope"
}
```

Critical success (doubles):
```json
{
  "expression": "DdD",
  "rolls": [5, 5],
  "modifier": 0,
  "total": 10,
  "hope": 5,
  "fear": 5,
  "higher": "critical"
}
```

**Alternatives Considered**:
1. **Single "result" field with string**: `"result": "13 with hope"` - Rejected because it requires string parsing; separate fields are easier for programmatic use
2. **Separate endpoint/tool for Duality Dice**: Create `duality-roll.sh` - Rejected because it fragments the dice interface and doesn't leverage existing infrastructure
3. **Extend rolls array with named objects**: `"rolls": [{"hope": 7}, {"fear": 4}]` - Rejected because it breaks backward compatibility with existing JSON consumers

**Rationale**:
- `hope` and `fear` fields make the individual die values semantically clear
- `higher` field provides the outcome directly: `"hope"`, `"fear"`, or `"critical"`
- Standard fields (`expression`, `rolls`, `modifier`, `total`) remain for compatibility
- The GM skill reads `higher` to determine narrative framing

### TD-3: Experience Constraint Format

**Choice**: Markdown template with explicit positive scope and exclusions

**Requirements**: REQ-F-28 to REQ-F-32

**Template Structure**:
```markdown
## Experience: [Name]

**Modifier**: +2

**Narrative Origin**: How did you acquire this experience?
> [Player's answer]

**Applies When**:
- [Specific situation 1]
- [Specific situation 2]

**Does NOT Apply**:
- [Explicit exclusion 1]
- [Explicit exclusion 2]
```

**Example**:
```markdown
## Experience: Former Pirate

**Modifier**: +2

**Narrative Origin**: Five years sailing with the Salt Vipers
> I learned to read the stars, tie knots that hold, and spot a mark.

**Applies When**:
- Navigation at sea or by stars
- Rope work and rigging
- Identifying valuables or marks
- Understanding pirate codes/signals

**Does NOT Apply**:
- General combat (use class features)
- Social situations not involving criminals
- Knowledge of landlocked regions
- Magic or supernatural phenomena
```

**Alternatives Considered**:
1. **Keyword-only format**: Simple list of tags (e.g., "Pirate, Navigation, Ropes")
   - Pro: Faster character creation
   - Con: No scope boundaries—"Pirate" could apply to almost anything
   - Rejected: Spec identifies semantic drift as key risk
2. **Numeric usage limits**: "Applies 3x per session"
   - Pro: Prevents overuse
   - Con: Doesn't address scope drift, just frequency
   - Rejected: Doesn't solve the scoping problem
3. **GM-only constraints**: GM decides scope at usage time without player input
   - Pro: Maximum flexibility
   - Con: Inconsistent application, no written record
   - Rejected: Creates session-to-session inconsistency

**Rationale**: The spec identifies semantic drift as a key risk for LLM-interpreted Experiences. Unbounded keywords like "Lucky" or "Skilled" could apply to any roll. The template:
- Forces players to define explicit scope at creation time
- Gives the GM clear boundaries for when to allow Experience use
- Creates a written record the GM can reference mid-session
- Prevents creeping scope expansion through explicit exclusions

### TD-4: Hope/Fear Token Tracking

**Choice**: Track in adventure state with per-player Hope arrays and GM Fear counter

**Requirements**: REQ-F-16, REQ-F-17, REQ-F-41, REQ-F-42

**State Structure** (in adventure's state files):
```markdown
## Hope/Fear Economy

### Player Hope
| Player | Hope (max 6) |
|--------|--------------|
| Kira   | ●●●○○○       |
| Thorn  | ●●○○○○       |

### GM Fear
Fear: ●●●●●○○○○○○○ (5/12)
```

**Alternatives Considered**:
1. **Numeric format in character state.md**: `Hope: 3/6` instead of visual
   - Pro: Easier to parse programmatically
   - Con: Less readable at a glance during play; adventurer state is human-read
   - Rejected: Visual notation matches existing corvran patterns
2. **Centralized tracking in encounter.md only**: All Hope/Fear in one place
   - Pro: Single source of truth during combat
   - Con: Character Hope persists outside combat; encounter.md is ephemeral
   - Rejected: Hope belongs with character state, Fear in encounter state
3. **JSON structure in state files**: `{"hope": 3, "max": 6}`
   - Pro: Machine-parseable
   - Con: Inconsistent with markdown-based character files
   - Rejected: Maintains markdown consistency across all character data

**Rationale**:
- Unlike d20's spell slots (permanent character data), Hope/Fear is session state
- Per-player tracking reflects Daggerheart's design (each PC has own Hope pool)
- Visual notation (`●○`) is easy to scan during play
- Max enforcement happens in GM guidance, not code (no automated tracking)

### TD-5: Adversary Stat Block Format

**Choice**: Markdown template matching SRD stat block structure

**Requirements**: REQ-F-24 to REQ-F-27

**Template**:
```markdown
# [ADVERSARY NAME]

***Tier [1-4] [Type]***
*[Description]*
**Motives & Tactics:** [Behavioral guidance]

> **Difficulty:** [N] | **Thresholds:** [Major]/[Severe] | **HP:** [N] | **Stress:** [N]
> **ATK:** +[N] | **[Attack Name]:** [Range] | [Damage] [type]
> **Experience:** [Name] +[N]

## FEATURES

***[Feature Name] - [Action/Reaction/Passive]:*** [Description]

## FEAR FEATURES

***[Feature Name] - Action:*** Spend a Fear to [effect]
```

**Rationale**: Follows SRD formatting exactly, making it easy to:
- Copy adversaries from the SRD reference
- Create new adversaries using the same structure
- Maintain consistency with official content

### TD-6: SRD Reference Strategy

**Choice**: Symlink SRD into skill's references directory, provide grep patterns for search

**Requirements**: REQ-F-36 to REQ-F-38, REQ-NF-4

**Implementation**:
- SRD source lives at `docs/research/daggerheart-srd/` (git submodule)
- dh-rules skill has symlink: `references/srd -> ../../../../docs/research/daggerheart-srd`
- Skills access SRD via the symlink path (plugin-relative access)
- dh-rules skill provides optimized grep patterns:

```bash
# Find adversary by name (from skill context)
grep -ri "^# ADVERSARY_NAME" "${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/adversaries/"

# Find class by name
grep -ri "^# CLASS_NAME" "${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/classes/"

# Find domain card
grep -ri "CARD_NAME" "${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/abilities/"
```

**Rationale**: Symlink approach (matching d20-rules pattern):
- Plugin skills can't access `docs/` directly—need plugin-relative paths
- Symlink provides stable reference without duplicating content
- SRD updates in submodule automatically reflected via symlink
- Maintains consistency with d20-system's SRD access pattern

## Data Model

### Character Sheet (sheet.md)

```markdown
# [Character Name]

## Identity
- **Class**: [Class] / **Subclass**: [Subclass]
- **Level**: [1-10]
- **Ancestry**: [Ancestry]
- **Community**: [Community]

## Traits
| Trait | Modifier |
|-------|----------|
| Agility | [+2/+1/+0/-1] |
| Strength | [+2/+1/+0/-1] |
| Finesse | [+2/+1/+0/-1] |
| Instinct | [+2/+1/+0/-1] |
| Presence | [+2/+1/+0/-1] |
| Knowledge | [+2/+1/+0/-1] |

## Combat Stats
- **Evasion**: [Base from class + modifiers]
- **Hit Points**: ○○○○○○ (6 slots typical)
- **Stress**: ○○○○○○ (6 slots)
- **Armor Score**: [Value]
- **Damage Thresholds**: Major [Level + Armor Base] / Severe [Level + Armor Base]

## Hope
Hope: ○○○○○○ (max 6)

## Equipment
### Active Weapon
[Weapon Name] | [Range] | [Proficiency]d[Dice]+[Mod] [type]

### Active Armor
[Armor Name] | Base: Major [N] / Severe [N] | Slots: ○○○

## Experiences
[Experience entries using bounded constraint format]

## Domain Cards
- [Card 1 Name] (Domain, Level, Recall Cost)
- [Card 2 Name] (Domain, Level, Recall Cost)

## Class Features
[Class and subclass features]

## Ancestry Features
[Two ancestry features]

## Community Feature
[Community feature]
```

### Character State (state.md)

```markdown
# [Character Name] - Session State

## Current Status
- **HP Marked**: ●●○○○○ (2/6)
- **Stress Marked**: ●○○○○○ (1/6)
- **Armor Slots Used**: ●○○
- **Hope**: ●●●○○○ (3/6)
- **Conditions**: [Vulnerable, etc.]

## Active Effects
- [Spell or ability effects currently active]

## Current Objectives
- [Session-specific goals]
```

### Encounter State (encounter.md)

```markdown
# Encounter: [Name]

## GM Fear
Fear: ●●●●●○○○○○○○ (5/12)

## Initiative / Spotlight
Currently: [PC Name or GM]

## Combatants

### Party
| PC | HP | Stress | Hope | Conditions |
|----|----|----|------|------------|
| [Name] | ●●○○○○ | ●○○○○○ | ●●●○○○ | - |

### Adversaries
| Adversary | HP | Stress | Conditions | Notes |
|-----------|----|----|------------|-------|
| [Name] | ●●●○○○ | ●○○ | - | [tactical notes] |
```

## Integration Points

### Dice Roller (corvran)

**Path**: `${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh`

**Modification Required**: Add `DdD` pattern handling

**Current Regex**: `^([0-9]*)d([0-9]+|F)([+-][0-9]+)?$`

**New Regex** (in addition): `^DdD([+-][0-9]+)?$`

**Integration Pattern**:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "DdD+3"
```

### SRD Submodule

**Source Path**: `docs/research/daggerheart-srd/` (git submodule)

**Plugin Access**: `${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/` (via symlink)

**Symlink**: `daggerheart-system/skills/dh-rules/references/srd -> ../../../../docs/research/daggerheart-srd`

**Structure** (accessible via symlink):
- `contents/` - Core rules (Combat.md, Character Creation.md, etc.)
- `classes/` - Class definitions
- `ancestries/` - Ancestry options
- `communities/` - Community options
- `domains/` - Domain descriptions
- `abilities/` - Domain cards
- `adversaries/` - Stat blocks
- `.build/md/` - Compiled reference files

### Adventure Directory

**Standard Corvran Structure**:
```
adventure/
├── CLAUDE.md          # Merged with dh-CLAUDE.md content
├── System.md          # Copied from plugin
└── players/
    └── {character}/
        ├── sheet.md   # Daggerheart character sheet
        └── state.md   # Session state
```

## Error Handling, Performance, Security

### Error Strategy

**Dice Roller Errors** (REQ-F-39):
- Invalid modifier (non-numeric): `{"error": "Invalid DdD expression: DdD+abc. Modifier must be numeric."}`
- Malformed expression: `{"error": "Invalid dice expression: [input]. Use format DdD or DdD+N"}`

**Init Command Errors** (REQ-F-40):
- Missing SRD: Check if `docs/research/daggerheart-srd/` exists and contains files
- Error message: "Daggerheart SRD submodule not found. Run `git submodule update --init` first."

**Token Overflow** (REQ-F-41, REQ-F-42):
- Silently cap at max (6 for Hope, 12 for Fear)
- No error, no warning—this is expected behavior per SRD

### Performance Targets

**REQ-NF-1** (Dice Roll <100ms):
- Bash script with simple math operations
- No external dependencies beyond shell builtins
- Current roll.sh already meets this; DdD adds negligible overhead

**REQ-NF-10** (Rule Lookups):
- SRD files are smaller than d20 SRD (~50KB vs 325KB for spells)
- Grep patterns target individual files when possible
- Limit context output (`-A 20` typical)

### Security Measures

**License Compliance** (REQ-NF-5):
- Include DPCGL attribution in dh-rules License.md
- Reference SRD, don't duplicate content
- No trademarks in plugin name (use "daggerheart-system" not "Daggerheart™")

**Input Validation**:
- Dice expressions validated via regex before execution
- No shell injection risk (input sanitized to alphanumeric + `+-`)

## Testing Strategy

### Unit Tests

**Dice Roller Extension**:
1. `DdD` basic roll returns valid JSON with all required fields
2. `DdD+N` modifier correctly applies
3. `DdD-N` negative modifier works
4. Critical detection: when rolls match, `higher` = "critical"
5. Hope detection: when first die > second, `higher` = "hope"
6. Fear detection: when second die > first, `higher` = "fear"
7. Error case: `DdD+abc` returns error JSON
8. Existing expressions unchanged: `1d20`, `2d6+3`, `dF` still work

**Coverage Target**: 100% of dice roller paths

### Integration Tests

**Init Command**:
1. Creates System.md in adventure directory
2. Merges dh-CLAUDE.md into CLAUDE.md
3. Idempotent: second run doesn't duplicate content
4. Preserves existing CLAUDE.md content

**Skill Invocation**:
1. dh-players skill readable and contains template
2. dh-combat skill references dice-roller correctly
3. dh-rules skill grep patterns find expected SRD content
4. SRD symlink resolves correctly (`references/srd/` accessible)

### Manual Validation

**Character Creation Flow**:
1. Walk through character creation with all 9 classes
2. Verify Experience template captures bounded constraints
3. Test domain card selection references

**Combat Resolution**:
1. Test all 5 action roll outcomes (Success/Failure with Hope/Fear, Critical)
2. Verify Hope/Fear token tracking guidance
3. Test adversary spotlight flow

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dice roller changes break d20-system | Low | High | Test all existing expressions before merge; add, don't modify |
| Experience semantic drift despite template | Medium | Medium | GM guidance emphasizes template review; default to NOT applying unclear cases |
| SRD submodule not initialized | Medium | High | Clear error message with fix instructions; check in init command |
| Player confusion between systems | Low | Low | Clear naming (dh- prefix); separate System.md files |
| DPCGL license violation | Low | High | Review license requirements; attribute properly; no trademarked terms |

## Dependencies

### Technical
- **corvran plugin**: Required for dice-roller skill
- **daggerheart-srd submodule**: Required for rule content
- **bash**: Script execution
- **grep/cat**: SRD searching and file operations

### Team
- None required for implementation (single developer)

## Open Questions

- [ ] Should multiclassing domain access be documented in dh-players or dh-domains?
- [ ] Should the encounter template track individual adversary Stress or use a simplified format?

---

**Next Phase**: Once approved, use `/spiral-grove:task-breakdown` to decompose into implementable tasks.
