---
title: "Commission: Dynamic Mood System: Backend Review (Phases 1-5)"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the backend implementation of the dynamic mood system (Phases 1-5).\n\nRead the plan at `.lore/plans/dynamic-mood-system.md` and spec at `.lore/specs/dynamic-mood-system.md` for requirements context.\n\nCheck specifically:\n- `setMood` frontmatter write logic handles all edge cases (missing fields, existing fields, no `mood_image` on fallback)\n- Session runner restructure doesn't regress existing tests (especially message-route tests)\n- SSE suppression for `set_mood` is correctly scoped (uses `toolName`, not `block.content`)\n- Image endpoint returns 404 gracefully when adventure exists but has no mood image\n- `REPLICATE_API_TOKEN` absence is handled at `generateMoodImage` level, not at the tool level\n- `downloadImage` timeout is consistent with the 30s Replicate call budget\n- No `mock.module()` usage anywhere\n- Two tools in one MCP server works correctly with the SDK\n- All test coverage requirements from the plan are met\n- Type safety across shared/backend boundary\n\nReport ALL findings with severity. Capture findings in your commission result body."
dependencies:
  - commission-Dalton-20260331-062356
linked_artifacts:
  - packages/backend/src/services/mood-tool.ts

  - packages/backend/src/services/image-gen.ts
  - packages/backend/src/services/color-extract.ts
  - packages/backend/src/services/adventure-config.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/tests/services/mood-tool.test.ts
  - packages/backend/tests/services/image-gen.test.ts
  - packages/backend/tests/services/color-extract.test.ts
  - packages/backend/tests/services/adventure-config.test.ts
  - packages/backend/tests/services/adventure-service-mood.test.ts
  - packages/backend/tests/message-route.test.ts
  - packages/shared/src/schemas/adventures.ts
  - packages/backend/src/services/image-gen.ts
  - packages/backend/src/services/color-extract.ts
  - packages/backend/src/services/adventure-config.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/tests/services/mood-tool.test.ts
  - packages/backend/tests/services/image-gen.test.ts
  - packages/backend/tests/services/color-extract.test.ts
  - packages/backend/tests/services/adventure-config.test.ts
  - packages/backend/tests/services/adventure-service-mood.test.ts
  - packages/backend/tests/message-route.test.ts
  - packages/shared/src/schemas/adventures.ts
