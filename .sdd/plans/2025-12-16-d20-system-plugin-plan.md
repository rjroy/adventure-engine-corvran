---
specification: [.sdd/specs/2025-12-16-d20-system-plugin.md](./../specs/2025-12-16-d20-system-plugin.md)
status: Approved
version: 1.1.0
created: 2025-12-16
last_updated: 2025-12-16
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# d20-System Plugin - Technical Plan

## Overview

This plan defines how to build a Claude Code plugin that provides SRD 5.2-compatible d20 RPG mechanics. The plugin uses **skills and commands** (no MCP servers, hooks, or agents) and follows the established corvran plugin patterns.

The key architectural strategy is **progressive disclosure**: lean SKILL.md files (~1,500-2,000 words each) with detailed SRD content and templates in `references/` subdirectories. The `/d20-system:init` command handles one-time setup by copying `System.md` to the adventure directory and merging d20-specific CLAUDE.md content into the project. The `d20-rules` skill serves as the authoritative SRD lookup mechanism, containing the full SRD 5.2 markdown (~1.2MB) with grep patterns for large files.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Adventure Session                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ player.md   │    │characters.md│    │   System.md     │  │
│  │ (PC stats)  │    │ (NPC stats) │    │ (d20 rules)     │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘  │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │   GM (Claude)  │                        │
│                    └───────┬────────┘                        │
│                            │ invokes skills                  │
└────────────────────────────┼────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
│ d20-system    │    │   corvran     │    │ Other       │
│ plugin        │    │   plugin      │    │ plugins     │
│               │    │               │    │             │
│ • d20-players │    │ • dice-roller │    │             │
│ • d20-monsters│    │ • enter-world │    │             │
│ • d20-combat  │    │               │    │             │
│ • d20-magic   │    │               │    │             │
│ • d20-rules   │    │               │    │             │
└───────────────┘    └───────────────┘    └─────────────┘
```

### Plugin Directory Structure

```
d20-system/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest (REQ-F-1)
├── CLAUDE.md                       # Plugin-level guidance (REQ-F-3)
├── d20-CLAUDE.md                   # Adventure-level content for merge (REQ-F-4)
├── System.md                       # Source for init command (REQ-F-2, F-7 to F-12)
├── commands/
│   └── init.md                     # /d20-system:init command (REQ-F-5)
└── skills/
    ├── d20-players/
    │   ├── SKILL.md                # Character creation (REQ-F-13, F-14)
    │   └── references/
    │       ├── character-creation.md
    │       ├── player-template.md  # Template (REQ-F-25)
    │       └── player-example.md   # Filled example
    ├── d20-monsters/
    │   ├── SKILL.md                # NPC/enemy creation (REQ-F-15, F-16)
    │   └── references/
    │       ├── stat-blocks.md
    │       ├── npc-template.md     # Template (REQ-F-26)
    │       └── npc-example.md      # Filled example (Goblin)
    ├── d20-combat/
    │   ├── SKILL.md                # Combat flow (REQ-F-17, F-18)
    │   └── references/
    │       ├── conditions.md
    │       ├── encounter-template.md  # Template (REQ-F-27)
    │       └── encounter-example.md   # Filled example
    ├── d20-magic/
    │   ├── SKILL.md                # Spellcasting (REQ-F-19, F-20)
    │   └── references/
    │       └── spellcasting.md
    └── d20-rules/
        ├── SKILL.md                # SRD lookups (REQ-F-21 to F-24)
        └── references/
            └── srd/                # Full SRD markdown (~1.2MB)
                ├── 00_Legal.md
                ├── 01_PlayingTheGame.md
                ├── 02_CharacterCreation.md
                ├── 03_Classes/
                │   ├── 01_Barbarian.md
                │   └── ... (12 class files)
                ├── 04_CharacterOrigins.md
                ├── 05_Feats.md
                ├── 06_Equipment.md
                ├── 07_Spells.md
                ├── 08_RulesGlossary.md
                ├── 09_GameplayToolbox.md
                ├── 10_MagicItems.md
                ├── 11_Monsters.md
                ├── 12_MonstersA-Z.md
                └── 13_Animals.md
