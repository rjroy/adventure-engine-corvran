# Adventure Engine of Corvran

A Claude Code plugin that enables AI-powered tabletop RPG game mastering with persistent world state, character management, and narrative-driven gameplay.

## Vision

The Adventure Engine transforms Claude Code into a game master capable of running rich, interactive RPG adventures. It handles the complexity of world management, rule arbitration, and narrative pacing while keeping the player at the center of the story.

## Core Design Goals

### Persistent World State
- Track locations, NPCs, factions, and world events
- Maintain consistency across sessions
- Support time progression and world evolution

### Character Management
- Player character sheets with stats, inventory, and history
- NPC relationships and disposition tracking
- Character growth and development over time

### Narrative Gameplay
- Dramatic pacing and scene management
- Meaningful choices with consequences
- Balance between player agency and story structure

### Flexible Rule Systems
- Support for various RPG systems (or system-agnostic play)
- Dice rolling and probability handling
- Combat, skill checks, and resolution mechanics

## Planned Components

### Commands
- `/adventure-engine-corvran:new-adventure` - Start a new adventure
- `/adventure-engine-corvran:load-adventure` - Resume an existing adventure
- `/adventure-engine-corvran:character` - Character management

### Agents
- `game-master` - Core GM agent for running gameplay
- `world-builder` - Creates and maintains world state
- `encounter-designer` - Designs challenges and encounters

### Skills
- Session management and state persistence
- Dice rolling and probability mechanics
- Map and location tracking

## The Name

Corvran is named in the tradition of Wyrd Gateway's themed worlds - a realm where stories unfold through player choice and chance. The corvid (crow/raven) theme evokes mystery, intelligence, and the watchful nature of a game master observing the unfolding tale.

## Status

**Early Development** - Currently defining the architecture and core mechanics.
