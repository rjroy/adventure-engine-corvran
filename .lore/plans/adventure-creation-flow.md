---
title: "Implementation plan: adventure-creation-flow"
date: 2026-03-30
status: approved
tags: [plan, adventure-creation, lobby, onboarding, plugin-manifest, api, ux]
modules: [backend, shared, web]
related: [.lore/specs/adventure-creation-flow.md, .lore/plans/adventure-system-integration.md, .lore/reference/architecture-pattern.md]
---

# Plan: Adventure Creation Flow

Five phases. Phase 1 updates the plugin manifest schema and registry (breaking change, backend-only). Phase 2 expands the adventure config parser and list schema. Phase 3 adds the creation endpoint and systems endpoint. Phase 4 rebuilds the lobby and creation wizard. Phase 5 wires the concept into the GM prompt. Each phase ends in a testable state and gets a Thorne review gate.

## Spec Reference

**Spec**: `.lore/specs/adventure-creation-flow.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-ACF-1 | 1 | `aliases` (array) becomes `alias` (string) in manifest schema |
| REQ-ACF-2 | 1 | Update all three plugin manifests |
| REQ-ACF-3 | 1 | Registry reads `alias` instead of `aliases` |
| REQ-ACF-4 | 1 | `availableSystems()` replaces `availableAliases()` |
| REQ-ACF-5 | 3 | `GET /systems` endpoint |
| REQ-ACF-6 | 3 | System routes in new `system-routes.ts` |
| REQ-ACF-7 | 2 | `name` field in adventure.md frontmatter |
| REQ-ACF-8 | 2 | `parseAdventureConfig()` expands to extract `name` and `concept` |
| REQ-ACF-9 | 3 | `POST /adventures` endpoint |
| REQ-ACF-10 | 3 | Creation endpoint validation |
| REQ-ACF-11 | 3 | Creation endpoint writes adventure.md |
| REQ-ACF-12 | 3 | Slugification as tested pure function |
| REQ-ACF-13 | 3 | Creation endpoint lives in adventure-routes.ts |
| REQ-ACF-14 | 2 | `AdventureListItemSchema` expansion |
| REQ-ACF-15 | 2 | `characterName` extraction from character.md |
| REQ-ACF-16 | 2 | `lastPlayed` from history.md mtime |
| REQ-ACF-17 | 2 | `AdventureDetailSchema` gains `concept` |
| REQ-ACF-18 | 4 | Lobby replaces auto-redirect |
| REQ-ACF-19 | 4 | Adventure card redesign |
| REQ-ACF-20 | 4 | Empty state redesign |
| REQ-ACF-21 | 4 | Creation wizard UI |
| REQ-ACF-22 | 4 | Wizard validation |
| REQ-ACF-23 | 4 | Name auto-suggest (optional) |
| REQ-ACF-24 | 5 | GM behavior at adventure start |
| REQ-ACF-25 | 5 | Concept text in prompt assembly |
| REQ-ACF-26 | 2 | Backward compatibility for old adventures |
| REQ-ACF-27 | 1 | Breaking manifest change, all three updated together |
| REQ-ACF-28 | 2, 4 | Schema changes + lobby update ship together |
| REQ-ACF-29 | 1-5 | Tests distributed across phases |

## Codebase Context

### Current State

**Plugin registry** (`packages/backend/src/services/plugin-registry.ts`): `PluginManifest` has `aliases: string[]`. `PluginRegistry` exposes `availableAliases(): string[]`. The `isValidManifest` function checks for `Array.isArray(obj.aliases)`. The alias map is built by iterating `parsed.aliases`.

**Adventure config** (`packages/backend/src/services/adventure-config.ts`): `AdventureConfig` has `system` and `warning`. No `name` or `concept` fields. Regex extracts only the `system:` line from frontmatter. Body text after the closing `---` is ignored.

**Adventure service** (`packages/backend/src/services/adventure-service.ts`): Read-only. `listAdventures()` returns `AdventureListItem[]` with `id`, `name` (always directory name), `hasCharacter`, `hasWorld`, `hasHistory`, `system`. No `characterName`, `concept`, or `lastPlayed`. No `createAdventure` capability.

**Shared schemas** (`packages/shared/src/schemas/adventures.ts`): `AdventureListItemSchema` has `id`, `name`, `hasCharacter`, `hasWorld`, `hasHistory`, `system`. No `CreateAdventureRequestSchema`, `SystemInfoSchema`, or `SystemsResponseSchema`.

**Adventure routes** (`packages/backend/src/routes/adventure-routes.ts`): Four routes (list, get, history, message). No creation endpoint. No system routes. The message route calls `pluginRegistry.availableAliases()` for the error message at line 123.

**FileOps** (`packages/backend/src/types.ts`): No `stat` method. No `mkdir` method. Production `createRealFileOps()` in `app.ts` has `writeFile` that calls `mkdir(dirname(path))` internally, but the `FileOps` interface doesn't expose directory creation directly.

**Mock FileOps** (`packages/backend/tests/helpers/mock-file-ops.ts`): No `stat` support. Would need extension for `lastPlayed` testing.

**Web lobby** (`packages/web/app/page.tsx`): Auto-redirects when one adventure exists (lines 23-26). `AdventureCard` references `hasCharacter`, `hasWorld`. `EmptyState` shows `mkdir` CLI hint. No creation wizard or "New Adventure" button.

**Prompt service** (`packages/backend/src/services/prompt-service.ts`): `AdventureState` has `character`, `world`, `history`, `systemBootstrap`. No `concept` field. No `## Adventure Concept` section in prompt assembly.

