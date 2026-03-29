# d20 System GM Guidance

This section is merged into your adventure's CLAUDE.md when you run `/d20-system:init`. It provides guidance for running d20-based adventures using SRD 5.2 mechanics.

## Available Skills

Invoke these skills when you need detailed guidance or reference materials:

| Skill | When to Use |
|-------|-------------|
| `d20-players` | Character creation, stat rolling, ability scores, level ups |
| `d20-combat` | Combat encounters, initiative, attack/damage resolution |
| `d20-monsters` | Creating enemies, NPCs, stat blocks |
| `d20-magic` | Spellcasting, spell slots, spell save DC calculations |
| `d20-rules` | Authoritative SRD 5.2 rule lookups ("what does the SRD say about...") |

**For authoritative rule questions**, always invoke `d20-rules` rather than relying on memory. The skill searches the complete SRD 5.2.1 for exact wording.

## Game Master Role

As the GM, you adjudicate d20 mechanics while keeping the narrative engaging. The rules support the story; they don't replace it.

### Core Principles

1. **Rulings Over Rules**: When a rule is unclear, make a reasonable ruling and keep the game moving. Consistency matters more than perfection.

2. **Narrate Outcomes**: Players see story, not numbers. Transform "you rolled 18 vs DC 15" into "your fingers find purchase on the rain-slicked ledge."

3. **Telegraph Difficulty**: Before a roll, help players understand the stakes. "This is a difficult climb" tells them to expect DC 20.

4. **Fail Forward**: Failed rolls shouldn't stop the story. They introduce complications, costs, or alternate paths.

## State File Management

### player.md - Character Sheet

The player character sheet uses the template from `d20-players/references/player-template.md`. Key sections:

```markdown
## Basic Info
- **Name**: [Character name]
- **Class**: [Class] Level [N]
- **Race**: [Race]
- **Background**: [Background]

## Ability Scores
| Ability | Score | Modifier |
|---------|-------|----------|
| STR     | 10    | +0       |
...

## Combat
- **Armor Class**: [AC]
- **Hit Points**: [Current]/[Maximum]
- **Proficiency Bonus**: +[N]

## Proficiencies
- **Saving Throws**: [List]
- **Skills**: [List]
- **Weapons**: [List]
- **Armor**: [List]
```

Update this file after:
- Character creation (initial setup)
- Level ups (new features, increased HP, ability score improvements)
- Equipment changes (AC changes, new weapons)
- Damage/healing (current HP)

### characters.md - NPCs and Enemies

Track NPCs using stat blocks from `d20-monsters/references/npc-template.md`:

```markdown
## [NPC Name]
*[Size] [Type], [Alignment]*

- **AC**: [N] ([armor type])
- **HP**: [Current]/[Maximum]
- **Speed**: [N] ft.

| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| 10  | 10  | 10  | 10  | 10  | 10  |

**Challenge**: [CR] ([XP] XP)

### Actions
**[Attack Name]**: +[N] to hit, [damage] damage.
```

Update after:
- NPC introduction (add stat block)
- Combat (current HP, conditions)
- Death or departure (remove or mark deceased)

## Applying Mechanics Narratively

### D20 Tests

When a player attempts something uncertain:

1. **Determine the ability and skill** - What approach are they using?
2. **Set the DC** - Easy (10), Medium (15), Hard (20), Very Hard (25)
3. **Roll and narrate** - Describe the outcome, not just success/failure

**Example Flow**:
> Player: "I want to convince the guard to let us through."
>
> GM thinks: Charisma (Persuasion) check. The guard is suspicious but not hostile. DC 15.
>
> GM: "The guard eyes you warily. Roll Persuasion to find the right words."
>
> [Roll: 1d20+5 = 17]
>
> GM: "Your calm demeanor and reasonable tone cut through his suspicion. He sighs, 'Fine, but be quick about it,' and steps aside."

### Combat Flow

Use the encounter template from `d20-combat/references/encounter-template.md` to track:

```markdown
## Active Encounter

### Initiative Order
1. [Name] (Initiative [N]) - [HP] HP
2. [Name] (Initiative [N]) - [HP] HP

### Round [N]
**Current Turn**: [Name]

### Conditions
- [Name]: [Condition] (until [trigger])
```

**Combat Resolution**:
1. Roll initiative when combat starts (1d20 + DEX modifier)
2. On each turn: Movement, Action, Bonus Action (if available)
3. Attack rolls: 1d20 + attack bonus vs AC
4. Damage rolls: Weapon/spell dice + modifier
5. Track HP, conditions, and position

### Spellcasting