activity_timeline:
  - timestamp: 2026-03-31T13:24:07.327Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T13:31:51.890Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-31T13:39:15.227Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-31T13:39:15.230Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-31T13:39:15.254Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T13:39:23.208Z
    event: progress_report
    reason: "Starting review of dynamic mood system (Phases 1-5). Reading plan, spec, and predecessor commission."
  - timestamp: 2026-03-31T13:39:49.868Z
    event: progress_report
    reason: "Read all core implementation files. Now reading test files, shared schemas, adventure service setMood, dice-tool refactor, and types."
  - timestamp: 2026-03-31T13:40:23.203Z
    event: progress_report
    reason: "Read all implementation and test files. Now analyzing for findings against spec requirements. Checking getAdventure for currentMood mapping, image-gen auth header, keyword table divergence from spec, and setMood edge cases."
  - timestamp: 2026-03-31T13:42:45.906Z
    event: progress_report
    reason: "All code reviewed. 10 findings recorded. Compiling final requirement coverage assessment and submitting result."
  - timestamp: 2026-03-31T13:43:50.732Z
    event: result_submitted
    reason: "# Dynamic Mood System: Backend Review (Phases 1-5)\n\n## Summary\n\nThe implementation is structurally sound. The architectural decisions (two tools in one MCP server, stream reference via closure, DI for all external dependencies) are executed cleanly. No `mock.module()` usage. Type safety across the shared/backend boundary is maintained. Existing message-route tests are preserved and extended. Test coverage is substantial.\n\nThere are 10 findings. Two are MEDIUM, the rest are LOW or informational.\n\n---\n\n## Findings (Priority Order)\n\n### F1 — MEDIUM: Keyword-to-hue table diverges from spec\n\n**File:** `packages/backend/src/services/mood-tool.ts:27-38`\n**Spec:** REQ-MOOD-17\n\nThe implementation's `KEYWORD_HUE_TABLE` does not match the spec. Different keyword groups, different hue values, different keywords within groups.\n\n| Aspect | Spec | Implementation |\n|---|---|---|\n| fire hue | 20 | 25 |\n| blood hue | 5 | 10 |\n| ice hue | 205 | 200 |\n| desert hue | 50 | 55 |\n| Missing groups | — | sky(195), night(270), magic(300), poison(120) |\n| Added groups | — | storm(250), shadow(285), holy(85), death(310) |\n\nSpec keywords like \"lava\", \"ember\", \"river\", \"dawn\", \"sunrise\", \"void\", \"abyss\", \"glacier\", \"tundra\", \"arcane\", \"mystical\", \"ethereal\", \"fey\", \"plague\", \"rot\", \"corruption\" are absent. Implementation adds \"blaze\", \"rage\", \"anger\", \"fury\", \"wrath\", \"grove\", \"woodland\", \"wave\", \"storm\", \"thunder\", \"lightning\", \"tempest\", \"gloom\", \"dread\", \"holy\", \"divine\", \"sacred\", \"celestial\", \"necro\", \"corpse\", \"barren\" which are not in the spec.\n\nThe tests validate the implementation's table, not the spec's. They would pass even though the spec is not satisfied.\n\n**Action:** Align the table to the spec, or update the spec to reflect the deliberate redesign if these groups are preferred.\n\n---\n\n### F2 — MEDIUM: Quoted descriptions corrupt on roundtrip\n\n**File:** `packages/backend/src/services/adventure-service.ts:240`\n\n`setMood` writes `mood_description: \"${mood.description}\"`. If the description contains double quotes (plausible: place names, dialogue references), the YAML line becomes malformed: `mood_description: \"A tavern called \"The Dragon\"\"`. `parseAdventureConfig`'s regex captures `([^\"\\n]*)` inside double quotes, so it truncates at the first inner quote.\n\nThis is a data corruption bug on the write-read roundtrip. The mood description read back on next page load will be truncated.\n\n**Action:** Escape double quotes in the description before writing (e.g., `description.replace(/\"/g, '\\\\\"')`), or use unquoted YAML values and strip quotes on read only.\n\n---\n\n### F3 — LOW: Replicate Authorization header format\n\n**File:** `packages/backend/src/services/image-gen.ts:20`\n**Spec:** REQ-MOOD-11\n\nSpec says `Authorization: Token ${REPLICATE_API_TOKEN}`. Implementation uses `Bearer ${token}`. Replicate accepts both in practice, but this deviates from spec. If Replicate ever tightens validation on the header format, all image generation silently fails (falls back to keyword hue).\n\n**Action:** Change to `Token ${token}` to match spec and Replicate's documented convention.\n\n---\n\n### F4 — LOW: setMood malformed frontmatter recovery produces corrupt output\n\n**File:** `packages/backend/src/services/adventure-service.ts:209-220`\n\nWhen `adventure.md` starts with `---` but has no closing `---` (malformed), the recovery path prepends `---\\n---\\n` to content that already starts with `---`. This produces `---\\n---\\n---\\n<original>`, where the re-parse logic creates a nonsensical frontmatter block. The mood fields get appended to a fragment, producing a corrupt file.\n\nThis is an unlikely edge case (manually corrupted frontmatter), but when triggered it worsens the corruption instead of recovering.\n\n**Action:** In the malformed case, either strip the existing `---` before prepending, or create a clean frontmatter block from scratch while preserving the content body.\n\n---\n\n### F5 — LOW: Missing REPLICATE_API_TOKEN produces no diagnostic output\n\n**File:** `packages/backend/src/services/image-gen.ts:13-14`\n**Spec:** REQ-MOOD-14\n\nSpec says \"If the variable is absent at server startup, log a WARN.\" Implementation checks per-call and returns null silently. Functionally equivalent (all calls fall back), but produces no log output. A developer debugging \"why are all my moods using fallback hue?\" gets no signal.\n\n**Action:** Add `console.warn` when the token is absent, or check at startup per spec.\n\n---\n\n### F6 — LOW: mood-image endpoint doesn't distinguish \"adventure not found\" from \"no mood image\"\n\n**File:** `packages/backend/src/routes/adventure-routes.ts:302-318`\n**Spec:** REQ-MOOD-25\n\nThe endpoint returns 404 \"No mood image\" whether the adventure doesn't exist or the image hasn't been generated. The spec says the error body should distinguish between the two. The HTTP status is correct in both cases; only the error message is imprecise.\n\n**Action:** Add `adventureService.getAdventure(id)` check before the file check, returning a distinct error message for nonexistent adventures.\n\n---\n\n### F7 — LOW: color-extract.ts bypasses FileOps DI\n\n**File:** `packages/backend/src/services/color-extract.ts:18`\n\nUses `Bun.file(imagePath).arrayBuffer()` directly instead of the `FileOps` abstraction. Tests write real temp files. This works but breaks the codebase's DI pattern. The mood-tool injects `extractHue` so this doesn't affect mood-tool testability, only color-extract's own tests.\n\n**Action:** Accept the inconsistency (temp file tests are fine for image processing) or inject a read function for consistency.\n\n---\n\n### F8 — INFORMATIONAL: downloadImage and generateMoodImage both have 30s timeouts\n\n**File:** `packages/backend/src/services/session-runner.ts:30`, `packages/backend/src/services/image-gen.ts:26`\n\nTotal worst-case latency for one mood change is 60 seconds (30s Replicate + 30s download). The spec's 30s budget at REQ-MOOD-14 refers to the Replicate call only. The download should be fast (CDN), so this is unlikely to hit in practice.\n\n**Action:** None required. Informational.\n\n---\n\n### F9 — INFORMATIONAL: null-to-undefined coercion for imagePath\n\n**File:** `packages/backend/src/services/adventure-service.ts:139`\n\n`imagePath: config.mood.imagePath ?? undefined` coerces `null` (from `AdventureConfig`) to `undefined` (for `MoodState` which uses `z.string().optional()`). This works but relies on implicit type knowledge. TypeScript would catch a mismatch if the schema changed. Low risk.\n\n**Action:** None required.\n\n---\n\n## Requirement Coverage (Phases 1-5 only)\n\n| Requirement | Status | Notes |\n|---|---|---|\n| REQ-MOOD-01 | PASS | MoodStateSchema in shared |\n| REQ-MOOD-02 | PASS | MoodEventSchema in shared |\n| REQ-MOOD-03 | PASS | AdventureDetailSchema.currentMood |\n| REQ-MOOD-04 | PASS | AdventureConfig extended |\n| REQ-MOOD-05 | PASS | Frontmatter fields parsed |\n| REQ-MOOD-06 | PASS | set_mood registered |\n| REQ-MOOD-07 | PASS | Input schema matches |\n| REQ-MOOD-08 | PASS | Tool output strings correct |\n| REQ-MOOD-09 | PASS | Session runner wires both tools |\n| REQ-MOOD-10 | PASS | Handler execution order correct |\n| REQ-MOOD-11 | PARTIAL | Auth header format differs (F3) |\n| REQ-MOOD-12 | PASS | Prompt construction correct |\n| REQ-MOOD-13 | PASS | Image saved to mood.png |\n| REQ-MOOD-14 | PARTIAL | No startup WARN log (F5) |\n| REQ-MOOD-15 | PASS | Dominant hue extraction implemented |\n| REQ-MOOD-16 | PASS | culori/fn used correctly |\n| REQ-MOOD-17 | FAIL | Keyword table diverges (F1) |\n| REQ-MOOD-18 | PASS | mood event type, no tool_use |\n| REQ-MOOD-19 | PASS | Event payload correct |\n| REQ-MOOD-20 | PASS | SSE suppression correct |\n| REQ-MOOD-21 | PARTIAL | Works but quote corruption (F2) |\n| REQ-MOOD-22 | PASS | parseAdventureConfig extended |\n| REQ-MOOD-23 | PASS | currentMood in detail response |\n| REQ-MOOD-25 | PARTIAL | 404 error message imprecise (F6) |\n| REQ-MOOD-36 | PASS | mood-tool tests present |\n| REQ-MOOD-37 | PASS | image-gen tests present |\n| REQ-MOOD-38 | PASS | color-extract tests present |\n| REQ-MOOD-39 | PASS | Config parser tests extended |\n| REQ-MOOD-41 | PASS | Keyword fallback tests present |\n\n## Checks Explicitly Requested\n\n| Check | Result |\n|---|---|\n| setMood handles all edge cases | Partial. Happy path and fallback tested. Quote corruption (F2) and malformed frontmatter recovery (F4) are bugs. Missing: no adventure.md at all test. |\n| Session runner restructure doesn't regress | PASS. All 291 tests green per commission report. message-route tests preserved and extended. |\n| SSE suppression correctly scoped | PASS. Uses `toolName`, not `block.content`. Test confirms. |\n| Image endpoint 404 graceful | PARTIAL. Returns 404 but doesn't distinguish adventure-not-found from no-image (F6). |\n| REPLICATE_API_TOKEN at generateMoodImage level | PASS. Checked at function entry, returns null. No startup WARN (F5). |\n| downloadImage timeout | PASS. 30s, matching Replicate budget. |\n| No mock.module() | PASS. Zero occurrences in backend or shared. |\n| Two tools one MCP server | PASS. createSdkMcpServer with array of tool defs. |\n| Test coverage | PASS with caveat. All spec test requirements (REQ-MOOD-36 through 41) met. setMood has its own test file. Missing: roundtrip test with quotes in description. |\n| Type safety | PASS. Shared schemas exported and used. null/undefined coercion handled. |"
  - timestamp: 2026-03-31T13:43:59.740Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All code reviewed. 10 findings recorded. Compiling final requirement coverage assessment and submitting result."
