---
specification: [.sdd/specs/2025-12-16-d20-system-plugin.md](./../specs/2025-12-16-d20-system-plugin.md)
plan: [.sdd/plans/2025-12-16-d20-system-plugin-plan.md](./../plans/2025-12-16-d20-system-plugin-plan.md)
status: Ready for Implementation
version: 1.1.0
created: 2025-12-16
last_updated: 2025-12-16
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# d20-System Plugin - Task Breakdown

## Task Summary

Total: 11 tasks | Complexity Distribution: 2×S, 7×M, 2×L

## Foundation

### TASK-001: Create Plugin Directory Structure and Manifest

**Priority**: Critical | **Complexity**: S | **Dependencies**: None

**Description**: Initialize the d20-system plugin directory structure and create plugin.json manifest.

**Acceptance Criteria**:
- [ ] `d20-system/.claude-plugin/plugin.json` exists with name, version, description
- [ ] Directory structure matches plan architecture (commands/, skills/)
- [ ] Plugin discoverable via `claude plugin list`

**Files**:
- Create: `d20-system/.claude-plugin/plugin.json`
- Create: `d20-system/commands/.gitkeep` (placeholder)
- Create: `d20-system/skills/.gitkeep` (placeholder)

**Testing**: Run `claude plugin list` and verify d20-system appears

---

### TASK-002: Create System.md Core Rules

**Priority**: Critical | **Complexity**: L | **Dependencies**: TASK-001

**Description**: Create System.md with all SRD 5.2 core mechanics. Must satisfy REQ-F-7 through F-12.

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

### TASK-003: Create CLAUDE.md Files (Plugin + Adventure)

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-001

**Description**: Create plugin-level CLAUDE.md and adventure-level d20-CLAUDE.md for init command merging.

**Acceptance Criteria**:
- [ ] `CLAUDE.md` has plugin overview and installed skills list
- [ ] `CLAUDE.md` has dice-roller integration path documented
- [ ] `CLAUDE.md` has CC-BY-4.0 attribution statement
- [ ] `d20-CLAUDE.md` has GM guidance for applying d20 mechanics narratively
- [ ] `d20-CLAUDE.md` has state file format references (links to skill templates)
- [ ] `d20-CLAUDE.md` has customization guidance for house rules

**Files**:
- Create: `d20-system/CLAUDE.md`
- Create: `d20-system/d20-CLAUDE.md`

**Testing**: Verify all sections present; check license attribution in CLAUDE.md

---

### TASK-004: Create Init Command

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002, TASK-003

**Description**: Create `/d20-system:init` command that copies System.md to adventure directory and merges d20-CLAUDE.md into project CLAUDE.md.

**Acceptance Criteria**:
- [ ] `commands/init.md` exists with proper frontmatter
- [ ] Command copies System.md to current directory
- [ ] Command appends d20-CLAUDE.md content to existing CLAUDE.md (or creates if missing)
- [ ] Command reports success with next steps
- [ ] Idempotent: re-running doesn't duplicate content

**Files**:
- Create: `d20-system/commands/init.md`

**Testing**: Run `/d20-system:init` in test directory; verify System.md created, CLAUDE.md updated

---

## Skills

