---
title: RPG System Loading and Selection
date: 2026-03-29
status: resolved
tags: [plugins, game-systems, bootstrap-prompts, adventure-config, architecture]
modules: [backend, session-runner, prompt-service, adventure-service, dice-tool]
related: [.lore/vision.md, .lore/brainstorm/mvp-scope.md]
---

# Brainstorm: RPG System Loading and Selection

## Context

The MVP shipped with all three plugins hardcoded in `app.ts:57-61`:

```typescript
const pluginPaths = [
  resolve(repoRoot, "plugins/corvran"),
  resolve(repoRoot, "plugins/d20-system"),
  resolve(repoRoot, "plugins/daggerheart-system"),
];
```

The prompt service (`prompt-service.ts:23`) says "You are the Game Master for a tabletop RPG adventure" and gives no direction about which system to use. The AI defaults to D&D because that's dominant in its training data, even when Daggerheart skills are available.

The MVP scope brainstorm called this out explicitly: "RPG system selection is a real config question, just deferred." That deferral is now creating a concrete problem. The engine loads two competing game systems, the prompt gives no guidance, and the AI picks the one it knows best. A Daggerheart adventure that plays like D&D with Daggerheart terminology is worse than either system played correctly.

## Ideas Explored

### 1. One System Per Adventure

The user's instinct is right. Loading d20-system and daggerheart-system simultaneously for the same session is like handing a human GM two rulebooks and saying "run a game." A good GM would ask "which one?" before proceeding. We're skipping that question.

**What "one system" means concretely:**

Each adventure declares which game system it uses. The session runner loads only that system's plugin (plus corvran, always). An adventure using Daggerheart never sees d20 skills. An adventure using D&D never sees Daggerheart skills.

This aligns with Principle 5 (system-agnostic core): the engine doesn't know about d20 or Daggerheart. It knows "this adventure uses these plugins." The RPG system is content configuration, not engine architecture.

**What changes:**

- The adventure needs a way to declare its system. See "Adventure Definition Format" below.
- `resolveConfig()` in `app.ts` stops hardcoding all plugin paths. It resolves only corvran as the base.
- `session-runner.ts` receives plugin paths per-adventure, not globally.
- The adventure routes need to resolve which plugins to load when starting a session.

**What doesn't change:**

- Plugin structure stays the same. Plugins don't know about each other.
- The Agent SDK `plugins` option already accepts an array. We're just making the array adventure-specific instead of global.
- Corvran skills (dice-roller, gm-craft) remain universal.

### 2. Corvran as the Core Plugin

Looking at what each plugin actually provides:

**corvran** (1 skill after dice roller extraction):
- `gm-craft`: Storytelling techniques, improv principles, NPC creation, scene pacing, failure handling. Explicitly references techniques from multiple systems (Critical Role, Dimension 20, Dungeon World, FATE, Daggerheart). Universal.
- ~~`dice-roller`: Moves to engine-level MCP tool. See "Dice Roller as Engine Tool" below.~~

**d20-system** (5 skills):
- `d20-rules`: SRD 5.2 lookup (1.3MB of reference material)
- `d20-combat`: D&D combat flow, initiative, attacks, conditions
- `d20-magic`: Spellcasting rules and spell lookup
- `d20-monsters`: Monster stat blocks, NPC templates
- `d20-players`: Character creation, leveling, sheet management

**daggerheart-system** (6 skills):
- `dh-rules`: Daggerheart SRD 1.0 lookup
- `dh-combat`: Spotlight system, Hope/Fear economy, action outcomes
- `dh-domains`: Domain card reference
- `dh-frame`: Campaign frame structure
- `dh-adversaries`: Adversary stat blocks, encounter building
- `dh-players`: Character creation, Experiences, leveling

The split is clean. Corvran is GM craft. The system plugins are rules and mechanics. The dice roller, which both d20-combat and dh-combat currently reference via relative path (`${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh`), is better understood as engine infrastructure than a plugin concern. See "Dice Roller as Engine Tool" below.

**Proposal:** Corvran always loads. It's the "core" plugin. System plugins are additive. An adventure with no system plugin is freeform storytelling (the AI has GM craft and dice but no specific rules). This is actually a valid play mode, and it falls out naturally from the architecture.

**What if someone wants a system-agnostic adventure?** They just don't declare a system. Corvran loads alone. The AI has gm-craft for storytelling and the engine's dice tool for any ad-hoc rolls. This is Principle 5 in its purest form.

### 3. Bootstrap Prompts: What the AI Needs Beyond Skills