```

## Technical Decisions

### TD-1: Separate Plugin (Not Embedded in Corvran)
**Choice**: Create `d20-system` as a standalone plugin, not embedded in corvran
**Requirements**: REQ-F-1, REQ-F-6
**Rationale**:
- Marketplace distribution requires standalone plugins
- Adventure creators may want d20 rules without corvran's enter-world functionality
- Follows the spec's vision for "community RPG system plugins" (alternative systems like Fudge/PbtA)
- Corvran remains the adventure engine; d20-system is one of many possible rule systems

### TD-2: System.md as Source for Init Command
**Choice**: Place `System.md` at plugin root as source file; `/d20-system:init` copies it to adventure directory
**Requirements**: REQ-F-2, REQ-F-7 through F-12, REQ-F-31
**Rationale**:
- GM prompt reads `./System.md` from adventure directory (line 201 of `gm-prompt.ts`)
- Plugin files at root are not exposed to adventures; init command bridges this gap
- Adventure creators can customize their copy (modify DCs, add house rules)
- Existing pattern from `backend/docs/examples/System.md` demonstrates target format

**System.md Required Content** (per REQ-F-7 through F-12):
1. **Six Abilities** (REQ-F-7): STR, DEX, CON, INT, WIS, CHA with modifier formula `(score - 10) / 2`
2. **D20 Test Resolution** (REQ-F-8): `d20 + ability modifier + proficiency vs DC/AC`
3. **Difficulty Class Table** (REQ-F-9): Very Easy (5) through Nearly Impossible (30)
4. **Proficiency Bonus Table** (REQ-F-10): +2 (levels 1-4) through +6 (levels 17-20)
5. **Advantage/Disadvantage** (REQ-F-11): Roll 2d20, take higher/lower
6. **18 Standard Skills** (REQ-F-12): Full skills table from SRD with associated abilities

**Alternatives Considered**:
- *Embedding in skill references*: Rejected because GM prompt expects `./System.md` in adventure root
- *Manual copy instructions*: Rejected; init command provides better UX

### TD-3: Two-Tier CLAUDE.md Architecture
**Choice**: Plugin-level `CLAUDE.md` + adventure-level `d20-CLAUDE.md` merged via init command
**Requirements**: REQ-F-3, REQ-F-4, REQ-F-5
**Rationale**:
- Plugin `CLAUDE.md` is read by Claude Code when plugin is installed (plugin-level guidance)
- Adventure-level guidance needs to be in project's CLAUDE.md to be read during gameplay
- Init command merges `d20-CLAUDE.md` content into project's CLAUDE.md, preserving existing content
- Separation keeps concerns clear: plugin overview vs adventure GM guidance

**CLAUDE.md (Plugin-level) Content**:
1. **Overview**: Plugin purpose and installed skills
2. **Dice Integration**: Path to corvran dice-roller, fallback instructions
3. **Licensing**: CC-BY-4.0 attribution statement (REQ-NF-6)

**d20-CLAUDE.md (Adventure-level) Content**:
1. **GM Guidance**: When/how to apply d20 mechanics narratively
2. **State File Formats**: Links to skill templates for player.md, characters.md, etc.
3. **Customization**: How to modify System.md for house rules

### TD-4: Init Command for Adventure Setup
**Choice**: `/d20-system:init` command copies System.md and merges d20-CLAUDE.md
**Requirements**: REQ-F-5, REQ-F-31
**Rationale**:
- Plugin root files are not accessible to adventures; command bridges this gap
- One-time setup is cleaner than manual file copying
- Merging into existing CLAUDE.md preserves user's existing configuration
- Pattern similar to `npm init` or `git init` - familiar to developers

**Init Command Behavior**:
1. Read `System.md` from plugin directory
2. Copy to `./System.md` in current directory (adventure root)
3. Read `d20-CLAUDE.md` from plugin directory
4. Append content to `./CLAUDE.md` (create if not exists)
5. Report success with next steps

**Alternatives Considered**:
- *Skill that outputs file content*: Rejected; skills guide, they don't write files
- *Documentation-only instructions*: Rejected; command provides better UX and fewer errors

### TD-5: Progressive Disclosure via references/ Subdirectories
**Choice**: Each skill has lean SKILL.md (1,500-2,000 words) with detailed content in `references/`
**Requirements**: REQ-NF-3, REQ-NF-4
**Rationale**:
- Plugin-dev skill-development guidelines mandate this pattern
- Reduces context window usage when skills trigger
- Detailed SRD mechanics loaded only when Claude determines they're needed
- Example: `d20-combat/SKILL.md` covers initiative and turn structure; `references/conditions.md` has all 14 condition definitions

### TD-6: Full SRD in d20-rules Skill with Grep Patterns
**Choice**: Copy full SRD markdown into `d20-rules/references/srd/` with grep pattern guidance
**Requirements**: REQ-F-21, REQ-F-22, REQ-F-23, REQ-F-24, REQ-NF-5
**Rationale**:
- Plugins must be self-contained for marketplace distribution
- Submodules add complexity for end users
- SRD is CC-BY-4.0 licensed, redistribution is explicitly permitted
- Total size ~1.2MB fits within 2MB plugin limit (REQ-NF-5)
- Source: `docs/research/dndsrd5.2_markdown/src/`

**d20-rules Trigger Phrases** (REQ-F-24):
- "look up rule", "look up the rule for"
- "what does SRD say", "what does the SRD say about"
- "official rules for", "official rule for"
- "exact wording", "exact rule text"
- "check the rules", "rules reference"

**Grep Patterns for Large Files** (REQ-F-23):
- Loading 300KB+ files into context is inefficient
- SKILL.md documents search patterns: `grep -A 50 "^## Fireball" references/srd/07_Spells.md`
- Common patterns: spell by name, monster by name, condition by name

**Alternatives Considered**:
- *Symlink/submodule*: Rejected for marketplace self-containment requirement
- *Load entire files*: Rejected due to 300KB+ file sizes; grep is more efficient

### TD-7: Third-Person Trigger Descriptions and Skill Format
**Choice**: All skill descriptions use "This skill should be used when..." format with YAML frontmatter
**Requirements**: REQ-NF-2, REQ-NF-3, REQ-F-30
**Rationale**:
- Plugin-dev guidelines require third-person format
- Specific trigger phrases improve skill discovery reliability (REQ-F-30)
- YAML frontmatter with name/description enables GM prompt auto-discovery
- Markdown body uses imperative/infinitive form per plugin-dev guidelines

**Example Skill Description**:
```yaml
---
name: d20-players
description: This skill should be used when the user asks to "create a character", "roll for stats", "assign ability scores", "calculate modifiers", or "level up". Provides SRD 5.2 character creation and advancement guidance.
---
```

### TD-8: Dice-Roller Integration via Reference
**Choice**: Skills reference corvran's dice-roller skill, not duplicate logic
**Requirements**: REQ-F-29
**Rationale**:
- Spec explicitly prohibits dice-roller duplication
- Corvran's dice-roller outputs JSON: `{"expression": "1d20+5", "rolls": [14], "modifier": 5, "total": 19}`
- Each d20-system skill includes: "For dice rolls, invoke the dice-roller skill from the corvran plugin"
- Example in SKILL.md: `bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d20+5"`