projectName: corvran
---
# Dynamic Mood System: Backend Review (Phases 1-5)

## Summary

The implementation is structurally sound. The architectural decisions (two tools in one MCP server, stream reference via closure, DI for all external dependencies) are executed cleanly. No `mock.module()` usage. Type safety across the shared/backend boundary is maintained. Existing message-route tests are preserved and extended. Test coverage is substantial.

There are 10 findings. Two are MEDIUM, the rest are LOW or informational.

---

## Findings (Priority Order)

### F1 — MEDIUM: Keyword-to-hue table diverges from spec

**File:** `packages/backend/src/services/mood-tool.ts:27-38`
**Spec:** REQ-MOOD-17

The implementation's `KEYWORD_HUE_TABLE` does not match the spec. Different keyword groups, different hue values, different keywords within groups.

| Aspect | Spec | Implementation |
|---|---|---|
| fire hue | 20 | 25 |
| blood hue | 5 | 10 |
| ice hue | 205 | 200 |
| desert hue | 50 | 55 |
| Missing groups | — | sky(195), night(270), magic(300), poison(120) |
| Added groups | — | storm(250), shadow(285), holy(85), death(310) |

Spec keywords like "lava", "ember", "river", "dawn", "sunrise", "void", "abyss", "glacier", "tundra", "arcane", "mystical", "ethereal", "fey", "plague", "rot", "corruption" are absent. Implementation adds "blaze", "rage", "anger", "fury", "wrath", "grove", "woodland", "wave", "storm", "thunder", "lightning", "tempest", "gloom", "dread", "holy", "divine", "sacred", "celestial", "necro", "corpse", "barren" which are not in the spec.

