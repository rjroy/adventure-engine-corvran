---
title: "Implementation plan: adventure-system-integration"
date: 2026-03-29
status: draft
tags: [plan, plugins, game-systems, bootstrap-prompts, adventure-config, prompt-service, api]
modules: [backend, shared]
related: [.lore/specs/adventure-system-integration.md, .lore/specs/engine-dice-tool.md, .lore/plans/engine-dice-tool.md, .lore/reference/architecture-pattern.md]
---

# Plan: Adventure System Integration

Four phases. Phase 1 introduces new modules with no changes to existing code (zero risk to current tests). Phase 2 modifies existing services and schemas. Phase 3 wires everything together in routes and app startup. Phase 4 authors bootstrap prompt content. Each phase has a Thorne review gate before the next begins.

## Spec Reference

**Spec**: `.lore/specs/adventure-system-integration.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-SYS-1 | 1, 2 | adventure.md with YAML frontmatter |
| REQ-SYS-2 | 1 | system field matches plugin aliases |
| REQ-SYS-3 | 1, 3 | No adventure.md = freeform (corvran only) |
| REQ-SYS-4 | 3 | Unknown system alias returns HTTP 400 |
| REQ-SYS-4a | 1 | Malformed YAML = treat as freeform, log warning |
| REQ-SYS-5 | 4 | adventure.md naming convention |
| REQ-SYS-6 | 1 | corvran-plugin.json manifest files |
| REQ-SYS-7 | 1 | Manifest schema (name, type, aliases, bootstrap) |
| REQ-SYS-8 | 1 | Duplicate alias warning |
| REQ-SYS-9 | 1 | Three initial manifests |
| REQ-SYS-10 | 4 | Bootstrap prompt purpose and position |
| REQ-SYS-11 | 4 | Bootstrap prompt structure guidelines |
| REQ-SYS-12 | 4 | No comparative framing in bootstraps |
| REQ-SYS-13 | 4 | Skills override bootstrap on conflict |
| REQ-SYS-14 | 4 | Onboarding guidance in bootstrap |
| REQ-SYS-15 | 1 | Plugin registry from scanning plugins/ |
| REQ-SYS-16 | 3 | AppConfig uses pluginsDir, registry built at startup |
| REQ-SYS-17 | 2, 3 | Core plugins always load |
| REQ-SYS-18 | 2 | pluginPaths moves to RunQueryParams |
| REQ-SYS-19 | 3 | Message handler resolves plugins per-adventure |
| REQ-SYS-20 | 1 | Plugin paths fixed by project structure |
| REQ-SYS-21 | 2 | AdventureState gains systemBootstrap |
| REQ-SYS-22 | 2 | Prompt assembly order with bootstrap |
| REQ-SYS-23 | 3 | Routes read bootstrap file, prompt service stays pure |
| REQ-SYS-24 | 2 | AdventureListItemSchema gains system field |
| REQ-SYS-25 | 2 | AdventureDetailSchema gains system field |
| REQ-SYS-26 | 2 | GET endpoints return system field |
| REQ-SYS-27 | 1 | Adventures without adventure.md work as freeform |
| REQ-SYS-28 | 3 | Behavioral change: only declared systems load |
| REQ-SYS-29 | 1-3 | Tests (distributed across phases) |

## Codebase Context

### Current Architecture

**app.ts** (133 lines): `resolveConfig()` hardcodes three plugin paths at lines 57-61. `AppConfig` has `pluginPaths: string[]`. `createApp(deps)` passes `pluginPaths` through `SessionRunnerConfig` to the session runner. The DI pattern uses factory functions with deps objects.

**session-runner.ts** (53 lines): `SessionRunnerConfig` has `pluginPaths: string[]` and `model: string`. `RunQueryParams` has `systemPrompt`, `playerMessage`, `adventurePath`, and `abortController` (no `pluginPaths`). The `createDiceTool()` MCP server is created once at construction time (line 25) and shared across queries. Plugin paths are read from `config.pluginPaths` per query (line 35). The dice tool was fully implemented per the engine-dice-tool plan.

**prompt-service.ts** (81 lines): `AdventureState` has `character`, `world`, and `history` (no `systemBootstrap`). `assembleSystemPrompt` is a pure function. Six sections: Identity, Principles, Adventure State, Onboarding (conditional), Conversation History, Instructions. The Instructions text at line 72 still references "skills for dice rolls" rather than the engine dice tool. This update was described in the dice tool spec but not implemented; REQ-SYS-22 point 6 assigns it here.

**adventure-service.ts** (91 lines): `listAdventures` reads directory entries, checks for `character.md`, `world.md`, `history.md`. Does not read `adventure.md`. `getAdventure` returns `id`, `name`, `character`, `world`, `hasHistory`. No `system` field.

**adventure-routes.ts** (253 lines): The `POST /adventures/:id/message` handler reads adventure state, assembles the system prompt, and calls `sessionRunner.runQuery`. No per-adventure plugin resolution. No bootstrap reading.

**Schemas** (`packages/shared/src/schemas/adventures.ts`): `AdventureListItemSchema` has `id`, `name`, `hasCharacter`, `hasWorld`, `hasHistory`. `AdventureDetailSchema` has `id`, `name`, `character`, `world`, `hasHistory`. Neither has `system`.

**Plugin directories**: Three plugins exist: `plugins/corvran/` (core, has `gm-craft` skill), `plugins/d20-system/` (system, five skill sets), `plugins/daggerheart-system/` (system, six skill sets). All have `.claude-plugin/plugin.json` for SDK discovery. None have `corvran-plugin.json` yet. No `bootstrap.md` files exist.

**Test infrastructure**: Tests use `bun:test`. `createMockFileOps(files)` provides an in-memory filesystem. `createMockQueryFn(messages)` provides a mock SDK query. Test helpers are in `packages/backend/tests/helpers/`. All tests use DI; no `mock.module()`.

### Dependencies Between Changes

```
Phase 1 (new modules)           Phase 2 (service changes)
  manifest parser  ─────────────► adventure-routes uses registry
  plugin registry                  session runner uses per-query pluginPaths
  adventure.md parser ──────────► adventure service returns system
  corvran-plugin.json files        schemas gain system field
                                   prompt service gains bootstrap

                    Phase 3 (wiring)
                      app.ts builds registry at startup
                      routes resolve plugins per-adventure
                      routes read bootstrap from disk
                      routes pass bootstrap to prompt service

                                   Phase 4 (content)
                                     d20-system/bootstrap.md
                                     daggerheart-system/bootstrap.md
