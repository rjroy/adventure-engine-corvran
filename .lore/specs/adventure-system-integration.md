---
title: Adventure System Integration
date: 2026-03-29
status: implemented
tags: [plugins, game-systems, bootstrap-prompts, adventure-config, prompt-service, api]
modules: [backend, shared]
related: [.lore/vision.md, .lore/specs/mvp.md, .lore/brainstorm/rpg-system-loading.md]
req-prefix: SYS
---

# Spec: Adventure System Integration

## Overview

The MVP shipped with all plugins loading on every adventure. The AI defaults to D&D regardless of what skills are available because the prompt gives no system-specific direction. A Daggerheart adventure that plays like D&D with different vocabulary is worse than either system played correctly.

This spec makes RPG system selection explicit. Each adventure declares its system in a frontmatter file. The engine loads only that system's plugin (plus corvran, always). A bootstrap prompt establishes the AI's mental model before any skill is invoked. Adventures without a system declaration are freeform: corvran skills only, no specific rules.

The dice roller moves to an engine-provided MCP tool; see Engine Dice Tool spec.

## Entry Points

- An adventure directory gains an optional `adventure.md` file with YAML frontmatter declaring the `system` field
- The daemon scans `plugins/` at startup and builds a plugin registry from `corvran-plugin.json` manifests
- The adventure routes resolve plugin paths per-adventure when starting a session

## Requirements

### Adventure Definition File

- REQ-SYS-1: An adventure directory may contain an `adventure.md` file. The file uses YAML frontmatter to declare configuration. The only mechanical field is `system`. The body of the file (below the frontmatter) is freeform markdown with no engine behavior attached; it exists for the player's own notes (adventure description, session log, campaign goals).

```markdown
---
system: daggerheart
---

# The Siege of Thornwall

A Daggerheart adventure set in the besieged city of Thornwall.
```

- REQ-SYS-2: The `system` field accepts a string that matches any alias declared by an installed system plugin (e.g., `daggerheart`, `d20`). The value is case-sensitive. See REQ-SYS-7 for how aliases are declared.

- REQ-SYS-3: If `adventure.md` does not exist, the adventure is freeform. The engine loads only the core plugin (corvran). No error, no warning. This is a valid play mode: the AI has GM craft and the engine dice tool but no specific rules system. Freeform is the default, not a fallback.

- REQ-SYS-4: If `adventure.md` exists and declares a `system` value that does not match any installed plugin alias, the engine returns a clear error when the adventure is accessed for play. The `POST /adventures/:id/message` endpoint returns HTTP 400 with the message: `Adventure '<id>' declares system '<value>' but no matching plugin is installed. Available systems: <comma-separated alias list>.` The adventure still appears in the list endpoint (it exists on disk), but sending a message to it fails with this error.

- REQ-SYS-4a: If `adventure.md` exists but its YAML frontmatter cannot be parsed (syntax error), treat the adventure as freeform. Log a warning naming the adventure and the parse error. Do not block play over a malformed config file.

- REQ-SYS-5: The file is named `adventure.md` to match the existing convention of `character.md` and `world.md` as the adventure's identity documents. It is configuration, not game state. The AI should not modify it during play. (Write protection for `adventure.md` is not enforced mechanically in this spec; the bootstrap prompt instructs the AI to treat it as read-only. Broader file-access scoping is a separate concern.)

### Plugin Manifest

- REQ-SYS-6: Each plugin declares its identity in a `corvran-plugin.json` file at the plugin root directory. This file is separate from the existing `.claude-plugin/plugin.json` used by the Claude Agent SDK for its own plugin discovery. The two files coexist: `corvran-plugin.json` is read by the engine at startup, `.claude-plugin/plugin.json` is read by the SDK at query time. The engine discovers plugins by scanning `plugins/` for directories containing a `corvran-plugin.json` manifest.

- REQ-SYS-7: The manifest schema:

```json
{
  "name": "daggerheart-system",
  "type": "system",
  "aliases": ["daggerheart"],
  "bootstrap": "bootstrap.md"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Plugin identity. Must be unique across all installed plugins. Matches the plugin directory name by convention but is not required to. |
| `type` | `"core"` or `"system"` | yes | `core` plugins always load regardless of adventure system. `system` plugins load only when an adventure declares a matching alias. Two types exist today; the field is a forward seam for future extension. |
| `aliases` | string[] | yes | Names that the `system` field in `adventure.md` can use to select this plugin. A system plugin should include at least one short, human-friendly alias (e.g., `daggerheart` rather than `daggerheart-system`). The full `name` is not automatically an alias; include it in this array if it should be matchable. For core plugins, `aliases` is present for consistency but unused for system selection (core plugins load unconditionally). |
| `bootstrap` | string | no | Path to the bootstrap prompt file, relative to the plugin root. Only meaningful for `system` plugins. Omit for core plugins. |

- REQ-SYS-8: Duplicate aliases across plugins are a manifest authoring error. If the engine discovers two plugins claiming the same alias during startup, it logs a warning naming both plugins and the conflicting alias. Which plugin wins is unspecified; the operator must resolve the conflict. Tests verify the warning is logged, not which plugin takes precedence.

- REQ-SYS-9: The three initial manifests:

**`plugins/corvran/corvran-plugin.json`**
```json
{
  "name": "corvran",
  "type": "core",
  "aliases": ["corvran"]
}
```

**`plugins/d20-system/corvran-plugin.json`**
```json
{
  "name": "d20-system",
  "type": "system",
  "aliases": ["d20"],
  "bootstrap": "bootstrap.md"
}
```

**`plugins/daggerheart-system/corvran-plugin.json`**
```json
{
  "name": "daggerheart-system",
  "type": "system",
  "aliases": ["daggerheart"],
  "bootstrap": "bootstrap.md"
}
```

### Bootstrap Prompts

- REQ-SYS-10: A system plugin may include a bootstrap prompt file (declared via the `bootstrap` field in its manifest). The bootstrap prompt establishes the AI's mental model for the game system before any skill is invoked. Skills teach the AI how to use mechanics (lookup patterns, resolution procedures). The bootstrap establishes what kind of game this is, what vocabulary to use, what assumptions to carry. Both are needed; they serve different moments in the AI's reasoning.

- REQ-SYS-11: Bootstrap prompts are well-structured markdown. There is no enforced schema. Each system decides what sections it needs. A bootstrap should cover at minimum:

  1. **System identity**: What game the AI is running ("You are running a Daggerheart game")
  2. **Core mechanic summary**: How the system works, on its own terms
  3. **Dice convention**: How rolls work in this system, using the engine's dice tool
  4. **Narrative philosophy**: The system's approach to storytelling and action
  5. **Key vocabulary**: The system's own terminology, used exclusively
  6. **Onboarding guidance**: How to handle character creation and world setup for this system

  The engine reads the file verbatim and inserts it into the system prompt. No templating, no variable substitution.

- REQ-SYS-12: Bootstrap prompts must be self-contained. The anti-pattern is comparative framing: defining a system by what it isn't. "Spotlight flows from action outcomes" is correct. "No initiative rolls" or "Unlike D&D, there is no AC" is comparative poisoning that anchors the AI's reasoning on D&D as the baseline.

  **Rule**: A bootstrap prompt must not reference any other game system by name. Each system stands on its own terms.

- REQ-SYS-13: Bootstrap prompts should not contradict skill files. If they do, skills carry more authority because they are invoked reference material closer to the resolution moment. The bootstrap is framing (mental model, vocabulary, philosophy). Skills are reference material (rules, stat blocks, procedures). This is a prompt authoring guideline, not an engine-enforced constraint. The engine injects both into the prompt; the AI resolves any apparent conflict based on position and specificity.

- REQ-SYS-14: The bootstrap prompt should include onboarding guidance as a section. When a player starts a new adventure with a declared system but no character or world files, the AI needs system-specific direction for character creation. "Guide them through Daggerheart character creation: ancestry, community, class, subclass, Experiences" is useful. "Ask what kind of adventure they want to play" is too generic when the system is already declared. The bootstrap is the single file per system, one place to maintain.

### Plugin Resolution

- REQ-SYS-15: At startup, the engine scans the `plugins/` directory (repo-relative, same as the current hardcoded paths). For each subdirectory containing a `corvran-plugin.json` file, the engine reads the manifest and registers the plugin. The result is a plugin registry: a map of alias to plugin metadata (path, type, manifest contents).

- REQ-SYS-16: `resolveConfig()` in `app.ts` stops hardcoding plugin paths. `AppConfig` replaces `pluginPaths: string[]` with `pluginsDir: string` (the repo-relative `plugins/` path). At startup, `createApp()` builds a plugin registry by scanning `pluginsDir` for manifests. The registry is passed to the adventure routes as a dependency, following the existing DI factory pattern (`createAdventureRoutes(deps)`).

- REQ-SYS-17: Core plugins (type `"core"`) always load, regardless of adventure system. Currently corvran is the only core plugin. When an adventure declares a system, the engine loads all core plugins plus the matching system plugin.

- REQ-SYS-18: The session runner receives plugin paths per-query, not at construction time. `RunQueryParams` gains a `pluginPaths` field. The session runner no longer stores plugin paths in its config.

```typescript
// Before (session-runner.ts)
export interface SessionRunnerConfig {
  pluginPaths: string[];
  model: string;
}

