---
version: 2.3.0
status: Approved
created: 2025-12-16
last_updated: 2025-12-16
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# d20-System Plugin Specification

## Executive Summary

This specification defines a Claude Code plugin that provides SRD 5.2-compatible d20 RPG mechanics for Adventure Engine adventures. The plugin packages official SRD 5.2 rules with specialized skills that guide the GM in applying mechanics and formatting state files consistently.

The plugin enables adventure creators to install structured RPG mechanics from the marketplace, separating system rules from narrative content. It serves as a reference implementation for community RPG system plugins.

## User Story

As an **adventure creator**, I want to install the d20-system plugin, so that my adventures have official SRD 5.2 mechanics without manual setup.

As a **GM (Claude)**, I want skill guidance grounded in SRD 5.2 rules, so that I apply d20 mechanics correctly and format state files consistently.

## Stakeholders

- **Primary**: Adventure creators (install/customize), GM/Claude (use skills during play)
- **Secondary**: Corvran plugin maintainers (dice-roller integration)
- **Tertiary**: Community (reference for alternative RPG plugins)

## Success Criteria

1. Plugin installs via marketplace and GM discovers all skills
2. Character creation produces `player.md` with SRD 5.2-compliant stat format
3. NPC stat blocks in `characters.md` match SRD 5.2 structure
4. Combat resolution uses correct D20 test formula: d20 + modifier vs DC/AC
5. Existing adventures without the plugin continue unchanged

## Functional Requirements

### Plugin Structure (REQ-F-1 through REQ-F-6)

- **REQ-F-1**: Plugin MUST include `plugin.json` with name `d20-system`, version, and description
- **REQ-F-2**: Plugin MUST include `System.md` containing SRD 5.2 core rules (abilities, D20 tests, combat, conditions) as source for init command
- **REQ-F-3**: Plugin MUST include `CLAUDE.md` providing plugin-level guidance (skill overview, dice-roller integration)
- **REQ-F-4**: Plugin MUST include `d20-CLAUDE.md` containing adventure-level GM guidance to be merged into project CLAUDE.md via init command
- **REQ-F-5**: Plugin MUST include `/d20-system:init` command that copies System.md to adventure directory and merges d20-CLAUDE.md into project CLAUDE.md
- **REQ-F-6**: Plugin directory structure MUST be marketplace-compatible

### Core Rules in System.md (REQ-F-7 through REQ-F-12)

- **REQ-F-7**: System.md MUST define six abilities (STR, DEX, CON, INT, WIS, CHA) with modifier formula: `(score - 10) / 2` rounded down
- **REQ-F-8**: System.md MUST define D20 test resolution: `d20 + ability modifier + proficiency (if applicable) vs DC or AC`
- **REQ-F-9**: System.md MUST include Difficulty Class table (Very Easy 5 through Nearly Impossible 30)
- **REQ-F-10**: System.md MUST define Proficiency Bonus by level/CR table (+2 at levels 1-4 through +6 at levels 17-20)
- **REQ-F-11**: System.md MUST define advantage/disadvantage rules (roll 2d20, take higher/lower)
- **REQ-F-12**: System.md MUST include the 18 standard skills with associated abilities (from SRD 5.2 Skills table)

### Skills (REQ-F-13 through REQ-F-24)

- **REQ-F-13**: Plugin MUST include `d20-players` skill for character creation and advancement
- **REQ-F-14**: `d20-players` skill MUST specify `player.md` format with: name, level, class, ability scores (with modifiers), proficiency bonus, saving throw proficiencies, skill proficiencies, HP, AC, equipment; detailed rules in `references/character-creation.md`; template in `references/player-template.md` with example
- **REQ-F-15**: Plugin MUST include `d20-monsters` skill for NPC/enemy creation
- **REQ-F-16**: `d20-monsters` skill MUST specify SRD 5.2 stat block format: size/type/alignment, AC, HP (with hit dice), Speed, ability scores with saves, skills, senses, CR/XP, traits, actions; sample stat blocks in `references/stat-blocks.md`; template in `references/npc-template.md` with example
- **REQ-F-17**: Plugin MUST include `d20-combat` skill for combat flow guidance
- **REQ-F-18**: `d20-combat` skill MUST cover: initiative (d20 + DEX), turn structure (action/bonus action/movement/reaction), attack rolls, damage, conditions; detailed conditions list in `references/conditions.md`; template in `references/encounter-template.md` with example
- **REQ-F-19**: Plugin MUST include `d20-magic` skill for spellcasting guidance
- **REQ-F-20**: `d20-magic` skill MUST cover: spell slots by level, spell save DC formula (`8 + proficiency + spellcasting ability modifier`), concentration, spell attack rolls; spell slot tables in `references/spellcasting.md`
- **REQ-F-21**: Plugin MUST include `d20-rules` skill for authoritative SRD 5.2 rule lookups
- **REQ-F-22**: `d20-rules` skill MUST include full SRD 5.2 markdown in `references/srd/` (from `docs/research/dndsrd5.2_markdown/src/`)
- **REQ-F-23**: `d20-rules` SKILL.md MUST provide grep patterns for searching large SRD files (Spells 325KB, MonstersA-Z 333KB)
- **REQ-F-24**: `d20-rules` skill description MUST trigger on "look up rule", "what does SRD say", "official rules for", "exact wording"

### Templates (REQ-F-25 through REQ-F-28)

