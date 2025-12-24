# File Structure Reference

This document details the markdown file templates used for character and world state persistence. Templates are system-agnostic—adapt section contents to match the RPG system being played.

## Directory Structure

```
players/
  {character-slug}/
    sheet.md      # Character identity, stats, abilities, equipment
    state.md      # Current resources, conditions, objectives

worlds/
  {world-slug}/
    art-style.md     # Visual style for generated images (1-2 lines)
    world_state.md   # Current world conditions
    locations.md     # Known locations
    characters.md    # NPCs and factions
    quests.md        # Active and completed quests
```

## Character Files

### sheet.md

The character sheet contains permanent character data. Adapt sections to match the RPG system.

```markdown
# [Character Name]

## Identity
<!-- System-specific: class, playbook, heritage, ancestry, background, etc. -->
- **[Type Label]**: [Value]
- **[Origin Label]**: [Value]

## Stats
<!-- System-specific: attributes, traits, action ratings, etc. -->
<!-- Use table format for traditional systems, list format for narrative systems -->

| [Stat Name] | Value |
|-------------|-------|
| [Stat 1]    | [Val] |
| [Stat 2]    | [Val] |

## Resources
<!-- System-specific: HP, Stress, Harm, Hope, Luck, Armor, etc. -->
- **[Resource 1]**: [Current] / [Max]
- **[Resource 2]**: [Value]

## Capabilities
<!-- System-specific: skills, moves, action ratings, features, domains, etc. -->
- **[Capability Name]**: [Description or modifier]

## Equipment
- [Weapon/gear]
- [Armor/clothing]
- [Other items]

## Narrative
<!-- Backstory, connections, bonds, experiences, Hx, etc. -->
[Character background and story hooks]

## Notes
[Player notes, goals, session discoveries]
```

#### System Examples

**D20/5e Identity:**
```markdown
- **Class**: Fighter
- **Race**: Human
- **Level**: 1
- **Background**: Soldier
```

**Daggerheart Identity:**
```markdown
- **Class**: Guardian (Stalwart)
- **Ancestry**: Human
- **Community**: Orderborne
- **Level**: 1
```

**Blades in the Dark Identity:**
```markdown
- **Playbook**: Cutter
- **Heritage**: Akoros
- **Background**: Military
- **Vice**: Pleasure
```

**PbtA Identity:**
```markdown
- **Playbook**: The Brainer
- **Look**: Woman, vintage wear, deep eyes
```

### state.md

The character state tracks mutable session data: current location, conditions, and objectives.

```markdown
# Character State

## Current Status
- **Location**: [Where the character currently is]
- **Condition**: [Normal, Wounded, Stressed, etc.]
- **Active Effects**: [Temporary conditions or buffs]

## Resources
<!-- Track consumables, currency, expendable items -->
- **[Currency]**: [Amount]
- **Consumables**: [List]

## Current Objectives
- [What the character is trying to accomplish]

## Recent Events
- [Session/narrative state tracking]
```

## World Files

### art-style.md

The art style defines the visual aesthetic for all generated background images in this world. The server automatically applies this style to image generation prompts.

```markdown
# Art Style

[1-2 line visual style description]
```

**Keep it concise.** This is appended to every image generation prompt, so use only essential style keywords.

#### Examples

```markdown
# Art Style

Oil painting, impressionist brushwork, warm earth tones
```

```markdown
# Art Style

Pixel art, 16-bit SNES era, vibrant colors
```

```markdown
# Art Style

Watercolor illustration, soft edges, muted pastels
```

```markdown
# Art Style

Dark fantasy digital art, dramatic lighting, Beksinski-inspired
```

### world_state.md

The world state captures the current state of the game world.

```markdown
# [World Name]

## Overview
- **Genre**: [Fantasy, sci-fi, horror, etc.]
- **Era**: [Time period or age]
- **Tone**: [Gritty, heroic, comedic, etc.]
- **System**: [RPG system being used]

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

## [Location Name]
**Type**: [Village/City/Dungeon/Wilderness/District/etc.]
**Region**: [Geographic area]

### Description
[Vivid description of the location]

### Notable Features
- [Feature 1]
- [Feature 2]

### Connections
- [Direction/Route]: [Connected Location]

---
```

### characters.md

Tracks NPCs the player has encountered or heard about.

```markdown
# NPCs & Characters

## [NPC Name]
**Role**: [Occupation, title, or function]
**Location**: [Where they're typically found]
**Disposition**: [Friendly/Neutral/Hostile/Unknown]

### Description
[Physical description and personality]

### Notes
[What the player knows about them]

---
```

### quests.md

Tracks active and completed quests, missions, scores, or objectives.

```markdown
# Quests

## Active

### [Quest/Mission Name]
**Source**: [NPC, circumstance, or faction]
**Objective**: [What needs to be done]
**Status**: In Progress

#### Progress
- [ ] [Step 1]
- [ ] [Step 2]

#### Stakes
[What's at risk, potential rewards]

---

## Completed

[Moved here when finished, with outcome notes]
```
