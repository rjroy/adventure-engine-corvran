---
name: dh-adversaries
description: This skill should be used when creating Daggerheart adversaries, building stat blocks, designing encounters, or determining enemy difficulty. Invoke when the GM needs to create enemies, generate adversary stat blocks, calculate Battle Points for encounter balance, or reference adversary types (Bruiser, Horde, Leader, Minion, Ranged, Skulk, Social, Solo, Standard, Support).
---

# Daggerheart Adversary Creation Skill

Create adversaries and build balanced encounters using the Daggerheart SRD format. This skill provides stat block templates, encounter building formulas, and reference for all 10 adversary types.

## When to Use This Skill

Invoke this skill when:
- Creating a new adversary or enemy for an encounter
- Converting a narrative concept into a Daggerheart stat block
- Building an encounter and calculating Battle Points
- Looking up adversary type characteristics
- Designing Fear Features for adversaries
- Balancing encounters for a specific party size

## Adversary Stat Block Overview

Every Daggerheart adversary stat block includes:

1. **Header**: Name, Tier (1-4), Type, Description
2. **Motives & Tactics**: Behavioral guidance for the GM
3. **Combat Stats**: Difficulty, Thresholds (Major/Severe), HP, Stress
4. **Attack Line**: Attack modifier, attack name, range, damage
5. **Experience**: Optional Experience bonus for relevant checks
6. **Features**: Standard abilities (Action, Reaction, or Passive)
7. **Fear Features**: Abilities that cost Fear tokens to activate

Load the full format specification from `references/stat-block-template.md` when detailed guidance is needed.

## Adversary Types

Daggerheart uses 10 adversary types that define combat role and behavior:

### Bruiser
Heavy-hitting melee combatants with high damage output and significant HP. They close distance and deal Major/Severe threshold damage consistently.
- **Role**: Front-line damage dealer
- **Signature**: High damage, high HP, lower Evasion
- **Tactics**: Move toward threats, absorb attention, deal punishment

### Horde
Swarm-type adversaries that gain strength in numbers. Individual members are weak, but together they overwhelm through quantity.
- **Role**: Action economy pressure
- **Signature**: Low individual stats, group bonuses, shared HP pools
- **Tactics**: Surround targets, use Pack Tactics equivalents, flood the battlefield

### Leader
Command-focused adversaries that enhance other enemies. They buff allies, coordinate attacks, and present priority target dilemmas.
- **Role**: Force multiplier
- **Signature**: Buff abilities, Rally actions, higher Presence
- **Tactics**: Stay protected, issue commands, enhance minions

### Minion
Expendable low-threat adversaries that die quickly but add action economy. Used to pad encounters and create tactical choices.
- **Role**: Cannon fodder, attention splitters
- **Signature**: Very low HP (often 1-3), simple attacks, no Stress
- **Tactics**: Swarm, flank, force players to spend actions

### Ranged
Distance attackers who stay out of melee and punish exposed targets. They force movement and positioning decisions.
- **Role**: Ranged damage, zone control
- **Signature**: Ranged attacks, lower melee capability, positioning abilities
- **Tactics**: Maintain distance, target vulnerable PCs, retreat when approached

### Skulk
Stealth-focused adversaries who strike from hiding and avoid direct confrontation. They use ambush tactics and escape abilities.
- **Role**: Ambusher, hit-and-run
- **Signature**: Stealth bonuses, advantage from hiding, disengage abilities
- **Tactics**: Hide, strike with advantage, reposition, repeat

### Social
Non-combat focused adversaries who present challenges through dialogue, manipulation, or social pressure. Combat is their weakness.
- **Role**: Narrative challenge, social obstacle
- **Signature**: High Presence, social Features, weak combat stats
- **Tactics**: Negotiate, deceive, call for help, avoid violence

### Solo
Powerful singular adversaries designed to challenge an entire party alone. They have multiple actions and legendary-style abilities.
- **Role**: Boss encounter
- **Signature**: Multiple attacks per turn, Fear Features, high HP and thresholds
- **Tactics**: Use all available actions, trigger Fear Features, threaten multiple PCs

### Standard
Baseline adversaries that represent typical threats. They have balanced stats and straightforward abilities.
- **Role**: Default encounter building block
- **Signature**: Balanced stats, 1-2 Features, moderate HP
- **Tactics**: Fight directly, use Features appropriately, no special behavior

