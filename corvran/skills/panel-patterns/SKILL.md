---
name: panel-patterns
description: This skill should be used when the GM wants panel creation ideas, asks "what panels should I create", needs atmospheric enhancement suggestions, or wants to know pre-defined panel patterns for common RPG scenarios. Provides panel pattern library organized by context (location, genre, game state).
---

# Panel Patterns Skill

Provides pre-defined panel patterns and best practices for creating atmospheric info panels in adventures. Use these patterns as inspiration when creating panels with the `create_panel` MCP tool.

## Universal Patterns

These patterns work across all genres and RPG systems:

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
• Visibility: 60ft
• Ranged attacks: Disadvantage
• Perception (sight): -5 penalty
```

```markdown
**Blizzard Conditions**
• Visibility: 20ft
• Movement: Half speed
• CON save DC 10/hour or 1 level exhaustion
• Duration: 3 more hours
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
⚠️ **CRITICAL** • 8/42 HP • Poisoned (3 rounds remaining)
```

```markdown
💀 **DEATH SAVES** • Successes: ✓✓ • Failures: ✗ • Roll now!
```

```markdown
🩸 **BLEEDING** • Lose 1d4 HP/round • Medicine DC 12 to stop
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
- **Content structure**: Clock icon, time remaining, consequence preview

**Examples**:
```markdown
⏱️ **Ritual Completes in 3 Rounds** • Portal stabilizing... • Stop it now or too late!
```

```markdown
⏰ **Quest Deadline: 2 Days** • Merchant caravan departs at dawn on Day 3
```

```markdown
💣 **Bomb Detonates: 4 Rounds** • Disarm check DC 18 Thieves' Tools
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
• Arrows: 12/20
• Torches: 3 (4 hrs light each)
• Rations: 6 days
• Waterskins: Full (2/2)
```

```markdown
**Spell Slots**
1st: ⬤⬤⬤○
2nd: ⬤⬤○
3rd: ⬤○
```

**Update triggers**: Resource consumed, resource restored (loot, rest, purchase)
**Dismiss trigger**: Resources no longer scarce, tracking no longer relevant

---

## Location-Based Patterns

These patterns trigger based on where the party is:

### Tavern/Inn - Gossip Feed (header)
**When to create**: Party enters social hub with rumors and quest hooks

**Pattern**:
- **ID**: `tavern-gossip`
- **Position**: `header` (scrolling ticker feel)
- **Persistent**: `false` (temporary while in location)
- **Content structure**: Overheard snippets, attribution if relevant, intrigue elements

**Example**:
```markdown
🍺 **Overheard at the Rusty Tankard**
• "...dragon sighted near the old mines, third time this month..."
• "Merchant caravan's three days late. Bandits, I reckon."
• Drunk dwarf muttering: "...shouldn't have opened that tomb..."
```

**Update triggers**: Time passes in tavern (simulate conversation flow), new NPCs arrive
**Dismiss trigger**: Party leaves tavern

---

### Wilderness/Travel - Journey Status (sidebar)
**When to create**: Party on multi-day journey where progress and supplies matter

**Pattern**:
- **ID**: `travel-status`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing journey)
- **Content structure**: Day count, destination distance, supplies, party condition, weather note

**Example**:
```markdown
**Journey to Ironkeep**
• Day 4 of 7
• Distance remaining: 90 miles
• Rations: 8 days
• Morale: High
• Weather: Clear skies
```

**Update triggers**: Day passes, supplies consumed, party condition changes, weather shifts
**Dismiss trigger**: Journey completes, party stops to rest at settlement

---

### Dungeon - Depth Tracker (sidebar)
**When to create**: Multi-level dungeon where depth and mapping matters

**Pattern**:
- **ID**: `dungeon-depth`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing exploration)
- **Content structure**: Current level, environment notes, hazards, atmosphere cues

**Examples**:
```markdown
**The Sunken Crypts - Level 3**
• Water: Knee-deep, cold
• Air: Stale, echoes of chanting below
• Visibility: Torchlight only
• Exits: North passage, flooded stairs down
```

```markdown
**Shadowfell Tower - Floor 7 of 12**
• Darkness: Magical (darkvision suppressed)
• Gravity: Unstable (Dex save DC 12 to move normally)
• Time distortion: 1 hour here = 10 minutes outside
```

**Update triggers**: Party descends/ascends levels, discovers new features, environment changes
**Dismiss trigger**: Party exits dungeon

---

### City/Urban - News & Events (header)
**When to create**: Party in urban center where current events and politics matter

**Pattern**:
- **ID**: `city-news`
- **Position**: `header` (ticker-style for ongoing news)
- **Persistent**: `false` (temporary while in city)
- **Content structure**: News snippets, event announcements, political intrigue

**Example**:
```markdown
📰 **City Crier - Evening Edition**
• Royal wedding postponed indefinitely • Chancellor denies corruption charges
• Dockworkers strike enters third week • Curfew extended to midnight
• Reward: 500gp for info on "Crimson Hand" thieves
```

**Update triggers**: Time passes, party influences events, new developments occur
**Dismiss trigger**: Party leaves city, news becomes stale

---

## Genre-Specific Patterns

Patterns tailored to specific game genres:

### High Fantasy - Magical Aura (sidebar)
**When to create**: Area has strong magical presence affecting spells or abilities

**Pattern**:
- **ID**: `magic-aura`
- **Position**: `sidebar`
- **Persistent**: `true` (while in area)
- **Content structure**: Aura type, mechanical effects, sense description

**Example**:
```markdown
**Arcane Convergence Zone**
• Magic: Enhanced (spell DC +2, damage +1d4)
• Detect Magic: Blinding (too much to parse)
• Atmosphere: Air crackles, hair stands on end
• Wild Magic: Roll d20 on any spell, surge on 1-2
```

