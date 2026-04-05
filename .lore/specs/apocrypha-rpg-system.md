---
title: Apocrypha
date: 2026-04-03
status: approved
tags: [rpg-systems, keyword, game-design, plugins, hallucination-resistant, apocrypha]
modules: [plugins]
related: [.lore/research/llm-optimized-rpg-systems.md, .lore/research/llm-integration-notes-daggerheart.md, .lore/specs/adventure-system-integration.md, .lore/specs/engine-dice-tool.md]
req-prefix: KW
---

# Spec: Apocrypha

## Overview

A rules-light RPG system designed from the ground up for LLM game masters. Characters are defined entirely by natural-language keywords with numeric modifiers. There are no classes, no spell lists, no predefined features, no canonical content for the LLM to hallucinate about. The LLM's creative interpretation of keywords IS the mechanic.

The system uses 2d12 with a hope/fear duality for resolution, a token economy that gives the GM mechanical permission to create adversity, keyword-targeted stress as the consequence system, and act-based progression tied to narrative structure.

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

- REQ-KW-12: Resolution uses 2d12 labeled "hope" and "fear", plus the applicable keyword's modifier, compared against a difficulty set by the GM. The engine dice tool (`mcp__corvran__roll_dice`) handles the roll and returns which die rolled higher. 2d12 (not 2d6) keeps critical frequency manageable: doubles occur on ~8.3% of rolls rather than ~16.7%.

- REQ-KW-13: Difficulty scale:
  - Routine (10): Most competent people could do this
  - Moderate (14): Requires real skill or effort
  - Hard (17): Serious challenge even for the skilled
  - Desperate (20): Nearly impossible without mastery

  The GM declares difficulty before the roll. The player knows what they're up against.

- REQ-KW-14: Four outcomes based on success/failure crossed with hope/fear:
  - **Success with Hope** (meets difficulty, hope die higher): Clean success. Player gains a Hope token. Narrate without complications.
  - **Success with Fear** (meets difficulty, fear die higher): Success, but the GM gains a Fear token and narrates a complication, cost, or consequence alongside the success.
  - **Failure with Hope** (below difficulty, hope die higher): Failure, but the character gains something (information, positioning, or a Hope token). The failure isn't total.
  - **Failure with Fear** (below difficulty, fear die higher): Hard failure. GM gains a Fear token. Something gets worse beyond the failed action.

- REQ-KW-15: On doubles (both dice show the same number), the result is a critical. No tokens are generated on a critical, either direction. If the roll succeeds, it's an extraordinary success: the outcome exceeds what was attempted. The critical success IS the reward. If the roll fails, it's a dramatic failure: the situation shifts fundamentally. The dramatic consequences ARE the punishment. The token economy stays at its current levels; criticals affect the fiction, not the budget.

- REQ-KW-16: [Removed. Merged into REQ-KW-15. Ties and doubles are the same thing on 2d12.]

- REQ-KW-17: The GM declares stakes before every roll: what success looks like, what failure risks. This makes the GM's judgment visible and challengeable. The player can negotiate stakes before committing to the roll.

### Hope/Fear Economy

- REQ-KW-18: Hope is a player resource. Maximum 6 tokens. Gained when the hope die is higher on a non-critical roll. Hope can be spent to:
  - Reroll one die (1 Hope)
  - Clear one level of light stress from a keyword (1 Hope)
  - Force a narrative moment: declare something true about the scene that the GM must honor, within reason (2 Hope)

- REQ-KW-19: Fear is a GM resource. Maximum 12 tokens. Gained when the fear die is higher on a non-critical roll. Fear can be spent to:
  - Inflict light stress on a keyword (1 Fear)
  - Inflict deep stress on a keyword (2 Fear)
  - Introduce a complication outside of a roll (1 Fear)
  - Activate an adversary's Fear ability (cost defined per ability)
  - Interrupt the current scene with an external threat (3 Fear)

