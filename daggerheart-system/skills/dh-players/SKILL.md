---
name: dh-players
description: This skill should be used when the GM needs to help players create Daggerheart characters, select a class/ancestry/community, define Experiences with bounded constraints, choose domain cards, or handle level advancement (1-10). Provides templates for character sheets, session state, and Experience definitions to prevent semantic drift during gameplay.
version: 1.0.0
---

# Character Creation and Advancement Skill

Guide players through creating and advancing Daggerheart characters following SRD rules.

## File Structure

Character files follow the corvran directory structure with Daggerheart-specific content:

```
players/
  {character-slug}/
    sheet.md   # Use sheet-template.md format (traits, HP, Stress, Hope, domain cards)
    state.md   # Use state-template.md format (current HP, Stress, Hope, conditions)
```

The `sheet.md` contains permanent character data. The `state.md` tracks mutable session data that changes frequently during play.

## Character Creation Overview

Follow these steps to create a new character:

1. **Choose a Class** - Determines primary traits, HP, Stress, Evasion, starting domain access
2. **Choose a Subclass** - Gained at level 2, provides specialized features
3. **Select an Ancestry** - Grants two ancestry features and narrative elements
4. **Select a Community** - Grants a community feature reflecting upbringing
5. **Determine Trait Modifiers** - Assign modifiers to the six traits based on class
6. **Define Experiences** - Create bounded Experiences with explicit scope
7. **Select Domain Cards** - Choose cards from accessible domains
8. **Record Equipment** - Weapons, armor, and gear

## The Six Traits

Daggerheart characters have six traits that measure their capabilities:

| Trait | Measures | Common Uses |
|-------|----------|-------------|
| Agility | Speed, reflexes, coordination | Dodging, acrobatics, quick reactions |
| Strength | Physical power, endurance | Lifting, breaking, melee damage |
| Finesse | Precision, dexterity, fine control | Picking locks, delicate work, ranged attacks |
| Instinct | Awareness, intuition, quick reactions | Sensing danger, reading situations |
| Presence | Charisma, willpower, force of personality | Persuasion, intimidation, spellcasting |
| Knowledge | Learning, memory, reasoning | Recalling lore, deduction, arcane magic |

### Trait Modifiers

Trait modifiers typically range from -1 to +3. Each class provides a starting trait spread.

**Calculating Modifiers**: Use class guidelines to assign modifiers. Higher modifiers in traits that match your class's primary abilities.

## Classes

Daggerheart features 9 classes:

| Class | Primary Traits | Role | Domains |
|-------|----------------|------|---------|
| Bard | Presence, Knowledge | Support, inspiration | Grace, Codex |
| Druid | Instinct, Agility | Nature magic, shapeshifting | Sage, Arcana |
| Guardian | Strength, Agility | Protection, defense | Valor, Blade |
| Ranger | Instinct, Finesse | Tracking, ranged combat | Bone, Sage |
| Rogue | Finesse, Agility | Stealth, precision | Midnight, Grace |
| Seraph | Presence, Strength | Divine power, healing | Splendor, Valor |
| Sorcerer | Presence, Instinct | Innate magic, elements | Arcana, Midnight |
| Warrior | Strength, Finesse | Combat, martial prowess | Blade, Bone |
| Wizard | Knowledge, Presence | Learned magic, versatility | Codex, Splendor |

Each class provides:
- Starting trait modifier spread
- Base Evasion
- HP and Stress slots
- Class features
- Domain access (2 domains)
- Starting equipment

## Subclasses

Characters choose a subclass at level 2. Each class has multiple subclass options in the SRD. Subclasses provide:
- Specialized features
- Thematic abilities
- Additional options within the class's role

## Ancestries

Ancestries represent your character's heritage. Each ancestry provides:
- Two ancestry features (choose from options)
- Physical characteristics guidance
- Narrative hooks

### SRD Ancestries

- Clank (Constructed beings)
- Daemon (Fiendish heritage)
- Drakona (Draconic lineage)
- Dwarf (Mountain folk)
- Elf (Fey-touched)
- Faerie (Small magical beings)
- Faun (Nature-connected)
- Firbolg (Giant-kin)
- Fungril (Fungal beings)
- Galapa (Turtle folk)
- Giant (Towering humanoids)
- Goblin (Small and cunning)
- Halfling (Small and lucky)
- Human (Adaptable)
- Inferis (Hell-touched)
- Katari (Cat folk)
- Orc (Strong and proud)
- Ribbet (Frog folk)
- Simiah (Ape folk)

## Communities

Communities represent where your character was raised. Each community provides:
- One community feature
- Social connections
- Cultural background

### SRD Communities

- Highborne (Nobility)
- Loreborne (Scholars)
- Orderborne (Military/Law)
- Ridgeborne (Mountain dwellers)
- Seaborne (Coastal/Sailors)
- Slyborne (Criminals/Rogues)
- Underborne (Underground)
- Wanderborne (Travelers/Nomads)
- Wildborne (Wilderness)

## Experiences

Experiences represent your character's background and training. Each Experience provides a modifier (+1, +2, or +3) when its scope applies to an action.

### Experience Structure

Use the bounded constraint format to prevent semantic drift:

```
references/experience-template.md
```