The tests validate the implementation's table, not the spec's. They would pass even though the spec is not satisfied.

**Action:** Align the table to the spec, or update the spec to reflect the deliberate redesign if these groups are preferred.

---

### F2 — MEDIUM: Quoted descriptions corrupt on roundtrip

**File:** `packages/backend/src/services/adventure-service.ts:240`

`setMood` writes `mood_description: "${mood.description}"`. If the description contains double quotes (plausible: place names, dialogue references), the YAML line becomes malformed: `mood_description: "A tavern called "The Dragon""`. `parseAdventureConfig`'s regex captures `([^"\n]*)` inside double quotes, so it truncates at the first inner quote.

This is a data corruption bug on the write-read roundtrip. The mood description read back on next page load will be truncated.

**Action:** Escape double quotes in the description before writing (e.g., `description.replace(/"/g, '\\"')`), or use unquoted YAML values and strip quotes on read only.

---

### F3 — LOW: Replicate Authorization header format

**File:** `packages/backend/src/services/image-gen.ts:20`
**Spec:** REQ-MOOD-11

Spec says `Authorization: Token ${REPLICATE_API_TOKEN}`. Implementation uses `Bearer ${token}`. Replicate accepts both in practice, but this deviates from spec. If Replicate ever tightens validation on the header format, all image generation silently fails (falls back to keyword hue).

**Action:** Change to `Token ${token}` to match spec and Replicate's documented convention.

---

### F4 — LOW: setMood malformed frontmatter recovery produces corrupt output

**File:** `packages/backend/src/services/adventure-service.ts:209-220`

