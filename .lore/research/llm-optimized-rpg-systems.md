---
title: RPG Systems Optimized for LLM Game Masters
date: 2026-03-29
status: current
tags: [research, rpg-systems, llm-integration, game-design, adventure-engine]
---

# RPG Systems Optimized for LLM Game Masters

This research surveys existing tabletop RPG systems through the lens of LLM GM compatibility, then explores what an RPG system designed from scratch for an LLM GM might look like. The goal is to inform the Adventure Engine's system design decisions.

## Methodology and confidence levels

Throughout this document:
- **Verified** means checked against source material (SRDs, rulebooks, published papers)
- **Reported** means sourced from community discussions, blog posts, or product documentation
- **Inferred** means the author's synthesis from multiple data points

---

# Part 1: Existing RPG Systems and LLM GM Compatibility

## The core question: where does interpretive authority live?

The prior research in this project (see `llm-integration-notes-daggerheart.md`) identified the load-bearing insight: LLM GM compatibility is not about rules-heavy vs. rules-light. It's about whether the system's resolution authority lives in **procedures** (look up a table, apply a formula) or in **interpretation** (judge the fiction, make a call).

LLMs excel at interpretation and language. They struggle with precise arithmetic, long-term state consistency, and spatial reasoning. The ideal system for an LLM GM maximizes interpretive work and minimizes bookkeeping.

This creates a spectrum:

| System Type | Interpretive Load | Bookkeeping Load | LLM Fit |
|---|---|---|---|
| Diceless narrative | Very high | Very low | Highest (with constraints) |
| Fiction-first (PbtA, FitD) | High | Low-moderate | High |
| Keyword/aspect-based (Fate, Daggerheart) | High | Moderate | High (with drift prevention) |
| Rules-light one-page | Low | Very low | Good for one-shots |
| Solo oracle systems | Moderate | Moderate | Natural fit (replaces oracle) |
| Traditional d20/crunch | Low-moderate | Very high | Poor without deterministic code layer |

The following sections assess each category in detail.

---

## Narrative-first systems

### Powered by the Apocalypse (PbtA)

**What it is.** PbtA games (Apocalypse World, Dungeon World, Masks, Monster of the Week) use "moves" triggered by fictional actions. When a player does something that triggers a move, they roll 2d6 + modifier. 10+ is a full success, 7-9 is a partial success with complications, 6- is a miss where the GM makes a hard move. (Verified: Dungeon World SRD, Apocalypse World 2e)

**Why it suits LLMs.**
- The GM's moves are codified as a finite list of narrative actions ("reveal an unwelcome truth," "put someone in a spot," "offer an opportunity with a cost"). This gives the LLM a menu rather than infinite freeform space.
- Resolution is fiction-first: the player describes an action, the GM determines which move (if any) applies. This is pure interpretive work.
- The math is trivial: 2d6 + a small modifier, three outcome bands.
- Partial success (7-9) is the most common result and requires the GM to improvise complications. This is precisely what LLMs do well.
- GM principles are explicit and prescriptive ("be a fan of the characters," "play to find out what happens"). These translate directly to system prompt instructions.

**Where it could break.**
- "GM moves on a miss" requires the GM to escalate or introduce consequences proportional to the fiction. LLMs tend toward over-compliance (giving players what they want rather than honest consequences). Requires explicit instruction to make hard moves that hurt.
- Some PbtA games have playbook-specific moves with mechanical interactions that accumulate over sessions. State tracking grows.
- "Ask questions and use the answers" requires incorporating player-generated fiction into the world state, which the LLM must persist somehow.

**State tracking burden.** Low-moderate. Character stats are 5-6 numbers. Current fictional position matters more than numerical state. Harm/conditions are a short list. The main state challenge is remembering fictional truths established through play.

**LLM fit assessment.** High. PbtA is one of the strongest existing fits. The explicit GM move list constrains the LLM's tendency to drift while still leveraging its narrative strength. Dungeon World specifically was designed to be accessible and its GM framework is the most transferable to LLM instructions.

### Forged in the Dark (FitD) / Blades in the Dark

**What it is.** Blades in the Dark and its descendants use position/effect (desperate/risky/controlled x great/standard/limited) to frame every action. Players roll a dice pool; the GM sets position and effect based on the fiction. Progress clocks track ongoing situations. (Verified: Blades in the Dark SRD)

**Why it suits LLMs.**
- Position/effect is a narrative judgment call, not a calculation. "How dangerous is this situation? How much impact could this action have?" LLMs can assess this from context.
- Progress clocks are a visual/numerical abstraction of narrative tension. A clock with 6 segments that's 4 segments full is simple state. The fiction drives when to tick clocks, and the LLM decides that.
- "The fiction is the source of truth" is the explicit design principle. Clocks reflect the fiction, not the other way around. (Verified: BitD SRD, "A clock is like a speedometer in a car. It shows the speed of the vehicle; it doesn't determine the speed.")
- The flashback mechanic lets players retroactively declare preparation, which means the LLM doesn't need to track hypothetical planning state.