Having the right skills available is necessary but not sufficient. The current prompt says "You are the Game Master for a tabletop RPG adventure" and nothing more about mechanics. The AI fills this vacuum with its training data, which means D&D.

**The problem is framing, not capability.** The AI has Daggerheart combat skills. But if the prompt doesn't tell it "you are running a Daggerheart game," it won't reach for those skills by default. It'll describe initiative rolls and AC checks because that's the default RPG mental model in its training data.

**What a bootstrap prompt needs to establish:**

1. **System identity**: "You are running a Daggerheart game" (not just "a tabletop RPG")
2. **Core mechanic summary**: How this system works, described on its own terms
3. **Dice convention**: How rolls work in this system, using the engine's dice tool
4. **Narrative philosophy**: The system's approach to storytelling and action
5. **Key vocabulary**: The system's own terminology, used exclusively

**Anti-pattern: comparative framing.** A Daggerheart bootstrap that says "no initiative rolls" or "not AC" defines itself by what it isn't, which anchors the AI's reasoning on D&D as the baseline. Each system should stand on its own terms. "Spotlight flows from action outcomes" is correct framing. "No initiative rolls" is comparative poisoning.

**Draft: Daggerheart bootstrap prompt (revised, self-contained):**

```
You are running a Daggerheart game by Darrington Press.

Core mechanic: Players roll Duality Dice (2d12) for action rolls. The higher die
determines whether the player gains Hope or you gain Fear. This token economy drives
the narrative: Hope empowers players, Fear empowers your responses.

Spotlight flow: Players act first. When a roll generates Fear or fails, you take the
spotlight and adversaries act. After your turn, spotlight returns to a player.
Spotlight moves through the fiction, not through a fixed order.

Damage and defense: Adversaries have Evasion (the target number for attacks). Damage
is measured in thresholds (Minor/Major/Severe) against Hit Points. Characters also
carry Stress; maximum Stress causes Vulnerability.

Death is a dramatic choice: Blaze of Glory, Avoid Death, or Risk It All. The player
decides how their character faces the end.

Use Daggerheart terminology exclusively. Use the dh-* skills for rules, combat, and
character management. Use the engine dice tool for all rolls.
```

**Draft: D&D 5E bootstrap prompt (revised, self-contained):**

```
You are running a D&D 5th Edition game using the SRD 5.2 rules.

Core mechanic: Players roll a d20 and add modifiers for ability checks, attack rolls,
and saving throws. Meet or exceed the target number to succeed.

Initiative: All combatants roll initiative (d20 + DEX modifier) at combat start.
Turns proceed from highest to lowest each round.

Armor Class (AC) is the target number for attack rolls. Hit Points are a numerical
pool; damage subtracts directly. Advantage and Disadvantage: roll 2d20, take higher
or lower. Multiple sources of either don't stack.

Six ability scores (STR, DEX, CON, INT, WIS, CHA) with derived modifiers. Proficiency
bonus increases with level and applies to trained skills, saves, and attacks.

Use D&D terminology. Use the d20-* skills for rules, combat, spellcasting, and
character management. Use the engine dice tool for all rolls.
```

**Note:** These drafts are illustrative. The actual bootstrap files are well-structured markdown authored by the plugin maintainer. They are not constrained to this format. Each system decides what sections it needs.

**Where should bootstrap prompts live?**

**Decision: Inside the plugin directory.** Each system plugin includes a `bootstrap.md` declared in its `corvran-plugin.json` manifest. The engine reads the file when loading the plugin. Plugin authorship is fully self-contained: skills teach the AI how to use mechanics, the bootstrap establishes the mental model, and the manifest ties them together. Adding a new game system requires no engine code changes.

The prompt assembly order in `prompt-service.ts` would become:

1. Identity (with system bootstrap if present)
2. Principles (player agency)
3. Adventure state (character + world)
4. Onboarding (conditional)
5. Conversation history
6. Instructions

The bootstrap prompt slots into the Identity section. Instead of "You are the Game Master for a tabletop RPG adventure" alone, it becomes "You are the Game Master for a tabletop RPG adventure" + system-specific framing.

### 4. Adventure Definition Format

Currently an adventure is just a directory with optional `character.md`, `world.md`, and `history.md`. There's no manifest, no metadata beyond the directory name.

The adventure needs to declare its system. The simplest approach: a `config.md` (or `adventure.md` or `manifest.md`) file in the adventure directory.

**What if the declaration is just a single field in a YAML frontmatter block?**

```markdown
---
system: daggerheart
---
```

That's it. One field. The engine reads the frontmatter, looks up the plugin by name, loads it. No system declaration means freeform (corvran only).

**What if it's a full manifest?**