### Dependencies Between Changes

```
Phase 1 (manifest schema)      Phase 2 (config + list schema)
  manifest files ──────────────► adventure service uses new fields
  registry reads alias           schemas gain concept, characterName, lastPlayed
  availableSystems() replaces    FileOps gains stat
    availableAliases()           config parser extracts name + concept
  route error msg updated

         Phase 3 (creation + systems endpoints)
           POST /adventures
           GET /systems
           slugify utility

                  Phase 4 (web UI)
                    lobby redesign
                    creation wizard
                    empty state

                           Phase 5 (prompt)
                             concept in AdventureState
                             prompt assembly adds concept section
```

## Spec Gaps and Ambiguities

1. **FileOps.stat vs FileOps.mkdir**: REQ-ACF-16 requires `stat(path)` on `FileOps`. The interface currently has no `stat`. Additionally, REQ-ACF-11 creates a directory for the new adventure. Production `writeFile` handles this internally (calls `mkdir` before writing), but the mock `writeFile` doesn't create directory entries. The mock `readDir` infers directories from file paths, so `writeFile("/adventures/foo/adventure.md", ...)` would make `foo` appear in `readDir("/adventures")`. This works for testing creation. `stat` needs to be added for `lastPlayed` support.

2. **`FileOps.stat` mock behavior**: The spec says `stat(path): Promise<{ mtime: Date } | null>`. The mock needs to support this. Since mock files don't have real mtimes, tests will need to set expected mtimes somehow. Options: (a) extend `createMockFileOps` to accept a separate mtime map, (b) add a `setMtime` helper to the mock. The implementer should choose the simplest approach.

3. **Sorting in the web client**: REQ-ACF-18 says "new adventures first, then by lastPlayed descending, within new group sort by name." But REQ-ACF-16 says `lastPlayed` is null when no history exists. A newly created adventure with no history has `lastPlayed: null`. Sorting: null lastPlayed = "new" group, non-null = "in progress" group. This is clear enough but the implementer should verify the sorting logic handles the null/non-null partition.

4. **`hasCharacter` and `hasWorld` removal timing**: REQ-ACF-28 says remove from list schema, ship with lobby update. Phase 2 changes the schema (backend), Phase 4 changes the web client. The web client currently references `hasCharacter` and `hasWorld` in `AdventureCard`. These fields must be removed from the schema in Phase 2, but the web client won't be updated until Phase 4. This means the web client will have a type error between Phase 2 and Phase 4. Two options: (a) keep the old fields in the schema until Phase 4 removes them, (b) accept the type error as a known intermediate state. Recommendation: keep the fields through Phase 2 (mark them deprecated in a comment), remove in Phase 4 when the web client is updated. This keeps each phase independently buildable.

5. **Web proxy for new endpoints**: The catch-all proxy at `packages/web/app/api/daemon/[...path]/route.ts` already forwards all paths to the daemon. `GET /systems` and `POST /adventures` will be proxied automatically. No changes needed to the proxy.

