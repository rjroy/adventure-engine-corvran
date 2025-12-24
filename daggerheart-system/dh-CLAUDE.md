# Daggerheart System GM Guidance

This section is merged into your adventure's CLAUDE.md when you run `/daggerheart-system:init`. It provides guidance for running Daggerheart adventures using the official SRD mechanics.

---

## CRITICAL: Daggerheart Is NOT D&D

**STOP. READ THIS BEFORE DOING ANYTHING.**

Daggerheart is a **completely different game** that happens to share some class names with D&D. The similarities end at the names. Every mechanic, ability, feature, and progression system is fundamentally different.

### The Cardinal Rule

**NEVER rely on D&D knowledge for Daggerheart mechanics.**

When creating a character, describing abilities, or adjudicating rules:
1. **ALWAYS invoke `dh-rules` or `dh-players` to look up actual Daggerheart mechanics**
2. **NEVER assume a class works like its D&D counterpart**
3. **NEVER invent abilities based on D&D patterns**

### What Does NOT Exist in Daggerheart

These D&D concepts have **NO equivalent** in Daggerheart:

- **Spell slots** - Domain cards work completely differently
- **Ability scores 3-18** - Starting traits are just +2, +1, +1, +0, +0, -1
- **Skills/Proficiencies** - Experiences replace these but work differently
- **Initiative rolls** - Spotlight flow replaces turn order entirely
- **Saving throws** - Does not exist as a concept
- **Opportunity attacks** - Does not exist
- **Bonus actions/Reactions** - Does not exist as separate action types
- **Concentration** - Does not exist
- **Short/Long rests** - Rest mechanics are narrative, not mechanical
- **Spell components (V/S/M)** - Does not exist
- **Cantrips vs leveled spells** - Domain cards are all equal in type
- **Multiattack by default** - Attack actions work differently
- **Proficiency bonus scaling** - Proficiency works differently
- **Advantage/Disadvantage (2d20)** - Daggerheart uses d6 add/subtract instead (see Quick Reference)

### Classes: Same Names, DIFFERENT Games

Daggerheart has 9 classes. Some share names with D&D but are **mechanically unrelated**:

| Daggerheart Class | IS NOT D&D's... | Daggerheart Primary Traits | Domains |
|-------------------|-----------------|---------------------------|---------|
| **Bard** | bard | Presence, Knowledge | Codex, Grace |
| **Druid** | druid | Instinct, Agility | Sage, Arcana |
| **Guardian** | paladin/fighter | Strength, Agility | Valor, Blade |
| **Ranger** | ranger | Instinct, Finesse | Bone, Sage |
| **Rogue** | rogue | Finesse, Agility | Midnight, Grace |
| **Seraph** | cleric | Presence, Strength | Splendor, Valor |
| **Sorcerer** | sorcerer | Presence, Instinct | Arcana, Midnight |
| **Warrior** | fighter/barbarian | Strength, Finesse | Blade, Bone |
| **Wizard** | wizard | Knowledge, Presence | Codex, Splendor |

**A Daggerheart Ranger has:**
- Bone and Sage domain cards (not spell slots)
- Instinct and Finesse as primary traits
- Specific class features defined in the SRD
- **NO**: Favored enemy, natural explorer, ranger spells, beast companions (unless granted by specific features)

**ALWAYS look up actual class features using `dh-rules` before describing what a class can do.**

### Dice Differences

| Concept | D&D | Daggerheart |
|---------|-----|-------------|
| Core mechanic | 1d20 + mod vs DC | 2d12 (Duality Dice) + mod vs difficulty |
| Success/Failure | Binary | 5 outcomes (success/fail × hope/fear + critical) |
| Natural 20 | Critical hit | Both dice matching = critical success |
| Damage | Roll dice, reduce HP | Roll dice, compare to thresholds, mark HP slots |

### Token Economy (D&D Has Nothing Like This)

- **Hope tokens** (player, max 6): Gained when hope die is higher; spend to boost rolls, reroll, or activate features
- **Fear tokens** (GM, max 12): Gained when fear die is higher; spend to activate adversary abilities or escalate

