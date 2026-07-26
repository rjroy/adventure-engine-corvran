---
title: World Engine and Perspective Agents
date: 2026-07-26
status: draft
tags: [architecture, knowledge-boundaries, agents, narrator, npc, future-architecture]
modules: [backend]
req-prefix: WEPA
related:
  - .lore/brainstorm/world-engine-perspective-agents.md
  - .lore/reference/architecture-pattern.md
  - .lore/specs/mvp.md
  - .lore/specs/adventure-file-structure.md
  - .lore/specs/compaction-system.md
  - .lore/brainstorm/conversation-history.md
  - .lore/research/scene-boundaries.md
  - .lore/vision.md
---

# Spec: World Engine and Perspective Agents

## Overview

An LLM with broad file access is effectively omniscient. In the current architecture, a single GM has unrestricted read/write access to the entire adventure directory, including character sheets, world state, history, and any future GM-only secrets. When the GM generates an NPC reaction, the model has seen everything the NPC should not know. Soft instructions ("the NPC doesn't know this") are useful guidance but are not a reliable knowledge boundary.

This spec defines a future architecture in which knowledge, perspective, and authority are explicit at runtime. A single **World Engine** adjudicates play and commits state. A player-facing **Narrator** turns approved outcomes into prose. Short-lived **NPC agents** produce independent reactions only when an NPC's distinct knowledge matters. Each role receives only the information it is permitted to use, delivered through **scoped packets** built by a **projection service**.

This is not a swarm of autonomous agents. It is a single orchestration loop with isolated, bounded model calls for portrayal and actor decisions. The campaign bible remains rich Markdown. Runtime projections and ledgers are layered around it.

## Scope

### In Scope

- Role definitions: World Engine, Narrator, NPC agents. Their authority boundaries and responsibilities.
- A projection service that builds scoped packets per role from canonical state.
- Mediated memory writes: only the World Engine persists state.
- A state and access model distinguishing canonical, actor, player-visible, and narrator-presentation state.
- Knowledge modeling conventions: sensitive authoring labels and first-class plans/mysteries artifacts.
- A runtime loop that orchestrates the roles within a single player turn.
- Testing invariants proving prohibited secrets cannot appear in particular role packets.

### Non-Goals

- **This is a future architecture exploration, not an MVP requirement.** The current single-GM model is not deprecated by this spec. The MVP remains the source of truth for what ships now.
- **Full replacement of the campaign bible with a fact database.** Markdown remains the primary authoring and inspection format. Runtime state may be Markdown or structured data, but separation and permissions matter more than serialization.
- **Autonomous agent swarms.** NPC agents are short-lived, tool-less calls invoked only when an NPC's distinct perspective is consequential. Minor NPCs are portrayed from a scene card without a separate model call.
- **A new daemon topology.** The single daemon entry point and the single session runner for Agent SDK calls (see `.lore/reference/architecture-pattern.md`) remain the integration surface. This architecture describes how the session runner orchestrates multiple bounded calls within a player turn.
- **Mechanical rules engine.** Objective state transitions (dice, HP, Stress, conditions, inventory) are increasingly code- or tool-owned, but a full rules engine is out of scope. This spec only requires that the World Engine route mechanical resolution through a rules tool or state gate rather than asserting results in prose (see REQ-WEPA-33).
- **NPC learning across adventures.** Persistent NPC overlays are scoped to a single adventure. Cross-adventure NPC memory is out of scope.
- **Multi-player.** Single player, single browser, localhost. Same constraint as the MVP.

## Entry Points

- Player submits a message at `POST /adventures/:id/message` (the MVP entry point; unchanged externally).
- The turn handler routes the message into the World Engine runtime loop described in this spec.
- Adventure onboarding / authoring: a campaign author marks sensitive boundaries and access policies on canonical files (see Knowledge Modeling).

## Requirements

### Role Definitions and Authority Boundaries

- REQ-WEPA-1: There are exactly three role classes in this architecture: **World Engine**, **Narrator**, and **NPC agent**. No other roles are defined. The player is not a role; the player submits input that the World Engine interprets.

- REQ-WEPA-2: The **World Engine** is the authoritative GM/referee/director. It is the only role permitted to commit canonical state. It has privileged access to canonical campaign material. Its responsibilities are:
  1. interpreting player intent;
  2. retrieving relevant world, quest, location, rules, and character material;
  3. deciding which clocks, factions, threats, and off-screen developments advance;
  4. determining whether a rules procedure or dice roll is needed and routing it through a rules tool or state gate (see REQ-WEPA-33);
  5. deciding which NPCs require an independent reaction;
  6. constructing scoped packets for NPCs and the Narrator (via the projection service);
  7. adjudicating NPC proposals and mechanical results;
  8. creating authoritative events and updating canonical state;
  9. accepting, revising, or rejecting proposed memories and beliefs (see Mediated Memory Writes);
  10. producing an approved, player-visible handoff for the Narrator.

  The World Engine answers "what happens?" It need not produce polished player-facing prose.