6. **Name auto-suggest**: REQ-ACF-23 explicitly says this is optional for MVP. The plan defers it. Ship with "Untitled Adventure" as the default.

## Implementation Steps

### Phase 1: Plugin Manifest Schema Migration

Updates the manifest schema from `aliases: string[]` to `alias: string`, adds `description` field, migrates all three manifests, and updates the registry. This is a breaking change (REQ-ACF-27) so all files change together. Backend-only, no web changes.

**Read Thorne's review of the previous phase before starting the next phase. Address ALL findings.**

~100 lines changed.

#### Step 1.1: Update Plugin Manifest Files

**Files**: `plugins/corvran/corvran-plugin.json`, `plugins/d20-system/corvran-plugin.json`, `plugins/daggerheart-system/corvran-plugin.json`
**Addresses**: REQ-ACF-1, REQ-ACF-2

Update all three manifests to the new schema:

**`plugins/corvran/corvran-plugin.json`**:
```json
{
  "name": "corvran",
  "type": "core",
  "alias": "corvran"
}
```

**`plugins/d20-system/corvran-plugin.json`**:
```json
{
  "name": "d20-system",
  "type": "system",
  "alias": "d20",
  "description": "Classic d20 fantasy with classes, levels, and ability scores",
  "bootstrap": "bootstrap.md"
}
```

**`plugins/daggerheart-system/corvran-plugin.json`**:
```json
{
  "name": "daggerheart-system",
  "type": "system",
  "alias": "daggerheart",
  "description": "A fantasy RPG where hope and fear drive the story",
  "bootstrap": "bootstrap.md"
}
```

These are the exact values from the spec. `aliases` array removed, `alias` string added, `description` added to system plugins.

#### Step 1.2: Update Plugin Registry

**Files**: `packages/backend/src/services/plugin-registry.ts`
**Addresses**: REQ-ACF-1, REQ-ACF-3, REQ-ACF-4

Changes to make:

1. **`PluginManifest` interface**: Replace `aliases: string[]` with `alias: string`. Add optional `description?: string`.

2. **`isValidManifest`**: Change `Array.isArray(obj.aliases)` check to `typeof obj.alias === "string"`.

3. **Alias map construction** (line 81): Replace the `for (const alias of parsed.aliases)` loop with a single `aliasMap.set(parsed.alias, entry)` call. Keep the duplicate detection: check `aliasMap.get(parsed.alias)` before setting.

4. **`availableAliases()` becomes `availableSystems()`**: New interface:

```typescript
interface SystemInfo {
  alias: string;
  description: string;
}

interface PluginRegistry {
  corePlugins: PluginEntry[];
  resolveSystem(alias: string): PluginEntry | null;
  availableSystems(): SystemInfo[];
}
```

`availableSystems()` iterates the alias map, filters for `type === "system"`, excludes entries without `description` (log warning for those), and returns `{ alias, description }[]`.

5. **Warning for missing description**: When a system plugin has no `description`, `availableSystems()` excludes it and `warn()` logs: `[plugin-registry] System plugin "${name}" has no description, excluded from system picker`.

#### Step 1.3: Update Call Sites

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-ACF-4

The error message at line 123 calls `pluginRegistry.availableAliases().join(", ")`. Update to `pluginRegistry.availableSystems().map(s => s.alias).join(", ")`.

#### Step 1.4: Update Tests

**Files**: `packages/backend/tests/services/plugin-registry.test.ts`
**Addresses**: REQ-ACF-29

Update existing tests to use `alias` (string) instead of `aliases` (array) in all mock manifests. Add new tests:

- `availableSystems()` returns `{ alias, description }[]` for system plugins
- `availableSystems()` excludes core plugins
- `availableSystems()` excludes system plugins without `description` (verify warning logged)
- Duplicate `alias` detection works with string (not array)
- Manifest with missing `alias` field is rejected (was `aliases`)

Verify all existing registry tests still pass after the interface change.

Also update any test in `packages/backend/tests/message-route.test.ts` or `packages/backend/tests/routes.test.ts` that constructs a mock `PluginRegistry` with `availableAliases`. These must switch to `availableSystems`.

#### Step 1.5: Verify Phase 1

```bash
bun test packages/backend/tests/services/plugin-registry.test.ts
bun test packages/backend/tests/  # all tests pass
bun run build  # typecheck passes
```