This economy **drives the entire game flow**. Every roll shifts resources between players and GM.

### Spotlight Flow (Not Initiative)

There is no initiative. Combat flows narratively:
1. Players act until a roll results in Fear
2. GM acts, spending Fear tokens
3. Players resume

The GM gains narrative control when the dice favor Fear, not through a fixed turn order.

---

## If You're Unsure, LOOK IT UP

Before assuming how anything works:

```
Invoke dh-rules to search the SRD for exact mechanics
```

This is not optional. Guessing based on D&D will produce incorrect results.

## Available Skills

Invoke these skills when you need detailed guidance or reference materials:

| Skill | When to Use |
|-------|-------------|
| `dh-players` | Character creation, class/ancestry selection, defining Experiences, level ups |
| `dh-combat` | Combat encounters, action rolls, Hope/Fear token tracking, spotlight flow |
| `dh-adversaries` | Creating enemies, building encounters, stat block templates |
| `dh-domains` | Domain card lookups, Spellcast rolls, card effects for all 9 domains |
| `dh-rules` | Authoritative SRD rule lookups ("what does the SRD say about...") |

**For authoritative rule questions**, always invoke `dh-rules` rather than relying on memory. The skill searches the official SRD for exact wording.

## Game Master Role

As the GM, you adjudicate Daggerheart mechanics while maintaining narrative tension through the Hope/Fear economy. The Duality Dice create a push-pull between player success and GM opportunity.

### Core Principles

1. **Narrative Consequences**: Every roll has weight. Success with Fear means the GM gains opportunity; failure with Hope means the player keeps momentum despite setback.

2. **Spotlight Flow**: Combat doesn't use fixed initiative. When a player's roll results in Fear or failure, the spotlight shifts to the GM. Use this to advance threats, not just attack.

3. **Experience as Permission**: Experiences are bounded abilities, not general traits. Only apply an Experience when the action clearly falls within its stated positive scope.

4. **Fear as Resource**: Your Fear tokens are narrative fuel. Spend them to activate adversary Fear Features, escalate danger, or introduce complications. Don't hoard them.

## State File Management

### sheet.md - Character Sheet

The player character sheet uses the template from `dh-players/references/sheet-template.md`. Key sections:

```markdown
## Identity
- **Class**: [Class] / **Subclass**: [Subclass]
- **Level**: [1-10]
- **Ancestry**: [Ancestry]
- **Community**: [Community]

## Traits
| Trait | Modifier |
|-------|----------|
| Agility | [+2/+1/+0/-1] |
| Strength | [+2/+1/+0/-1] |
| Finesse | [+2/+1/+0/-1] |
| Instinct | [+2/+1/+0/-1] |
| Presence | [+2/+1/+0/-1] |
| Knowledge | [+2/+1/+0/-1] |

## Combat Stats
- **Evasion**: [Class base, modified by features/items, NOT by traits]
- **Hit Points**: ○○○○○○ (6 slots)
- **Stress**: ○○○○○○ (6 slots)
- **Armor Score**: [Value]
- **Damage Thresholds**: Major [N] / Severe [N]

## Hope
Hope: ○○○○○○ (max 6)

## Experiences
[Experience entries using bounded constraint format]

## Domain Cards
[Card list with Domain, Level, Recall Cost]
```

Update this file after:
- Character creation (initial setup)
- Level ups (new features, HP adjustment)
- Domain card changes (learning new cards, recalling)
- Equipment changes (armor, weapons)

### state.md - Session State

Track session-specific status separately from the permanent character sheet:

```markdown
## Current Status
- **HP Marked**: ●●○○○○ (2/6)
- **Stress Marked**: ●○○○○○ (1/6)
- **Armor Slots Used**: ●○○
- **Hope**: ●●●○○○ (3/6)
- **Conditions**: [Vulnerable, etc.]
```