```markdown
---
system: daggerheart
name: The Siege of Thornwall
created: 2026-03-29
---

# The Siege of Thornwall

A Daggerheart adventure set in the besieged city of Thornwall...
```

The manifest could grow to include adventure description, custom prompts, additional context. But for now, `system` is the only field that does anything mechanical.

**Naming the file:** `adventure.md` feels right. It's the adventure's identity document. Short, obvious, discoverable. And it follows the pattern of `character.md` and `world.md` as the adventure's state files.

**What values does `system` accept?** Plugin directory names: `d20-system`, `daggerheart-system`. Or shorter aliases: `d20`, `daggerheart`. Shorter is better for hand-editing. The engine can resolve `daggerheart` to `plugins/daggerheart-system/`.

**What if the value doesn't match any installed plugin?** The engine should fail clearly: "Adventure 'thornwall' declares system 'pathfinder' but no matching plugin was found." Not silently fall back to freeform.

### 5. Adventure Creation Flow

If an adventure declares its system, when does the player choose?

**For the near term: manual creation.**

The MVP scope brainstorm established that adventure creation is manual. Players create directories and files. Adding `adventure.md` with a `system` field is the same workflow: create a file, write one line of YAML frontmatter.

This is fine for now. The user who creates an adventure directory and drops in `character.md` will also create `adventure.md` and write `system: daggerheart`.

**For later: creation UI.**

When adventure creation moves to the UI, system selection becomes a step in the creation flow:

1. Name your adventure
2. Choose a game system (dropdown: D&D 5E, Daggerheart, Freeform)
3. Start playing (character creation happens in conversation)

The system choice is immutable after creation. Changing a Daggerheart adventure to D&D mid-campaign would require converting character sheets, recalculating stats, translating mechanics. That's not a system feature; that's starting a new adventure.

**What if the player doesn't care which system?** Two paths:

- **Freeform**: No system. GM craft only. Rules emerge from conversation. This is valid and intentional.
- **Let the AI choose**: The onboarding conversation could include "What kind of game do you want to play? I can run D&D 5E or Daggerheart." Then the AI writes the `adventure.md` file as part of setup.

The second option is interesting. It means system selection could be conversational, not just a form field. The AI explains the difference, the player picks, and the adventure configures itself. But this has a bootstrapping problem: the AI needs all system plugins loaded to describe the options, then needs to narrow down to one. A two-phase session (discovery phase with all plugins, then play phase with one) adds complexity.

**Simpler: the UI presents the choice, the engine writes the file.** Conversational system selection is a nice-to-have that can come later.

### 6. Plugin Loading Architecture

Currently `resolveConfig()` returns global plugin paths, and `createSessionRunner` receives them at construction time. Every session uses the same plugins.

The change: plugin resolution becomes per-adventure, driven by plugin manifests.

**Plugin manifest (`corvran-plugin.json`):**

Each plugin declares its identity in a `corvran-plugin.json` file at the plugin root. The engine scans `plugins/` at startup, reads these manifests, and builds an alias-to-path map for resolution.

```json
// plugins/corvran/corvran-plugin.json
{ "name": "corvran", "type": "core", "aliases": ["corvran"] }

// plugins/daggerheart-system/corvran-plugin.json
{ "name": "daggerheart-system", "type": "system", "aliases": ["daggerheart"], "bootstrap": "bootstrap.md" }

// plugins/d20-system/corvran-plugin.json
{ "name": "d20-system", "type": "system", "aliases": ["d20"], "bootstrap": "bootstrap.md" }
```

Fields: `name` (string), `type` (`"core"` or `"system"`), `aliases` (string array), `bootstrap` (optional, path relative to plugin root). Two types exist today; the field is a forward seam for future extension. Duplicate aliases across plugins are undefined behavior ("don't do that"), not a designed-for scenario.

**Option A: Resolve at session start.**

The adventure routes read `adventure.md`, determine the system, resolve plugin paths, and pass them to the session runner per-query. This means `runQuery` needs to accept plugin paths as a parameter instead of pulling from config.

```typescript
// Before
function runQuery(params: RunQueryParams): Query { ... }

// After
function runQuery(params: RunQueryParams & { pluginPaths: string[] }): Query { ... }
```

The session runner becomes stateless with respect to plugins. It just passes through whatever paths it's given.

**Option B: Create a session runner per adventure.**

Each adventure gets its own session runner instance configured with the right plugins. The adventure routes create (or cache) runners keyed by adventure ID.

This is more complex and doesn't buy anything meaningful. The session runner doesn't hold state between queries anyway (each `runQuery` creates a fresh SDK query). Option A is simpler.

**Option C: Plugin resolution service.**