### TASK-005: Create d20-players Skill with Template

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create character creation and advancement skill with references and player template.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "create a character", "roll for stats", "assign ability scores", "level up"
- [ ] Markdown body uses imperative form (per plugin-dev guidelines)
- [ ] Specifies player.md format (ability scores, proficiencies, HP, AC, equipment)
- [ ] References corvran dice-roller for stat rolling
- [ ] `references/character-creation.md` contains detailed SRD rules
- [ ] `references/player-template.md` with inline comments (REQ-F-25)
- [ ] `references/player-example.md` (Level 3 Fighter)
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-players/SKILL.md`
- Create: `d20-system/skills/d20-players/references/character-creation.md`
- Create: `d20-system/skills/d20-players/references/player-template.md`
- Create: `d20-system/skills/d20-players/references/player-example.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-006: Create d20-monsters Skill with Template

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create NPC/enemy creation skill with stat block references and NPC template.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "create an NPC", "create a monster", "stat block", "enemy stats"
- [ ] Specifies SRD 5.2 stat block format (size/type/alignment, AC, HP, abilities, actions)
- [ ] Covers CR/XP table, proficiency bonus by CR
- [ ] References corvran dice-roller for HP/damage
- [ ] `references/stat-blocks.md` contains detailed format and examples
- [ ] `references/npc-template.md` with inline comments (REQ-F-26)
- [ ] `references/npc-example.md` (Goblin stat block)
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-monsters/SKILL.md`
- Create: `d20-system/skills/d20-monsters/references/stat-blocks.md`
- Create: `d20-system/skills/d20-monsters/references/npc-template.md`
- Create: `d20-system/skills/d20-monsters/references/npc-example.md`

**Testing**: Run `plugin-dev:skill-reviewer` on skill

---

### TASK-007: Create d20-combat Skill with Template

**Priority**: High | **Complexity**: M | **Dependencies**: TASK-002

**Description**: Create combat flow guidance skill with conditions reference and encounter template.

**Acceptance Criteria**:
- [ ] SKILL.md has YAML frontmatter with third-person description
- [ ] Trigger phrases: "start combat", "roll initiative", "attack roll", "combat encounter"
- [ ] Covers initiative (d20 + DEX), turn structure, attack rolls, damage
- [ ] Lists action types (action, bonus action, movement, reaction)
- [ ] References corvran dice-roller for initiative and attacks
- [ ] `references/conditions.md` contains all 14 SRD conditions
- [ ] `references/encounter-template.md` with inline comments (REQ-F-27)
- [ ] `references/encounter-example.md` (Ambush scenario)
- [ ] SKILL.md ≤2,000 words

**Files**:
- Create: `d20-system/skills/d20-combat/SKILL.md`
- Create: `d20-system/skills/d20-combat/references/conditions.md`
- Create: `d20-system/skills/d20-combat/references/encounter-template.md`
- Create: `d20-system/skills/d20-combat/references/encounter-example.md`

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
- [ ] Trigger phrases per REQ-F-24: "look up rule", "what does SRD say", "official rules for", "exact wording"
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

**Priority**: Critical | **Complexity**: M | **Dependencies**: TASK-004 through TASK-009

**Description**: Validate all skills/commands, run acceptance tests from spec, verify licensing compliance.

**Acceptance Criteria**:
- [ ] All 5 skills pass `plugin-dev:skill-reviewer`
- [ ] Plugin installs via marketplace pattern
- [ ] Acceptance Test 2: Init command creates System.md, merges CLAUDE.md
- [ ] Acceptance Test 5: Character creation produces valid player.md
- [ ] Acceptance Test 6: NPC stat block matches SRD format
- [ ] Acceptance Test 7: D20 test resolution correct (d20 + modifier vs DC)
- [ ] Acceptance Test 8: Initiative uses d20 + DEX
- [ ] Acceptance Test 9: Dice rolls invoke dice-roller skill
- [ ] Acceptance Test 10: SRD lookup returns correct rule text
- [ ] CC-BY-4.0 attribution present in System.md, CLAUDE.md, 00_Legal.md

**Files**: None (validation only)

**Testing**: Manual walkthrough of all 11 acceptance tests from spec

---

### TASK-011: Create Pull Request

**Priority**: Critical | **Complexity**: S | **Dependencies**: TASK-010

**Description**: Create PR for d20-system plugin with summary of all implemented features.

**Acceptance Criteria**:
- [ ] All changes committed to feature branch
- [ ] PR title follows conventional commits: `feat(plugin): add d20-system plugin for SRD 5.2 mechanics`
- [ ] PR description includes feature summary, testing notes, and checklist
- [ ] PR links to GitHub issue #105

**Files**: None (PR only)

**Testing**: PR created and ready for review

---

## Dependency Graph

```
TASK-001 (Plugin Structure)
    │
    ├──> TASK-002 (System.md) ──┬──> TASK-005 (d20-players + template)
    │         │                 ├──> TASK-006 (d20-monsters + template)
    │         │                 ├──> TASK-007 (d20-combat + template)
    │         │                 └──> TASK-008 (d20-magic)
    │         │
    │         └──> TASK-003 (CLAUDE.md + d20-CLAUDE.md)
    │                   │
    │                   └──> TASK-004 (init command) ─────────────────┐
    │                                                                 │
    └──> TASK-009 (d20-rules + SRD) ──────────────────────────────────┤
                                                                      │
                                                                      v
                                                              TASK-010 (Validation)
                                                                      │
                                                                      v
                                                              TASK-011 (PR)
```

## Implementation Order

**Phase 1** (Foundation): TASK-001
- Creates directory structure for all subsequent work

**Phase 2** (Core Content): TASK-002, TASK-003, TASK-009
- TASK-002, TASK-003, TASK-009 can run in parallel after TASK-001

**Phase 3** (Skills + Init): TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
- TASK-004 depends on TASK-002 and TASK-003
- Skills (TASK-005-008) depend on TASK-002, can run in parallel

**Phase 4** (Validation + PR): TASK-010, TASK-011
- TASK-010 depends on all content tasks
- TASK-011 depends on TASK-010

## Notes

- **Parallelization**: After TASK-001, most Phase 2-3 tasks can run concurrently
- **Critical path**: TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-010 → TASK-011
- **Largest tasks**: TASK-002 (System.md authoring) and TASK-009 (SRD file copy ~1.2MB)
- **Templates now in skills**: player-template in d20-players, npc-template in d20-monsters, encounter-template in d20-combat
- **Risk area**: TASK-009 file copy; verify sizes stay under 2MB limit