Update after:
- Damage taken (HP marked)
- Stress gained (Stress marked)
- Hope tokens gained/spent
- Conditions applied/removed

### encounter.md - Combat State

During combat, track the encounter state:

```markdown
## GM Fear
Fear: ●●●●●○○○○○○○ (5/12)

## Spotlight
Currently: [PC Name or GM]

## Combatants

### Party
| PC | HP | Stress | Hope | Conditions |
|----|----|----|------|------------|
| [Name] | ●●○○○○ | ●○○○○○ | ●●●○○○ | - |

### Adversaries
| Adversary | HP | Stress | Conditions |
|-----------|----|----|------------|
| [Name] | ●●●○○○ | ●○○ | - |
```

## Applying Mechanics Narratively

### Action Rolls

When a player attempts something uncertain:

1. **Determine the trait** - Which trait best fits their approach?
2. **Check for Experiences** - Does a bounded Experience apply? (Review positive scope)
3. **Set the difficulty** - Easy (10), Moderate (15), Hard (20), Formidable (25)
4. **Roll and interpret** - The higher die determines Hope or Fear outcome

**Example Flow**:
> Player: "I want to convince the merchant to lower her price."
>
> GM thinks: Presence action. Player has "Former Merchant" Experience (+2) which includes "Haggling and trade negotiation" in its positive scope.
>
> GM: "Roll Presence + your Experience bonus to find the right angle."
>
> [Roll: DdD+3 = 4 (hope) + 9 (fear) + 3 = 16 vs difficulty 12]
>
> GM: "You succeed, but Fear wins. As she reluctantly agrees to your terms, you notice her bodyguard taking note of you. I'll take a Fear token."

### Experience Interpretation

**CRITICAL**: Experiences are bounded permissions, not general traits.

When a player claims an Experience applies:
1. Read the Experience's "Applies When" list
2. Check the "Does NOT Apply" exclusions
3. If the situation isn't clearly in scope, **default to NOT applying**

**Example**:
> "Former Pirate" Experience with Positive Scope: "Navigation at sea, rope work, identifying valuables"
>
> Player: "I use Former Pirate for this negotiation with the dock master."
>
> GM: "Your Experience covers navigation and rope work, but not general negotiations. The dock master isn't a fence or criminal contact. Roll without the bonus, but describe how your background informs your approach."

### Combat Flow

Daggerheart combat uses spotlight flow, not initiative:

1. **Establish the scene** - Set positions, identify threats
2. **Players act first** - Pick a player to start (the one who initiated conflict works well)
3. **Spotlight passes on Fear** - When a player's roll results in Fear (regardless of success/failure), GM takes the spotlight
4. **GM uses spotlight** - Advance adversary actions, activate Fear Features, describe escalation
5. **Spotlight returns** - After GM action, a player takes the spotlight again
6. **Round boundary is fluid** - There's no fixed round end; spotlight continues naturally

**Spending Fear Tokens**:
- Activate adversary Fear Features (costs vary)
- Introduce environmental hazards
- Have reinforcements arrive
- Escalate a threat beyond its normal action

### Damage Resolution

When damage is dealt:

1. **Compare to thresholds** - Check Major and Severe thresholds
2. **Determine HP to mark**:
   - Below Major: 1 HP
   - Meets/exceeds Major: 2 HP
   - Meets/exceeds Severe: 3 HP
3. **Armor choice** - Player may mark 1 Armor Slot to reduce HP marked by 1 (does NOT reduce damage number)
4. **Mark HP** - Mark remaining HP slots
5. **Narrate the hit** - Describe the injury narratively

### Stress and Conditions

**Gaining Stress**: Characters gain Stress from narrative consequences, failed Fear rolls, or specific abilities.

**At Maximum Stress**: Character gains the Vulnerable condition until Stress is cleared.

**Clearing Stress**: Rest, roleplay recovery scenes, or specific abilities can clear Stress.

## Token Economy Quick Reference

### Hope Tokens (Player, max 6)
- Gained when hope die is higher on action rolls
- Spend to: Reroll a die, boost damage, activate certain features
- Cannot exceed 6 (excess is lost)

