# d20-System Plugin

This plugin provides SRD 5.2-compatible d20 RPG mechanics for Adventure Engine adventures. It offers skills for character creation, combat, spellcasting, monster creation, and authoritative rule lookups, along with templates and the complete System Reference Document 5.2.1.

## Getting Started

After installing this plugin, run the init command in your adventure directory to set up d20 mechanics:

```
/d20-system:init
```

This command:
1. Copies `System.md` to your adventure directory (core rules the GM reads during play)
2. Merges d20-specific GM guidance into your project's `CLAUDE.md`

## Installed Skills

The following skills become available when this plugin is installed:

### d20-players
Character creation and advancement guidance. Invoke when users ask to create a character, roll for stats, assign ability scores, or level up. Provides the `player.md` template matching SRD 5.2 character sheet format.

### d20-monsters
NPC and enemy creation guidance. Invoke when users ask to create an enemy, stat block, or NPC. Provides the `npc-template.md` matching SRD 5.2 stat block format.

### d20-combat
Combat flow and resolution guidance. Invoke when combat starts, initiative is rolled, or attack/damage needs resolution. Provides the `encounter-template.md` for tracking combat state.

### d20-magic
Spellcasting mechanics guidance. Invoke when users cast spells, ask about spell slots, or need spell save DC calculations.

### d20-rules
Authoritative SRD 5.2 rule lookups. Invoke when users ask "what does the SRD say about...", "official rules for...", or "exact wording of...". Contains the complete SRD 5.2.1 markdown with grep patterns for efficient searching.

## Dice-Roller Integration

All dice operations in d20-system skills should use the `dice-roller` skill from the corvran plugin. Do not duplicate dice rolling logic.

### Invoking the Dice Roller

```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d20+5"
```

The dice roller outputs JSON:
```json
{
  "expression": "1d20+5",
  "rolls": [14],
  "modifier": 5,
  "total": 19
}
```

### Common d20 Dice Expressions

| Purpose | Expression | Example |
|---------|------------|---------|
| Ability check | `1d20+[modifier]` | `1d20+3` (STR check with +3 mod) |
| Attack roll | `1d20+[attack bonus]` | `1d20+5` (proficiency + STR) |
| Damage (longsword) | `1d8+[STR mod]` | `1d8+3` |
| Damage (greatsword) | `2d6+[STR mod]` | `2d6+4` |
| Initiative | `1d20+[DEX mod]` | `1d20+2` |
| Hit points (d10 class) | `1d10+[CON mod]` | `1d10+2` |

### Fallback Without Corvran

If the dice-roller skill is unavailable (corvran plugin not installed), describe the required roll and ask the player to provide the result. Example:

> "Roll 1d20+5 for your Athletics check against DC 15. What did you get?"

## Skill Reference Locations

Each skill contains detailed reference materials in its `references/` subdirectory:

| Skill | Key References |
|-------|---------------|
| d20-players | `character-creation.md`, `player-template.md` |
| d20-monsters | `stat-blocks.md`, `npc-template.md` |
| d20-combat | `conditions.md`, `encounter-template.md` |
| d20-magic | `spellcasting.md` |
| d20-rules | `srd/` (complete SRD 5.2.1 markdown) |

Load references progressively - invoke the skill first, then read specific reference files only when detailed information is needed.

## Plugin Structure

```
d20-system/
├── .claude-plugin/plugin.json
├── CLAUDE.md              # This file (plugin-level guidance)
├── d20-CLAUDE.md          # Adventure-level content (merged via init)
├── System.md              # Core rules (copied to adventure via init)
├── commands/
│   └── init.md            # /d20-system:init command
└── skills/
    ├── d20-players/
    ├── d20-monsters/
    ├── d20-combat/
    ├── d20-magic/
    └── d20-rules/
```

## License

This plugin is licensed under CC-BY-4.0.

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/resources/1781-systems-reference-document-srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License (CC-BY-4.0), available at https://creativecommons.org/licenses/by/4.0/legalcode.