```

## Implementation Steps

### Phase 1: Foundation Modules

New modules and static files. No changes to existing code. Existing tests remain untouched.

#### Step 1.1: Create Plugin Manifest Files

**Files**: `plugins/corvran/corvran-plugin.json` (new), `plugins/d20-system/corvran-plugin.json` (new), `plugins/daggerheart-system/corvran-plugin.json` (new)
**Addresses**: REQ-SYS-6, REQ-SYS-7, REQ-SYS-9

Create the three JSON files exactly as specified:

**`plugins/corvran/corvran-plugin.json`**:
```json
{
  "name": "corvran",
  "type": "core",
  "aliases": ["corvran"]
}
```

**`plugins/d20-system/corvran-plugin.json`**:
```json
{
  "name": "d20-system",
  "type": "system",
  "aliases": ["d20"],
  "bootstrap": "bootstrap.md"
}
```

**`plugins/daggerheart-system/corvran-plugin.json`**:
```json
{
  "name": "daggerheart-system",
  "type": "system",
  "aliases": ["daggerheart"],
  "bootstrap": "bootstrap.md"
}
```

These are static files. The `bootstrap` field in the system manifests points to a file that won't exist until Phase 4. The code handles this gracefully because bootstrap is only read at message-send time (Phase 3), and the registry just stores the path.

#### Step 1.2: Build Plugin Registry Module

**Files**: `packages/backend/src/services/plugin-registry.ts` (new)
**Addresses**: REQ-SYS-6, REQ-SYS-7, REQ-SYS-8, REQ-SYS-15, REQ-SYS-17, REQ-SYS-20

This module exports types and a factory function. Follow the existing DI factory pattern (see `createAdventureService`, `createSessionRunner`).

**Types to define**:

```typescript
interface PluginManifest {
  name: string;
  type: "core" | "system";
  aliases: string[];
  bootstrap?: string;
}

interface PluginEntry {
  manifest: PluginManifest;
  path: string; // absolute path to the plugin directory
}