When `adventure.md` starts with `---` but has no closing `---` (malformed), the recovery path prepends `---\n---\n` to content that already starts with `---`. This produces `---\n---\n---\n<original>`, where the re-parse logic creates a nonsensical frontmatter block. The mood fields get appended to a fragment, producing a corrupt file.

This is an unlikely edge case (manually corrupted frontmatter), but when triggered it worsens the corruption instead of recovering.

**Action:** In the malformed case, either strip the existing `---` before prepending, or create a clean frontmatter block from scratch while preserving the content body.

---

### F5 — LOW: Missing REPLICATE_API_TOKEN produces no diagnostic output

**File:** `packages/backend/src/services/image-gen.ts:13-14`
**Spec:** REQ-MOOD-14

Spec says "If the variable is absent at server startup, log a WARN." Implementation checks per-call and returns null silently. Functionally equivalent (all calls fall back), but produces no log output. A developer debugging "why are all my moods using fallback hue?" gets no signal.

**Action:** Add `console.warn` when the token is absent, or check at startup per spec.

---

### F6 — LOW: mood-image endpoint doesn't distinguish "adventure not found" from "no mood image"

**File:** `packages/backend/src/routes/adventure-routes.ts:302-318`
**Spec:** REQ-MOOD-25

The endpoint returns 404 "No mood image" whether the adventure doesn't exist or the image hasn't been generated. The spec says the error body should distinguish between the two. The HTTP status is correct in both cases; only the error message is imprecise.

**Action:** Add `adventureService.getAdventure(id)` check before the file check, returning a distinct error message for nonexistent adventures.

---

### F7 — LOW: color-extract.ts bypasses FileOps DI

**File:** `packages/backend/src/services/color-extract.ts:18`

Uses `Bun.file(imagePath).arrayBuffer()` directly instead of the `FileOps` abstraction. Tests write real temp files. This works but breaks the codebase's DI pattern. The mood-tool injects `extractHue` so this doesn't affect mood-tool testability, only color-extract's own tests.

**Action:** Accept the inconsistency (temp file tests are fine for image processing) or inject a read function for consistency.

---

### F8 — INFORMATIONAL: downloadImage and generateMoodImage both have 30s timeouts

**File:** `packages/backend/src/services/session-runner.ts:30`, `packages/backend/src/services/image-gen.ts:26`

Total worst-case latency for one mood change is 60 seconds (30s Replicate + 30s download). The spec's 30s budget at REQ-MOOD-14 refers to the Replicate call only. The download should be fast (CDN), so this is unlikely to hit in practice.

**Action:** None required. Informational.

---

### F9 — INFORMATIONAL: null-to-undefined coercion for imagePath

**File:** `packages/backend/src/services/adventure-service.ts:139`

`imagePath: config.mood.imagePath ?? undefined` coerces `null` (from `AdventureConfig`) to `undefined` (for `MoodState` which uses `z.string().optional()`). This works but relies on implicit type knowledge. TypeScript would catch a mismatch if the schema changed. Low risk.

**Action:** None required.

---

## Requirement Coverage (Phases 1-5 only)

| Requirement | Status | Notes |
|---|---|---|
| REQ-MOOD-01 | PASS | MoodStateSchema in shared |
| REQ-MOOD-02 | PASS | MoodEventSchema in shared |
| REQ-MOOD-03 | PASS | AdventureDetailSchema.currentMood |
| REQ-MOOD-04 | PASS | AdventureConfig extended |
| REQ-MOOD-05 | PASS | Frontmatter fields parsed |
| REQ-MOOD-06 | PASS | set_mood registered |
| REQ-MOOD-07 | PASS | Input schema matches |
| REQ-MOOD-08 | PASS | Tool output strings correct |
| REQ-MOOD-09 | PASS | Session runner wires both tools |
| REQ-MOOD-10 | PASS | Handler execution order correct |
| REQ-MOOD-11 | PARTIAL | Auth header format differs (F3) |
| REQ-MOOD-12 | PASS | Prompt construction correct |
| REQ-MOOD-13 | PASS | Image saved to mood.png |
| REQ-MOOD-14 | PARTIAL | No startup WARN log (F5) |
| REQ-MOOD-15 | PASS | Dominant hue extraction implemented |
| REQ-MOOD-16 | PASS | culori/fn used correctly |
| REQ-MOOD-17 | FAIL | Keyword table diverges (F1) |
| REQ-MOOD-18 | PASS | mood event type, no tool_use |
| REQ-MOOD-19 | PASS | Event payload correct |
| REQ-MOOD-20 | PASS | SSE suppression correct |
| REQ-MOOD-21 | PARTIAL | Works but quote corruption (F2) |
| REQ-MOOD-22 | PASS | parseAdventureConfig extended |
| REQ-MOOD-23 | PASS | currentMood in detail response |
| REQ-MOOD-25 | PARTIAL | 404 error message imprecise (F6) |
| REQ-MOOD-36 | PASS | mood-tool tests present |
| REQ-MOOD-37 | PASS | image-gen tests present |
| REQ-MOOD-38 | PASS | color-extract tests present |
| REQ-MOOD-39 | PASS | Config parser tests extended |
| REQ-MOOD-41 | PASS | Keyword fallback tests present |

