# Adventure Engine of Corvran

A set of tools for AI-driven tabletop RPG adventures. At its heart is a web-based immersive experience with real-time gameplay, dynamic theming, and procedural imagery—complemented by Claude Code plugin integration for terminal-based adventuring.

## Meet Corvran

Corvran is your game master. Equal parts wise storyteller and trickster, Corvran guides adventures with a singular goal: giving the player the experience they need—whether that's triumph, tension, mystery, or the quiet satisfaction of a puzzle solved.

The name follows the tradition of Wyrd Gateway's themed worlds. The corvid (crow/raven) evokes intelligence, mystery, and the watchful nature of a game master observing the unfolding tale.

## Vision

The Adventure Engine transforms AI into a game master capable of running rich, interactive RPG adventures. It handles the complexity of world management, rule arbitration, and narrative pacing while keeping the player at the center of the story.

## Core Design Goals

### Persistent World State
Track locations, NPCs, factions, and world events. Maintain consistency across sessions. Support time progression and world evolution.

### Character Management
Player character sheets with stats, inventory, and history. NPC relationships and disposition tracking. Character growth and development over time.

### Narrative Gameplay
Dramatic pacing and scene management. Meaningful choices with consequences. Balance between player agency and story structure.

### Flexible Rule Systems
Support for various RPG systems or system-agnostic play. Dice rolling and probability handling. Combat, skill checks, and resolution mechanics.

## Architecture

### Server (Immersive Experience)
The primary experience—a web application delivering real-time gameplay through WebSocket connections:
- Live narrative streaming with Corvran's responses
- Dynamic theming that shifts with the story's mood
- Procedural background imagery matching the current scene
- Session persistence across browser sessions

### Claude Code Plugin
Terminal-based adventure management integrated into your development workflow:
- Commands for starting and resuming adventures
- Character sheet management
- Quick session access without leaving the terminal

## Status

**Active Development** — Core gameplay engine functional, expanding features.
