# NPC/Monster Stat Block Template

This template follows the SRD 5.2 stat block format. Replace placeholder text with appropriate values. Remove sections that don't apply to your creature.

---

## [Creature Name]
<!-- Replace with the creature's name. Use title case. -->

*[Size] [Type] ([Tags]), [Alignment]*
<!--
Size: Tiny, Small, Medium, Large, Huge, or Gargantuan
Type: One of the 14 creature types (Aberration, Beast, Celestial, Construct, Dragon, Elemental, Fey, Fiend, Giant, Humanoid, Monstrosity, Ooze, Plant, Undead)
Tags: Optional descriptive tags in parentheses (e.g., "Goblinoid", "Shapechanger", "Elf")
Alignment: Lawful/Neutral/Chaotic + Good/Neutral/Evil, or Unaligned for creatures without moral capacity
-->

- **Armor Class:** [AC] ([armor type])
<!--
AC = 10 + DEX modifier + armor bonus + shield bonus + natural armor
Note the source: (natural armor), (leather armor), (chain mail, shield), etc.
-->

- **Hit Points:** [Average HP] ([Hit Dice]d[Die Size] + [CON contribution])
<!--
Hit Die size by creature size: Tiny=d4, Small=d6, Medium=d8, Large=d10, Huge=d12, Gargantuan=d20
CON contribution = Number of Hit Dice x CON modifier
Average HP = (Hit Dice x average per die) + CON contribution
Example: 3d8 + 6 means 3 Hit Dice, +2 CON mod per die, average = 13.5 + 6 = 19
-->

- **Speed:** [Walk Speed] ft.[, Special Speeds]
<!--
Base walking speed. Add special movement modes if applicable:
- Burrow 20 ft.
- Climb 30 ft.
- Fly 60 ft. (hover)
- Swim 40 ft.
-->

- **Initiative:** +[DEX mod] ([10 + DEX mod])
<!--
Initiative modifier is usually just DEX mod.
Initiative score = 10 + DEX mod + any additional bonuses.
-->

|STAT|SCORE|MOD|SAVE|
| --- | --- | --- | --- |
| STR | [Score] | [+/-Mod] | [+/-Save] |
| DEX | [Score] | [+/-Mod] | [+/-Save] |
| CON | [Score] | [+/-Mod] | [+/-Save] |
| INT | [Score] | [+/-Mod] | [+/-Save] |
| WIS | [Score] | [+/-Mod] | [+/-Save] |
| CHA | [Score] | [+/-Mod] | [+/-Save] |
<!--
Score: Raw ability score (1-30, with 10-11 being average)
Mod: (Score - 10) / 2, rounded down
Save: Mod + Proficiency Bonus if proficient in that save, otherwise just Mod

Typical proficient saves by creature concept:
- Warriors: STR, CON
- Casters: INT, WIS, or CHA (depending on casting ability)
- Agile creatures: DEX
-->

- **Skills:** [Skill] +[Bonus][, ...]
<!--
Only list skills the creature is proficient in.
Skill bonus = Ability mod + Proficiency Bonus
If creature has Expertise, double the Proficiency Bonus for that skill.
Example: Stealth +6, Perception +4
-->

- **Resistances:** [Damage Types]
<!--
Damage types the creature takes half damage from.
Example: Fire, Cold, Bludgeoning from nonmagical attacks
REMOVE this line if no resistances.
-->

- **Vulnerabilities:** [Damage Types]
<!--
Damage types the creature takes double damage from.
Example: Fire
REMOVE this line if no vulnerabilities.
-->

- **Immunities:** [Damage Types]; [Conditions]
<!--
Damage immunities first, then condition immunities separated by semicolon.
Example: Poison, Psychic; Charmed, Frightened, Poisoned
REMOVE this line if no immunities.
-->

- **Gear:** [Item1], [Item2], ...
<!--
Equipment the creature carries that can be looted after defeat.
Only include retrievable gear. Supernatural items or innate equipment don't go here.
Example: Chain Mail, Longsword, Shield, Longbow
REMOVE this line if no lootable gear.
-->

- **Senses:** [Special Senses]; Passive Perception [PP]
<!--
Special senses before Passive Perception:
- Blindsight 30 ft. (blind beyond this radius)
- Darkvision 60 ft.
- Tremorsense 60 ft.
- Truesight 120 ft.
Passive Perception = 10 + WIS mod + Proficiency Bonus (if proficient in Perception)
Example: darkvision 60 ft., blindsight 10 ft.; Passive Perception 14
-->