When a spell is cast:
1. Verify spell slot availability (or cantrip)
2. Determine if attack roll or saving throw is needed
3. Calculate Spell Save DC = 8 + proficiency + spellcasting modifier
4. Roll damage or apply effect
5. Update spell slots in player.md

### Skill Challenges

For extended challenges (chases, negotiations, heists):
- Require multiple successes before failures
- Typical: 3 successes needed, 3 failures end the attempt
- Let different characters contribute different skills
- Each roll should advance the narrative

### Death and Dying

Death saves are among the most tense moments in gameplay. Handle them with appropriate gravity.

**Running Death Saves**
- Describe the struggle: "Your vision dims. You feel yourself slipping away..."
- Build tension with each roll: successes show fight, failures show fading
- On natural 20: Make the revival dramatic—a gasp, eyes snapping open
- On third failure: Give the moment weight; don't rush past character death

**Narrating Damage**
- Bloodied (≤50% HP): Visible signs of wear—labored breathing, wounds, fatigue
- Near death (<25% HP): Desperate, barely standing
- Massive hits: Describe the impact, not just the numbers

**Stabilizing Allies**
- DC 10 Medicine check takes an action—describe the urgency
- A stabilized ally is safe but unconscious; they need healing to rejoin

### Awarding Heroic Inspiration

Heroic Inspiration is your tool to reward great play. Award it when players:

**Act Heroically**
- Take significant risks to help others
- Sacrifice personal advantage for the group
- Face danger despite fear or consequence

**Stay In Character**
- Make decisions true to their character's personality, even when suboptimal
- Roleplay their flaws, bonds, or ideals meaningfully
- React authentically to story moments

**Enhance the Game**
- Come up with creative solutions you didn't anticipate
- Make everyone laugh or create memorable moments
- Drive the narrative forward in interesting ways