## Checks Explicitly Requested

| Check | Result |
|---|---|
| setMood handles all edge cases | Partial. Happy path and fallback tested. Quote corruption (F2) and malformed frontmatter recovery (F4) are bugs. Missing: no adventure.md at all test. |
| Session runner restructure doesn't regress | PASS. All 291 tests green per commission report. message-route tests preserved and extended. |
| SSE suppression correctly scoped | PASS. Uses `toolName`, not `block.content`. Test confirms. |
| Image endpoint 404 graceful | PARTIAL. Returns 404 but doesn't distinguish adventure-not-found from no-image (F6). |
| REPLICATE_API_TOKEN at generateMoodImage level | PASS. Checked at function entry, returns null. No startup WARN (F5). |
| downloadImage timeout | PASS. 30s, matching Replicate budget. |
| No mock.module() | PASS. Zero occurrences in backend or shared. |
| Two tools one MCP server | PASS. createSdkMcpServer with array of tool defs. |
| Test coverage | PASS with caveat. All spec test requirements (REQ-MOOD-36 through 41) met. setMood has its own test file. Missing: roundtrip test with quotes in description. |
| Type safety | PASS. Shared schemas exported and used. null/undefined coercion handled. |

## Decisions

**F1: Does the keyword-to-hue table match the spec (REQ-MOOD-17)?**
MEDIUM: The implementation's KEYWORD_HUE_TABLE diverges significantly from the spec's table. Different keywords, different hue values, and different group themes.
*Reasoning: Spec table (REQ-MOOD-17) defines 10 groups: fire(20), blood(5), forest(142), ocean(220), sky(195), night(270), ice(205), desert(50), magic(300), poison(120). Implementation defines 10 groups but with different themes and values: fire(25), blood(10), forest(142), ocean(220), storm(250), shadow(285), holy(85), ice(200), desert(55), death(310). Missing spec groups: sky, night, magic, poison. Added groups not in spec: storm, shadow, holy, death. Hue values differ for shared groups: fire 20→25, blood 5→10, ice 205→200, desert 50→55. Keywords within each group also diverge (e.g., spec fire has "lava, ember, inferno, burning" but implementation has "inferno, blaze, burning" without lava/ember).*

**F2: Does the Replicate Authorization header match the spec (REQ-MOOD-11)?**
LOW: The implementation uses `Bearer ${token}` but the spec says `Token ${token}`.
*Reasoning: REQ-MOOD-11 specifies `Authorization: Token ${REPLICATE_API_TOKEN}`. The implementation at image-gen.ts:20 uses `Authorization: \`Bearer ${token}\``. Replicate's API actually accepts both formats according to their docs, so this may work in practice, but it deviates from the spec. If Replicate's API is strict about the `Token` prefix format, this would cause all image generation to fail silently (returning null, triggering fallback).*

