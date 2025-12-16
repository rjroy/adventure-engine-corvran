# d20 System GM Guidance

This section is merged into your adventure's CLAUDE.md when you run `/d20-system:init`. It provides guidance for running d20-based adventures using SRD 5.2 mechanics.

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

## License

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/resources/1781-systems-reference-document-srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License (CC-BY-4.0), available at https://creativecommons.org/licenses/by/4.0/legalcode.
