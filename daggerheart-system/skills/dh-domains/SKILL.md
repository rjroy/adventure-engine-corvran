---
name: dh-domains
description: This skill should be used when handling domain cards and magical abilities in Daggerheart, including looking up domain card effects, understanding Recall costs, making Spellcast Rolls, selecting domain cards during character creation or advancement, or when players want to use domain-based abilities. Covers all 9 SRD domains (Arcana, Blade, Bone, Codex, Grace, Midnight, Sage, Splendor, Valor) and their associated cards.
version: 1.0.0
---

# Domain Cards Skill

Provides guidance for handling domain cards and magical abilities in Daggerheart adventures. Domain cards represent a character's magical or specialized abilities, organized into 9 thematic domains.

## The Nine Domains

Each domain represents a thematic school of power. Characters gain access to domains through their class, typically having access to 2 domains.

| Domain | Focus | Classes with Access |
|--------|-------|---------------------|
| **Arcana** | Innate magic, elements, raw power | Druid, Sorcerer |
| **Blade** | Weapon mastery, martial prowess | Guardian, Warrior |
| **Bone** | Tactics, body control, combat awareness | Ranger, Warrior |
| **Codex** | Magical study, books of power | Bard, Wizard |
| **Grace** | Charisma, charm, language mastery | Bard, Rogue |
| **Midnight** | Shadows, secrecy, stealth | Rogue, Sorcerer |
| **Sage** | Nature, beasts, natural world | Druid, Ranger |
| **Splendor** | Life, healing, light | Seraph, Wizard |
| **Valor** | Protection, shields, defensive power | Guardian, Seraph |

For detailed domain descriptions and class associations, see `references/domain-overview.md`.

## Domain Card Format

Every domain card follows this structure:

```
# [CARD NAME]

> **Level [1-10] [Domain] Spell**
> **Recall Cost:** [0-3]

[Effect description, possibly including Spellcast Rolls, damage, conditions, etc.]
```

### Card Fields

| Field | Description |
|-------|-------------|
| **Name** | The card's title (e.g., "Rune Ward", "Chain Lightning") |
| **Level** | 1-10, determines when the card becomes available |
| **Domain** | Which of the 9 domains the card belongs to |
| **Recall Cost** | Stress spent to recall the card after use (0-3) |
| **Effect** | What the card does when activated |

### Example Card

```
# CHAIN LIGHTNING

> **Level 5 Arcana Spell**
> **Recall Cost:** 1

Mark 2 Stress to make a Spellcast Roll, unleashing lightning on all
targets within Close range. Targets you succeed against must make a
reaction roll with a Difficulty equal to the result of your Spellcast
Roll. Targets who fail take 2d8+4 magic damage. Additional adversaries
not already targeted and within Close range of previous targets who
took damage must also make the reaction roll...
```

## Spellcast Rolls

Many domain cards require a Spellcast Roll. This is a standard Duality Dice action roll.

### Making a Spellcast Roll

```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "DdD+[trait]"
```

**Spellcasting Trait**: Usually Presence or Knowledge, depending on class:

| Class | Primary Spellcasting Trait |
|-------|---------------------------|
| Bard | Presence |
| Druid | Instinct |
| Seraph | Presence |
| Sorcerer | Presence |
| Wizard | Knowledge |

### Spellcast Roll Targets

Some cards specify a target number in parentheses:

> "Make a Spellcast Roll (13)..."

The number in parentheses is the Difficulty. Compare your roll total to this number.

### Spellcast Outcomes

Spellcast Rolls follow standard action roll outcomes:

| Outcome | Condition | Effect |
|---------|-----------|--------|
| Critical Success | Both dice match | Automatic success, enhanced effect |
| Success with Hope | Total >= Difficulty, hope die higher | Success, player gains Hope |
| Success with Fear | Total >= Difficulty, fear die higher | Success, GM gains Fear |
| Failure with Hope | Total < Difficulty, hope die higher | Failure, player gains Hope |
| Failure with Fear | Total < Difficulty, fear die higher | Failure, GM gains Fear |

Some cards have different effects on success vs. failure (like Healing Hands).

## Recall and Card Management

### Using a Domain Card

When a character uses a domain card:

1. **Check Recall Status**: Is the card available (not expended)?
2. **Pay Any Activation Cost**: Some cards require marking Stress to use
3. **Make Spellcast Roll** (if required): Roll DdD + trait vs. Difficulty
4. **Resolve Effect**: Apply the card's outcome
5. **Mark Expended** (if Recall Cost > 0): Card is unavailable until recalled

### Recalling Expended Cards

During a rest, characters can recall expended domain cards:

- **Short Rest**: Recall one card by paying its Recall Cost in Stress
- **Long Rest**: All expended cards return automatically (no Stress cost)

**Example**: After using Chain Lightning (Recall Cost 1), the card is expended. During a short rest, mark 1 Stress to recall it and make it available again.

### Cards with Recall Cost 0

Cards with Recall Cost 0 are **always available** after use. They don't need to be recalled - they're ready to use again on the character's next action.

## Card Selection During Creation

At character creation and when leveling up, players select domain cards from their available domains.

### Level 1 Selection

Each domain offers **3 options** at Level 1. The character selects cards based on their class's domain access.

### Higher Level Selection

Levels 2-10 typically offer **2 options** per domain per level. Characters select from domains they have access to.

### Card Limits

Characters have a limited number of domain cards they can prepare. Check class features for the exact limit (typically 3-5 at Level 1, increasing with level).

## Looking Up Domain Cards

### Full Card Content

Domain card details are in the Daggerheart SRD. Use the dh-rules skill to search:

```bash
# Find a specific card
grep -ri "CARD_NAME" "${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/abilities/"

# List all cards in a domain
cat "${CLAUDE_PLUGIN_ROOT}/skills/dh-rules/references/srd/domains/[Domain].md"
```

### Domain Overview

For quick reference on all 9 domains and their thematic focus, see:
- `references/domain-overview.md`

### Full Domain Content

For complete domain card listings with all options by level, reference the SRD:
- `dh-rules/references/srd/domains/` - Domain descriptions and card tables
- `dh-rules/references/srd/abilities/` - Individual card details

## Quick Reference

### Spellcast Roll Formula
```
DdD + Spellcasting Trait vs. Difficulty
```

### Common Spellcast Difficulties
| Difficulty | Target |
|------------|--------|
| Easy | 10 |
| Moderate | 13-15 |
| Hard | 18-20 |

### Domain-Class Access
| Class | Domains |
|-------|---------|
| Bard | Codex, Grace |
| Druid | Arcana, Sage |
| Guardian | Blade, Valor |
| Ranger | Bone, Sage |
| Rogue | Grace, Midnight |
| Seraph | Splendor, Valor |
| Sorcerer | Arcana, Midnight |
| Warrior | Blade, Bone |
| Wizard | Codex, Splendor |

## References

- `references/domain-overview.md` - Summary of all 9 domains with thematic descriptions
- `../dh-rules/references/srd/domains/` - Full SRD domain content (via symlink)
- `../dh-rules/references/srd/abilities/` - Full SRD domain card content (via symlink)
