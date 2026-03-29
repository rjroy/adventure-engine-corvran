# d20-Like RPG System

<!--
  ADVENTURE CREATOR NOTES:

  This is a reference implementation of a d20-style RPG system for Adventure Engine.
  You can copy this file to your adventure directory as System.md or split it into
  multiple files in a System/ directory.

  CUSTOMIZATION TIPS:
  - Modify attribute ranges to match your setting (heroic vs. gritty)
  - Add or remove skills based on your adventure's focus
  - Adjust difficulty classes (DCs) to change challenge level
  - Create custom NPC templates for your specific encounters
  - Change combat rules (actions, initiative) to match desired pace
  - Add custom damage types, conditions, or mechanics as needed

  REQUIRED SECTION: The "Dice" section is mandatory. All other sections are optional.
  The GM will interpret these rules narratively, so write clearly and provide examples.
-->

## Dice

This system uses the d20 system with standard polyhedral dice:
- **d4**: Minor damage, small effects
- **d6**: Standard rolls, basic damage
- **d8**: Medium damage
- **d10**: Used for percentile rolls (with d100)
- **d12**: Heavy damage
- **d20**: All skill checks, attack rolls, and saving throws
- **d100**: Percentile rolls for rare or special events

All dice rolls are made using the appropriate die type and may include modifiers based on character attributes and skills.

## Resolution Mechanics

The core mechanic for resolving uncertain actions is:

**Roll 1d20 + applicable modifier vs. Difficulty Class (DC)**

- **Natural 20**: Critical success (automatic success with additional beneficial effect)
- **Roll ≥ DC**: Success
- **Roll < DC**: Failure
- **Natural 1**: Critical failure (automatic failure with complication)

### Difficulty Classes

Use these standard DCs to determine task difficulty:

| Difficulty | DC | Example |
|------------|----|---------|
| Very Easy  | 5  | Noticing something obvious |
| Easy       | 10 | Climbing a rope with knots |
| Medium     | 15 | Picking a simple lock |
| Hard       | 20 | Tracking through heavy rain |
| Very Hard  | 25 | Disarming a master craftsman's trap |
| Nearly Impossible | 30 | Leaping across a vast chasm |

### Ability Checks

When a player attempts an action, determine the relevant attribute, add the modifier, and roll:

**1d20 + attribute modifier + skill bonus (if applicable) vs. DC**

Modifiers are calculated as: **(Attribute Score - 10) ÷ 2** (rounded down)

Examples:
- STR 16 = +3 modifier
- DEX 14 = +2 modifier
- INT 8 = -1 modifier

## Attributes

Characters have six core attributes that define their capabilities:

### Strength (STR)
Physical power, melee combat ability, carrying capacity.
- **Used for**: Melee attacks, breaking objects, climbing, jumping, carrying heavy loads

### Dexterity (DEX)
Agility, reflexes, balance, hand-eye coordination.
- **Used for**: Ranged attacks, dodging, stealth, acrobatics, initiative in combat

### Constitution (CON)
Endurance, health, stamina, resistance to illness.
- **Used for**: Hit point calculation, resisting poison, enduring harsh conditions

### Intelligence (INT)
Reasoning, memory, analytical thinking, knowledge.
- **Used for**: Investigation, arcane knowledge, solving puzzles, understanding languages

### Wisdom (WIS)
Perception, intuition, awareness, common sense.
- **Used for**: Perception checks, insight into motives, survival skills, resisting mental effects

### Charisma (CHA)
Force of personality, persuasiveness, leadership, presence.
- **Used for**: Persuasion, deception, intimidation, performance, negotiation

### Starting Attribute Values

During character creation, attributes are assigned values between **8 and 18**:
- **8-9**: Below average (-1 modifier)
- **10-11**: Average (+0 modifier)
- **12-13**: Above average (+1 modifier)
- **14-15**: Exceptional (+2 modifier)
- **16-17**: Extraordinary (+3 modifier)
- **18**: Peak human (+4 modifier)

**Character Creation Method**: Players may allocate the following values to their six attributes in any order: 15, 14, 13, 12, 10, 8

Alternatively, the GM may allow rolling 4d6 and dropping the lowest die for each attribute.

## Skills

Skills represent trained abilities linked to attributes. When making a skill check, roll:

**1d20 + attribute modifier + skill bonus vs. DC**

### Skill List

**Strength-Based:**
- **Athletics** (STR): Climbing, jumping, swimming, running, pushing, pulling

