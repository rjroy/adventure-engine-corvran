---
title: Adventure Creation Flow
date: 2026-03-30
status: implemented
tags: [ux, adventure-creation, lobby, onboarding, plugin-manifest, api]
modules: [web, backend, shared]
related: [.lore/specs/adventure-system-integration.md, .lore/brainstorm/adventure-creation-flow.md, .lore/vision.md]
req-prefix: ACF
supersedes: []
---

# Spec: Adventure Creation Flow

## Overview

Today, creating an adventure means `mkdir ~/.corvran/adventures/my-adventure` and optionally hand-writing an `adventure.md`. The adventure system integration spec explicitly deferred this: "No adventure creation UI. System selection during adventure creation is deferred."

This spec adds two things: a creation wizard that replaces the manual directory setup, and a lobby screen that replaces the current auto-redirect behavior. Together, they turn "create a directory and write a file" into "click New Adventure, fill in three fields, start playing."

The approach is the middle path from the brainstorm: a short, structured pre-flight (system, concept, name) followed by immediate play with an informed GM. Not a full session-zero conversation (too much friction), not a bare system picker (too little context for the GM). The concept field is the key: a single free-text input that seeds the GM's opening without forcing the player through an interview.

## Entry Points

- The web client's root page (`/`) becomes the lobby, always shown, no auto-redirect
- A "New Adventure" action on the lobby opens the creation wizard
- The creation wizard calls `POST /adventures` to create the adventure, then navigates to the adventure chat
- A new `GET /systems` endpoint provides the system picker's options
- Plugin manifests gain a `description` field and simplify `aliases` to `alias`

## Requirements

### Plugin Manifest Changes

- REQ-ACF-1: The plugin manifest schema changes. `aliases` (string array) becomes `alias` (string). Every existing manifest uses a single-element array; the plural form was premature generalization. The `alias` field serves the same purpose: it's the name the `system` field in `adventure.md` uses to select this plugin.

  Updated manifest interface:

  ```typescript
  interface PluginManifest {
    name: string;
    type: "core" | "system";
    alias: string;
    description?: string;
    bootstrap?: string;
  }
  ```

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `name` | string | yes | Plugin identity. Must be unique. |
  | `type` | `"core"` \| `"system"` | yes | Core plugins always load. System plugins load per-adventure. |
  | `alias` | string | yes | The name `adventure.md` uses to select this plugin. One alias per plugin. For core plugins, present for consistency but unused for system selection. |
  | `description` | string | no | Human-readable one-sentence description. Required for system plugins (the system picker displays it). Optional for core plugins. |
  | `bootstrap` | string | no | Path to bootstrap prompt, relative to plugin root. Only meaningful for system plugins. |

- REQ-ACF-2: The three manifests update to the new schema:

  **`plugins/corvran/corvran-plugin.json`**
  ```json
  {
    "name": "corvran",
    "type": "core",
    "alias": "corvran"
  }
  ```

  **`plugins/d20-system/corvran-plugin.json`**
  ```json
  {
    "name": "d20-system",
    "type": "system",
    "alias": "d20",
    "description": "Classic d20 fantasy with classes, levels, and ability scores",
    "bootstrap": "bootstrap.md"
  }
  ```

  **`plugins/daggerheart-system/corvran-plugin.json`**
  ```json
  {
    "name": "daggerheart-system",
    "type": "system",
    "alias": "daggerheart",
    "description": "A fantasy RPG where hope and fear drive the story",
    "bootstrap": "bootstrap.md"
  }
  ```

- REQ-ACF-3: The plugin registry updates to read `alias` (string) instead of `aliases` (string[]). The `aliasMap` construction changes from iterating an array to inserting a single entry. The duplicate-alias detection logic (REQ-SYS-8) applies to the single `alias` value per plugin.

- REQ-ACF-4: The plugin registry gains a method that returns system information for the picker:

  ```typescript
  interface SystemInfo {
    alias: string;
    description: string;
  }

  availableSystems(): SystemInfo[]
  ```

  Returns all `type === "system"` plugins with their `alias` and `description`. The existing `availableAliases()` method (returns `string[]`) is replaced by this. Existing call sites that used `availableAliases()` (e.g., the error message in `POST /adventures/:id/message`) must be updated to use `availableSystems().map(s => s.alias)` or equivalent. If a system plugin has no `description`, it is excluded from the list and a warning is logged. A system plugin without a description is a manifest authoring error.

