---
title: World Engine and Perspective Agents
status: brainstorm
created: 2026-07-24
---

# Brainstorm: World Engine and Perspective Agents

## Context

An LLM with broad access to an adventure's files is effectively omniscient. It can accidentally let an NPC reveal details from a player character sheet, a secret plan, or GM-only notes merely because that information appeared in its context or was available through its tools.

Instructions such as “the NPC does not know this” are useful guidance, but they are not a reliable knowledge boundary. The boundary must be enforced by **scoped context and capabilities**: each role receives only the information it is allowed to use.

The aim is to preserve the rich, Markdown-based campaign material used by adventures such as *The Broken Lands* while making knowledge, perspective, and authority explicit at runtime.

This is a future architecture exploration, not an MVP requirement. It should build on the existing direction of file-owned adventure state, fresh prompt assembly, and a single daemon entry point for model calls.

## Proposal

Use one authoritative **World Engine** to adjudicate play and commit state, a player-facing **Narrator** to turn approved outcomes into prose, and short-lived, knowledge-scoped **NPC agents** only when an independent NPC reaction matters.

This is not a swarm of autonomous agents. It is a single orchestration loop with isolated, bounded calls for portrayal and actor decisions.

```text
Canonical campaign state
        ↓
World Engine: interprets intent and decides what happens
        ↓
Optional scoped NPC agent(s): propose consequential reactions
        ↓
World Engine: validates proposals and commits state
        ↓
Narrator: presents the approved player-visible outcome
        ↓
Player response
```

## Roles and Authority

### World Engine

The World Engine is the authoritative GM/referee/director. It has privileged access to canonical campaign material and is the **only role permitted to commit canonical state**.

It is responsible for:

- interpreting player intent;
- retrieving relevant world, quest, location, rules, and character material;
- deciding which clocks, factions, threats, and off-screen developments advance;
- determining whether a rules procedure or dice roll is needed;
- deciding which NPCs need an independent reaction;
- constructing scoped packets for NPCs and the Narrator;
- adjudicating NPC proposals and mechanical results;
- creating authoritative events and updating canonical state;
- accepting, revising, or rejecting proposed memories and beliefs; and
- producing an approved handoff for the Narrator.

The World Engine answers **“what happens?”** It need not produce polished player-facing prose.

### Narrator

The Narrator is a persistent role identity and continuity/style layer, but its turn context is rebuilt from a bounded, player-visible scene packet.

It is responsible for:

- prose, mood, sensory detail, pacing, and dramatic framing;
- presenting approved public outcomes;
- preserving player agency; and
- inviting the next player action where appropriate.

It receives only what the player character knows or perceives, approved NPC dialogue and actions, relevant player-visible history, and continuity information such as tone and motifs.

The Narrator may invent **presentation**, not **causality**. It may describe perception and atmosphere, but it must not establish hidden facts, mechanical outcomes, secret revelations, or state changes.

```text
You may elaborate presentation.
You may not elaborate causality.
You may describe perception.
You may not establish unseen truth.
```

### NPC Agents

NPC agents are short-lived calls used only when an NPC's distinct knowledge, motives, or reaction is consequential. Minor NPCs can be portrayed from a short scene card without a separate model call.

An NPC packet contains only:

1. **Self** — voice, values, habits, fears, and capabilities.
2. **Relationship** — the NPC's current view of the player character and relevant people.
3. **Situated perception** — what the NPC can see, hear, and reasonably infer now.
4. **Private agenda** — goals, constraints, and unresolved tensions.
5. **Knowledge ledger** — only what the NPC has seen, been told, inferred, or believes.

The NPC returns proposals rather than authoritative changes: an assessment or intention, dialogue, an attempted immediate action, and proposed memories, beliefs, suspicions, or questions. The World Engine validates the result before it affects the campaign.

Recurring NPCs and major antagonists can retain persistent memory, belief, and goal overlays. Those overlays remain partial and fallible perspectives, not copies of the full campaign bible.

### Rules Resolution

Objective state transitions should increasingly be code- or tool-owned: dice, HP, Stress, Hope, conditions, inventory, initiative, and similar mechanics.

The World Engine may decide which procedure applies, but a rules tool or state gate should record the final mechanical result. The Narrator then describes that approved result.

## State and Access Model

Do not replace the campaign's rich Markdown material with a flat fact database. Campaigns contain confirmed truths, interpretations, mysteries, competing theories, social relationships, classified plans, and emotional stakes. Keep the Markdown campaign bible; add runtime projections and ledgers around it.

### Canonical campaign state

GM-private, authoritative material might include:

```text
world.md
characters/*.md
locations/*.md
quests/*.md
narrative/*.md
plans/*.md
```

This is where setting detail, hidden truth, unresolved mysteries, factions, clocks, and authored hooks live. The World Engine may retrieve from it; Narrator and NPC contexts must not read it wholesale.

Canonical state may explicitly contain **unknown** or **deliberately undecided** material. A mystery does not require a predefined answer merely because a model is participating in play.

