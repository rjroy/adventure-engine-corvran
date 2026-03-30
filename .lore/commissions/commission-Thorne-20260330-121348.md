---
title: "Commission: Review: Phase 3 - Creation and Systems Endpoints"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review Phase 3 of the adventure creation flow.\n\n**Plan**: `.lore/plans/adventure-creation-flow.md` (Phase 3, Steps 3.1-3.7)\n**Spec**: `.lore/specs/adventure-creation-flow.md`\n\nReview for:\n- Slugify correctness (REQ-ACF-12): all five spec examples, edge cases, fallback\n- Creation endpoint (REQ-ACF-9, REQ-ACF-10, REQ-ACF-11): validation, system check, adventure.md format, 201/400/409 responses\n- Systems endpoint (REQ-ACF-5, REQ-ACF-6): returns correct shape, excludes core plugins\n- Route/service split pattern compliance (see `.lore/reference/architecture-pattern.md`)\n- Test coverage for endpoints and utility\n- All tests pass, typecheck clean"
dependencies:
  - commission-Dalton-20260330-121340
linked_artifacts:
  - packages/backend/src/services/slugify.ts

  - packages/backend/src/services/adventure-service.ts
  - packages/backend/src/routes/system-routes.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/slugify.test.ts
  - packages/backend/tests/adventure-creation.test.ts
  - packages/backend/tests/system-routes.test.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/src/routes/system-routes.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/slugify.test.ts
  - packages/backend/tests/adventure-creation.test.ts
  - packages/backend/tests/system-routes.test.ts
