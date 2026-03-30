---
title: "Commission: Review: Phase 2 - Adventure Config and List Schema"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review Phase 2 of the adventure creation flow.\n\n**Plan**: `.lore/plans/adventure-creation-flow.md` (Phase 2, Steps 2.1-2.6)\n**Spec**: `.lore/specs/adventure-creation-flow.md`\n\nReview for:\n- Config parser correctness (REQ-ACF-7, REQ-ACF-8): name extraction, concept from body text, edge cases\n- Schema expansion (REQ-ACF-14, REQ-ACF-17): all new fields present and typed correctly\n- FileOps stat integration (REQ-ACF-16): interface, production, mock\n- Backward compatibility (REQ-ACF-26): old adventures without name/concept still work\n- characterName extraction (REQ-ACF-15): heading parsing from character.md\n- lastPlayed (REQ-ACF-16): mtime as ISO string\n- hasCharacter/hasWorld retained for Phase 4 compatibility\n- Test coverage for all new behavior\n- All tests pass, typecheck clean"
dependencies:
  - commission-Dalton-20260330-121323
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T19:13:29.257Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T19:13:29.258Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-30T19:22:23.349Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-30T19:22:23.352Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T19:22:23.376Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T19:22:31.153Z
    event: progress_report
    reason: "Starting Phase 2 review. Reading plan, spec, and predecessor commission output."
  - timestamp: 2026-03-30T19:22:57.770Z
    event: progress_report
    reason: "Plan and spec read. Now reading implementation files: adventure-config.ts, adventure-service.ts, types.ts, mock-file-ops.ts, shared schemas, and tests."
  - timestamp: 2026-03-30T19:23:23.091Z
    event: progress_report
    reason: "All source files read. Now analyzing against spec requirements: config parser, schemas, FileOps stat, adventure service, backward compatibility, tests."
  - timestamp: 2026-03-30T19:25:04.611Z
    event: progress_report
    reason: "Analysis complete. Found 1 MEDIUM defect (getAdventure ignores frontmatter name) and 2 LOW gaps (missing test coverage). Compiling findings."
  - timestamp: 2026-03-30T19:25:31.759Z
    event: result_submitted
    reason: "## Phase 2 Review: Adventure Config and List Schema Expansion\n\n### Requirement Coverage\n\n| Requirement | Status | Notes |\n|-------------|--------|-------|\n| REQ-ACF-7 | **Satisfied** | `name` field in `AdventureConfig`, extracted from frontmatter |\n| REQ-ACF-8 | **Satisfied** | Parser extracts `name`, `concept`, handles no-frontmatter edge case |\n| REQ-ACF-14 | **Partial** | List schema correct. Detail endpoint has a defect (F1) |\n| REQ-ACF-15 | **Satisfied** | `extractCharacterName` finds first non-empty line, checks `# Heading` |\n| REQ-ACF-16 | **Satisfied** | `stat` on FileOps interface, production, and mock. `lastPlayed` populated |\n| REQ-ACF-17 | **Satisfied** | `AdventureDetailSchema` has `concept` |\n| REQ-ACF-26 | **Satisfied** | `configName \\|\\| entry` fallback, null concept, characterName from heading |\n| REQ-ACF-28 | **Satisfied** | `hasCharacter`/`hasWorld` retained, Phase 3 schemas pre-defined |\n| REQ-ACF-29 | **Partial** | Config parser and service tests solid. Gaps at integration layer (F2, F3) |\n\n### Findings\n\n**F1 (MEDIUM): `getAdventure` ignores frontmatter name**\nFile: `packages/backend/src/services/adventure-service.ts:133`\n\n`getAdventure()` returns `name: id` (the raw directory name), while `listAdventures()` at line 84 correctly returns `configName || entry`. This means `GET /adventures` returns display names (\"The Healer's Burden\") but `GET /adventures/:id` returns directory slugs (\"the-healers-burden\"). The config is already parsed at line 125, but `concept` is extracted while `name` is discarded.\n\nFix: extract `config.name` alongside `config.concept` and return `name: config.name || id` in the detail response, mirroring the list behavior.\n\n**F2 (LOW): No test for `getAdventure` returning frontmatter name**\nFile: `packages/backend/tests/adventure-service.test.ts:299-314`\n\nThe `getAdventure` concept test verifies `concept` and `system` but not `name`. Even after F1 is fixed, there's no test that confirms `getAdventure` returns the frontmatter name over the directory name.\n\n**F3 (LOW): Route-level tests don't verify new list fields**\nFile: `packages/backend/tests/routes.test.ts:34-56`\n\nThe `GET /adventures` route test checks `hasCharacter`, `hasWorld`, `hasHistory` but doesn't check `concept`, `characterName`, or `lastPlayed`. The service-layer tests cover field population, but no integration test confirms the new fields serialize correctly through HTTP. A route test with an adventure.md containing a name, concept, and a character.md with a heading would close this gap.\n\n### What's Clean\n\n- **Config parser**: Regex patterns for `name` and `system` are structurally identical. Body text extraction correctly splits on closing `---` and trims. No-frontmatter fallback treats entire content as concept per spec. Edge cases (empty body, whitespace-only body, no trailing newline) all handled.\n- **FileOps.stat**: Interface, production impl (catches ENOENT), and mock (mtimes map + setMtime helper + epoch fallback) are all clean. The mock's `new Date(0)` fallback for files without explicit mtime is a reasonable default.\n- **Shared schemas**: All new fields typed correctly. Phase 3 schemas pre-defined but clearly commented. Types and index exports complete.\n- **Backward compatibility**: `configName || entry` fallback at line 84 ensures old adventures without `name` frontmatter still work. The `concept: null` default covers adventures without body text.\n- **Test coverage for config parser**: 10 new tests cover name extraction, concept extraction, multiline concept, no-frontmatter-as-concept, frontmatter-only, and combined fields. Thorough.\n- **Test coverage for adventure service**: 9 new tests cover name from frontmatter, directory fallback, concept, characterName extraction (present, absent heading, absent file), lastPlayed (with mtime, without history). The dedicated lastPlayed test with `setMtime` is well-constructed.\n- **Phase 1 findings addressed**: F1 (warning moved to startup) confirmed in commission result. F2 (empty alias check) confirmed."
  - timestamp: 2026-03-30T19:25:37.186Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Analysis complete. Found 1 MEDIUM defect (getAdventure ignores frontmatter name) and 2 LOW gaps (missing test coverage). Compiling findings."
