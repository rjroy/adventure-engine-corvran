---
specification: [.sdd/specs/2025-12-22-daggerheart-system.md](./../specs/2025-12-22-daggerheart-system.md)
plan: [.sdd/plans/2025-12-22-daggerheart-system-plan.md](./../plans/2025-12-22-daggerheart-system-plan.md)
status: Ready for Implementation
version: 1.0.0
created: 2025-12-22
last_updated: 2025-12-22
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Daggerheart System Plugin - Task Breakdown

## Task Summary
Total: 15 tasks | Complexity Distribution: 5×S, 7×M, 3×L

## Foundation

### TASK-001: Create Plugin Scaffold
**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Create the base plugin directory structure with plugin.json manifest and placeholder files.

**Acceptance Criteria**:
- [ ] `daggerheart-system/.claude-plugin/plugin.json` exists with valid manifest
- [ ] `daggerheart-system/CLAUDE.md` exists with plugin-level guidance placeholder
- [ ] `daggerheart-system/dh-CLAUDE.md` exists (GM guidance for merging)
- [ ] `daggerheart-system/System.md` exists (core rules summary placeholder)
- [ ] Directory structure matches plan: `commands/`, `skills/`

**Files**: Create: `daggerheart-system/.claude-plugin/plugin.json`, `daggerheart-system/CLAUDE.md`, `daggerheart-system/dh-CLAUDE.md`, `daggerheart-system/System.md`

**Testing**: Run `cat daggerheart-system/.claude-plugin/plugin.json | jq .` to validate JSON

---

### TASK-002: Extend Dice Roller for DdD Notation
**Priority**: Critical | **Complexity**: M | **Dependencies**: None

**Description**: Extend `corvran/skills/dice-roller/scripts/roll.sh` to support Duality Dice (`DdD`, `DdD+N`) notation with Hope/Fear semantics.

**Acceptance Criteria**:
- [ ] `DdD` rolls two d12s and returns JSON with `hope`, `fear`, `higher`, `total` fields
- [ ] `DdD+N` adds modifier to total correctly
- [ ] `DdD-N` subtracts modifier correctly
- [ ] When hope == fear, `higher` returns `"critical"`
- [ ] When hope > fear, `higher` returns `"hope"`
- [ ] When fear > hope, `higher` returns `"fear"`
- [ ] Invalid modifiers (e.g., `DdD+abc`) return JSON error
- [ ] Existing dice expressions (`1d20`, `2d6+3`, `dF`) continue to work unchanged

**Files**: Modify: `corvran/skills/dice-roller/scripts/roll.sh`

**Testing**:
- `roll.sh "DdD"` returns valid JSON with all required fields
- `roll.sh "DdD+3"` returns total = hope + fear + 3
- `roll.sh "1d20+5"` returns same format as before

---

## Skills - Player/Character

### TASK-003: Create dh-players Skill Structure
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create the dh-players skill with SKILL.md and reference templates for character creation.

**Acceptance Criteria**:
- [ ] `skills/dh-players/SKILL.md` with trigger description and character creation guidance
- [ ] `skills/dh-players/references/sheet-template.md` matching plan's character sheet format
- [ ] `skills/dh-players/references/sheet-example.md` with sample Level 1 character
- [ ] `skills/dh-players/references/state-template.md` for session state
- [ ] Template includes all 6 traits, HP, Stress, Hope slots, Evasion, domain cards
- [ ] Level advancement (1-10) documented in skill

**Files**: Create: `daggerheart-system/skills/dh-players/SKILL.md`, `daggerheart-system/skills/dh-players/references/sheet-template.md`, `daggerheart-system/skills/dh-players/references/sheet-example.md`, `daggerheart-system/skills/dh-players/references/state-template.md`

**Testing**: Verify all templates render correctly and contain required fields

---

### TASK-004: Create Experience Constraint Template
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-003

**Description**: Create the bounded Experience template that prevents semantic drift, with positive scope and explicit exclusions.