**F3: Does setMood handle the malformed-frontmatter fixup correctly?**
MEDIUM: The malformed frontmatter recovery path at adventure-service.ts:219 prepends `---\n---\n` to content that already starts with `---`, producing `---\n---\n---\noriginal...`. The re-parse after fixup will then find the first `\n---` at position 0 of `remainder`, producing an empty frontmatter block and dropping the original content into `afterFrontmatter`.
*Reasoning: In setMood at line 209-211: content starts with `---` (checked at line 209), so we enter the frontmatter path. afterOpening finds the first `\n`. rest is everything after. closingIndex looks for `\n---` in rest. If closingIndex is -1 (malformed: no closing `---`), line 219 prepends `---\n---\n` to content. But content already starts with `---`, so the result is `---\n---\n---\n<original frontmatter without closing delimiter>`. The re-parse at lines 223-225 then finds openEnd at position 3 (after first `---`), remainder is `---\n---\n<original>`, closeIdx finds `\n---` at position 3 (the second `---\n`). frontmatter becomes `---` (a malformed YAML field), afterFrontmatter becomes `\n---\n<original>`. The mood fields are appended to the string `---`, producing nonsensical frontmatter. This is an unlikely edge case (adventure.md starting with `---` but no closing `---`) but when triggered it will corrupt the file.*

**F4: Does the REPLICATE_API_TOKEN absence handling meet spec (REQ-MOOD-14)?**
LOW: The spec says to check at server startup and log WARN. The implementation checks per-call inside generateMoodImage and returns null silently with no log.
*Reasoning: REQ-MOOD-14: "If the variable is absent at server startup, log a WARN and disable image generation for all mood tool calls." The implementation at image-gen.ts:13-14 checks `process.env.REPLICATE_API_TOKEN` on every call and returns null with no warning logged. This is functionally equivalent (all calls fall back) but doesn't meet the "log at startup" part. The per-call approach is arguably better (handles runtime env changes), but it produces no diagnostic output when the token is missing, making it harder to debug "why are all my moods using fallback hue?"*

**F5: Does downloadImage timeout match the 30s Replicate call budget?**
OBSERVATION: downloadImage at session-runner.ts:30 uses `AbortSignal.timeout(30_000)` and generateMoodImage at image-gen.ts:26 also uses `AbortSignal.timeout(30_000)`. Total worst-case is 60 seconds for one mood change.
*Reasoning: The spec says "timeout after 30 seconds" at REQ-MOOD-14, referring to the Replicate call. The download is a separate step (downloading the result image from Replicate's CDN). The spec doesn't explicitly constrain the download timeout, and the download should be fast (Replicate CDN). Having both at 30s is reasonable but the total latency budget for the tool handler is effectively 60s worst-case. This is informational, not a defect.*

**F6: Does the mood-image endpoint check adventure existence (REQ-MOOD-25)?**
LOW: The mood-image endpoint at adventure-routes.ts:302-318 does not verify the adventure exists before checking for the file. It checks `fileOps.fileExists(moodImagePath)` directly.
*Reasoning: REQ-MOOD-25 says "Returns 404 with a JSON error body if the adventure does not exist or has no mood image on disk." The implementation skips the adventure existence check and goes straight to checking if mood.png exists. For a nonexistent adventure, `getAdventurePath` returns a path that doesn't exist, so `fileExists` returns false, and it returns 404 with "No mood image." The error message is inaccurate (it's not "no mood image" but "adventure doesn't exist"), but the HTTP status is correct. The user sees 404 either way. Minor inaccuracy in error messaging.*

**F7: Does the SSE suppression use toolName correctly (REQ-MOOD-20)?**
PASS: SSE suppression at adventure-routes.ts:247 uses `toolName === "set_mood"` with `continue` to skip the tool_use emission. toolName is resolved from pendingTools map by tool_use_id. Correctly scoped.
*Reasoning: The commission prompt asks to verify SSE suppression uses `toolName`, not `block.content`. At adventure-routes.ts:244, toolName is resolved from `pendingTools.get(block.tool_use_id)`, populated from assistant message tool_use blocks at line 236 (`pendingTools.set(block.id, block.name)`). At line 247, `if (toolName === "set_mood") continue;` skips emission. This is correct. The tool name comes from the SDK's assistant message, not from the tool result content. Test at line 586-623 confirms this works with set_mood alongside another tool.*

**F8: Does the implementation have test coverage for setMood frontmatter writing (REQ-MOOD-21)?**
MEDIUM: No dedicated tests for the `setMood` method in adventure-service.ts. The plan doesn't explicitly call for setMood unit tests, but REQ-MOOD-21 defines specific behaviors (update existing fields, add absent fields, remove mood_image on fallback) that are only tested indirectly via the mood-tool handler tests which mock setMood entirely.
*Reasoning: The mood-tool tests inject a mock `setMood` function. This validates that the tool calls setMood with the right arguments, but never exercises the actual frontmatter manipulation logic in adventure-service.ts:196-258. That logic has multiple branches: creating adventure.md from scratch (line 205), handling missing frontmatter (line 211), fixing malformed frontmatter (line 219), updating vs inserting mood_hue/mood_description/mood_image, and removing mood_image. None of these branches have test coverage. The malformed frontmatter bug (F3) would have been caught with tests.*

