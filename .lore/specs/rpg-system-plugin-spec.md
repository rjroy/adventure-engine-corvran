---
title: RPG System Plugin Specification
date: 2026-04-04
status: draft
tags: [plugins, game-systems, skills, bootstrap-prompts, claude-plugin]
modules: [backend]
related: [.lore/specs/adventure-system-integration.md, .lore/specs/engine-dice-tool.md]
req-prefix: PLG
---

# Spec: RPG System Plugin

## Overview

An RPG system plugin teaches the engine how to run a specific tabletop RPG. It provides a bootstrap prompt (the AI's mental model for the system), skills (reference material and procedures the AI invokes during play), and a manifest (metadata for discovery and loading).

This spec defines the contract between a system plugin directory and the engine. It is derived from the two existing system plugins (`plugins/d20-system/` and `plugins/daggerheart-system/`) and the engine code that loads them. The audience is a developer or AI worker building a new system plugin from scratch.

## Entry Points

- The engine scans `plugins/` at startup via `buildPluginRegistry()` in `packages/backend/src/services/plugin-registry.ts`
- Each subdirectory with a valid `corvran-plugin.json` is registered
- System plugins are resolved per-adventure when `adventure.md` declares a `system` field matching the plugin's alias
- The Claude Agent SDK loads the plugin's `.claude-plugin/plugin.json` as a local plugin, making its skills available to the AI

## Directory Layout

Every system plugin lives at `plugins/<name>-system/` and contains these files:

```
plugins/<name>-system/
  corvran-plugin.json          # Engine manifest (discovery, routing)
  .claude-plugin/
    plugin.json                # Claude plugin manifest (skills, metadata)
  bootstrap.md                 # System prompt injected into AI context
  skills/
    <prefix>-rules/            # SRD/rule lookup skill (MUST exist)
      SKILL.md
      License.md               # License attribution for referenced material
      references/
        srd/                   # Authoritative rule source (symlink or files)
        ...
    <prefix>-combat/           # Combat management skill
      SKILL.md
      references/
        conditions.md
        encounter-template.md
        ...
    <prefix>-players/          # Character creation and advancement
      SKILL.md
      references/
        sheet-template.md
        sheet-example.md
        story-template.md
        ...
    <prefix>-<topic>/          # Additional domain skills as needed
      SKILL.md
      references/
        ...
```

### Naming Convention

- REQ-PLG-1: The plugin directory MUST be named `<alias>-system` where `<alias>` matches the `alias` field in `corvran-plugin.json`. Examples: `d20-system`, `daggerheart-system`.

- REQ-PLG-2: All skills within a plugin MUST use a consistent short prefix derived from the system name. This prefix appears in skill directory names and in the `name` field of each SKILL.md frontmatter. Examples: `d20-` for d20-system, `dh-` for daggerheart-system. The prefix prevents name collisions when multiple system plugins are installed.

**Verification**: Inspect directory names and SKILL.md frontmatter `name` fields.

## Engine Manifest: `corvran-plugin.json`

This file lives at the plugin root. The engine reads it at startup to build the plugin registry.

### Schema

```json
{
  "name": "<alias>-system",
  "type": "system",
  "alias": "<short-name>",
  "description": "<one-line description for the system picker UI>",
  "bootstrap": "bootstrap.md"
}
```

### Field Definitions

- REQ-PLG-3: `name` (string, required). The plugin's identifier. MUST match the directory name.

- REQ-PLG-4: `type` (string, required). MUST be `"system"` for RPG system plugins. The engine also supports `"core"` for always-loaded plugins like corvran. Validation at `plugin-registry.ts:35` rejects any value other than `"core"` or `"system"`.

- REQ-PLG-5: `alias` (string, required). The short name players use to select this system in `adventure.md` frontmatter (e.g., `d20`, `daggerheart`). MUST be non-empty. MUST be unique across all installed plugins. The engine warns on duplicate aliases at startup (`plugin-registry.ts:88-92`).

- REQ-PLG-6: `description` (string, required for system picker). A one-line description shown in the `GET /systems` response. If missing, the plugin still loads but is excluded from the system picker with a startup warning (`plugin-registry.ts:100-103`). Write it as a noun phrase, not a sentence. Examples: "Classic d20 fantasy with classes, levels, and ability scores", "A fantasy RPG where hope and fear drive the story".

- REQ-PLG-7: `bootstrap` (string, optional). Relative path to the bootstrap prompt file. If declared and the file exists, its content is injected into the system prompt for every message in adventures using this system. If the file is missing at runtime, the bootstrap is silently skipped (`adventure-routes.ts:183-191`). SHOULD always be `"bootstrap.md"`.

**Verification**: `isValidManifest()` at `plugin-registry.ts:29-38` validates `name` (string), `type` ("core" or "system"), and `alias` (non-empty string). `description` and `bootstrap` are not validated at parse time but affect runtime behavior.

## Claude Plugin Manifest: `.claude-plugin/plugin.json`

This file tells the Claude Agent SDK how to load the plugin's skills and metadata. It follows the standard Claude Code plugin format.

### Schema

```json
{
  "name": "<alias>-system",
  "version": "<semver>",
  "author": {
    "name": "<author name>",
    "email": "<author email>"
  },
  "description": "<detailed description of what the plugin provides>",
  "repository": "<git repo URL>",
  "license": "<SPDX identifier>"
}
```

### Field Notes

- REQ-PLG-8: `name` MUST match the `name` in `corvran-plugin.json`. The SDK uses this for plugin identification.

- REQ-PLG-9: `version` SHOULD follow semantic versioning. Increment when skills are added, modified, or reference material is updated.

- REQ-PLG-10: `description` SHOULD be more detailed than the engine manifest description. It appears in plugin metadata but not in the system picker. Describe the specific mechanical coverage: what rules, what skills, what reference material.

- REQ-PLG-11: `license` MUST accurately reflect the license of the referenced game material. SRD-based plugins typically use `"CC-BY-4.0"` (d20 SRD 5.2) or a license matching the source material's terms (Daggerheart uses DPCGL, listed as `"CC-BY-4.0"` in the manifest).

**Verification**: Inspect `.claude-plugin/plugin.json`.

## Bootstrap Prompt: `bootstrap.md`

The bootstrap prompt is the most important file in the plugin. It establishes the AI's identity, mechanical knowledge, and behavioral patterns for the entire RPG system. It is injected into the system prompt (via `assembleSystemPrompt()` at `prompt-service.ts:28-30`) after the "You are the Game Master" identity line and before any adventure state.

### Structure

Both existing bootstraps follow the same section order. New plugins SHOULD maintain this structure:

#### 1. System Identity (opening paragraph)

Name the system, its publisher, and its core fantasy in 1-2 sentences. This orients the AI before any mechanics.

> "You are running a Daggerheart game by Darrington Press. Daggerheart is a fantasy RPG built on shared narrative authority, where hope and fear flow between players and Game Master to drive the story forward."

#### 2. Core Mechanic

Explain the fundamental resolution mechanic: what dice to roll, what modifiers apply, what determines success and failure. This is the single most important section because every interaction with the system flows through it.

- REQ-PLG-12: The core mechanic section MUST be complete enough that the AI can resolve any standard action without consulting skills. Skills provide depth; the bootstrap provides the foundation.

- REQ-PLG-13: If the system uses labeled dice groups (like Daggerheart's hope/fear dice), the bootstrap MUST explain the labeling scheme and how to interpret grouped results.

#### 3. Dice Convention

Concrete examples of how to use the `mcp__corvran__roll_dice` tool for this system's rolls. The engine provides a single dice tool that accepts `{ groups, modifier, threshold }`.

- REQ-PLG-14: The bootstrap MUST include at least three dice tool invocation examples covering the system's most common roll types (e.g., ability check, attack roll, damage roll). Each example MUST show the exact JSON payload.

- REQ-PLG-15: Examples MUST use the `groups` array with labeled dice where the system distinguishes dice by purpose. The tool's `label` field is how the AI (and the player) distinguishes one die from another in the result.

Example (d20 system):
```json
{ "groups": [{ "n": 1, "d": 20, "label": "attack" }], "modifier": 7, "threshold": 16 }
```

Example (Daggerheart):
```json
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 2, "threshold": 15 }
```

#### 4. Narrative Philosophy

2-3 paragraphs establishing the narrative tone and GM style appropriate to the system. This shapes how the AI describes outcomes, paces scenes, and interacts with the player.

- REQ-PLG-16: The philosophy section SHOULD distinguish this system's narrative approach from generic fantasy RPG narration. What makes a Daggerheart session feel different from a d20 session? That distinction belongs here.

#### 5. Key Vocabulary

A definition list of system-specific terms the AI should use consistently. This prevents the AI from defaulting to D&D terminology when running a different system.

- REQ-PLG-17: Every mechanical term that differs from common RPG vocabulary MUST appear in this list. If Daggerheart calls it "Evasion" instead of "Armor Class," that mapping belongs here.

- REQ-PLG-18: The bootstrap SHOULD instruct the AI to "use these terms exclusively" or "use these terms naturally" depending on how strict the system's vocabulary is.

#### 6. Onboarding

Step-by-step character creation flow and world setup guidance. This section activates when the AI detects no character sheet or world document.

- REQ-PLG-19: Character creation steps MUST be ordered and numbered. The AI follows them sequentially when guiding a new player.

- REQ-PLG-20: The onboarding section MUST include a brief instruction for what to do when no world document exists. Both existing plugins open with "a moment of tension or discovery" or "a specific place with sensory detail and an immediate hook."

- REQ-PLG-21: The final line of the onboarding section SHOULD direct the AI to use the plugin's skills by prefix. Example: "Use the dh-* skills for rules lookup, combat management, domain cards, adversary stat blocks, campaign framing, and character advancement procedures."

### Constraints

- REQ-PLG-22: The bootstrap MUST NOT exceed approximately 3000 words. It is injected into every message's system prompt, so length directly impacts context budget. Both existing bootstraps are under 1000 words. Lean toward concise.

- REQ-PLG-23: The bootstrap MUST NOT duplicate content that belongs in skills. The bootstrap provides foundation knowledge; skills provide deep reference. If the AI needs a stat block template, it should invoke a skill, not find it in the bootstrap.

- REQ-PLG-24: The bootstrap MUST NOT reference specific adventure state (character names, locations, plot). It is system-generic. Adventure-specific context comes from `adventure.md`, `character.md`, and `world.md`.

**Verification**: Read the bootstrap and confirm each section exists. Check word count. Verify dice examples match the tool's actual input schema (defined in `packages/backend/src/services/dice-tool.ts`).

## Skills

Skills are the AI's reference library and procedural guides. Each skill is a directory under `skills/` containing a `SKILL.md` file and an optional `references/` directory.

### SKILL.md Format

```markdown
---
name: <prefix>-<topic>
description: <trigger description for the Claude Agent SDK skill matcher>
version: <semver>
---

# <Skill Title>

[Skill content: procedures, tables, templates, references]
```

#### Frontmatter Fields

- REQ-PLG-25: `name` (string, required). MUST match the skill's directory name. Uses the plugin's prefix (REQ-PLG-2).

- REQ-PLG-26: `description` (string, required). This is the trigger text the Claude Agent SDK uses to decide when to invoke the skill. It MUST be written as "This skill should be used when..." followed by a comprehensive list of trigger conditions. Be specific and exhaustive. The SDK skill matcher depends on this text to route correctly.

  Good: "This skill should be used when the GM needs to handle combat situations, including starting combat, rolling initiative, resolving attack rolls, managing combat encounters, rolling damage, tracking hit points, applying conditions, or running d20-style tactical combat."

  Bad: "Combat skill for d20 games."

- REQ-PLG-27: `version` (string, required). SHOULD follow semantic versioning.

#### Body Content Guidelines

- REQ-PLG-28: Each SKILL.md SHOULD begin with a 1-2 sentence summary of what the skill provides and when to use it.

- REQ-PLG-29: If the skill covers rules that have an authoritative source (SRD, rulebook), the skill SHOULD include an "Authoritative Source" line directing the AI to the rules skill for exact wording. Example: `**Authoritative Source**: For exact rule wording, use the 'dh-rules' skill to reference 'srd/contents/Combat.md'.`

- REQ-PLG-30: Skills SHOULD include concrete dice tool invocation examples where relevant, using the same JSON format as the bootstrap.

- REQ-PLG-31: Skills SHOULD reference their own `references/` files by relative path (e.g., `references/encounter-template.md`) rather than embedding large templates inline.

### References Directory

Each skill may have a `references/` subdirectory containing supporting material:

- Templates (character sheets, encounter trackers, stat block formats)
- Examples (completed character sheets, sample stat blocks)
- Rule text (SRD content, either as files or symlinks to `docs/research/`)
- License files

- REQ-PLG-32: Reference files MUST be markdown. The AI reads them via the Claude Agent SDK's skill file access mechanism.

- REQ-PLG-33: Templates SHOULD use `[placeholder]` syntax for fields the AI fills in, with HTML comments explaining each section. Both existing plugins follow this convention.

- REQ-PLG-34: When reference material is sourced from a published SRD, it SHOULD be stored as a git submodule under `docs/research/` and symlinked into the skill's `references/srd/` directory. This keeps the SRD content versioned separately from the plugin.

### Required Skills

A system plugin MUST provide skills covering these domains:

- REQ-PLG-35: **Rules lookup** (`<prefix>-rules`). Provides authoritative rule lookups from the system's reference document. MUST include search patterns for the SRD file organization so the AI can find specific rules efficiently. MUST include a License.md file with proper attribution.

- REQ-PLG-36: **Combat management** (`<prefix>-combat`). Procedures for starting and running combat, resolving attacks, tracking damage, applying conditions. MUST include a conditions reference and an encounter tracking template.

- REQ-PLG-37: **Character creation and advancement** (`<prefix>-players`). Step-by-step character creation, level advancement rules, and character sheet template. MUST include `sheet-template.md`, `sheet-example.md`, and `story-template.md` in its references.

- REQ-PLG-38: **Adversary/monster creation** (`<prefix>-adversaries` or `<prefix>-monsters`). Stat block format, creation procedures, and encounter building guidance. MUST include a stat block template and at least one example.

### Optional Skills

Additional skills depend on the system's complexity. Both existing plugins add system-specific skills:

| d20-system | daggerheart-system | Purpose |
|---|---|---|
| d20-magic | dh-domains | Magic/ability system |
| (none) | dh-frame | Campaign framing |

- REQ-PLG-39: A system plugin MAY include additional skills for subsystems that are too complex for a single skill to cover (e.g., spellcasting, domain cards, campaign frames). Each additional skill MUST follow the same SKILL.md format and naming conventions.

### License Attribution

- REQ-PLG-40: The rules skill (`<prefix>-rules`) MUST include a `License.md` file containing the full license text or attribution requirements for the referenced game material.

- REQ-PLG-41: Skills that reference copyrighted material SHOULD include an attribution footer. Example: `*Combat rules derived from the Daggerheart SRD by Darrington Press, used under the DPCGL.*`

## Engine Integration

This section documents how the engine discovers, loads, and uses system plugins. It is informational (not prescriptive) since the engine code is the authority.

### Discovery (`plugin-registry.ts`)

1. `buildPluginRegistry()` reads every subdirectory of `plugins/`
2. For each directory, it looks for `corvran-plugin.json`
3. If found and valid, it creates a `PluginEntry` with the parsed manifest and directory path
4. Entries with `type: "system"` are indexed by alias for per-adventure resolution
5. Entries with `type: "core"` are collected into a list loaded for every adventure

### Per-Adventure Resolution (`adventure-routes.ts:146-192`)

When a player sends a message:

1. The engine reads `adventure.md` from the adventure directory and parses it with `parseAdventureConfig()`
2. If a `system` field is present, it resolves the alias via `pluginRegistry.resolveSystem(alias)`
3. If resolution fails, the request returns HTTP 400 with available systems listed
4. If resolution succeeds, the system plugin's `path` is added to the plugin paths array
5. If the manifest declares a `bootstrap` file, its content is read and passed to `assembleSystemPrompt()`

### Prompt Assembly (`prompt-service.ts:23-121`)

The bootstrap content is injected into the Identity section:

```
# Identity

You are the Game Master for a tabletop RPG adventure.

[bootstrap.md content here]
```

When a bootstrap is present, the generic onboarding section is suppressed (`prompt-service.ts:60`). The bootstrap's own Onboarding section takes over.

### SDK Plugin Loading (`session-runner.ts:90-96`)

Plugin paths are passed to the Claude Agent SDK as local plugins:

```typescript
plugins: params.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
```

The SDK reads `.claude-plugin/plugin.json` from each path and makes the plugin's skills available to the AI. The AI can then invoke skills by name (the SDK handles routing based on the SKILL.md `description` field).

## Patterns Shared Between Existing Plugins

These patterns are not engine requirements but conventions established by both existing plugins. New plugins SHOULD follow them for consistency.

1. **Dice tool examples use labeled groups.** Even when only one die type is rolled, it gets a label describing its purpose (e.g., `"attack"`, `"athletics"`, `"slashing"`).

2. **Skills cross-reference each other.** Combat skills direct the AI to the rules skill for authoritative wording. Player skills reference combat skills for stat calculations. This layering keeps each skill focused.

3. **Templates use HTML comments for guidance.** Character sheet templates embed `<!-- SECTION EXPLANATION -->` comments that explain what each field means and how to calculate it. These comments are deleted when the AI fills in a real character sheet.

4. **Story tracking is separate from character stats.** Both plugins provide `story-template.md` (objectives, arcs, recent events) alongside `sheet-template.md` (mechanical stats). This mirrors the engine's separation of `character.md` (stats) and conversation history (narrative).

5. **Reference material is tiered.** The SKILL.md contains the procedural knowledge (how to create an adversary). The `references/` directory contains the raw data (stat block templates, SRD tables). The skill directs the AI to load references when detail is needed.

6. **File paths in skills use relative references.** Skills reference their own `references/` files with relative paths (e.g., `references/encounter-template.md`). Cross-skill references use relative paths with `../` (e.g., `../dh-rules/references/srd/`).

## Differences Between Existing Plugins

### Valid Variation (system-dependent)

| Aspect | d20-system | daggerheart-system | Why it varies |
|---|---|---|---|
| Skill count | 5 | 6 | Daggerheart has domains and campaign frames as distinct subsystems |
| Adversary skill name | `d20-monsters` | `dh-adversaries` | Different RPG traditions use different terms |
| Rules organization | Single large SRD files | Many small per-entity files | Different SRD source structures |
| License type | CC-BY-4.0 (full text) | DPCGL (attribution notice) | Different publishers, different licenses |
| HP tracking | Numeric pool | Slot-based with thresholds | Fundamental system difference |

### Inconsistencies (should be normalized in future plugins)

| Aspect | d20-system | daggerheart-system | Recommended |
|---|---|---|---|
| Rules License.md | Full CC-BY-4.0 text (396 lines) | Short attribution notice (37 lines) | Follow the source license's requirements. Full text if the license requires it, attribution notice if sufficient. |

## Scope Exclusions

- **Core plugin structure.** The corvran core plugin (`plugins/corvran/`) follows a different pattern (always-loaded, no bootstrap, provides engine-level skills like GM craft). This spec covers system plugins only.
- **Plugin testing.** How to test a plugin before release is not covered. This would require a test harness for skill invocation.
- **Plugin versioning and upgrades.** How to handle breaking changes to a plugin's skills or bootstrap across existing adventures.
- **SRD content authoring.** How to prepare SRD markdown from a published rulebook. This is editorial work, not plugin architecture.

## Success Criteria

### By Inspection

- A new plugin directory matches the layout in the Directory Layout section
- Both manifests (`corvran-plugin.json` and `.claude-plugin/plugin.json`) are valid JSON with all required fields
- The bootstrap contains all six sections (Identity, Core Mechanic, Dice Convention, Narrative Philosophy, Key Vocabulary, Onboarding)
- All required skills exist (`rules`, `combat`, `players`, `adversaries/monsters`)
- Every SKILL.md has valid frontmatter with `name`, `description`, and `version`
- The rules skill has a License.md

### By Demonstration

- The engine starts without errors and `GET /systems` includes the new plugin's alias and description
- Creating an adventure with the new system alias succeeds (`POST /adventures`)
- Sending a message to that adventure loads the bootstrap into the system prompt
- The AI can invoke the plugin's skills during play

### By Test

- `isValidManifest()` accepts the plugin's `corvran-plugin.json`
- `parseAdventureConfig()` correctly extracts the system alias from an adventure using the plugin
- `assembleSystemPrompt()` includes the bootstrap content when the system is active
