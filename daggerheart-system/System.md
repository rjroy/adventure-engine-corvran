# Daggerheart System Rules

This document defines the core mechanics for Daggerheart RPG adventures, derived from the Daggerheart SRD by Darrington Press.

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.

---

## Duality Dice

Daggerheart uses two twelve-sided dice (2d12) called the Duality Dice. One represents Hope, the other Fear. When you make an action roll, the relationship between these dice determines not just success, but narrative momentum.

### Rolling Duality Dice

Roll both d12s and add them together, plus any modifiers from traits or Experiences.

**Total = Hope die + Fear die + Trait modifier + Experience modifier (if applicable)**

### Interpreting Results

| Outcome | Condition | Narrative Effect |
|---------|-----------|------------------|
| Critical Success | Both dice show same value | Automatic success with bonus effect |
| Success with Hope | Total >= difficulty, hope die higher | Success, player gains Hope token |
| Success with Fear | Total >= difficulty, fear die higher | Success, GM gains Fear token |
| Failure with Hope | Total < difficulty, hope die higher | Failure, player gains Hope token |
| Failure with Fear | Total < difficulty, fear die higher | Failure, GM gains Fear token |

On a tie between dice values that isn't a critical, the player chooses Hope or Fear.

---

## Traits

All characters have six traits that measure their capabilities.

### The Six Traits

| Trait | Measures |
|-------|----------|
| Agility | Speed, reflexes, coordination |
| Strength | Physical power, lifting, endurance |
| Finesse | Precision, dexterity, fine motor control |
| Instinct | Awareness, intuition, quick reactions |
| Presence | Charisma, willpower, force of personality |
| Knowledge | Learning, memory, reasoning |

### Trait Modifiers

At character creation, distribute these modifiers among your six traits: **+2, +1, +1, +0, +0, -1**. Your class and ancestry may provide additional bonuses.

---

## Experiences

Experiences represent your character's background and training. At character creation, you gain **two Experiences at +2 each**.

### Experience Structure

Each Experience defines:
- **Modifier**: The bonus applied (typically +2 at creation)
- **Positive Scope**: Specific situations where it applies
- **Exclusions**: Situations where it explicitly does not apply

**Important**: Only apply an Experience when the action clearly falls within its positive scope. When unclear, do not apply the bonus.

---

## Difficulty

Action roll difficulties use these standard values:

| Difficulty | Target Number |
|------------|---------------|
| Easy | 10 |
| Moderate | 15 |
| Hard | 20 |
| Formidable | 25 |
| Legendary | 30 |

---

## Hope and Fear Tokens

Hope and Fear tokens represent narrative momentum.

### Hope Tokens (Player)
- Starting: 2 per character
- Maximum: 6 per character
- Gained when your hope die is higher on an action roll
- Spend to: Reroll a die, boost damage, activate certain class features

### Fear Tokens (GM)
- Maximum: 12
- Gained when a player's fear die is higher on their action roll
- Spend to: Activate adversary Fear Features, introduce complications, escalate danger

Tokens that would exceed the maximum are lost.

---

## Hit Points and Stress

### Hit Points (HP)

Characters have HP slots (typically 6). When you take damage:
1. Compare damage to your thresholds
2. Mark HP slots based on severity:
   - Below Major threshold: Mark 1 HP
   - Meets/exceeds Major: Mark 2 HP
   - Meets/exceeds Severe: Mark 3 HP

When all HP slots are marked, the character is dying.

### Damage Thresholds

| Threshold | Calculation |
|-----------|-------------|
| Major | Level + Armor Major Base |
| Severe | Level + Armor Severe Base |

### Stress

Characters have Stress slots (typically 6). Stress accumulates from:
- Narrative consequences
- Failed Fear rolls
- Certain ability effects

**At Maximum Stress**: Gain the Vulnerable condition.

### Armor

Armor provides:
- **Armor Score**: Determines number of Armor Slots
- **Armor Slots**: When taking damage, you may mark 1 Armor Slot to reduce HP marked by 1 (does NOT reduce the damage number)
- **Threshold Bonuses**: Adds to Major/Severe thresholds

---

## Evasion

Evasion represents how hard you are to hit.

**Evasion = Class Base**, modified by ancestry, subclass features, armor, weapons, magic items, etc. **NOT modified by traits.**

Attackers must meet or exceed your Evasion with their attack roll to hit you.

---

## Combat

### Spotlight Flow

Daggerheart combat uses spotlight flow rather than initiative:

1. **Scene Setup**: GM establishes positions and threats
2. **Players Act First**: Someone in the party takes the spotlight
3. **Spotlight Shifts on Fear**: When a player's action roll results in Fear, the GM takes the spotlight
4. **GM Acts**: Adversaries act, Fear Features activate, danger escalates
5. **Spotlight Returns**: A player takes the spotlight again

The GM can also take the spotlight after player failures or when narratively appropriate.

### Actions in Combat

On your turn, you can:
- **Move** a reasonable distance
- **Take an action** (attack, cast, interact, etc.)
- **Use abilities** that don't require your action

### Attack Rolls

To attack:
1. Roll Duality Dice + appropriate trait + modifiers
2. Compare total to target's Evasion
3. If you meet or exceed Evasion, you hit
4. Roll damage and compare to thresholds

### Reactions

Some abilities let you react outside your spotlight. Reaction rolls do not generate Hope or Fear tokens.

---

## Advantage and Disadvantage

When circumstances favor you, gain advantage: roll an additional d6 and add it to your total.