---

### Cyberpunk - Newsfeed (header)
**When to create**: Urban cyberpunk setting where media and corp news matter

**Pattern**:
- **ID**: `newsfeed`
- **Position**: `header` (constant ticker)
- **Persistent**: `true` (always-on in connected areas)
- **Content structure**: Breaking news, stock movements, corp announcements, crime reports

**Example**:
```markdown
📡 **NetStream Live Feed**
BREAKING: Arasaka stock +12% after Q4 earnings • MegaCity lockdown lifted in Districts 3-7
• Netrunner found dead in District 9 BTL den • Weather: Acid rain advisory until 0600
• NCPD: Avoid I-90 interchange, gang shootout in progress
```

**Update triggers**: Story events occur, time passes, party actions make news
**Dismiss trigger**: Party enters dead zone (no network), player disables feed

---

### Space Opera - Ship Status (sidebar)
**When to create**: Party aboard spacecraft where ship systems are relevant

**Pattern**:
- **ID**: `ship-status`
- **Position**: `sidebar`
- **Persistent**: `true` (constant system monitoring)
- **Content structure**: Critical systems, resource levels, external threats

**Example**:
```markdown
**Starrunner-7 Systems**
• Hull Integrity: 78%
• Fuel: 42% (6.2 light-years range)
• Life Support: Nominal
• Shields: Online (recharge: 2 rounds)
• Sensors: 2 bogeys bearing 045, closing fast
```

**Update triggers**: Ship takes damage, resources consumed, sensors detect changes
**Dismiss trigger**: Party disembarks, ship systems no longer plot-relevant

---

### Horror - Sanity Tracker (sidebar)
**When to create**: Horror game with sanity/madness mechanics

**Pattern**:
- **ID**: `sanity-tracker`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing mental state)
- **Content structure**: Sanity level, symptoms, effects, atmosphere notes

**Example**:
```markdown
**Sanity: 4/10**
• Symptoms: Paranoia, auditory hallucinations
• Effects: -2 to Insight and Perception
• The walls breathe. The shadows whisper your name.
• Next breakdown threshold: 3
```

**Update triggers**: Sanity loss events, rest/recovery, symptoms worsen/improve
**Dismiss trigger**: Character recovers (therapy, magic, time), insanity becomes permanent

---

### Survival - Environmental Hazards (sidebar)
**When to create**: Harsh environment with ongoing hazard tracking (desert heat, arctic cold, radiation)

**Pattern**:
- **ID**: `hazard-tracker`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing exposure)
- **Content structure**: Hazard type, exposure time, effects, protection status

**Example**:
```markdown
**Desert Exposure**
• Heat: Extreme (120°F)
• Exposure: 4 hours
• Next CON save: 1 hour (DC 17)
• Exhaustion: Level 2
• Water: 1/3 waterskins remaining
• Shade: None available
```

**Update triggers**: Time passes, saves made/failed, exhaustion increases, protection found
**Dismiss trigger**: Party finds shelter, hazard ends (nightfall, environment changes)

---

## Game State Patterns

Patterns triggered by specific game mechanical states:

### Combat - Initiative Tracker (sidebar)
**When to create**: Combat begins and turn order matters

**Pattern**:
- **ID**: `initiative-order`
- **Position**: `sidebar`
- **Persistent**: `false` (combat-only)
- **Content structure**: Round number, initiative order with HP, current turn indicator, conditions

**Example**:
```markdown
**Combat - Round 2**

▶ Kael (Init 18) - 24/32 HP - Shield of Faith
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
- **ID**: `faction-standing`
- **Position**: `sidebar`
- **Persistent**: `true` (ongoing political state)
- **Content structure**: Faction names, standing levels, recent changes, consequences

**Example**:
```markdown
**Faction Relations**
• **Merchant Guild**: Honored (+3) ↑
  → 10% discount, guild hall access
• **City Guard**: Neutral (0)
• **Thieves Guild**: Hostile (-2) ↓
  → Prices doubled, ambush risk
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
• Ancient mural depicting ritual sacrifice
• 3 rooms mapped (see locations.md)
• Lore: "The Crimson King sleeps beneath"
• Treasure: 300gp, Ring of Protection +1
• NPC: Met ghost of Archmage Theron
```

**Update triggers**: Party discovers something notable, session time passes
**Dismiss trigger**: Session ends, list becomes too long (archive to state files)

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

### When to Update Panels

- Content changes but context remains (weather worsens, HP drops, timer ticks)
- Mechanical effects shift (hazard intensifies, resources consumed)
- New information relevant to existing panel (gossip updates, news breaks)

**Don't create duplicate panels** - always check with `list_panels` first and update existing.

### When to Dismiss Panels

- Information no longer relevant (weather clears, combat ends, left location)
- Player situation resolves (healed, danger passed, timer expired)
- Panel space needed for higher priority (at 5-panel limit)
- Story moved on and panel is stale

**Dismiss proactively** - don't leave stale panels cluttering the UI.

### Content Guidelines

**Keep it concise**: 2KB limit, but aim for <500 characters for readability
**Use visual hierarchy**: Headers, bullets, spacing, emoji icons sparingly
**Make it scannable**: Key info upfront, details after
**Update don't duplicate**: Same ID for related information
**Be consistent**: Similar panels should have similar format

### Position Selection

- **Sidebar**: Persistent status, ongoing tracking, reference info
- **Header**: Urgent alerts, tickers, time-sensitive warnings
- **Overlay**: Special emphasis, dramatic reveals, unique positioning needs

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
