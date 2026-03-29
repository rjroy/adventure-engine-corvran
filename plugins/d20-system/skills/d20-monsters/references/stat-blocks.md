# SRD 5.2 Stat Block Format

This reference documents the standard stat block format for monsters and NPCs according to the System Reference Document 5.2.

## Stat Block Structure

A stat block contains all game rules needed to use a creature. The sections appear in this order:

### 1. Name and General Details

The creature's name appears first, followed by a line containing:
- **Size**: Tiny, Small, Medium, Large, Huge, or Gargantuan
- **Creature Type**: One of the 14 types (see below)
- **Descriptive Tags**: Optional tags in parentheses (e.g., "Goblinoid", "Shapechanger")
- **Alignment**: Suggested alignment for roleplaying

Format:
```
## Creature Name

*Size Type (Tags), Alignment*
```

### 2. Combat Highlights

Listed as bullet points:
- **Armor Class**: Total AC with armor type noted in parentheses
- **Hit Points**: Average HP with hit dice formula in parentheses
- **Speed**: Walking speed, plus special movement modes
- **Initiative**: Modifier with score in parentheses

Format:
```
- **Armor Class:** 15 (leather armor, shield)
- **Hit Points:** 22 (5d8)
- **Speed:** 30 ft., Fly 60 ft.
- **Initiative:** +2 (12)
```

### 3. Ability Scores

A table showing all six abilities with their scores, modifiers, and saving throw modifiers.

Format:
```
|STAT|SCORE|MOD|SAVE|
| --- | --- | --- | --- |
| STR | 10 | +0 | +0 |
| DEX | 15 | +2 | +4 |
| CON | 10 | +0 | +0 |
| INT | 10 | +0 | +0 |
| WIS | 8 | -1 | -1 |
| CHA | 10 | +0 | +0 |
```

Saving throws that include proficiency bonus are indicated by a higher value than the ability modifier alone.

### 4. Additional Details

Include only the entries that apply to the creature:

- **Skills**: Proficient skills with bonuses (e.g., `Stealth +6, Perception +4`)
- **Resistances**: Damage types the creature resists
- **Vulnerabilities**: Damage types that deal extra damage
- **Immunities**: Damage types and conditions the creature is immune to
- **Gear**: Equipment the creature carries that can be looted
- **Senses**: Passive Perception and special senses (darkvision, blindsight, etc.)
- **Languages**: Languages known; "None" if no language
- **CR**: Challenge Rating with XP and Proficiency Bonus in parentheses

Format:
```
- **Skills:** Stealth +6, Perception +4
- **Resistances:** Fire, Cold
- **Immunities:** Poison; Poisoned, Frightened
- **Gear:** Leather Armor, Longsword, Shield
- **Senses:** darkvision 60 ft.; Passive Perception 14
- **Languages:** Common, Goblin
- **CR:** 1/4 (XP 50; PB +2)
```

### 5. Traits

Special abilities that are always active or trigger under specific conditions. Each trait has a name in bold followed by its description.

Format:
```
### Traits

***Nimble Escape.*** The goblin can take the Disengage or Hide action as a Bonus Action on each of its turns.

***Pack Tactics.*** The creature has Advantage on attack rolls against a creature if at least one of its allies is within 5 feet of the target and isn't Incapacitated.
```

### 6. Actions

Actions the creature can take on its turn. Attack actions follow a specific notation.

**Melee Attack Format:**
```
***Longsword.*** *Melee Attack Roll:* +4, reach 5 ft. 7 (1d8 + 3) Slashing damage.
```

**Ranged Attack Format:**
```
***Shortbow.*** *Ranged Attack Roll:* +4, range 80/320 ft. 5 (1d6 + 2) Piercing damage.
```

**Saving Throw Effect Format:**
```
***Fire Breath (Recharge 5-6).*** *Dexterity Saving Throw:* DC 13, each creature in a 15-foot Cone. *Failure:* 22 (4d10) Fire damage. *Success:* Half damage.
```

**Multiattack Format:**
```
***Multiattack.*** The creature makes two attacks, using Longsword or Shortbow in any combination.
```

### 7. Bonus Actions

Actions that can be taken as a Bonus Action.

Format:
```
### Bonus Actions

***Nimble Escape.*** The goblin takes the Disengage or Hide action.
```

### 8. Reactions

Actions triggered by specific events, with the trigger condition noted.

Format:
```
### Reactions

***Parry.*** *Trigger:* A creature the knight can see hits it with a melee attack. *Response:* The knight adds 2 to its AC against that attack.
```

### 9. Legendary Actions

For powerful creatures. Specify the number of uses per round.

