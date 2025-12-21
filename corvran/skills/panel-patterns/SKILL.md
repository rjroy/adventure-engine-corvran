---
name: panel-patterns
description: |
  This skill should be used when the GM needs panel creation ideas or atmospheric
  enhancement suggestions. Triggers on:
  - "What panels should I create" or "panel suggestions"
  - Requests for atmospheric panels matching genre or location
  - Patterns for combat, travel, dungeon, or social scenarios
  - Best practices for when to create, update, or dismiss panels
  Provides pre-defined patterns organized by context (universal, location, genre, game state).
---

# Panel Patterns Skill

Pre-defined panel patterns and best practices for creating atmospheric info panels in adventures. Use these patterns as inspiration when creating panels with the `create_panel` MCP tool.

**Panel Limit**: Maximum 5 panels active at once. Dismiss stale panels before creating new ones.

## Quick Reference

| Position | Behavior | Best For |
|----------|----------|----------|
| `sidebar` | Persistent, scrollable list | Character sheets, resources, quest logs |
| `header` | Single panel, replaces previous | Location banners, urgent alerts, tickers |
| `overlay` | Modal, blocks interaction | Critical choices, dramatic reveals, combat focus |

---

## Universal Patterns

These patterns work across all genres and RPG systems.

### Weather & Environment (sidebar)
**When to create**: Weather becomes mechanically relevant (affects visibility, movement, damage, or skill checks)

**Pattern**:
- **ID**: `weather`
- **Position**: `sidebar`
- **Persistent**: `true` (until conditions change)
- **Content structure**: Current conditions, mechanical effects, duration if temporary

**Examples**:
```markdown
**Heavy Rain**
- Visibility: 60ft
- Ranged attacks: Disadvantage
- Perception (sight): -5 penalty
```

```markdown
**Blizzard Conditions**
- Visibility: 20ft
- Movement: Half speed
- CON save DC 10/hour or 1 level exhaustion
- Duration: 3 more hours
```

**Update triggers**: Weather worsens/improves, mechanical effects change
**Dismiss trigger**: Weather becomes narratively irrelevant (no longer affects mechanics)

---

### Status Alerts (header)
**When to create**: Character enters dangerous state (HP < 25%, death saves, critical conditions)

**Pattern**:
- **ID**: `status-alert`
- **Position**: `header` (high visibility for urgency)
- **Persistent**: `false` (temporary danger indicator)
- **Content structure**: Warning icon, status descriptor, numbers if relevant, duration

**Examples**:
```markdown
**CRITICAL** - 8/42 HP - Poisoned (3 rounds remaining)
```

```markdown
**DEATH SAVES** - Successes: 2 - Failures: 1 - Roll now!
```

```markdown
**BLEEDING** - Lose 1d4 HP/round - Medicine DC 12 to stop
```

**Update triggers**: HP changes, condition worsens/improves, save results
**Dismiss trigger**: Character healed above threshold, condition removed, character stabilized

---

### Timers & Countdowns (header)
**When to create**: Time pressure exists (ritual completion, event countdown, limited-time decision)

**Pattern**:
- **ID**: `timer`
- **Position**: `header` (constant reminder of urgency)
- **Persistent**: `false` (temporary countdown)
- **Content structure**: Time remaining, consequence preview

**Examples**:
```markdown
**Ritual Completes in 3 Rounds** - Portal stabilizing... Stop it now or too late!
```

```markdown
**Quest Deadline: 2 Days** - Merchant caravan departs at dawn on Day 3
```

```markdown
**Bomb Detonates: 4 Rounds** - Disarm check DC 18 Thieves' Tools
```

**Update triggers**: Time passes (each round, turn, day), deadline extended/shortened
**Dismiss trigger**: Timer expires, event completes, countdown cancelled

---

### Resource Tracking (sidebar)
**When to create**: Limited resource becomes tactically important (ammunition, spell slots, inventory weight, rations)

**Pattern**:
- **ID**: `resources`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing tracking)
- **Content structure**: Resource name, current/max, visual indicator if helpful

**Examples**:
```markdown
**Resources**
- Arrows: 12/20
- Torches: 3 (4 hrs light each)
- Rations: 6 days
- Waterskins: Full (2/2)
```

```markdown
**Spell Slots**
1st: 3/4
2nd: 2/3
3rd: 1/2
```

**Update triggers**: Resource consumed, resource restored (loot, rest, purchase)
**Dismiss trigger**: Resources no longer scarce, tracking no longer relevant

---

### Critical Choice (overlay)
**When to create**: Major decision point requiring player focus - moral dilemmas, branching paths, irreversible actions

**Pattern**:
- **ID**: `critical-choice`
- **Position**: `overlay` (demands attention, blocks other interaction)
- **Persistent**: `false` (dismiss after decision)
- **Content structure**: Situation summary, clear options with consequences hinted

**Example**:
```markdown
**The Ritual Chamber**

The cultist holds a knife to the prisoner's throat. The portal behind him crackles with energy.

**Your options:**
- Attack the cultist (risk the prisoner)
- Negotiate (portal continues charging)
- Target the portal (cultist completes sacrifice)
- Something else?

*What do you do?*
```

**Update triggers**: New information revealed, situation changes
**Dismiss trigger**: Player makes decision, situation resolves