When circumstances hinder you, suffer disadvantage: roll a d6 and subtract it from your total.

Multiple advantages/disadvantages stack (roll multiple d6s). Advantages and disadvantages cancel each other one-to-one.

---

## Conditions

### Standard Conditions (SRD)

| Condition | Effect |
|-----------|--------|
| Vulnerable | All rolls targeting you have advantage |
| Hidden | All rolls against you have disadvantage; ends when seen, you attack, or move into line of sight |
| Restrained | You cannot move, but can still take actions from your current position |

### Special Conditions (Non-SRD)

Some features apply special conditions like Frightened, Prone, or Blinded. These work as described in the feature text.

---

## Rest and Recovery

### Short Rest (10-15 minutes)
- Clear a few Stress (GM discretion)
- Recover some minor resources

### Long Rest (6-8 hours)
- Clear all Stress
- Clear all HP marked
- Recover major resources
- Recall domain cards

---

## Classes

Daggerheart features 9 classes:

| Class | Primary Traits | Role |
|-------|----------------|------|
| Bard | Presence, Knowledge | Support, inspiration |
| Druid | Instinct, Agility | Nature magic, shapeshifting |
| Guardian | Strength, Agility | Protection, defense |
| Ranger | Instinct, Finesse | Tracking, ranged combat |
| Rogue | Finesse, Agility | Stealth, precision |
| Seraph | Presence, Strength | Divine power, healing |
| Sorcerer | Presence, Instinct | Innate magic, elements |
| Warrior | Strength, Finesse | Combat, martial prowess |
| Wizard | Knowledge, Presence | Learned magic, versatility |

Each class has:
- Starting features
- Subclass options (chosen at character creation)
- Level advancement features
- Domain access (2 domains)

---

## Leveling Up

The party levels up together when the GM decides a narrative milestone has been reached (typically every 3 sessions).

### Tiers

Daggerheart's 10 levels are divided into 4 tiers:

| Tier | Levels |
|------|--------|
| Tier 1 | 1 |
| Tier 2 | 2-4 |
| Tier 3 | 5-7 |
| Tier 4 | 8-10 |

Your tier affects damage thresholds, tier achievements, and advancement access.

### Level Up Process

Follow these four steps each time the party levels up:

**Step 1: Tier Achievements**

When entering a new tier (levels 2, 5, 8):

| Level | Achievement |
|-------|-------------|
| 2 | +1 Experience at +2, +1 Proficiency |
| 5 | +1 Experience at +2, +1 Proficiency, clear marked traits |
| 8 | +1 Experience at +2, +1 Proficiency, clear marked traits |

**Step 2: Choose Two Advancements**

Pick two from your current tier or below:

| Advancement | Effect |
|-------------|--------|
| Increase Traits | +1 to 2 unmarked traits (mark them until next tier) |
| Add HP Slot | +1 HP slot permanently |
| Add Stress Slot | +1 Stress slot permanently |
| Increase Experience | +1 to 2 Experiences |
| Additional Domain Card | Take a card at or below your level |
| Increase Evasion | +1 Evasion permanently |
| Upgrade Subclass Card | Foundation → Specialization → Mastery |
| Increase Proficiency* | +1 Proficiency, +1 weapon damage die |
| Multiclass* | Gain second class feature and domain |

*Costs 2 advancement slots

**Step 3: Increase Damage Thresholds**

All thresholds increase by 1 each level.

**Step 4: Gain Domain Card**

Take a new domain card at your level or lower. You may also swap one existing card for another of equal or lower level.

---

## Domains

Domain cards represent magical abilities. There are 9 domains:

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

### Loadout & Vault

- **Loadout**: Up to 5 domain cards you can actively use
- **Vault**: Inactive cards; swap to loadout by paying Recall Cost in Stress
- At rest start: swap freely between loadout and vault (no cost)

### Using Domain Cards

- **Spellcast Roll**: Some effects require a Duality Dice roll using your Spellcast Trait (determined by subclass)
- **Activation Costs**: Some cards require marking Stress to activate

---

## Adversaries

Adversaries are creatures the party faces. Each has:

- **Tier**: Power level (1-4)
- **Type**: Combat role (Bruiser, Horde, Leader, Minion, etc.)
- **Difficulty**: Target number to hit them
- **Thresholds**: Major and Severe damage thresholds
- **HP**: Hit point slots
- **Stress**: Stress capacity
- **Attack Modifier**: Bonus to attack rolls
- **Features**: Special abilities
- **Fear Features**: Abilities the GM spends Fear to activate

### Encounter Building

Use this formula for balanced encounters:

**Battle Points = (3 x Number of PCs) + 2**

Adversary costs:
| Battle Points | Adversary Type |
|---------------|----------------|
| 1 | Group of Minions equal to party size |
| 1 | Social or Support |
| 2 | Horde, Ranged, Skulk, or Standard |
| 3 | Leader |
| 4 | Bruiser |
| 5 | Solo |

---

## Quick Reference

### Action Roll
**2d12 + Trait + Experience (if applicable) vs Difficulty**

### Attack Roll
**2d12 + Trait + modifiers vs Evasion**

### Damage Resolution
1. Roll damage dice
2. Compare to target's thresholds (Major/Severe)
3. Determine HP to mark (1/2/3 based on threshold)
4. Target may mark 1 Armor Slot to reduce HP marked by 1
5. Mark remaining HP

### Token Limits
- Hope: 6 per player
- Fear: 12 for GM

---

*This document is derived from the Daggerheart SRD and is licensed under the DPCGL.*
