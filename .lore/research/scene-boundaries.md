---
title: Scene Boundaries in TTRPGs, Interactive Fiction, and AI Narrative Systems
date: 2026-03-31
status: complete
tags: [research, scene-boundaries, conversation-history, context-management, narrative-structure]
related: [.lore/brainstorm/conversation-history.md, .lore/research/llm-optimized-rpg-systems.md]
---

# Scene Boundaries

This research answers the question "what is a scene?" for the Adventure Engine's conversation history system. The brainstorm at `.lore/brainstorm/conversation-history.md` proposes a scene-based hybrid approach (Approach 3) where completed scenes are summarized and new scenes start with fresh context. That approach is load-bearing on a definition of "scene" and a mechanism for detecting scene transitions.

## Confidence levels

- **Verified**: checked against SRD text, official documentation, or published source code
- **Reported**: sourced from community discussion, blog posts, or product documentation
- **Inferred**: synthesized from multiple data points by the author
- **Academic**: sourced from peer-reviewed publications

---

# 1. How Published TTRPG Systems Define Scenes

## Fate Core: Scenes as the primary mechanical unit

Fate Core makes scenes the fundamental unit of play. A scene is a discrete unit of time during which characters pursue goals in a specific situation. (Verified: [Fate Core SRD, Types of Aspects](https://fate-srd.com/fate-core/types-aspects))

**What triggers a scene transition:**
- The current situation resolves (a conflict ends, a challenge is overcome, a social encounter concludes)
- The characters leave the current location
- A significant time skip occurs
- The GM decides to "cut" to a new situation

**Mechanical effects at scene boundaries:**
- **Situation aspects vanish.** Situation aspects are "intended to last only for a single scene or until it no longer makes sense." When a scene ends, all situation aspects created during it disappear unless narratively carried forward. (Verified: Fate Core SRD)
- **"Once per scene" abilities reset.** Stunts with per-scene limiters refresh. This is the most common limiter in Fate stunt design. (Verified: [Fate Core SRD, The Exchange](https://fate-srd.com/fate-core/exchange))
- **Stress clears.** Physical and mental stress tracks clear at the end of a scene (consequences persist longer). This means a scene boundary has direct mechanical weight: it determines when characters recover from minor harm. (Verified: Fate Core SRD)
- **Zones are re-established.** Each scene defines its own zone map for movement and positioning.

**Why this matters for the Adventure Engine:** Fate demonstrates that "scene" can be a first-class mechanical concept with concrete game effects. Scene boundaries are not just narrative flavor; they are the clock that drives resource recovery and ability refresh. This gives both the system and the player a reason to care about when scenes start and end.

## Blades in the Dark: Phases as structural scenes

Blades in the Dark doesn't use the word "scene" as a mechanical term. Instead, it organizes play into four structural phases that function as scene-level containers: Free Play, Planning & Engagement, The Score, and Downtime. (Verified: [Blades in the Dark SRD, Core System](https://bladesinthedark.com/core-system))

**What triggers phase transitions:**
- **Free Play to Score:** The group chooses a target and a plan type, triggering an engagement roll.
- **Score to Downtime:** The score concludes (successfully or not).
- **Downtime to Free Play:** All downtime activities are resolved.

**Mechanical effects at phase boundaries:**
- The engagement roll establishes the initial situation for the score.
- Downtime triggers payoff, heat, and entanglement systems.
- Each PC gets exactly two downtime activities.
- Progress clocks may tick or clear at phase boundaries.

The SRD explicitly frames these as "a conceptual model to help you organize the game" rather than rigid walls. (Verified: Blades SRD)

**Why this matters:** Blades shows that scene-level structure can be phase-based rather than location-based. The transition triggers are activity-based ("the crew decides to do a job" / "the job is done"), not geographic. For an AI system, phase transitions are easier to detect than location changes because they correspond to explicit player decisions.

## Powered by the Apocalypse: Implicit scenes, explicit moves

PbtA games generally don't formalize scenes as a mechanical unit. Apocalypse World and its descendants operate on a move-by-move basis where the GM frames situations, players trigger moves, and the fiction evolves. (Verified: Apocalypse World 2e, Dungeon World SRD)

**Scene framing in PbtA:**
- The GM "frames a scene" by describing a situation and asking "what do you do?"
- Scene framing is a conversational negotiation between GM and players, not a mechanical procedure.
- There is no explicit "end scene" trigger. Scenes end when the situation resolves, the spotlight shifts to another character, or the GM cuts to a new situation.

**Where scenes matter mechanically:**
- Some PbtA games use "end of session" moves but not "end of scene" moves.
- A few PbtA derivatives (notably Masks: A New Generation) have per-scene mechanical effects, borrowing from Fate's approach.

**Why this matters:** PbtA demonstrates that a system can work without formal scene boundaries. The GM's judgment about when to "cut" is sufficient. This is relevant because it shows that rigid scene detection is not necessary for good play, but it also means PbtA offers no reusable pattern for automated scene detection.

## Ironsworn/Starforged: Session moves and scene challenges

Ironsworn uses session-level moves rather than scene-level ones. "Begin a Session" and "End a Session" are explicit moves that frame the play session with recap and reflection. (Verified: [Ironsworn SRD, Moves](https://swornforged.com/srd/moves))

Starforged adds **Scene Challenges** as an optional subsystem for extended non-combat encounters (a chase, a political debate, a heist). These use a progress-track-like mechanism to structure a scene as a coherent dramatic unit with rising tension and a resolution. (Reported: Starforged Reference Guide)

**Why this matters:** Ironsworn's session moves map directly to the "Previously, on..." recap mechanic already proposed in the brainstorm. Scene Challenges show that "scene" can be an opt-in concept: most play flows without scene boundaries, but certain dramatic moments benefit from explicit scene framing.

## Daggerheart: Organic scenes with mechanical punctuation

Daggerheart does not formally define scene boundaries. The SRD describes the core gameplay loop as: GM describes a scenario, players take action, the fiction evolves, repeat "until the end of the scene is triggered by a mechanic or arrives organically." (Verified: [Daggerheart SRD](https://daggerheartsrd.com/rules/))

**What triggers scene transitions:**
- A rest (short or long) is the primary mechanical boundary. Per-rest abilities refresh, stress may recover.
- Organic narrative conclusion: "the scene continues until it arrives organically at its end."

**Mechanical effects:**
- Some domain card abilities have per-rest usage limits.
- The Hope/Fear economy accumulates across scenes and is not reset at scene boundaries, only at rests.

**Why this matters:** Daggerheart's approach is the closest to what an AI GM would naturally do: scenes end when it feels right. But "when it feels right" is exactly the detection problem. Daggerheart punts on formalization because it has a human GM to make the call.

## Mythic Game Master Emulator: Scenes as the core loop

Mythic GME makes scenes the fundamental unit of solo play. The entire game loop is: set up a scene, play through it, end the scene, set up the next one. (Verified: [Mythic GME reviews and guides](https://hws3.wordpress.com/2023/03/11/review-mythic-game-master-emulator-2nd-edition/))

**Scene setup procedure:**
1. The player decides what the next scene is probably about.
2. Roll 1d10 against the Chaos Factor (default 5).
3. If the roll is equal or under the Chaos Factor:
   - Odd result: **Altered Scene** (the scene setup changes to "the next most logical outcome").
   - Even result: **Interrupted Scene** (a random event replaces the planned scene entirely).
4. If the roll is above the Chaos Factor, the scene plays out as expected.

**The Chaos Factor:**
- Starts at 5, ranges from 1-9.
- Increases when the player loses control of the situation; decreases when they gain control.
- Higher Chaos Factor means more altered/interrupted scenes, creating narrative escalation.

**Why this matters profoundly:** Mythic is the only system that both formalizes scene boundaries AND provides a mechanism for scene transitions that includes surprise. The Altered/Interrupted Scene mechanic is directly transferable to an AI system: when the AI detects a natural scene boundary, it could introduce variation (altered or interrupted) based on a narrative tension metric analogous to the Chaos Factor. This is the strongest design pattern found in this research for an AI scene-boundary system.

## Summary: TTRPG scene definitions

| System | Scene formalization | Transition trigger | Mechanical weight |
|---|---|---|---|
| Fate Core | First-class mechanical unit | Situation resolves, location changes, GM cut | Heavy (stress clears, aspects vanish, abilities reset) |
| Blades in the Dark | Phase-based structure | Activity completion (score done, downtime done) | Heavy (phase-specific systems activate) |
| PbtA | Informal, GM judgment | GM cuts, spotlight shifts | None to light |
| Ironsworn/Starforged | Session moves + optional Scene Challenges | Session start/end; Scene Challenges are opt-in | Light (recap, reflection) |
| Daggerheart | Organic, rest-punctuated | Rests, organic resolution | Light (per-rest resets) |
| Mythic GME | Core game loop | Player declares, Chaos Factor modifies | Central (scene setup IS the game) |

---

# 2. How Interactive Fiction Handles Scene Transitions

## Inform 7: Scenes as temporal regions

Inform 7 treats scenes as the temporal equivalent of rooms. Rooms organize space; scenes organize time. A scene is "a kind of thing which has a beginning and an ending." (Verified: [Inform 7 Documentation, 10.1](https://ganelson.github.io/inform-website/book/WI_10_1.html))

**How scenes work:**
- Scenes begin and end based on **conditions**, not commands. You write `Train Stop begins when the player is in the Station` rather than imperatively starting scenes.
- Multiple scenes can run simultaneously.
- Scenes can be recurring (they restart when their begin-condition becomes true again).
- Scene changes happen between turns, not during them, guaranteeing that each action falls entirely inside or outside any given scene.
- Each scene has two rulebooks: "when [scene] begins" and "when [scene] ends."

**Design rationale:** Inform chose condition-based triggers because they "promote a style of writing which makes it clearer to the reader when a scene begins and ends, and what conditions are guaranteed to be true during it." (Verified: [Inform 7 Documentation, 10.9](https://ganelson.github.io/inform-website/book/WI_10_9.html))

**Why this matters:** Inform's model is the most formally rigorous scene system in interactive fiction. Its key insight is that scenes should be defined by world-state conditions, not by explicit "start scene" commands. For an AI system, this translates to: define scene boundaries in terms of observable game state (location, quest status, character condition) rather than trying to detect narrative rhythm.

## Twine: Passages as atomic scenes

Twine organizes narrative into **passages**, which are the atomic unit of presentation. Each passage is a self-contained block of text with links to other passages. (Verified: [Twine documentation](https://twinery.org/))

- Passages map roughly to scenes: the reader sees one passage at a time and transitions by clicking links.
- The structure is a graph of linked passages, not a linear sequence.
- Variables persist across passages, allowing earlier choices to affect later content.
- Branches can rejoin, creating a diamond structure rather than an ever-expanding tree.

**Why this matters:** Twine's model is explicitly player-driven: the player clicks a link to transition. There is no automatic detection. The author pre-defines every possible transition. This is the "player-declared" model of scene transitions taken to its logical extreme.

## Ink (Inkle): Knots and stitches as scene hierarchy

Ink uses weaving metaphors for narrative structure. **Knots** are the primary organizational unit (roughly equivalent to scenes or chapters), and **stitches** are subdivisions within knots (events within a scene). (Verified: [Ink documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md))

- Knots are defined with `=== knot_name ===`
- Stitches are defined with `= stitch_name` within a knot
- Navigation uses diverts: `-> knot_name` to jump to a knot
- The recommended pattern: "use a knot for a scene, and stitches for the events within the scene"

**Why this matters:** Ink's two-level hierarchy (knot/stitch) maps to the scene/beat distinction that appears across multiple systems. A "scene" contains multiple "beats" or "events." For the Adventure Engine, this suggests that scene boundaries should be coarser-grained than individual exchanges; a scene encompasses several back-and-forth turns that share a situation.

## ChoiceScript (Choice of Games): Scenes as files

ChoiceScript maps scenes to literal files. Each `.txt` file in the scenes folder is a "scene." Transitions use `*finish` (go to the next scene in order) or `*goto_scene scene_name` (jump to a specific scene). (Verified: [ChoiceScript Wiki](https://choicescriptdev.fandom.com/wiki/Scenes))

- Temporary variables are lost when a scene file transitions (`*goto_scene` clears `*temp` variables).
- Persistent variables survive across scenes.
- The scene list is defined in `startup.txt`.

**Why this matters:** ChoiceScript's temp-variable-clearing is a practical consequence of scene boundaries that mirrors Fate's stress-clearing. Scene transitions are a natural point to shed ephemeral state while preserving persistent state. For the Adventure Engine, this maps directly to: scene summaries capture persistent state (world changes, quest progress), while ephemeral state (what the barkeeper said three turns ago) can be discarded or compressed.

## Summary: IF scene models

| System | Scene unit | Transition mechanism | State behavior at boundary |
|---|---|---|---|
| Inform 7 | Condition-triggered temporal region | World-state conditions | Rulebooks fire at begin/end |
| Twine | Passage (atomic text block) | Player clicks link | Variables persist, passage text changes |
| Ink | Knot (with stitch subdivisions) | Author-defined diverts | Flow changes, variables persist |
| ChoiceScript | File | `*finish` or `*goto_scene` | Temp variables cleared, persistent variables kept |

---

# 3. How AI Narrative Systems Handle Context Segmentation

## AI Dungeon: Memory pinning and World Info

AI Dungeon manages context through three layers (Reported: [AI Dungeon Wiki](https://wiki.aidungeon.io/wiki/Memory)):

1. **Recent context**: The last ~2000-3000 tokens of conversation, always included.
2. **Remember (Memory)**: A user-editable block (~1000 characters) that is always injected into context after every input. Essentially a permanent prompt prefix.
3. **World Info (Story Cards)**: Keyword-triggered entries (~500 characters each) that activate when their trigger words appear in recent context.

**No scene boundaries.** AI Dungeon has no concept of scenes. The context window is a sliding window over the conversation, and older content simply falls off the end. Memory and World Info are workarounds for the loss of older context, not structural alternatives to it.

**The problem this creates:** Without scene boundaries, AI Dungeon's coherence degrades over long sessions. The prior research notes a "68% character inconsistency rate in multi-session play without explicit memory management." (Reported: community analysis cited in `llm-optimized-rpg-systems.md`)

## NovelAI: Lorebook as conditional memory

NovelAI uses a similar architecture with more sophisticated mechanics (Reported: [NovelAI Documentation](https://docs.novelai.net/en/text/lorebook/)):

1. **Memory**: Recent story events, always in context.
2. **Author's Note**: Persistent style/direction guidance injected near the end of context (highest attention position).
3. **Lorebook**: Keyword-triggered entries positioned at the top of context, after Memory.

**Token management:** When the token ceiling is reached, less of the main story text is included to make room for Memory, Author's Note, and Lorebook entries. The system prioritizes structured knowledge over raw history.

**No scene boundaries either.** NovelAI treats the story as a continuous stream. The Lorebook's keyword activation is a form of "relevant context retrieval" rather than scene-based segmentation.

## KoboldAI: World Info as hard constraints

KoboldAI uses extensions like World Info to define persistent facts with keyword triggers. These are "not suggestions; they're hard constraints enforced by the model's attention layer." (Reported: community documentation)

**Practical advice from the KoboldAI community:** "After each 500-word segment, append a concise 'Continuity Note' summarizing only what must persist." This is an informal, user-driven version of scene summarization: every ~500 words, create a checkpoint of what matters. (Reported: community guides)

## ChatRPG: Narrator/Archivist architecture

ChatRPG v2 (the subject of the academic paper at arxiv 2502.19519) uses a two-agent architecture (Verified: [ChatRPG paper](https://arxiv.org/html/2502.19519v2)):

- **The Narrator**: Generates narrative responses, handles combat (WoundCharacter, HealCharacter, Battle tools).
- **The Archivist**: Maintains structured game state (UpdateCharacter, UpdateEnvironment tools).

**Context management:** Each agent receives different memory. The Narrator gets narrative-focused memory; the Archivist gets comprehensive JSON descriptions of all game entities. The system does not use explicit scene boundaries or context segmentation. Memory summaries are provided to agents, but the paper does not detail how these are generated or when they're updated.

**The gap:** The ChatRPG paper does not address what happens when conversations exceed context limits. Long-running campaign support remains an unaddressed limitation. (Verified: paper does not detail truncation or segmentation strategies)

## Summary: AI narrative system context strategies

| System | Scene concept | Context strategy | Long-form handling |
|---|---|---|---|
| AI Dungeon | None | Sliding window + Memory pin + World Info triggers | Graceless degradation |
| NovelAI | None | Sliding window + Lorebook triggers + priority ordering | Lorebook displaces old text |
| KoboldAI | None (informal user practice) | Full context + World Info | User-managed continuity notes |
| ChatRPG | None | Dual-agent memory split | Unaddressed |

**The pattern:** No existing AI narrative system uses explicit scene boundaries. All of them manage context through some combination of: (a) sliding window over recent text, (b) pinned persistent information, and (c) keyword-triggered contextual injection. None of them segment the narrative into discrete units.

This is a gap, not a validation. The coherence problems these systems experience (character inconsistency, plot thread loss, tonal drift) are precisely what scene-based segmentation would address.

---

# 4. Detection Signals for Scene Boundaries

## Academic research on narrative scene segmentation

Zehe et al. (2021) define a scene as: "a segment of the text where time and discourse time are more or less equal, the narration focuses on one action and location, and character constellations stay the same." Three dimensions define scene boundaries (Academic: [EACL 2021](https://aclanthology.org/2021.eacl-main.276/)):

1. **Location change**: The setting shifts to a different place.
2. **Time discontinuity**: A gap between story time and narration time (a time skip, a flashback).
3. **Character constellation change**: Different characters are present or the focal characters shift.

Their corpus (German dime novels, 550k tokens) achieved inter-annotator agreement of gamma = 0.7 for scene boundaries, meaning that even human readers agree on scene placement only about 70% of the time. Automated detection using BERT achieved F1 = 0.24, indicating the task is extremely difficult for machines working from raw text alone. (Academic: Zehe et al. 2021)

A follow-up study (2025) using SceneML annotation confirmed that "automatically segmenting narrative text into scenes is a complex task that remains relatively underexplored." Fine-tuned transformer models achieved marginally better results but the task remains open. (Academic: [NAACL 2025](https://aclanthology.org/2025.naacl-long.500.pdf))

## Practical detection signals for an AI GM

The academic definition maps to concrete signals an AI GM can watch for:

**Strong signals (high confidence):**
- **Explicit location transition**: "You leave the tavern and head to the docks." The party is now somewhere else.
- **Explicit time skip**: "Three days pass." / "The next morning..." / "After a long rest..."
- **Combat resolution**: Combat has a clear start (initiative) and end (all enemies defeated, party flees, negotiation). This is the cleanest scene boundary in TTRPG play.
- **Player declaration**: The player says "I want to move on" / "next scene" / "let's skip ahead." Explicit and unambiguous.

**Moderate signals (usually indicates a boundary):**
- **Quest milestone**: A quest objective is completed or failed. "You deliver the package to the merchant."
- **NPC exit/entrance**: A major NPC leaves or a new one arrives, changing the social dynamic.
- **Rest/camp**: The party decides to rest. Most TTRPG systems treat rests as natural breakpoints.

**Weak signals (context-dependent):**
- **Topic shift**: The conversation moves from one subject to another. Common within scenes, not just between them.
- **Tone change**: The mood shifts from tense to relaxed or vice versa. Pacing cue, but not reliably a boundary.
- **Dramatic resolution**: A negotiation concludes, a mystery is solved, a decision is made. Often marks a scene boundary, but "resolution" is subjective.

**Key insight from the academic research:** Even human annotators disagree on scene boundaries 30% of the time. Any automated system should expect ambiguity and design for it, not against it. A system that demands perfect scene detection will fail. A system that treats scene boundaries as suggestions (with the option for player or AI to adjust) will be more robust.

---

# 5. Synthesis: What This Means for the Adventure Engine

## The core finding

"Scene" means different things in different systems, but three patterns recur:

1. **Scenes are defined by situation stability.** A scene persists as long as the location, characters present, and current activity remain roughly the same. When any of these change significantly, a new scene begins. (Fate, Zehe et al., Inform 7)

2. **Scenes have mechanical weight at their boundaries.** Ephemeral state clears, resources refresh, the world state checkpoints. (Fate, Blades, ChoiceScript)

3. **Scene transitions can be multi-sourced.** No single trigger is sufficient. Location change OR dramatic resolution OR player declaration OR time skip can all indicate a scene boundary. (Every system reviewed)

## The definition that fits this project

A scene is a contiguous segment of play unified by situation: the same general location, the same characters present, the same ongoing activity. A scene ends when any of these shift significantly, or when the player or AI declares it over.

This definition is deliberately loose. The academic research shows that even human readers can't agree on precise scene boundaries, so the system should not require precision. Instead, it should support multiple trigger mechanisms with a bias toward over-segmentation (more scenes, each shorter and cleaner) rather than under-segmentation (fewer scenes, each sprawling and harder to summarize).

## Four trigger mechanisms (not mutually exclusive)

These can coexist. A scene boundary fires when any of them activate:

**1. Location-based (strongest signal):**
The party moves to a new location. "You arrive at the docks." This is the easiest to detect and the least ambiguous. It maps to the most common human understanding of scenes (film and theater both use location as the primary scene organizer).

**2. Event-based (strong signal):**
A major activity concludes: combat ends, a negotiation resolves, a puzzle is solved, a rest begins. These are explicit state changes that the AI can identify from its own narration. The AI knows when it narrates "the last goblin falls" or "the merchant agrees to your terms."

**3. Player-declared (explicit signal):**
The player says "let's move on" or uses a command. Zero ambiguity. The cost is friction: players may not want to manage scene boundaries. But as an option alongside automatic detection, it provides a safety valve for when the AI misses a boundary or the player wants to force one.

**4. AI-detected (weakest but most flexible):**
The AI recognizes a natural break point based on narrative rhythm. This is the hardest to get right, but if the AI is already generating the narrative, it can annotate its own output with scene-boundary suggestions. The system then confirms or adjusts.

## The Mythic pattern: scene boundaries as narrative mechanism

The strongest design pattern from this research is Mythic GME's treatment of scene boundaries as a game mechanic, not just an organizational tool. In Mythic, every scene transition is an opportunity for the unexpected: the next scene might be altered or interrupted based on the Chaos Factor.

For the Adventure Engine, this translates to: when a scene boundary fires, the system doesn't just summarize and move on. It evaluates the narrative state and may introduce variation:

- **Normal transition**: The next scene begins as expected.
- **Altered transition**: The next scene begins with a twist (an NPC is missing, the location has changed, a complication has arisen).
- **Interrupted transition**: A new event overrides the expected scene (ambush, messenger arrives, natural disaster).

The probability of alteration/interruption could be driven by a "tension" metric analogous to Mythic's Chaos Factor, tracked in `world.md`. This turns scene boundaries from a technical necessity (context management) into a gameplay feature (narrative surprise).

## What happens at a scene boundary (proposed)

Drawing from Fate, ChoiceScript, and the conversation history brainstorm:

1. **Summarize the completed scene.** The AI generates a narrative summary of what happened, preserving key facts: who was involved, what was decided, what changed, what was left unresolved.
2. **Update world state.** `world.md` is updated with any changes: new NPC relationships, quest progress, location changes, inventory changes.
3. **Archive the scene.** The scene summary is appended to `history.md` (or a per-scene file). The raw conversation for that scene can be compressed or discarded.
4. **Evaluate the transition.** Optionally, apply the Mythic-style alteration check.
5. **Start the new scene.** Fresh context assembled from: system prompt, character sheet, world state, scene summaries (the "Previously, on..." recap), and the new scene's situation.

## What this research does NOT resolve

- **Detection confidence thresholds.** How confident should the AI be before declaring a scene boundary? This requires playtesting. The research suggests erring toward more boundaries (shorter scenes, cleaner summaries) rather than fewer.
- **Summarization quality.** The brainstorm already identified this as the hard problem. A bad summary that drops "the innkeeper's missing daughter" breaks continuity. This research doesn't address summarization, only when to trigger it.
- **Player experience of boundaries.** Does the player notice scene transitions? Should they? Fate players are accustomed to scene boundaries; D&D players are not. The answer likely depends on whether boundaries have visible mechanical effects (ability refresh, stress clear) or are invisible infrastructure.
- **Granularity tuning.** How long should a typical scene be? Film averages 2-3 minutes per scene. TTRPGs vary wildly. The right answer for this engine depends on context window budget and summarization cost, both of which are implementation details.

---

# Sources

## TTRPG Systems
- [Fate Core SRD: Types of Aspects](https://fate-srd.com/fate-core/types-aspects) (scene aspects, situation aspects, per-scene mechanics)
- [Fate Core SRD: The Exchange](https://fate-srd.com/fate-core/exchange) (per-scene stunt limiters)
- [Blades in the Dark SRD: Core System](https://bladesinthedark.com/core-system) (phase structure)
- [Blades in the Dark SRD: Downtime](https://bladesinthedark.com/downtime) (phase transition mechanics)
- [Daggerheart SRD: Rules](https://daggerheartsrd.com/rules/) (organic scene endings)
- [Ironsworn/Starforged SRD: Moves](https://swornforged.com/srd/moves) (session moves, scene challenges)
- Mythic GME 2nd Edition, via [review](https://hws3.wordpress.com/2023/03/11/review-mythic-game-master-emulator-2nd-edition/) and [community guide](https://wispsoftime.com/content/rolling-solo-chapter-6-part-mythic-game-master-emulator/)

## Interactive Fiction
- [Inform 7: Introduction to Scenes](https://ganelson.github.io/inform-website/book/WI_10_1.html)
- [Inform 7: Why Scenes Are Designed This Way](https://ganelson.github.io/inform-website/book/WI_10_9.html)
- [Ink Documentation: Writing With Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) (knots and stitches)
- [ChoiceScript Wiki: Scenes](https://choicescriptdev.fandom.com/wiki/Scenes) (scene-as-file model)
- [Twine](https://twinery.org/) (passage-based structure)

## AI Narrative Systems
- [AI Dungeon Wiki: Memory](https://wiki.aidungeon.io/wiki/Memory)
- [NovelAI Documentation: Lorebook](https://docs.novelai.net/en/text/lorebook/)
- [ChatRPG paper: Static vs. Agentic Game Master AI](https://arxiv.org/html/2502.19519v2) (Narrator/Archivist architecture)

## Academic Research
- Zehe, A., Konle, L., et al. (2021). [Detecting Scenes in Fiction: A New Segmentation Task](https://aclanthology.org/2021.eacl-main.276/). EACL 2021.
- [Assessing the State of the Art in Scene Segmentation](https://aclanthology.org/2025.naacl-long.500.pdf). NAACL 2025.

## Prior Project Research
- `.lore/research/llm-optimized-rpg-systems.md` (Ironsworn, PbtA, Daggerheart, Mythic GME assessments)
- `.lore/brainstorm/conversation-history.md` (Approach 3: scene-based hybrid proposal)
