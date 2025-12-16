---
specification: [.sdd/specs/2025-12-16-d20-system-plugin.md](./../specs/2025-12-16-d20-system-plugin.md)
plan: [.sdd/plans/2025-12-16-d20-system-plugin-plan.md](./../plans/2025-12-16-d20-system-plugin-plan.md)
status: Ready for Implementation
version: 1.0.0
created: 2025-12-16
last_updated: 2025-12-16
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# d20-System Plugin - Task Breakdown

## Task Summary

Total: 10 tasks | Complexity Distribution: 2×S, 6×M, 2×L

## Foundation

### TASK-001: Create Plugin Directory Structure and Manifest

**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Initialize the d20-system plugin directory structure and create plugin.json manifest.

**Acceptance Criteria**:
- [ ] `d20-system/.claude-plugin/plugin.json` exists with name, version, description
- [ ] Directory structure matches plan architecture (skills/, templates/)
- [ ] Plugin discoverable via `claude plugin list`

**Files**:
- Create: `d20-system/.claude-plugin/plugin.json`
- Create: `d20-system/skills/.gitkeep` (placeholder)
- Create: `d20-system/templates/.gitkeep` (placeholder)

**Testing**: Run `claude plugin list` and verify d20-system appears

---

### TASK-002: Create System.md Core Rules

**Priority**: Critical | **Complexity**: L | **Dependencies**: TASK-001

**Description**: Create System.md with all SRD 5.2 core mechanics. Must satisfy REQ-F-5 through F-10.

**Acceptance Criteria**:
- [ ] Six abilities defined with modifier formula `(score - 10) / 2`
- [ ] D20 test resolution: `d20 + modifier + proficiency vs DC/AC`
- [ ] Difficulty Class table (Very Easy 5 through Nearly Impossible 30)
- [ ] Proficiency Bonus table by level/CR (+2 through +6)
- [ ] Advantage/disadvantage rules (roll 2d20, take higher/lower)
- [ ] All 18 standard skills with associated abilities
- [ ] CC-BY-4.0 attribution included

**Files**:
- Create: `d20-system/System.md`

**Testing**: Cross-reference against `docs/research/dndsrd5.2_markdown/src/01_PlayingTheGame.md`

---

### TASK-003: Create CLAUDE.md GM Guidance

**Priority**: High | **Complexity**: S | **Dependencies**: TASK-001

**Description**: Create CLAUDE.md with GM-level guidance, dice-roller integration path, and licensing.

**Acceptance Criteria**:
- [ ] Overview section with plugin purpose and installed skills
- [ ] GM guidance for applying d20 mechanics narratively
- [ ] Dice-roller integration path documented
- [ ] CC-BY-4.0 attribution statement
- [ ] Customization guidance for adventure creators

**Files**:
- Create: `d20-system/CLAUDE.md`

**Testing**: Verify all sections present; check license attribution

---

## Templates

### TASK-004: Create Character and Encounter Templates

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create all template files (3 blank + 3 examples) per plan Data Model section.

**Acceptance Criteria**:
- [ ] `player.md` template with inline comments explaining each field
- [ ] `player-example.md` (Level 3 Fighter per plan)
- [ ] `npc.md` template matching SRD 5.2 stat block format
- [ ] `npc-example.md` (Goblin stat block)
- [ ] `encounter.md` template with initiative tracker, combatant tables
- [ ] `encounter-example.md` (Ambush scenario)

**Files**:
- Create: `d20-system/templates/player.md`
- Create: `d20-system/templates/player-example.md`
- Create: `d20-system/templates/npc.md`
- Create: `d20-system/templates/npc-example.md`
- Create: `d20-system/templates/encounter.md`
- Create: `d20-system/templates/encounter-example.md`

**Testing**: Verify stat block format against SRD (`11_Monsters.md`, `12_MonstersA-Z.md`)

---

## Skills