- REQ-WEPA-3: The **Narrator** is a persistent role identity (style, tone, continuity) whose turn context is rebuilt each turn from a bounded, player-visible scene packet. Its responsibilities are:
  1. prose, mood, sensory detail, pacing, dramatic framing;
  2. presenting approved public outcomes only;
  3. preserving player agency (the AI never narrates the player character's actions, decisions, or inner state — see Vision Principle 3, `.lore/vision.md`);
  4. inviting the next player action where appropriate.

  The Narrator may invent **presentation**, not **causality**. It may describe perception and atmosphere. It must not establish hidden facts, mechanical outcomes, secret revelations, or state changes.

- REQ-WEPA-4: The Narrator's boundary is captured by the following rule, which must appear in the Narrator's system prompt verbatim:

  ```
  You may elaborate presentation.
  You may not elaborate causality.
  You may describe perception.
  You may not establish unseen truth.
  ```

  This rule does not replace the MVP's existing GM prompt principles (e.g., REQ-MVP-12's "Player agency is sacred... Never narrate player actions or decisions"). The Narrator prompt includes this verbatim rule *plus* other instructions (style, tone, continuity). The four lines above are the load-bearing boundary; the rest is craft.

- REQ-WEPA-5: **NPC agents** are short-lived, per-turn model calls invoked only when an NPC's distinct knowledge, motives, or reaction is consequential. Minor NPCs are portrayed from a scene card included in the World Engine's handoff without a separate model call. Recurring NPCs and major antagonists may retain persistent memory, belief, and goal overlays (see REQ-WEPA-15), but those overlays remain partial, fallible perspectives, not copies of the campaign bible.

- REQ-WEPA-6: An NPC agent returns **proposals**, never authoritative changes. The proposal shape includes, at minimum:
  1. a private assessment;
  2. proposed dialogue;
  3. any attempted immediate action;
  4. proposed memories, beliefs, suspicions, or questions.

  The World Engine validates every part of the proposal before it affects the campaign. The World Engine may accept, modify, or reject any element.

- REQ-WEPA-7: An NPC agent must not narrate the player character's inner thoughts, decide the player character's actions, or claim knowledge it was not given in its packet. These constraints must appear in the NPC agent's system prompt.

### Projection Service and Packet Schemas

- REQ-WEPA-8: A **projection service** is the only component permitted to build role packets. It reads canonical state and emits bounded, role-specific packets. The World Engine, Narrator, and NPC agents do not read canonical files directly at turn time; they receive packets from the projection service.

  This requirement does not prohibit the World Engine from retrieving canonical material through a retrieval interface during its turn. It prohibits the Narrator and NPC agents from doing so.

  For the Narrator handoff packet specifically (REQ-WEPA-14), the World Engine produces the *content* (the approved, player-visible distillation of the turn) and passes it to the projection service, which *packages* it into the final packet. The projection service is the packager; the World Engine is the author of the handoff's content. This division ensures the handoff reflects the World Engine's adjudication while the projection service enforces access boundaries on the packaged result.

- REQ-WEPA-9: The projection service must produce at least three packet types:

  1. **Narrator packet** — player-visible scene packet (see REQ-WEPA-14).
  2. **NPC packet** — scoped perspective packet (see REQ-WEPA-13).
  3. **Player-character projection** — a projection of the player character that NPCs receive in lieu of the full character sheet. It includes public or observed identity and behavior, not private backstory, exact resources, detailed abilities, unspoken thoughts, or GM-only notes.
  4. **Player-input projection** — the observable projection of the player's message for NPC consumption (see REQ-WEPA-12). This is a distinct projection: it transforms player input, not character state.

- REQ-WEPA-10: A packet schema must be **inspectable in Markdown** (so authors and developers can read what each role received) and **reliable for programmatic validation** (so tests can assert that prohibited content is absent). The schema is a structured Markdown document with labeled sections. The projection service emits Markdown packets for human inspection and an equivalent structured representation (e.g., JSON) for programmatic validation. Both are derived from the same source so they cannot diverge.

