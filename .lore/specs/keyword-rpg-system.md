---
title: Keyword RPG System
date: 2026-04-03
status: draft
tags: [rpg-system, keyword, game-design, plugin, hallucination-resistant]
modules: [plugins]
related: [.lore/research/llm-optimized-rpg-systems.md, .lore/research/llm-integration-notes-daggerheart.md, .lore/specs/adventure-system-integration.md, .lore/specs/engine-dice-tool.md]
req-prefix: KW
---

# Spec: Keyword RPG System

## Overview

A rules-light RPG system designed from the ground up for LLM game masters. Characters are defined entirely by natural-language keywords with numeric modifiers. There are no classes, no spell lists, no predefined features, no canonical content for the LLM to hallucinate about. The LLM's creative interpretation of keywords IS the mechanic.

The system uses 2d6 with a hope/fear duality for resolution, a token economy that gives the GM mechanical permission to create adversity, keyword-targeted stress as the consequence system, and act-based progression tied to narrative structure.

Working title: TBD. Referred to as "the keyword system" throughout this spec.
USER NOTE: title: Apocrypha 

## Entry Points

- Player selects this system when creating an adventure (`system: keyword` in `adventure.md` frontmatter)
- Follows plugin architecture defined in [Spec: adventure-system-integration]

## Requirements

### Core Philosophy

- REQ-KW-1: Characters are defined entirely by keywords. No classes, no class features, no spell lists, no canonical content exists in the system. Every character is bespoke.

- REQ-KW-2: Keywords are natural-language phrases with numeric modifiers. A keyword describes something the character is, knows, or can do. Examples: "Scarred Veteran of the Northern Wars (+2)", "Self-taught Hedge Witch (+1)", "Silver-tongued when Cornered (+1)".

- REQ-KW-3: When a keyword applies to a situation, the LLM interprets how it manifests in the fiction. That interpretation is always valid because there is no canonical definition to contradict. "Pyromancer's Fury" on a combat roll manifests as flame. On an intimidation check, it manifests as barely contained heat in the character's eyes. The keyword's fiction is situational and context-dependent.

- REQ-KW-4: The system has no content for the LLM to look up, remember, or misquote. All rules fit in a single bootstrap document. The entire system prompt overhead is the mechanics, not reference material.

### Keywords

- REQ-KW-5: Each keyword has: a name (natural-language phrase), a modifier (+1 to +3), a narrative origin (how the character acquired it), a positive scope (when it applies), and explicit exclusions (when it does not apply). This is the bounded constraint format from the Daggerheart Experience research applied to every keyword. Exclusions prevent authority drift more effectively than inclusions alone.

- REQ-KW-6: A keyword's modifier represents depth of mastery. +1 is competent, +2 is strong, +3 is defining. New keywords start at +1. Modifiers grow through narrative milestones: completing a trial, surviving a crisis, or achieving a goal tied to that keyword.

- REQ-KW-7: Keywords that are broad ("Good with People") must have correspondingly broad exclusions. Keywords that are narrow ("Commander of the Thornwall Garrison") are self-scoping and need minimal exclusion lists. The narrower the keyword, the shorter the scope definition can be.

- REQ-KW-8: When no keyword applies to a situation, the character rolls with +0. This makes keyword relevance a real tactical question, not flavor.

- REQ-KW-9: A character's maximum keyword count is 3 per level. Level 1 characters have up to 3 keywords. Level 6 has up to 18. Level 18 has up to 54.

- REQ-KW-10: Keywords can split as characters develop. "Scarred Veteran (+2)" might evolve into "Battlefield Commander (+2)" and "Old Wounds (+1)" when the fiction supports it. Splitting replaces the original keyword with two more specific ones. The combined modifier of the new keywords must not exceed the original modifier plus one (the split itself is a growth moment).

- REQ-KW-11: Keywords can be retired. A keyword that no longer fits the character's arc can be removed, freeing a slot. Retired keywords should be narratively acknowledged: the character has moved past that part of themselves.

### Dice Resolution

- REQ-KW-12: Resolution uses 2d6 labeled "hope" and "fear", plus the applicable keyword's modifier, compared against a difficulty set by the GM. The engine dice tool (`mcp__corvran__roll_dice`) handles the roll and returns which die rolled higher.