### TD-9: Templates in Skill References
**Choice**: Each template lives in its relevant skill's `references/` directory with filled example
**Requirements**: REQ-F-25 to F-28
**Rationale**:
- Templates are contextually located with the skill that uses them
- Progressive disclosure: templates loaded when skill is invoked, not globally
- Skills guide format AND have templates readily available
- Avoids separate `templates/` directory that would be inaccessible to adventures

**Template Locations**:
- `d20-players/references/player-template.md` + `player-example.md` (Level 3 Fighter)
- `d20-monsters/references/npc-template.md` + `npc-example.md` (Goblin stat block)
- `d20-combat/references/encounter-template.md` + `encounter-example.md` (Ambush scenario)

## Data Model

### player.md Format (SRD 5.2 Character Sheet)

```markdown
# [Character Name]

**Level [X] [Class]** | **[Species]** | **[Background]**

## Ability Scores

| Ability | Score | Modifier | Save |
|---------|-------|----------|------|
| STR     | 16    | +3       | +5*  |
| DEX     | 14    | +2       | +2   |
| CON     | 15    | +2       | +4*  |
| INT     | 10    | +0       | +0   |
| WIS     | 12    | +1       | +1   |
| CHA     | 8     | -1       | -1   |

*Proficient saving throws

**Proficiency Bonus**: +2

## Combat Stats
- **Armor Class**: 18 (chain mail + shield)
- **Hit Points**: 28 (3d10 + 6)
- **Speed**: 30 ft.
- **Initiative**: +2

## Proficiencies
**Skills**: Athletics*, Intimidation*, Perception, Survival
**Weapons**: Simple, Martial
**Armor**: All armor, Shields
**Tools**: None

## Equipment
- Chain mail
- Shield
- Longsword (1d8+3 slashing)
- Handaxes (2)
- Explorer's pack
- 15 gp
```