interface PluginRegistry {
  corePlugins: PluginEntry[];
  resolveSystem(alias: string): PluginEntry | null;
  availableAliases(): string[]; // Returns only system-type plugin aliases, not core
}
```

**Factory function**: `buildPluginRegistry(pluginsDir: string, fileOps: FileOps): Promise<PluginRegistry>`

The function:
1. Lists subdirectories of `pluginsDir` using `fileOps.readDir`
2. For each subdirectory, checks if `corvran-plugin.json` exists using `fileOps.fileExists`
3. If it exists, reads and parses it with `fileOps.readFile` and `JSON.parse`
4. Validates required fields (`name`, `type`, `aliases`). Skip plugins with invalid manifests and log a warning.
5. Builds the alias map. If a duplicate alias is found, log a warning naming both plugins and the conflicting alias (REQ-SYS-8). The second plugin wins (unspecified per spec, but deterministic ordering from `readDir`).
6. Collects core plugins (type `"core"`) separately.
7. Returns a registry object with `corePlugins`, `resolveSystem(alias)`, and `availableAliases()`.

The `FileOps` dependency allows testing with the existing `createMockFileOps` helper. No new filesystem abstractions needed.

**Parse defensively**: Use `JSON.parse` in a try/catch. If a manifest fails to parse, log a warning and skip it. Do not crash the startup.

#### Step 1.3: Build Adventure Config Parser

**Files**: `packages/backend/src/services/adventure-config.ts` (new)
**Addresses**: REQ-SYS-1, REQ-SYS-2, REQ-SYS-3, REQ-SYS-4a, REQ-SYS-27

A small utility that extracts the `system` field from `adventure.md` YAML frontmatter. Returns `string | null`.

**Function signature**: `parseAdventureConfig(content: string): { system: string | null }`

The function:
1. Checks if content starts with `---\n`
2. Finds the closing `---\n` delimiter
3. Parses the YAML between delimiters. Use a minimal approach: split by newlines, find the `system:` line, extract the value. YAML frontmatter in adventure files has a single mechanical field, so a full YAML parser is unnecessary. Alternatively, use `yaml` package if already available.
4. If parsing fails at any point, return `{ system: null }` (REQ-SYS-4a).

**Check for yaml dependency**: Run `grep yaml packages/backend/package.json`. If the `yaml` package isn't present, use a simple regex-based parser. The frontmatter is trivially structured (single field). If `yaml` is present, use it for correctness. Either way, wrap in try/catch and return `{ system: null }` on failure per REQ-SYS-4a.

**Logging for malformed YAML**: The function should accept an optional logger/warn callback, or return a `warning` field alongside `system`. The caller (adventure service) handles the logging. Keep the parser as a pure function.

A cleaner signature that handles REQ-SYS-4a:

```typescript
interface AdventureConfig {
  system: string | null;
  warning?: string; // set when YAML parse fails
}

function parseAdventureConfig(content: string): AdventureConfig
```

#### Step 1.4: Write Unit Tests for Registry and Config Parser

**Files**: `packages/backend/tests/services/plugin-registry.test.ts` (new), `packages/backend/tests/services/adventure-config.test.ts` (new)
**Addresses**: REQ-SYS-29 (manifest parsing, registry, adventure.md parsing sections)

**Plugin registry tests** (use `createMockFileOps` with manifest JSON files in the store):

- Parse valid manifest with all fields
- Parse manifest without optional `bootstrap` field
- Skip directory without `corvran-plugin.json` (no error)
- Skip manifest with missing `name` field (log warning)
- Skip manifest with missing `type` field (log warning)
- Skip manifest with missing `aliases` field (log warning)
- Skip manifest with malformed JSON (log warning)
- Build registry from multiple plugins, verify core vs system separation
- Resolve alias to correct plugin entry
- Return null for unrecognized alias
- `availableAliases()` returns all system plugin aliases
- Detect duplicate alias across plugins (verify warning message names both plugins)

**Adventure config parser tests**:

- Extract `system: daggerheart` from valid frontmatter
- Extract `system: d20` from valid frontmatter
- Return `system: null` when adventure.md has no frontmatter
- Return `system: null` when frontmatter has no `system` field
- Return `system: null` for empty string input
- Return `system: null` with warning for malformed YAML (broken delimiter)
- Handle frontmatter with extra fields (ignore them, extract system)
- Handle system value with no quotes and with quotes

#### Step 1.5: Verify Phase 1

```bash
bun test packages/backend/tests/services/plugin-registry.test.ts
bun test packages/backend/tests/services/adventure-config.test.ts
bun test packages/backend/tests/  # all existing tests still pass
```

**Review gate**: Thorne reviews Phase 1 for: manifest schema compliance with REQ-SYS-7, defensive parsing behavior, registry API design, adventure config parser edge cases. Review artifact: `.lore/reviews/adventure-system-integration-phase1.md`

---

### Phase 2: Service and Schema Changes

Modify existing services to support the new data. No wiring changes yet; routes and app startup remain unchanged. This phase changes function signatures and adds a field to shared schemas.

**Read Thorne's review at `.lore/reviews/adventure-system-integration-phase1.md`. Address ALL findings before starting this phase's work.**

#### Step 2.1: Add `system` Field to Shared Schemas

**Files**: `packages/shared/src/schemas/adventures.ts`, `packages/shared/src/types.ts`
**Addresses**: REQ-SYS-24, REQ-SYS-25

Add `system: z.string().nullable()` to both `AdventureListItemSchema` and `AdventureDetailSchema`:

```typescript
// In AdventureListItemSchema, after hasHistory:
system: z.string().nullable(),