> USER NOTE: 2d6 is going to result in too many crtical successes. There's a reason Daggerheart uses 2d12. We should use the same. This will also change the difficulty scale of REQ-KW-13.

- REQ-KW-13: Difficulty scale:
  - Routine (6): Most competent people could do this
  - Moderate (8): Requires real skill or effort
  - Hard (10): Serious challenge even for the skilled
  - Desperate (12): Nearly impossible without mastery

  The GM declares difficulty before the roll. The player knows what they're up against.

- REQ-KW-14: Four outcomes based on success/failure crossed with hope/fear:
  - **Success with Hope** (meets difficulty, hope die higher): Clean success. Player gains a Hope token. Narrate without complications.
  - **Success with Fear** (meets difficulty, fear die higher): Success, but the GM gains a Fear token and narrates a complication, cost, or consequence alongside the success.
  - **Failure with Hope** (below difficulty, hope die higher): Failure, but the character gains something (information, positioning, or a Hope token). The failure isn't total.
  - **Failure with Fear** (below difficulty, fear die higher): Hard failure. GM gains a Fear token. Something gets worse beyond the failed action.

- REQ-KW-15: On ties between the hope and fear dice, the player chooses which token is generated.
> USER NOTE: Isn't a "tie" the same as "doubles"? This a conflict and confusiong with REQ-KW-16

- REQ-KW-16: On doubles (both dice show the same number), the result is a critical. Doubles supersede the tie rule (REQ-KW-15): the token type is determined by the critical outcome, not player choice. If the roll succeeds, it's an extraordinary success: the player gains a Hope token AND achieves something beyond what was attempted. If the roll fails, it's a dramatic failure: the GM gains a Fear token AND the situation shifts fundamentally.

> **OPEN: Doubles token interaction.** On a critical success, the player gains Hope (from the critical). Should they also gain a second token from the normal hope/fear flow, or does the critical replace it entirely? Current intent: the critical replaces it. One token per roll, critical just makes the outcome bigger. 
> USER NOTE: I'm not sure how this is not just a roll? My suggestion for this is simple. No tokens gained at all. Critical success is the reward. By trying to call a `tie` and `double` different things even though they are the same you have confused the situation. So as I said, critical success is the reward, no tokens.

- REQ-KW-17: The GM declares stakes before every roll: what success looks like, what failure risks. This makes the GM's judgment visible and challengeable. The player can negotiate stakes before committing to the roll.

### Hope/Fear Economy

- REQ-KW-18: Hope is a player resource. Maximum 6 tokens. Gained when the hope die is higher on a roll or on critical successes. Hope can be spent to:
  - Reroll one die (1 Hope)
  - Clear one level of light stress from a keyword (1 Hope)
  - Force a narrative moment: declare something true about the scene that the GM must honor, within reason (2 Hope)

- REQ-KW-19: Fear is a GM resource. Maximum 12 tokens. Gained when the fear die is higher on a roll or on critical failures. Fear can be spent to:
  - Inflict light stress on a keyword (1 Fear)
  - Inflict deep stress on a keyword (2 Fear)
  - Introduce a complication outside of a roll (1 Fear)
  - Activate an adversary's Fear ability (cost defined per ability)
  - Interrupt the current scene with an external threat (3 Fear)

- REQ-KW-20: The token economy gives the LLM mechanical permission to create adversity. "I have 4 Fear, I'm spending 2 to inflict deep stress on your Pyromancer's Fury" is a concrete, budget-constrained action. The LLM doesn't have to judge whether it's being fair. The budget IS the fairness.

> USER NOTE: It's important for these to not just be mechanical, but add to the narrative.

- REQ-KW-21: The GM should spend Fear actively. A Fear pool above 6 that isn't being spent is a missed narrative beat. The bootstrap instructs the GM to look for opportunities to spend Fear on complications, stress, and adversary abilities.

> **OPEN: Where does Fear live?** Fear is a GM (session-level) resource, not a player resource. It doesn't belong on the character sheet. Options:
> 1. **In the conversation.** The GM tracks Fear in its working memory. Simple, but risks the LLM losing count over long sessions.
> 2. **In `adventure.md` frontmatter.** Session-level state like Fear count persists between messages. The engine could track it here alongside mood.
> 3. **In `history.md`.** Appended as part of the session state.
>
> Leaning toward option 2 (adventure.md frontmatter). It's already where the mood system persists session state. Fear is session state, not character state.
> USER NOTE: That's a good place for it.