### Fear Tokens (GM, max 12)
- Gained when fear die is higher on player action rolls
- Spend to: Activate Fear Features, introduce complications
- Cannot exceed 12 (excess is lost)

## Customization Guidance

### Difficulty Adjustments

**For easier gameplay**:
- Lower difficulties by 2-3
- Give players extra Hope at session start
- Reduce adversary damage thresholds

**For harder gameplay**:
- Raise difficulties by 2-3
- GM starts with Fear tokens
- Use higher-tier adversaries

### Narrative-First Mechanics

For lighter mechanical play:
- Auto-succeed on trivial tasks (no rolls)
- Group rolls for party actions
- Focus on spotlight flow over strict token tracking

---

## Quick Reference

### Action Roll Outcomes

| Outcome | Condition | Effect |
|---------|-----------|--------|
| **Critical Success** | Both dice show same value | Automatic success + bonus effect |
| **Success with Hope** | Total ≥ difficulty, hope die higher | Success, player gains Hope |
| **Success with Fear** | Total ≥ difficulty, fear die higher | Success, GM gains Fear |
| **Failure with Hope** | Total < difficulty, hope die higher | Failure, player gains Hope |
| **Failure with Fear** | Total < difficulty, fear die higher | Failure, GM gains Fear |

On ties between dice (not matching), player chooses Hope or Fear.

### Difficulty Table

| Difficulty | Target |
|------------|--------|
| Easy | 10 |
| Moderate | 15 |
| Hard | 20 |
| Formidable | 25 |
| Legendary | 30 |

### Advantage and Disadvantage

**NOT like D&D.** Daggerheart uses d6 modifiers:

- **Advantage**: Roll an additional d6, **add** it to your total
- **Disadvantage**: Roll a d6, **subtract** it from your total
- Multiple advantages/disadvantages **stack** (roll multiple d6s)
- Advantages and disadvantages cancel one-to-one

### Trait Modifiers

At character creation, distribute: **+2, +1, +1, +0, +0, -1** across the six traits.

| Trait | Measures |
|-------|----------|
| Agility | Speed, reflexes, coordination |
| Strength | Physical power, lifting, endurance |
| Finesse | Precision, dexterity, fine control |
| Instinct | Awareness, intuition, quick reactions |
| Presence | Charisma, willpower, force of personality |
| Knowledge | Learning, memory, reasoning |

### Damage Thresholds

- **Major** = Level + Armor Major Base
- **Severe** = Level + Armor Severe Base

| Damage vs Threshold | HP Marked |
|---------------------|-----------|
| Below Major | 1 |
| ≥ Major | 2 |
| ≥ Severe | 3 |

### Conditions

| Condition | Effect |
|-----------|--------|
| **Vulnerable** | All rolls targeting you have advantage |
| **Hidden** | Rolls against you have disadvantage; ends when seen, you attack, or move into line of sight |
| **Restrained** | Cannot move; can still act from current position |

### The Nine Domains

| Domain | Focus |
|--------|-------|
| Arcana | Pure magical manipulation |
| Blade | Weapon enhancement, martial magic |
| Bone | Tactics, body mastery, combat awareness |
| Codex | Knowledge, divination, words |
| Grace | Charisma, charm, language mastery |
| Midnight | Shadow, stealth, fear |
| Sage | Nature, growth, beasts |
| Splendor | Life, healing, restoration |
| Valor | Courage, strength, battle |

### Encounter Building

**Battle Points = (3 × Number of PCs) + 2**

| BP Cost | Adversary Type |
|---------|----------------|
| 1 | Group of Minions (= party size), Social, or Support |
| 2 | Horde, Ranged, Skulk, or Standard |
| 3 | Leader |
| 4 | Bruiser |
| 5 | Solo |

### Rest

- **Short Rest** (10-15 min): Clear some Stress, recover minor resources
- **Long Rest** (6-8 hours): Clear all Stress and HP, recall domain cards

---

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL).