- REQ-WEPA-11: The smallest viable packet schema is the unit of validation. A packet is a document with named sections. Each section has an access class (see REQ-WEPA-23). The projection service emits only sections whose access class permits the target role. The packet schema does not need to be exhaustive across all possible campaign content; it needs to be sufficient to validate the invariants in REQ-WEPA-29.

- REQ-WEPA-12: The projection service must support a **player-input projection**. The full player message goes to the World Engine unchanged. When the World Engine invokes an NPC agent, the NPC receives only the observable projection of the player's input, unless a roll, established relationship, magic, or prior information permits more. For example, if the player writes internal thoughts or hidden actions, the NPC receives only what the NPC could see, hear, or reasonably infer.

- REQ-WEPA-13: An NPC packet must contain, at minimum, these sections:

  1. **Self** — voice, values, habits, fears, capabilities.
  2. **Relationship** — the NPC's current view of the player character and relevant others.
  3. **Situated perception** — what the NPC can see, hear, and reasonably infer now.
  4. **Private agenda** — goals, constraints, unresolved tensions.
  5. **Knowledge ledger** — only what the NPC has seen, been told, inferred, or believes (see REQ-WEPA-15).
  6. **Respond-with instructions** — the proposal shape from REQ-WEPA-6 and the constraints from REQ-WEPA-7. The proposal shape serves double duty: it is both the NPC's required output format (what the NPC returns) and the instructions embedded in the NPC's packet (what the NPC is told to produce).

- REQ-WEPA-14: The projection service must produce a **Narrator handoff packet** that contains, at minimum:

  1. What the player character can perceive (sensory, situational).
  2. What the player character already knows and may naturally recall.
  3. Dramatic pressure (tensions, stakes, unresolved foreground questions).
  4. Approved NPC behavior (constraints on how NPCs may act and what they may not reveal).
  5. A **do-not-reveal** list naming categories of information that must not appear in the Narrator's prose.

  The handoff content is produced by the World Engine after it has adjudicated the turn. It is not a projection of canonical state directly; it is the World Engine's approved, player-visible distillation. The projection service packages this content into the final packet (see REQ-WEPA-8), enforcing access boundaries on the packaged result.

### Mediated Memory Writes

- REQ-WEPA-15: The Narrator and NPC agents may **propose** memories, beliefs, suspicions, and summaries, but they must not directly persist them. Only the World Engine decides whether a proposed item becomes:
  1. a canonical event;
  2. an actor memory;
  3. a belief or suspicion (distinct from canonical truth);
  4. a rumor;
  5. a player-visible discovery;
  6. no persistent state at all.

- REQ-WEPA-16: Incorrect beliefs must persist as beliefs when appropriate. The system must not silently promote an NPC's mistaken belief to canonical truth, nor silently drop it. The distinction between "what is true" and "what an actor believes" must be preserved in storage.

- REQ-WEPA-17: Mediated writes must defend against:
  1. hallucinated facts (proposals with no grounding in the scene);
  2. improper access propagation (an NPC proposing to remember something it could not have learned);
  3. irrelevant memory accumulation;
  4. player-prompt injection (a player message attempting to inject canonical truth, e.g., "and then the GM reveals that the king is secretly a dragon").

  The World Engine's adjudication is the defense. It is not required to be perfect, but it is required to be the only path to persistence.

### State and Access Model