### Actor knowledge state

Per-important-character overlays record what an actor remembers, believes, suspects, wants, and has been told.

```text
runtime/actors/
  scholar-miriam/
    memory.md
    beliefs.md
    current-goals.md
  keeper-marantha/
    memory.md
    beliefs.md
    current-goals.md
```

These are an actor's partial perspective. They are not canonical truth and are not copies of the world bible.

### Player-visible state

This records what the player character has perceived, learned, been told, and can act on. It must remain distinct from GM state.

```text
runtime/player-visible.md
runtime/player-private.md
summaries/player-visible.md
```

A player character sheet also needs projections. NPCs should receive public or observed identity and behavior—not private backstory, exact resources, detailed abilities, unspoken thoughts, or GM-only notes.

### Narrative presentation state

The Narrator may use a non-canonical continuity aid containing recent player-visible prose and events, tone and style, recurring motifs, current dramatic pressure, and unresolved foreground questions.

This supports strong storytelling without allowing prior prose to silently become canonical truth.

## Modeling Knowledge

The useful runtime unit is often a **dossier** or **knowledge item**, not an atomic fact. Important kinds include established truth, interpretation, theory, rumor, plan, relationship, secret, promise, capability, memory, and quest lead.

For every consequential proposition, keep these concerns separate:

1. **Canonical status** — true, false, unresolved, unknown, or deliberately undecided.
2. **Access** — who is permitted to know it.
3. **Perspective** — what each actor believes, suspects, claims, remembers, or wants.

A theory is not a truth. A rumor is not a certain belief. An NPC may be mistaken. The runtime model should preserve those distinctions instead of flattening them away.

### Sensitive authoring labels

Headings such as “Known Facts” are ambiguous: they may contain confirmed truth, inference, rumor, a capability claim, or knowledge restricted to a group. For sensitive material, use explicit sections or metadata such as:

```md
## Canonical / GM Truth
## Publicly Observable
## What Kael Knows
## What the Custodians Know
## Beliefs and Theories
## Rumors / Unverified Intelligence
## Intentions and Plans
## Secrets and Access Policy
## Current Status
```

Not every file needs every section. Apply this structure where secrecy, uncertainty, or competing perspectives matter.

### First-class plans and mysteries

Consequential operations should not exist only as duplicated prose across world, quest, history, and character files. Give major plans and mysteries their own artifacts with an access policy.

For example, `plans/flawed-seventh-opening.md` could record its status, core hypothesis, confirmed evidence, open uncertainties, and access policy: Kael and the inner council know the full rationale; Miriam knows only what she has been briefed on; general Custodians know a containment strategy is under review; Witnesses have no access.

Use this sparingly for secret plans, conspiracies, faction agendas, cursed artifacts, long-term bargains, and campaign-defining mysteries.

## Information Flow

### Player input

The full player message goes to the World Engine. Do not pass it unchanged to an NPC agent when it includes private narration.

If the player writes:

> I smile at Miriam, but I am lying. I hide my fear and do not tell her about the voice from the Lexicon.

Miriam should receive only the observable projection unless a roll, established relationship, magic, or prior information permits more:

```md
Kael smiles and says: “It is only a theory.”

Observable details:
- He pauses before answering.
- His hands remain close to the closed folio.
- He does not mention hearing a voice.
```

### Example NPC packet

```md
# You are Scholar Miriam

## Current scene
You are in the compound library. Kael has proposed that a deliberately contradictory True Name invocation might shatter the Seventh Opening pattern rather than complete it.

## What you know
- You are an expert in containment and the Lexicon.
- Kael has shown unusual discipline over six months of supervised study.
- An attempted Seventh Opening was stopped at Ashford Cross.
- You have not been told of any council-approved plan.
- You do not know Brother Tomas's ultimate purpose.

## Relationship
You are Kael's mentor and increasingly his ally. You protect him without patronizing him and challenge weak reasoning.

## Goals in this moment
- Assess whether his reasoning is sound.
- Make sure Kael understands the personal risk.
- Keep the conversation grounded in containment practice.

## Respond with
1. private assessment;
2. proposed dialogue;
3. any attempted immediate action; and
4. memories or beliefs you think you gained.

Do not narrate Kael's inner thoughts, decide Kael's actions, or claim knowledge you lack.
```

### Example NPC proposal

```json
{
  "privateAssessment": "The geometry may be plausible, but Kael is treating his own survivability as an acceptable variable.",
  "speech": "Then the question is not whether the pattern can break. It is what breaks with it—and whether you have quietly placed yourself in that answer.",
  "proposedAction": "She closes the folio and asks Kael to reconstruct the reasoning from first principles.",
  "proposedMemories": [
    {
      "kind": "belief",
      "statement": "Kael may be considering himself necessary to the proposed invocation.",
      "confidence": "likely"
    }
  ]
}
```

The World Engine may accept, modify, or reject every part of that proposal.