### TASK-005: Create d20-players Skill

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create character creation and advancement skill with references.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "create a character", "roll for stats", "assign ability scores", "level up"
- [ ] Markdown body uses imperative form (per plugin-dev guidelines)
- [ ] Specifies player.md format (ability scores, proficiencies, HP, AC, equipment)
- [ ] References corvran dice-roller for stat rolling
- [ ] `references/character-creation.md` contains detailed SRD rules
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-players/SKILL.md`
- Create: `d20-system/skills/d20-players/references/character-creation.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-006: Create d20-monsters Skill

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create NPC/enemy creation skill with stat block references.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "create an NPC", "create a monster", "stat block", "enemy stats"
- [ ] Specifies SRD 5.2 stat block format (size/type/alignment, AC, HP, abilities, actions)
- [ ] Covers CR/XP table, proficiency bonus by CR
- [ ] References corvran dice-roller for HP/damage
- [ ] `references/stat-blocks.md` contains detailed format and examples
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-monsters/SKILL.md`
- Create: `d20-system/skills/d20-monsters/references/stat-blocks.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-007: Create d20-combat Skill

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create combat flow guidance skill with conditions reference.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "start combat", "roll initiative", "attack roll", "combat encounter"
- [ ] Covers initiative (d20 + DEX), turn structure, attack rolls, damage
- [ ] Lists action types (action, bonus action, movement, reaction)
- [ ] References corvran dice-roller for initiative and attacks
- [ ] `references/conditions.md` contains all 14 SRD conditions
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-combat/SKILL.md`
- Create: `d20-system/skills/d20-combat/references/conditions.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-008: Create d20-magic Skill

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create spellcasting guidance skill with spell slot references.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "cast a spell", "spell slots", "spell save DC", "concentration"
- [ ] Covers spell save DC formula: `8 + proficiency + spellcasting ability modifier`
- [ ] Covers spell attack rolls, concentration rules
- [ ] References corvran dice-roller for spell attacks
- [ ] `references/spellcasting.md` contains spell slot tables by class level
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-magic/SKILL.md`
- Create: `d20-system/skills/d20-magic/references/spellcasting.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-009: Create d20-rules Skill with Full SRD

**Priority**: High | **Complexity**: L | **Dependencies**: TASK-001

**Description**: Create authoritative SRD lookup skill and copy full SRD markdown (~1.2MB).

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases per REQ-F-22: "look up rule", "what does SRD say", "official rules for", "exact wording"
- [ ] SKILL.md includes grep patterns for large files (07_Spells.md, 12_MonstersA-Z.md)
- [ ] All SRD files copied from `docs/research/dndsrd5.2_markdown/src/`
- [ ] Directory structure matches plan (00_Legal.md through 13_Animals.md)
- [ ] 03_Classes/ subdirectory preserved with all class files
- [ ] Total size ≤2MB
- [ ] `00_Legal.md` preserved for CC-BY-4.0 attribution
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-rules/SKILL.md`
- Create: `d20-system/skills/d20-rules/references/srd/` (copy all SRD files)

**Testing**: Verify file count and size; test grep patterns for spell and monster lookup

---

## Validation

### TASK-010: Run Validation and Acceptance Tests

**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-003 through TASK-009

**Description**: Validate all skills, run acceptance tests from spec, verify licensing compliance.

**Acceptance Criteria**:
- [ ] All 5 skills pass `plugin-dev:skill-reviewer`
- [ ] Plugin installs via marketplace pattern
- [ ] Acceptance Test 4: Character creation produces valid player.md
- [ ] Acceptance Test 5: NPC stat block matches SRD format
- [ ] Acceptance Test 6: D20 test resolution correct (d20 + modifier vs DC)
- [ ] Acceptance Test 7: Initiative uses d20 + DEX
- [ ] Acceptance Test 8: Dice rolls invoke dice-roller skill
- [ ] Acceptance Test 9: SRD lookup returns correct rule text
- [ ] CC-BY-4.0 attribution present in System.md, CLAUDE.md, 00_Legal.md

**Files**: None (validation only)

**Testing**: Manual walkthrough of all 10 acceptance tests from spec

---

## Dependency Graph

```
TASK-001 (Plugin Structure)
    │
    ├──> TASK-002 (System.md) ──┬──> TASK-004 (Templates)
    │                           ├──> TASK-005 (d20-players)
    │                           ├──> TASK-006 (d20-monsters)
    │                           ├──> TASK-007 (d20-combat)
    │                           └──> TASK-008 (d20-magic)
    │
    ├──> TASK-003 (CLAUDE.md) ──────────────────────────────┐
    │                                                       │
    └──> TASK-009 (d20-rules + SRD) ────────────────────────┤
                                                            │
                                                            v
                                                    TASK-010 (Validation)
```

## Implementation Order

**Phase 1** (Foundation): TASK-001, TASK-002, TASK-003, TASK-009
- TASK-001 first (creates directory structure)
- TASK-002, TASK-003, TASK-009 can run in parallel after TASK-001

**Phase 2** (Content): TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
- All depend on System.md (TASK-002)
- Can run in parallel with each other

**Phase 3** (Validation): TASK-010
- Depends on all other tasks

## Notes

- **Parallelization**: After TASK-001, most tasks can run concurrently
- **Critical path**: TASK-001 → TASK-002 → TASK-005/006/007/008 → TASK-010
- **Largest tasks**: TASK-002 (System.md authoring) and TASK-009 (SRD file copy ~1.2MB)
- **Risk area**: TASK-009 file copy; verify sizes stay under 2MB limit