activity_timeline:
  - timestamp: 2026-03-30T19:13:48.447Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:13:48.448Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T19:30:11.198Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T19:30:11.201Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T19:30:11.224Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T19:30:18.140Z
    event: progress_report
    reason: "Starting Phase 3 review. Reading plan, spec, architecture reference, and predecessor commission output."
  - timestamp: 2026-03-30T19:30:44.916Z
    event: progress_report
    reason: "Reading all Phase 3 implementation and test files for review."
  - timestamp: 2026-03-30T19:31:14.220Z
    event: progress_report
    reason: "All source and test files read. Now analyzing against spec requirements and plan steps. Checking for defects, gaps, and compliance."
  - timestamp: 2026-03-30T19:31:30.051Z
    event: progress_report
    reason: "All files reviewed. Drafting findings. Checking error message format compliance, adventure.md content format, and test coverage gaps."
  - timestamp: 2026-03-30T19:31:40.040Z
    event: progress_report
    reason: "Analysis complete. Compiling findings by severity."
  - timestamp: 2026-03-30T19:32:25.366Z
    event: result_submitted
    reason: "## Phase 3 Review: Creation and Systems Endpoints\n\n### Requirement Coverage\n\n| Requirement | Status | Notes |\n|-------------|--------|-------|\n| REQ-ACF-5 | **Satisfied** | `GET /systems` returns `{ systems: SystemInfo[] }` from plugin registry |\n| REQ-ACF-6 | **Satisfied** | System routes in `system-routes.ts`, DI factory pattern, operation definition included |\n| REQ-ACF-9 | **Satisfied** | `POST /adventures` endpoint with correct request schema |\n| REQ-ACF-10 | **Partially satisfied** | Validation present but error message format and guard logic have issues (F1, F2) |\n| REQ-ACF-11 | **Partially satisfied** | Adventure.md written but content format has a deviation (F3) |\n| REQ-ACF-12 | **Satisfied** | Slugify is correct, all five spec examples pass, edge cases covered |\n| REQ-ACF-13 | **Satisfied** | Creation endpoint lives in `adventure-routes.ts` as specified |\n\n### Findings\n\n**F1 — MEDIUM: System validation bypassed when pluginRegistry is absent**\nFile: `packages/backend/src/routes/adventure-routes.ts:80`\n\n```typescript\nif (system !== null && pluginRegistry) {\n```\n\nWhen `pluginRegistry` is not injected (it's optional in the route factory), a request with any `system` value silently passes validation. The adventure gets created referencing a system that was never verified to exist. The spec (REQ-ACF-10) says: \"If `system` is non-null, verify it exists in the plugin registry. If not, return HTTP 400.\"\n\nThe guard should fail closed. If `pluginRegistry` is absent and `system` is non-null, the endpoint should return an error, not silently accept an unverified system.\n\n**Recommendation**: Return 503 or 400 when `system` is non-null but `pluginRegistry` is not available. Example:\n\n```typescript\nif (system !== null) {\n  if (!pluginRegistry) {\n    return c.json({ error: \"System validation unavailable\" }, 503);\n  }\n  const resolved = pluginRegistry.resolveSystem(system);\n  // ...\n}\n```\n\n---\n\n**F2 — MEDIUM: Error message format diverges from spec**\nFile: `packages/backend/src/routes/adventure-routes.ts:84-86`\n\nSpec (REQ-ACF-10) says the 400 error for unknown system should be:\n> `System '<value>' is not installed. Available systems: <comma-separated alias list>.`\n\nImplementation produces:\n> `Unknown system \"<value>\". Available systems: <list>`\n\nTwo differences: (1) the phrasing (\"Unknown system\" vs \"System ... is not installed\"), (2) the value is double-quoted instead of single-quoted. The 409 message also diverges: implementation uses `Adventure directory \"<slug>\" already exists` (from `DuplicateAdventureError`) while the spec says `An adventure with this name already exists.`\n\nThis matters because the web client (Phase 4) may match on these strings for display purposes, and external consumers (CLI) will see the raw messages.\n\n**Recommendation**: Align the messages to the spec text. Particularly the 409 message, which leaks the internal slug concept to the user (\"directory\" is an implementation detail).\n\n---\n\n**F3 — LOW: `name` value in adventure.md is quoted, spec examples are unquoted**\nFile: `packages/backend/src/services/adventure-service.ts:180`\n\n```typescript\ncontent += `name: \"${params.name}\"\\n`;\n```\n\nThe spec examples in REQ-ACF-11 show:\n```\nname: The Healer's Burden\n```\n\nThe implementation writes:\n```\nname: \"The Healer's Burden\"\n```\n\nThe current `parseAdventureConfig` regex handles both (`\"?([^\"\\n]*)\"?`), so this doesn't break read-back. But it creates an asymmetry: names containing double quotes would be mangled, and the written format doesn't match the spec. The `system` field is written without quotes on line 182, so the inconsistency is within the same function.\n\n**Recommendation**: Remove the quotes to match the spec: `content += \\`name: ${params.name}\\\\n\\`;`. If the name can contain characters that break YAML parsing, that's a separate concern for the parser, which is already regex-based and doesn't do full YAML parsing.\n\n---\n\n**F4 — LOW: No test verifies the content of the written adventure.md file**\n\nThe creation tests (`adventure-creation.test.ts`) verify the HTTP response shape but never read back the file from the mock store to verify what was actually written. The service could write malformed content and still pass all tests as long as the return value is correct.\n\nThe plan (Step 3.6) says: \"Create with system + concept + name: 201, directory created, adventure.md correct.\" The \"adventure.md correct\" part is untested.\n\n**Recommendation**: Add assertions that read the written file from the mock file ops store and verify the content matches the spec examples. The mock already exposes `getStore()` for this purpose. At minimum, test the three spec variants: full (system + concept), freeform with concept, freeform without concept.\n\n---\n\n**F5 — LOW: `excludes core plugins` test doesn't test what its name claims**\nFile: `packages/backend/tests/system-routes.test.ts:36-50`\n\nThe test is named \"excludes core plugins (only systems returned)\" but the exclusion logic lives in `buildPluginRegistry`, not in the route. The test constructs a mock registry that already filters out core plugins from `availableSystems()`. It verifies that `GET /systems` returns whatever the mock says, which is true by construction.\n\nThis test validates that the route passes data through from the registry. It does not validate that core plugins are excluded. That logic is tested elsewhere (or should be, in the plugin registry tests).\n\nThe test name is misleading. It should be named something like \"returns whatever availableSystems provides\" or the test should be in the plugin registry test file with a real registry.\n\n**Recommendation**: Rename the test to reflect what it actually verifies, or accept that the core plugin exclusion is a registry concern tested in registry tests.\n\n---\n\n**F6 — INFO: Route/service split pattern compliance**\n\nBoth `system-routes.ts` and the additions to `adventure-routes.ts` follow the DI factory pattern correctly. Dependencies are injected, not imported. Operation definitions are exported. The app wiring in `app.ts` conditionally creates system routes when `pluginRegistry` is provided, matching the existing optional-dependency pattern.\n\nThe shared schemas (`SystemInfoSchema`, `SystemsResponseSchema`, `CreateAdventureRequestSchema`, `CreateAdventureResponseSchema`) are defined in the shared package and properly exported. Types are inferred from schemas.\n\n---\n\n### Summary\n\nTwo MEDIUM findings (F1: fail-open system validation, F2: error message divergence from spec). Three LOW findings (F3: quoted name field, F4: no file content verification in tests, F5: misleading test name). Pattern compliance is clean."
  - timestamp: 2026-03-30T19:32:31.756Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Analysis complete. Compiling findings by severity."
projectName: corvran
---
## Phase 3 Review: Creation and Systems Endpoints

### Requirement Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| REQ-ACF-5 | **Satisfied** | `GET /systems` returns `{ systems: SystemInfo[] }` from plugin registry |
| REQ-ACF-6 | **Satisfied** | System routes in `system-routes.ts`, DI factory pattern, operation definition included |
| REQ-ACF-9 | **Satisfied** | `POST /adventures` endpoint with correct request schema |
| REQ-ACF-10 | **Partially satisfied** | Validation present but error message format and guard logic have issues (F1, F2) |
| REQ-ACF-11 | **Partially satisfied** | Adventure.md written but content format has a deviation (F3) |
| REQ-ACF-12 | **Satisfied** | Slugify is correct, all five spec examples pass, edge cases covered |
| REQ-ACF-13 | **Satisfied** | Creation endpoint lives in `adventure-routes.ts` as specified |

