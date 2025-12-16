---
name: dice-roller
description: Provides deterministic dice rolling for RPG mechanics. Use when the adventure has a System.md that defines RPG rules requiring dice rolls for resolution.
---

# Dice Roller Skill

This skill provides a bash script for rolling dice in RPG adventures.

## Setup

Adventure projects that use dice rolling need a copy of `roll.sh` in their `scripts/` directory:

```bash
# From the adventure project root
mkdir -p scripts
cp {corvran-plugin-path}/skills/dice-roller/scripts/roll.sh scripts/
chmod +x scripts/roll.sh
```

The GM expects the script at `./scripts/roll.sh` relative to the adventure directory.

## When to Use

Use this skill when:
- The adventure has a `System.md` file defining RPG rules
- You need to resolve actions with dice (skill checks, attacks, damage, etc.)
- The system requires random outcomes that should be deterministic and visible

## How to Roll Dice

Run the dice roller script with a dice expression:

```bash
bash scripts/roll.sh "2d6+3"
```

### Supported Expressions

| Expression | Meaning |
|------------|---------|
| `1d20` | Roll one 20-sided die |
| `2d6` | Roll two 6-sided dice, sum them |
| `1d20+5` | Roll d20, add 5 |
| `3d8-2` | Roll 3d8, subtract 2 |
| `4dF` | Roll 4 Fudge dice (-1, 0, +1 each) |

### Output Format

The script outputs JSON:

```json
{
  "expression": "2d6+3",
  "rolls": [4, 2],
  "modifier": 3,
  "total": 9
}
```

## Integration with RPG Systems

When an adventure has a `System.md`, use dice rolls for:

1. **Skill Checks**: Roll per system rules, compare to difficulty
2. **Attack Rolls**: Roll to hit, then roll damage if successful
3. **Saving Throws**: Roll to resist effects
4. **Initiative**: Roll to determine turn order in combat

Always narrate the outcome - the player sees your narrative, not the raw dice output.

## Example Usage

**Skill Check (d20 system)**:
```
Player: "I try to pick the lock"
GM: *rolls* bash scripts/roll.sh "1d20+5"
Output: {"expression": "1d20+5", "rolls": [14], "modifier": 5, "total": 19}
GM narrates: "Your nimble fingers work the tumblers. With a satisfying click, the lock yields to your expertise."
```

**Damage Roll**:
```
GM: *rolls damage* bash scripts/roll.sh "2d6+3"
Output: {"expression": "2d6+3", "rolls": [5, 4], "modifier": 3, "total": 12}
GM narrates: "Your sword bites deep, dealing 12 damage to the goblin."
```
