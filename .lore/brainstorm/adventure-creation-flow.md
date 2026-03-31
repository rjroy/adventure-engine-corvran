---
title: Adventure Creation Flow
date: 2026-03-30
status: resolved
tags: [ux, adventure-creation, session-zero, lobby, onboarding]
modules: [web, backend, shared]
related: [.lore/specs/adventure-system-integration.md, .lore/research/llm-optimized-rpg-systems.md, .lore/vision.md]
---

# Brainstorm: Adventure Creation Flow

## Where We Are

Today there is no adventure creation experience. A player creates a directory by hand (`mkdir ~/.corvran/adventures/my-adventure`), optionally drops an `adventure.md` with a system declaration, and the engine picks it up. The web client auto-redirects to the only adventure if there's just one.

The adventure system integration spec explicitly deferred this: "No adventure creation UI. System selection during adventure creation is deferred. Players write `adventure.md` by hand." That was the right call for the MVP. Now it's the next question.

Two things need solving:
1. What happens when a player wants to start a new adventure?
2. What does the adventure list look like when they have several?

These are related. The list shapes what information matters at creation time, because the list is where you distinguish adventures from each other later.

## The Spectrum

### Option A: Pre-Session Setup Conversation

The player clicks "New Adventure" and enters a conversation with a setup agent. Not the GM yet. A creative collaborator who helps shape what's about to happen.

**The flow:**
1. Choose an RPG system (or freeform)
2. Talk through character concepts: "I want to play someone who was trained as a healer but left because they couldn't save someone important." Not a character sheet, not mechanical choices. Ideas.
3. Talk through world/tone: "Something like a coastal trading city where magic is common but distrusted." "Dark fantasy but not grimdark, there's hope."
4. The agent synthesizes: "So we're looking at a Daggerheart game in a port city with restricted magic, playing a former healer carrying guilt. Want to refine anything before we start?"
5. Player confirms. The agent writes `adventure.md` (system + description), seeds `character.md` and `world.md` with the discussed concepts, and hands off to the GM.

**What this feels like from the player's side:**

The emotional arc is investment before commitment. You're building anticipation. By the time the adventure starts, the player already cares about their character and has a mental image of the world. The opening scene doesn't start cold. The GM can reference "the harbor district you mentioned" or "your mentor, the one you couldn't save." The player feels heard.

This is session zero. In tabletop, session zero is where the group aligns on tone, boundaries, and character concepts before play begins. It prevents the "everyone shows up with incompatible characters" problem. In a solo LLM game, there's no party alignment problem, but there's a different one: the AI has no context about what the player wants. Session zero gives it that context.

**Tradeoffs:**
- Time to first play: 10-20 minutes of conversation before the story starts. For a player who already knows what they want, this is friction. For a player exploring, this is the fun part.
- Quality of opening: Substantially better. The GM has real context. The first scene can be specific and resonant.
- Player investment: High before the first roll. The player has co-created the premise.
- Risk: The setup conversation could feel like homework. If the agent asks too many questions or goes too deep into detail, it becomes an interrogation rather than a creative conversation.

### Option B: Minimal Setup

The player clicks "New Adventure," picks a system from a dropdown (or "Freeform"), names it, and lands in the chat. The GM's first move is onboarding: "Tell me about your character" or "What kind of world are you imagining?"

**The flow:**
1. Select system
2. Name the adventure (or auto-generate one)
3. Start chatting with the GM immediately

**What this feels like:**

Fast. You're playing within 30 seconds. The emotional arc starts with curiosity (what will the GM do?) rather than investment. It's the "just start playing" energy of picking up a video game you know nothing about.

The GM handles everything: character creation, world-building, tone-setting. This is what the bootstrap prompts already support. REQ-SYS-14 says the bootstrap includes onboarding guidance, and the prompt service skips generic onboarding when a system bootstrap is present. The infrastructure is there.

**Tradeoffs:**
- Time to first play: Seconds. But the first 10-20 minutes of play IS the setup, just interleaved with the GM rather than a separate agent. The total time to "playing the actual adventure" is similar.
- Quality of opening: Depends entirely on the bootstrap prompt. If the onboarding guidance is strong, the GM asks the right questions and the opening is good. If it's weak, the GM produces a generic tavern scene.
- Player investment: Builds during play rather than before it. Some players prefer this, the "discover who my character is by playing them" school.
- Risk: The GM has to juggle onboarding AND storytelling simultaneously. Character creation in D&D is a 30-minute process with many mechanical decisions. Having the GM walk through that while also trying to establish a world and tell a story is a lot to ask of a single prompt.

### Option C: The Middle Path (Recommended)

A short, structured pre-flight, not a conversation, followed by immediate play with an informed GM.

**The flow:**
1. Click "New Adventure"
2. A form/wizard with 2-3 steps:
   - **System**: Pick from installed systems, or freeform. Each option shows a one-sentence description ("Daggerheart: A fantasy RPG where hope and fear drive the story").
   - **Concept**: A single text field. "Describe your adventure in a sentence or two." Free-form text. Could be a character concept, a world concept, both, or nothing. Optional. "Leave blank to discover as you play."
   - **Name**: Auto-suggested from the concept (if provided), editable. "The Healer's Burden" or "Untitled Adventure" as fallback.