**Dexterity-Based:**
- **Acrobatics** (DEX): Balance, tumbling, diving, rolling, contortions
- **Sleight of Hand** (DEX): Pickpocketing, concealing objects, lockpicking, disarming traps
- **Stealth** (DEX): Moving silently, hiding, ambushing, shadowing targets

**Intelligence-Based:**
- **Arcana** (INT): Knowledge of magic, spells, magical creatures, ancient lore
- **History** (INT): Historical events, legends, ancient civilizations, heraldry
- **Investigation** (INT): Finding clues, deducing conclusions, researching, analyzing
- **Nature** (INT): Knowledge of animals, plants, weather, terrain, natural phenomena

**Wisdom-Based:**
- **Animal Handling** (WIS): Calming animals, riding mounts, training beasts
- **Insight** (WIS): Detecting lies, understanding motives, reading body language
- **Medicine** (WIS): Treating wounds, diagnosing illness, stabilizing the dying
- **Perception** (WIS): Noticing details, hearing faint sounds, detecting ambushes, finding hidden objects
- **Survival** (WIS): Tracking, foraging, navigating wilderness, predicting weather

**Charisma-Based:**
- **Deception** (CHA): Lying convincingly, disguising intentions, creating distractions
- **Intimidation** (CHA): Frightening, coercing, threatening through physical or social dominance
- **Performance** (CHA): Entertaining, acting, playing music, storytelling
- **Persuasion** (CHA): Honest and good-faith negotiation, diplomacy, bargaining

### Skill Proficiency

During character creation, players select **4 skills** to be proficient in. Proficiency grants a **+2 bonus** to skill checks.

Skill bonuses may increase with character advancement (gaining experience and levels).

## Combat

Combat is resolved in structured turns using an initiative system.

### Initiative

When combat begins, all combatants roll for initiative:

**1d20 + DEX modifier**

Combatants act in descending order of initiative (highest to lowest). Ties are resolved by comparing DEX scores (higher goes first).

### Turn Structure

On each combatant's turn, they may take:
- **1 Action**: Attack, cast a spell, dash, disengage, dodge, help, hide, ready an action, use an object
- **1 Bonus Action** (if available): Certain abilities grant bonus actions
- **Movement**: Move up to their speed (typically 30 feet for humans)
- **Free Actions**: Brief communication, dropping an item, drawing/sheathing a weapon

### Attack Rolls

To attack a target, roll:

**1d20 + attack modifier vs. target's Armor Class (AC)**

- **Melee attacks**: 1d20 + STR modifier + weapon proficiency (if any)
- **Ranged attacks**: 1d20 + DEX modifier + weapon proficiency (if any)

If the attack roll equals or exceeds the target's AC, the attack hits.

### Damage

On a successful hit, roll the weapon's damage die and add the relevant modifier:

- **Melee weapons**: Weapon damage + STR modifier
- **Ranged weapons**: Weapon damage + DEX modifier

Example damage by weapon type:
- Dagger: 1d4
- Shortsword: 1d6
- Longsword: 1d8
- Greatsword: 2d6
- Shortbow: 1d6
- Longbow: 1d8

### Armor Class (AC)

AC represents how difficult a creature is to hit:
- **Unarmored**: 10 + DEX modifier
- **Light armor**: 11 + DEX modifier
- **Medium armor**: 13 + DEX modifier (max +2)
- **Heavy armor**: 16 (no DEX modifier)
- **Shield**: +2 to AC

### Critical Hits

On a **natural 20** attack roll, the attack is a critical hit. Roll the damage dice twice and add modifiers once.

Example: Critical hit with longsword (1d8+3) → roll 2d8+3

### Hit Points (HP)

Hit points represent a character's health and vitality. When a creature takes damage, reduce their current HP by the damage amount.

**Starting HP**: 10 + CON modifier

Characters may gain additional HP through leveling up, healing, or resting.

### Incapacitation

When a creature reaches **0 HP**, they are incapacitated:
- **Player Characters**: Fall unconscious and begin making death saving throws (GM discretion)
- **NPCs and Monsters**: Typically die or flee immediately, removed from combat

### Conditions

Combatants may suffer conditions that affect their capabilities:

- **Blinded**: Cannot see, attacks against blinded targets have advantage
- **Deafened**: Cannot hear, automatically fail hearing-based perception checks
- **Frightened**: Disadvantage on ability checks and attacks while source of fear is visible
- **Grappled**: Speed reduced to 0, cannot move
- **Incapacitated**: Cannot take actions or reactions
- **Invisible**: Impossible to see without special senses, attacks have advantage
- **Paralyzed**: Incapacitated, automatically fail STR and DEX saves, attacks have advantage
- **Poisoned**: Disadvantage on attack rolls and ability checks
- **Prone**: Disadvantage on attack rolls, melee attacks against prone targets have advantage
- **Restrained**: Speed 0, disadvantage on DEX saves, attacks against restrained targets have advantage
- **Stunned**: Incapacitated, automatically fail STR and DEX saves, attacks have advantage
- **Unconscious**: Incapacitated, drops items, automatically fails STR and DEX saves, attacks have advantage

