---
name: ap-rules
description: This skill should be used when the GM needs to look up Apocrypha rules, check how a mechanic works, verify dice resolution, understand the hope/fear economy, reference stress rules, check keyword scoping, look up rest and recovery, understand progression and leveling, review session and act structure, or get GM guidelines for running Apocrypha.
version: 1.0.0
---

# Apocrypha Rules Reference

Complete rules reference for the Apocrypha RPG system. Apocrypha is an original system with no external SRD. This skill IS the authoritative rules source.

## Dice Resolution

Resolution uses 2d12 labeled "hope" and "fear", plus the applicable keyword modifier, compared against a GM-set difficulty.

### Difficulty Scale

| Difficulty | Target | Guideline |
|------------|--------|-----------|
| Routine | 10 | Most competent people could do this |
| Moderate | 14 | Requires real skill or effort |
| Hard | 17 | Serious challenge even for the skilled |
| Desperate | 20 | Nearly impossible without mastery |

The GM declares difficulty and stakes before the roll. The player knows what they're up against and can negotiate stakes before committing.

### Four Outcomes

| Outcome | Condition | Token Effect | Narrative |
|---------|-----------|--------------|-----------|
| Success with Hope | Total >= difficulty, hope die higher | Player gains Hope | Clean success, no complications |
| Success with Fear | Total >= difficulty, fear die higher | GM gains Fear | Success with a complication or cost |
| Failure with Hope | Total < difficulty, hope die higher | Player may gain Hope | Failure, but gain something: info, positioning, or a Hope token |
| Failure with Fear | Total < difficulty, fear die higher | GM gains Fear | Hard failure, something gets worse |

### Criticals

On doubles (both dice show the same number), the result is a critical. No tokens are generated in either direction.

- **Critical success**: The outcome exceeds what was attempted. The extraordinary result IS the reward.
- **Critical failure**: The situation shifts fundamentally. The dramatic consequences ARE the punishment.

Criticals affect the fiction, not the token budget.

### No Keyword Applicable

When no keyword applies to a situation, the character rolls with +0. This makes keyword relevance a real tactical question, not flavor.

### Dice Tool Usage

```json
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 2, "threshold": 14 }
```

After every roll, compare the hope and fear die values: "Hope die 9, Fear die 4, total 15 vs difficulty 14. Success with Hope."

## Keywords

Keywords are natural-language phrases with numeric modifiers that define what a character is, knows, or can do.

### Keyword Structure

Each keyword has:
- **Name**: A natural-language phrase (e.g., "Scarred Veteran of the Northern Wars")
- **Modifier**: +1 (competent), +2 (strong), +3 (defining)
- **Origin**: How the character acquired it
- **Positive scope**: When it applies
- **Exclusions**: When it explicitly does not apply

### Scoping Rules

- Broad keywords ("Good with People") require broad exclusions
- Narrow keywords ("Commander of the Thornwall Garrison") are self-scoping and need minimal exclusions
- Only apply a keyword when the action clearly falls within its positive scope
- When scope is unclear, default to NOT applying the bonus

### Keyword Count

Maximum keywords = 3 per level. Level 1 = 3 keywords. Level 6 = 18 keywords.

### Keyword Splitting

Keywords can split as characters develop. "Scarred Veteran (+2)" might evolve into "Battlefield Commander (+2)" and "Old Wounds (+1)". The combined modifier of the new keywords must not exceed the original modifier plus one. A split uses one of the 3 new keyword slots gained on level-up.

### Keyword Retirement

A keyword that no longer fits the character's arc can be removed, freeing a slot. Retired keywords should be narratively acknowledged.

## Hope/Fear Economy

### Hope (Player Resource)

| Aspect | Details |
|--------|---------|
| Maximum | 6 tokens |
| Gained | When hope die is higher on non-critical rolls |
| Not gained | On critical rolls (doubles) |

**Spending Hope:**
- Reroll one die (1 Hope)
- Clear one level of light stress from a keyword (1 Hope)
- Force a narrative moment: declare something true about the scene that the GM must honor, within reason (2 Hope)

### Fear (GM Resource)

| Aspect | Details |
|--------|---------|
| Maximum | 12 tokens |
| Gained | When fear die is higher on non-critical rolls |
| Not gained | On critical rolls (doubles) |
| Tracked in | `adventure.md` frontmatter |

**Spending Fear:**
- Inflict light stress on a keyword (1 Fear)
- Inflict deep stress on a keyword (2 Fear)
- Introduce a complication outside of a roll (1 Fear)
- Activate an adversary's Fear ability (cost per ability)
- Interrupt the current scene with an external threat (3 Fear)

### Token Economy Principle