### Systems Endpoint

- REQ-ACF-5: A new `GET /systems` endpoint returns the available RPG systems. Response shape:

  ```typescript
  const SystemInfoSchema = z.object({
    alias: z.string(),
    description: z.string(),
  });

  // GET /systems response
  const SystemsResponseSchema = z.object({
    systems: z.array(SystemInfoSchema),
  });
  ```

  This endpoint reads from the plugin registry (already built at startup). It does not scan the filesystem per-request. The response is the same for every caller. The order is unspecified.

- REQ-ACF-6: The systems endpoint lives in a new `system-routes.ts` file, following the existing route/service split pattern. It receives the plugin registry as a dependency via DI.

### Adventure Definition File Changes

- REQ-ACF-7: `adventure.md` frontmatter gains a `name` field:

  ```markdown
  ---
  name: The Healer's Burden
  system: daggerheart
  ---

  A former healer carrying guilt, seeking purpose in a coastal city where magic is common but distrusted.
  ```

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `name` | string | no | Player-chosen display name. Falls back to directory name if absent. |
  | `system` | string | no | RPG system alias. Unchanged from adventure-system-integration spec. |

  The body text below the frontmatter is the adventure concept. Free-form markdown. Can be empty. The engine reads it but attaches no mechanical behavior to it. It serves two purposes: the lobby displays it as a subtitle, and the GM reads it as a creative seed when the adventure starts.

- REQ-ACF-8: `parseAdventureConfig()` in `adventure-config.ts` expands to extract `name` and the body text:

  ```typescript
  export interface AdventureConfig {
    system: string | null;
    name: string | null;
    concept: string | null;
    warning?: string;
  }
  ```

  `name` is extracted from frontmatter. `concept` is the trimmed body text after the closing `---` delimiter. Both are `null` when absent or empty. The existing regex-based parser extends with a `name` pattern matching the `system` pattern. The body extraction splits on the closing delimiter and trims.

### Adventure Creation Endpoint

- REQ-ACF-9: A new `POST /adventures` endpoint creates an adventure. Request schema:

  ```typescript
  const CreateAdventureRequestSchema = z.object({
    name: z.string().min(1).max(100),
    system: z.string().nullable(),
    concept: z.string().max(1000).nullable(),
  });
  ```

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `name` | string | yes | Player-chosen display name. Min 1 character, max 100. |
  | `system` | string \| null | yes | System alias, or null for freeform. |
  | `concept` | string \| null | yes | Adventure concept text, or null if the player skipped it. |

- REQ-ACF-10: The endpoint validates the request:
  1. If `system` is non-null, verify it exists in the plugin registry. If not, return HTTP 400: `System '<value>' is not installed. Available systems: <comma-separated alias list>.`
  2. Verify the slugified directory name doesn't already exist. If it does, return HTTP 409: `An adventure with this name already exists.`

- REQ-ACF-11: The endpoint creates the adventure:
  1. Slugify the name: lowercase, replace spaces with hyphens, strip characters that aren't alphanumeric, hyphens, or underscores, collapse consecutive hyphens. If the slug is empty after stripping, use `adventure` as the fallback.
  2. Create the directory at `{adventuresPath}/{slug}`.
  3. Write `adventure.md`. When `system` is null, omit the `system:` key from frontmatter entirely (do not write `system: null` or `system:`). When `concept` is null, the file ends after the closing `---` with no body text. Examples:

     Full (system + concept):
     ```markdown
     ---
     name: The Healer's Burden
     system: daggerheart
     ---

     A former healer carrying guilt in a coastal city.
     ```

     Freeform with concept:
     ```markdown
     ---
     name: Weird Dreams
     ---

     Something surreal and unsettling.
     ```

     Freeform, no concept:
     ```markdown
     ---
     name: Untitled Adventure
     ---
     ```

  4. Return HTTP 201 with the created adventure's list representation. For a freshly created adventure: `characterName` is null (no character file exists), `lastPlayed` is null (no history exists), `hasHistory` is false, `concept` is the submitted concept text.

  Response schema:

  ```typescript
  const CreateAdventureResponseSchema = z.object({
    adventure: AdventureListItemSchema,
  });
  ```