**Where it could break.**
- Dice pools vary in size (1-4+ dice, taking highest). Not hard math, but more complex than 2d6.
- The crew/faction layer adds persistent organizational state: reputation, heat, territory, faction relationships. This is a spreadsheet the LLM needs to maintain.
- Downtime actions have structured mechanical procedures that need consistent application.

**State tracking burden.** Moderate. Character sheets are manageable. Crew sheets and faction status add a layer. Progress clocks need to be tracked explicitly (a short list of clock names and fill levels).

**LLM fit assessment.** High for the core action resolution. The position/effect framework is arguably the single best resolution mechanic for LLM GMs because it makes the GM's narrative judgment the explicit input, not a hidden variable. The faction/crew layer needs deterministic tracking support.

### Fiasco

**What it is.** A GM-less story game for 3-5 players about "powerful ambition and poor impulse control." Setup uses dice to select relationships, needs, objects, and locations from a playset. Play alternates between establishing and resolving scenes. Players choose whether scenes end well or badly for their character. (Verified: Fiasco SRD, Bully Pulpit Games)

**Why it matters for this analysis.** Fiasco distributes GM authority across all players. No single person controls the world. This is instructive for LLM design because it shows how narrative authority can be shared rather than centralized. In a 1-on-1 LLM RPG, the LLM could adopt a Fiasco-like model where the player has explicit authority over certain narrative elements.

