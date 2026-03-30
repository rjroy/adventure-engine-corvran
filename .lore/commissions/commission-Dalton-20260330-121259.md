---
title: "Commission: Phase 1: Plugin Manifest Schema Migration"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n## Scope\n\nPhase 1: Plugin Manifest Schema Migration. Updates `aliases: string[]` to `alias: string`, adds `description` field, migrates all three manifests, updates the registry. Backend-only.\n\nRead the full plan for Phase 1 details (Steps 1.1-1.5). Key changes:\n\n1. **Update all three plugin manifests** (`plugins/*/corvran-plugin.json`): Replace `aliases` array with `alias` string, add `description` to system plugins.\n2. **Update plugin registry** (`packages/backend/src/services/plugin-registry.ts`): `PluginManifest` interface, `isValidManifest`, alias map construction, `availableAliases()` becomes `availableSystems()` returning `SystemInfo[]`.\n3. **Update call sites**: `adventure-routes.ts` line 123 error message.\n4. **Update all tests**: Registry tests, any mock `PluginRegistry` in route tests.\n\n## Verification\n\nAll backend tests pass. `bun run build` typechecks clean."
dependencies: []
linked_artifacts:
  - plugins/corvran/corvran-plugin.json

  - plugins/d20-system/corvran-plugin.json
  - plugins/daggerheart-system/corvran-plugin.json
  - packages/backend/src/services/plugin-registry.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/tests/services/plugin-registry.test.ts
  - packages/backend/tests/message-route.test.ts
  - plugins/d20-system/corvran-plugin.json
  - plugins/daggerheart-system/corvran-plugin.json
  - packages/backend/src/services/plugin-registry.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/tests/services/plugin-registry.test.ts
  - packages/backend/tests/message-route.test.ts
activity_timeline:
  - timestamp: 2026-03-30T19:12:59.134Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:12:59.135Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T19:12:59.162Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T19:13:31.730Z
    event: progress_report
    reason: "Read plan and all source files. Starting implementation: three manifests, registry, call sites, tests."
  - timestamp: 2026-03-30T19:15:19.650Z
    event: result_submitted
    reason: "Phase 1 complete. All changes made together as a breaking change:\n\n**Manifests** (Step 1.1): All three `corvran-plugin.json` files migrated from `aliases: string[]` to `alias: string`. System plugins gained `description` fields.\n\n**Registry** (Step 1.2): `PluginManifest.aliases` replaced with `alias: string` + optional `description`. `isValidManifest` checks `typeof obj.alias === \"string\"`. Alias map construction simplified from loop to single set. New `SystemInfo` type exported. `availableAliases()` replaced by `availableSystems()` returning `SystemInfo[]`, which excludes system plugins without `description` (with warning).\n\n**Call sites** (Step 1.3): `adventure-routes.ts` line 123 updated to `.availableSystems().map(s => s.alias).join(\", \")`.\n\n**Tests** (Step 1.4): All registry tests updated to use `alias` string. Added two new tests: `availableSystems` returns `SystemInfo[]` for described systems, and excludes/warns for undescribed systems. Message-route mock registry updated to use new interface.\n\n**Verification** (Step 1.5): 113 backend tests pass, `bun run build` typechecks and builds clean."
  - timestamp: 2026-03-30T19:15:25.234Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read plan and all source files. Starting implementation: three manifests, registry, call sites, tests."
projectName: corvran
---
Phase 1 complete. All changes made together as a breaking change:

**Manifests** (Step 1.1): All three `corvran-plugin.json` files migrated from `aliases: string[]` to `alias: string`. System plugins gained `description` fields.

**Registry** (Step 1.2): `PluginManifest.aliases` replaced with `alias: string` + optional `description`. `isValidManifest` checks `typeof obj.alias === "string"`. Alias map construction simplified from loop to single set. New `SystemInfo` type exported. `availableAliases()` replaced by `availableSystems()` returning `SystemInfo[]`, which excludes system plugins without `description` (with warning).

**Call sites** (Step 1.3): `adventure-routes.ts` line 123 updated to `.availableSystems().map(s => s.alias).join(", ")`.

**Tests** (Step 1.4): All registry tests updated to use `alias` string. Added two new tests: `availableSystems` returns `SystemInfo[]` for described systems, and excludes/warns for undescribed systems. Message-route mock registry updated to use new interface.

**Verification** (Step 1.5): 113 backend tests pass, `bun run build` typechecks and builds clean.