- REQ-ACF-12: The slugification is a pure function, tested independently. Examples:

  | Input | Output |
  |-------|--------|
  | `"The Healer's Burden"` | `the-healers-burden` |
  | `"My First Adventure"` | `my-first-adventure` |
  | `"  Spaces  Everywhere  "` | `spaces-everywhere` |
  | `"!!!???"` | `adventure` (fallback) |
  | `"Daggerheart: Rise of Flame"` | `daggerheart-rise-of-flame` |

- REQ-ACF-13: The creation endpoint lives in the existing `adventure-routes.ts`, alongside the other adventure endpoints. It receives the plugin registry and file ops as dependencies via DI.

### Adventure List Schema Changes

- REQ-ACF-14: `AdventureListItemSchema` expands:

  ```typescript
  export const AdventureListItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    system: z.string().nullable(),
    concept: z.string().nullable(),
    characterName: z.string().nullable(),
    hasHistory: z.boolean(),
    lastPlayed: z.string().nullable(),
  });
  ```

  Changes from the current schema:
  - `name` becomes the player-chosen display name from frontmatter, falling back to the directory name (backward compatible).
  - `concept` is new: the body text from `adventure.md`, or null. Displayed as a subtitle in the lobby.
  - `characterName` is new: extracted from `character.md` if it exists. See REQ-ACF-15 for extraction rules.
  - `lastPlayed` is new: ISO 8601 timestamp of `history.md`'s last modification time, or null if no history exists.
  - `hasCharacter` and `hasWorld` are removed from the list schema. These were developer diagnostics. The lobby doesn't need them. The `hasHistory` boolean stays because it drives the "New" vs "In Progress" state indicator. Note: `AdventureDetailSchema` retains the full `character` and `world` content fields, which the chat view uses. Only the boolean summary flags on the list schema are removed.

- REQ-ACF-15: `characterName` extraction. When `character.md` exists, the adventure service reads the first line looking for a markdown heading. If the first non-empty line matches `# <name>` (a level-1 heading), the heading text is the character name. Otherwise, `characterName` is null.

  This is deliberately simple. The character file has no enforced schema, so any extraction heuristic is a best-effort convenience. A level-1 heading is the natural convention ("# Sera, the Wandering Healer") and the brainstorm identifies this as the strongest single signal for distinguishing adventures.