- **Languages:** [Language1], [Language2] [or "None"]
<!--
Languages the creature can speak and understand.
Use "understands [Language] but can't speak" for creatures that comprehend but don't speak.
Use "None" for creatures with no language capability.
Example: Common, Goblin
-->

- **CR:** [Rating] (XP [Amount]; PB +[Bonus])
<!--
Challenge Rating determines XP reward and Proficiency Bonus.
See stat-blocks.md for the full CR/XP/PB table.
Example: 1/4 (XP 50; PB +2)
-->

### Traits
<!--
Special abilities that are always active or trigger automatically.
Each trait has a name in bold italic followed by description.
REMOVE this section if no traits.
-->

***[Trait Name].*** [Description of the trait and its effects.]
<!--
Examples:
- Pack Tactics: Advantage when ally is adjacent
- Keen Senses: Advantage on Perception checks
- Magic Resistance: Advantage on saves vs spells
- Spellcasting: List spellcasting ability, DC, and spells
-->

### Actions
<!--
Actions the creature can take on its turn.
Always include at least one action (usually an attack).
-->

***Multiattack.*** The [creature] makes [number] attacks[, using X or Y in any combination].
<!--
Only include if creature attacks multiple times per turn.
Specify which attacks can be used and how many.
REMOVE if creature only makes one attack.
-->

***[Attack Name].*** *Melee Attack Roll:* +[Attack Bonus], reach [X] ft. [Average] ([Dice] + [Mod]) [Damage Type] damage.
<!--
Attack Bonus = Ability mod (usually STR for melee, DEX for ranged) + Proficiency Bonus
Reach: Usually 5 ft., or 10 ft. for reach weapons
Damage: Show average first, then dice formula
Add any conditional damage after: ", plus 7 (2d6) Fire damage if [condition]."
-->

***[Ranged Attack Name].*** *Ranged Attack Roll:* +[Attack Bonus], range [Normal]/[Long] ft. [Average] ([Dice] + [Mod]) [Damage Type] damage.
<!--
Range shown as normal/long range (e.g., 80/320 ft.)
Attacks at long range have Disadvantage.
-->

***[Special Action Name][ (Recharge X-Y)].*** [Description of the action.]
<!--
For saving throw effects:
*[Save Type] Saving Throw:* DC [DC], [targets]. *Failure:* [Effect]. *Success:* [Effect or "Half damage"].

Recharge notation: Recharge 5-6 means roll d6 at start of turn, recharges on 5 or 6.
X/Day notation: 3/Day means can use 3 times before Long Rest.
-->

### Bonus Actions
<!--
REMOVE this section if no bonus actions.
-->

***[Bonus Action Name].*** [Description of the bonus action.]

### Reactions
<!--
REMOVE this section if no reactions.
-->

***[Reaction Name].*** *Trigger:* [What triggers the reaction]. *Response:* [What the creature does in response.]

### Legendary Actions
<!--
REMOVE this section unless the creature is a legendary monster (usually CR 10+).
-->

The [creature] can take [X] Legendary Actions, choosing from the options below. Only one Legendary Action can be used at a time and only at the end of another creature's turn. Expended uses are regained at the start of each of the [creature]'s turns.

***[Action Name].*** [Effect.]

***[Action Name] (Costs [X] Actions).*** [Effect.]

---

## Quick Reference

### Typical Ability Scores by Role

| Role | High | Medium | Low |
|------|------|--------|-----|
| Brute | STR, CON | DEX | INT, WIS, CHA |
| Skirmisher | DEX | STR, CON | INT, CHA |
| Caster | INT/WIS/CHA, CON | DEX | STR |
| Leader | CHA, INT/WIS | CON | DEX |

### Common CR Benchmarks

| CR | Threat Level | HP Range | Attack Bonus | Save DC |
|----|--------------|----------|--------------|---------|
| 1/4 | Minor threat | 10-20 | +3 to +4 | 10-12 |
| 1 | Standard encounter | 20-40 | +4 to +5 | 12-13 |
| 5 | Significant threat | 80-120 | +6 to +8 | 14-15 |
| 10 | Major boss | 180-220 | +9 to +10 | 17-18 |

---

## License

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC. The SRD 5.2.1 is licensed under CC-BY-4.0.
