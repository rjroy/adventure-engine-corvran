---
title: "Commission: Phase 1: Plugin Manifest Schema Migration"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the adventure creation flow plan at `.lore/plans/adventure-creation-flow.md`.\n\n## Scope\n\nPhase 1: Plugin Manifest Schema Migration. Updates `aliases: string[]` to `alias: string`, adds `description` field, migrates all three manifests, updates the registry. Backend-only.\n\nRead the full plan for Phase 1 details (Steps 1.1-1.5). Key changes:\n\n1. **Update all three plugin manifests** (`plugins/*/corvran-plugin.json`): Replace `aliases` array with `alias` string, add `description` to system plugins.\n2. **Update plugin registry** (`packages/backend/src/services/plugin-registry.ts`): `PluginManifest` interface, `isValidManifest`, alias map construction, `availableAliases()` becomes `availableSystems()` returning `SystemInfo[]`.\n3. **Update call sites**: `adventure-routes.ts` line 123 error message.\n4. **Update all tests**: Registry tests, any mock `PluginRegistry` in route tests.\n\n## Verification\n\nAll backend tests pass. `bun run build` typechecks clean."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T19:12:59.134Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:12:59.135Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
