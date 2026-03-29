---
title: MVP Scope for Greenfield Rewrite
date: 2026-03-28
status: open
tags: [mvp, scope, greenfield, architecture]
related: [.lore/vision.md, .lore/reference/architecture-pattern.md]
---

# Brainstorm: MVP Scope for Greenfield Rewrite

## Context

The vision is approved. The architecture pattern is documented. The v1 spec is archived. The question: what's the smallest thing worth building and playing?

## The Core Insight

The MVP's job is to prove the core beliefs work and be worth an evening of play. Not "technically validates the architecture" but "I'd choose to sit down with this."

## Ideas Explored

### Floor: A Conversation That Persists

The simplest possible version. One player, one AI game master, one adventure. You type what your character does, the AI responds as the world. State lives in markdown files the daemon manages. The web client shows the conversation and an input box.

This proves Principles 0 (story is the product), 1 (markdown is memory), 3 (player agency), and validates the daemon-first architecture and Agent SDK integration. It defers Principles 2 and 5.

**Decision: this is the right floor, but we can clear a higher bar without much more work.**

### RPG System Docs Already Exist

The `plugins/` directory contains production-ready teaching material:

- **corvran/gm-craft**: Storytelling techniques, improv principles, NPC creation, scene pacing, failure handling. Universal across all systems.
- **d20-system**: Full SRD 5.2. Character creation, combat, magic, monsters, rules lookup. Six skills with extensive reference material.
- **daggerheart-system**: Full Daggerheart SRD 1.0. Classes, domains, adversaries, combat, character creation. Eight skills with reference material.

This means Principle 2 (teach, don't code) is already built. The content exists. The MVP just needs to load it.

### Principle 5 is Emergent, Not Engineered

Key realization: Principle 5 (system-agnostic) isn't an independent design goal. It's an emergent property of Principle 2. If the engine doesn't encode RPG mechanics in application code, it can't be coupled to any particular system. You get agnosticism for free by refusing to hardcode rules.

The Agent SDK session gets all plugin paths. The AI has access to gm-craft, d20, and Daggerheart simultaneously. Which system is in play emerges from the character sheet and the conversation, not from engine configuration. The same way a human GM who owns both rulebooks knows which one to reach for.

**RPG system selection is a real config question, just deferred.** When the adventure directory eventually has a manifest, "which plugins to load" is a natural field. For the MVP, hardcode the plugin paths.

### Adventure Selection: Build the Simple Thing

Initial instinct was to defer adventure selection (hardcode "first adventure," leave a seam for later). Pushback: the selection UX is simple, and bending over backwards to avoid it creates more work than building it.

The daemon already needs to know "which adventure" to load state for. Listing what's available is just reading a directory. The web client shows the list and passes the choice through.

**Decision: adventure selection is in the MVP, but it's dead simple.**

- Daemon endpoint: list adventure directories, return their names
- Daemon endpoint: start session with a given adventure ID
- Web client: if one adventure, go straight in. If more than one, show a list. Pick one.
- No creation, no deletion, no metadata editing. Just "here's what exists, pick one."

### Adventure Setup is Manual

Who creates the adventure directory? For the MVP: the player. You make a folder, drop in character sheets and world state files, the engine finds it. This is Principle 1 in its purest form: markdown is the shared medium between the AI, the developer, and the player.

## The MVP Shape

1. **Daemon** (Hono on Unix socket): loads adventures from directories, serves conversation API, manages markdown state, runs Agent SDK sessions
2. **AI Game Master** (Agent SDK): taught by plugin docs. Hardcoded plugin paths: corvran (gm-craft + dice roller), d20-system, daggerheart-system
3. **Markdown state**: character sheets, world state, conversation history. All human-readable and hand-editable
4. **Web client** (Next.js): adventure list (trivial), conversation view, input box. Nothing else.
5. **Adventures**: created manually. A directory with files. The engine finds and lists them.

## What This Proves

| Principle | How |
|-----------|-----|
| 0. Story is the product | Nothing in the UI competes with the conversation |
| 1. Markdown is memory | All state is files you can read and edit by hand |
| 2. Teach, don't code | RPG systems loaded from plugin docs, not application logic |
| 3. Player agency | Enforced by GM prompt (gm-craft), observable in play |
| 4. Progressive simplification | The MVP *is* the simplified version |
| 5. System-agnostic | Emergent from Principle 2. Engine doesn't know what system is playing |

## What This Defers

- Adventure creation UI (manual for now)
- RPG system selection per adventure (hardcoded plugin paths)
- Panels, theming, background images
- History compaction and summarization
- Session recovery and reconnection
- Any UI beyond conversation and adventure list

## Open Questions

- What markdown structure does an adventure directory need at minimum? (Character sheet, world state, what else?)
USER RESPONSE: Let's not over engineer it yet. Allowing the Claude Agent SDK to run from a particular directory may be the bare minimum. Then simply two files "character.md" and "world.md" at least for the MVP

- How does conversation history persist between sessions? (Append to a file? Rotating files with compaction?)
USER RESPONSE: We'll have a separate brainstorm.

- What's the prompt assembly look like? (System prompt + gm-craft + game system docs + adventure state + conversation history)
USER RESPONSE: The way the craft and system docs are to be integrated are by referencing the skill not by full integration. Can we use this same philosophy for the adventure state? As for the conversation history. That will warrant its own brainstorm.

## Next Steps

This brainstorm is ready to become a spec. The scope is clear enough to define requirements and success criteria.