**Acceptance Criteria**:
- [ ] `skills/dh-players/references/experience-template.md` with TD-3 format
- [ ] Template includes: Name, Modifier, Narrative Origin, Applies When, Does NOT Apply
- [ ] Example Experience demonstrating proper scope boundaries
- [ ] SKILL.md references Experience template and emphasizes bounded interpretation
- [ ] GM guidance defaults to NOT applying when scope is unclear

**Files**: Create: `daggerheart-system/skills/dh-players/references/experience-template.md` | Modify: `daggerheart-system/skills/dh-players/SKILL.md`

**Testing**: Verify template has both positive scope and explicit exclusions sections

---

## Skills - Combat

### TASK-005: Create dh-combat Skill
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-001, TASK-002

**Description**: Create the dh-combat skill covering Hope/Fear economy, action resolution, spotlight flow, and damage tracking.

**Acceptance Criteria**:
- [ ] `skills/dh-combat/SKILL.md` with combat flow guidance
- [ ] Documents all 5 action outcomes: Success with Hope, Success with Fear, Failure with Hope, Failure with Fear, Critical Success
- [ ] `references/action-outcomes.md` with outcome tables and guidance
- [ ] `references/encounter-template.md` with Fear tracking, spotlight, combatant tables
- [ ] `references/conditions.md` with Daggerheart condition list
- [ ] Hope/Fear token tracking format per TD-4 (visual notation ●○)
- [ ] Reaction roll handling (no Hope/Fear generation)
- [ ] Advantage/disadvantage (+/- d6) documented

**Files**: Create: `daggerheart-system/skills/dh-combat/SKILL.md`, `daggerheart-system/skills/dh-combat/references/action-outcomes.md`, `daggerheart-system/skills/dh-combat/references/encounter-template.md`, `daggerheart-system/skills/dh-combat/references/conditions.md`

**Testing**: Verify encounter-template.md contains `## GM Fear` section and player Hope columns in combatants table

---

## Skills - Adversaries

### TASK-006: Create dh-adversaries Skill
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create the dh-adversaries skill for adversary creation and encounter building.

**Acceptance Criteria**:
- [ ] `skills/dh-adversaries/SKILL.md` with adversary creation guidance
- [ ] `references/stat-block-template.md` matching TD-5 format (Tier, Type, Difficulty, Thresholds, HP, Stress, ATK, Features, Fear Features)
- [ ] `references/stat-block-example.md` with sample Tier 1 adversary
- [ ] `references/encounter-building.md` with `[(3 x PCs) + 2]` formula and adjustments
- [ ] All 10 adversary types documented: Bruiser, Horde, Leader, Minion, Ranged, Skulk, Social, Solo, Standard, Support

**Files**: Create: `daggerheart-system/skills/dh-adversaries/SKILL.md`, `daggerheart-system/skills/dh-adversaries/references/stat-block-template.md`, `daggerheart-system/skills/dh-adversaries/references/stat-block-example.md`, `daggerheart-system/skills/dh-adversaries/references/encounter-building.md`

**Testing**: Verify stat block template includes all required fields from REQ-F-24

---

## Skills - Domains

### TASK-007: Create dh-domains Skill
**Priority**: Medium | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create the dh-domains skill for domain card reference and Spellcast guidance.

**Acceptance Criteria**:
- [ ] `skills/dh-domains/SKILL.md` with domain overview and Spellcast guidance
- [ ] `references/domain-overview.md` covering all 9 domains: Arcana, Blade, Bone, Codex, Grace, Midnight, Sage, Splendor, Valor
- [ ] Domain card format documented: Name, Domain, Level, Recall Cost, Effect
- [ ] References SRD for full domain card content (no duplication)

**Files**: Create: `daggerheart-system/skills/dh-domains/SKILL.md`, `daggerheart-system/skills/dh-domains/references/domain-overview.md`

**Testing**: Verify all 9 domains listed with brief descriptions

---

## Skills - Rules

### TASK-008: Create dh-rules Skill with SRD Symlink
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-001