### Stress System

- REQ-KW-22: Consequences target specific keywords, not abstract hit points. When a keyword takes stress, its effective modifier is reduced. Stress is narratively grounded: stress on "Pyromancer's Fury" means something about the character's relationship with fire is shaken.

- REQ-KW-23: Two stress levels:
  - **Light stress** (-1 to effective modifier): The keyword is shaken but usable. Clears with rest (a scene of downtime) or by spending 1 Hope.
  - **Deep stress** (-2 to effective modifier): The keyword is seriously compromised. Clears only through narrative resolution: a scene that directly addresses what shook the keyword. The player and GM agree when deep stress is resolved.

- REQ-KW-24: Stress stacks. A keyword can accumulate both light and deep stress simultaneously (total -3 to effective modifier). A keyword at +1 with both light and deep stress has an effective modifier of -2. Negative modifiers are valid: the keyword is actively working against the character. "Pyromancer's Fury" at -2 means the fire is uncontrolled, volatile. You can still invoke it, but you're rolling at a penalty.

- REQ-KW-25: A character is in crisis when more than half their keywords have negative effective modifiers. The GM narrates this as a turning point: the character is breaking down, overwhelmed, at their limit. Crisis is a narrative signal, not a mechanical state with additional rules.

- REQ-KW-26: The GM chooses which keyword to stress based on what makes narrative sense. Combat stress targets action-oriented keywords. Social failure targets identity and relationship keywords. The choice follows the fiction, not mechanical optimization.

> **OPEN: Player character defeat.** The system needs a budget-constrained answer to "can this character die?" Crisis (REQ-KW-25) is explicitly not a mechanical state. But if ALL keywords are at negative effective modifiers, the character is non-functional. Options:
> 1. **Defeat trigger**: When all keywords are negative, the character is defeated. Player and GM negotiate the outcome: death, capture, transformation, or retreat. The player always chooses whether death is on the table.
> 2. **No mechanical defeat**: Crisis is the floor. The GM can't stress a character into a death state. Death only happens when the player opts into it as a dramatic choice (borrowing Daggerheart's "death is a player decision" model).
> 3. **Graduated defeat**: Crisis triggers a "last stand" moment where the character gets one final action at full keyword values before the outcome is determined.
>
> Leaning toward option 2: death is always a player choice, not a mechanical inevitability. The stress system creates pressure and narrative consequence, but the terminal state is collaborative. This is consistent with Vision Principle 3 (player agency is sacred).
> USER NOTE: I completely agree. Option 2. Besides, if we don't do this I suspect the GM will be reluctant to even cause stress.

> **OPEN: Stress stacking cap.** Can a keyword that already has both light and deep stress (-3 total) be stressed further? Current spec is silent. Proposal: -3 is the floor. Additional stress on a maxed keyword has no further mechanical effect but should be narrated as compounding pressure. The GM should target unstressed keywords instead, spreading the pain.
> USER NOTE: I think just having these two is sufficient. Couple this with a max of `+3` on a keyword. It makes sense to me. When a player starts to have "too many" and the GM spreads it out, that's fine. Just find a way for it to make sense. Why is your "mechanical wiz" keyword effected when you got hit with the bat for the fourth time? Because it broke your arm. Hard to be a mechanical wiz without full use of your arms.

### Dealing Stress to Adversaries

- REQ-KW-27: When a player succeeds on an action against an adversary, the adversary takes stress on one of its keywords. The GM chooses which keyword based on the fiction.
  - Success with Hope: 2 stress to the adversary
  - Success with Fear: 1 stress to the adversary

- REQ-KW-28: When an adversary's total accumulated stress meets or exceeds its stress threshold, it is defeated. The fiction determines what defeat looks like: death, surrender, retreat, or incapacitation.

- REQ-KW-29: Stressed adversary keywords lose effectiveness the same way player keywords do. A bandit with "Pack Tactics (+2)" at 1 stress fights at effective +1. The adversary degrades narratively as it takes damage.