Token spending is always narrated in the fiction. "The dragon's flames wash over you, and for a moment your fire falters" (spending 2 Fear to deep-stress Pyromancer's Fury), not "I spend 2 Fear to stress your keyword."

A Fear pool above 6 that isn't being spent is a missed narrative beat. Spend Fear actively.

## Stress System

Consequences target specific keywords, not abstract hit points.

### Stress Levels

| Level | Modifier Impact | Clearing |
|-------|----------------|----------|
| Light stress | -1 to effective modifier | Rest (scene of downtime) or 1 Hope |
| Deep stress | -2 to effective modifier | Narrative resolution scene addressing the source |

### Stress Stacking

Stress stacks to a maximum of -3 per keyword (light + deep). A keyword at +1 with both light and deep stress has effective modifier -2. Negative effective modifiers are valid: the keyword actively works against the character.

When a keyword at -3 would take additional stress, target a different keyword instead. The GM narrates the connection: a fourth sword blow doesn't stress "Cutthroat Reflexes" again; it breaks the character's arm, stressing "Mechanical Wiz" because you can't tinker without both hands.

### Crisis

A character is in crisis when more than half their keywords have negative effective modifiers. Crisis is a narrative turning point: the character is breaking down, overwhelmed. It is not a mechanical state with additional rules.

### Death

Death is always a player choice, never a mechanical inevitability. Crisis is the floor. The GM cannot stress a character into a death state. This keeps the GM willing to spend Fear on stress freely.

### Dealing Stress to Adversaries

When a player succeeds on an action against an adversary:
- **Success with Hope**: 2 stress to the adversary
- **Success with Fear**: 1 stress to the adversary

When an adversary's total accumulated stress meets or exceeds its stress threshold, it is defeated. Defeat means death, surrender, retreat, or incapacitation, as the fiction determines.

Stressed adversary keywords lose effectiveness the same way player keywords do.

### Dealing Stress to Players

Player keywords take stress through two channels:
- **Fear spending**: The GM spends Fear tokens to stress a keyword (budget-constrained)
- **Failure consequences**: On a failed roll, the GM may narrate keyword stress as part of the failure (no Fear cost; the roll is the cost)

The GM chooses which keyword to stress based on what makes narrative sense. Combat stress targets action-oriented keywords. Social failure targets identity and relationship keywords.

## Rest and Recovery

### Rest

Rest clears all light stress. Requires a scene of downtime: making camp, visiting a tavern, a quiet moment between crises.

### Deep Stress Resolution

Deep stress clears only through narrative resolution. The player and GM play a scene that directly addresses the source of the stress. Deep stress resolution is collaborative judgment: both agree when the scene has adequately addressed the source. Clearing deep stress too easily undermines the system's tension. Require a genuine scene, not a passing mention.

### Montage

A montage (passage of time between story beats) clears all light stress and resets Hope to 1 and Fear to 1. Montages do not clear deep stress.

## Progression

### Level-Up

Characters level up when the story earns it. A level-up is a major narrative milestone: completing an act, resolving a defining conflict, surviving a transformative ordeal. The GM and player agree when a milestone has the weight to justify leveling.

There is no fixed formula. A bar fight is just a scene. Escorting the stolen chalice through a gauntlet to reach the church before midnight is a milestone.

### Level-Up Rewards

On level-up, the character gains:
- Up to 3 new keywords at +1, emerging from the story just completed
- Any existing keywords can deepen (+1 to modifier, max +3) if the story provided a narrative milestone for that keyword
- Keywords can split (uses one of the 3 new slots)

### Starting Characters

Level 1 characters have 3 keywords with a starting modifier budget of 4 (one at +2, two at +1).

## Session and Act Structure

### Scenes

A session is 3-7 scenes. Each scene has a dramatic question. The scene ends when the question is answered.

### Acts

An act spans multiple sessions (typically 2-5). The act's dramatic question is larger than any single scene's. The GM tracks the act's question and drives toward resolution.

### Act Retrospective

At the end of an act, the GM and player do a brief retrospective: what happened, what changed, which keywords earned growth. The summary becomes part of `history.md`.

### Session Recap

At the start of each session, present a recap. The player can correct or amend it. This refreshes context, catches drift, and gives the player agency over what's remembered.

## GM Guidelines

- Never narrate player character actions, emotions, or decisions
- Bias toward reusing established world elements over introducing new ones
- When the fiction calls for passage of time, use a montage rather than narrating low-stakes filler
- When introducing a significant adversary, write its keyword block into `world.md`
- Spend Fear actively; unspent Fear is a missed narrative beat
- Choose which keyword to stress based on narrative sense, not mechanical optimization
- Adversary keywords are fixed at introduction; do not invent new capabilities mid-encounter

## Quick Reference

See `references/quick-reference.md` for a condensed one-page summary of resolution, outcomes, and stress.
