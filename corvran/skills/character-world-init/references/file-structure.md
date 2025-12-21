# File Structure Reference

This document details the markdown file templates used for character and world state persistence.

## Directory Structure

```
players/
  {character-slug}/
    sheet.md      # Character stats, abilities, equipment
    state.md      # Current HP, conditions, inventory changes

worlds/
  {world-slug}/
    world_state.md   # Current world conditions
    locations.md     # Known locations
    characters.md    # NPCs and factions
    quests.md        # Active and completed quests
```

## Character Files

### sheet.md

The character sheet contains permanent character data: stats, abilities, and base equipment.

```markdown
# [Character Name]

## Basic Info
- **Race**: [Race]
- **Class**: [Class/Archetype]
- **Level**: 1
- **Background**: [Brief background]

## Attributes
| Attribute | Value | Modifier |
|-----------|-------|----------|
| Strength | 10 | +0 |
| Dexterity | 10 | +0 |
| Constitution | 10 | +0 |
| Intelligence | 10 | +0 |
| Wisdom | 10 | +0 |
| Charisma | 10 | +0 |

## Combat
- **HP**: [Max HP] / [Max HP]
- **AC**: [Armor Class]
- **Initiative**: +[Mod]

## Skills
- [Skill 1]: +[Mod]
- [Skill 2]: +[Mod]

## Equipment
- [Starting weapon]
- [Starting armor]
- [Other items]

## Abilities
- **[Ability Name]**: [Description]

## Notes
[Player notes, backstory details, goals]
```

### state.md

The character state tracks mutable session data: current location, conditions, and objectives.

```markdown
# Character State

## Current Status
- **Location**: [Where the character currently is]
- **Condition**: Normal
- **Active Effects**: None

## Resources
- **Gold**: 0
- **Consumables**: None

## Current Objectives
- [What the character is trying to accomplish]

## Recent Events
- [Session/narrative state tracking]
```

## World Files

### world_state.md

The world state captures the current state of the game world.

```markdown
# [World Name]

## Overview
- **Genre**: [high-fantasy, sci-fi, etc.]
- **Era**: [Time period or age]
- **Tone**: [Gritty, heroic, comedic, etc.]

## Current State
[What's happening in the world right now - conflicts, events, atmosphere]

## Factions
- **[Faction Name]**: [Brief description and current status]

## Key NPCs
[Major characters the player has met or heard of]

## Established Facts
- [Fact 1]
- [Fact 2]
```

### locations.md

Tracks discovered and known locations in the world.

```markdown
# Locations

## [Starting Location Name]
**Type**: [Village/City/Dungeon/Wilderness]
**Region**: [Geographic area]

### Description
[Vivid description of the location]

### Notable Features
- [Feature 1]
- [Feature 2]

### Connections
- [Direction]: [Connected Location]
```

### characters.md

Tracks NPCs the player has encountered or heard about.

```markdown
# NPCs & Characters

## [NPC Name]
**Role**: [Innkeeper/Guard/Villain/etc.]
**Location**: [Where they're typically found]
**Disposition**: [Friendly/Neutral/Hostile]

### Description
[Physical description and personality]

### Notes
[What the player knows about them]

---
```

### quests.md

Tracks active and completed quests.

```markdown
# Quests

## Active Quests

### [Quest Name]
**Given By**: [NPC or circumstance]
**Objective**: [What needs to be done]
**Status**: In Progress

#### Progress
- [ ] [Step 1]
- [ ] [Step 2]

#### Rewards
- [Expected rewards]

---

## Completed Quests

[Moved here when finished]
```