A dedicated service that takes a system name and returns plugin paths. The adventure routes call it, pass results to the session runner.

This adds a layer of indirection that's useful if plugin resolution becomes complex (remote plugins, version resolution, compatibility checks). Overkill for now, but worth noting as a future seam.

**Decision: Option A (resolve at session start) with manifest-based discovery.** Move plugin paths from session runner config to per-query params. At startup, the engine scans `plugins/` for `corvran-plugin.json` manifests and builds an alias-to-path map. The `resolvePluginPaths` function uses this map instead of a hardcoded one. No engine code changes when adding a new system plugin.

### 7. What the Prompt Service Becomes

Today `assembleSystemPrompt` is a pure function that takes adventure state and returns a string. It doesn't know about game systems.

After this change, it also receives the bootstrap prompt (if any) and weaves it into the Identity section.

```typescript
export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
  systemBootstrap: string | null;  // new
}
```

The assembly becomes:

```
# Identity

You are the Game Master for a tabletop RPG adventure.

[system bootstrap prompt, if present]

# Principles
...
```

The prompt service stays pure. It doesn't read files or resolve plugins. The adventure routes read the bootstrap file and pass it in. Clean separation.

### 8. Dice Roller as Engine Tool

The original brainstorm noted that both d20-combat and dh-combat depend on corvran's dice-roller via `${CLAUDE_PLUGIN_ROOT}/../corvran/`. This raised a fragility question (Q3), but the deeper question is: why do system plugins depend on corvran at all?

The only cross-plugin dependency is dice rolling. Every game system needs dice. No plugin should own that. The dice roller is engine infrastructure.

**Decision: The dice roller becomes an engine-provided MCP tool.** The session runner exposes it via the Agent SDK's MCP server support. Every session gets it automatically, regardless of which plugins are loaded. The bash script (`plugins/corvran/skills/dice-roller/scripts/roll.sh`) and all cross-plugin `${CLAUDE_PLUGIN_ROOT}/../corvran/` references are removed. System plugins have zero dependency on corvran.

**Tool contract:**

Input:
```typescript
{
  groups: [
    { n: number, d: number, label?: string }
  ],
  modifier?: number,
  threshold?: number
}
```

Output:
```typescript
{
  groups: [
    { label?: string, rolls: number[] }
  ],
  modifier: number,
  total: number,
  threshold?: number,
  met?: boolean
}
```

The engine does all arithmetic. The AI narrates results without computing anything.

**Examples:**

D&D attack roll (d20+5 vs AC 15):
```json
// Input
{ "groups": [{ "n": 1, "d": 20, "label": "attack" }], "modifier": 5, "threshold": 15 }
// Output
{ "groups": [{ "label": "attack", "rolls": [14] }], "modifier": 5, "total": 19, "threshold": 15, "met": true }
```

Daggerheart action roll (Duality Dice + 3 vs difficulty 14):
```json
// Input
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 3, "threshold": 14 }
// Output
{ "groups": [{ "label": "hope", "rolls": [9] }, { "label": "fear", "rolls": [6] }], "modifier": 3, "total": 18, "threshold": 14, "met": true }
```

The AI sees which die was higher (hope 9 vs fear 6, player gains Hope) and whether the roll succeeded (18 vs 14, met). All math is engine-side.

**Scope:** Standard dice (NdD) with optional modifier and threshold. Fudge/Fate dice are v2.

**Impact on corvran plugin:** The dice-roller skill is removed. Corvran retains gm-craft as its sole skill. The `corvran-plugin.json` manifest declares `"type": "core"`. Corvran's role narrows to GM craft and storytelling; mechanical tooling lives in the engine.

## Risks and Tensions

### adventure.md is config, not state

The other files in an adventure directory (`character.md`, `world.md`, `history.md`) are mutable game state that the AI reads and writes during play. `adventure.md` is configuration. The AI currently has Write tool access to the adventure directory, which means it could overwrite the system declaration mid-session. This is a category error: letting the AI change its own rules.

Options: (a) make `adventure.md` a dotfile (`.adventure.md`) so the AI is less likely to touch it, (b) use YAML instead of markdown to signal "this is config," (c) rely on the bootstrap prompt telling the AI not to modify it, (d) accept the risk for now and address write protection as a broader concern later. Leaning toward (d) since the AI already has write access to `character.md` and doesn't typically corrupt it.

### Bootstrap prompts vs. skill content

The system plugins' skill files already describe mechanics in detail. The d20-combat skill explains initiative, AC, and attack resolution. The dh-combat skill explains spotlight flow, Hope/Fear, and Duality Dice. The bootstrap prompt duplicates some of this.