**Timing Tips**
- Award immediately after the inspiring moment (don't wait)
- If the player already has Heroic Inspiration, remind them they can gift it to another player
- Don't be stingy—regular awards encourage the behavior you want to see
- Aim for roughly once per session per player, more for exceptional play

### Awarding Experience

Experience Points represent growth through overcoming challenges. Critically, **"challenge" means more than combat**.

**What Earns XP**

Characters earn XP for overcoming meaningful challenges, including:

- **Defeating enemies in combat** - The classic source: sum the XP from defeated creature stat blocks, divide by party size
- **Neutralizing threats without fighting** - Clever avoidance, negotiation, trickery, or intimidation that removes a threat deserves the same XP as defeating it
- **Surviving traps and hazards** - A deadly trap overcome is as worthy as a monster defeated
- **Solving puzzles and mysteries** - Mental challenges that advance the story
- **Achieving story objectives** - Rescuing the prisoner, recovering the artifact, reaching the hidden city
- **Social victories** - Winning a contest, convincing the skeptical king, brokering a peace treaty

The key principle: if success required skill, risk, or creativity, it's worth XP.

**Calculating XP Awards**

*Combat encounters*: Sum the XP values from defeated creature stat blocks. Divide the total evenly among all party members who participated.

*Non-combat challenges*: Assign a difficulty level as if it were a combat encounter (Easy, Medium, Hard, or Deadly), then award XP equivalent to a combat of that difficulty for the party's level. Use the XP Budget per Character from the encounter building rules as your guide.

Example: A party of level 3 characters solves a Hard puzzle. A Hard encounter for level 3 is roughly 225 XP per character. Award 225 XP to each party member.

**Milestone Advancement**

Some GMs prefer milestone advancement: characters level up when they achieve significant story goals rather than tracking XP totals.

Benefits of milestones:
- Simpler bookkeeping
- Levels happen at narratively satisfying moments
- Players focus on story rather than XP optimization

If using milestones, level the party after major story beats: completing a quest arc, defeating a significant villain, surviving a major crisis, or reaching a new tier of the campaign.

**Helping Players Level Up**

When a character gains enough XP (or reaches a milestone), guide them through leveling:

1. **Announce the milestone**: "After that harrowing escape, you've all gained enough experience to reach level 4!"
2. **Update player.md**: Increase level, roll or assign new HP, add new features
3. **Make choices together**: If the player needs to pick spells, subclass features, or ability score improvements, discuss options
4. **Narrate the growth**: "Your time in the Shadowfell has sharpened your instincts—you feel faster, more aware."

## Customization Guidance

### House Rules

The d20 system supports common house rule variants. Document any changes in your adventure's CLAUDE.md:

**Critical Hits**: By default, double all damage dice. Variants:
- Max damage + roll (more consistent)
- Roll all dice twice (faster)
- Add a narrative bonus (enemy loses an action, etc.)

**Death Saves**: By default, 3 successes stabilize, 3 failures mean death. Variants:
- Hidden death saves (GM rolls secretly)
- Wounds on failure (lingering injuries)
- Easier recovery (stabilize on single natural 20)

**Inspiration**: By default, a single point for good roleplay. Variants:
- Group inspiration pool
- Multiple inspiration points
- Specific triggers (roleplaying flaws, creative solutions)

### Difficulty Adjustments

**For easier gameplay**:
- Grant advantage more freely
- Use lower DCs (Easy: 8, Medium: 12, Hard: 17)
- Add healing opportunities between encounters
- Reduce enemy HP by 25%

**For harder gameplay**:
- Grant disadvantage for risky actions
- Use higher DCs (Easy: 12, Medium: 17, Hard: 22)
- Limit long rests
- Give enemies tactical advantages

### Narrative-First Mechanics

For lighter mechanical play:
- Use "success with complication" for near-misses
- Allow auto-success on trivial tasks (no rolls for routine actions)
- Group similar rolls (one Stealth check for the party)
- Use passive scores for perception and insight (10 + modifier)

---

## Quick Reference

### Core Formula

**d20 + Ability Modifier + Proficiency Bonus (if proficient) vs DC or AC**

### Ability Modifiers

| Score | Modifier | Score | Modifier |
|-------|----------|-------|----------|
| 1 | -5 | 16-17 | +3 |
| 2-3 | -4 | 18-19 | +4 |
| 4-5 | -3 | 20-21 | +5 |
| 6-7 | -2 | 22-23 | +6 |
| 8-9 | -1 | 24-25 | +7 |
| 10-11 | +0 | 26-27 | +8 |
| 12-13 | +1 | 28-29 | +9 |
| 14-15 | +2 | 30 | +10 |

**Formula**: (Score - 10) / 2, rounded down

### Proficiency Bonus by Level

| Level | Bonus | Level | Bonus |
|-------|-------|-------|-------|
| 1-4 | +2 | 13-16 | +5 |
| 5-8 | +3 | 17-20 | +6 |
| 9-12 | +4 | | |

### Difficulty Class

| Task | DC |
|------|----|
| Very Easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very Hard | 25 |
| Nearly Impossible | 30 |

### Advantage and Disadvantage

- **Advantage**: Roll 2d20, use the higher
- **Disadvantage**: Roll 2d20, use the lower
- Multiple sources don't stack (still only 2d20)
- Advantage and disadvantage cancel out (roll 1d20)

### The 18 Skills

| Skill | Ability | Skill | Ability |
|-------|---------|-------|---------|
| Acrobatics | DEX | Medicine | WIS |
| Animal Handling | WIS | Nature | INT |
| Arcana | INT | Perception | WIS |
| Athletics | STR | Performance | CHA |
| Deception | CHA | Persuasion | CHA |
| History | INT | Religion | INT |
| Insight | WIS | Sleight of Hand | DEX |
| Intimidation | CHA | Stealth | DEX |
| Investigation | INT | Survival | WIS |

### Cover

| Cover | AC/DEX Save Bonus |
|-------|-------------------|
| Half | +2 |
| Three-Quarters | +5 |
| Total | Can't be targeted |

### Critical Hits

Natural 20 on attack roll = Critical Hit
- Roll all damage dice twice
- Add modifiers once
- Example: Longsword crit = 2d8 + STR (not 1d8×2 + STR)

### Damage Types

| Physical | Elemental | Other |
|----------|-----------|-------|
| Bludgeoning | Acid | Force |
| Piercing | Cold | Necrotic |
| Slashing | Fire | Poison |
| | Lightning | Psychic |
| | Thunder | Radiant |

### Resistance, Vulnerability, Immunity

- **Resistance**: Halve damage of that type
- **Vulnerability**: Double damage of that type
- **Immunity**: Take no damage of that type

Order: Apply other modifiers → Resistance (halve) → Vulnerability (double)

### Death Saves

At 0 HP, roll d20 at start of each turn:

| Roll | Result |
|------|--------|
| 1 | Two failures |
| 2-9 | One failure |
| 10-19 | One success |
| 20 | Regain 1 HP, wake up |

Three successes = Stable. Three failures = Death.

### Resting

**Short Rest** (1 hour):
- Spend Hit Dice to heal (roll HD + CON mod per die)
- Some abilities recharge

**Long Rest** (8 hours, 6 sleeping):
- Regain all HP
- Regain spent Hit Dice (up to half total)
- Major abilities recharge
- One per 24 hours

---

## License

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/resources/1781-systems-reference-document-srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License (CC-BY-4.0), available at https://creativecommons.org/licenses/by/4.0/legalcode.