### npc.md Format (SRD 5.2 Stat Block)

```markdown
## [Monster Name]

*[Size] [Type], [Alignment]*

- **Armor Class**: [AC] ([armor type])
- **Hit Points**: [HP] ([hit dice])
- **Speed**: [speed] ft.
- **Initiative**: +[DEX mod] ([10 + DEX mod])

| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| [score] (+[mod]) | ... | ... | ... | ... | ... |

- **Saving Throws**: [ability] +[bonus], ...
- **Skills**: [skill] +[bonus], ...
- **Senses**: [senses]; Passive Perception [score]
- **Languages**: [languages]
- **CR**: [rating] (XP [value])

### Traits

***[Trait Name].*** [Description]

### Actions

***[Action Name].*** *[Attack Type]:* +[bonus] to hit, reach [X] ft., one target. *Hit:* [damage] ([dice]) [type] damage.
```

### encounter.md Format

```markdown
# [Encounter Name]

**Environment**: [Location description]
**Difficulty**: [Easy/Medium/Hard/Deadly]

## Combatants

### Party
| Character | Initiative | AC | HP | Status |
|-----------|------------|----|----|--------|
| [Name]    | --         | -- | -- | --     |

### Enemies
| Creature | Count | Initiative | AC | HP | Status |
|----------|-------|------------|----|----|--------|
| [Name]   | [X]   | --         | -- | -- | --     |

## Initiative Order
1. [Highest initiative]
2. ...

## Round Tracker
- **Round 1**: [Notes]

## Environmental Features
- [Terrain, hazards, cover, etc.]
```

## Integration Points

### Corvran Plugin (dice-roller)
- **Type**: Skill reference (not dependency)
- **Purpose**: All dice rolls delegate to corvran's dice-roller
- **Data Flow**: d20-system skill guides when to roll → GM invokes dice-roller → JSON result parsed
- **Path**: `${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh`
- **Note**: d20-system works without corvran installed (GM can roll dice manually), but recommends corvran for automation

### GM Prompt (gm-prompt.ts)
- **Type**: Implicit integration (after init command)
- **Purpose**: GM reads `./System.md` and discovers skills
- **Data Flow**:
  1. User runs `/d20-system:init` to copy System.md and merge CLAUDE.md
  2. GM reads `./System.md` (lines 201, 224)
  3. GM checks available skills (lines 208-214)
  4. GM invokes d20-system skills when trigger phrases match
- **No code changes required**: Plugin follows existing conventions; init command handles setup

### Adventure State Files
- **Type**: File format specification
- **Purpose**: Skills guide consistent markdown structure
- **Files**: `player.md`, `characters.md`, `locations.md`, `quests.md`, `world_state.md`
- **Data Flow**: Skill provides format → GM writes state → State persists across sessions