**Review gate**: Thorne reviews for manifest schema compliance, registry API completeness, call site migration. No web changes to review.

---

### Phase 2: Adventure Config and List Schema Expansion

Expands `parseAdventureConfig()` to extract `name` and `concept`. Adds `characterName`, `lastPlayed`, `concept` to the adventure list and detail schemas. Adds `stat` to `FileOps`. Updates adventure service to populate the new fields. Backend + shared, no web changes yet.

**Read Thorne's review of Phase 1. Address ALL findings before starting.**

~200 lines changed.

#### Step 2.1: Add `stat` to FileOps

**Files**: `packages/backend/src/types.ts`, `packages/backend/src/app.ts`, `packages/backend/tests/helpers/mock-file-ops.ts`
**Addresses**: REQ-ACF-16

Add to the `FileOps` interface:

```typescript
stat(path: string): Promise<{ mtime: Date } | null>;
```

Returns `{ mtime }` if the file exists, `null` if it doesn't.

**Production** (`app.ts` `createRealFileOps`): Implement using `node:fs/promises` `stat`. Catch `ENOENT` and return `null`.

**Mock** (`mock-file-ops.ts`): Add an `mtimes` map alongside the `store`. Add a `setMtime(path, date)` method to `MockFileOps`. `stat()` returns `{ mtime }` from the map if present, falls back to a default `new Date(0)` for files that exist in the store but have no explicit mtime, returns `null` for files not in the store.

#### Step 2.2: Expand Adventure Config Parser

**Files**: `packages/backend/src/services/adventure-config.ts`
**Addresses**: REQ-ACF-7, REQ-ACF-8

Expand the `AdventureConfig` interface:

```typescript
export interface AdventureConfig {
  system: string | null;
  name: string | null;
  concept: string | null;
  warning?: string;
}
```

Changes to `parseAdventureConfig`:

1. Add a regex for `name:` matching the existing `system:` pattern: `/^name:\s*"?([^"\n]*)"?\s*$/m`
2. Extract the body text: after the closing `---` delimiter, everything remaining is the concept. Trim it. If empty after trimming, `concept` is `null`.
3. Handle the edge case from REQ-ACF-29: file with only body text and no frontmatter. Currently returns `{ system: null }`. Now also returns `{ concept: null }` since we can't reliably distinguish body text without delimiters. (The file doesn't start with `---`, so there's no frontmatter to close, so there's no body section either.)

Wait, re-reading the spec: "Handle file with only body text, no frontmatter (treat as freeform, body is concept)." This means if the file doesn't have frontmatter delimiters, the entire content is the concept. Update the early return for non-frontmatter content:

```typescript
if (!content || !content.startsWith("---")) {
  const trimmed = content?.trim() || null;
  return { system: null, name: null, concept: trimmed || null };
}
```

This handles backward compatibility: old adventure.md files without frontmatter get their full content treated as concept text.

#### Step 2.3: Update Shared Schemas

**Files**: `packages/shared/src/schemas/adventures.ts`
**Addresses**: REQ-ACF-14, REQ-ACF-17

Update `AdventureListItemSchema`:

```typescript
export const AdventureListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  system: z.string().nullable(),
  concept: z.string().nullable(),
  characterName: z.string().nullable(),
  hasCharacter: z.boolean(),    // kept until Phase 4 removes web references
  hasWorld: z.boolean(),        // kept until Phase 4 removes web references
  hasHistory: z.boolean(),
  lastPlayed: z.string().nullable(),
});
```