Format:
```
### Legendary Actions

The dragon can take 3 Legendary Actions, choosing from the options below. Only one Legendary Action can be used at a time and only at the end of another creature's turn. Expended uses are regained at the start of each of the dragon's turns.

***Detect.*** The dragon makes a Wisdom (Perception) check.

***Tail Attack (Costs 2 Actions).*** The dragon makes one tail attack.
```

---

## Creature Types

| Type | Description |
|------|-------------|
| Aberration | Utterly alien beings (aboleths, cloakers) |
| Beast | Natural non-Humanoid creatures (wolves, horses) |
| Celestial | Beings tied to the Upper Planes (angels, pegasi) |
| Construct | Magically created creatures (golems, homunculi) |
| Dragon | Scaly beings of ancient origin (dragons, wyverns) |
| Elemental | Beings from the Elemental Planes (efreet, elementals) |
| Fey | Creatures tied to the Feywild (dryads, goblins) |
| Fiend | Creatures tied to the Lower Planes (demons, devils) |
| Giant | Towering humanlike beings (giants, trolls) |
| Humanoid | People defined by roles and professions (warriors, mages) |
| Monstrosity | Unnatural creatures with strange origins (mimics, owlbears) |
| Ooze | Gelatinous creatures (black puddings, slimes) |
| Plant | Sentient vegetation and fungi (treants, shriekers) |
| Undead | Spirits and reanimated dead (ghosts, zombies) |

---

## Hit Dice by Size

| Monster Size | Hit Die | Average HP per Die |
|--------------|---------|--------------------|
| Tiny         | d4      | 2.5                |
| Small        | d6      | 3.5                |
| Medium       | d8      | 4.5                |
| Large        | d10     | 5.5                |
| Huge         | d12     | 6.5                |
| Gargantuan   | d20     | 10.5               |

**HP Calculation:**
```
Average HP = (Number of Hit Dice x Average per Die) + (Number of Hit Dice x CON modifier)
```

Example: A Medium creature with 3 Hit Dice and CON 14 (+2):
- 3d8 + 6 = (3 x 4.5) + (3 x 2) = 13.5 + 6 = 19.5, rounded to 19

---

## Challenge Rating and Experience Points

| CR  | XP      | Proficiency Bonus |
|-----|---------|-------------------|
| 0   | 0 or 10 | +2 |
| 1/8 | 25      | +2 |
| 1/4 | 50      | +2 |
| 1/2 | 100     | +2 |
| 1   | 200     | +2 |
| 2   | 450     | +2 |
| 3   | 700     | +2 |
| 4   | 1,100   | +2 |
| 5   | 1,800   | +3 |
| 6   | 2,300   | +3 |
| 7   | 2,900   | +3 |
| 8   | 3,900   | +3 |
| 9   | 5,000   | +4 |
| 10  | 5,900   | +4 |
| 11  | 7,200   | +4 |
| 12  | 8,400   | +4 |
| 13  | 10,000  | +5 |
| 14  | 11,500  | +5 |
| 15  | 13,000  | +5 |
| 16  | 15,000  | +5 |
| 17  | 18,000  | +6 |
| 18  | 20,000  | +6 |
| 19  | 22,000  | +6 |
| 20  | 25,000  | +6 |
| 21  | 33,000  | +7 |
| 22  | 41,000  | +7 |
| 23  | 50,000  | +7 |
| 24  | 62,000  | +7 |
| 25  | 75,000  | +8 |
| 26  | 90,000  | +8 |
| 27  | 105,000 | +8 |
| 28  | 120,000 | +8 |
| 29  | 135,000 | +9 |
| 30  | 155,000 | +9 |

---

## Attack Notation Reference

### Attack Roll Bonus Calculation

```
Attack Bonus = Ability Modifier + Proficiency Bonus
```

- **Melee attacks**: Usually use Strength modifier
- **Ranged attacks**: Usually use Dexterity modifier
- **Finesse weapons**: Attacker chooses Strength or Dexterity
- **Spell attacks**: Use spellcasting ability modifier

### Damage Notation

Damage is shown as: **Average (dice + modifier) Damage Type**

Example: `7 (1d8 + 3) Slashing damage`
- 7 is the average damage
- 1d8 + 3 is the roll formula
- Slashing is the damage type

### Reach and Range

- **Reach**: Melee attack distance (default 5 ft., 10 ft. for reach weapons)
- **Range**: Ranged attack distance shown as normal/long range (e.g., 80/320 ft.)

---

## Limited Usage Notation

- **X/Day**: Can be used X times before requiring a Long Rest
- **Recharge X-Y**: Roll 1d6 at start of turn; on X-Y, ability recharges
- **Recharge after a Short or Long Rest**: One use, then requires rest

---

## License

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC. The SRD 5.2.1 is licensed under CC-BY-4.0.
