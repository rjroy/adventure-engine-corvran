---
name: ap-adversaries
description: This skill should be used when the GM needs to create Apocrypha adversaries, build adversary keyword blocks, design Fear abilities, determine stress thresholds, set adversary tier and difficulty, track adversary stress during encounters, or reference adversary templates and examples for minor, standard, and major tier adversaries.
version: 1.0.0
---

# Apocrypha Adversary Creation Skill

Create adversaries using the keyword system. Adversaries are defined the same way as player characters: by keywords with modifiers. This skill provides templates, tier guidelines, and examples.

**Authoritative Source**: For complete rules, use the `ap-rules` skill. For combat procedures, use the `ap-combat` skill.

## Adversary Structure

Every Apocrypha adversary is defined by:

1. **Keywords**: Same as player characters. Natural-language phrases with modifiers.
2. **Stress threshold**: Total stress the adversary can absorb before defeat.
3. **Fear abilities**: Special capabilities the GM activates by spending Fear tokens.
4. **Tier**: Minor, standard, or major, determining keyword count, threshold, and Fear ability budget.

## Tier Reference

| Tier | Keywords | Stress Threshold | Fear Abilities | Typical Difficulty |
|------|----------|-----------------|----------------|------------|
| Minor | 2-3 | 2-3 | 0-1 (cost 1 each) | 10-14 |
| Standard | 3-4 | 4-6 | 1-2 (cost 1-2 each) | 14-17 |
| Major | 4-6 | 8-12 | 2-4 (cost 1-3 each) | 17-20 |

### Stress Tracking by Tier

- **Minor**: Aggregate stress pool. Single counter toward threshold. GM narrates which capability degrades.
- **Standard and major**: Per-keyword tracking. Stress is allocated to specific keywords, each degrades independently, and total across all keywords counts toward the threshold.

## Creating an Adversary: Step by Step

### Step 1: Define the Concept

What is this adversary? What role does it play in the story? What makes it interesting or threatening?

### Step 2: Choose Tier

| Tier | Use When |
|------|----------|
| Minor | Thugs, wild animals, minor obstacles. Defeated quickly. |
| Standard | Rivals, monsters, meaningful threats. A real fight. |
| Major | Bosses, dragons, nemeses. A defining encounter. |

### Step 3: Write Keywords

Adversary keywords follow the same rules as player keywords:
- Natural-language phrases with modifiers (+1 to +3)
- Each keyword describes a capability, trait, or nature
- Keywords are fixed once introduced; no inventing new capabilities mid-encounter

**Guidelines**:
- Minor: 2-3 keywords at +1 to +2
- Standard: 3-4 keywords at +1 to +3
- Major: 4-6 keywords at +2 to +3

### Step 4: Set Stress Threshold

Choose a threshold within the tier's range. Higher thresholds make the fight longer.

- Minor: 2-3 (one or two successful hits defeats it)
- Standard: 4-6 (requires sustained effort)
- Major: 8-12 (a protracted, dramatic fight)

### Step 5: Set Difficulty

The difficulty is the target number for player rolls against this adversary. The tier's typical range is a starting point; adjust based on the fiction and the specific action.

- Minor: typically 10-14
- Standard: typically 14-17
- Major: typically 17-20

### Step 6: Design Fear Abilities

Fear abilities are special capabilities the GM triggers by spending Fear tokens. The cost is defined per ability when the adversary is created.

**Design guidelines**:
- Each ability should have a clear narrative effect
- Cost should match impact: 1 Fear for tactical effects, 2-3 Fear for dramatic ones
- Abilities should create interesting choices, not remove player agency

**Good Fear abilities**:
- Inflict stress on specific keyword types
- Change the battlefield or environment
- Call reinforcements or allies
- Create narrative complications
- Force the player to react

**Avoid**:
- Effects with no counterplay
- Removing player choice entirely
- Effects that bypass the stress system

### Step 7: Record the Adversary

Write the adversary's keyword block into `world.md` when introducing a significant adversary. Minor adversaries encountered once can be narrated inline.

Use `references/adversary-template.md` for the format.

## Adversary Keyword Design

### Keyword Quality

Adversary keywords should evoke the creature's nature and suggest how it fights:

Good: "Ancient Terror of the Skies (+3)" tells you this is a flying predator that has dominated its territory for ages.

Bad: "Strong (+2)" tells you nothing about the adversary's nature or how to narrate its actions.

### Keyword Coverage

Keywords should cover the adversary's main capabilities:
- How it fights (offensive)
- How it defends (defensive or evasive)
- What makes it special (unique trait)
- What drives it (motivation, for major adversaries)

### Stressed Keyword Narration

When an adversary keyword takes stress, narrate the degradation:
- "Pack Tactics (+2)" at 1 stress: the coordination falters, wolves bumping into each other
- "Impenetrable Scales (+3)" at 2 stress: cracks appear, showing vulnerable flesh
- "Ancient Terror of the Skies (+3)" at 3 stress: one wing drags, flight is labored

## Using the Dice Tool

Adversaries don't roll in Apocrypha (player-rolls-everything), but the GM uses difficulty numbers derived from the adversary's tier. The player rolls against these difficulties.

**Player attacking a standard adversary (difficulty 14, keyword +2)**:
```json
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 2, "threshold": 14 }
```

## References

- `references/adversary-template.md` - Adversary block format
- `references/adversary-examples.md` - One example of each tier (minor, standard, major)