// In AdventureDetailSchema, after hasHistory:
system: z.string().nullable(),
```

The `types.ts` file uses `z.infer` and will pick up the new field automatically.

#### Step 2.2: Update Adventure Service

**Files**: `packages/backend/src/services/adventure-service.ts`
**Addresses**: REQ-SYS-1, REQ-SYS-3, REQ-SYS-26, REQ-SYS-27

The adventure service reads `adventure.md` during both `listAdventures` and `getAdventure`.

**In `listAdventures`**: After checking for `character.md`, `world.md`, and `history.md`, also read `adventure.md` from the adventure directory. Use `parseAdventureConfig` to extract `system`. Add `system` (or `null`) to the returned object.

```typescript
// After the existing hasHistory check:
let system: string | null = null;
const adventureConfigPath = fileOps.resolvePath(adventurePath, "adventure.md");
if (await fileOps.fileExists(adventureConfigPath)) {
  const content = await fileOps.readFile(adventureConfigPath);
  const config = parseAdventureConfig(content);
  system = config.system;
  if (config.warning) {
    console.warn(`[adventure-service] ${entry}: ${config.warning}`);
  }
}

adventures.push({
  id: entry,
  name: entry,
  hasCharacter,
  hasWorld,
  hasHistory,
  system,
});
```

**In `getAdventure`**: Same pattern. Read `adventure.md`, parse config, add `system` to the returned `AdventureDetail`.

Import `parseAdventureConfig` from `./adventure-config.js`.

#### Step 2.3: Update Session Runner Interface

**Files**: `packages/backend/src/services/session-runner.ts`
**Addresses**: REQ-SYS-18

Move `pluginPaths` from `SessionRunnerConfig` to `RunQueryParams`:

```typescript
// Before
export interface SessionRunnerConfig {
  pluginPaths: string[];
  model: string;
}

export interface RunQueryParams {
  systemPrompt: string;
  playerMessage: string;
  adventurePath: string;
  abortController: AbortController;
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

In `runQuery`, change line 35 from `config.pluginPaths` to `params.pluginPaths`:

```typescript
plugins: params.pluginPaths.map((p) => ({ type: "local" as const, path: p })),
```

This change breaks the current `createApp` wiring (which passes `pluginPaths` through `SessionRunnerConfig`). That's fine; Phase 3 fixes the wiring. For now, the module compiles on its own but the app won't build until Phase 3. Tests that construct their own session runner will need updating.

#### Step 2.4: Update Prompt Service

**Files**: `packages/backend/src/services/prompt-service.ts`
**Addresses**: REQ-SYS-21, REQ-SYS-22

Three changes:

**1. Add `systemBootstrap` to `AdventureState`:**

```typescript
export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
  systemBootstrap: string | null;
}
```

**2. Update Identity section** (line 23): When `systemBootstrap` is present, append it after the identity line with a blank line separator:

```typescript
// Section 1: Identity
let identity = "# Identity\n\nYou are the Game Master for a tabletop RPG adventure.";
if (state.systemBootstrap) {
  identity += "\n\n" + state.systemBootstrap;
}
sections.push(identity);
```

**3. Update Onboarding section** (lines 47-64): When `systemBootstrap` is present, skip the generic onboarding entirely. The bootstrap contains system-specific onboarding guidance (REQ-SYS-14, REQ-SYS-22 point 4):

```typescript
// Section 4: Onboarding (conditional)
if (!state.systemBootstrap && (missingCharacter || missingWorld)) {
  // existing onboarding text unchanged
}
```

**4. Update Instructions text** (lines 72-78): Replace the "skills for dice rolls" reference with engine dice tool wording. The dice tool is already wired into every session (REQ-DICE-9 implemented). The new text:

```typescript
sections.push(
  "# Instructions\n\n" +
  "Respond to the player's latest message. Use the dice tool for rolls and " +
  "available skills for rules lookup and GM techniques. When you roll dice or look up rules, " +
  "include the meaningful result in your narrative (e.g., \"You rolled 14 + 3 = 17, a success!\") " +
  "but not the raw tool invocation."
);
```

This changes "Use available skills for dice rolls, rules lookup, and GM techniques" to "Use the dice tool for rolls and available skills for rules lookup and GM techniques." The distinction matters: dice rolls are now an engine-provided MCP tool, not a plugin skill.

#### Step 2.5: Update Existing Tests

**Files**: `packages/backend/tests/prompt-service.test.ts`, `packages/backend/tests/adventure-service.test.ts`, `packages/backend/tests/message-route.test.ts`
**Addresses**: REQ-SYS-29 (prompt assembly, API response shape sections)

**prompt-service.test.ts**: All existing calls to `assembleSystemPrompt` need `systemBootstrap: null` added to the state object. Then add new tests:

- System prompt with bootstrap includes content in Identity section
- System prompt without bootstrap matches freeform format (existing behavior)
- Onboarding present when no bootstrap and character/world missing
- Onboarding absent when bootstrap present, even if character/world missing
- Instructions text references dice tool (not "skills for dice rolls")

**adventure-service.test.ts**: Update mock file stores to include `adventure.md` for some adventures. Verify `system` field in list and detail responses:

- Adventure with `system: daggerheart` in adventure.md returns `system: "daggerheart"` in list and detail
- Adventure without adventure.md returns `system: null`
- Adventure with adventure.md but no system field returns `system: null`
- Adventure with malformed YAML in adventure.md returns `system: null` (verify warning logged)

**message-route.test.ts**: The `buildTestApp` helper constructs a `SessionRunner` with `pluginPaths` in config. After Phase 2, `pluginPaths` moves to `RunQueryParams`. Update `buildTestApp` to:
1. Remove `pluginPaths` from `SessionRunnerConfig`
2. The message handler doesn't exist yet to pass `pluginPaths` per-query (that's Phase 3). For now, the test's mock query function doesn't validate what options it receives, so the test still works as long as the session runner compiles.