- REQ-ACF-16: `lastPlayed` is the modification timestamp of `history.md`. The adventure service stats the file and returns the `mtime` as an ISO 8601 string. If `history.md` doesn't exist, `lastPlayed` is null.

  This uses the filesystem as the source of truth. No separate timestamp tracking. Every message appends to `history.md`, so its mtime is always the last interaction time. The `FileOps` interface currently has no `stat` method. It needs one: `stat(path: string): Promise<{ mtime: Date } | null>` (returns null if the file doesn't exist). This keeps file access behind the DI abstraction for test isolation.

- REQ-ACF-17: `AdventureDetailSchema` gains `concept: z.string().nullable()` to match. The detail endpoint already reads `adventure.md`; it now also returns the body text.

### The Lobby

- REQ-ACF-18: The web client's root page (`/`) is the lobby. It always renders, even with one adventure. The single-adventure auto-redirect (currently at `page.tsx:23-26`) is removed.

  The lobby shows:
  - A list of adventure cards, sorted by recency (most recently played first, then newest created)
  - A "New Adventure" button that opens the creation wizard
  - Adventures with no history ("New") sort above adventures with history, then by creation order (directory name, alphabetical)

  Sorting is the web client's responsibility. The `GET /adventures` endpoint returns adventures in unspecified order. The client sorts: new adventures first (no `lastPlayed`), then by `lastPlayed` descending. Within the "new" group, sort alphabetically by display `name`.

- REQ-ACF-19: Each adventure card shows:
  - **Name**: The adventure name (from `name` field, or directory name as fallback)
  - **System badge**: The system alias if present (e.g., "[Daggerheart]"), omitted for freeform
  - **Concept snippet**: The first ~100 characters of the concept text, or omitted if no concept
  - **Character name**: If available, displayed as "Playing as {characterName}"
  - **State indicator**: "New adventure" if no history, "Continue" if history exists
  - **Last played**: Relative timestamp ("3 days ago", "2 hours ago") if history exists

  The card is clickable and navigates to `/adventure/{id}`.

- REQ-ACF-20: The empty state (no adventures exist) replaces the current `mkdir` instruction with the "New Adventure" button. The message changes from technical instructions to an invitation: "No adventures yet. Start one." The creation wizard handles everything.

### The Creation Wizard

- REQ-ACF-21: The creation wizard is a modal or page with three fields, presented as a single form (not a multi-step wizard). All fields visible at once. The form is short enough that steps would add friction without adding clarity.

  **System picker**: A set of selectable options, one per system, plus a "Freeform" option. Each option shows the system's `alias` as the label and `description` as subtext. "Freeform" is preselected. The options are fetched from `GET /systems` when the wizard opens.

  **Concept field**: A textarea. Label: "What's your adventure about?" Placeholder: "A sentence or two about your character, the world, or both. Leave blank to discover as you play." Optional. Max 1000 characters.

  **Name field**: A text input. Label: "Adventure name." When the concept field has text, auto-suggest a name derived from the first few words (simple: take the first 4-5 words and title-case them). The suggestion is editable. If concept is blank, default to "Untitled Adventure." The name field is required.

  **Start button**: "Begin Adventure." Calls `POST /adventures` with the form data, then navigates to `/adventure/{id}` on success.

- REQ-ACF-22: The wizard validates before submission:
  - Name must not be empty (client-side, immediate feedback)
  - System must be valid (server validates, but the picker only shows installed systems so this is a safety net)
  - On server error (409 duplicate name), display the error inline

- REQ-ACF-23: The auto-suggest for the adventure name is a convenience, not a requirement for the MVP implementation. If it adds complexity, ship without it and use "Untitled Adventure" as the default. The name field is always editable regardless.

### GM Behavior at Adventure Start

- REQ-ACF-24: When the GM opens a new adventure (no `history.md`), it reads `adventure.md` for the concept text. The concept text is already available through the prompt service: the adventure routes read `adventure.md` during message handling, and the content is part of the adventure state.

  The GM's behavior depends on what it finds:

  | System | Concept | GM's opening |
  |--------|---------|-------------|
  | Declared | Present | Uses the system's onboarding guidance (from bootstrap), incorporating the concept as a creative seed. "You mentioned a former healer. Let's build on that." |
  | Declared | Absent | Uses the system's onboarding guidance from scratch. "Let's start by creating your character." |
  | Freeform | Present | Uses the generic onboarding, incorporating the concept. "You described a dying world. Tell me more about who you are in it." |
  | Freeform | Absent | Uses the generic onboarding. "What kind of adventure are you looking for?" |

  This behavior requires no changes to the GM's logic beyond REQ-ACF-25 (adding the concept to the prompt). The existing prompt assembly (REQ-SYS-22) already handles system vs. freeform onboarding. Once the concept text is in the prompt, the GM naturally incorporates it.

- REQ-ACF-25: The concept text should be part of the adventure state passed to `assembleSystemPrompt()`. Currently, the prompt service reads `character.md` and `world.md` content but does not read `adventure.md` body text into the prompt. The adventure routes should pass the concept text as a new field on `AdventureState`:

  ```typescript
  export interface AdventureState {
    character: string | null;
    world: string | null;
    history: string | null;
    systemBootstrap: string | null;
    concept: string | null;
  }
  ```

  The prompt service includes the concept in the Adventure State section when present. Position it before character and world content, as it's the broadest context. The format:

  ```
  ## Adventure Concept
  {concept text}
  ```

  When concept is null, this section is omitted. When character or world content exists alongside a concept, the concept is supplementary context (the player's original vision), not a replacement for the current state.

### Backward Compatibility

- REQ-ACF-26: Adventures created before this spec (no `name` in frontmatter, no concept text) continue to work without changes. The lobby displays the directory name as the adventure name. The concept snippet is omitted. The character name shows if a `character.md` with a heading exists.

- REQ-ACF-27: The `aliases` to `alias` manifest change is breaking. All three manifests must be updated simultaneously with the registry code. No migration path is needed because manifests are committed to the repo, not user-editable files. This is a code change, not a data migration.

- REQ-ACF-28: The `AdventureListItemSchema` changes (removing `hasCharacter`, `hasWorld`, adding new fields) are breaking for any web client code that references the removed fields. The web client is the only consumer. The lobby redesign replaces the `AdventureCard` component, so the old fields have no remaining consumers after the lobby is updated. Ship the schema change and lobby update together.

## Testing

- REQ-ACF-29: The following areas require automated tests:

**Manifest parsing (updated):**
- Parse manifest with `alias` (string) instead of `aliases` (array)
- Reject manifest with missing `alias`
- Build registry with `availableSystems()` returning `{ alias, description }[]`
- Exclude system plugins missing `description` from `availableSystems()` with a warning

**Adventure config parsing (expanded):**
- Extract `name` from frontmatter
- Extract concept from body text
- Handle missing name (returns null)
- Handle missing concept / empty body (returns null)
- Handle both name and system together
- Handle file with only body text, no frontmatter (treat as freeform, body is concept)

**Slugification:**
- Verify all examples from REQ-ACF-12
- Verify empty-after-stripping fallback to "adventure"
- Verify leading/trailing hyphens are trimmed

**Adventure creation endpoint:**
- Create adventure with system, concept, and name: directory created, adventure.md written correctly
- Create adventure with null system (freeform): adventure.md omits system field
- Create adventure with null concept: adventure.md has frontmatter but no body
- Create adventure with invalid system: returns 400 with available systems list
- Create adventure with duplicate slug: returns 409
- Verify response includes the created adventure in list format

**Adventure list (expanded):**
- List returns `name` from frontmatter when present, directory name when absent
- List returns `concept` from body text
- List returns `characterName` from character.md heading
- List returns `lastPlayed` as ISO timestamp from history.md mtime
- List omits `hasCharacter` and `hasWorld` (verify schema change)

**Systems endpoint:**
- Returns all system plugins with alias and description
- Excludes core plugins
- Returns empty array when no system plugins are installed

**Prompt assembly with concept:**
- Concept present: system prompt includes `## Adventure Concept` section before character/world content
- Concept null: `## Adventure Concept` section is omitted
- Concept present alongside character and world: all three sections appear in order (concept, character, world)

**Character name extraction:**
- Extracts name from `# Name` heading
- Returns null when character.md has no level-1 heading
- Returns null when character.md doesn't exist
- Handles heading with trailing content: `# Sera, the Wanderer` returns full heading text

## Constraints

- **No deletion UI.** Deleting adventures is destructive and irreversible. Players who need to delete can remove directories manually. A deletion feature is a separate concern with confirmation and safety requirements.
- **No adventure editing UI.** Renaming, changing system, or editing concept after creation are not in scope. The player can edit `adventure.md` directly. A future editing feature would need to handle slug stability (the directory name doesn't change if you rename the adventure).
- **One system per adventure, immutable.** Unchanged from the adventure system integration spec.
- **No full session-zero conversation.** The brainstorm explores this as Option A and recommends deferring it. The concept field captures the highest-value parts of session zero (character direction, world direction, tone) without the friction of a conversational agent. A "talk through your concept" feature is additive and can be built later without structural changes.

## Deferred (Not in Scope)

- Session-zero conversation agent (Option A from brainstorm)
- Adventure deletion UI
- Adventure editing (rename, change system, edit concept)
- Adventure cover images or visual customization
- Adventure import/export
- Multi-player adventure creation
- Adventure templates ("start from a preset concept")

## Spec Corrections

- REQ-SYS-5 in the adventure system integration spec originally stated "adventure.md is read-only for AI." That was corrected during implementation to match the project vision: all adventure files are fully read/write for both AI and player. This spec assumes the corrected behavior. No further changes needed.
- REQ-SYS-7 defines `aliases` as `string[]`. This spec supersedes that with `alias` as `string` (REQ-ACF-1). The adventure system integration spec should be updated to reflect this after this spec is approved.

## Context

- `.lore/brainstorm/adventure-creation-flow.md`: All design decisions trace to this brainstorm. The middle path (Option C), lobby design, concept field rationale, and implementation flags are sourced from there.
- `.lore/specs/adventure-system-integration.md`: The existing system integration spec. This spec builds on it (adding creation, expanding the list schema) and supersedes specific requirements (manifest schema).
- `.lore/research/llm-optimized-rpg-systems.md`: Ironsworn's session-zero pattern (pick truths, swear a vow) validates the concept-field approach. The research confirms that the GM behavior at adventure start maps to established RPG patterns.
- `.lore/vision.md`: Principle 1 (Markdown is Memory) is served by storing concept in adventure.md. Principle 5 (System-Agnostic Core) is served by keeping the creation flow identical regardless of system.
- `.lore/reference/architecture-pattern.md`: Route/service split with DI factories. The new endpoints follow this pattern.