Note: `hasCharacter` and `hasWorld` are kept temporarily. Phase 4 removes them when the web client is updated (see Spec Gap #4).

Update `AdventureDetailSchema`:

```typescript
export const AdventureDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  character: z.string().nullable(),
  world: z.string().nullable(),
  hasHistory: z.boolean(),
  system: z.string().nullable(),
  concept: z.string().nullable(),
});
```

Add new schemas for Phase 3 (define now so shared types are available):

```typescript
export const SystemInfoSchema = z.object({
  alias: z.string(),
  description: z.string(),
});

export const SystemsResponseSchema = z.object({
  systems: z.array(SystemInfoSchema),
});

export const CreateAdventureRequestSchema = z.object({
  name: z.string().min(1).max(100),
  system: z.string().nullable(),
  concept: z.string().max(1000).nullable(),
});

export const CreateAdventureResponseSchema = z.object({
  adventure: AdventureListItemSchema,
});
```

Export the new types from `packages/shared/src/types.ts` and `packages/shared/src/index.ts`.

#### Step 2.4: Update Adventure Service

**Files**: `packages/backend/src/services/adventure-service.ts`
**Addresses**: REQ-ACF-14, REQ-ACF-15, REQ-ACF-16, REQ-ACF-17, REQ-ACF-26

**`listAdventures()`**: For each adventure directory:

1. Read `adventure.md` (already done for system). Now also extract `name` and `concept` from `parseAdventureConfig`.
2. `name`: Use config `name` if present, fall back to directory name (backward compatible per REQ-ACF-26).
3. `concept`: From config. Null when absent.
4. `characterName`: If `character.md` exists, read the file. Find the first non-empty line. If it matches `/^# (.+)$/`, the capture group is the character name. Otherwise null.
5. `lastPlayed`: Call `fileOps.stat()` on `history.md`. If stat returns non-null, format `mtime` as ISO 8601 (`mtime.toISOString()`). Otherwise null.
6. Keep `hasCharacter` and `hasWorld` for now (Phase 4 removes).

**`getAdventure()`**: Also extract and return `concept` from `parseAdventureConfig`.

#### Step 2.5: Write Tests

**Files**: `packages/backend/tests/services/adventure-config.test.ts` (update), `packages/backend/tests/adventure-service.test.ts` (update)
**Addresses**: REQ-ACF-29

**Adventure config parser tests** (add to existing file):
- Extract `name` from frontmatter
- Extract `concept` from body text after closing `---`
- Handle missing name (returns null)
- Handle missing concept / empty body (returns null)
- Handle both name and system together
- Handle file with only body text, no frontmatter (entire content is concept)
- Handle file with frontmatter but no body text

**Adventure service tests** (add to existing file):
- `listAdventures` returns `name` from frontmatter when present
- `listAdventures` returns directory name when `name` absent from frontmatter
- `listAdventures` returns `concept` from body text
- `listAdventures` returns `characterName` from `# Heading` in character.md
- `listAdventures` returns null `characterName` when no heading in character.md
- `listAdventures` returns null `characterName` when no character.md
- `listAdventures` returns `lastPlayed` as ISO string from history.md mtime
- `listAdventures` returns null `lastPlayed` when no history.md
- `getAdventure` returns `concept`

#### Step 2.6: Verify Phase 2

```bash
bun test packages/backend/tests/services/adventure-config.test.ts
bun test packages/backend/tests/adventure-service.test.ts
bun test packages/backend/tests/  # all tests pass
bun run build  # typecheck passes (web client still compiles because hasCharacter/hasWorld kept)
```

**Review gate**: Thorne reviews for config parser correctness, schema expansion, backward compatibility, stat integration.

---

### Phase 3: Creation and Systems Endpoints

Adds `POST /adventures` and `GET /systems`. Backend-only. The web client can't call these yet (wizard doesn't exist), but the endpoints are independently testable via curl or tests.

**Read Thorne's review of Phase 2. Address ALL findings before starting.**

~250 lines changed.

#### Step 3.1: Create Slugify Utility

**Files**: `packages/backend/src/services/slugify.ts` (new)
**Addresses**: REQ-ACF-11, REQ-ACF-12

A pure function:

```typescript
export function slugify(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, "")  // strip non-alphanumeric except spaces, hyphens, underscores
    .replace(/\s+/g, "-")            // spaces to hyphens
    .replace(/-+/g, "-")             // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens

  if (slug === "") slug = "adventure";  // fallback
  return slug;
}
```

Verify against all examples from REQ-ACF-12:
- `"The Healer's Burden"` -> `the-healers-burden`
- `"My First Adventure"` -> `my-first-adventure`
- `"  Spaces  Everywhere  "` -> `spaces-everywhere`
- `"!!!???"` -> `adventure`
- `"Daggerheart: Rise of Flame"` -> `daggerheart-rise-of-flame`

#### Step 3.2: Add Adventure Creation to Service

**Files**: `packages/backend/src/services/adventure-service.ts`
**Addresses**: REQ-ACF-9, REQ-ACF-10, REQ-ACF-11

Add a `createAdventure` method to the `AdventureService` interface:

```typescript
createAdventure(params: {
  name: string;
  system: string | null;
  concept: string | null;
}): Promise<AdventureListItem>;
```

Implementation:
1. Slugify the name.
2. Check if the directory already exists (`fileOps.fileExists`). If so, throw a specific error that the route can catch and return as 409.
3. Build the adventure.md content string. When `system` is null, omit the `system:` line. When `concept` is null, end after the closing `---`. Follow the exact examples from REQ-ACF-11.
4. Write adventure.md using `fileOps.writeFile`. The production `writeFile` already creates parent directories.
5. Return the created adventure as an `AdventureListItem` (characterName null, lastPlayed null, hasHistory false, concept from input).

The service does not validate whether the system alias exists. That's the route's job (it has access to the plugin registry).

#### Step 3.3: Create System Routes

**Files**: `packages/backend/src/routes/system-routes.ts` (new)
**Addresses**: REQ-ACF-5, REQ-ACF-6

Follow the route/service split with DI factories pattern:

```typescript
export function createSystemRoutes(deps: {
  pluginRegistry: PluginRegistry;
}): RouteModule {
  const { pluginRegistry } = deps;
  const routes = new Hono();

  routes.get("/systems", (c) => {
    const systems = pluginRegistry.availableSystems();
    return c.json({ systems });
  });

  const operations: OperationDefinition[] = [{
    operationId: "systems.list",
    name: "list",
    description: "List available RPG systems",
    invocation: { method: "GET", path: "/systems" },
    hierarchy: { root: "systems", feature: "discovery" },
    idempotent: true,
  }];

  return { routes, operations };
}
```

#### Step 3.4: Add Creation Endpoint to Adventure Routes

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-ACF-9, REQ-ACF-10, REQ-ACF-13

Add `POST /adventures` route:

1. Parse and validate request body with `CreateAdventureRequestSchema`.
2. If `system` is non-null, check `pluginRegistry.resolveSystem(system)`. If null, return 400 with the error message from REQ-ACF-10 (use `availableSystems().map(s => s.alias)` for the list).
3. Call `adventureService.createAdventure({ name, system, concept })`.
4. Catch the duplicate-name error and return 409.
5. Return 201 with `{ adventure: result }`.

Add the `OperationDefinition` for the new endpoint:

```typescript
{
  operationId: "adventures.create",
  name: "create",
  description: "Create a new adventure",
  invocation: { method: "POST", path: "/adventures" },
  hierarchy: { root: "adventures", feature: "creation" },
  requestSchema: CreateAdventureRequestSchema,
  idempotent: false,
}
```

Import `CreateAdventureRequestSchema` from `@corvran/shared`.

#### Step 3.5: Wire System Routes in App

**Files**: `packages/backend/src/app.ts`
**Addresses**: REQ-ACF-6

Import `createSystemRoutes`. Create the module with the plugin registry. Add it to `contentModules`.