Each Experience defines:
- **Modifier**: The bonus applied (+1, +2, or +3)
- **Narrative Origin**: How the character acquired this experience
- **Applies When**: Specific situations where it applies (positive scope)
- **Does NOT Apply**: Explicit exclusions

### Critical Guidance for Experiences

**Treat Experiences as bounded permissions, not general traits.**

- Only apply an Experience when the action clearly falls within its positive scope
- When scope is unclear, default to NOT applying the bonus
- Experiences do not grant abilities; they modify action rolls within their scope

## Combat Stats

### Evasion

**Evasion = Class Base + Agility modifier**

Attackers must meet or exceed your Evasion with their attack roll to hit you.

### Hit Points (HP)

Characters have HP slots (typically 6). Damage is applied based on thresholds:
- Below Major threshold: Mark 1 HP
- Meets/exceeds Major: Mark 2 HP
- Meets/exceeds Severe: Mark 3 HP

**Damage Thresholds**:
- Major = Level + Armor Major Base
- Severe = Level + Armor Severe Base

When all HP slots are marked, the character is dying.

### Stress

Characters have Stress slots (typically 6). Stress accumulates from:
- Narrative consequences
- Failed Fear rolls
- Certain ability effects

**At Maximum Stress**: Gain the Vulnerable condition.

### Armor

Armor provides:
- **Armor Score**: Reduces incoming damage
- **Armor Slots**: Can mark slots instead of HP (1 slot = 1 HP regardless of threshold)
- **Threshold Bonuses**: Adds to Major/Severe thresholds

## Hope

Characters can hold up to 6 Hope tokens.

**Gaining Hope**: When your hope die is higher on an action roll

**Spending Hope**: Reroll a die, boost damage, activate certain class features

Hope tokens persist between sessions until spent.

## Domain Cards

Characters choose domain cards from their class's accessible domains.

### Domain Card Selection

At character creation:
1. Identify your class's two domains
2. Select starting domain cards (number per class)
3. Record each card's name, domain, level, and recall cost

Domain cards include:
- **Name**: The card's name
- **Domain**: Which domain it belongs to
- **Level**: Card's power level (1-5)
- **Recall Cost**: Resources needed to recall after use

## Recording the Character

Write character data to `players/{character-slug}/sheet.md` using the Daggerheart template:

```
references/sheet-template.md
```

For a completed example, see:
```
references/sheet-example.md
```

### Daggerheart Sheet Sections

The sheet.md file must include:

1. **Character Identity** - Name, class, subclass, level, ancestry, community
2. **Traits** - All six traits with modifiers
3. **Combat Stats** - Evasion, HP slots, Stress slots, Armor Score, Damage Thresholds
4. **Hope** - Current Hope tokens (max 6)
5. **Experiences** - Using bounded constraint format
6. **Domain Cards** - Cards from accessible domains
7. **Equipment** - Active weapon and armor
8. **Features** - Class, subclass, ancestry, and community features

## Level Advancement

Characters advance from level 1 to level 10.

### Level Advancement Table

| Level | Features |
|-------|----------|
| 1 | Starting class features, ancestry features, community feature |
| 2 | Subclass selection, subclass feature |
| 3 | Class feature |
| 4 | Trait improvement (+1 to any trait, max +3) |
| 5 | Class feature |
| 6 | Subclass feature |
| 7 | Class feature |
| 8 | Trait improvement (+1 to any trait, max +3) |
| 9 | Class feature |
| 10 | Subclass capstone feature |

### Level Up Steps

1. **Increase Level** - Update level in character identity
2. **Update Thresholds** - Damage thresholds increase with level
3. **Gain Features** - Add class/subclass features for the new level
4. **Trait Improvement** (Levels 4, 8) - Increase one trait modifier by +1 (max +3)
5. **Additional Domain Cards** - Gain access to higher-level cards
6. **Update Proficiency** - Some features scale with level

### Threshold Scaling

As level increases, damage thresholds increase:
- Major = Level + Armor Major Base
- Severe = Level + Armor Severe Base

This makes characters more durable as they advance.

## Multiclassing

Daggerheart supports multiclassing, allowing characters to gain features from a second class.

### Multiclassing Requirements

- Character must be at least level 2
- Must meet the new class's trait prerequisites
- Gain limited features from the new class

### What Multiclassing Provides

- Access to the new class's starting features
- Access to the new class's domains for domain cards
- Subclass access at appropriate multiclass levels

### What Multiclassing Does NOT Provide

- Full HP/Stress slot progression
- All starting equipment
- Duplicate features

## Rolling During Character Creation

Use the dice-roller skill for any randomization:

**Duality Dice for trait-related rolls**:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "DdD+2"
```

**Standard dice for other purposes**:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d6"
```

## Fallback Without Dice Roller

If the corvran dice-roller is unavailable, describe the required roll and ask the player for the result:

> "Roll 2d12 for your Duality Dice and add your Agility modifier (+2). Tell me both die values and the total."

## References

Detailed templates in this skill's `references/` directory:

- `sheet-template.md` - Blank character sheet template
- `sheet-example.md` - Completed Level 1 Guardian example
- `state-template.md` - Mutable session state template
- `experience-template.md` - Bounded Experience constraint template