> **OPEN: Adversary stress tracking model.** Two interpretations exist and the spec needs to pick one:
> 1. **Per-keyword tracking** (like player characters): Stress is allocated to specific adversary keywords. Each keyword degrades independently. Total stress across all keywords counts toward the threshold. The adversary block needs per-keyword stress markers.
> 2. **Aggregate pool**: Stress threshold is a single damage counter. Keyword degradation is a narrative overlay: the GM narrates which keyword is affected, but mechanically it's just a number ticking up.
>
> Per-keyword tracking is more consistent with how player stress works and makes adversary degradation feel real (their +3 keyword dropping to +1 mid-fight changes the fiction). But it's more tracking for the LLM to manage. For minor adversaries (2-3 stress threshold), aggregate is fine. For major adversaries (8-12 stress), per-keyword matters.
>
> Proposal: Per-keyword for standard and major adversaries. Aggregate for minor adversaries (they go down too fast for keyword degradation to matter).
> USER NOTE: Your proposal is sound.

### Dealing Stress to Players

- REQ-KW-30: Player keywords take stress through two channels:
  - **Fear spending**: The GM spends Fear tokens to stress a keyword (per REQ-KW-19). This is proactive and budget-constrained.
  - **Failure consequences**: When a player fails a roll, the GM may narrate stress on a keyword as part of the failure. This does not cost Fear. The roll itself is the cost.

- REQ-KW-31: Adversaries can also deal stress through their Fear abilities (per REQ-KW-19, activated by GM spending Fear). An adversary with "Terrifying Roar (1 Fear): inflict light stress on a courage or resolve keyword" gives the GM a specific, constrained way to threaten the player.

### Combat Procedure

> **OPEN: How do adversaries act?** The spec defines what player rolls produce and what tokens buy, but never defines the adversary's "turn." Three models:
>
> **Model A: Player-rolls-everything (PbtA-style).** The player always rolls. There are no "adversary turns." When the player acts against an adversary, they roll. On success, the adversary takes stress. On failure, the adversary's response IS the failure consequence (the GM narrates the adversary attacking, the environment shifting, etc.). Adversary Fear abilities are activated by GM spending Fear at any point, not on a "turn." This is the simplest model and the most LLM-friendly: the GM never needs to track initiative or turn order.
>
> **Model B: Alternating spotlight.** Borrowed from Daggerheart. When a player roll generates Fear or fails, the GM takes spotlight: adversaries act (narrated by the GM, no roll), then spotlight returns to the player. Fear spending happens during GM spotlight. This creates a rhythm but requires the LLM to track whose spotlight it is.
>
> **Model C: Fear-driven adversary actions.** Adversaries can ONLY act when the GM spends Fear. Every adversary action costs at least 1 Fear. No Fear = adversaries are passive, reacting to the player. This makes the economy load-bearing: the adversary's threat is directly proportional to the GM's Fear budget.
>
> Leaning toward **Model A** (player-rolls-everything). It's the simplest, maps naturally to conversation (the player says what they do, rolls, gets a result), and the GM's adversity budget is Fear spending + failure consequences. The adversary doesn't need its own initiative or action economy. This is how PbtA works and it's proven with LLMs.
>
> Sub-question: In Model A, when the player ISN'T acting against the adversary (e.g., trying to pick a lock while a dragon is in the room), does the adversary get to act as a failure consequence? "You fail to pick the lock, and the dragon closes the distance" feels right as a 6- result. The adversary acts THROUGH the player's roll outcomes, not independently.
>
> USER NOTE: I agree the player-rolls-everything. There can be story cases where its necessary for the advesary to surprise the player and they need to react. This would still be a roll by the player. Failure consequences are also a good reason for the GM to spend fear to cause stress.

### Adversaries

- REQ-KW-32: Adversaries are defined by keywords, the same as player characters. A bandit might be "Desperate Cutthroat (+1), Pack Tactics (+2)." A dragon might be "Ancient Terror of the Skies (+3), Impenetrable Scales (+3), Hoard-Madness (+2)."

- REQ-KW-33: Adversary keywords are defined when the adversary is introduced into the fiction. Once written into the world document or narrated on-screen, they are fixed. The GM does not invent new adversary capabilities mid-encounter. If it's not on the sheet, the adversary can't do it.

- REQ-KW-34: Adversary tiers and stress thresholds:
  - **Minor** (a thug, a wild animal): 2-3 keywords, 2-3 stress threshold
  - **Standard** (a rival, a monster): 3-4 keywords, 4-6 stress threshold
  - **Major** (a boss, a dragon, a nemesis): 4-6 keywords, 8-12 stress threshold