projectName: corvran
---
## Phase 2 Review: Adventure Config and List Schema Expansion

### Requirement Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| REQ-ACF-7 | **Satisfied** | `name` field in `AdventureConfig`, extracted from frontmatter |
| REQ-ACF-8 | **Satisfied** | Parser extracts `name`, `concept`, handles no-frontmatter edge case |
| REQ-ACF-14 | **Partial** | List schema correct. Detail endpoint has a defect (F1) |
| REQ-ACF-15 | **Satisfied** | `extractCharacterName` finds first non-empty line, checks `# Heading` |
| REQ-ACF-16 | **Satisfied** | `stat` on FileOps interface, production, and mock. `lastPlayed` populated |
| REQ-ACF-17 | **Satisfied** | `AdventureDetailSchema` has `concept` |
| REQ-ACF-26 | **Satisfied** | `configName \|\| entry` fallback, null concept, characterName from heading |
| REQ-ACF-28 | **Satisfied** | `hasCharacter`/`hasWorld` retained, Phase 3 schemas pre-defined |
| REQ-ACF-29 | **Partial** | Config parser and service tests solid. Gaps at integration layer (F2, F3) |

### Findings

**F1 (MEDIUM): `getAdventure` ignores frontmatter name**
File: `packages/backend/src/services/adventure-service.ts:133`

`getAdventure()` returns `name: id` (the raw directory name), while `listAdventures()` at line 84 correctly returns `configName || entry`. This means `GET /adventures` returns display names ("The Healer's Burden") but `GET /adventures/:id` returns directory slugs ("the-healers-burden"). The config is already parsed at line 125, but `concept` is extracted while `name` is discarded.

Fix: extract `config.name` alongside `config.concept` and return `name: config.name || id` in the detail response, mirroring the list behavior.

**F2 (LOW): No test for `getAdventure` returning frontmatter name**
File: `packages/backend/tests/adventure-service.test.ts:299-314`

The `getAdventure` concept test verifies `concept` and `system` but not `name`. Even after F1 is fixed, there's no test that confirms `getAdventure` returns the frontmatter name over the directory name.

**F3 (LOW): Route-level tests don't verify new list fields**
File: `packages/backend/tests/routes.test.ts:34-56`

The `GET /adventures` route test checks `hasCharacter`, `hasWorld`, `hasHistory` but doesn't check `concept`, `characterName`, or `lastPlayed`. The service-layer tests cover field population, but no integration test confirms the new fields serialize correctly through HTTP. A route test with an adventure.md containing a name, concept, and a character.md with a heading would close this gap.

### What's Clean

- **Config parser**: Regex patterns for `name` and `system` are structurally identical. Body text extraction correctly splits on closing `---` and trims. No-frontmatter fallback treats entire content as concept per spec. Edge cases (empty body, whitespace-only body, no trailing newline) all handled.
- **FileOps.stat**: Interface, production impl (catches ENOENT), and mock (mtimes map + setMtime helper + epoch fallback) are all clean. The mock's `new Date(0)` fallback for files without explicit mtime is a reasonable default.
- **Shared schemas**: All new fields typed correctly. Phase 3 schemas pre-defined but clearly commented. Types and index exports complete.
- **Backward compatibility**: `configName || entry` fallback at line 84 ensures old adventures without `name` frontmatter still work. The `concept: null` default covers adventures without body text.
- **Test coverage for config parser**: 10 new tests cover name extraction, concept extraction, multiline concept, no-frontmatter-as-concept, frontmatter-only, and combined fields. Thorough.
- **Test coverage for adventure service**: 9 new tests cover name from frontmatter, directory fallback, concept, characterName extraction (present, absent heading, absent file), lastPlayed (with mtime, without history). The dedicated lastPlayed test with `setMtime` is well-constructed.
- **Phase 1 findings addressed**: F1 (warning moved to startup) confirmed in commission result. F2 (empty alias check) confirmed.
