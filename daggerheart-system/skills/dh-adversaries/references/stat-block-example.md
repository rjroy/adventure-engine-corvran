# Example Stat Block: Blighted Bandit

This example demonstrates a complete Daggerheart stat block for a Tier 1 Standard adversary.

---

## BLIGHTED BANDIT

***Tier 1 Standard***

*A desperate outlaw twisted by corrupted magic, their skin mottled with dark veins and eyes glowing with an unnatural hunger.*

**Motives & Tactics:** Attacks travelers to steal valuables and spread the blight. Opens combat with ranged attacks, closes to melee when wounded. Flees when reduced to 2 HP or fewer unless cornered.

> **Difficulty:** 11 | **Thresholds:** 7/12 | **HP:** 5 | **Stress:** 3

> **ATK:** +1 | **Corrupted Blade:** Very Close | 1d8+2 physical

> **ATK:** +1 | **Throwing Dagger:** Far | 1d6+2 physical

> **Experience:** Ambush Tactics

## FEATURES

***Desperate Strike - Action:*** When below half HP (3 or fewer), the Blighted Bandit can make two Corrupted Blade attacks instead of one.

***Blight Sense - Passive:*** The Blighted Bandit can sense living creatures within Close range, even through thin barriers. Cannot be surprised by creatures with a pulse.

## FEAR FEATURES

***Spreading Corruption - Action:*** Spend 1 Fear. On the next successful melee attack, the target must make a Strength save (DC 13). On a failure, they take 1 Stress and have disadvantage on their next action roll.

---

## Breakdown of the Stat Block

### Header Analysis

| Element | Value | Explanation |
|---------|-------|-------------|
| Tier | 1 | Entry-level threat, appropriate for new parties |
| Type | Standard | Balanced baseline adversary, no special role |

### Description Purpose

The description establishes:
- Visual identity (mottled skin, glowing eyes)
- Origin hint (corrupted magic)
- Tone (desperate, hungry)

### Motives & Tactics Purpose

Provides the GM with:
- **Opening behavior**: Ranged attacks first
- **Transition**: Moves to melee when hurt
- **Retreat conditions**: Flees at 2 HP unless cornered

### Combat Statistics Breakdown

| Statistic | Value | Explanation |
|-----------|-------|-------------|
| Difficulty | 11 | Standard for Tier 1; players with +2-3 modifier hit ~50% |
| Major Threshold | 7 | Standard for Tier 1; marks 2 HP |
| Severe Threshold | 12 | Standard for Tier 1; marks 3 HP |
| HP | 5 | Standard for Tier 1; survives 2-3 hits |
| Stress | 3 | Can accumulate some Stress before problems |

### Attack Calculations

**Corrupted Blade (+1):**
- Primary melee attack
- +1 modifier is standard for Tier 1
- 1d8+2 damage averages 6.5, typically below Major

**Throwing Dagger (+1):**
- Secondary ranged option
- Same modifier as melee
- 1d6+2 damage averages 5.5, typically below Major

### Experience Analysis

**Ambush Tactics:**
- Applies when setting up ambushes or detecting them
- Reinforces the bandit's thematic role
- **To use**: GM spends a Fear to add the Experience bonus to an attack roll or raise Difficulty

### Feature Analysis

**Desperate Strike (Action):**
- Triggers at half HP (3 or fewer)
- Doubles attack output, making a wounded bandit more dangerous
- Creates tactical decision: finish it fast or risk escalation

**Blight Sense (Passive):**
- Prevents surprise ambushes against the bandit
- Reinforces the supernatural corruption theme
- Limited to living creatures with pulses

### Fear Feature Analysis

**Spreading Corruption:**
- Costs 1 Fear (standard activation cost)
- Triggers on hit, creating a save-or-suffer effect
- Consequences: 1 Stress + disadvantage
- Not devastating, but impactful and thematic

---

## Tactical Considerations

The Blighted Bandit's design encourages:

1. **Opening ranged harassment**: Lower attack bonus but safer position
2. **Melee transition**: When forced or advantageous
3. **Desperation escalation**: More attacks at low HP
4. **GM Fear spending**: Spreading Corruption adds Stress pressure

**Optimal GM Tactics:**
1. Open with throwing daggers from Far range
2. Close to melee when players approach
3. At half HP, use Desperate Strike for double attacks
4. Spend Fear on Spreading Corruption when landing a solid hit
5. Flee when reduced to 2 HP (or make a dramatic last stand)

---

## Additional Variants

### Blighted Bandit Scout (Tier 1 Skulk)

Stealthier version for ambush encounters:

> **Difficulty:** 11 | **Thresholds:** 7/12 | **HP:** 4 | **Stress:** 2

> **ATK:** +1 | **Shadow Blade:** Very Close | 1d6+3 physical

**Changed Features:**
- ***Vanish - Action:*** The Scout can Hide if not in direct light.
- ***Ambush Strike - Passive:*** First attack against an unaware target deals +1d6 damage.

### Blighted Bandit Leader (Tier 2 Leader)

Command version for larger encounters:

> **Difficulty:** 14 | **Thresholds:** 10/20 | **HP:** 8 | **Stress:** 5

> **ATK:** +2 | **Commanding Blade:** Very Close | 2d6+3 physical

**Changed Features:**
- ***Rally the Desperate - Action:*** All Blighted Bandits within Far range gain +2 to their next attack roll.
- ***Coordinated Strike - Reaction:*** When an ally hits a target, the Leader can immediately make one Throwing Dagger attack against the same target.

---

## Using This in Encounters

### Single Blighted Bandit (2 Battle Points)

Good for:
- Random encounter on the road
- Guard for a small cache
- Wounded survivor of a larger band

### Bandit Ambush (4 PCs, 14 BP budget)

- 2x Blighted Bandit (4 BP - Standard)
- 1x Blighted Bandit Scout (2 BP - Skulk)
- 4x Blighted Minions (1 BP - Minion group)
- 1x Blighted Bandit Leader (3 BP - Leader)
- **Total: 10 BP**

The Scout opens from hiding, Bandits follow with ranged attacks, Minions engage anyone who advances, Leader rallies the group.

### Boss Encounter (4 PCs, 14 BP budget)

- 1x Blighted Bandit Leader (3 BP - Leader)
- 2x Blighted Bandit (4 BP - Standard)
- 4x Blighted Minions (1 BP - Minion group)
- **Total: 8 BP**

The Leader stays protected, Rally buffs the group, Bandits deal damage, Minions absorb actions.

---

## Rolling Damage

Use the corvran dice-roller skill for attack resolution:

**Rolling Corrupted Blade damage:**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d8+2"
```

**Rolling Throwing Dagger damage:**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d6"
```

**Rolling Ambush Strike bonus:**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d6"
```

---

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.