- REQ-KW-35: Adversary keywords can include Fear-activated abilities. These are special capabilities the GM triggers by spending Fear. The cost is defined per ability when the adversary is created. Fear ability count and cost should scale with tier:
  - **Minor**: 0-1 Fear abilities, cost 1 Fear each
  - **Standard**: 1-2 Fear abilities, cost 1-2 Fear each
  - **Major**: 2-4 Fear abilities, cost 1-3 Fear each

  Examples:
  - "Terrifying Roar (1 Fear): inflict light stress on a courage-related keyword"
  - "Breath of Ruin (3 Fear): inflict deep stress on one keyword, light stress on another"
  - "Rally the Pack (2 Fear): restore 2 stress to allied minor adversaries"

- REQ-KW-36: When the GM introduces a significant adversary, it writes the adversary's keyword block into `world.md`. This block includes: name, keywords with modifiers, stress threshold, and Fear-activated abilities. Minor adversaries encountered once can be narrated inline without a world document entry.

### Progression

USER NOTE: OKAY ... this is all over complicated. What I was trying to imply by talking about story arcs is that level up is based on story progression. Just gut the math, its confusing you and not the point. Level up happens when it makes sense. A major milestone that has narrative weight. Something that is typically an act in a story. But trying to add all this math into it is completely over doing it. To say again, the point of the 'act' reference is just about a major milestone. Being jumped by thugs is just a scene, unless those thugs are outside the church you are bringing the challice you spent 3 weeks finding and was stolen and must be returned by midnight. 

- REQ-KW-37: Characters level up after completing an act of the story. A complete story arc has three acts. Six complete arcs bring a character from level 1 to level 18.

> **OPEN: Off-by-one in progression math.** Starting at level 1 with 6 arcs x 3 acts = 18 level-ups = level 19, not 18. The character sheet progression log shows level 1 as the starting state (Arc 1, Act "-"), confirming level 1 is pre-arc. Options:
> 1. **Cap is 19.** Accept 19 levels. 19 x 3 = 57 max keywords. A little odd but functional.
> 2. **Cap is 18, start at level 0.** Character creation produces a "level 0" character. First act completion = level 1. Six arcs = 18 acts = level 18. But "level 0" feels bad narratively.
> 3. **The last arc has 2 acts.** Five arcs of 3 acts + one arc of 2 acts = 17 level-ups from level 1 = level 18. The final arc's compressed structure could be a narrative feature (the climactic arc is shorter, more intense).
> 4. **Reframe: 3 keywords per arc, not per level.** Each arc awards 9 keywords (3 per act). Six arcs = 54 keywords. Levels are just the act count (1-18). This changes nothing mechanically but reframes the progression as arc-driven.
>
> The exact number matters less than being internally consistent. Need to pick one and walk through the full progression table.

- REQ-KW-38: Each act has a dramatic question that defines it. Act 1 introduces the question. Act 2 complicates it. Act 3 resolves it. The GM and player agree when an act concludes. This is a collaborative judgment, not a mechanical trigger.

- REQ-KW-39: On level-up, the character gains up to 3 new keywords at +1. New keywords must emerge from the story just completed. "I survived the Siege of Thornwall" becomes "Siege Survivor (+1)." The player proposes keywords, the GM confirms they're grounded in the fiction.

- REQ-KW-40: Between acts, existing keywords can deepen (modifier increases by 1, to a maximum of +3) if the story provided a narrative milestone for that keyword. The player and GM agree on which keywords deepened and why. Deepening is separate from the 3 new keywords gained on level-up.

- REQ-KW-41: Keywords can split during level-up (per REQ-KW-10). A split counts against the 3 new keyword slots: if "Scarred Veteran (+2)" splits into "Battlefield Commander (+2)" and "Old Wounds (+1)", that uses one of the three slots (the original is replaced, and one new keyword is added).

### Character Creation

- REQ-KW-42: Character creation is a conversation between the player and the GM. There is no menu, no selection screen, no list to choose from. The character is built through dialogue.

- REQ-KW-43: The onboarding flow:
  1. "Who are you?" Name, concept, the kind of person the player wants to inhabit.
  2. "What can you do?" Capabilities, training, talents. This becomes the first keyword.
  3. "What have you survived?" History, scars, formative events. This becomes the second keyword.
  4. "What drives you?" Goals, fears, obligations. This becomes the third keyword.
  5. Scope each keyword together: define positive scope and exclusions.
  6. Set the opening scene.