- REQ-WEPA-18: The state model has four layers, kept distinct in storage and in access policy:

  1. **Canonical campaign state** — GM-private, authoritative material. This is where setting detail, hidden truth, unresolved mysteries, factions, clocks, and authored hooks live. The World Engine may retrieve from it; Narrator and NPC contexts must not read it wholesale. Canonical state may explicitly contain **unknown** or **deliberately undecided** material. A mystery does not require a predefined answer merely because a model is participating in play.
  2. **Actor knowledge state** — per-important-character overlays recording what an actor remembers, believes, suspects, wants, and has been told. These are partial perspectives, not canonical truth, and not copies of the world bible.
  3. **Player-visible state** — what the player character has perceived, learned, been told, and can act on. This must remain distinct from GM state. It includes a player-private layer (the character's unspoken knowledge).
  4. **Narrative presentation state** — a non-canonical continuity aid for the Narrator: recent player-visible prose and events, tone and style, recurring motifs, current dramatic pressure, unresolved foreground questions. This supports storytelling without allowing prior prose to silently become canonical truth.

- REQ-WEPA-19: Actor knowledge state lives under a per-adventure runtime directory. The minimum structure is:

  ```
  runtime/actors/
    <actor-id>/
      memory.md
      beliefs.md
      current-goals.md
  ```

  Actor IDs are stable within an adventure. The files are partial perspectives; they are not canonical and must not be treated as authoritative by other roles. Actor IDs are assigned by the World Engine when it first invokes an NPC agent for that character; the ID is derived from the NPC's name or reference file (e.g., `characters/scholar-miriam.md` → `scholar-miriam`). ID collisions with existing directory names are resolved by prefixing with `actor-` (e.g., `actor-miriam`).

- REQ-WEPA-20: Player-visible state lives under the adventure runtime directory, separate from canonical GM state. The minimum set:

  ```
  runtime/player-visible.md
  runtime/player-private.md
  summaries/player-visible.md
  ```

  The player-private layer holds the character's unspoken knowledge (things the character knows but has not shared). NPC packets must not include player-private content.

### Knowledge Modeling and Sensitive Authoring Labels

- REQ-WEPA-21: For every consequential proposition in the campaign, three concerns must be separable in storage:

  1. **Canonical status** — true, false, unresolved, unknown, or deliberately undecided.
  2. **Access** — who is permitted to know it.
  3. **Perspective** — what each actor believes, suspects, claims, remembers, or wants.

  A theory is not a truth. A rumor is not a certain belief. An NPC may be mistaken. The runtime model must preserve these distinctions instead of flattening them.

- REQ-WEPA-22: For sensitive material, canonical files must use **explicit access-labeled sections** rather than ambiguous headings like "Known Facts." The recognized section labels are:

  - `## Canonical / GM Truth`
  - `## Publicly Observable`
  - `## What <Actor> Knows`
  - `## Beliefs and Theories`
  - `## Rumors / Unverified Intelligence`
  - `## Intentions and Plans`
  - `## Secrets and Access Policy`
  - `## Current Status`

  Not every file needs every section. These labels apply where secrecy, uncertainty, or competing perspectives matter. The projection service uses these labels to determine what may appear in which packet.

- REQ-WEPA-23: Each labeled section has an **access class**. The minimum access classes are:

  - `canonical` — World Engine only.
  - `observable` — any role whose packet includes the current scene.
  - `actor:<actor-id>` — only the named actor's packet.
  - `player-visible` — player-visible state and Narrator packet.
  - `narrator-presentation` — Narrator continuity aid only.

  The projection service emits a section into a packet only if the section's access class permits the target role. A `## Secrets and Access Policy` section is always `canonical` and never appears in Narrator or NPC packets.

- REQ-WEPA-24: Consequential plans, conspiracies, faction agendas, cursed artifacts, long-term bargains, and campaign-defining mysteries must have **first-class artifacts** with an explicit access policy, rather than existing only as duplicated prose across world, quest, history, and character files. A plan/mystery artifact records, at minimum:

  1. status;
  2. core hypothesis or goal;
  3. confirmed evidence;
  4. open uncertainties;
  5. access policy (which actors know what subset).

  This requirement applies sparingly: only to material where secrecy, competing perspectives, or long-term stakes matter. Routine world detail does not require a first-class artifact.

- REQ-WEPA-25: Access policy may live in source files (as labeled sections), in a projection manifest, in file frontmatter, or in a combination. The spec does not mandate a single location. The projection service must consult all configured sources. The chosen location must be inspectable by a human reading the adventure directory.

### Runtime Loop / Orchestration

- REQ-WEPA-26: A single player turn is orchestrated as the following loop, owned by the World Engine. The loop is a single orchestration within the existing daemon turn handler; it is not a separate process.

  1. The World Engine receives and interprets the player message.
  2. It retrieves relevant canonical material and determines the rules procedure.
  3. It resolves objective mechanics through code or tools where possible (see REQ-WEPA-33).
  4. It creates candidate events and decides whether any NPC needs a consequential response.
  5. It invokes those NPC agents, in parallel where independent, with scoped packets built by the projection service.
  6. It adjudicates their proposals and commits authoritative events and state changes.
  7. It updates player-visible and actor knowledge ledgers through mediated writes (REQ-WEPA-15).
  8. It creates an approved player-visible scene handoff for the Narrator (REQ-WEPA-14).
  9. The Narrator produces prose and invites the next player action.

- REQ-WEPA-27: The Narrator and NPC agents must initially be **tool-less**. They must not be exposed to generic file-reading, directory-listing, or adventure-wide search tools. Their entire world is the packet they receive. This is a defense-in-depth measure: even if the model attempts to look something up, it has no tool to do so.

  The World Engine retains tool access because it must retrieve canonical material and commit state. Only the Narrator and NPC agents are tool-less.

- REQ-WEPA-28: The World Engine and Narrator may have persistent role identities, goals, style, and curated long-term summaries. Their raw model context must be rebuilt from authoritative state each turn. A long-lived raw model session must not become the source of truth. The turn context is assembled as:

  ```
  persistent role identity
  + curated long-term summary
  + current scoped scene packet
  + recent relevant exchange
  = bounded turn context
  ```

  This is consistent with the MVP's stateless-request pattern (REQ-MVP-10) and the conversation-history brainstorm's Approach 2 (see `.lore/brainstorm/conversation-history.md`).

### Testing Invariants

- REQ-WEPA-29: The architecture must be testable through **packet-content invariants**: assertions that prohibited content cannot appear in a particular role's packet for a given scene. These are the load-bearing tests of the knowledge boundary. The following invariants are required for the initial milestone (see Initial Milestone); additional invariants are added as adventures require:

  1. A given NPC's packet does not contain a named secret the NPC has not been briefed on.
  2. The Narrator packet does not contain the truth of a mystery whose canonical status is `unresolved`, `unknown`, or `deliberately undecided` (per REQ-WEPA-21).
  3. An NPC's player-character projection does not include private backstory, unobserved mechanics, or internal narration.
  4. An NPC packet does not include player-private state.
  5. A `## Secrets and Access Policy` section never appears in a Narrator or NPC packet.

  These invariants are expressed against the structured (JSON) representation of the packet (see REQ-WEPA-10), not against the model's prose output. Prose-level leakage is addressed by REQ-WEPA-30.

- REQ-WEPA-30: In addition to packet-content invariants, the architecture must support **prose-level spot checks**: sampled runs where the Narrator's output is checked (by a separate model call or by pattern matching) for the presence of prohibited terms from the scene's do-not-reveal list. These are probabilistic, not deterministic. They surface regressions but do not replace packet invariants.

### Initial Milestone

This section defines the scope of the first implementation milestone. Items reference normative requirements above; they are a work plan with requirement cross-references, not standalone requirements.

- REQ-WEPA-31: The initial milestone applies the design to one adventure (e.g., *The Broken Lands*) with narrow scope:

  1. Mark sensitive boundaries for a small set of high-value secrets (the brainstorm names: flawed-invocation plan, Tomas conspiracy, interrogation results, Lexicon access, Custodian policy, Kael's private sheet).
  2. Implement a projection service that builds packets for the World Engine, Narrator, and one or two major NPCs.
  3. Remove raw file and search tools from Narrator and NPC contexts (REQ-WEPA-27).
  4. Have NPCs propose structured actions and memory updates (REQ-WEPA-6).
  5. Let the World Engine validate and commit events (REQ-WEPA-15).
  6. Add tests proving that prohibited secrets cannot occur in particular role packets (REQ-WEPA-29).

- REQ-WEPA-32: The initial milestone does not require the full campaign to be re-authored with sensitive labels. It requires that the named high-value secrets be marked, and that the projection service respect those marks. Other content may remain in the existing two-layer structure (see `.lore/specs/adventure-file-structure.md`).

### Rules Resolution

- REQ-WEPA-33: When the World Engine determines that a rules procedure or dice roll is needed, it must route the resolution through a **rules tool or state gate** — a code-owned mechanism that records the final mechanical result — rather than asserting the result in prose. The World Engine decides *which* procedure applies; the rules tool records *what* the result is. The Narrator then describes that approved result.

  This requirement establishes routing, not a full rules engine. Dice, HP, Stress, conditions, inventory, and initiative are increasingly code- or tool-owned, but a complete rules engine is out of scope (see Deferred). The minimum for the initial milestone is that dice rolls and HP changes are routed through a rules tool; other mechanics may be asserted by the World Engine in prose until they gain code ownership.

### Player Recourse and Canonical State Editability

- REQ-WEPA-34: Canonical campaign state (REQ-WEPA-18.1) remains **player-editable on disk**, consistent with the MVP's principle that the player can read and edit state files directly (see REQ-MVP-14, REQ-MVP-17). The World Engine is the only role that commits state *through the runtime loop*, but the player can always open a file and correct, revert, or annotate what the World Engine committed.

  This is the safety valve for World Engine errors. If the World Engine accepts a hallucinated fact as canonical truth (REQ-WEPA-17 acknowledges this is possible), the player can edit the canonical file directly. The next turn's prompt assembly reads the file fresh (per REQ-WEPA-28's stateless-request pattern), so the edit takes effect immediately.

  The player may also **inspect** canonical state by reading the adventure directory's files. Canonical state is GM-private in the sense that Narrator and NPC packets must not contain it (REQ-WEPA-8, REQ-WEPA-23); it is not private in the sense of being hidden from the player on disk. The player is the table owner; they can read the GM's notes.

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Adventure authoring | Author marks sensitive boundaries | Manual editing of canonical files with labeled sections (REQ-WEPA-22) |
| Packet inspection | Developer wants to see what a role received | Projection service emits Markdown packets (REQ-WEPA-10) |
| Prose spot-check | Regression suspected in Narrator output | Prose-level spot check (REQ-WEPA-30) |
| Migration from single-GM | Architecture is adopted for an adventure | Replace the MVP turn handler with the World Engine runtime loop (REQ-WEPA-26) |
| Rules engine | Mechanical resolution needs full code ownership (beyond routing through a rules tool) | [STUB: rules-engine] |

  Note: REQ-WEPA-33 requires the World Engine to *route* mechanical resolution through a rules tool or state gate — that routing is in scope. The Exit Point above applies only when mechanical resolution needs to become *fully code-owned* (dice, HP, Stress, conditions, inventory, initiative as independent code), which is out of scope for this spec.

## Success Criteria

These are architectural criteria, not playability criteria. The MVP's playability criteria remain in force for the single-GM path.

- [ ] A player turn can be processed by the World Engine runtime loop end-to-end: input → World Engine interpretation → optional NPC agent(s) → World Engine adjudication → Narrator handoff → Narrator prose → player-visible output.
- [ ] The projection service produces Markdown packets for World Engine, Narrator, and at least two NPCs, and equivalent structured representations for validation.
- [ ] For the initial milestone adventure, every invariant in REQ-WEPA-29 passes deterministically.
- [ ] Narrator and NPC agents invoked with scoped packets have no file-reading, directory-listing, or search tool available (REQ-WEPA-27).
- [ ] The Narrator's output for a sample turn does not contain any item from the scene's do-not-reveal list (REQ-WEPA-30, probabilistic).
- [ ] Canonical state can explicitly contain "unknown" or "deliberately undecided" material, and that material is not resolved by the model merely because the model is participating in play.
- [ ] An incorrect belief proposed by an NPC is persisted as a belief, not as canonical truth, and not dropped silently (REQ-WEPA-16).
- [ ] The player can read and edit canonical state files directly on disk, and the next turn reflects the edit (REQ-WEPA-34).
- [ ] The architecture is compatible with the existing daemon topology (single daemon, single session runner, Agent SDK only — see `.lore/reference/architecture-pattern.md`).

## AI Validation

**Defaults** (apply to all implementation work):
- Unit tests with mocked dependencies (file I/O, Agent SDK `query()`, projection service).
- Integration tests for the runtime loop using a fixture adventure with labeled sensitive sections.
- Code review by fresh-context sub-agent.

**Custom** (behavioral, runnable):

- **Packet-content invariant tests (REQ-WEPA-29).** For a fixture adventure with known sensitive sections, assert that the structured representation of each role's packet does not contain prohibited content. These are deterministic unit tests against the projection service's output. Required cases:
  - NPC `miriam` packet does not contain the string "flawed-invocation" when she has not been briefed.
  - Narrator packet does not contain the unresolved truth of the Tomas agenda.
  - NPC packet's player-character projection does not include the character's private backstory section.
  - NPC packet does not include `runtime/player-private.md` content.
  - No Narrator or NPC packet contains a `## Secrets and Access Policy` section.

- **Packet Markdown inspection test.** For a fixture turn, emit the Markdown representation of each role's packet and assert that each labeled section's access class is consistent with the role that received it. This validates REQ-WEPA-10's requirement that Markdown and structured representations cannot diverge.

- **Narrator and NPC tool-less test.** Assert that the Agent SDK `query()` options for both Narrator and NPC agent invocations do not include any file-reading, directory-listing, or search tool in `tools` or `allowedTools`. This validates REQ-WEPA-27 (which covers both Narrator and NPC agents).

- **Mediated write test (persistence-layer contract).** Given an adjudication decision (accept/reject) for a proposed memory item, assert that the persistence layer correctly persists or does not persist the item based on that decision. This test uses a deterministic adjudication stub and validates the *persistence-layer contract* (given a decision, the right thing happens). It does **not** validate the World Engine's adjudication judgment itself — that is the hardest part of the system to test, as it requires assessing whether an LLM reliably rejects hallucinated facts and prompt injections. The adjudication judgment is validated only by the prose spot-check pattern (REQ-WEPA-30) applied to the World Engine's output, which is probabilistic. This gap is acknowledged: there is no deterministic automated test for adjudication quality in the initial milestone.

- **Belief-vs-truth separation test.** Given an NPC proposal asserting a mistaken belief, assert that the persisted record marks it as a belief, not as canonical truth, and that subsequent packet construction for other roles does not treat it as canonical. This validates REQ-WEPA-16 and REQ-WEPA-21.

- **Runtime loop integration test.** For a fixture player message, assert that the loop in REQ-WEPA-26 executes steps 1-9 in step-level order (step N completes before step N+1 begins), that NPC agents within step 5 may be invoked in parallel where independent, and that the Narrator receives only the approved handoff (not raw canonical state). This validates REQ-WEPA-26 and REQ-WEPA-8.

- **Prose spot-check (probabilistic).** For a sample of Narrator outputs, run a separate model call (or pattern match) that checks for the presence of any term from the scene's do-not-reveal list. This test is permitted to be non-deterministic; it surfaces regressions rather than gating CI. This validates REQ-WEPA-30.

- **Undecided-material preservation test.** For a fixture adventure containing a mystery whose canonical status is `deliberately undecided` (per REQ-WEPA-21), assert that the World Engine's adjudicated output does not promote the mystery to `true` or `false` without an in-fiction trigger (e.g., a successful investigation roll or NPC revelation). This test uses a fixture that provides no such trigger. It is probabilistic (World Engine adjudication is a model call) and surfaces regressions rather than gating CI. This validates the "preserve uncertainty" success criterion and REQ-WEPA-18.

- **Access-class routing test.** For a fixture adventure with sections labeled `canonical`, `observable`, `actor:<id>`, `player-visible`, and `narrator-presentation`, assert that the projection service emits each section only to roles permitted by its access class. This validates REQ-WEPA-23.

- **Rules routing test.** For a fixture turn requiring a dice roll and an HP change, assert that the World Engine's adjudication routes these through a rules tool (code-owned) and that the result recorded by the rules tool matches the result the Narrator receives in the handoff. The Narrator must not receive a mechanical result that was not recorded by the rules tool. This validates REQ-WEPA-33.

- **Player-editability test.** For a fixture adventure, modify a canonical state file on disk between turns and assert that the next turn's prompt assembly reflects the edit (the World Engine reads the file fresh). This validates REQ-WEPA-34.

## Constraints

- **Agent SDK only.** All AI functionality uses `@anthropic-ai/claude-agent-sdk`. No other LLM library. See `.lore/reference/architecture-pattern.md`. The World Engine, Narrator, and NPC agents are all Agent SDK `query()` calls orchestrated by the session runner.
- **No database.** All state is files. Canonical state, actor overlays, player-visible state, and narrator presentation state are all Markdown (or structured files where the projection service requires them). See Vision Principle 1 (`.lore/vision.md`).
- **Single daemon, single session runner.** The runtime loop is orchestrated within the existing daemon turn handler. No new processes, no new services. The session runner wraps all `query()` calls.
- **Markdown is the primary format.** Runtime state may be Markdown or structured data, but separation and permissions matter more than serialization. Packets are inspectable in Markdown. See Vision Principle 1 (`.lore/vision.md`).
- **Player agency is sacred.** The Narrator must never narrate the player character's actions, decisions, or inner state. NPC agents must not decide the player character's actions. See Vision Principle 3 (`.lore/vision.md`).
- **Start small.** The initial milestone covers one adventure and a small set of high-value secrets. The architecture is designed to scale, but the first implementation is narrow. See REQ-WEPA-31.
- **Preserve uncertainty.** Canonical state may contain unknown or deliberately undecided material. The architecture must not force a model to resolve a mystery before play demands it. See REQ-WEPA-18.
- **Generated prose is presentation unless accepted.** Narrator output and NPC dialogue are presentation. They become canonical only when the World Engine accepts them as events or state updates. See REQ-WEPA-15.

## Deferred (Not in Scope)

These items are acknowledged as natural next steps but are explicitly excluded from this spec. They are listed here to prevent scope creep during implementation.

- **Full mechanical rules engine.** Dice, HP, Stress, conditions, inventory, and initiative are increasingly code- or tool-owned, but a complete rules engine is out of scope. This spec only requires that the World Engine route mechanical resolution through a rules tool or state gate (see REQ-WEPA-33).
- **Cross-adventure NPC memory.** Persistent NPC overlays are scoped to a single adventure.
- **Automated sensitive-label authoring.** Authors mark sensitive boundaries manually. A tool that scans canonical files and suggests labels is a future convenience.
- **Full campaign re-authoring.** The initial milestone marks a small set of high-value secrets, not the entire campaign. See REQ-WEPA-32.
- **Multi-player.** Single player, single browser, localhost. Same as MVP.
- **Audit trail of why a role received a particular piece of information.** The brainstorm raises this as an open question (Open Question 4). It is valuable but not required for the initial milestone. The projection service should be designed to make an audit trail addable later (e.g., by logging packet construction), but no audit trail is required.
- **Distinguishing reasonable inference from leakage in tests.** The brainstorm raises this as an open question (Open Question 6). The initial milestone's invariants (REQ-WEPA-29) assert absence of named prohibited content, not judgment of whether an inference is reasonable. Inference-quality testing is deferred.

## Open Questions

These are questions the spec does not answer. They are recorded here so implementation can address them, but they do not block the spec.

1. **Smallest viable packet schema.** REQ-WEPA-10 requires Markdown-inspectable and programmatically-validatable representations. The exact field set of the structured representation is an implementation decision, to be settled by the initial milestone's invariant tests (REQ-WEPA-29).
2. **Access policy location.** REQ-WEPA-25 permits source files, a projection manifest, frontmatter, or a combination. The initial milestone should pick one primary location and document it; the spec does not mandate which.
3. **Interaction with MVP file-based conversation history.** The MVP appends to `history.md` (REQ-MVP-14-17). The World Engine runtime loop produces an approved handoff for the Narrator. How `history.md` is appended — by the daemon after the Narrator produces prose, or by the World Engine after adjudication — is an implementation decision. The constraint is that `history.md` remains the canonical record and the player can read and edit it.
4. **Which state transitions must be code-owned before this design provides meaningful protection.** The spec requires that the World Engine route mechanical resolution through a rules tool or state gate (REQ-WEPA-33), but does not enumerate which mechanics must be code-owned first. This is a sequencing question for the implementation plan.
5. **How to distinguish an NPC's reasonable inference from information leakage in tests.** Deferred (see Deferred). The initial milestone asserts absence of named prohibited content.

## Context

### Prior Art

- `.lore/brainstorm/world-engine-perspective-agents.md`: The brainstorm this spec captures. The proposal, role definitions, packet examples, and initial milestone are all drawn from this document.
- `.lore/reference/architecture-pattern.md`: The daemon-first architecture. The single session runner for Agent SDK calls is the integration surface for this spec. The World Engine runtime loop is orchestrated within the session runner, not alongside it.
- `.lore/specs/mvp.md`: The current single-GM architecture. The MVP remains the source of truth for what ships now. This spec is a future architecture; it does not deprecate the MVP.
- `.lore/specs/adventure-file-structure.md`: The two-layer file structure (bootstrap + reference). The World Engine architecture layers projections and ledgers around this structure; it does not replace it. REQ-WEPA-32 explicitly permits non-sensitive content to remain in the existing structure.
- `.lore/specs/compaction-system.md`: History compaction. The World Engine architecture's "bounded turn context rebuilt each turn" (REQ-WEPA-28) is consistent with the compaction system's archive-summarize-save pattern.
- `.lore/brainstorm/conversation-history.md`: Approach 2 (file-based history, system-owned). REQ-WEPA-28's stateless-request pattern is the same approach.
- `.lore/research/scene-boundaries.md`: Research on scene structure. Relevant to future scene-packet construction, but not required for the initial milestone.
- `.lore/vision.md`: Design principles. This spec aligns with Principle 1 (Markdown is Memory), Principle 3 (Player Agency is Sacred), Principle 4 (Progressive Simplification — Narrator and NPC agents are tool-less), and Principle 5 (System-Agnostic Core — the architecture is RPG-system-agnostic).

### Vision Alignment

| Principle | How this spec aligns |
|-----------|----------------------|
| 0. The Story is the Product | The Narrator exists to make approved outcomes feel like a story. The architecture serves the story, not the machinery. |
| 1. Markdown is Memory | Canonical state, actor overlays, and packets are all Markdown-inspectable. No database. |
| 2. Teach, Don't Code | Knowledge boundaries are enforced by scoped context (what the role receives), not by code that tries to scrub a model's output after the fact. |
| 3. Player Agency is Sacred | The Narrator and NPC agents are explicitly prohibited from narrating the player character's actions or inner state. |
| 4. Progressive Simplification | The Narrator and NPC agents are tool-less. The architecture removes capabilities (file access) rather than adding machinery. |
| 5. System-Agnostic Core | The architecture is RPG-system-agnostic. The World Engine routes mechanical resolution through whatever rules tool the adventure uses. |