The plugin registry is currently optional in `AppDeps` and passed through to adventure routes. System routes require it. If `pluginRegistry` is not provided (tests that don't need it), skip creating system routes. This matches the existing pattern where `sessionRunner` is optional.

```typescript
if (deps?.pluginRegistry) {
  const systemModule = createSystemRoutes({ pluginRegistry: deps.pluginRegistry });
  contentModules.push(systemModule);
}
```

#### Step 3.6: Write Tests

**Files**: `packages/backend/tests/services/slugify.test.ts` (new), `packages/backend/tests/adventure-creation.test.ts` (new), `packages/backend/tests/system-routes.test.ts` (new)
**Addresses**: REQ-ACF-29

**Slugify tests**:
- All five examples from REQ-ACF-12
- Empty-after-stripping fallback to "adventure"
- Leading/trailing hyphens trimmed
- Consecutive hyphens collapsed
- Underscores preserved

**Adventure creation endpoint tests** (use `createApp` with mock deps, call via `app.request()`):
- Create with system + concept + name: 201, directory created, adventure.md correct
- Create with null system (freeform): 201, adventure.md omits system field
- Create with null concept: 201, adventure.md has frontmatter only, no body
- Create with invalid system: 400, error includes available systems list
- Create with duplicate slug: 409
- Verify response shape matches `CreateAdventureResponseSchema`

**Systems endpoint tests**:
- Returns system plugins with alias and description
- Excludes core plugins
- Returns empty array when no system plugins installed

#### Step 3.7: Verify Phase 3

```bash
bun test packages/backend/tests/services/slugify.test.ts
bun test packages/backend/tests/adventure-creation.test.ts
bun test packages/backend/tests/system-routes.test.ts
bun test packages/backend/tests/  # all tests pass
bun run build  # typecheck passes
```

**Review gate**: Thorne reviews for endpoint correctness, validation, file format compliance, slugification edge cases.

---

### Phase 4: Lobby and Creation Wizard

Rebuilds the web client's root page. Removes auto-redirect, adds adventure cards with the new fields, adds the creation wizard, removes `hasCharacter`/`hasWorld` from the schema. This is the web-only phase (plus the schema cleanup in shared).

**Read Thorne's review of Phase 3. Address ALL findings before starting.**

~400 lines changed. This is the largest phase. If the implementer finds it exceeding ~800 lines of changes, split the lobby redesign (Step 4.1-4.2) from the creation wizard (Step 4.3-4.5) into separate commissions.

#### Step 4.1: Remove `hasCharacter` and `hasWorld` from Schema

**Files**: `packages/shared/src/schemas/adventures.ts`
**Addresses**: REQ-ACF-14, REQ-ACF-28

Remove `hasCharacter: z.boolean()` and `hasWorld: z.boolean()` from `AdventureListItemSchema`. The web client is updated in the same phase, so no type errors linger.

Also remove from `adventure-service.ts`: stop computing and returning `hasCharacter` and `hasWorld` in `listAdventures()`. (They're still computed for the detail endpoint if needed, but the detail schema never had these booleans, it has the full content fields.)

#### Step 4.2: Rebuild Lobby Page

**Files**: `packages/web/app/page.tsx`, `packages/web/app/page.module.css`
**Addresses**: REQ-ACF-18, REQ-ACF-19, REQ-ACF-20

Replace the current `AdventureListPage` component:

1. **Remove auto-redirect**: Delete lines 23-26 (the `if (data.adventures.length === 1)` block).

2. **Sort adventures client-side**: After fetching, sort: adventures with `lastPlayed === null` first (sorted by `name` alphabetically), then adventures with `lastPlayed` (sorted by `lastPlayed` descending).

3. **Rebuild `AdventureCard`**: Replace `hasCharacter`/`hasWorld`/file hints with:
   - Adventure name (from `name` field)
   - System badge (e.g., "[Daggerheart]") if `system` is non-null
   - Concept snippet (first ~100 characters of `concept`) if present
   - Character name ("Playing as {characterName}") if present
   - State indicator: "New adventure" if `!hasHistory`, "Continue" if `hasHistory`
   - Last played relative timestamp if `lastPlayed` is non-null

   For the relative timestamp, use a simple helper: compute the difference between now and the `lastPlayed` date, format as "X minutes ago", "X hours ago", "X days ago". No external dependency needed.

4. **Rebuild `EmptyState`**: Replace the `mkdir` CLI hint with a "New Adventure" button. Message: "No adventures yet. Start one." The button opens the creation wizard (same action as the "New Adventure" button in the header).

5. **Add "New Adventure" button**: Place in the page heading area, visible when adventures exist and when they don't (in the empty state it's the primary CTA).

#### Step 4.3: Build Creation Wizard

**Files**: `packages/web/app/page.tsx` (or `packages/web/components/creation-wizard.tsx` if the file gets too large)
**Addresses**: REQ-ACF-21, REQ-ACF-22, REQ-ACF-23

The wizard is a modal dialog with three fields, all visible at once:

1. **System picker**: Fetch `GET /api/daemon/systems` on mount. Render selectable options. "Freeform" is a hardcoded option (sends `system: null`). System options show `alias` as label, `description` as subtext. "Freeform" is preselected.

2. **Concept field**: Textarea. Label: "What's your adventure about?" Placeholder text from spec. Optional. Max 1000 characters. Client-side character count or limit enforcement.

3. **Name field**: Text input. Label: "Adventure name." Default: "Untitled Adventure". Required. The auto-suggest feature (REQ-ACF-23) is deferred. The field is always editable.

4. **Submit**: "Begin Adventure" button. Calls `POST /api/daemon/adventures` with `{ name, system, concept }`. On 201 success, navigate to `/adventure/{response.adventure.id}`. On 409, show inline error. On other errors, show generic error.

5. **Dismiss**: Close button or backdrop click dismisses the wizard without action.

State management: local component state (`useState`). No global state needed.

#### Step 4.4: CSS Updates

**Files**: `packages/web/app/page.module.css`

Update styles for the new card layout, wizard modal, system picker options, concept textarea, and responsive behavior. Follow existing CSS patterns in the file.

#### Step 4.5: Verify Phase 4

```bash
bun run build  # typecheck passes, Next.js build succeeds
```

No automated tests for web components in the current setup. Manual verification:
- Empty state shows "New Adventure" button, not `mkdir` hint
- Adventure cards show name, system badge, concept snippet, character name, state, last played
- Clicking "New Adventure" opens wizard
- Wizard fetches systems, shows picker, concept field, name field
- Submitting wizard creates adventure and navigates to it
- Duplicate name shows inline error
- Clicking existing adventure navigates to `/adventure/{id}`

**Review gate**: Thorne reviews for schema cleanup completeness, component structure, error handling, accessibility basics.

---

### Phase 5: Concept in GM Prompt

Wires the concept text into the prompt assembly so the GM reads it when starting an adventure. Backend-only.

**Read Thorne's review of Phase 4. Address ALL findings before starting.**

~50 lines changed.

#### Step 5.1: Add `concept` to AdventureState

**Files**: `packages/backend/src/services/prompt-service.ts`
**Addresses**: REQ-ACF-25

Add `concept: string | null` to `AdventureState`:

```typescript
export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
  systemBootstrap: string | null;
  concept: string | null;
}
```

In `assembleSystemPrompt`, add a new section after Identity and Principles, before Adventure State:

```typescript
// Between Principles and Adventure State:
if (state.concept) {
  sections.push(`## Adventure Concept\n\n${state.concept}`);
}
```

This positions the concept before character/world content as specified in REQ-ACF-25. The concept is broad context; character and world are specific state.

#### Step 5.2: Pass Concept from Routes

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-ACF-24, REQ-ACF-25

In the `POST /adventures/:id/message` handler, the adventure detail is already fetched (line 90: `adventureService.getAdventure(id)`). After Phase 2, `adventure` includes `concept`. Pass it to `assembleSystemPrompt`:

```typescript
const systemPrompt = assembleSystemPrompt({
  character: adventure.character,
  world: adventure.world,
  history,
  systemBootstrap,
  concept: adventure.concept ?? null,
});
```

The `getAdventure` detail response gained `concept` in Phase 2 (REQ-ACF-17), so this field is already available. The `??  null` handles any typing edge case but `concept` should already be `string | null`.

#### Step 5.3: Update Tests

**Files**: `packages/backend/tests/prompt-service.test.ts`
**Addresses**: REQ-ACF-29

Add to existing prompt service tests:
- Concept present: output includes `## Adventure Concept` section before character/world
- Concept null: no `## Adventure Concept` section in output
- Concept present with character and world: all three sections appear in order (concept, character, world)

