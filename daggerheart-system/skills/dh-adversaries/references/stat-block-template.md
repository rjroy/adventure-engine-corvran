# Adversary Stat Block Template

This template follows the Daggerheart SRD stat block format (TD-5). Replace placeholder text with appropriate values. Remove sections that don't apply to your adversary.

---

## [ADVERSARY NAME]
<!-- Replace with the adversary's name. Use ALL CAPS for header. -->

***Tier [1-4] [Type]***
<!--
Tier: 1 (common), 2 (significant), 3 (major), 4 (legendary)
Type: One of the 10 adversary types:
  - Bruiser (heavy melee damage)
  - Horde (swarm/group)
  - Leader (command/buff)
  - Minion (expendable, low HP)
  - Ranged (distance attacker)
  - Skulk (stealth/ambush)
  - Social (non-combat focused)
  - Solo (boss, multiple actions)
  - Standard (balanced baseline)
  - Support (healer/buffer)
-->

*[Description of the adversary's appearance and nature]*
<!--
One to two sentences describing what this adversary looks like and its general nature.
Example: A hulking construct of rusted iron, animated by dark magic and driven by an endless hunger for destruction.
-->

**Motives & Tactics:** [Behavioral guidance for the GM]
<!--
Brief guidance on how this adversary behaves in combat.
Include: What it wants, how it fights, when it retreats.
Example: Protects its lair at all costs. Opens with ranged attacks, closes to melee when cornered. Flees at half HP if no allies remain.
-->

> **Difficulty:** [N] | **Thresholds:** [Major]/[Severe] | **HP:** [N] | **Stress:** [N]
<!--
Difficulty: Target number to hit this adversary (10-26 based on Tier)
Thresholds: Damage needed for Major (mark 2 HP) and Severe (mark 3 HP)
HP: Number of HP slots (3-30+ based on Tier and Type)
Stress: Stress capacity (2-12 based on Tier)

Benchmark by Tier:
| Tier | Difficulty | Major | Severe | HP | Stress |
|------|------------|-------|--------|-----|--------|
| 1    | 10-14      | 5-8   | 10-14  | 3-8 | 2-4    |
| 2    | 14-18      | 8-12  | 14-20  | 6-12| 4-6    |
| 3    | 18-22      | 12-16 | 20-26  | 10-18| 6-9   |
| 4    | 22-26      | 16-22 | 26-34  | 15-30| 9-12  |
-->

> **ATK:** +[N] | **[Attack Name]:** [Range] | [Damage] [type]
<!--
ATK: Attack modifier (+3 to +8 based on Tier)
Attack Name: Descriptive name (Claw, Blade, Poison Spit, etc.)
Range: One of:
  - Melee (adjacent)
  - Close (within 10 ft / 2 spaces)
  - Far (within 60 ft / 12 spaces)
  - Very Far (beyond 60 ft)
Damage: Dice expression (1d6, 2d8+2, etc.)
Type: Physical or Magic

Example: ATK: +4 | Rusted Blade: Melee | 1d8+2 physical
-->

> **Experience:** [Name] +[N]
<!--
OPTIONAL: Include if the adversary has expertise relevant to certain checks.
Experience Name: Brief description of expertise
Modifier: +1 to +3
Example: Experience: Ambush Hunter +2

REMOVE this line if no Experience.
-->

## FEATURES
<!--
Standard abilities that don't cost Fear to activate.
Each feature has a name in bold italic, then its type, then description.
Types: Action, Reaction, Passive
-->

***[Feature Name] - [Action/Reaction/Passive]:*** [Description of the feature and its effects.]
<!--
Action: Takes the adversary's action for the turn
Reaction: Triggered by specific events (specify trigger)
Passive: Always active, no action required

Examples:
***Pack Tactics - Passive:*** This adversary has advantage on attack rolls when an ally is within Close range of the target.

***Nimble Dodge - Reaction:*** When targeted by an attack, this adversary can increase its Difficulty by 2 until the attack resolves.

***Crushing Blow - Action:*** Make a melee attack. On a hit, the target is knocked prone and cannot stand until the end of their next turn.
-->

## FEAR FEATURES
<!--
Powerful abilities the GM activates by spending Fear tokens.
These create dramatic moments and should be more powerful than standard Features.

REMOVE this section if no Fear Features.
-->

***[Feature Name] - Action:*** Spend [N] Fear to [effect]
<!--
Fear Cost: Usually 1-2 Fear, rarely 3+
Effect: What happens when activated

Good Fear Features:
- Interrupt player actions
- Deal threshold-breaking damage
- Create environmental hazards
- Summon reinforcements
- Impose conditions

Examples:
***Terrifying Roar - Action:*** Spend 1 Fear. All creatures within Close range must make a Presence save (DC 14) or become Frightened until the end of their next turn.

***Summon Minions - Action:*** Spend 2 Fear. Two Tier 1 Minions appear in unoccupied spaces within Close range.

***Death Strike - Action:*** Spend 2 Fear. Make a melee attack with advantage. On a hit, the damage ignores armor slots.
-->

---

## Quick Reference Tables

### Tier Benchmarks

| Tier | Difficulty | Major | Severe | HP | Stress | ATK |
|------|------------|-------|--------|-----|--------|-----|
| 1 | 10-14 | 5-8 | 10-14 | 3-8 | 2-4 | +3-4 |
| 2 | 14-18 | 8-12 | 14-20 | 6-12 | 4-6 | +4-5 |
| 3 | 18-22 | 12-16 | 20-26 | 10-18 | 6-9 | +5-7 |
| 4 | 22-26 | 16-22 | 26-34 | 15-30 | 9-12 | +7-8 |

### Type Modifiers

Adjust base Tier values based on Type:

| Type | HP Adjustment | Notes |
|------|---------------|-------|
| Bruiser | +50% | Higher thresholds |
| Horde | -50% each | Group mechanics |
| Leader | Standard | Has buff Features |
| Minion | 1-3 HP only | No Stress |
| Ranged | -25% | Ranged attacks |
| Skulk | -25% | Stealth bonuses |
| Social | -50% | Non-combat focus |
| Solo | +100% | Multiple actions |
| Standard | Standard | Baseline |
| Support | -25% | Has heal/buff Features |

### Attack Range Reference

| Range | Distance | Typical For |
|-------|----------|-------------|
| Melee | Adjacent | Bruisers, most creatures |
| Close | ~10 ft / 2 spaces | Short thrown, breath weapons |
| Far | ~60 ft / 12 spaces | Bows, most spells |
| Very Far | 60+ ft | Siege, powerful magic |

---

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.