However, since Phase 2 changes the `SessionRunnerConfig` interface and Phase 3 hasn't updated the route to pass `pluginPaths` per-query, there's a compile gap. To handle this cleanly:

**Option A**: Update the message handler in `adventure-routes.ts` to pass a hardcoded empty `pluginPaths: []` to `runQuery` as a temporary shim. Phase 3 replaces this with the real resolution logic.

**Option B**: Accept that `tsc --build` from root will fail until Phase 3 completes, and run per-package type checks only.

**Recommended: Option A.** A temporary `pluginPaths: []` in the route keeps the build green between phases. Phase 3 replaces it. This is a one-line shim, not a workaround that hides problems.

**Concrete shim location**: In `packages/backend/src/routes/adventure-routes.ts`, update the `sessionRunner.runQuery(...)` call (around line 109) to include `pluginPaths: []` in the params object. This satisfies the new `RunQueryParams` interface while Phase 3 hasn't wired the real resolution yet. Phase 3's Step 3.2 replaces this `[]` with the resolved plugin paths.

#### Step 2.6: Verify Phase 2

```bash
cd packages/backend && bunx tsc --noEmit  # typecheck
bun test packages/backend/tests/          # all tests pass
tsc --build                               # full workspace build
```

**Review gate**: Thorne reviews Phase 2 for: schema backward compatibility (nullable field addition is safe), prompt assembly order compliance with REQ-SYS-22, correct conditional logic for onboarding suppression, Instructions text wording. Review artifact: `.lore/reviews/adventure-system-integration-phase2.md`

---

### Phase 3: Integration Wiring

Connect the registry, per-adventure resolution, and bootstrap reading in routes and app startup. This is the phase where the behavioral change (REQ-SYS-28) takes effect.

**Read Thorne's review at `.lore/reviews/adventure-system-integration-phase2.md`. Address ALL findings before starting this phase's work.**

#### Step 3.1: Update AppConfig and createApp

**Files**: `packages/backend/src/app.ts`
**Addresses**: REQ-SYS-16, REQ-SYS-20

**Change `AppConfig`:**

```typescript
// Before
export interface AppConfig {
  corvranHome: string;
  adventuresPath: string;
  pluginPaths: string[];
}

// After
export interface AppConfig {
  corvranHome: string;
  adventuresPath: string;
  pluginsDir: string;
}
```

**Change `resolveConfig()`:** Replace the hardcoded `pluginPaths` array with `pluginsDir`:

```typescript
const pluginsDir = resolve(repoRoot, "plugins");
return { corvranHome, adventuresPath, pluginsDir };
```

**Change `AppDeps`**: Add optional `pluginRegistry` and `fileOps` for injection:

```typescript
export interface AppDeps {
  fileOps?: FileOps;
  adventuresPath?: string;
  queryFn?: QueryFn;
  model?: string;
  pluginRegistry?: PluginRegistry;
}
```

