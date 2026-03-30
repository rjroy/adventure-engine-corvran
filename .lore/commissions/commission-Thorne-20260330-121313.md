---
title: "Commission: Review: Phase 1 - Plugin Manifest Schema Migration"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review Phase 1 of the adventure creation flow.\n\n**Plan**: `.lore/plans/adventure-creation-flow.md` (Phase 1, Steps 1.1-1.5)\n**Spec**: `.lore/specs/adventure-creation-flow.md`\n\nReview for:\n- Manifest schema compliance (REQ-ACF-1, REQ-ACF-2, REQ-ACF-27)\n- Registry API completeness (REQ-ACF-3, REQ-ACF-4)\n- Call site migration (no remaining references to `availableAliases` or `aliases`)\n- Test coverage of new `availableSystems()` behavior\n- All backend tests pass, typecheck clean"
dependencies:
  - commission-Dalton-20260330-121259
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
  - timestamp: 2026-03-30T19:13:13.016Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:13:13.018Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T19:15:25.545Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T19:15:25.550Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T19:15:25.575Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T19:15:32.078Z
    event: progress_report
    reason: "Starting Phase 1 review. Reading plan, spec, and predecessor commission output."
  - timestamp: 2026-03-30T19:15:52.278Z
    event: progress_report
    reason: "Read all implementation files. Now reading tests and checking for stale references to old schema."
  - timestamp: 2026-03-30T19:16:22.099Z
    event: progress_report
    reason: "All diffs reviewed. Checking for any stale references across the full codebase and examining the shared schemas."
  - timestamp: 2026-03-30T19:16:39.426Z
    event: progress_report
    reason: "All source files, diffs, and tests reviewed. Compiling findings."
  - timestamp: 2026-03-30T19:17:11.701Z
    event: result_submitted
    reason: "## Phase 1 Review: Plugin Manifest Schema Migration\n\n### Requirement Compliance\n\n| Requirement | Status | Evidence |\n|-------------|--------|----------|\n| REQ-ACF-1: `aliases` → `alias` in manifest schema | **SATISFIED** | `PluginManifest.alias: string` at `plugin-registry.ts:6`. `isValidManifest` checks `typeof obj.alias !== \"string\"` at line 36. |\n| REQ-ACF-2: All three manifests updated | **SATISFIED** | All three `corvran-plugin.json` files match the spec exactly. corvran has `alias` only, d20-system and daggerheart-system have `alias`, `description`, and `bootstrap`. Descriptions match spec verbatim. |\n| REQ-ACF-3: Registry reads `alias` instead of `aliases` | **SATISFIED** | Alias map construction at lines 87-93 uses `parsed.alias` (single insert). Duplicate detection compares against single alias. |\n| REQ-ACF-4: `availableSystems()` replaces `availableAliases()` | **SATISFIED** | Interface at line 24 declares `availableSystems(): SystemInfo[]`. Implementation at lines 103-116 filters by type=system, excludes missing descriptions with warning. |\n| REQ-ACF-27: Breaking change, all files updated together | **SATISFIED** | Single commit updates all manifests, registry, call site, and tests simultaneously. |\n\n### Call Site Migration\n\nNo remaining references to `availableAliases` in any source file under `packages/` or `plugins/`. The only occurrences are in `.lore/` documentation (specs, plans, brainstorm), which correctly describe the old state. The call site in `adventure-routes.ts:123` now uses `pluginRegistry.availableSystems().map(s => s.alias).join(\", \")`, which matches the spec's \"use `availableSystems().map(s => s.alias)` or equivalent.\"\n\n### Test Coverage\n\nREQ-ACF-29 specifies four test areas for Phase 1:\n\n| Test Area | Status | Evidence |\n|-----------|--------|----------|\n| Parse manifest with `alias` (string) | **COVERED** | \"parses a valid manifest with all fields\" test at line 17 |\n| Reject manifest with missing `alias` | **COVERED** | \"skips manifest with missing alias field and warns\" test at line 96 |\n| `availableSystems()` returns `SystemInfo[]` | **COVERED** | \"availableSystems returns SystemInfo for system plugins with description\" test at line 187 |\n| Exclude system plugins missing `description` with warning | **COVERED** | \"availableSystems excludes system plugins without description and warns\" test at line 208 |\n\nMock registry in `message-route.test.ts` updated to use new interface (lines 24-53), including `description` fields and `availableSystems()` returning `SystemInfo[]`.\n\n### Findings\n\n**F1 — MEDIUM: `availableSystems()` warns on every call, not once at startup.**\nFile: `plugin-registry.ts:107-110`\n\nThe warning for a system plugin missing a description fires inside `availableSystems()`, which runs on every call (system picker load, error message construction, etc.). The same warning will repeat every time the method is called. This is a log-spam concern, not a correctness bug.\n\nTwo options: (a) move the warning to `buildPluginRegistry()` so it fires once during startup and filter the systems list from a pre-computed list, or (b) accept the repetition since `availableSystems()` is called infrequently in practice. The spec says \"a warning is logged\" without specifying frequency. Flag for awareness; the implementer of Phase 3 should decide whether the repetition matters once `GET /systems` exists.\n\n**F2 — LOW: `isValidManifest` does not validate `alias` is non-empty.**\nFile: `plugin-registry.ts:36`\n\nThe check is `typeof obj.alias !== \"string\"`, which passes for `\"\"`. An empty-string alias would be inserted into the alias map and be resolvable by `resolveSystem(\"\")`. The spec says `alias` is \"the name adventure.md uses to select this plugin,\" implying it should be non-empty. An empty alias is nonsensical, but in practice no manifest will have one since they're committed to the repo. Defensive, not urgent.\n\n**F3 — LOW: No test for `description` field in `PluginManifest` interface optionality.**\nThe test \"parses a manifest without optional bootstrap field\" (line 36) verifies that `bootstrap` can be omitted, but there's no symmetric test confirming that `description` is optional at the interface level (that a core plugin without `description` is accepted). This is implicitly covered by the core plugin test fixtures not having `description`, but it's not explicitly asserted. Low risk since `isValidManifest` doesn't check for `description`.\n\n### Verdict\n\nPhase 1 is clean. All five requirements are satisfied, call site migration is complete, test coverage matches the spec's expectations. The two LOW findings (F2, F3) are edge-case hardening, not defects. F1 is the only finding worth tracking into Phase 3."
  - timestamp: 2026-03-30T19:17:17.219Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All source files, diffs, and tests reviewed. Compiling findings."