**Description**: Create the dh-rules skill with SRD symlink and search patterns for rule lookups.

**Acceptance Criteria**:
- [ ] `skills/dh-rules/SKILL.md` with grep patterns for SRD searching
- [ ] `skills/dh-rules/License.md` with DPCGL attribution
- [ ] `skills/dh-rules/references/srd` symlink to `../../../../docs/research/daggerheart-srd`
- [ ] Grep patterns for: adversary lookup, class lookup, domain card search
- [ ] Symlink resolves correctly from plugin context

**Files**: Create: `daggerheart-system/skills/dh-rules/SKILL.md`, `daggerheart-system/skills/dh-rules/License.md`, `daggerheart-system/skills/dh-rules/references/srd` (symlink)

**Testing**: `ls -la daggerheart-system/skills/dh-rules/references/srd` shows valid symlink; grep patterns return SRD content

---

## Integration

### TASK-009: Create Init Command
**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001, TASK-003

**Description**: Create the `/daggerheart-system:init` command that sets up adventures with System.md and GM guidance.

**Acceptance Criteria**:
- [ ] `commands/init.md` with command logic
- [ ] Copies `System.md` to adventure directory
- [ ] Merges `dh-CLAUDE.md` content into project CLAUDE.md
- [ ] Checks for SRD submodule presence, fails with clear error if missing
- [ ] Idempotent: second run doesn't duplicate content
- [ ] Preserves existing CLAUDE.md content

**Files**: Create: `daggerheart-system/commands/init.md`

**Testing**: Run init twice on test adventure; verify no duplication

---

### TASK-010: Write System.md Core Rules
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-002, TASK-005

**Description**: Write the System.md file with core Daggerheart rules summary for adventure reference.

**Acceptance Criteria**:
- [ ] Covers: Duality Dice mechanics, Hope/Fear economy, action resolution
- [ ] Covers: Damage thresholds, Stress, conditions
- [ ] Covers: Experience usage guidance (bounded interpretation)
- [ ] Covers: Spotlight flow basics
- [ ] References SRD for detailed rules (no full duplication)
- [ ] Document length suitable for in-context reference (under 500 lines)

**Files**: Modify: `daggerheart-system/System.md`

**Testing**: Verify covers all core mechanics; not excessive length

---

### TASK-011: Write dh-CLAUDE.md GM Guidance
**Priority**: High | **Complexity**: L | **Dependencies**: TASK-004, TASK-005

**Description**: Write the GM guidance file that gets merged into adventure CLAUDE.md.

**Acceptance Criteria**:
- [ ] Experience interpretation guidance: treat as bounded permissions
- [ ] Default to NOT applying Experience when scope is unclear
- [ ] Hope/Fear economy GM rules and token tracking
- [ ] Combat spotlight flow guidance
- [ ] Duality Dice result framing (hope vs fear narrative)
- [ ] Token max handling (silent cap at 6/12)

**Files**: Modify: `daggerheart-system/dh-CLAUDE.md`

**Testing**: Verify contains Experience constraint guidance and Hope/Fear rules

---

### TASK-012: Write Plugin CLAUDE.md
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-003 through TASK-008

**Description**: Write the plugin-level CLAUDE.md with skill descriptions and usage guidance.

**Acceptance Criteria**:
- [ ] Lists all skills with trigger conditions
- [ ] Explains relationship with corvran dice roller
- [ ] Documents SRD reference strategy
- [ ] Notes d20-system parallel structure

**Files**: Modify: `daggerheart-system/CLAUDE.md`

**Testing**: Verify all skills documented with clear triggers

---

## Testing

### TASK-013: Create Dice Roller Tests
**Priority**: High | **Complexity**: S | **Dependencies**: TASK-002

**Description**: Create test cases for the extended dice roller covering DdD notation and backward compatibility.