// After
export interface SessionRunnerConfig {
  model: string;
}

export interface RunQueryParams {
  systemPrompt: string;
  playerMessage: string;
  adventurePath: string;
  pluginPaths: string[];
  abortController: AbortController;
}
```

- REQ-SYS-19: The `POST /adventures/:id/message` handler resolves plugin paths before calling `runQuery`. The resolution flow:
  1. Read `adventure.md` from the adventure directory (if it exists)
  2. Parse YAML frontmatter to extract the `system` field
  3. Look up the system alias in the plugin registry
  4. If the alias is not found, return HTTP 400 with the error from REQ-SYS-4
  5. Collect paths: all core plugin paths + the matched system plugin path (if any)
  6. If the matched system plugin has a `bootstrap` field, read the bootstrap file content from disk
  7. Pass the collected `pluginPaths` to `runQuery` and the bootstrap content as `systemBootstrap` to `assembleSystemPrompt`

- REQ-SYS-20: Plugin paths are fixed by project structure. Plugins live in `plugins/` in the repo. The daemon runs from the repo root. No environment variable or configurable path is needed for the plugin directory. Tests pass plugin paths explicitly through DI.

### Prompt Service

- REQ-SYS-21: `AdventureState` gains a `systemBootstrap` field:

```typescript
export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
  systemBootstrap: string | null;
}
```

- REQ-SYS-22: The system prompt assembly order becomes:

  1. **Identity**: "You are the Game Master for a tabletop RPG adventure." followed by the system bootstrap prompt (if present), separated by a blank line. The bootstrap appears inside the Identity section, not as a separate top-level section.
  2. **Principles**: Player agency (unchanged from MVP).
  3. **Adventure state**: Character + world content (unchanged from MVP).
  4. **Onboarding** (conditional): When character or world is missing. When `systemBootstrap` is present, skip the generic onboarding section entirely. The bootstrap contains system-specific onboarding guidance (per REQ-SYS-14), so the generic "ask what kind of adventure they want to play" text would conflict with it. When `systemBootstrap` is null (freeform), the existing generic onboarding text from the MVP applies unchanged.
  5. **Conversation history**: Full `history.md` content (unchanged from MVP).
  6. **Instructions**: Response instructions (unchanged from MVP, except the dice roller skill reference in the Instructions text will be updated to reference the engine dice tool; see Engine Dice Tool spec for the replacement wording). If that spec is not yet implemented when this work begins, keep the existing Instructions text and note the dependency.

- REQ-SYS-23: The adventure routes read the bootstrap file from disk and pass its content as `systemBootstrap` when assembling the prompt. The prompt service remains a pure function. It does not read files or resolve plugins.

### API Changes

- REQ-SYS-24: `AdventureListItemSchema` gains a `system` field:

```typescript
export const AdventureListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  hasCharacter: z.boolean(),
  hasWorld: z.boolean(),
  hasHistory: z.boolean(),
  system: z.string().nullable(),
});
```

`system` is `null` for freeform adventures (no `adventure.md` or no `system` field in frontmatter). Otherwise it contains the raw `system` value from the frontmatter.

- REQ-SYS-25: `AdventureDetailSchema` also gains `system: z.string().nullable()` with the same semantics.

- REQ-SYS-26: Both `GET /adventures` and `GET /adventures/:id` return the `system` field. The adventure service reads `adventure.md` during listing and detail operations. This enables the web client to display system information (e.g., a "Daggerheart" badge on the adventure card) without a separate call.

### Backward Compatibility

- REQ-SYS-27: Adventures without `adventure.md` continue to work without error or warning. They are freeform. This is the design intent, not a fallback.

- REQ-SYS-28: **Behavioral change**: Adventures that previously had implicit access to all system skills (d20 and daggerheart) will lose that access. Under the MVP, every adventure loaded every plugin. After this change, only adventures that declare a system load that system's plugin. An existing adventure that relied on d20 skills without an `adventure.md` declaring `system: d20` will find those skills unavailable.

  This is the correct behavior. The MVP's global loading was a temporary shortcut, not a feature. The brainstorm documents this explicitly: "RPG system selection is a real config question, just deferred." The fix is to add `adventure.md` with the appropriate `system` value to existing adventures.

  No automated migration is provided. The MVP has not been widely deployed. Documenting the change in release notes is sufficient.

## Testing

- REQ-SYS-29: The following areas require automated tests:

**Manifest parsing and registry:**
- Parse a valid `corvran-plugin.json` and extract all fields
- Reject manifests with missing required fields (`name`, `type`, `aliases`)
- Build a registry from multiple plugin directories
- Detect and warn on duplicate aliases across plugins

**Alias resolution:**
- Resolve `daggerheart` to the daggerheart-system plugin path
- Resolve `d20` to the d20-system plugin path
- Return an error for an unrecognized alias with the list of available systems

**Plugin path resolution per-adventure:**
- Adventure with `system: daggerheart` resolves to corvran + daggerheart-system paths
- Adventure with `system: d20` resolves to corvran + d20-system paths
- Adventure with no `adventure.md` resolves to corvran only
- Adventure with unknown system value produces the expected error message

**Prompt assembly:**
- System prompt with bootstrap includes the bootstrap content in the Identity section
- System prompt without bootstrap matches the existing MVP format
- Onboarding section is present when character/world is missing and no bootstrap (freeform)
- Onboarding section is absent when character/world is missing but bootstrap is present (system-specific onboarding lives in the bootstrap)

**API response shape:**
- `GET /adventures` returns `system` field (null for freeform, string for declared)
- `GET /adventures/:id` returns `system` field
- `POST /adventures/:id/message` returns the appropriate error for an unknown system

**`adventure.md` parsing:**
- Extract `system` from valid YAML frontmatter
- Handle missing frontmatter (treat as freeform)
- Handle frontmatter without `system` field (treat as freeform)
- Handle empty file (treat as freeform)
- Handle malformed YAML (treat as freeform, verify warning is logged)

## Constraints

- **No engine code changes for new systems.** Adding a game system means adding a plugin directory with a manifest, skills, and an optional bootstrap. The engine discovers it automatically.
- **One system per adventure.** The `system` field is a single string, not an array. Multi-system adventures are not supported.
- **System is immutable after creation.** This spec does not provide a mechanism for changing an adventure's system. Changing systems mid-campaign would require converting character sheets, recalculating mechanics, and translating vocabulary. That is starting a new adventure, not changing a setting.
- **No adventure creation UI.** System selection during adventure creation is deferred. Players write `adventure.md` by hand, the same as `character.md` and `world.md`.

## Deferred (Not in Scope)

- Adventure creation UI with system selection step
- Conversational system selection (AI describes options, player picks, AI writes `adventure.md`)
- Write protection for `adventure.md` (preventing AI from modifying config during play)
- Remote or versioned plugins
- Multi-system adventures
- Plugin compatibility validation beyond alias matching

## Context

- `.lore/vision.md`: Design principles. Principle 2 (Teach, Don't Code) and Principle 5 (System-Agnostic Core) are directly served by this spec.
- `.lore/specs/mvp.md`: The baseline. REQ-MVP-11 hardcodes plugin paths; this spec replaces that with per-adventure resolution. REQ-MVP-12 defines prompt assembly; this spec extends it with the bootstrap section. REQ-MVP-25 documents the three hardcoded plugins; this spec replaces that with manifest-based discovery. REQ-MVP-4 says "no manifest file"; this spec adds `adventure.md` as the adventure's configuration file.
- `.lore/brainstorm/rpg-system-loading.md`: All decisions in this spec trace to that brainstorm. Sections 1-7 cover system selection, corvran as core, bootstrap prompts, adventure format, creation flow, plugin loading, and prompt service changes.