- REQ-KW-44: Starting modifier budget is 4, distributed across 3 keywords with a minimum of +1 each. The only valid distribution is one keyword at +2 and two at +1. The +2 keyword is the character's defining trait.

- REQ-KW-45: The world document starts empty or with minimal setting. The GM builds the world outward from the character's keywords. If the character is a "Scarred Veteran of the Northern Wars," the world has a north, and it had wars. Keywords seed the world.

### Rest and Recovery

- REQ-KW-46: Rest clears all light stress. Rest requires a scene of downtime: making camp, visiting a tavern, a quiet moment between crises. The GM narrates the rest and may use it as a character development moment.

- REQ-KW-47: Deep stress clears only through narrative resolution. The player and GM play a scene that directly addresses the source of the stress. "Pyromancer's Fury" with deep stress requires a scene about the character's relationship with fire, with fear, with whatever shook them. When the scene resolves, the deep stress clears.

- REQ-KW-48: A montage (passage of time between story beats) clears all light stress and resets Hope to 1 and Fear to 1. Montages do not clear deep stress. Deep stress persists until addressed.

> **OPEN: Deep stress resolution criteria.** "The player and GM agree when deep stress is resolved" is intentionally collaborative but gives the LLM no criteria for what "resolved" means. This is probably fine: the system uses collaborative judgment for act conclusions and keyword deepening too. Deep stress recovery IS a narrative mechanic, not a mechanical one. But worth noting: if playtesting reveals the LLM clears deep stress too easily (over-compliance again), a harder constraint might be needed, like "deep stress resolution requires a dedicated scene where the keyword is tested and the player rolls for it."
> USER NOTE: This sounds fair. And feels like we should record this somewhere ... just in the middle of the spec isn't quite right.

### Session and Act Structure

- REQ-KW-49: A session is 3-7 scenes. Each scene has a dramatic question. The scene ends when the question is answered.

- REQ-KW-50: An act spans multiple sessions (typically 2-5). The act's dramatic question is larger than any single scene's. The GM tracks the act's question and drives toward its resolution.

- REQ-KW-51: At the end of an act, the GM and player do a brief retrospective: what happened, what changed, which keywords earned growth. The retrospective summary becomes part of the persistent state in `history.md`.

- REQ-KW-52: At the start of each session, the GM presents a recap. The player can correct or amend it. This refreshes context, catches drift, and gives the player agency over what's remembered.

### GM Guidelines

- REQ-KW-53: The GM never narrates player character actions, emotions, or decisions (Vision Principle 3).

- REQ-KW-54: The GM biases toward reusing established world elements over introducing new ones. Every new element is a consistency obligation. Connecting back to existing fiction is both safer and more satisfying.

- REQ-KW-55: When the fiction calls for passage of time, the GM uses a montage (per REQ-KW-48) rather than narrating low-stakes filler.

## Character Sheet Format

The character sheet lives in `character.md`. Single source of truth for mechanical state.

```markdown
# [Character Name]

## Keywords

### [Keyword Name] (+N)
**Origin**: [How acquired]
**Applies When**: [Specific situations where this keyword is relevant]
**Does NOT Apply**: [Explicit exclusions]

### [Keyword Name] (+N) [Stress: light]
**Origin**: [How acquired]
**Applies When**: [Situations]
**Does NOT Apply**: [Exclusions]

## Tokens

Hope: 2/6

## Level

**Current Level**: [N]
**Current Arc**: [N] / Act [1-3]
**Max Keywords**: [3 x Level]

## Progression Log

| Arc | Act | Level | Keywords Gained | Keywords Deepened |
|-----|-----|-------|-----------------|-------------------|
| 1   | -   | 1     | [starting three] | -                |
| 1   | 1   | 2     | [from act 1]    | [if any]          |

## Notes

### Appearance
[Physical description]

### Personality
[Character behavior]

### Goals
[What the character wants]

### Backstory
[Established through creation conversation]
```

## Adversary Block Format

Written into `world.md` when introduced.

```markdown
## [Adversary Name] ([Tier])

**Stress Threshold**: [N] (Current: [N])

### Keywords
- [Keyword Name] (+N) [Stress: N, if any]
- [Keyword Name] (+N)

### Fear Abilities
- [Ability description] (Cost: [N] Fear)
```