## NPC Templates

<!--
  ADVENTURE CREATOR NOTES:

  These NPC templates serve as a "monster manual" for your adventure. The GM can create
  instances of these NPCs during play using the create_npc tool.

  Template Format (flexible, but include):
  - Brief description of the creature
  - HP (hit points)
  - AC (armor class)
  - Stats (STR, DEX, CON, INT, WIS, CHA)
  - Attack information (bonus, damage)
  - Special abilities or traits
  - Skills (if any)
  - Reward (XP, loot, story flags)

  The GM interprets these narratively, so clarity is more important than rigid formatting.
-->

### Goblin

Small, green-skinned humanoids with cunning minds and cowardly hearts. They fight in groups, using hit-and-run tactics, and flee when outnumbered or when their leader falls.

HP: 7
AC: 15 (leather armor and small wooden shield)
Stats: Strength 8, Dexterity 14, Constitution 10, Intelligence 10, Wisdom 8, Charisma 8
Attack: Scimitar +4 to hit (1d6+2 slashing damage)
Ranged Attack: Shortbow +4 to hit, range 80/320 (1d6+2 piercing damage)
Skills: Stealth +6
Traits:
- Nimble Escape: Can disengage or hide as a bonus action on its turn
- Pack Tactics: Has advantage on attacks when an ally is within 5 feet of the target
Reward: 25 XP, 2d6 copper coins, 50% chance of a rusty dagger or shortbow

### Slime (Gelatinous Ooze)

An amorphous, translucent blob of acidic protoplasm. It moves slowly but relentlessly, absorbing organic matter. Slashing weapons cause it to split rather than weaken it.

HP: 22
AC: 8 (amorphous, no armor)
Stats: Strength 12, Dexterity 6, Constitution 16, Intelligence 1, Wisdom 6, Charisma 2
Attack: Pseudopod +3 to hit, reach 5 feet (1d6+1 bludgeoning damage plus 1d6 acid damage)
Skills: None
Traits:
- Amorphous: Can move through spaces as narrow as 1 inch without squeezing
- Acidic Body: Creatures that touch the slime or hit it with a melee attack take 1d6 acid damage
- Split on Slashing: When damaged by slashing damage, the slime splits into two smaller slimes (each with half the original HP, minimum 1 HP each) instead of taking damage. The GM may choose to simplify this by having the slime simply resist slashing damage instead.
Immunities: Immune to slashing damage (splits instead), immune to blindness, charm, deafness, exhaustion, fear
Reward: 50 XP, Acidic Residue (alchemical component worth 5 gold pieces)

### Wolf

Cunning pack hunters with keen senses. Wolves coordinate attacks with their packmates, surrounding prey and bringing it down through teamwork. They are loyal to their pack but will flee if more than half the pack is slain.

HP: 11
AC: 13 (natural armor - thick fur)
Stats: Strength 12, Dexterity 15, Constitution 12, Intelligence 3, Wisdom 12, Charisma 6
Attack: Bite +4 to hit, reach 5 feet (2d4+2 piercing damage). On a hit, the target must succeed on a DC 11 STR saving throw or be knocked prone.
Skills: Perception +3, Stealth +4
Traits:
- Keen Hearing and Smell: Has advantage on Perception checks that rely on hearing or smell
- Pack Tactics: Has advantage on attack rolls when at least one ally is within 5 feet of the target and the ally isn't incapacitated
Reward: 25 XP, Wolf Pelt (worth 2 gold pieces, or can be used for crafting leather armor)

### Bandit Thug

A desperate outlaw who preys on travelers. Bandits are typically cowards at heart, fighting only when they have the advantage. They surrender or flee when seriously wounded or outmatched.

HP: 16
AC: 14 (studded leather armor)
Stats: Strength 13, Dexterity 14, Constitution 12, Intelligence 10, Wisdom 10, Charisma 8
Attack: Club +3 to hit (1d6+1 bludgeoning damage) or Dagger +4 to hit (1d4+2 piercing damage)
Ranged Attack: Sling +4 to hit, range 30/120 (1d4+2 bludgeoning damage)
Skills: Intimidation +0, Stealth +4
Traits:
- Cowardly: When reduced to half HP or less, must make a DC 10 WIS save or attempt to flee on next turn
Reward: 50 XP, 3d6 silver coins, leather armor, club or dagger, possible stolen goods

