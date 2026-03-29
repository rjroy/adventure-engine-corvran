---
title: RPG System Loading and Selection
date: 2026-03-29
status: open
tags: [plugins, game-systems, bootstrap-prompts, adventure-config, architecture]
modules: [backend, session-runner, prompt-service, adventure-service]
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

**corvran** (2 skills):
- `dice-roller`: Generic dice rolling via bash script. Supports d20, 2d6, DdD (Daggerheart's Duality Dice), percentile, Fudge dice. System-agnostic by design.
- `gm-craft`: Storytelling techniques, improv principles, NPC creation, scene pacing, failure handling. Explicitly references techniques from multiple systems (Critical Role, Dimension 20, Dungeon World, FATE, Daggerheart). Universal.

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

The split is clean. Corvran is GM craft and tooling. The system plugins are rules and mechanics. Both d20-combat and dh-combat reference corvran's dice-roller via relative path (`${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh`), confirming the dependency direction: system plugins depend on corvran, not the reverse.

**Proposal:** Corvran always loads. It's the "core" plugin. System plugins are additive. An adventure with no system plugin is freeform storytelling (the AI has GM craft and dice but no specific rules). This is actually a valid play mode, and it falls out naturally from the architecture.

**What if someone wants a system-agnostic adventure?** They just don't declare a system. Corvran loads alone. The AI has gm-craft for storytelling and dice-roller for any ad-hoc rolls. This is Principle 5 in its purest form.

### 3. Bootstrap Prompts: What the AI Needs Beyond Skills

Having the right skills available is necessary but not sufficient. The current prompt says "You are the Game Master for a tabletop RPG adventure" and nothing more about mechanics. The AI fills this vacuum with its training data, which means D&D.

**The problem is framing, not capability.** The AI has Daggerheart combat skills. But if the prompt doesn't tell it "you are running a Daggerheart game," it won't reach for those skills by default. It'll describe initiative rolls and AC checks because that's the default RPG mental model in its training data.

**What a bootstrap prompt needs to establish:**

1. **System identity**: "You are running a Daggerheart game" (not just "a tabletop RPG")
2. **Core mechanic summary**: The one-paragraph version of how this system works differently from D&D
3. **Dice convention**: "Roll 2d12 (Duality Dice), not d20" or "Roll d20 + modifier"
4. **Narrative philosophy**: Daggerheart is narrative-first with spotlight flow; D&D is tactical with initiative order
5. **Key vocabulary**: Hope/Fear, Evasion, Stress vs Hit Points, Armor Class, Spell Slots
6. **What NOT to do**: "Do not use initiative order" (for Daggerheart), "Do not use spotlight flow" (for D&D)

The "what not to do" is important. Without negative guidance, the AI blends systems. It'll describe Hope tokens while also asking for initiative rolls.

**Draft: Daggerheart bootstrap prompt:**

```
You are running a Daggerheart game by Darrington Press.

Core mechanic: Players roll Duality Dice (2d12) for action rolls. The higher die
determines whether the player gains Hope or you gain Fear. This token economy drives
the narrative: Hope empowers players, Fear empowers your responses.

Combat uses spotlight flow, not initiative. Players act first. When a roll generates
Fear or fails, you take the spotlight and adversaries act. After your turn, spotlight
returns to a player.

Key differences from other systems:
- No initiative rolls. Spotlight flows from action outcomes.
- No Armor Class. Adversaries have Evasion.
- Damage uses thresholds (Major/Severe), not direct HP subtraction.
- Characters have Stress alongside HP. Maximum Stress causes Vulnerability.
- Death is a dramatic choice (Blaze of Glory, Avoid Death, Risk It All), not a
  saving throw countdown.

Use Daggerheart terminology exclusively. Refer to "Evasion" not "AC," "Stress" not
"exhaustion," "Hope" and "Fear" not "inspiration." Use the dh-* skills for rules,
combat, and character management.
```

**Draft: D&D 5E bootstrap prompt:**

```
You are running a D&D 5th Edition game using the SRD 5.2 rules.

Core mechanic: Players roll a d20 and add modifiers for ability checks, attack rolls,
and saving throws. Meet or exceed the target number to succeed.

Combat uses initiative order. All combatants roll initiative (d20 + DEX modifier) at
combat start. Turns proceed from highest to lowest each round.

Key elements:
- Armor Class (AC) determines what attack rolls need to hit.
- Hit Points are a direct numerical pool. Damage subtracts from HP.
- Advantage/Disadvantage: roll 2d20, take higher or lower. Multiple sources don't stack.
- Six ability scores (STR, DEX, CON, INT, WIS, CHA) with modifiers.
- Proficiency bonus increases with level and applies to trained skills, saves, and attacks.

Use D&D terminology. Refer to ability checks, saving throws, Armor Class, Hit Dice,
spell slots. Use the d20-* skills for rules, combat, spellcasting, and character
management.
```

**Where should bootstrap prompts live?**

Three options:

**Option A: Inside the plugin directory.** Each system plugin includes a `bootstrap.md` (or similar) that the engine reads when loading that plugin. The plugin is self-contained: its skills teach the AI how to do things, and its bootstrap prompt establishes the right mental model.

Pros: Plugin authors control their own bootstrap. Adding a new game system is fully self-service.
Cons: The engine needs to know to look for this file, which is a convention, not enforced by plugin structure.

**Option B: In the prompt service.** The prompt service has a map of system names to bootstrap text, or reads from a known location.

Pros: Centralized. Easy to test.
Cons: Adding a new system requires changing engine code. Violates Principle 2.

**Option C: In the adventure directory.** Each adventure includes a `system.md` that contains (or references) the bootstrap prompt.

Pros: Maximum flexibility. Different adventures using the same system could customize the prompt.
Cons: Duplicates content across adventures. Maintenance burden.

**Recommendation: Option A.** A file like `plugins/daggerheart-system/.claude-plugin/bootstrap.md` that the engine reads when loading the plugin. The prompt service assembles it into the system prompt alongside adventure state. This keeps plugin authorship self-contained (Principle 2) while giving the engine a predictable convention.

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

The change: plugin resolution becomes per-adventure.

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

**Recommendation: Option A for now.** Move plugin paths from session runner config to per-query params. Add a helper function that resolves system name to plugin paths. Keep the seam for Option C later.

```typescript
function resolvePluginPaths(system: string | null): string[] {
  const repoRoot = process.cwd();
  const corePaths = [resolve(repoRoot, "plugins/corvran")];

  if (!system) return corePaths;

  // Map short names to plugin directories
  const systemMap: Record<string, string> = {
    "d20": "d20-system",
    "d20-system": "d20-system",
    "daggerheart": "daggerheart-system",
    "daggerheart-system": "daggerheart-system",
  };

  const pluginDir = systemMap[system];
  if (!pluginDir) {
    throw new Error(`Unknown game system: ${system}`);
  }

  return [...corePaths, resolve(repoRoot, `plugins/${pluginDir}`)];
}
```

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

1. **Bootstrap prompt format**: Should `bootstrap.md` be plain text that gets inserted verbatim? Or structured markdown with sections (identity, mechanics, onboarding, vocabulary)? Plain text is simpler. Structured sections let the engine compose more intelligently. Start with plain text, add structure if the single-blob approach creates problems.

2. **Plugin discovery vs. hardcoded map**: The `resolvePluginPaths` sketch uses a hardcoded map of system names to plugin directories. Should plugins self-describe instead? A `"type": "system"` or `"aliases": ["d20"]` field in `plugin.json` would make the engine discoverable without code changes when adding a new system. Worth noting as a forward seam even if not implemented immediately.

3. **System plugins depending on corvran**: Both d20-combat and dh-combat reference corvran's dice-roller via `${CLAUDE_PLUGIN_ROOT}/../corvran/`. This relative path assumption works only if corvran is a sibling directory. If plugin paths ever change, these references break. Is the sibling assumption stable enough, or should the dice-roller path be injected differently?

4. **Multiple system plugins per adventure**: Is there ever a reason to load more than one system plugin? Crossover adventures? This seems like a novelty case not worth designing for. The architecture shouldn't actively prevent it, but it should be uncommon.

5. **Adventure listing**: When the UI lists adventures, should it show the game system? Adding `system: string | null` to `AdventureListItemSchema` is a minor schema change that enables system badges or filtering in the UI.

6. **Freeform validation**: If an adventure has no `adventure.md` (or no `system` field), is that freeform or an error? Freeform-by-default preserves backward compatibility with existing MVP adventures.

7. **Plugin path resolution fragility**: The current code and the proposed sketch both use `process.cwd()` to find the `plugins/` directory. This works when the daemon runs from the repo root but breaks in tests or alternative deployments. The spec should address how plugin base paths are configured (environment variable, config file, or resolved relative to the module).

## Next Steps

This brainstorm is ready to feed a spec. The core decisions are:

- One system per adventure, declared in `adventure.md`
- Corvran always loads as the core plugin
- System plugins include bootstrap prompts that frame the AI's behavior
- Plugin paths move from global config to per-query resolution
- Prompt service gains a system bootstrap section

The spec should define the `adventure.md` format, the bootstrap prompt convention, the changes to plugin resolution, and the prompt assembly order. It should also define how the adventure list API changes and what happens when a system declaration doesn't match an installed plugin.