> **OPEN: Fear tracking in session state.** The adversary block tracks adversary stress. But the GM's Fear pool also needs to be tracked somewhere visible. If Fear lives in `adventure.md` frontmatter (per the Hope/Fear open question), the adversary block and the session state are in different files. This is probably fine since they serve different purposes (adversary state vs session economy), but worth confirming the LLM can manage both without losing track.
> USER NOTE: Don't worry about this right now. There's a general problem with the app for showing this type of information. i.e. secondary concern.

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Plugin implementation | Spec approved | [STUB: keyword-system-plugin] |

## Success Criteria

- [ ] A player can create a character through conversation using only these rules
- [ ] Resolution uses a single dice roll (2d6) with clear outcome determination
- [ ] The GM has mechanical permission (Fear tokens) to create adversity without relying on prompt instructions alone
- [ ] Consequences (stress) create tactical choices, not just narrative flavor
- [ ] Progression emerges from the story, not from a level-up table
- [ ] No canonical content exists that the LLM could hallucinate about
- [ ] Adversary capabilities are fixed at introduction, not invented mid-encounter
- [ ] The complete rules fit in a single bootstrap document

## AI Validation

**Defaults apply** (unit tests, coverage, code review).

**Custom:**
- Bootstrap prompt can be understood by an LLM without external reference material
- Character creation can be completed in under 10 conversational turns
- A test combat encounter can be resolved using only the rules in the bootstrap
- No requirement references content that exists outside the bootstrap or character sheet

## Constraints

- Must follow existing plugin architecture ([Spec: adventure-system-integration])
- Must use the engine dice tool (`mcp__corvran__roll_dice`) for all rolls
- Must not require engine code changes
- All state in markdown files (Vision Principle 1: Markdown is Memory)
- All mechanics taught via documents, not code (Vision Principle 2: Teach, Don't Code)
- Player agency inviolable (Vision Principle 3: Player Agency is Sacred)

## Open Questions Index

All open questions are inline in their relevant sections. This index collects them for tracking.

| # | Section | Question | Leaning |
|---|---------|----------|---------|
| 1 | Dice Resolution | Doubles token interaction: one token or two? | One token, critical replaces normal flow |
| 2 | Stress System | Player character defeat: can a character die? | Death is always a player choice, not mechanical |
| 3 | Stress System | Stress stacking cap: can stress exceed -3 on one keyword? | -3 is the floor, spread to other keywords |
| 4 | Hope/Fear Economy | Where does Fear (GM resource) live in file state? | `adventure.md` frontmatter |
| 5 | Dealing Stress to Adversaries | Per-keyword vs aggregate stress tracking for adversaries? | Per-keyword for standard/major, aggregate for minor |
| 6 | Combat Procedure | How do adversaries act? Player-rolls-everything, spotlight, or Fear-driven? | Model A: player-rolls-everything (PbtA-style) |
| 7 | Progression | Off-by-one: 18 acts from level 1 = level 19, not 18 | Need to pick and walk through the table |
| 8 | Rest and Recovery | Deep stress resolution criteria: is collaborative judgment enough? | Yes, but may need hardening if LLM clears too easily |
| 9 | Adversary Block Format | Fear pool and adversary stress in different files: manageable? | Probably fine, confirm with playtesting |

## Context

- `.lore/research/llm-optimized-rpg-systems.md`: Core research. Keyword systems, token economies, act structure as LLM-native patterns. Ironsworn/Starforged as closest existing fit. Identifies over-compliance as primary LLM failure mode.
- `.lore/research/llm-integration-notes-daggerheart.md`: Bounded constraint format for keywords (positive scope, explicit exclusions). Authority drift as primary keyword failure mode. "Consistency > Plausibility" as design principle.
- `.lore/research/scene-boundaries.md`: Scene transition mechanics, act structure, what clears at boundaries.
- `.lore/research/ttrpg-gm-reference-guide.md`: GM behavioral contract. Never narrate player actions. Fiction-first resolution. Failing forward.
- `.lore/specs/adventure-system-integration.md`: Plugin architecture, bootstrap prompt convention, manifest format.
- `.lore/specs/engine-dice-tool.md`: Dice tool contract. Labeled groups, modifiers, thresholds.
- `.lore/brainstorm/rpg-system-loading.md`: One system per adventure. Corvran always loads as core plugin.