### Giant Spider

A massive arachnid the size of a large dog, lurking in dark places. It spins sticky webs to trap prey and injects venom with its bite.

HP: 14
AC: 14 (natural armor - chitinous exoskeleton)
Stats: Strength 14, Dexterity 16, Constitution 12, Intelligence 2, Wisdom 11, Charisma 4
Attack: Bite +5 to hit, reach 5 feet (1d6+3 piercing damage plus poison). Target must succeed on a DC 11 CON saving throw or take an additional 2d6 poison damage and become poisoned for 1 minute.
Skills: Stealth +7
Traits:
- Spider Climb: Can climb difficult surfaces, including upside down on ceilings, without needing to make ability checks
- Web Sense: While in contact with a web, knows the exact location of any creature in contact with the same web
- Web Walker: Ignores movement restrictions caused by webbing
Abilities:
- Web (Recharge 5-6): Ranged attack +5 to hit, range 30/60. On hit, target is restrained by webbing. Escape DC 11 STR check. Webbing has AC 10, 5 HP, vulnerable to fire.
Reward: 100 XP, Spider Venom Gland (alchemical component worth 10 gold pieces), spider silk

### Skeleton Warrior

The animated bones of a long-dead warrior, held together by dark magic. Skeletons are fearless and obey their creator's commands without question. They fight until destroyed.

HP: 13
AC: 13 (armor scraps, ancient shield)
Stats: Strength 10, Dexterity 14, Constitution 15, Intelligence 6, Wisdom 8, Charisma 5
Attack: Rusty Shortsword +4 to hit (1d6+2 piercing or slashing damage)
Ranged Attack: Shortbow +4 to hit, range 80/320 (1d6+2 piercing damage)
Skills: None
Traits:
- Undead Nature: Immune to poison damage, exhaustion, and the poisoned condition. Does not need to eat, drink, breathe, or sleep.
- Vulnerable to Bludgeoning: Takes double damage from bludgeoning weapons (clubs, hammers, maces)
Reward: 50 XP, rusted weapons and armor (minimal value), occasionally a tarnished piece of jewelry from its former life

---

## Adventure Creator's Customization Guide

### Adjusting Difficulty

**For easier adventures:**
- Lower DCs by 2-5 points
- Give characters higher starting attributes (16, 15, 14, 13, 12, 10)
- Increase starting HP (12 + CON modifier)
- Give proficiency bonuses of +3 instead of +2

**For harder adventures:**
- Raise DCs by 2-5 points
- Use lower attribute arrays (14, 12, 11, 10, 9, 8)
- Keep HP at base value (8 + CON modifier)
- Use tougher NPC templates or increase enemy numbers

### Creating Custom NPC Templates

When designing your own NPCs, consider:

1. **Challenge Rating**: Match HP, AC, and attack bonuses to player level
2. **Distinctive Traits**: Give each creature 1-2 special abilities that make encounters interesting
3. **Tactical Behavior**: Note how the creature fights (cowardly, reckless, tactical, mindless)
4. **Appropriate Rewards**: XP should roughly equal 25 × creature's average damage output per round
5. **Story Integration**: Include loot or flags that connect to your adventure's narrative

### Alternative Resolution Systems

While this template uses d20+modifier vs DC, you can adapt it to other resolution styles:

**Success with Complications** (Blades in the Dark style):
- 1-3: Failure
- 4-5: Partial success with complication
- 6: Full success

**Degrees of Success** (Powered by the Apocalypse style):
- 6 or less: Fail, GM makes a hard move
- 7-9: Partial success, succeed with cost
- 10+: Full success

Simply describe your preferred resolution mechanics in the "Resolution Mechanics" section, and the GM will interpret dice results accordingly.

### Adding New Systems

This template demonstrates a d20 approach, but you can create entirely different systems:

- **Narrative systems** (Fate, FUDGE): Use dF dice, ladder ratings, aspects
- **Dice pool systems** (World of Darkness): Roll multiple d10s, count successes
- **Card-based systems**: Describe card-draw mechanics and interpretation
- **Resource management**: Track action points, stress, or other pools

The GM will interpret whatever rules you write, so clarity and examples are key.

---

**Template Version**: 1.0.0
**Compatible with**: Adventure Engine RPG System Framework
**License**: Use freely for your adventures, modify as needed