---

## Game State Patterns

Patterns triggered by specific game mechanical states.

### Combat - Initiative Tracker (sidebar)
**When to create**: Combat begins and turn order matters

**Pattern**:
- **ID**: `initiative`
- **Position**: `sidebar`
- **Persistent**: `false` (combat-only)
- **Content structure**: Round number, initiative order with HP, current turn indicator, conditions

**Example**:
```markdown
**Combat - Round 2**

> Kael (Init 18) - 24/32 HP - Shield of Faith
  Goblin 1 (Init 14) - DEAD
  Mira (Init 10) - 28/28 HP
  Goblin 2 (Init 8) - 6/12 HP - Prone
  Ogre (Init 5) - 45/59 HP - Raging
```

**Update triggers**: Turn advances, HP changes, conditions applied/removed, combatants join/die
**Dismiss trigger**: Combat ends (all enemies defeated/fled, party flees, parley reached)

---

### Social - Faction Standing (sidebar)
**When to create**: Party reputation with factions affects available options

**Pattern**:
- **ID**: `factions`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing political state)
- **Content structure**: Faction names, standing levels, recent changes, consequences

**Example**:
```markdown
**Faction Relations**
- **Merchant Guild**: Honored (+3) [up]
  10% discount, guild hall access
- **City Guard**: Neutral (0)
- **Thieves Guild**: Hostile (-2) [down]
  Prices doubled, ambush risk
```

**Update triggers**: Party action affects faction, quest completed, time passes (reputation decays)
**Dismiss trigger**: Factions become irrelevant to current story

---

### Exploration - Discovery Log (sidebar)
**When to create**: Exploration-focused session where discoveries should be tracked

**Pattern**:
- **ID**: `discoveries`
- **Position**: `sidebar`
- **Persistent**: `false` (session-specific)
- **Content structure**: Recent discoveries, lore fragments, map updates

**Example**:
```markdown
**Today's Discoveries**
- Ancient mural depicting ritual sacrifice
- 3 rooms mapped (see locations.md)
- Lore: "The Crimson King sleeps beneath"
- Treasure: 300gp, Ring of Protection +1
- NPC: Met ghost of Archmage Theron
```

**Update triggers**: Party discovers something notable, session time passes
**Dismiss trigger**: Session ends, list becomes too long (archive to state files)

---

## Additional Patterns

For more specialized patterns, see:

- **[Location Patterns](references/location-patterns.md)** - Tavern gossip, wilderness travel, dungeon exploration, city news
- **[Genre Patterns](references/genre-patterns.md)** - High fantasy, cyberpunk, space opera, horror, survival

---

## Best Practices

### When to Create Panels

**DO create panels when**:
- Information is mechanically relevant (affects rolls, decisions, resources)
- Atmospheric enhancement matters (mood, genre reinforcement)
- Tracking is needed across multiple turns/scenes
- Player needs constant reminder of time pressure or danger
- Context would otherwise be repeated in narrative

**DON'T create panels when**:
- Information is one-time/transient (can be narrated once)
- Player action immediately resolves the situation
- Already at 5-panel limit (dismiss something first)
- Information is better revealed gradually in narrative
- Panel would spoil upcoming twist or surprise

### When to Update vs Create

- Content changes but context remains (weather worsens, HP drops, timer ticks) - **Update**
- Mechanical effects shift (hazard intensifies, resources consumed) - **Update**
- New information relevant to existing panel (gossip updates, news breaks) - **Update**

**Don't create duplicate panels** - always check with `list_panels` first and update existing.

### When to Dismiss Panels

- Information no longer relevant (weather clears, combat ends, left location)
- Player situation resolves (healed, danger passed, timer expired)
- Panel space needed for higher priority (at 5-panel limit)
- Story moved on and panel is stale

**Dismiss proactively** - don't leave stale panels cluttering the UI.

### Content Guidelines

- **Keep it concise**: 2KB limit, but aim for <500 characters for readability
- **Use visual hierarchy**: Headers, bullets, spacing
- **Make it scannable**: Key info upfront, details after
- **Update don't duplicate**: Same ID for related information
- **Be consistent**: Similar panels should have similar format

### Position Selection

| Position | Use For |
|----------|---------|
| `sidebar` | Persistent status, ongoing tracking, reference info |
| `header` | Urgent alerts, tickers, time-sensitive warnings |
| `overlay` | Critical choices, dramatic reveals, combat focus moments |

---

## Using This Skill

This skill is for **inspiration and reference** when creating panels. The actual panel creation happens via MCP tools:

```
create_panel(id="weather", title="Current Conditions", content="...", position="sidebar", persistent=true)
update_panel(id="weather", content="...updated conditions...")
dismiss_panel(id="weather")
list_panels() // Check before creating to avoid duplicates
```

**Workflow**:
1. Recognize scenario that would benefit from a panel
2. Consult this skill for pattern ideas matching the context
3. Adapt pattern to current situation (customize content, adjust to genre)
4. Use `list_panels` to check for conflicts/duplicates
5. Create panel with `create_panel` MCP tool
6. Update as story progresses
7. Dismiss when no longer relevant

**Remember**: These are suggestions, not requirements. Use judgment for what enhances the experience.