### Example Narrator handoff

The World Engine should hand the Narrator a structured, player-visible packet rather than unrestricted world notes:

```md
# Scene packet: Compound library, three days after Ashford Cross

## What Kael can perceive
- Candlelit library; rain begins against narrow windows.
- The compound is busy and tense after the successful assault.
- Miriam is sorting pages from the seized ritual materials.
- An unopened message bearing Marantha's seal sits on the table.

## What Kael already knows and may naturally recall
- The Seventh Opening is six points complete.
- His flawed-invocation hypothesis might permanently break it.
- The idea may require him to act as Speaker.
- Tomas shaped his life toward contamination.

## Dramatic pressure
- The player has a dangerous breakthrough but not a safe implementation.
- The victory at Ashford Cross created a brief, fragile window.
- Tomas's motive remains unresolved.

## Approved NPC behavior
- Miriam is concerned, observant, and technically precise.
- She will not speak as if she knows council decisions she has not been told.
- She may notice Kael's strain and ask direct questions.

## Do not reveal
- Any unbriefed council contingency.
- The ultimate truth of Tomas's agenda.
```

## Mediated Memory Writes

Narrator and NPC agents may propose memories, beliefs, suspicions, and summaries, but they must not directly persist them.

The World Engine decides whether a proposed item becomes a canonical event, actor memory, belief or suspicion, rumor, player-visible discovery, or no persistent state at all. This prevents hallucinated facts, improper access propagation, irrelevant memory accumulation, and player-prompt injection from becoming permanent campaign truth.

Incorrect beliefs should persist when appropriate—record them as beliefs, not canonical reality.

## Context Lifetime

World Engine and Narrator can have persistent identities, goals, style, and curated long-term summaries. Their raw model context should nevertheless be rebuilt from authoritative state each turn.

```text
persistent role identity
+ curated long-term summary
+ current scoped scene packet
+ recent relevant exchange
= bounded turn context
```

A long-lived raw model session can accumulate stale assumptions, leaked information, prompt-injection residue, and context bloat. It must not become the source of truth.

## Suggested Runtime Loop

1. The World Engine receives and interprets the player message.
2. It retrieves relevant canonical material and determines the rules procedure.
3. It resolves objective mechanics through code or tools where possible.
4. It creates candidate events and decides whether any NPC needs a consequential response.
5. It invokes those NPC agents in parallel with scoped packets.
6. It adjudicates their proposals and commits authoritative events and state changes.
7. It updates player-visible and actor knowledge ledgers through mediated writes.
8. It creates an approved player-visible scene handoff.
9. The Narrator produces prose and invites the next player action.

## Implementation Principles

- Only the coordinator/World Engine may access broad campaign material.
- Narrator and NPC calls should initially be tool-less; do not expose generic file-reading, directory-listing, or adventure-wide search tools.
- Markdown remains the primary authoring and inspection format.
- Runtime state may be Markdown or structured data; separation and permissions matter more than the serialization format.
- Start with a few high-value secrets and recurring NPCs, not the entire game world.
- Preserve uncertainty as uncertainty; do not force a model to resolve a mystery before play demands it.
- Treat generated prose as presentation unless the World Engine accepts it as an event or state update.

## Initial Milestone

Apply the design to one adventure, such as *The Broken Lands*, with a narrow scope:

1. Mark sensitive boundaries for the flawed-invocation plan, Tomas conspiracy, interrogation results, Lexicon access, Custodian policy, and Kael's private sheet.
2. Implement a projection service that builds packets for the World Engine, Narrator, and one or two major NPCs.
3. Remove raw file and search tools from Narrator and NPC contexts.
4. Have NPCs propose structured actions and memory updates.
5. Let the World Engine validate and commit events.
6. Add tests proving that prohibited secrets cannot occur in particular role packets.

Example invariants:

- Widow Chenns cannot receive the Lexicon's current location.
- Caldris cannot receive the flawed-invocation theory unless formally briefed.
- Veraine cannot receive Custodian containment plans.
- Miriam's packet excludes inner-council material unless she has been briefed.
- Narrator input excludes the unresolved truth of Tomas's agenda.
- An NPC's player-character projection excludes private backstory, unobserved mechanics, and internal narration.

## Open Questions

1. What is the smallest viable packet schema that is both inspectable in Markdown and reliable for programmatic validation?
2. Where should access policy live: source files, a projection manifest, metadata frontmatter, or a combination?
3. How should player-visible history and actor memories interact with the MVP's file-based conversation history?
4. What audit trail is needed to explain why a role received a particular piece of information?
5. Which state transitions must be code-owned before this design provides meaningful protection?
6. How should the system distinguish an NPC's reasonable inference from information leakage in tests?

## Guiding Summary

> Keep the rich campaign bible. Do not ask models to forget what they have read. Instead, give each role a deliberately constructed perspective, let only the World Engine decide what becomes true, and let the Narrator make approved player-visible reality feel like a story.
