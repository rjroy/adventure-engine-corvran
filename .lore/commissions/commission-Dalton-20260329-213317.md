---
title: "Commission: Adventure System Integration: Phase 1 - Foundation Modules"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 of the Adventure System Integration plan at `.lore/plans/adventure-system-integration.md`. Read the plan and spec at `.lore/specs/adventure-system-integration.md` thoroughly before starting.\n\n## What to build\n\nPhase 1 creates new modules and static files. No changes to existing code.\n\n**Step 1.1**: Create three `corvran-plugin.json` manifest files (the plan has exact JSON for each):\n- `plugins/corvran/corvran-plugin.json` (type: core)\n- `plugins/d20-system/corvran-plugin.json` (type: system, bootstrap: bootstrap.md)\n- `plugins/daggerheart-system/corvran-plugin.json` (type: system, bootstrap: bootstrap.md)\n\n**Step 1.2**: Create `packages/backend/src/services/plugin-registry.ts`\n- Types: `PluginManifest`, `PluginEntry`, `PluginRegistry`\n- Factory: `buildPluginRegistry(pluginsDir, fileOps)` that scans for manifests, builds alias map, handles duplicate alias warnings (REQ-SYS-8), separates core from system plugins\n- Uses existing `FileOps` for testability\n- Defensive parsing: try/catch on JSON.parse, skip invalid manifests with warning\n\n**Step 1.3**: Create `packages/backend/src/services/adventure-config.ts`\n- Pure function: `parseAdventureConfig(content)` returns `{ system: string | null, warning?: string }`\n- Extracts `system` from YAML frontmatter\n- Check if `yaml` package is available; if not, use regex-based parser for the single field\n- Returns `system: null` on any parse failure (REQ-SYS-4a)\n\n**Step 1.4**: Create tests:\n- `packages/backend/tests/services/plugin-registry.test.ts` - 12+ tests covering manifest parsing, registry building, alias resolution, duplicate detection\n- `packages/backend/tests/services/adventure-config.test.ts` - 8+ tests covering frontmatter extraction, missing frontmatter, malformed YAML, empty file\n\nUse `createMockFileOps` for filesystem injection in registry tests. See the plan for exact test cases.\n\n**Step 1.5**: Verify all new tests pass and all existing tests still pass:\n```bash\nbun test packages/backend/tests/services/plugin-registry.test.ts\nbun test packages/backend/tests/services/adventure-config.test.ts\nbun test packages/backend/tests/\n```\n\n## Done when\n- Three manifest JSON files exist\n- plugin-registry.ts exports `buildPluginRegistry`, types\n- adventure-config.ts exports `parseAdventureConfig`\n- All new and existing tests pass\n- TypeScript builds clean"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T04:33:17.201Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T04:33:17.203Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