- REQ-KW-20: The token economy gives the LLM mechanical permission to create adversity. "I have 4 Fear, I'm spending 2 to inflict deep stress on your Pyromancer's Fury" is a concrete, budget-constrained action. The LLM doesn't have to judge whether it's being fair. The budget IS the fairness. Token spending must always be narrated in the fiction, never announced as a bare mechanic. "The dragon's flames wash over you, and for a moment your fire falters" (spending 2 Fear to deep-stress Pyromancer's Fury), not "I spend 2 Fear to stress your keyword."

- REQ-KW-21: The GM should spend Fear actively. A Fear pool above 6 that isn't being spent is a missed narrative beat. The bootstrap instructs the GM to look for opportunities to spend Fear on complications, stress, and adversary abilities.

- REQ-KW-21A: Fear is tracked in `adventure.md` frontmatter as session-level state, alongside mood. Fear is a GM resource, not a player resource, and does not belong on the character sheet.

### Stress System

- REQ-KW-22: Consequences target specific keywords, not abstract hit points. When a keyword takes stress, its effective modifier is reduced. Stress is narratively grounded: stress on "Pyromancer's Fury" means something about the character's relationship with fire is shaken.

- REQ-KW-23: Two stress levels:
  - **Light stress** (-1 to effective modifier): The keyword is shaken but usable. Clears with rest (a scene of downtime) or by spending 1 Hope.
  - **Deep stress** (-2 to effective modifier): The keyword is seriously compromised. Clears only through narrative resolution: a scene that directly addresses what shook the keyword. The player and GM agree when deep stress is resolved.

- REQ-KW-24: Stress stacks. A keyword can accumulate both light and deep stress simultaneously (total -3 to effective modifier). A keyword at +1 with both light and deep stress has an effective modifier of -2. Negative modifiers are valid: the keyword is actively working against the character. "Pyromancer's Fury" at -2 means the fire is uncontrolled, volatile. You can still invoke it, but you're rolling at a penalty.

- REQ-KW-25: A character is in crisis when more than half their keywords have negative effective modifiers. The GM narrates this as a turning point: the character is breaking down, overwhelmed, at their limit. Crisis is a narrative signal, not a mechanical state with additional rules.

- REQ-KW-26: The GM chooses which keyword to stress based on what makes narrative sense. Combat stress targets action-oriented keywords. Social failure targets identity and relationship keywords. The choice follows the fiction, not mechanical optimization.

- REQ-KW-25A: Death is always a player choice, never a mechanical inevitability. Crisis (REQ-KW-25) is the floor. The GM cannot stress a character into a death state. The stress system creates pressure and narrative consequence, but the terminal state is collaborative: death happens only when the player opts into it as a dramatic choice. This also keeps the GM willing to spend Fear on stress. If stress could kill, the GM would pull punches. With death off the mechanical table, the GM can stress freely and let the narrative pressure do its work.

- REQ-KW-26A: A keyword's stress caps at -3 (light + deep). A keyword cannot be stressed beyond this. When a maxed keyword would take additional stress, the GM targets a different keyword instead, finding a narrative reason for the connection. A fourth bat swing doesn't stress "Cutthroat Reflexes" again; it breaks the character's arm, stressing "Mechanical Wiz" because you can't tinker without both hands. The GM spreads stress across the character's keyword set, using fiction to justify the connections.

### Dealing Stress to Adversaries

- REQ-KW-27: When a player succeeds on an action against an adversary, the adversary takes stress on one of its keywords. The GM chooses which keyword based on the fiction.
  - Success with Hope: 2 stress to the adversary
  - Success with Fear: 1 stress to the adversary

- REQ-KW-28: When an adversary's total accumulated stress meets or exceeds its stress threshold, it is defeated. The fiction determines what defeat looks like: death, surrender, retreat, or incapacitation.

- REQ-KW-29: Stressed adversary keywords lose effectiveness the same way player keywords do. A bandit with "Pack Tactics (+2)" at 1 stress fights at effective +1. The adversary degrades narratively as it takes damage.

- REQ-KW-29A: Adversary stress tracking scales with tier:
  - **Minor adversaries**: Aggregate stress pool. Stress is a single counter ticking toward the threshold. The GM narrates which capability is degrading, but tracking is a single number.
  - **Standard and major adversaries**: Per-keyword tracking, same as player characters. Stress is allocated to specific keywords, each degrades independently, and total stress across all keywords counts toward the threshold. A dragon's "Impenetrable Scales (+3)" dropping to effective +1 mid-fight changes the fiction in ways that matter.

### Dealing Stress to Players

- REQ-KW-30: Player keywords take stress through two channels:
  - **Fear spending**: The GM spends Fear tokens to stress a keyword (per REQ-KW-19). This is proactive and budget-constrained.
  - **Failure consequences**: When a player fails a roll, the GM may narrate stress on a keyword as part of the failure. This does not cost Fear. The roll itself is the cost.

- REQ-KW-31: Adversaries can also deal stress through their Fear abilities (per REQ-KW-19, activated by GM spending Fear). An adversary with "Terrifying Roar (1 Fear): inflict light stress on a courage or resolve keyword" gives the GM a specific, constrained way to threaten the player.

### Combat Procedure

- REQ-KW-30A: **Player-rolls-everything (PbtA-style).** The player always rolls. There are no "adversary turns" and no initiative. When the player acts against an adversary, they roll. On success, the adversary takes stress. On failure, the adversary's response IS the failure consequence: the GM narrates the adversary attacking, the environment shifting, etc. Adversary Fear abilities are activated by GM spending Fear at any point, not on a "turn."

- REQ-KW-30B: When the player isn't acting directly against an adversary (picking a lock while a dragon is in the room), the adversary acts through failure consequences. "You fail to pick the lock, and the dragon closes the distance" is a valid failure result. The GM may also spend Fear to inflict stress as part of failure narration.

- REQ-KW-30C: When an adversary surprises the player or forces a reaction, the player still rolls. The GM narrates the threat, the player declares their response, and the roll determines the outcome. No situation bypasses the player's roll.

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

- REQ-KW-37: Characters level up when the story earns it. A level-up is a major narrative milestone: completing an act, resolving a defining conflict, surviving a transformative ordeal. The GM and player agree when a milestone has the weight to justify leveling. Not every scene or encounter qualifies. A bar fight is just a scene. Escorting the stolen chalice through a gauntlet to reach the church before midnight, and making it, is a milestone. The three-act structure (introduce, complicate, resolve) is a useful frame for what constitutes an arc of play, but it is not a formula. There is no fixed number of arcs, acts, or sessions to reach a given level.

- REQ-KW-38: Story arcs naturally follow a three-act shape: introduce the dramatic question, complicate it, resolve it. The GM and player agree when a milestone concludes. This is a collaborative judgment, not a mechanical trigger. Not every arc maps cleanly to three acts, and that's fine. The structure is a lens for recognizing when growth has been earned, not a formula to follow.

- REQ-KW-39: On level-up, the character gains up to 3 new keywords at +1. New keywords must emerge from the story just completed. "I survived the Siege of Thornwall" becomes "Siege Survivor (+1)." The player proposes keywords, the GM confirms they're grounded in the fiction.

- REQ-KW-40: At any level-up, existing keywords can deepen (modifier increases by 1, to a maximum of +3) if the story provided a narrative milestone for that keyword. The player and GM agree on which keywords deepened and why. Deepening is separate from the 3 new keywords gained on level-up.

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

- REQ-KW-48A: Deep stress resolution is collaborative judgment: the player and GM agree when a scene has adequately addressed the source of the stress. This is consistent with how the system handles act conclusions and keyword deepening. The bootstrap prompt should instruct the GM that deep stress resolution requires a genuine narrative scene, not a passing mention, and that clearing deep stress too easily undermines the system's tension. If playtesting reveals over-compliance (the GM clears deep stress on a single line of dialogue), the bootstrap should be tightened to require a dedicated scene where the keyword is tested and the player rolls for it.

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
**Max Keywords**: [3 x Level]

## Progression Log

| Level | Milestone | Keywords Gained | Keywords Deepened |
|-------|-----------|-----------------|-------------------|
| 1     | Character creation | [starting three] | -          |
| 2     | [milestone description] | [from milestone] | [if any] |

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

*Note: Fear pool display is a secondary concern. The app has a general problem with surfacing this type of state information. Fear lives in `adventure.md` frontmatter (REQ-KW-21A); adversary stress lives in `world.md` adversary blocks. The split is fine for now. Revisit when the app's state display is addressed.*

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Plugin implementation | Spec approved | [STUB: keyword-system-plugin] |

## Success Criteria

- [ ] A player can create a character through conversation using only these rules
- [ ] Resolution uses a single dice roll (2d12) with clear outcome determination
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

## Resolved Questions

All open questions from the initial draft have been resolved. This index records what was decided and where the resolution lives.

| # | Section | Question | Resolution |
|---|---------|----------|------------|
| 1 | Dice Resolution | Doubles token interaction | No tokens on criticals. Critical success is its own reward; critical failure is its own punishment. (REQ-KW-15) |
| 2 | Stress System | Player character defeat | Death is always a player choice, never mechanical. Crisis is the floor. (REQ-KW-25A) |
| 3 | Stress System | Stress stacking cap | -3 is the floor. GM spreads additional stress to other keywords with narrative justification. (REQ-KW-26A) |
| 4 | Hope/Fear Economy | Where does Fear live? | `adventure.md` frontmatter, alongside mood. (REQ-KW-21A) |
| 5 | Adversary Stress | Per-keyword vs aggregate tracking | Per-keyword for standard/major adversaries. Aggregate for minor. (REQ-KW-29A) |
| 6 | Combat Procedure | How do adversaries act? | Player-rolls-everything (PbtA-style). No initiative, no adversary turns. Surprise = player rolls reaction. (REQ-KW-30A/B/C) |
| 7 | Progression | Off-by-one math | Eliminated. No fixed formula. Level up on narrative milestones. (REQ-KW-37) |
| 8 | Rest and Recovery | Deep stress resolution criteria | Collaborative judgment is sufficient. Bootstrap should instruct against clearing too easily. Tighten if playtesting reveals over-compliance. (REQ-KW-48A) |
| 9 | Adversary Block Format | Fear/adversary state split across files | Deferred. Secondary concern pending app-level state display work. |

## Deferred Concerns

Items that are acknowledged but not blocking spec approval:

- **Fear pool display UX**: The app needs a general solution for surfacing session-level state (Fear count, adversary stress). Not a game design question; it's an app design question.
- **Deep stress over-compliance hardening**: If playtesting shows the LLM clears deep stress too easily, the bootstrap should require a dedicated resolution scene with a roll. Monitor during implementation.

## Context

- `.lore/research/llm-optimized-rpg-systems.md`: Core research. Keyword systems, token economies, act structure as LLM-native patterns. Ironsworn/Starforged as closest existing fit. Identifies over-compliance as primary LLM failure mode.
- `.lore/research/llm-integration-notes-daggerheart.md`: Bounded constraint format for keywords (positive scope, explicit exclusions). Authority drift as primary keyword failure mode. "Consistency > Plausibility" as design principle.
- `.lore/research/scene-boundaries.md`: Scene transition mechanics, act structure, what clears at boundaries.
- `.lore/research/ttrpg-gm-reference-guide.md`: GM behavioral contract. Never narrate player actions. Fiction-first resolution. Failing forward.
- `.lore/specs/adventure-system-integration.md`: Plugin architecture, bootstrap prompt convention, manifest format.
- `.lore/specs/engine-dice-tool.md`: Dice tool contract. Labeled groups, modifiers, thresholds.
- `.lore/brainstorm/rpg-system-loading.md`: One system per adventure. Corvran always loads as core plugin.