3. The engine creates the adventure directory, writes `adventure.md` with the system and the concept text as the body, and drops the player into the chat.
4. The GM reads the concept from `adventure.md` and uses it as a springboard. If the concept mentions a character idea, the GM weaves it into onboarding. If it mentions a world, the GM builds on it. If it's blank, the GM does pure discovery.

**What this feels like:**

Quick enough that you're not waiting, 60 seconds from "new adventure" to the first GM message. But the GM isn't starting cold. Even a single sentence ("disgraced knight seeking redemption in a dying world") gives the opening scene a direction that "tell me about your character" doesn't have.

The concept field is the key differentiator. It's not required. It's not structured. It's a seed. Some players will write a paragraph. Some will write three words. Some will leave it blank. All of these are valid, and the GM handles each differently because the bootstrap already has onboarding guidance for the "blank slate" case.

**Why this over A or B:**

Option A frontloads too much. The setup conversation is a good idea for players who want it, but making it mandatory means every adventure starts with an interview. Some players just want to play. The concept field captures the "I have an idea" energy without forcing it through a conversation.

Option B is too thin. Picking a system and a name gives the GM nothing to work with except bootstrap defaults. The first few minutes of every adventure would feel the same: "Tell me about your character. What kind of world are you imagining?" The concept field, even when used minimally, breaks that pattern.

Option C also has the best information for the adventure list later (see "The Lobby" below).

## How RPG System Choice Affects This

The systems supported today sit at different points on the character creation spectrum:

**D&D (d20):** Character creation is a significant process. Race, class, ability scores, background, equipment, spells. This is 15-30 minutes at a minimum, and it's mechanical: the choices have hard numerical consequences. The GM needs to walk through this step by step. A pre-session setup conversation (Option A) actually maps well here because there's genuine depth to discuss. But Option C works too: the concept seeds the direction ("I want a rogue"), and the GM handles the mechanical build as the first act of play.

**Daggerheart:** Character creation is lighter. Ancestry, community, class, subclass, Experiences (keyword traits). More narrative, fewer numbers. The GM can weave this into early play naturally. The concept field ("former healer, coastal setting") gives the GM enough to suggest appropriate choices. Option C is a natural fit.

**Freeform:** No mechanical character creation at all. The player describes who they are, the GM accepts it. Option B would actually work fine here, but Option C's concept field gives the GM a richer starting point.

The key insight: the creation flow shouldn't change per system. The concept field is system-agnostic (it's narrative, not mechanical), and the bootstrap prompt handles system-specific onboarding. The flow is the same; the GM's behavior after entry differs.

## The Lobby

When the player has multiple adventures, they need to tell them apart. What does the adventure list show?

### What We Know About Each Adventure

From the existing data model (`AdventureListItemSchema`):
- `id` (directory name)
- `name` (derived from id)
- `system` (from `adventure.md`, nullable)
- `hasCharacter`, `hasWorld`, `hasHistory` (boolean flags)

With Option C, we'd also have:
- The concept text (the body of `adventure.md`)
- A name chosen by the player rather than derived from the directory name

### What the Player Needs to Distinguish Adventures

At a glance, the player needs to answer: "Which adventure is this, and where was I?"

**Identity**: The name + system badge handles this. "The Healer's Burden [Daggerheart]" vs "Untitled Adventure [d20]" vs "Weird Dreams [Freeform]."

**State**: The current boolean flags (hasCharacter, hasWorld, hasHistory) are developer diagnostics, not player information. A player doesn't care that `character.md` exists. They care whether they've started playing.

Better state indicators:
- **New**: No history. The adventure hasn't been played yet.
- **In Progress**: Has history. The adventure is active.
- **Last played**: A timestamp. "3 days ago" or "2 hours ago." This helps when you have several in-progress adventures.

**Preview**: The concept text (from `adventure.md` body) serves as a subtitle or description. "A disgraced knight seeking redemption in a dying world" under the adventure name tells you what this one is about without opening it.

**Character name**: If `character.md` exists and has a name in it, showing the character name alongside the adventure name is immediately useful. "The Healer's Burden, playing as Sera." This is the strongest single signal for "which adventure is this" when you have several.

### The Lobby Screen

The lobby replaces the current auto-redirect behavior. It always shows, even with one adventure. The single-adventure auto-redirect should go.

A minimal lobby:
- A list of adventure cards (name, system badge, concept snippet, character name if available, last-played timestamp)
- A "New Adventure" button that starts the creation flow
- Adventures sorted by last played (most recent first), with "New" adventures at the top

Nothing fancy. The adventure card is the unit. It shows what you need, you click it, you play.

### What About Deletion?

Not yet. Adventures are directories on disk. Deleting them is destructive and irreversible (no recycle bin). The player can delete directories manually the same way they can create them today. Adding deletion to the UI is a separate concern with its own confirmation and safety requirements.

## Session Zero: Where It Maps and Where It Doesn't

