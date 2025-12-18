---
name: character-world-init
description: This skill should be used when starting a new adventure and the playerRef or worldRef is null. It provides guidance for helping the player select or create a character and world, including MCP tool usage and markdown file structure templates.
---

# Character & World Initialization Skill

Guides the GM through setting up a character and world for a new adventure. Use this skill when `playerRef` and/or `worldRef` are null in the adventure state.

## When to Use This Skill

This skill is triggered when:
- A new adventure starts and no character/world is configured
- The GM prompt indicates "Invoke the character-world-init skill for setup guidance"
- The player explicitly asks to create or select a character/world

## Workflow Overview

1. **Check Available Options**: Use list tools to see what exists
2. **Present Options to Player**: Offer existing or new
3. **Process Selection**: Create new or use existing
4. **Update Adventure State**: Call set tools to configure refs
5. **Initialize Files**: Populate markdown templates with character/world data

## Step 1: Check Available Characters and Worlds

Use the MCP tools to discover what already exists:

```
list_characters()
```
Returns: Array of `{ slug, name }` for characters in `players/` directory.

```
list_worlds()
```
Returns: Array of `{ slug, name }` for worlds in `worlds/` directory.

## Step 2: Present Options to Player

Based on what exists, present the player with choices:

**If characters exist:**
> "Welcome, adventurer! I see you have characters from previous adventures:
> - [Character Name] (from [world/adventure context if known])
>
> Would you like to continue with an existing character, or create someone new?"

**If no characters exist:**
> "Welcome, adventurer! This appears to be your first journey. Let's create your character.
> What is your character's name?"

**For world selection (similar pattern):**
> "Which world would you like to explore?
> - [World Name] - [brief description if available]
> - Create a new world"

## Step 3: Process Selection

### Creating a New Character

Call the `set_character` tool with `is_new: true`:

```
set_character({ name: "Kael Thouls", is_new: true })
```

This creates:
- Directory: `players/kael-thouls/`
- Files: `sheet.md`, `state.md` (with templates)
- Updates `playerRef` in adventure state to `"players/kael-thouls"`

### Using an Existing Character

Call the `set_character` tool with `is_new: false`:

```
set_character({ name: "kael-thouls", is_new: false })
```
(Can use slug or display name)

### Creating a New World

Call the `set_world` tool with `is_new: true`:

```
set_world({ name: "Eldoria", is_new: true })
```

This creates:
- Directory: `worlds/eldoria/`
- Files: `world_state.md`, `locations.md`, `characters.md`, `quests.md` (with templates)
- Updates `worldRef` in adventure state to `"worlds/eldoria"`

### Using an Existing World

Call the `set_world` tool with `is_new: false`:

```
set_world({ name: "eldoria", is_new: false })
```

## Step 4: Initialize Character Sheet

After creating a new character, populate the `sheet.md` file with character details.

### Character Sheet Structure (`sheet.md`)

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

### Character State Structure (`state.md`)

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

## Step 5: Initialize World Files

After creating a new world, set up the world files with initial content.

### World State Structure (`world_state.md`)

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

### Locations Structure (`locations.md`)

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

### NPCs Structure (`characters.md`)

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

### Quests Structure (`quests.md`)

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

## Example: Complete New Adventure Flow

```
GM: "Welcome, adventurer! Let me check if you have any existing characters..."
[GM calls list_characters()]

GM: "This is your first adventure! Let's create your character. What name shall I call you?"

Player: "Call me Kael Thouls"

GM: "Kael Thouls - a strong name! And what world shall we explore? Shall I create a new realm for your adventures?"
[GM calls list_worlds()]

Player: "Yes, create a new world called Eldoria"

GM: "Excellent! Let me set everything up..."
[GM calls set_character({ name: "Kael Thouls", is_new: true })]
[GM calls set_world({ name: "Eldoria", is_new: true })]

GM: "Perfect! Now tell me about Kael - what race and class are they?"
[GM proceeds to populate sheet.md with player's answers]
```

## Best Practices

1. **Be conversational**: Don't dump all questions at once. Guide the player step by step.
2. **Offer defaults**: Suggest typical options but let players customize.
3. **Validate names**: Tool handles slugification; use player's exact input for display name.
4. **Build narrative**: Frame setup as the beginning of a story, not a form to fill out.
5. **Respect existing data**: When using existing character/world, read their files first.