**F9: Does the currentMood mapping in getAdventure handle the type boundary correctly?**
LOW: At adventure-service.ts:139, `imagePath: config.mood.imagePath ?? undefined` converts `null` to `undefined` for the MoodState type. MoodStateSchema uses `.optional()` for imagePath. This works but the null-to-undefined coercion is implicit and depends on knowing that the Zod schema uses optional (not nullable).
*Reasoning: AdventureConfig defines `imagePath: string | null`. MoodStateSchema defines `imagePath: z.string().optional()` which infers to `string | undefined`. The mapping at line 139 coerces `null → undefined` via `?? undefined`. This is correct but fragile. If MoodStateSchema ever changed to `.nullable()`, this coercion would mask a type error. Low severity because TypeScript would catch the mismatch if the schema changed.*

**F10: Are all spec test requirements met?**
Partial coverage gaps exist. REQ-MOOD-36 through REQ-MOOD-41 specify test requirements. Most are met but REQ-MOOD-37 (image-gen prompt verification) test doesn't check the Authorization header format. REQ-MOOD-38 (color-extract) is covered. REQ-MOOD-39 (parseAdventureConfig extended) needs verification.
*Reasoning: REQ-MOOD-36 (mood-tool tests): Covered. REQ-MOOD-37 (image-gen tests): 6 tests present, covering success, failure status, network error, missing token, prompt inclusion. Missing: Authorization header validation test (would have caught F2). REQ-MOOD-38 (color-extract): 4 tests covering red, gray, green, blue. Meets "valid PNG with clear hue", "achromatic fallback", and "distinct hue families". REQ-MOOD-39 (parseAdventureConfig): Need to check if tests exist for mood field parsing. REQ-MOOD-41 (keyword fallback): 13 tests covering all groups, first-match-wins, default 270, case-insensitivity. Meets requirements despite keyword table divergence (F1).*

**F8 correction: Does setMood have test coverage?**
RETRACTED. Tests exist at adventure-service-mood.test.ts covering: write all three fields, update existing fields, remove mood_image on fallback, preserve other frontmatter. The malformed frontmatter edge case (F3) is still not tested, but the primary paths are covered.
*Reasoning: Found adventure-service-mood.test.ts with 6 tests: writes all fields (lines 8-37), updates existing (39-69), removes mood_image when absent (71-94), preserves other fields (96-123), populates currentMood from config (127-147), returns null when no mood (149-164). Missing: test for no adventure.md at all, test for malformed frontmatter. But primary happy and fallback paths are covered.*

**F11: Does setMood handle mood.description containing double quotes?**
MEDIUM: If the GM's description contains double quotes (e.g., "A tavern called \"The Dragon\""), setMood writes it as `mood_description: "A tavern called "The Dragon""` which produces malformed YAML. parseAdventureConfig's regex `"([^"\n]*)"` would then truncate at the inner quote.
*Reasoning: adventure-service.ts:240 writes `mood_description: "${mood.description}"`. If mood.description contains `"`, the YAML line becomes `mood_description: "text with "quotes" inside"`. The parseAdventureConfig regex at adventure-config.ts:64 captures `([^"\n]*)` inside double quotes, so it would capture only `text with ` and drop the rest. This is a roundtrip corruption bug. The GM could plausibly produce descriptions with quotes (e.g., place names, dialogue references). The fix is either escaping quotes in the description or using a different quoting strategy.*

**F12: Does color-extract.ts use Bun.file directly instead of DI?**
LOW: color-extract.ts:18 uses `Bun.file(imagePath).arrayBuffer()` directly, bypassing the FileOps abstraction used everywhere else. This means the function can't be tested with mock file ops.
*Reasoning: The current tests write real temp files to disk, which works but is inconsistent with the codebase's DI pattern. The mood-tool.ts injects `extractHue` as a dependency, so the color-extract module is never called in mood-tool tests. It only matters for color-extract's own tests, which do write real files. Low severity because it works, but it breaks the architectural pattern.*
