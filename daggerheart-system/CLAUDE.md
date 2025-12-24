# Daggerheart System Plugin

This plugin provides Daggerheart RPG mechanics for Adventure Engine adventures. It offers skills for campaign frames, character creation with bounded Experiences, Hope/Fear token economy, spotlight-based combat, domain cards, adversary management, and authoritative SRD rule lookups.

## Getting Started

After installing this plugin, run the init command in your adventure directory to set up Daggerheart mechanics:

```
/daggerheart-system:init
```

This command merges complete Daggerheart GM guidance (including quick reference tables for all core mechanics) into your project's `CLAUDE.md`.

## Installed Skills

The following skills become available when this plugin is installed:

### dh-players
Character creation and advancement guidance. Invoke when users ask to create a character, select a class/ancestry/community, define Experiences, or level up. Provides character sheet and state templates with bounded Experience format to prevent semantic drift.

### dh-combat
Combat flow and Hope/Fear economy. Invoke when combat starts, action rolls are made, or Hope/Fear tokens need tracking. Manages spotlight-based turn flow where GM moves trigger on Fear rolls or player failures.

### dh-adversaries
Adversary creation and encounter building. Invoke when creating enemies, stat blocks, or building encounters. Provides the `[(3 x PCs) + 2]` Battle Points formula and adversary templates matching SRD format.

### dh-domains
Domain card reference and Spellcast guidance. Invoke when players use domain abilities, need to look up card effects, or make Spellcast Rolls. Covers all 9 SRD domains: Arcana, Blade, Bone, Codex, Grace, Midnight, Sage, Splendor, Valor.

### dh-rules
Authoritative Daggerheart SRD rule lookups. Invoke when users ask "what does the SRD say about...", "official rules for...", or need exact rule wording. Contains grep patterns for efficient SRD searching.

### dh-frame
Campaign frame selection and world building. Invoke when starting a new campaign, establishing tone and themes, selecting or creating a campaign frame, or reframing an existing adventure. Frames provide pitch, themes, community/class guidance, principles, distinctions, and special mechanics for a particular story type.

## Dice-Roller Integration

All dice operations in daggerheart-system skills should use the `dice-roller` skill from the corvran plugin. Do not duplicate dice rolling logic.

### Invoking the Dice Roller

```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "DdD+3"
```

### Duality Dice (DdD) Output

Daggerheart uses Duality Dice: 2d12 representing Hope and Fear. The dice roller outputs:

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

When both dice show the same value (critical success):
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

### Common Daggerheart Dice Expressions

| Purpose | Expression | Notes |
|---------|------------|-------|
| Action roll | `DdD+[trait]` | Add relevant trait modifier |
| Action with Experience | `DdD+[trait]+[exp]` | Add Experience bonus if applicable |
| Damage (weapon) | `[N]d[X]+[mod]` | Standard dice, not Duality |
| Spellcast roll | `DdD+[trait]` | Uses Presence or Knowledge typically |

### Action Roll Outcomes

| Outcome | Condition | Effect |
|---------|-----------|--------|
| Critical Success | Both dice match | Automatic success, bonus effect |
| Success with Hope | Total >= difficulty, hope die higher | Success, player gains Hope token |
| Success with Fear | Total >= difficulty, fear die higher | Success, GM gains Fear token |
| Failure with Hope | Total < difficulty, hope die higher | Failure, player gains Hope token |
| Failure with Fear | Total < difficulty, fear die higher | Failure, GM gains Fear token |

### Fallback Without Corvran

If the dice-roller skill is unavailable (corvran plugin not installed), describe the required roll and ask the player to provide the result. Example:

> "Roll 2d12 for your action roll, adding your Agility modifier (+2). Tell me both dice values and the total."

## Skill Reference Locations

Each skill contains detailed reference materials in its `references/` subdirectory:

| Skill | Key References |
|-------|---------------|
| dh-players | `sheet-template.md`, `experience-template.md`, `state-template.md` |
| dh-adversaries | `stat-block-template.md`, `encounter-building.md` |
| dh-combat | `action-outcomes.md`, `encounter-template.md`, `conditions.md` |
| dh-domains | `domain-overview.md` |
| dh-rules | `srd/` (Daggerheart SRD via symlink), `License.md` |
| dh-frame | `frame-template.md`, `frame-structure.md`, `srd/` (SRD frames via symlink) |

Load references progressively - invoke the skill first, then read specific reference files only when detailed information is needed.

## Plugin Structure

```
daggerheart-system/
├── .claude-plugin/plugin.json
├── CLAUDE.md              # This file (plugin-level guidance)
├── dh-CLAUDE.md           # Adventure-level content (merged via init)
├── commands/
│   └── init.md            # /daggerheart-system:init command
└── skills/
    ├── dh-players/
    ├── dh-combat/
    ├── dh-adversaries/
    ├── dh-domains/
    ├── dh-rules/
    └── dh-frame/
```

## Key Differences from d20-System

| Aspect | d20-System | Daggerheart |
|--------|------------|-------------|
| Core dice | 1d20 | 2d12 (Duality Dice) |
| Turn order | Initiative | Spotlight flow |
| Resource tracking | Spell slots | Hope/Fear tokens |
| Character abilities | Proficiency-based | Trait + Experience |
| HP system | Single HP pool | HP slots + Stress |
| GM resources | None tracked | Fear tokens (max 12) |

## License

This plugin is licensed under CC-BY-4.0.

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.
