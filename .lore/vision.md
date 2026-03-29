---
title: Adventure Engine Vision
date: 2026-03-28
status: approved
tags: [vision, greenfield, collaborative-storytelling]
last_reviewed: 2026-03-28
review_trigger: "Review after first spec or 3 months, whichever comes first"
---

# Adventure Engine of Corvran: Vision

## What This Project Is

Adventure Engine is a space for collaborative storytelling.

A human and an AI sit down together and make up a story, the way kids do. One of them, the AI, also keeps track of the rules, the continuity, and the world's state. Not because it's in charge, but because someone has to remember that the bridge collapsed in scene three.

TTRPGs are shared narrative. At their core, it's kids playing make-believe but with rules. The AI is one of the kids who also happens to maintain the rules. The rules create stakes, not authority. The story belongs to everyone at the table.

The ambition is not an AI that runs a simulation. It's an AI that plays with you.

## Design Principles

### 0. The Story is the Product

Everything this application does is in service of collaborative storytelling. Background images, info panels, rule systems, character agents, atmospheric music: these serve the story. They are not the story. When a feature starts accumulating its own requirements, its own complexity, its own reason for existing, check it against this principle. If removing it would leave no story, it's core. If removing it would leave a less rich story, it's a tool on the table. Tools belong on the table. They don't become the table.

### 1. Markdown is Memory

All game-meaningful state lives in markdown files. Character sheets, story arcs, world state, locations, NPCs, quests. Not because markdown is a good database (it isn't), but because it's the shared medium between the AI, the developer, and the player. All three can read it, understand it, and change it. When the state format is also the communication format, there's nothing to translate.

### 2. Teach, Don't Code

When a new RPG system needs support, the answer is reference material and instructions, not application code. RPG mechanics are delivered as documents the AI reads, not logic the system executes.

This is a bet. The bet is that an AI with good reference material and clear instructions will make better game mastering decisions than hard-coded rules, because game mastering is fundamentally about judgment, not computation. A coded combat system would resolve attacks faster but couldn't decide when to let a player's creative solution bypass the rules entirely.

### 3. Player Agency is Sacred

The AI never decides what the player does. Never narrates their actions. Never resolves their choices for them. This isn't soft guidance. It's a boundary with the same gravity as security. "The GM decided what the player does" is a failure mode, not a style choice.

The world pushes back. Players earn their victories because failure is real. Agency means your decisions matter, not that you always win.

### 4. Progressive Simplification

If the AI can do it with standard tools, remove the custom tool. The trajectory is always toward less machinery between the participants and the story. Every layer of custom tooling is a layer where the system's opinions can override the storytelling.

### 5. System-Agnostic Core

The engine knows about stories, players, and a game master. It doesn't know about d20, hit points, or spell slots. RPG systems are content, not architecture. The same engine could run high fantasy, sci-fi investigation, horror survival, or freeform narrative with no rules at all. It assumes: there is a story, there are participants, and one of them maintains the rules.

## What Comes Next

This is a greenfield reboot. The previous implementation proved the core beliefs work. Now we rebuild with those beliefs as the foundation rather than something discovered along the way.

Specs will define how the world gets built, how the story gets told, and how the pieces fit together. This vision defines what we believe about why any of it matters.