**Change `createApp()`**: The production entry point (`index.ts`) calls `createApp` synchronously at the top level and passes the result directly to `Bun.serve`. Making `createApp` async would require restructuring the entry point into an async IIFE. Instead, build the registry before calling `createApp` and pass it through `AppDeps`. This keeps `createApp` synchronous.

The production startup becomes:

```typescript
// In index.ts (or server.ts):
const config = resolveConfig();
const fileOps = createRealFileOps();
const pluginRegistry = await buildPluginRegistry(config.pluginsDir, fileOps);
const app = createApp({ pluginRegistry, queryFn: ... });
```

The entry point already needs a top-level await for registry building. Bun supports top-level await natively, so no IIFE is needed. `createApp` itself stays synchronous.

Tests pass a pre-built mock registry through `AppDeps`, consistent with the existing DI pattern.

**Update `createApp`**: Pass the registry and fileOps to `createAdventureRoutes`:

```typescript
const adventureModule = createAdventureRoutes({
  adventureService,
  historyService,
  sessionRunner,
  pluginRegistry,
  fileOps,
});
```

**Remove `pluginPaths` from session runner construction**: The session runner no longer receives plugin paths at construction time. Update lines 86-93 to pass only `model`:

```typescript
sessionRunner = createSessionRunner({
  queryFn: deps.queryFn,
  config: {
    model: deps.model ?? process.env.MODEL ?? "claude-sonnet-4-5-20250929",
  },
});
```

#### Step 3.2: Update Adventure Routes for Per-Adventure Resolution

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-SYS-4, REQ-SYS-17, REQ-SYS-19, REQ-SYS-23, REQ-SYS-28

The `createAdventureRoutes` factory gains two new deps: `pluginRegistry` and `fileOps`.

**In the `POST /adventures/:id/message` handler**, after verifying the adventure exists and before assembling the system prompt, add the resolution flow:

```typescript
// 1. Read adventure config
const adventureConfigPath = fileOps.resolvePath(adventurePath, "adventure.md");
let systemAlias: string | null = null;
if (await fileOps.fileExists(adventureConfigPath)) {
  const content = await fileOps.readFile(adventureConfigPath);
  const config = parseAdventureConfig(content);
  systemAlias = config.system;
  if (config.warning) {
    console.warn(`[adventure-routes] ${id}: ${config.warning}`);
  }
}

// 2. Resolve plugin paths
const pluginPaths = pluginRegistry.corePlugins.map(p => p.path);
let systemBootstrap: string | null = null;

if (systemAlias) {
  const systemPlugin = pluginRegistry.resolveSystem(systemAlias);
  if (!systemPlugin) {
    const available = pluginRegistry.availableAliases().join(", ");
    return c.json({
      error: `Adventure '${id}' declares system '${systemAlias}' but no matching plugin is installed. Available systems: ${available}.`
    }, 400);
  }
  pluginPaths.push(systemPlugin.path);

  // 3. Read bootstrap if declared
  if (systemPlugin.manifest.bootstrap) {
    const bootstrapPath = fileOps.resolvePath(
      systemPlugin.path,
      systemPlugin.manifest.bootstrap
    );
    if (await fileOps.fileExists(bootstrapPath)) {
      systemBootstrap = await fileOps.readFile(bootstrapPath);
    }
  }
}

// 4. Assemble prompt with bootstrap
const systemPrompt = assembleSystemPrompt({
  character: adventure.character,
  world: adventure.world,
  history,
  systemBootstrap,
});

// 5. Pass pluginPaths per-query
const queryResult = sessionRunner.runQuery({
  systemPrompt,
  playerMessage: message,
  adventurePath,
  pluginPaths,
  abortController,
});
```

The resolution happens per-message. No caching of resolved paths between requests. Reading `adventure.md` on every message is consistent with the existing pattern of reading `character.md` and `world.md` fresh each turn (REQ-MVP-17).

#### Step 3.3: Write Integration Tests

**Files**: `packages/backend/tests/message-route.test.ts` (extend existing)
**Addresses**: REQ-SYS-29 (plugin path resolution, API response, error cases)

Update `buildTestApp` to construct a plugin registry from mock file ops. The mock filesystem should include `corvran-plugin.json` files for a test plugin set.

**New test cases:**

**Plugin resolution per-adventure:**
- Adventure with `system: daggerheart` in `adventure.md`: captured query options include corvran + daggerheart-system plugin paths
- Adventure with `system: d20` in `adventure.md`: captured query options include corvran + d20-system plugin paths
- Adventure with no `adventure.md`: captured query options include only corvran plugin path
- Adventure with unknown `system: pathfinder`: returns HTTP 400 with expected error message including available systems list