projectName: corvran
---
## Phase 1 Review: Plugin Manifest Schema Migration

### Requirement Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-ACF-1: `aliases` → `alias` in manifest schema | **SATISFIED** | `PluginManifest.alias: string` at `plugin-registry.ts:6`. `isValidManifest` checks `typeof obj.alias !== "string"` at line 36. |
| REQ-ACF-2: All three manifests updated | **SATISFIED** | All three `corvran-plugin.json` files match the spec exactly. corvran has `alias` only, d20-system and daggerheart-system have `alias`, `description`, and `bootstrap`. Descriptions match spec verbatim. |
| REQ-ACF-3: Registry reads `alias` instead of `aliases` | **SATISFIED** | Alias map construction at lines 87-93 uses `parsed.alias` (single insert). Duplicate detection compares against single alias. |
| REQ-ACF-4: `availableSystems()` replaces `availableAliases()` | **SATISFIED** | Interface at line 24 declares `availableSystems(): SystemInfo[]`. Implementation at lines 103-116 filters by type=system, excludes missing descriptions with warning. |
| REQ-ACF-27: Breaking change, all files updated together | **SATISFIED** | Single commit updates all manifests, registry, call site, and tests simultaneously. |

### Call Site Migration

No remaining references to `availableAliases` in any source file under `packages/` or `plugins/`. The only occurrences are in `.lore/` documentation (specs, plans, brainstorm), which correctly describe the old state. The call site in `adventure-routes.ts:123` now uses `pluginRegistry.availableSystems().map(s => s.alias).join(", ")`, which matches the spec's "use `availableSystems().map(s => s.alias)` or equivalent."

### Test Coverage

REQ-ACF-29 specifies four test areas for Phase 1:

| Test Area | Status | Evidence |
|-----------|--------|----------|
| Parse manifest with `alias` (string) | **COVERED** | "parses a valid manifest with all fields" test at line 17 |
| Reject manifest with missing `alias` | **COVERED** | "skips manifest with missing alias field and warns" test at line 96 |
| `availableSystems()` returns `SystemInfo[]` | **COVERED** | "availableSystems returns SystemInfo for system plugins with description" test at line 187 |
| Exclude system plugins missing `description` with warning | **COVERED** | "availableSystems excludes system plugins without description and warns" test at line 208 |

Mock registry in `message-route.test.ts` updated to use new interface (lines 24-53), including `description` fields and `availableSystems()` returning `SystemInfo[]`.

### Findings

**F1 — MEDIUM: `availableSystems()` warns on every call, not once at startup.**
File: `plugin-registry.ts:107-110`

The warning for a system plugin missing a description fires inside `availableSystems()`, which runs on every call (system picker load, error message construction, etc.). The same warning will repeat every time the method is called. This is a log-spam concern, not a correctness bug.

Two options: (a) move the warning to `buildPluginRegistry()` so it fires once during startup and filter the systems list from a pre-computed list, or (b) accept the repetition since `availableSystems()` is called infrequently in practice. The spec says "a warning is logged" without specifying frequency. Flag for awareness; the implementer of Phase 3 should decide whether the repetition matters once `GET /systems` exists.

**F2 — LOW: `isValidManifest` does not validate `alias` is non-empty.**
File: `plugin-registry.ts:36`

The check is `typeof obj.alias !== "string"`, which passes for `""`. An empty-string alias would be inserted into the alias map and be resolvable by `resolveSystem("")`. The spec says `alias` is "the name adventure.md uses to select this plugin," implying it should be non-empty. An empty alias is nonsensical, but in practice no manifest will have one since they're committed to the repo. Defensive, not urgent.

**F3 — LOW: No test for `description` field in `PluginManifest` interface optionality.**
The test "parses a manifest without optional bootstrap field" (line 36) verifies that `bootstrap` can be omitted, but there's no symmetric test confirming that `description` is optional at the interface level (that a core plugin without `description` is accepted). This is implicitly covered by the core plugin test fixtures not having `description`, but it's not explicitly asserted. Low risk since `isValidManifest` doesn't check for `description`.

### Verdict

Phase 1 is clean. All five requirements are satisfied, call site migration is complete, test coverage matches the spec's expectations. The two LOW findings (F2, F3) are edge-case hardening, not defects. F1 is the only finding worth tracking into Phase 3.