### Support
Adversaries that enhance allies through healing, buffs, or battlefield control. They don't deal much damage but multiply threat.
- **Role**: Force multiplier, healing
- **Signature**: Heal abilities, buff Features, area effects
- **Tactics**: Protect key allies, use support abilities, stay out of melee

## Tier Reference

Adversary Tier indicates overall power level:

| Tier | Description | Typical HP | Typical Difficulty |
|------|-------------|------------|-------------------|
| 1 | Common threats, early adventures | 3-8 | 10-14 |
| 2 | Significant threats, mid-level | 6-12 | 14-18 |
| 3 | Major threats, experienced parties | 10-18 | 18-22 |
| 4 | Legendary threats, epic encounters | 15-30+ | 22-26 |

## Creating an Adversary: Step by Step

### Step 1: Define the Concept

Determine the adversary's narrative role:
- What does it look like?
- How does it fight (which Type)?
- What makes it interesting or threatening?
- What are its motives?

### Step 2: Choose Tier and Type

Select Tier based on party level and desired threat. Select Type based on combat role.

**Tier Guidelines**:
- Tier 1: Appropriate for new parties or minor threats
- Tier 2: Standard challenges for established parties
- Tier 3: Significant threats requiring strategy
- Tier 4: Boss-level encounters, legendary foes

### Step 3: Set Combat Statistics

Use these benchmarks based on Tier:

| Tier | Difficulty | Major Threshold | Severe Threshold | HP | Stress |
|------|------------|-----------------|------------------|-----|--------|
| 1 | 10-14 | 5-8 | 10-14 | 3-8 | 2-4 |
| 2 | 14-18 | 8-12 | 14-20 | 6-12 | 4-6 |
| 3 | 18-22 | 12-16 | 20-26 | 10-18 | 6-9 |
| 4 | 22-26 | 16-22 | 26-34 | 15-30 | 9-12 |

### Step 4: Design the Attack

Every adversary needs at least one attack:
- **Attack Modifier**: +3 to +8 based on Tier
- **Attack Name**: Descriptive (Claw, Blade, Poison Spit)
- **Range**: Melee, Close, Far, or Very Far
- **Damage**: Dice expression (e.g., 1d8+3)
- **Damage Type**: Physical or Magic

### Step 5: Add Features

Add Features that reinforce the concept:

**Standard Features** (always available):
- *Action*: Takes the adversary's action for the turn
- *Reaction*: Triggered by specific events
- *Passive*: Always active

**Fear Features** (cost Fear tokens):
- More powerful than standard Features
- GM spends 1+ Fear to activate
- Create dramatic moments

### Step 6: Assign Experience (Optional)

If the adversary has relevant expertise, add an Experience line:
- Experience Name and modifier (+1 to +3)
- Used when making relevant checks

### Step 7: Validate with Battle Points

Check that the adversary fits your encounter budget using the Battle Points formula (see `references/encounter-building.md`).

## Using the Templates

### Stat Block Template

Load `references/stat-block-template.md` for a complete template with inline comments explaining each field.

### Example Stat Block

Load `references/stat-block-example.md` for a complete Tier 1 Standard adversary with detailed breakdown.

## Encounter Building

Use the Battle Points formula for balanced encounters:

**Battle Points = (3 x Number of PCs) + 2**

| Adversary Type | Battle Points Cost |
|----------------|--------------------|
| Minion | 1 |
| Standard | 2-3 |
| Leader | 4-5 |
| Solo | Equal to party BP |

Load `references/encounter-building.md` for detailed encounter building guidance.

## Fear Feature Design

Fear Features should:
- Cost 1-2 Fear tokens (rarely 3+)
- Be significantly more powerful than standard Features
- Create memorable dramatic moments
- Force tactical decisions from players

**Good Fear Features**:
- Interrupt player actions
- Deal threshold-breaking damage
- Create environmental hazards
- Summon reinforcements
- Impose conditions

**Avoid**:
- Instant-kill effects
- Removing player agency entirely
- Effects with no counterplay

## Recording Adversaries

After creating a stat block, add it to the adventure's world files for reference during play. Include:
- Full stat block
- Location where the adversary can be found
- Role in the story
- Disposition toward players

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.