- **REQ-F-25**: `d20-players` skill MUST include `references/player-template.md` matching SRD 5.2 character sheet structure
- **REQ-F-26**: `d20-monsters` skill MUST include `references/npc-template.md` matching SRD 5.2 stat block format (see Aboleth example in research)
- **REQ-F-27**: `d20-combat` skill MUST include `references/encounter-template.md` for combat setup (initiative order, combatant stats, environment)
- **REQ-F-28**: All templates MUST include inline comments explaining each field and a filled example demonstrating proper format

### Integration (REQ-F-29 through REQ-F-31)

- **REQ-F-29**: Skills MUST reference `dice-roller` skill from corvran plugin for all dice operations
- **REQ-F-30**: Skills MUST be discoverable via GM prompt's skills awareness section
- **REQ-F-31**: After `/d20-system:init`, `System.md` MUST exist in adventure directory to work with GM prompt's `./System.md` read pattern

## Non-Functional Requirements

- **REQ-NF-1** (Accuracy): All mechanics MUST match SRD 5.2 rules (verified against `docs/research/dndsrd5.2_markdown/`)
- **REQ-NF-2** (Usability): Skill descriptions MUST use third-person format with specific trigger phrases (e.g., "This skill should be used when the user asks to create a character, roll for stats, or level up")
- **REQ-NF-3** (Consistency): All skills MUST follow Claude Code plugin skill format (YAML frontmatter with name/description + markdown body in imperative/infinitive form)
- **REQ-NF-4** (Progressive Disclosure): Each SKILL.md MUST be lean (1,500-2,000 words); detailed SRD mechanics MUST be placed in `references/` subdirectory
- **REQ-NF-5** (Size): Total plugin size MUST remain under 2MB (text-only; SRD reference files account for ~1.2MB)
- **REQ-NF-6** (Licensing): All SRD content MUST include CC-BY-4.0 attribution as required

## Explicit Constraints (DO NOT)

- Do NOT duplicate dice-roller functionality (reference corvran's skill)
- Do NOT include MCP servers, hooks, or agents (skills and commands only)
- Do NOT hardcode paths (use relative paths from adventure directory)
- Do NOT include full class features or spell descriptions (reference SRD, don't copy wholesale)
- Do NOT include adventure content (system rules only)

## Technical Context

- **Existing Stack**: Claude Code plugin system, markdown skills/commands, YAML frontmatter
- **Integration Points**:
  - Corvran plugin's `dice-roller` skill for dice operations
  - GM prompt's skills awareness section (lines 208-214 of `gm-prompt.ts`)
  - Adventure directory's markdown state files (`player.md`, `characters.md`)
- **Expected Plugin Structure**:
  ```
  d20-system/
  ├── .claude-plugin/plugin.json
  ├── CLAUDE.md              # Plugin-level guidance
  ├── d20-CLAUDE.md          # Adventure-level content (merged via init)
  ├── System.md              # Source for init command
  ├── commands/
  │   └── init.md            # /d20-system:init command
  └── skills/
      └── d20-players/
          ├── SKILL.md
          └── references/
              ├── character-creation.md
              ├── player-template.md
              └── player-example.md
  ```
- **Reference Materials**:
  - `docs/research/dndsrd5.2_markdown/src/01_PlayingTheGame.md` - Core mechanics
  - `docs/research/dndsrd5.2_markdown/src/11_Monsters.md` - Stat block format
  - `docs/research/dndsrd5.2_markdown/src/03_Classes/` - Class structure reference

## Acceptance Tests

1. **Installation**: Plugin installs via `claude plugin add d20-system` and appears in plugins list
2. **Init Command**: Running `/d20-system:init` in adventure directory → creates `System.md`, merges d20-CLAUDE.md content into project CLAUDE.md
3. **Skill Discovery**: When GM lists skills, `d20-players`, `d20-monsters`, `d20-combat`, `d20-magic`, `d20-rules` appear with third-person descriptions containing trigger phrases
4. **Skill Format Validation**: Each skill passes `plugin-dev:skill-reviewer` checks (frontmatter, description quality, progressive disclosure, imperative form)
5. **Character Creation**: Player requests "create a level 1 fighter" → GM uses `d20-players` skill → `player.md` contains ability scores, modifiers, HP (10 + CON mod), AC, proficiencies
6. **Stat Block Format**: GM creates goblin enemy → `characters.md` entry includes AC, HP with hit dice, ability scores with saves, actions with attack notation
7. **D20 Test Resolution**: Player attempts skill check → GM rolls `d20 + modifier` vs DC, applies advantage/disadvantage correctly
8. **Combat Initiative**: Combat starts → GM rolls initiative for all combatants using `d20 + DEX modifier`, tracks turn order
9. **Dice Integration**: Any dice roll → GM invokes `dice-roller` skill, not custom dice logic
10. **SRD Lookup**: GM asked "what does the SRD say about grappling?" → `d20-rules` skill loads → GM greps `references/srd/` for exact rule text
11. **Backwards Compatibility**: Adventure without d20-system plugin loads and runs as narrative-only

## Open Questions

- [x] Should System.md include full spell list? **No** - reference SRD, skill provides structure guidance only
- [x] Should templates include example filled-in versions alongside blank templates? **Yes** - include one example per template (player, NPC, encounter) to demonstrate proper SRD 5.2 format usage

## Out of Scope

- Full class feature descriptions (skills guide structure, not content)
- Complete spell descriptions (reference SRD source)
- Alternative RPG systems (separate plugins)
- Automated character progression (GM handles manually)
- Frontend UI components

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