**Acceptance Criteria**:
- [ ] Test `DdD` basic roll returns valid JSON with all fields
- [ ] Test `DdD+N` and `DdD-N` modifiers
- [ ] Test critical detection (doubles)
- [ ] Test hope/fear detection (higher die wins)
- [ ] Test error case `DdD+abc`
- [ ] Test existing expressions unchanged: `1d20`, `2d6+3`, `dF`

**Files**: Create: `corvran/skills/dice-roller/scripts/roll.test.sh` or integration test

**Testing**: Run test script; all tests pass

---

### TASK-014: Create Integration Test Script
**Priority**: Medium | **Complexity**: S | **Dependencies**: TASK-009, TASK-010, TASK-011

**Description**: Create a test script that validates init command and skill accessibility.

**Acceptance Criteria**:
- [ ] Test init command creates System.md in test directory
- [ ] Test init command merges dh-CLAUDE.md content
- [ ] Test init is idempotent (no duplication)
- [ ] Test SRD symlink resolves correctly
- [ ] Test all 5 skill SKILL.md files exist and contain valid markdown

**Files**: Create: `daggerheart-system/tests/integration.test.sh`

**Testing**: Run script; all integration tests pass

---

### TASK-015: Manual Validation Checklist
**Priority**: Low | **Complexity**: S | **Dependencies**: All previous tasks

**Description**: Create a manual validation checklist for character creation and combat flows.

**Acceptance Criteria**:
- [ ] Character creation checklist: all 9 classes, ancestry, community
- [ ] Experience template validates bounded constraints
- [ ] Combat resolution checklist: all 5 outcomes
- [ ] Adversary creation checklist
- [ ] Acceptance tests from spec mapped to validation steps

**Files**: Create: `daggerheart-system/tests/manual-validation.md`

**Testing**: Checklist exists and covers all spec acceptance tests

---

## Dependency Graph
```
TASK-001 (Scaffold)
    │
    ├──> TASK-003 (dh-players) ──> TASK-004 (Experiences) ──> TASK-011 (dh-CLAUDE)
    │         │
    │         └──> TASK-009 (Init) ──> TASK-014 (Integration Tests)
    │
    ├──> TASK-005 (dh-combat) ──> TASK-010 (System.md) ──> TASK-011 (dh-CLAUDE)
    │         │
    │         └──> TASK-014 (Integration Tests)
    │
    ├──> TASK-006 (dh-adversaries)
    │
    ├──> TASK-007 (dh-domains)
    │
    ├──> TASK-008 (dh-rules) ──> TASK-014 (Integration Tests)
    │
    └──> TASK-012 (Plugin CLAUDE.md) ──> depends on all skills

TASK-002 (Dice Roller) ──> TASK-005 (dh-combat)
         │
         └──> TASK-013 (Dice Tests)
         │
         └──> TASK-010 (System.md)

TASK-015 (Manual Validation) ──> All tasks complete
```

## Implementation Order

**Phase 1** (Foundation): TASK-001, TASK-002
- Can run in parallel
- TASK-001 creates plugin structure
- TASK-002 extends dice roller (independent of plugin)

**Phase 2** (Core Skills): TASK-003, TASK-005, TASK-006, TASK-007, TASK-008
- TASK-003 (dh-players) and TASK-006/007/008 can run in parallel
- TASK-005 (dh-combat) depends on dice roller completion

**Phase 3** (Refinement): TASK-004, TASK-009, TASK-010, TASK-011, TASK-012
- TASK-004 (Experiences) after dh-players
- TASK-009 (Init) after dh-players
- TASK-010/011 after combat skill
- TASK-012 after all skills

**Phase 4** (Testing): TASK-013, TASK-014, TASK-015
- TASK-013 can start after TASK-002
- TASK-014 after init command
- TASK-015 after everything

## Notes

- **Parallelization**: Phase 1 tasks are fully parallel. Phase 2 skills (except dh-combat) are parallel with each other.
- **Critical path**: TASK-001 → TASK-003 → TASK-005 → TASK-010 → TASK-011 → TASK-014
- **Risk areas**: TASK-002 (dice roller) affects existing corvran functionality - test thoroughly
