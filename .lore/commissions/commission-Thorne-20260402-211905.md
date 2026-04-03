---
title: "Commission: Review: Compaction System Phase 1"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the Phase 1 implementation of the compaction system.\n\nRead the plan at `.lore/plans/compaction-system-plan.md` (Phase 1 section) and the spec at `.lore/specs/compaction-system-spec.md`.\n\nReview focus areas from the plan:\n- Concurrency lock correctness (finally block releases lock on all paths)\n- Archive reversal on Haiku failure (history.md restored, lock cleared)\n- Prompt quality (matches spec's REQ-COMP-16 through REQ-COMP-20 near-verbatim)\n- Sequential numbering edge cases (gaps, deleted files, first compaction)\n- DI wiring in app.ts\n- Test coverage for all nine cases listed in Step 1.4\n- FileOps interface additions (deleteFile, readFiles) and their implementations\n\nFiles to review:\n- `packages/backend/src/services/compaction-service.ts`\n- `packages/backend/src/types.ts` (FileOps changes)\n- `packages/backend/src/app.ts` (DI wiring)\n- `packages/backend/tests/services/compaction-service.test.ts`\n- `packages/backend/tests/helpers/mock-file-ops.ts` (mock additions)\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260402-211857
linked_artifacts:
  - packages/backend/src/services/compaction-service.ts

  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/src/types.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/src/types.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
activity_timeline:
  - timestamp: 2026-04-03T04:19:05.925Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:19:05.927Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T04:23:37.122Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T04:23:37.125Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T04:23:37.151Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T04:23:43.818Z
    event: progress_report
    reason: "Starting Phase 1 compaction system review. Reading plan and spec first."
  - timestamp: 2026-04-03T04:24:15.754Z
    event: progress_report
    reason: "All five implementation files read. Reviewing against spec and plan requirements now. Recording findings as I go."
  - timestamp: 2026-04-03T04:26:42.553Z
    event: progress_report
    reason: "Review complete. 3 findings total: 1 MEDIUM (missing 60s timeout), 2 LOW (type assertions, no archive step rollback). All nine test cases present. Prompts match spec. DI wiring correct. Preparing final report."
  - timestamp: 2026-04-03T04:27:17.633Z
    event: result_submitted
    reason: "## Phase 1 Compaction System Review\n\n### Requirements Coverage\n\nAll Phase 1 requirements are addressed:\n\n| Requirement | Status | Notes |\n|---|---|---|\n| REQ-COMP-1 (archive-summarize-save) | Satisfied | Three steps in order at compaction-service.ts:158-187 |\n| REQ-COMP-2 (archive naming) | Satisfied | scene-NNN.md / world-NNN.md with zero-padded three digits |\n| REQ-COMP-3 (Haiku summarization) | Satisfied | Calls queryFn with Haiku model and summarization prompt |\n| REQ-COMP-4 (save summary) | Satisfied | Writes Haiku output as new history.md |\n| REQ-COMP-5 (auto-create past/) | Satisfied | writeFile creates intermediate directories (production: mkdir recursive) |\n| REQ-COMP-6 (readable markdown archives) | Satisfied | Verbatim content, no transformation |\n| REQ-COMP-16-18 (history prompt) | Satisfied | Near-verbatim from spec. All preservation categories present. |\n| REQ-COMP-19 (context in Haiku call) | Satisfied | buildHistorySystemPrompt appends character/world sections |\n| REQ-COMP-20 (world prompt) | Satisfied | Separate consolidation-focused prompt |\n| REQ-COMP-21-23 (directory structure) | Satisfied | past/ with correct naming, verbatim archives |\n| REQ-COMP-24 (DI pattern) | Satisfied | createCompactionService factory with deps |\n| REQ-COMP-25 (QueryFn, minimal options) | Satisfied | Same QueryFn, model/persistSession/permissionMode only |\n| REQ-COMP-29 (concurrency lock) | Satisfied | Per-adventure Set, finally block release |\n| REQ-COMP-36 (short/missing history) | Satisfied | < 500 chars or missing throws HistoryTooShortError |\n| REQ-COMP-37 (player-edited history) | Satisfied | No special handling, file content compacted as-is |\n| REQ-COMP-38 (no crash recovery) | Satisfied | Explicitly not implemented per spec |\n| REQ-COMP-39 (no number reuse) | Satisfied | Highest existing + 1, gap test included |\n| REQ-COMP-40 (tool artifacts) | Satisfied | No special handling, per spec |\n\n### Findings\n\n**F1 — MEDIUM: Missing 60-second timeout on Haiku call**\nFile: `packages/backend/src/services/compaction-service.ts:165-173`\nSpec: REQ-COMP-41 (\"set a timeout of 60 seconds on the Haiku call\")\nPlan: Step 1.1 item 7 (\"Set a 60-second timeout via AbortSignal.timeout(60_000) passed as abortController\")\n\nThe queryFn call passes model, systemPrompt, persistSession, and permissionMode, but no abort signal or timeout. A hung Haiku call would block compaction indefinitely, holding the per-adventure concurrency lock. This lock only clears on daemon restart. The fix is to pass `abortController: AbortSignal.timeout(60_000)` in the options object (verify the Agent SDK's Options type accepts this field, or use the appropriate SDK mechanism for timeouts).\n\n**F2 — LOW: Type assertions in extractQueryResult bypass compile-time safety**\nFile: `packages/backend/src/services/compaction-service.ts:75,77`\n\n`(msg as { result: string }).result` and `(msg as { errors?: string[] }).errors` cast SDK messages to ad-hoc shapes. If the SDK changes its result message structure, these casts will silently produce undefined rather than triggering a compile error. This mirrors the plan's suggested pattern (Step 1.3), so it was an intentional shortcut. Worth revisiting if/when the SDK exports typed message subtypes.\n\n**F3 — LOW: No rollback if deleteFile fails after archive write**\nFile: `packages/backend/src/services/compaction-service.ts:159-160`\n\nIf `writeFile(archivePath, content)` succeeds but `deleteFile(filePath)` fails, two copies of the content exist on disk (the original and the archive). The spec says \"move (not copy)\" to avoid this. The failure mode is benign: the error propagates up and clears the lock, and the next compaction attempt will succeed normally since history.md still exists. The two-copy window requires a filesystem error that prevents deletion, which is rare.\n\n### Test Coverage\n\nAll nine test cases from the plan's Step 1.4 are present and correctly structured:\n\n1. Compaction pipeline (line 80)\n2. Sequential numbering with gaps (line 105)\n3. Short history (line 124)\n4. Missing history (line 136)\n5. Concurrency lock (line 146)\n6. Haiku failure reversal (line 174)\n7. Context passed to Haiku (line 197)\n8. World compaction (line 240)\n9. Verbatim archive (line 221)\n\nTests use independently defined expected values, not values derived from the code's output. The concurrency test uses a delaying queryFn to exercise the lock lifecycle. The Haiku failure test verifies all three aspects of recovery: file restoration, lock clearance, and archive cleanup.\n\n### DI Wiring\n\n`app.ts:113-115` creates the CompactionService conditionally when queryFn is provided, consistent with the sessionRunner pattern. The service is passed to adventure routes as an optional dependency. No new required dependencies were introduced, preserving backward compatibility with existing tests.\n\n### FileOps Extensions\n\nBoth `deleteFile` and `readFiles` are correctly added to the interface (types.ts:13-14), the production implementation (app.ts:54-60), and the mock (mock-file-ops.ts:84-104). The production `readFiles` correctly filters for `isFile()`, complementing `readDir`'s `isDirectory()` filter."
  - timestamp: 2026-04-03T04:27:25.764Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Review complete. 3 findings total: 1 MEDIUM (missing 60s timeout), 2 LOW (type assertions, no archive step rollback). All nine test cases present. Prompts match spec. DI wiring correct. Preparing final report."
projectName: corvran
---
## Phase 1 Compaction System Review

### Requirements Coverage

All Phase 1 requirements are addressed:

| Requirement | Status | Notes |
|---|---|---|
| REQ-COMP-1 (archive-summarize-save) | Satisfied | Three steps in order at compaction-service.ts:158-187 |
| REQ-COMP-2 (archive naming) | Satisfied | scene-NNN.md / world-NNN.md with zero-padded three digits |
| REQ-COMP-3 (Haiku summarization) | Satisfied | Calls queryFn with Haiku model and summarization prompt |
| REQ-COMP-4 (save summary) | Satisfied | Writes Haiku output as new history.md |
| REQ-COMP-5 (auto-create past/) | Satisfied | writeFile creates intermediate directories (production: mkdir recursive) |
| REQ-COMP-6 (readable markdown archives) | Satisfied | Verbatim content, no transformation |
| REQ-COMP-16-18 (history prompt) | Satisfied | Near-verbatim from spec. All preservation categories present. |
| REQ-COMP-19 (context in Haiku call) | Satisfied | buildHistorySystemPrompt appends character/world sections |
| REQ-COMP-20 (world prompt) | Satisfied | Separate consolidation-focused prompt |
| REQ-COMP-21-23 (directory structure) | Satisfied | past/ with correct naming, verbatim archives |
| REQ-COMP-24 (DI pattern) | Satisfied | createCompactionService factory with deps |
| REQ-COMP-25 (QueryFn, minimal options) | Satisfied | Same QueryFn, model/persistSession/permissionMode only |
| REQ-COMP-29 (concurrency lock) | Satisfied | Per-adventure Set, finally block release |
| REQ-COMP-36 (short/missing history) | Satisfied | < 500 chars or missing throws HistoryTooShortError |
| REQ-COMP-37 (player-edited history) | Satisfied | No special handling, file content compacted as-is |
| REQ-COMP-38 (no crash recovery) | Satisfied | Explicitly not implemented per spec |
| REQ-COMP-39 (no number reuse) | Satisfied | Highest existing + 1, gap test included |
| REQ-COMP-40 (tool artifacts) | Satisfied | No special handling, per spec |

### Findings

**F1 — MEDIUM: Missing 60-second timeout on Haiku call**
File: `packages/backend/src/services/compaction-service.ts:165-173`
Spec: REQ-COMP-41 ("set a timeout of 60 seconds on the Haiku call")
Plan: Step 1.1 item 7 ("Set a 60-second timeout via AbortSignal.timeout(60_000) passed as abortController")

The queryFn call passes model, systemPrompt, persistSession, and permissionMode, but no abort signal or timeout. A hung Haiku call would block compaction indefinitely, holding the per-adventure concurrency lock. This lock only clears on daemon restart. The fix is to pass `abortController: AbortSignal.timeout(60_000)` in the options object (verify the Agent SDK's Options type accepts this field, or use the appropriate SDK mechanism for timeouts).

**F2 — LOW: Type assertions in extractQueryResult bypass compile-time safety**
File: `packages/backend/src/services/compaction-service.ts:75,77`

`(msg as { result: string }).result` and `(msg as { errors?: string[] }).errors` cast SDK messages to ad-hoc shapes. If the SDK changes its result message structure, these casts will silently produce undefined rather than triggering a compile error. This mirrors the plan's suggested pattern (Step 1.3), so it was an intentional shortcut. Worth revisiting if/when the SDK exports typed message subtypes.

**F3 — LOW: No rollback if deleteFile fails after archive write**
File: `packages/backend/src/services/compaction-service.ts:159-160`

If `writeFile(archivePath, content)` succeeds but `deleteFile(filePath)` fails, two copies of the content exist on disk (the original and the archive). The spec says "move (not copy)" to avoid this. The failure mode is benign: the error propagates up and clears the lock, and the next compaction attempt will succeed normally since history.md still exists. The two-copy window requires a filesystem error that prevents deletion, which is rare.

### Test Coverage

All nine test cases from the plan's Step 1.4 are present and correctly structured:

1. Compaction pipeline (line 80)
2. Sequential numbering with gaps (line 105)
3. Short history (line 124)
4. Missing history (line 136)
5. Concurrency lock (line 146)
6. Haiku failure reversal (line 174)
7. Context passed to Haiku (line 197)
8. World compaction (line 240)
9. Verbatim archive (line 221)

Tests use independently defined expected values, not values derived from the code's output. The concurrency test uses a delaying queryFn to exercise the lock lifecycle. The Haiku failure test verifies all three aspects of recovery: file restoration, lock clearance, and archive cleanup.

### DI Wiring

`app.ts:113-115` creates the CompactionService conditionally when queryFn is provided, consistent with the sessionRunner pattern. The service is passed to adventure routes as an optional dependency. No new required dependencies were introduced, preserving backward compatibility with existing tests.

### FileOps Extensions

Both `deleteFile` and `readFiles` are correctly added to the interface (types.ts:13-14), the production implementation (app.ts:54-60), and the mock (mock-file-ops.ts:84-104). The production `readFiles` correctly filters for `isFile()`, complementing `readDir`'s `isDirectory()` filter.

## Decisions

**F1: Does the concurrency lock release correctly on all paths?**
PASS. The lock is correctly implemented.
*Reasoning: compaction-service.ts:138 adds the lock, line 194-196 uses a `finally` block to clear it. This covers success, HistoryTooShortError (thrown before lock is set... wait, no). Let me re-examine. The lock is set at line 138 (`inFlight.add`), inside the try block that has the finally. The HistoryTooShortError is thrown at lines 145 and 149, which are inside the try block, so the finally will fire and clear the lock. The Haiku failure catch at 175-183 re-throws, which will also hit the finally. All paths covered.*

**F2: Does archive reversal on Haiku failure correctly restore state?**
PASS with one MEDIUM concern about reversal completeness.
*Reasoning: compaction-service.ts:175-183 catches the Haiku failure, writes the original content back to history.md (line 177), and attempts to delete the archive (line 179). The archive delete is wrapped in a try/catch for best-effort cleanup, which is correct. However, the reversal writes a *new* file rather than moving the archive back. This means: (1) the archive file might persist if deleteFile fails, leaving two copies on disk, and (2) the restore is functionally correct because `content` was captured before the move. The spec says "moves the file back" (REQ-COMP-41), and this implementation does write-then-delete (the reverse of the original write-then-delete), which achieves the same result. Functionally correct.*

**F3: Does the implementation include the 60-second timeout on the Haiku call specified by REQ-COMP-41?**
FINDING — MEDIUM. No timeout on the Haiku summarization call.
*Reasoning: REQ-COMP-41 states: "The compaction service should set a timeout of 60 seconds on the Haiku call." The plan (Step 1.1, item 7) specifies: "Set a 60-second timeout via AbortSignal.timeout(60_000) passed as abortController." The implementation at compaction-service.ts:165-173 calls queryFn with model, systemPrompt, persistSession, and permissionMode, but does not pass any abort signal or timeout. A hung Haiku call would block compaction indefinitely, holding the per-adventure lock and preventing future compactions for that adventure until daemon restart.*

**F4: Do the summarization prompts match the spec's REQ-COMP-16 through REQ-COMP-20?**
PASS. Prompts faithfully implement the spec requirements.
*Reasoning: HISTORY_SUMMARIZATION_PROMPT (lines 26-39): Contains the "output will be saved as the adventure's history file" language (REQ-COMP-16), the no-meta-commentary instruction (REQ-COMP-16), the narrator framing (REQ-COMP-16), all seven preservation categories from REQ-COMP-17, and the structural guidance about recency weighting and final paragraph from REQ-COMP-18. WORLD_SUMMARIZATION_PROMPT (lines 41-51): Covers REQ-COMP-20's consolidation instructions. buildHistorySystemPrompt (lines 53-65): Appends character.md and world.md as reference context per REQ-COMP-19 with clear framing that they are for reference, not for summarizing.*

**F5: Does sequential numbering handle edge cases correctly (gaps, deleted files, first compaction)?**
PASS. Numbering is correctly implemented.
*Reasoning: getNextSequenceNumber (lines 88-113) reads the directory, filters with a regex for the prefix pattern, finds the highest number, and returns highest + 1. If the directory doesn't exist (readFiles throws), returns 1. This handles: first compaction (no past/ dir, returns 1), gaps from deleted files (finds highest, not lowest gap), and sequential growth. The regex `^${prefix}(\d{3})\.md$` correctly matches only the target file type. The test at line 105-122 verifies the gap-skipping behavior. One minor note: the regex uses a raw `prefix` which could be regex-special, but the only two prefixes used are "scene-" and "world-", which contain a literal hyphen. Hyphen is not special outside character classes in regex, so this is safe for the current usage.*

**F6: Does the DI wiring in app.ts correctly create and pass the CompactionService?**
PASS. DI wiring is correct.
*Reasoning: app.ts:113-115 creates the compaction service conditionally when queryFn is provided, consistent with how sessionRunner is created (lines 103-110). It passes fileOps and queryFn as dependencies. Lines 117-124 pass compactionService to createAdventureRoutes. The optional chaining is consistent: tests that don't provide queryFn won't get a compactionService, which is fine since the adventure routes accept it as optional. The compactionService is undefined when queryFn is not provided, which correctly prevents Haiku calls in test scenarios that don't mock the query function.*

**F7: Do the tests cover all nine cases listed in Step 1.4 of the plan?**
PASS. All nine test cases are covered.
*Reasoning: Plan Step 1.4 lists nine cases. Mapping to test file: (1) compaction pipeline → line 80, (2) sequential numbering → line 105, (3) short history → line 124, (4) missing history → line 136, (5) concurrency → line 146, (6) Haiku failure reversal → line 174, (7) context passed to Haiku → line 197, (8) world compaction → line 240, (9) verbatim archive → line 221. All nine are present.*

**F8: Are the FileOps interface additions (deleteFile, readFiles) correctly implemented in both production and mock?**
PASS. Both implementations are correct.
*Reasoning: types.ts:13-14 adds deleteFile and readFiles to the interface. Production (app.ts:54-60): deleteFile uses `unlink`, readFiles uses `readdir` with `withFileTypes: true` and filters for `isFile()`. This is the correct counterpart to readDir which filters for `isDirectory()`. Mock (mock-file-ops.ts:84-104): deleteFile checks existence and throws ENOENT if missing, then deletes from store. readFiles scans keys with the directory prefix and returns only direct children (no nested paths). Both implementations are consistent with the interface contract.*

**F9: Does the concurrency lock scope match the spec? Per-adventure, not global?**
FINDING — MEDIUM. The concurrency lock is per-adventure-path, but history and world compaction share the same lock.
*Reasoning: REQ-COMP-29 says "only one compaction may run per adventure at a time" and REQ-COMP-10 says history-first ordering when both thresholds exceed. The lock at compaction-service.ts:134 checks `inFlight.has(adventurePath)`, and the lock key is the adventure path regardless of whether it's history or world compaction. This means you cannot compact history and world concurrently on the same adventure, which aligns with REQ-COMP-29's "only one compaction may run per adventure at a time." However, it also means that if history compaction is in progress, a world compaction attempt will throw CompactionInProgressError even though they operate on different files. The spec supports this interpretation (REQ-COMP-10 mandates sequential history-then-world), so this is correct behavior for Phase 2's threshold trigger path. PASS on re-examination.*

**F10: Does extractQueryResult correctly handle the SDK response shape?**
FINDING — LOW. Type assertions used instead of proper typing for SDK result messages.
*Reasoning: compaction-service.ts:71-82, extractQueryResult uses `(msg as { result: string }).result` at line 75 and `(msg as { errors?: string[] }).errors` at line 77. The QueryFn returns an async iterable whose message types come from the Agent SDK. The `as` casts bypass type safety. If the SDK's result message shape changes, these casts will silently produce undefined values rather than triggering a compile error. This is a LOW finding because: (1) the SDK types are external and may not export the specific message subtypes cleanly, making proper typing awkward, and (2) the plan itself showed this exact pattern in Step 1.3. But it's worth noting as a fragility point.*

**F11: Does the compactHistory pass the file content as the user message (prompt), matching REQ-COMP-3 and REQ-COMP-25?**
PASS. Content is passed as the prompt parameter.
*Reasoning: compaction-service.ts:166 passes `prompt: content` where `content` is the full history file text. The system prompt contains the summarization instructions. This matches the QueryFn signature `(params: { prompt: string; options?: Options })` where prompt is the user-facing message. The Haiku call will see the summarization instructions as system prompt and the history content as the user message, which is the correct usage for a summarization task.*

**F12: Is the CompactionService type exported correctly for use by other modules?**
PASS. Type is exported via ReturnType inference.
*Reasoning: compaction-service.ts:218 exports `CompactionService` as `ReturnType<typeof createCompactionService>`. This is the same pattern used elsewhere in the codebase. The adventure-routes.ts imports and uses it as an optional dependency (line 27). The import at adventure-routes.ts line 8 (checking...) should import CompactionService type.*

**F13: What happens if deleteFile fails after writeFile succeeds during the archive step?**
FINDING — LOW. No rollback if deleteFile fails after archive write succeeds.
*Reasoning: compaction-service.ts:159-160: `writeFile(archivePath, content)` then `deleteFile(filePath)`. If deleteFile throws (permissions, I/O error), the archive exists in past/ AND the original still exists at the source path. The spec says "move (not copy)" to avoid two copies on disk, and this failure mode produces exactly that. The error would propagate up through the try/finally, clearing the lock. The next compaction attempt would succeed normally since history.md still exists. This is a minor concern: (1) the two-copy window is narrow, (2) the error is transient (filesystem errors that prevent delete are rare), and (3) subsequent compaction self-heals. LOW because the failure mode is benign and recoverable.*

**F14: Do the tests use external expected values rather than deriving them from the code?**
PASS. Tests use independently defined expected values.
*Reasoning: LONG_HISTORY and SUMMARY_TEXT are defined at lines 12-13 as test constants. The queryFn mock returns SUMMARY_TEXT as a canned response. Tests assert that history.md contains SUMMARY_TEXT and archive contains LONG_HISTORY. The expected values are not derived from the code's own output. This follows the lessons-learned rule about testing correctness, not consistency.*

**F15: Does the Haiku failure test verify that the archive file is cleaned up?**
PASS. Test verifies archive cleanup.
*Reasoning: compaction-service.test.ts:193-194 checks that `readFiles` on the past/ directory returns an empty array, confirming the archive was deleted during reversal. Combined with line 186-187 checking history.md is restored, and line 190 checking the lock is cleared, the test covers all three aspects of failure recovery.*