### Findings

**F1 — MEDIUM: System validation bypassed when pluginRegistry is absent**
File: `packages/backend/src/routes/adventure-routes.ts:80`

```typescript
if (system !== null && pluginRegistry) {
```

When `pluginRegistry` is not injected (it's optional in the route factory), a request with any `system` value silently passes validation. The adventure gets created referencing a system that was never verified to exist. The spec (REQ-ACF-10) says: "If `system` is non-null, verify it exists in the plugin registry. If not, return HTTP 400."

The guard should fail closed. If `pluginRegistry` is absent and `system` is non-null, the endpoint should return an error, not silently accept an unverified system.

**Recommendation**: Return 503 or 400 when `system` is non-null but `pluginRegistry` is not available. Example:

```typescript
if (system !== null) {
  if (!pluginRegistry) {
    return c.json({ error: "System validation unavailable" }, 503);
  }
  const resolved = pluginRegistry.resolveSystem(system);
  // ...
}
```

---

**F2 — MEDIUM: Error message format diverges from spec**
File: `packages/backend/src/routes/adventure-routes.ts:84-86`

Spec (REQ-ACF-10) says the 400 error for unknown system should be:
> `System '<value>' is not installed. Available systems: <comma-separated alias list>.`

Implementation produces:
> `Unknown system "<value>". Available systems: <list>`

Two differences: (1) the phrasing ("Unknown system" vs "System ... is not installed"), (2) the value is double-quoted instead of single-quoted. The 409 message also diverges: implementation uses `Adventure directory "<slug>" already exists` (from `DuplicateAdventureError`) while the spec says `An adventure with this name already exists.`

This matters because the web client (Phase 4) may match on these strings for display purposes, and external consumers (CLI) will see the raw messages.

**Recommendation**: Align the messages to the spec text. Particularly the 409 message, which leaks the internal slug concept to the user ("directory" is an implementation detail).

---

**F3 — LOW: `name` value in adventure.md is quoted, spec examples are unquoted**
File: `packages/backend/src/services/adventure-service.ts:180`

```typescript
content += `name: "${params.name}"\n`;
```

The spec examples in REQ-ACF-11 show:
```
name: The Healer's Burden
```

The implementation writes:
```
name: "The Healer's Burden"
```

The current `parseAdventureConfig` regex handles both (`"?([^"\n]*)"?`), so this doesn't break read-back. But it creates an asymmetry: names containing double quotes would be mangled, and the written format doesn't match the spec. The `system` field is written without quotes on line 182, so the inconsistency is within the same function.

**Recommendation**: Remove the quotes to match the spec: `content += \`name: ${params.name}\\n\`;`. If the name can contain characters that break YAML parsing, that's a separate concern for the parser, which is already regex-based and doesn't do full YAML parsing.

---

**F4 — LOW: No test verifies the content of the written adventure.md file**

The creation tests (`adventure-creation.test.ts`) verify the HTTP response shape but never read back the file from the mock store to verify what was actually written. The service could write malformed content and still pass all tests as long as the return value is correct.

The plan (Step 3.6) says: "Create with system + concept + name: 201, directory created, adventure.md correct." The "adventure.md correct" part is untested.

**Recommendation**: Add assertions that read the written file from the mock file ops store and verify the content matches the spec examples. The mock already exposes `getStore()` for this purpose. At minimum, test the three spec variants: full (system + concept), freeform with concept, freeform without concept.

---

**F5 — LOW: `excludes core plugins` test doesn't test what its name claims**
File: `packages/backend/tests/system-routes.test.ts:36-50`

The test is named "excludes core plugins (only systems returned)" but the exclusion logic lives in `buildPluginRegistry`, not in the route. The test constructs a mock registry that already filters out core plugins from `availableSystems()`. It verifies that `GET /systems` returns whatever the mock says, which is true by construction.

This test validates that the route passes data through from the registry. It does not validate that core plugins are excluded. That logic is tested elsewhere (or should be, in the plugin registry tests).

The test name is misleading. It should be named something like "returns whatever availableSystems provides" or the test should be in the plugin registry test file with a real registry.

**Recommendation**: Rename the test to reflect what it actually verifies, or accept that the core plugin exclusion is a registry concern tested in registry tests.

---

**F6 — INFO: Route/service split pattern compliance**

Both `system-routes.ts` and the additions to `adventure-routes.ts` follow the DI factory pattern correctly. Dependencies are injected, not imported. Operation definitions are exported. The app wiring in `app.ts` conditionally creates system routes when `pluginRegistry` is provided, matching the existing optional-dependency pattern.

The shared schemas (`SystemInfoSchema`, `SystemsResponseSchema`, `CreateAdventureRequestSchema`, `CreateAdventureResponseSchema`) are defined in the shared package and properly exported. Types are inferred from schemas.

---

### Summary

Two MEDIUM findings (F1: fail-open system validation, F2: error message divergence from spec). Three LOW findings (F3: quoted name field, F4: no file content verification in tests, F5: misleading test name). Pattern compliance is clean.