The distinction: skill files teach the AI how to *use* the skills (lookup patterns, templates, resolution procedures). The bootstrap prompt establishes the AI's *mental model* before any skill is invoked (what kind of game this is, what vocabulary to use, what assumptions to carry). Think of skills as reference material on the shelf and the bootstrap as the briefing you give a substitute GM before handing them the books. Both are needed. They serve different moments in the AI's reasoning.

If a bootstrap prompt contradicts a skill file, the skill file should win (it's closer to the action and more detailed). The bootstrap is framing, not rules.

### Onboarding must become system-aware

The current onboarding section says "Ask what kind of adventure they want to play" and "guide character creation." When the system is already declared, this generic framing is wrong. A Daggerheart adventure should say "Guide them through Daggerheart character creation: ancestry, community, class, Experiences." A D&D adventure should say "Guide them through D&D character creation: class, origin, ability scores." Without system-specific onboarding, the AI will use the right vocabulary (from the bootstrap) but walk through the wrong creation steps (from training data defaults). This isn't a nice-to-have; it's a co-requirement with the bootstrap prompt.

The bootstrap prompt could include onboarding guidance as a section. Or the prompt service could have a separate onboarding-per-system mechanism. The simpler path: let the bootstrap prompt be comprehensive enough to cover onboarding. One file per system, one place to maintain.

### Backward compatibility: silent skill loss

Today, every adventure has access to d20 and daggerheart skills because all plugins load globally. After this change, adventures without `adventure.md` get only corvran. Any existing adventure that was implicitly relying on system skills will silently lose them.

Migration path: when the engine encounters an adventure with no `adventure.md`, it could log a warning. Or the spec could require a one-time migration that adds `adventure.md` to existing adventures. Since the MVP hasn't been widely deployed, the practical risk is low, but the spec should document the behavioral change.

## Open Questions

All questions resolved.

1. **Bootstrap prompt format**: Well-structured markdown, no enforced schema. Each system decides what sections it needs. Bootstrap prompts must be self-contained descriptions, not comparative ones (no "unlike D&D" framing). The engine reads the file verbatim and inserts it into the system prompt.

2. **Plugin discovery vs. hardcoded map**: Plugins self-describe via `corvran-plugin.json` manifest. Engine scans `plugins/` at startup and builds alias-to-path map dynamically. No engine code changes when adding a new system. Manifest fields: `name`, `type`, `aliases`, optional `bootstrap`.

3. **System plugins depending on corvran**: Dissolved. The dice roller becomes an engine-provided MCP tool. System plugins have zero dependency on corvran. All cross-plugin `${CLAUDE_PLUGIN_ROOT}/../corvran/` references are removed. The engine's dice tool accepts grouped rolls with labels, modifier, and threshold, and returns pre-computed results.

4. **Multiple system plugins per adventure**: One system per adventure. The `system` field in `adventure.md` is a single string, not an array. No multi-system support.

5. **Adventure listing**: Yes, include `system` in the adventure list API response. `system: string | null` in `AdventureListItemSchema`. It's a UX requirement.

6. **Freeform validation**: No `adventure.md` = freeform. No warning, no error. An adventure without structure is just an adventure without structure. Players add rules when they want them.

7. **Plugin path resolution fragility**: Not fragile. Plugins live in `plugins/` in the repo. The daemon runs from the repo root. The path is fixed by project structure. No environment variable or configurable path needed. Tests pass the path explicitly through DI.

## Next Steps

This brainstorm is ready to feed a spec. The core decisions are:

- One system per adventure, declared in `adventure.md`
- Corvran always loads as the core plugin
- Plugins self-describe via `corvran-plugin.json` manifest (name, type, aliases, optional bootstrap)
- Bootstrap prompts are well-structured markdown, self-contained (no comparative framing), authored by the plugin maintainer
- Plugin paths move from global config to per-query resolution via manifest-based discovery
- Prompt service gains a system bootstrap section
- Dice roller moves from corvran plugin to engine-provided MCP tool with structured input (groups with labels, modifier, threshold) and pre-computed output
- One system per adventure (single string, not array)
- Adventure list API includes `system` field
- No `adventure.md` = freeform (no error, no warning)
- Plugin path resolution is not fragile; `plugins/` is a fixed repo-relative path

All open questions are resolved. The spec should define: the `adventure.md` format, the `corvran-plugin.json` manifest schema, the bootstrap prompt convention and anti-patterns, the dice tool's MCP contract, the changes to plugin resolution and session runner, and the prompt assembly order. It should also define how the adventure list API changes and what happens when a system declaration doesn't match an installed plugin.