**LLM fit assessment.** Not directly usable as a GM-ed system (it's GM-less), but the setup procedure (random element selection generating situation) and the shared authority model are design patterns worth borrowing. The playset structure (menus of relationships, locations, needs, objects) is particularly well-suited to LLM generation.

---

## Rules-light systems

### Lasers & Feelings

**What it is.** A one-page RPG by John Harper. Each character has a single number (2-5). Roll under it for Lasers (logic, science, tech), over it for Feelings (charm, intuition, passion). Roll 1-3d6 based on circumstances. (Verified: Lasers & Feelings PDF)

**Why it suits LLMs.** Nearly zero mechanical state. One number per character. Resolution is binary (above or below your number) with narrative interpretation of degree. The entire game fits on one page, meaning the full rules can be included in a system prompt.

**Where it could break.** The extreme simplicity means nearly everything is narrative judgment. Without any mechanical structure, the LLM has no scaffolding to maintain consistency. There's nothing to be "right" about, so there's no way to be detectably "wrong." This is both a strength (no rules to misapply) and a weakness (no rules to anchor behavior).

**LLM fit assessment.** Excellent for one-shots and short sessions. Poor for campaigns. The system provides almost no structure for the LLM to lean on, so consistency depends entirely on the LLM's own coherence over time. The Lasers & Feelings framework (one stat, two modes) is a useful primitive for LLM-native design.

### Honey Heist / Risus

**Honey Heist** uses the Lasers & Feelings structure with two stats (Bear/Criminal) that shift during play. Simple, comedic, zero-prep. (Verified: Honey Heist PDF)

**Risus** uses "cliches" (e.g., "Grizzled Space Marine [4]") with dice pools. Conflict resolution is opposed rolls with dice pools shrinking as you lose. (Verified: Risus SRD)

Both are rules-light enough that the full system fits in a prompt. Risus's cliche system is notable because cliches are natural-language descriptions, which is exactly what LLMs process best. "Does 'Grizzled Space Marine' apply to this situation?" is a question LLMs can answer reliably.

**LLM fit assessment.** Good for short-form play. Risus's cliche system is a lightweight version of Fate's aspects and worth studying for LLM-native design.

---

## Daggerheart

**What it is.** Critical Role's RPG uses "duality dice" (2d12, one Hope die and one Fear die). Add both to a modifier, compare to difficulty. Whichever die rolls higher generates Hope (player resource) or Fear (GM resource). Four outcomes: success with Hope, success with Fear, failure with Hope, failure with Fear. Matching dice = critical success. (Verified: Daggerheart SRD)

**Why it suits LLMs.**
- The Hope/Fear economy is a narrative pacing tool, not an arithmetic one. The GM spends Fear to introduce complications; players spend Hope for bonuses. This gives the LLM explicit narrative license ("I have 3 Fear, I can use it to make something bad happen") rather than requiring it to judge difficulty from vibes alone.
- Experiences (keyword traits) use natural language and interpretive judgment, which aligns with the prior research on keyword systems being LLM-native.
- The system's explicit GM principles ("begin and end with the fiction," "hold on gently") map directly to system prompt instructions.
- The fiction-first resolution approach means the LLM evaluates what's happening in the story before determining mechanics.

**Where it could break.**
- The primary failure mode identified in prior research is **authority drift** (see `llm-integration-notes-daggerheart.md`). Without constraints, the LLM will gradually expand the scope of Experiences to remain helpful. Each step is plausible; the aggregate is trait inflation. This requires explicit countermeasures: bounded Experience definitions at character creation, with positive scope and explicit exclusions.
- Hope/Fear are accumulating resources with caps (6 Hope, 12 Fear). The LLM needs to track these numbers accurately across a session. Small numbers, but they matter.
- Character mechanical state (HP equivalent as "stress" and "hit points," armor, inventory, class features) is moderate-to-heavy depending on level.
- Combat involves multiple NPCs with individual stat blocks. Managing a multi-NPC encounter requires tracking several entities simultaneously.

**State tracking burden.** Moderate-to-heavy. More mechanical weight than PbtA, less than D&D 5e. The Hope/Fear economy adds tracked resources. Stress/HP, armor, and class features need consistent tracking.

**LLM fit assessment.** High for narrative play. The Hope/Fear mechanic is genuinely innovative for LLM GMs because it externalizes narrative pacing into a trackable resource rather than relying on the LLM's sense of dramatic timing. The keyword system needs the constraint framework already identified in prior research. Combat encounters need deterministic support for stat tracking. This is the Adventure Engine's current supported system and the fit is strong with proper architectural support.

---

## Solo RPG systems

### Ironsworn / Starforged

**What it is.** A PbtA-derived system designed for solo, co-op, and guided play. Uses action rolls (d6 + stat vs. two d10 "challenge dice") with three outcomes: strong hit, weak hit, miss. Includes an oracle system for yes/no questions with likelihood modifiers and random tables for inspiration. Progress tracks replace hit points and quest advancement. (Verified: Ironsworn SRD, Tomkin Press)

**Why it matters profoundly for LLM GMs.** Ironsworn was designed to work without a human GM. The oracle system (yes/no with likelihood, plus themed random tables) is exactly what an LLM replaces. The LLM is the oracle, but better: it can generate contextually appropriate answers rather than random word pairs. Ironsworn + LLM removes the oracle lookup step and replaces it with narrative judgment that considers the full fictional context.

**Specific strengths for LLM integration.**
- Progress tracks are simple (mark boxes on a 10-box track). Clear, low-complexity state.
- Vows (quest objectives with progress tracks) give the LLM explicit narrative goals to drive toward.
- The asset system (character abilities as cards with clear triggers) provides structured mechanical hooks.
- Oracles like "Action + Theme" tables (e.g., "Oppose + Knowledge") generate creative prompts. An LLM can internalize the oracle's purpose (narrative surprise and inspiration) and produce more contextually relevant results.
- Starforged added "clocks" (from Blades in the Dark) for ongoing threats, providing the same LLM-friendly pacing tool.

**Where it could break.**
- The progress track system requires marking specific amounts of progress based on challenge rank. An LLM needs to track these numbers.
- "Pay the Price" moves (consequences for failure) have a structured table but also a "make the most obvious negative outcome happen" option, which plays to LLM strength.

**State tracking burden.** Low-moderate. Character stats (5 numbers), momentum (1 number), health/spirit/supply (3 numbers), progress tracks (a few 10-box tracks), and assets. Manageable.

**LLM fit assessment.** Very high. Ironsworn is arguably the single best existing fit for an LLM GM because it was already designed for the exact use case (GM-less play with oracle support), and the LLM is a strictly better oracle. The IronswornGPT project demonstrates this works in practice. (Reported: YesChat.ai IronswornGPT, BoardGameGeek solo play discussions)

### Mythic Game Master Emulator (GME)

**What it is.** A system-agnostic meta-layer that can be added to any RPG. Uses a "Fate Chart" for yes/no questions with adjustable probability, a "Chaos Factor" that increases randomness as situations escalate, and random event tables. Not a game system itself but a GM replacement tool. (Verified: Word Mill Games, Mythic GME 2nd Edition)

**Why it matters.** Mythic GME is the closest existing analog to what an LLM GM does. Its entire purpose is replacing the GM's judgment with structured randomness. An LLM replaces the Mythic oracle entirely: instead of "roll on the Fate Chart, consult the random event table, interpret the result," the player simply asks the LLM what happens and gets a contextualized answer.

**Key design insight from Mythic.** The Chaos Factor is a pacing mechanism. As situations get more chaotic, random events become more likely, scenes get altered or interrupted more often. This is a formalized version of narrative escalation. An LLM-native system could internalize this: track a narrative tension value that influences how surprising or disruptive the LLM's responses are.

**LLM fit assessment.** Not a game system, but the design patterns (structured uncertainty, adjustable probability, scene framing, chaos escalation) are directly transferable to LLM-native design.

---

## Story games and shared-authority systems

### Belonging Outside Belonging / No Dice No Masters

**What it is.** A framework by Avery Alder (Dream Askew, Dream Apart) for GM-less, diceless play about marginalized communities. Players take shared ownership of world elements. Token economy: take a token when you make a "weak move" (your character struggles), spend a token when you make a "strong move" (your character triumphs). (Reported: Buried Without Ceremony, itch.io collections)

**Why it matters for LLM design.** The weak/strong move economy is a self-balancing pacing mechanism. Players must struggle before they can triumph. This is an elegant replacement for dice: narrative pacing is built into the economy rather than left to chance or GM judgment. An LLM could manage this economy trivially (counting tokens), and the economy constrains the narrative arc without requiring the LLM to judge probability.

### Microscope / Kingdom / Follow

**What these are.** Ben Robbins' story games about collaborative worldbuilding at different scales. Microscope builds history across eras. Kingdom explores a community's decisions. Follow tracks a quest. All are GM-less with structured turn-taking. (Inferred from game descriptions)

**Why they matter.** These demonstrate that structured turn-taking can replace a GM entirely. The rules constrain *who gets to say what* rather than *what the world does.* In an LLM RPG, this insight suggests the rules should constrain what the LLM is allowed to decide vs. what the player decides, rather than trying to constrain the LLM's narrative output.

---

## Diceless systems

### Amber Diceless Roleplaying

**What it is.** Based on Roger Zelazny's Amber novels. No dice, no randomizers. Attribute comparison determines outcomes: whoever has the higher stat wins, modified by tactics and circumstance. The GM adjudicates all conflicts through narrative judgment. (Verified: Wikipedia, RPGPub discussions, The Alexandrian review)

**Why it's relevant.** Amber pushes all resolution authority to the GM. The GM decides everything based on comparative ability and fictional positioning. This is the maximum-interpretive-authority endpoint of the spectrum. For a human GM, this requires deep trust and consistency. For an LLM GM, this is simultaneously the best case (all interpretation, no math) and the worst case (no mechanical anchor to prevent drift).

**The problem.** Without any randomness or mechanical check, there's nothing to calibrate the LLM against. In a dice-based system, the dice provide occasional external input that forces the narrative in unexpected directions. In Amber, the GM is the sole source of both resistance and surprise. An LLM in this role would need very strong constraints on when and how it introduces adversity, or play devolves into a choose-your-own-adventure where the AI always gives the player what it thinks they want.

### Nobilis

**What it is.** A diceless game with substantially more mechanical structure than Amber. Characters are divine beings with rated attributes (Aspect, Domain, Realm, Spirit) and miracle points to spend. Resolution uses attribute level + miracle points vs. difficulty, with the miracle point economy creating resource management. (Reported: RPG forums, Wikipedia)

**Why it matters.** Nobilis demonstrates that "diceless" doesn't have to mean "structureless." The miracle point economy creates meaningful choices (spend resources now or save them) without dice. This is a useful pattern for LLM-native design: resource economies that create player decisions without requiring the GM to do math.

**LLM fit assessment for diceless systems.** Moderate. The absence of randomness removes a source of LLM error (no dice math to get wrong) but also removes the external calibration that dice provide. Pure diceless systems need either strong mechanical structure (Nobilis) or strong social trust (Amber) to prevent the authority holder from dominating. For an LLM, mechanical structure is the viable path.

---

## Summary: LLM compatibility rankings

| System | Narrative Fit | State Burden | Drift Risk | Overall LLM Fit |
|---|---|---|---|---|
| Ironsworn/Starforged | Excellent | Low-moderate | Low (structured moves) | Excellent |
| PbtA (Dungeon World) | Excellent | Low | Moderate (GM moves need discipline) | High |
| Blades in the Dark (core) | Excellent | Moderate | Low (position/effect anchors judgment) | High |
| Daggerheart | High | Moderate-heavy | Moderate (keyword drift) | High (with constraints) |
| Fate Core | High | Moderate | High (aspect creep) | Moderate-high |
| Lasers & Feelings | Good | Minimal | Low (nothing to drift) | Good (one-shots only) |
| Risus | Good | Low | Low | Good (short-form) |
| Belonging Outside Belonging | High | Low | Low (token economy constrains) | High (structural model) |
| Nobilis | Moderate | Moderate | Low (point economy constrains) | Moderate |
| Amber Diceless | Very high | Low | Very high (no mechanical anchor) | Low (without heavy constraints) |
| D&D 5e / Pathfinder | Moderate | Very high | Low (rules constrain) | Low (without code support) |

---

# Part 2: Designing an RPG System for LLM Game Masters

## Design premises

1. **The GM is always an LLM.** No human will GM this game. Design for LLM strengths and around LLM weaknesses.
2. **The primary mode is 1-on-1.** One player, one LLM GM. Multi-player is a stretch goal, not the default.
3. **Sessions have finite context.** LLMs lose fidelity over long conversations. The system must account for this.
4. **The LLM will try to please the player.** Over-compliance (saying yes when it should say no) is the default failure mode, not adversarial behavior.
5. **Code can handle bookkeeping.** The LLM doesn't need to do arithmetic. A game engine can track numbers; the LLM provides narrative interpretation.

## Resolution mechanics: narrative probability with structured uncertainty

### The problem with dice in an LLM context

Traditional dice serve two purposes: they introduce **uncertainty** (neither player nor GM knows the outcome in advance) and they provide **calibration** (the GM's narrative judgment is checked against an external random process). An LLM can assess narrative probability ("given this character's skills and this situation, how likely is success?") but if it just decides outcomes, the player has no way to verify fairness. The game feels arbitrary.

### The problem with removing dice entirely

As Amber Diceless demonstrates, pure GM fiat requires deep trust. Players need to believe the GM is being fair. With a human GM, social dynamics, body language, and reputation provide that trust signal. With an LLM, there's nothing. Players will suspect (correctly) that the LLM is either rubber-stamping their actions or generating predetermined outcomes.

### A proposed approach: player-side dice with LLM interpretation

The most promising pattern, drawn from PbtA and Ironsworn:

1. **The player rolls dice.** Dice rolling stays on the player side. The player rolls physical dice (or the app generates random numbers) and reports the result. This keeps uncertainty external to the LLM.
2. **The LLM sets the stakes before the roll.** Before the player rolls, the LLM declares what's at risk and what the possible outcomes look like. This makes the LLM's judgment visible and challengeable.
3. **Outcome bands are narrative, not numeric.** Instead of "you deal 7 damage," outcome bands are "full success / partial success / failure with consequence / catastrophic failure." The LLM narrates what each means in context.
4. **The roll is simple.** 2d6 or similar, with minimal modifiers. The fewer numbers involved, the less the LLM needs to track.

This preserves uncertainty (dice are random), calibration (the LLM's stakes declaration is visible), and narrative richness (the LLM interprets outcomes). The math is trivial enough that the LLM can verify it, or better yet, the game engine handles it.

### Alternative: token economies as pseudo-randomness

Drawing from Belonging Outside Belonging and Daggerheart's Hope/Fear:

- Players accumulate tokens by accepting narrative setbacks ("I take a weak move and gain a token").
- Players spend tokens to guarantee narrative successes ("I spend a token to make a strong move").
- The LLM doesn't need to judge probability; the token economy creates pacing.

This sidesteps the fairness question entirely: the player controls when they succeed and when they struggle, within the constraints of the economy. The LLM's job is to make both success and failure narratively interesting, which is what it does best.

**The hybrid approach.** Use dice for uncertain situations and tokens for dramatic pacing. The player rolls when the outcome is genuinely in doubt. The player spends tokens when they want to force a narrative beat. The LLM handles everything else through fiction.

## State management: the session memory problem

### What the research shows

LLMs degrade over long conversations. The ChatRPG study found that a multi-agent architecture (separating narrator from archivist) significantly improved coherence. (Verified: arxiv 2502.19519) AI Dungeon's experience showed a 68% character inconsistency rate in multi-session play without explicit memory management. (Reported: community analysis)

### Design principles for state

**Explicit state must be minimal and structured.** Every piece of tracked state is a potential point of inconsistency. The system should track only what's necessary and nothing more.

**Proposed state layers:**

1. **Character sheet** (persistent, code-managed): Name, core stats (3-5 numbers), current resources (health/stress/tokens), active conditions, key abilities. This is the source of truth and lives outside the conversation.

2. **World ledger** (persistent, code-managed): Established facts about the world, NPC relationships, faction standings, active quests. Updated after each scene. The LLM reads from this but doesn't modify it directly; the game engine updates it based on the LLM's scene narration.

3. **Scene context** (ephemeral, conversation-native): What's happening right now, who's present, what's at stake. This is the LLM's working memory and exists naturally in the conversation.

4. **Session recap** (generated at session start): A structured summary injected into context at the beginning of each session. The LLM generates it from the world ledger and the previous session's events.

### The recap mechanic as game design

Rather than treating recaps as a technical necessity (context injection), make them a game mechanic:

- **"Previously, on..."** At the start of each session, the system presents a recap. The player can correct or amend it. This serves three purposes: it refreshes the LLM's context, it gives the player agency over what's remembered, and it catches drift before it compounds.
- **"What matters to you?"** The player highlights which threads they want to pursue this session. This focuses the LLM's attention and prevents it from pulling in every unresolved plot thread.

### Session length as a design constraint

Given context window limitations, sessions should be designed around a natural unit of play:

- **Scene-based structure.** A session is 3-7 scenes, each a contained dramatic unit. Between scenes, the game engine snapshots state. This creates natural save points and limits how far drift can propagate.
- **The "long rest" pattern.** Every N scenes, trigger a mandatory recap/checkpoint. The game acknowledges this as a narrative beat (campfire, travel montage, time skip) rather than a technical limitation.

## Player agency: constraining the AI GM

### The over-compliance problem

The primary threat to player agency in LLM RPGs is not that the AI will be adversarial. It's that the AI will be too agreeable. LLMs are trained on human feedback that rewards helpfulness. In an RPG context, "helpful" means "gives the player what they want." But a good GM sometimes denies, complicates, and challenges. (Verified: prior research in `ttrpg-gm-reference-guide.md`, community discussion)

The existing research on AI Dungeon confirms this: "AI Dungeon doesn't impose any game rules on players, so they can narrate new abilities and events into existence." (Reported: AI Dungeon analysis) Without mechanical constraints, the LLM becomes a yes-machine.

### Rules as player protection

In traditional RPGs, rules protect players from GM overreach (the GM can't just kill your character arbitrarily). In an LLM RPG, rules need to protect *the fiction* from player-LLM collusion toward easy outcomes.

**Proposed mechanisms:**

1. **The consequence clock.** Borrowed from Blades in the Dark. When the player avoids or deflects consequences, a consequence clock ticks. When it fills, something unavoidable happens. This prevents indefinite consequence-free play without requiring the LLM to be adversarial moment-to-moment.

2. **The "no free lunch" rule.** Every success must cost something: time, resources, attention, or positioning. The system explicitly instructs the LLM that positive outcomes always come with a price. This is codified in PbtA's 7-9 results and Daggerheart's "success with Fear."

3. **Player-declared difficulty.** The player explicitly chooses the challenge level for each scene or arc: low stakes (casual exploration), normal stakes, high stakes, or desperate. This contract between player and system means the LLM has permission to make things hard when the player opted in.

4. **Inviolable boundaries.** The system hardcodes that the LLM never narrates player character actions, emotions, or decisions (as established in `ttrpg-gm-reference-guide.md`). This is a prompt-level constraint, not a game mechanic, but it's the most important player agency protection.

### Transparency as agency

A novel affordance of LLM GMs: the system can be transparent about its reasoning in ways human GMs cannot.

- **"The situation calls for..."** The LLM can explain why it's escalating or introducing a complication, grounding it in fictional logic rather than arbitrary GM fiat.
- **Stakes negotiation.** Before a risky action, the LLM explicitly states what success and failure look like. The player can negotiate: "I'd accept partial success that looks like X." This collaborative stakes-setting is natural in conversation and hard to do at a physical table without breaking immersion.

## World consistency: fighting hallucination

### The problem

LLMs confabulate. They generate plausible-sounding details that contradict previously established fiction. In RPGs, this manifests as NPCs changing personality, locations shifting layout, forgotten plot threads, and retconned events. The 68% character inconsistency rate reported in AI Dungeon multi-session play is the baseline failure case. (Reported: community analysis)

### Architectural solutions (not game design, but load-bearing)

1. **Canonical world document.** A structured document containing all established facts: NPC names and descriptions, locations, faction relationships, events that have occurred, player character details. The LLM reads this at the start of every interaction. The game engine updates it, not the LLM.

2. **Narrator/archivist split.** The ChatRPG study demonstrated that separating the narrative agent from the state-tracking agent significantly improved coherence. (Verified: arxiv 2502.19519) The narrator generates story; the archivist checks consistency against the world document. SHARI uses a similar Assess-Narrate-Update (ANU) framework. (Reported: SSRN paper)

3. **Contradiction detection.** Before finalizing a narrative response, check it against the world document for contradictions. This can be a second LLM pass or a deterministic check against structured data.

### Game design solutions

1. **The world is small.** Fewer NPCs, fewer locations, fewer factions. Each one is deeply developed rather than broadly sketched. A village with 8 named NPCs is more consistent than a city with 40.

2. **Player as continuity check.** Give the player explicit permission and encouragement to call out inconsistencies. "Wait, you said the blacksmith was afraid of fire, but now she's working the forge?" The system should handle corrections gracefully, treating them as continuity fixes rather than errors.

3. **The "lore check" mechanic.** When the LLM introduces a new world detail, it's flagged as provisional until the player confirms it. "The tavern is called the Drowned Rat, known for its eel stew. Does that fit your sense of this place?" Confirmed details become canonical; unconfirmed ones can be revised.

4. **Recurring over novel.** The system should bias toward reusing established NPCs, locations, and factions rather than introducing new ones. Every new element is a new consistency obligation. Instruct the LLM to prefer connecting to existing world elements.

## Narrative structure: leveraging genre awareness

### What LLMs do well

LLMs have deep pattern recognition for narrative structures. They understand the three-act structure, the hero's journey, genre conventions, rising action, climax, denouement. This is an underexploited strength.

### Narrative pacing mechanics

1. **Act structure as game mechanic.** A quest has three acts. Act 1 introduces the situation and stakes. Act 2 complicates and escalates. Act 3 resolves. The game engine tracks which act the narrative is in, and this affects the LLM's behavior: Act 1 favors exploration and discovery; Act 2 increases complications and reversals; Act 3 drives toward climax. This replaces the Mythic GME's Chaos Factor with something more narratively sophisticated.

2. **Genre dials.** The player selects genre conventions at session zero: heroic fantasy, noir, horror, comedy, etc. The LLM applies genre-appropriate tropes, escalation patterns, and resolution styles. Horror means slow reveals and mounting dread. Heroic fantasy means worthy challenges and triumphant moments. This leverages the LLM's genre knowledge as a game mechanic.

3. **Dramatic question tracking.** Each scene has an explicit dramatic question: "Will the hero convince the duke?" "Can they escape the collapsing mine?" The scene ends when the question is answered. This gives the LLM a clear objective for each scene rather than open-ended narration.

4. **The "montage" move.** When the fiction calls for travel, training, downtime, or other passages of time, the system triggers a montage: a compressed narrative beat with mechanical effects. This prevents the LLM from getting stuck in low-stakes narration and moves the story forward.

## The role of the player: solo play with an AI GM

### The absence of a party

Traditional RPGs assume 3-5 players. A solo player with an AI GM has no party banter, no inter-character conflict, no spotlight sharing. The game must compensate.

**Approaches:**

1. **Companion NPCs.** The LLM controls 1-2 companion characters who travel with the player. These are not DMPCs (they don't solve problems); they provide conversation, perspective, and occasional assistance. The player can direct them ("Kael, cover the rear entrance") but the LLM voices them.

2. **The protagonist focus.** Design explicitly for a single protagonist. Think Witcher, not Lord of the Rings. The player character is the center of every scene. NPCs exist to create situations for the player, not to share the spotlight.

3. **Dual-character play.** The player controls two characters, each with different capabilities and perspectives. This creates internal dramatic tension ("my warrior wants to fight; my diplomat wants to negotiate") without requiring the LLM to simulate party dynamics.

### Multi-player considerations

If multiple players are present:

1. **Turn structure becomes essential.** Without physical presence to signal whose turn it is, the system needs explicit spotlight management. Round-robin prompting: "Kira, the guards have spotted you. What do you do? [Player 1 responds.] Meanwhile, Thane, you hear a commotion from the hall. [Player 2 responds.]"

2. **Shared channel vs. individual channels.** All players see the same narrative, but the system tracks individual character state. This is an architectural question more than a game design question.

3. **Asynchronous play.** LLM GMs enable play-by-post naturally. The LLM can manage asynchronous responses, advancing the narrative as each player responds. This is a mode that traditional RPGs struggle with but LLM RPGs handle natively.

---

# Part 3: What exists in the space already

## Academic work

1. **ChatRPG: Static vs. Agentic Game Master AI** (arxiv 2502.19519, Feb 2025). Tested a D&D-inspired text RPG with two architectures. The agentic version (narrator + archivist agents) significantly outperformed the static version on immersion (2.42 vs 1.64, p=0.034), curiosity (2.57 vs 1.83, p=0.047), and story coherence (2.25 vs 1.00, p=0.040). Key recommendation: separate narrative generation from state management. N=12 participants. (Verified: full paper)

2. **SHARI: AI-Driven System for Game Mastering** (SSRN, Oct 2024). Proposes an Assess-Narrate-Update (ANU) framework for AI GM reasoning: assess the current game state, narrate the response, update the state. Formalizes the GM decision loop. (Reported: SSRN abstract)

3. **PANGeA: Procedural Artificial Narrative using Generative AI** (arxiv 2404.19721, Apr 2024). Structured approach using LLMs to generate both game level data and dynamic free-form interactions in turn-based RPGs. (Reported: arxiv abstract)

4. **Multi-Actor Generative AI as a Game Engine** (arxiv 2507.08892, Jul 2025). Explores multi-agent LLM architectures for game engines. (Reported: arxiv listing)

5. **GPT for Games: An Updated Scoping Review 2020-2024** (arxiv 2411.00308, Nov 2024). Survey of LLM applications in game design and play, including GM roles. (Reported: arxiv listing)

## Products and experiments

1. **AI Dungeon** (Latitude.io). The original LLM text adventure, now using multiple models. Pioneered the space but demonstrated the core failure modes: narrative drift, character inconsistency, over-compliance. Their evolution from unstructured GPT-2 generation to more structured systems with memory and world info is instructive. (Reported: AI Dungeon documentation, Wikipedia)

2. **Friends & Fables.** Multiplayer AI DM ("Franz") with structured D&D 5e rule enforcement. Uses a database for game state rather than relying on the LLM's memory. Reported 41.8% fewer hallucinations with hybrid AI + structured rules approach. (Reported: product documentation)

3. **AI Realm.** D&D 5e-inspired AI GM with character creation and world generation. (Reported: product site)

4. **RoleForge.** Purpose-built AI Game Master platform combining AI narration with persistent world state, visual tabletop, and actual game mechanics. Designed for solo and group play. (Reported: product blog)

5. **RPGGO / Zagii Engine.** Game-structure-based system with Player Assistant and Emerging Narrative subsystems. (Reported: product blog)

6. **IronswornGPT.** GPT-based companion for Ironsworn solo play, replacing oracle lookups with contextual AI responses. (Reported: YesChat.ai)

7. **Solo RPG Revolution: Using AI as Your Game Master.** A published guide on DriveThruRPG for using AI with solo RPG systems. (Reported: DriveThruRPG listing)

## Community insights

The "70/30 Co-DM Method" (70% human narrative authority, 30% AI support) has emerged as a common pattern in groups using AI assistants alongside human GMs. This suggests the current state of the art is augmentation rather than replacement, but the trajectory is toward increasing AI capability. (Reported: DEV Community analysis)

EN World forum discussions consistently identify social encounters and NPC conversation as LLM strengths, with combat tracking, spatial reasoning, and precise mechanical enforcement as weaknesses. (Reported: EN World threads)

---

# Synthesis: Most promising directions for the Adventure Engine

## Immediate implications (verified patterns)

1. **Ironsworn's oracle replacement model is proven.** The LLM replaces the oracle, not the entire system. Keep structured moves and progress tracks; replace random tables with contextual AI responses. The IronswornGPT experiment validates this.

2. **Narrator/archivist separation is load-bearing.** The ChatRPG study's most actionable finding: separate the agent that tells the story from the agent that tracks state. The Adventure Engine should architect for this split.

3. **Hope/Fear works for LLM pacing.** Daggerheart's dual resource economy gives the LLM explicit permission to introduce complications (spend Fear) rather than relying on its judgment about when to make things hard. This is already implemented and should be preserved.

4. **Keywords need bounded definitions.** The prior research on Experience constraint (positive scope, explicit exclusions, narrative origin) is the right approach. Without it, trait inflation is inevitable.

## Medium-term exploration (inferred from multiple sources)

5. **Position/effect from Blades in the Dark is underexplored.** The framework of "how dangerous is this situation?" + "how much impact could your action have?" produces exactly the right kind of prompt for LLM judgment. Worth prototyping alongside or instead of DC-based resolution.

6. **Token economies as pacing mechanisms.** The Belonging Outside Belonging pattern (struggle to earn tokens, spend tokens to triumph) is a lightweight alternative or supplement to dice. It removes the LLM from probability judgment entirely and makes pacing a player-driven choice.

7. **Scene-based session structure with checkpoints.** Design sessions as 3-7 discrete scenes with explicit dramatic questions. Snapshot state between scenes. This limits drift propagation and creates natural save points.

8. **Narrative act structure as a game mechanic.** Tracking which act the story is in (setup, complication, resolution) and adjusting the LLM's behavior accordingly leverages genre awareness as a structural tool rather than relying on it as an unstructured tendency.

## Speculative (worth investigating, not yet validated)

9. **LLM-native RPG system from scratch.** Rather than adapting existing systems, design a system where the resolution mechanic IS the conversation. Player-side dice for uncertainty, LLM-declared stakes for transparency, token economies for pacing, structured state for consistency. No system does all of this today.

10. **Asynchronous multi-player.** LLM GMs can manage play-by-post naturally, with individual spotlight management and shared world state. This is a mode traditional RPGs handle poorly but LLM RPGs could excel at.

11. **Player-as-continuity-checker.** Making the player a first-class participant in world consistency ("does this fit?") rather than treating consistency as a purely technical problem. This distributes the cognitive load and creates collaborative worldbuilding.

---

## Sources

### Academic papers
- [Static vs. Agentic Game Master AI (ChatRPG)](https://arxiv.org/abs/2502.19519) - Feb 2025
- [SHARI: AI-Driven System for Game Mastering](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5004113) - Oct 2024
- [PANGeA: Procedural Artificial Narrative](https://arxiv.org/abs/2404.19721) - Apr 2024
- [Multi-Actor Generative AI as Game Engine](https://arxiv.org/pdf/2507.08892) - Jul 2025
- [GPT for Games: Scoping Review 2020-2024](https://arxiv.org/pdf/2411.00308) - Nov 2024

### Game system references
- [Ironsworn SRD](https://tomkinpress.com/pages/ironsworn) / [itch.io](https://shawn-tomkin.itch.io/ironsworn)
- [Daggerheart SRD](https://daggerheartsrd.com/rules/) / [Overview](https://daggerheart.org/overview)
- [Blades in the Dark SRD](https://bladesinthedark.com/basics) / [Progress Clocks](https://bladesinthedark.com/progress-clocks)
- [Lasers & Feelings](https://johnharper.itch.io/lasers-feelings)
- [Fate Core SRD](https://fate-srd.com/)
- [Mythic GME](https://www.wordmillgames.com/page/mythic-gme.html)
- [Belonging Outside Belonging](https://buriedwithoutceremony.com/belonging)
- [Amber Diceless RPG](https://en.wikipedia.org/wiki/Amber_Diceless_Roleplaying_Game)
- [Fiasco](https://bullypulpitgames.com/products/fiasco)
- [Risus RPG](http://risus.cumberlandgames.com/)

### Products and platforms
- [AI Dungeon](https://aidungeon.com/)
- [Friends & Fables](https://www.friendsandfables.com/)
- [AI Realm](https://airealm.com/)
- [RoleForge](https://roleforge.ai/)
- [Solo RPG Revolution guide](https://www.drivethrurpg.com/en/product/496293/solo-rpg-revolution-using-ai-as-your-game-master)

### Community and analysis
- [EN World: AI Gamemasters discussion](https://www.enworld.org/threads/any-ai-gamemasters-out-there.708090/)
- [EN World: LLMs as a GM](https://www.enworld.org/threads/llms-as-a-gm.714126/)
- [BoardGameGeek: LLM AI for solo playing](https://boardgamegeek.com/thread/3205433/using-llm-ai-for-solo-playing)
- [DEV Community: LLMs as Dungeon Masters](https://dev.to/pracode_2503/llms-as-dungeon-masters-can-ai-run-a-tabletop-game-without-cheating-425m)
- [Sly Flourish: The Best LLM](https://slyflourish.com/best_llm.html)
- [The Alexandrian: Blades Progress Clocks](https://thealexandrian.net/wordpress/40424/roleplaying-games/blades-in-the-dark-progress-clocks)

### Prior project research
- `.lore/research/llm-integration-notes-daggerheart.md` - keyword constraint framework
- `.lore/research/ttrpg-gm-reference-guide.md` - system-agnostic GM principles
