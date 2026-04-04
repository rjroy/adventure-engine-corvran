---
name: ap-players
description: This skill should be used when the GM needs to help players create Apocrypha characters, define keywords with scoping and exclusions, handle character advancement and level-up, manage keyword splitting or retirement, track progression milestones, set up rest and recovery scenes, or reference character sheet and story templates.
version: 1.0.0
---

# Apocrypha Character Creation and Advancement Skill

Guide players through creating and advancing Apocrypha characters. Character creation is a conversation, not a menu. There are no classes, ancestries, or predefined features to select from.

**Authoritative Source**: For complete rules, use the `ap-rules` skill.

## Character Creation Overview

Character creation is a conversation between the player and the GM. Walk through these steps in order:

### Step 1: "Who are you?"

Name, concept, the kind of person the player wants to inhabit. This is freeform. There are no classes or archetypes to constrain the answer.

### Step 2: "What can you do?"

Capabilities, training, talents. The answer becomes the first keyword. Help the player phrase it as a natural-language phrase that captures a specific capability.

Good: "Pyromancer's Fury", "Self-taught Hedge Witch", "Silver-tongued when Cornered"
Bad: "Good at stuff", "Fighter", "Smart"

### Step 3: "What have you survived?"

History, scars, formative events. The answer becomes the second keyword. This keyword grounds the character in their past.

Good: "Scarred Veteran of the Northern Wars", "Survivor of the Plague Year", "Escaped Slave of the Obsidian Mines"
Bad: "Had a hard life", "Tough", "Experienced"

### Step 4: "What drives you?"

Goals, fears, obligations. The answer becomes the third keyword. This keyword points the character toward the future.

Good: "Oath-bound to the Fallen Queen", "Hunted by the Guild of Shadows", "Desperate to Prove My Father Wrong"
Bad: "Wants revenge", "Motivated", "Brave"

### Step 5: Scope Each Keyword

For each keyword, define together:
- **Positive scope**: Specific situations where the keyword applies
- **Exclusions**: Situations where it explicitly does not apply

Broad keywords need broad exclusions. Narrow keywords are self-scoping. See the scoping guidelines below.

### Step 6: Assign Modifiers

Starting modifier budget is 4, distributed across 3 keywords with minimum +1 each. The only valid distribution:
- One keyword at +2 (the character's defining trait)
- Two keywords at +1

### Step 7: Set the Opening Scene

Build the world outward from the character's keywords. If the character is a "Scarred Veteran of the Northern Wars," the world has a north, and it had wars. Open with a specific place, sensory detail, and an immediate hook.

## Keyword Scoping Guidelines

### Broad Keywords

A keyword like "Good with People" could apply to almost any social situation. It needs extensive exclusions:

**Applies When**: Persuading individuals in conversation, reading someone's emotional state, defusing tense social situations

**Does NOT Apply**: Commanding groups or armies, written communication, intimidation through threat of violence, deceiving someone who knows you well, political maneuvering

### Narrow Keywords

A keyword like "Commander of the Thornwall Garrison" is inherently specific:

**Applies When**: Military tactics, commanding soldiers, defending fortified positions, knowledge of the Thornwall region

**Does NOT Apply**: Naval warfare, court politics

### The Scoping Principle

- Only apply a keyword when the action clearly falls within its positive scope
- When scope is unclear, default to NOT applying the bonus
- Keywords are bounded permissions, not general traits
- Exclusions prevent the keyword's applicability from gradually expanding beyond its intended scope

## Recording the Character

Write character data to `character.md` using the Apocrypha template:

```
references/sheet-template.md
```

For a completed example, see:
```
references/sheet-example.md
```

## Progression

### When to Level Up

Characters level up on major narrative milestones: completing an act, resolving a defining conflict, surviving a transformative ordeal. The GM and player agree when a milestone has the weight to justify leveling.

There is no formula. Not every scene or encounter qualifies. The three-act structure (introduce, complicate, resolve) is a useful frame for recognizing when growth has been earned, but it is not prescriptive.

### Level-Up Rewards

On level-up, the character gains:

1. **Up to 3 new keywords at +1**: New keywords must emerge from the story just completed. "I survived the Siege of Thornwall" becomes "Siege Survivor (+1)." The player proposes, the GM confirms they're grounded in the fiction.

2. **Keyword deepening**: Any existing keyword can increase its modifier by 1 (max +3) if the story provided a narrative milestone for it. Deepening is separate from the 3 new keyword slots.

3. **Keyword splitting**: A keyword can split into two more specific keywords. "Scarred Veteran (+2)" becomes "Battlefield Commander (+2)" and "Old Wounds (+1)". The combined modifier must not exceed the original plus one. A split uses one of the 3 new keyword slots.

### Keyword Count Limits

Maximum keywords = 3 per level:
- Level 1: 3 keywords
- Level 2: 6 keywords
- Level 3: 9 keywords
- Level 6: 18 keywords

### Keyword Retirement

A keyword that no longer fits the character's arc can be removed at any level-up, freeing a slot. Retired keywords should be narratively acknowledged: the character has moved past that part of themselves.

## Rest and Recovery

### Rest

Rest clears all light stress. Requires a scene of downtime: making camp, visiting a tavern, a quiet moment between crises. The GM narrates the rest and may use it as a character development moment.

### Deep Stress Resolution

Deep stress clears only through narrative resolution. The player and GM play a scene that directly addresses the source of the stress. The scene must be genuine, not a passing mention. Both agree when the deep stress is resolved.

### Montage

A montage (passage of time between story beats) clears all light stress and resets Hope to 1 and Fear to 1. Montages do not clear deep stress. Deep stress persists until addressed.

## Story Tracking

Use `references/story-template.md` to track narrative elements: current act, scene, objectives, story arcs, and recent events. This is separate from the character sheet.

## References

- `references/sheet-template.md` - Blank character sheet template
- `references/sheet-example.md` - Completed Level 1 example character
- `references/story-template.md` - Story tracking template