**Bootstrap integration:**
- Adventure with system and bootstrap file present: captured system prompt includes bootstrap content in Identity section
- Adventure with system, manifest declares `bootstrap` field, but bootstrap file absent from disk: system prompt assembles without bootstrap, no error thrown (graceful skip)
- Adventure with system plugin that has no `bootstrap` field in manifest: system prompt has no bootstrap
- Adventure with no system: no bootstrap in system prompt, generic onboarding present when character/world missing

**API response shape** (if not already covered in Phase 2):
- `GET /adventures` returns `system` field (null for freeform, string for declared)
- `GET /adventures/:id` returns `system` field
- `GET /adventures` returns `system: null` for adventure that has `adventure.md` with frontmatter but no `system` field (end-to-end check that the parser's null flows through the service to the API)

To capture query options in tests, extend the mock query function pattern from `message-route.test.ts` (see the existing "fresh file read" test at line 254 which captures `systemPrompt`). Extend it to also capture the `plugins` option to verify plugin paths.

#### Step 3.4: Verify Phase 3

```bash
tsc --build                               # full workspace typecheck
bun test packages/backend/tests/          # all tests pass
```

Verify no grep hits for the old `pluginPaths` in `SessionRunnerConfig`:

```bash
grep -r 'pluginPaths.*:.*string\[\]' packages/backend/src/services/session-runner.ts
```

Expected: no matches (the field now lives only in `RunQueryParams`).

**Review gate**: Thorne reviews Phase 3 for: correct plugin resolution flow, error message format compliance with REQ-SYS-4, bootstrap reading only when declared, no bootstrap for core plugins, `pluginPaths` correctly passed per-query. Review artifact: `.lore/reviews/adventure-system-integration-phase3.md`

---

### Phase 4: Bootstrap Prompt Authoring

Creative content. No code changes. These are markdown files that the engine reads verbatim and inserts into the system prompt.

**Read Thorne's review at `.lore/reviews/adventure-system-integration-phase3.md`. Address ALL findings before starting this phase's work.**

#### Step 4.1: Author d20-system Bootstrap

**Files**: `plugins/d20-system/bootstrap.md` (new)
**Addresses**: REQ-SYS-10, REQ-SYS-11, REQ-SYS-12, REQ-SYS-14

The bootstrap establishes the AI's mental model for d20/5e-style play. Follow the structure from REQ-SYS-11:

1. **System identity**: "You are running a d20 System game." Establish the core fantasy adventure framing.
2. **Core mechanic summary**: d20 + modifier vs target number. Ability scores, proficiency bonus, advantage/disadvantage. Describe on its own terms, no comparisons.
3. **Dice convention**: Use `mcp__corvran__roll_dice` for all rolls. Explain the standard patterns with at least one concrete example invocation, e.g., an attack roll: `{ "groups": [{ "n": 1, "d": 20 }], "modifier": 5, "threshold": 15 }`. Cover: ability checks (1d20 + modifier), attack rolls (1d20 + modifier with AC threshold), damage (NdX + modifier), saving throws (1d20 + modifier vs DC).
4. **Narrative philosophy**: Heroic fantasy. Players are protagonists. Describe the world vividly, let dice determine outcomes.
5. **Key vocabulary**: AC, HP, spell slots, proficiency, advantage/disadvantage, saving throw, ability check, skill check. Use these terms naturally.
6. **Onboarding guidance**: When no character exists, guide through d20 character creation: choose a class, roll ability scores (4d6 drop lowest), select a background, name the character. When no world exists, establish a starting scenario appropriate to the characters.

**Critical constraint (REQ-SYS-12)**: Do not mention Daggerheart, FATE, Pathfinder, or any other system by name. No "unlike other systems" framing. The d20 system stands on its own terms.

**Length guidance**: Keep it focused. The bootstrap is injected into every system prompt for every message. A bootstrap over ~1000 words starts consuming meaningful context. Aim for 400-800 words covering all six areas.

**Cross-reference with existing skills**: Read the existing skill files in `plugins/d20-system/skills/` before writing. The bootstrap should frame, not repeat. Skills teach procedures (how to run combat, how to create a character). The bootstrap establishes vocabulary and philosophy. If a skill already covers "how to roll initiative," the bootstrap says "initiative determines action order" and leaves the procedure to the skill.

#### Step 4.2: Author daggerheart-system Bootstrap

**Files**: `plugins/daggerheart-system/bootstrap.md` (new)
**Addresses**: REQ-SYS-10, REQ-SYS-11, REQ-SYS-12, REQ-SYS-14

The bootstrap establishes the AI's mental model for Daggerheart. Follow the same structure:

1. **System identity**: "You are running a Daggerheart game." Establish the narrative-forward, hope-and-fear framing.
2. **Core mechanic summary**: Duality Dice (2d12, one Hope, one Fear). When Hope is higher, the player narrates a positive outcome with a complication. When Fear is higher, the GM narrates with a cost. Ties go to Hope. Add trait modifier to the total for comparison against difficulty.
3. **Dice convention**: Use `mcp__corvran__roll_dice` with labeled groups: `{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": [trait] }`. Explain that the AI checks which labeled die rolled higher to determine Hope vs Fear outcome.
4. **Narrative philosophy**: Daggerheart is built on shared narrative authority. Spotlight flows from action outcomes. Fear results give the GM narrative authority; Hope results give the player narrative authority. The game is collaborative storytelling with mechanical weight.
5. **Key vocabulary**: Hope, Fear, Duality Dice, Experiences, Domains, Armor Score, Stress, Hit Points, Evasion, Severe damage threshold, Spotlight. Use these terms exclusively.
6. **Onboarding guidance**: When no character exists, guide through Daggerheart character creation: ancestry, community, class, subclass, Experiences (narrative backgrounds that grant mechanical benefits). When no world exists, establish a starting scenario that lets the first Duality Dice roll happen naturally.

**Same constraints**: No comparative framing (REQ-SYS-12). No references to d20, D&D, or any other system. Same length guidance (400-800 words). Cross-reference existing skills to avoid repetition.

#### Step 4.3: Verify Phase 4

No code to typecheck. Verify the files exist and are well-formed:

```bash
cat plugins/d20-system/bootstrap.md | head -5    # confirm file exists and starts with content
cat plugins/daggerheart-system/bootstrap.md | head -5
```

Run the full test suite to confirm nothing is broken:

```bash
bun test packages/backend/tests/
```

**Review gate**: Thorne reviews Phase 4 for: REQ-SYS-12 compliance (no comparative framing, no other system names), coverage of all six REQ-SYS-11 areas, consistency with existing skill files (no contradictions per REQ-SYS-13), appropriate length, and correct dice tool invocation examples matching the `mcp__corvran__roll_dice` schema. Review artifact: `.lore/reviews/adventure-system-integration-phase4.md`

---

### Final Validation

After all four phases and their reviews are complete, run a final spec compliance check.

**Read Thorne's review at `.lore/reviews/adventure-system-integration-phase4.md`. Address ALL findings.**

Then run the full verification:

```bash
tsc --build                               # full workspace typecheck
bun test packages/backend/tests/          # all backend tests
```

Verify behavioral change (REQ-SYS-28): An adventure without `adventure.md` loads only corvran. An adventure with `system: daggerheart` loads corvran + daggerheart-system. An adventure with `system: d20` loads corvran + d20-system. These should be covered by the Phase 3 integration tests.

## Delegation Guide

| Phase | Worker | Expertise | Review |
|-------|--------|-----------|--------|
| Phase 1 (foundation) | Dalton | TypeScript, DI patterns, JSON parsing | Thorne |
| Phase 2 (services) | Dalton | Schema changes, prompt engineering, interface design | Thorne |
| Phase 3 (wiring) | Dalton | Route handling, DI wiring, integration testing | Thorne |
| Phase 4 (content) | Dalton | RPG system knowledge, prompt authoring | Thorne |
| Final validation | Thorne | Spec compliance across all REQ-SYS-* | — |

Phase 3 is the highest-risk phase. It changes the message handler's control flow and the app startup wiring simultaneously. The integration tests in Step 3.3 are the safety net.

Phase 4 requires RPG system knowledge. Dalton should read the existing skill files for each system before writing bootstrap prompts to avoid contradicting them. The bootstrap frames; skills teach.

## Open Questions

1. **YAML parsing approach**: The spec's `adventure.md` uses YAML frontmatter. The backend's `package.json` may not include a YAML parser. A simple regex-based parser works for the single `system` field. If future frontmatter fields are added, a proper YAML parser would be better. Decision: start with the regex approach. Dalton can check if `yaml` is available and use it if so.

2. **Warning logging mechanism**: The spec requires logging warnings for duplicate aliases (REQ-SYS-8) and malformed YAML (REQ-SYS-4a). The current codebase uses `console.log` for request logging (app.ts line 112) and `console.warn` would be appropriate. No structured logger (pino) is wired up despite being in dependencies. Use `console.warn` for consistency with the current pattern. If pino gets wired up later, these can be migrated.