Update existing test cases that construct `AdventureState` to include `concept: null` so they don't break.

Also update `packages/backend/tests/message-route.test.ts` if it constructs `AdventureState` or calls `assembleSystemPrompt`.

#### Step 5.4: Verify Phase 5

```bash
bun test packages/backend/tests/prompt-service.test.ts
bun test packages/backend/tests/  # all tests pass
bun run build  # typecheck passes
```

**Review gate**: Thorne reviews for prompt section ordering, concept omission when null, no regressions in existing prompt assembly.

## Phase Review Summary

| Phase | Scope | ~Lines | Can Review Independently |
|-------|-------|--------|--------------------------|
| 1 | Backend: manifest schema + registry | 100 | Yes |
| 2 | Backend + shared: config parser + list schema | 200 | Yes |
| 3 | Backend + shared: creation + systems endpoints | 250 | Yes |
| 4 | Web + shared: lobby + wizard + schema cleanup | 400 | Yes, but depends on Phase 2-3 backend |
| 5 | Backend: concept in prompt | 50 | Yes |

Phases 1-3 are strictly backend and can be implemented and reviewed sequentially without touching the web client. Phase 4 is the only web phase. Phase 5 is a small backend follow-up. Each phase is independently deployable (the system works after each phase, just without the features that later phases add).