Traditional session zero serves several purposes:
1. **Safety tools**: Lines and veils, content boundaries. (Relevant for Corvran, but a separate concern. The GM should respect boundaries, but the mechanism is a system prompt constraint, not a creation flow feature.)
2. **Group alignment**: Making sure everyone wants the same game. (Not applicable to solo play.)
3. **Character creation**: Building characters that fit the world and each other. (Directly relevant. In solo play, this is "building a character that fits the world the GM is preparing.")
4. **World-building**: Establishing setting expectations. (Directly relevant. The concept field is a lightweight version of this.)
5. **Tone-setting**: Agreeing on how dark, how funny, how serious. (Directly relevant. A concept like "dark fantasy but not grimdark" sets tone.)

Option A is a full session zero. Option C captures the most valuable parts (character direction, world direction, tone) in a lightweight form and lets the GM handle the rest during play. The mechanical parts of character creation (the D&D stat block, the Daggerheart class features) happen during play because they need the GM's guidance.

The research notes that Ironsworn was "designed for the exact use case (GM-less play with oracle support)." Session zero in Ironsworn is structured: pick your truths about the world, swear your first vow. This maps cleanly to Option C's concept field plus GM-guided setup. The truths are the concept; the vow is the first thing the GM helps establish.

## Implementation Considerations

These aren't design decisions, just flags for whoever picks this up.

**Plugin manifest changes needed:**
- `aliases` (array) becomes `alias` (singular string). Every existing manifest uses a single-element array; the plural form was premature.
- Add a `description` field. The system picker needs a human-readable sentence per system.
- Updated manifest shape: `{ "name": "daggerheart-system", "type": "system", "alias": "daggerheart", "description": "A fantasy RPG where hope and fear drive the story", "bootstrap": "bootstrap.md" }`
- The plugin registry's `availableAliases()` becomes something that returns `{ alias, description }[]` instead of `string[]`.
- This is a breaking change to the manifest schema. All three existing manifests (corvran, d20-system, daggerheart-system) need updating, along with the registry parsing code and its tests.

**Backend changes needed:**
- A `POST /adventures` endpoint that creates the directory and writes `adventure.md`
- The adventure name needs to be a real field (in frontmatter or derived from directory), not just the directory name
- A `lastPlayed` or `lastModified` timestamp in the list response (stat the history file, or track it explicitly)
- A `GET /systems` endpoint (or similar) that returns `{ alias, description }[]` for all `type === "system"` plugins from the registry

**Web changes needed:**
- Remove the single-adventure auto-redirect in `page.tsx`
- Build the creation wizard (system picker, concept field, name field)
- Redesign the adventure card with richer information
- Sort adventures by recency

**Schema changes:**
- `adventure.md` frontmatter gains `name` (player-chosen display name)
- `AdventureListItemSchema` gains `concept` (body text from `adventure.md`), `characterName` (extracted from character.md if available), and a timestamp
- Consider: should the concept text go in frontmatter as a `description` field, or stay as the markdown body? The body is more natural for free-form text, but frontmatter is easier to parse without reading the whole file.

**What about the "full session zero" (Option A)?** It's not gone, just deferred. The concept field in Option C doesn't prevent later adding a "Setup conversation" option that launches a pre-game agent. The creation wizard could have an "Advanced: Talk through your concept with an AI collaborator" link that opens a setup conversation before creating the adventure. That's an additive feature, not a structural change.

## Resolved Questions

1. **Can the GM write `character.md` and `world.md` during play?** Yes. All adventure files are fully read/write for both the AI and the player. There are no file restrictions. REQ-SYS-5's "adventure.md is read-only for the AI" was a bad spec decision that contradicts the project vision and must be corrected. The infrastructure already supports this: the session runner sets the adventure path as the working directory and the AI has the Write tool. What's needed is bootstrap prompt guidance telling the GM to persist character and world details as they emerge through conversation.

2. **How does the name relate to the directory name?** The directory name is slugified from the player's chosen name (spaces to dashes, strip special characters). It stays human-readable for developer maintenance when navigating `~/.corvran/adventures/` directly. The player-chosen display name lives in `adventure.md` frontmatter as a `name` field. The adventure service reads `name` from frontmatter for display, falling back to the directory name if frontmatter is missing (backward compatibility with existing adventures).

3. **Should available systems come from the API?** Yes. The plugin manifest simplifies: `aliases` (array) becomes `alias` (singular string), and gains a `description` field. A manifest becomes `{ "name": "daggerheart-system", "type": "system", "alias": "daggerheart", "description": "A fantasy RPG where hope and fear drive the story", "bootstrap": "bootstrap.md" }`. A new endpoint returns `{ alias, description }[]` for all `type === "system"` plugins, and the web client builds the picker dynamically from that.

4. **What about the concept field for freeform adventures?** Freeform gets no special treatment. Freeform is the absence of a system, not a system. The generic GM prompt ("you're a Game Master") carries the weight. A blank concept field with no system selected is a valid blank-slate state. If that's not enough, the fix is improving the generic prompt, not adding freeform-specific scaffolding.