## Error Handling, Performance, Security

### Error Strategy
- **Missing dice-roller**: Skills include fallback guidance: "If dice-roller unavailable, describe rolling [expression] and ask player to provide result"
- **Invalid state files**: Templates include comments explaining required fields; GM validates on read
- **SRD lookup failure**: Grep patterns in d20-rules include "if no match found" guidance

### Performance Targets
- **Skill load time**: <100ms (markdown file read)
- **SRD grep**: <500ms for targeted search (single section lookup)
- **Context efficiency**: SKILL.md <2,000 words each; references loaded on-demand

### Security Measures
- **No code execution**: Skills and commands only; no hooks, agents, or MCP servers
- **No external calls**: All content is local markdown
- **License compliance**: CC-BY-4.0 attribution in `00_Legal.md`, plugin CLAUDE.md, and System.md

## Testing Strategy

### Unit (Skill Validation)
- **Approach**: Run `plugin-dev:skill-reviewer` on each skill
- **Coverage**: All 5 skills must pass frontmatter, description, progressive disclosure checks
- **Automation**: Manual validation during implementation; can be scripted post-implementation

### SRD Accuracy Verification (REQ-NF-1)
- **Approach**: Cross-reference System.md and skill references against source SRD files
- **Checklist**:
  - [ ] Modifier formula matches SRD: `(score - 10) / 2`
  - [ ] DC table values match SRD (5, 10, 15, 20, 25, 30)
  - [ ] Proficiency bonus table matches SRD by level/CR
  - [ ] All 18 skills listed with correct ability associations
  - [ ] Stat block format matches SRD examples (Aboleth, Goblin)
- **Source**: `docs/research/dndsrd5.2_markdown/src/`

### Licensing Compliance (REQ-NF-6)
- **Approach**: Verify CC-BY-4.0 attribution in required locations
- **Checklist**:
  - [ ] `00_Legal.md` included in `references/srd/` (original attribution)
  - [ ] CLAUDE.md includes attribution statement
  - [ ] System.md includes attribution statement
- **Attribution Text**: "This work includes material from the System Reference Document 5.2.1 by Wizards of the Coast LLC, licensed under CC-BY-4.0"

### Integration (End-to-End)
- **Key Scenarios**:
  1. Init command: Run `/d20-system:init` → verify System.md copied, CLAUDE.md merged
  2. Character creation: "Create a level 1 fighter" → verify `player.md` matches template
  3. NPC creation: "Create a goblin" → verify stat block format
  4. Combat flow: "Roll initiative" → verify dice-roller integration
  5. SRD lookup: "What does the SRD say about grappling?" → verify grep returns relevant section
  6. Backwards compatibility: Adventure without d20-system → verify GM runs narrative-only

### Acceptance Criteria Validation
- **Method**: Manual walkthrough of all 11 acceptance tests from spec
- **Timing**: After all skills, commands, and templates implemented

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SRD content exceeds 2MB limit | Low | High | Verify file sizes before copying; exclude non-essential files if needed |
| Skill trigger phrases too generic | Medium | Medium | Test with real prompts; iterate on descriptions based on false positive/negative rate |
| Corvran dice-roller path changes | Low | Medium | Document path in CLAUDE.md; provide manual fallback |
| SRD updates (new version) | Low | Low | Document SRD version (5.2.1) in CLAUDE.md; create update process |

## Dependencies

### Technical
- **SRD 5.2 Markdown**: `docs/research/dndsrd5.2_markdown/src/` (already in repo as submodule)
- **Claude Code Plugin System**: Standard skill/plugin format
- **Corvran Plugin** (optional): For dice-roller integration

### Team
- **None**: Self-contained implementation, no external approvals needed

## Open Questions

- [x] Where to place plugin? **Answer**: Separate directory at repo root (`d20-system/`), parallel to `corvran/`
- [x] How to handle SRD submodule? **Answer**: Copy files into plugin (TD-4), not symlink

---

**Next Phase**: Once approved, use `/spiral-grove:task-breakdown` to create implementation tasks.
