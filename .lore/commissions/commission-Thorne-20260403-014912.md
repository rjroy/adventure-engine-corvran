---
title: "Commission: Review: Compaction System — Full Post-Cleanup Review"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Full review of the compaction system after cleanup and completion of all four phases.\n\n**Context**: Phases 2 and 3 were rebuilt from scratch after merge conflicts from a coordination failure. Phase 1 and Phase 4 were built earlier and had review findings applied during the rebuild. The spec and plan were also updated to fix a model configuration bug (hardcoded model ID replaced with configurable short name).\n\n**Read**:\n- Updated spec: `.lore/specs/compaction-system-spec.md`\n- Updated plan: `.lore/plans/compaction-system-plan.md`\n\n**Verify all previous findings were addressed**:\n\nYour Phase 1 findings:\n- F1: 60s timeout on Haiku call\n- F2: Type assertions in extractQueryResult\n- F3: deleteFile rollback comment\n\nYour Phase 4 findings:\n- F1: `compactionEnabled` wired to `assembleSystemPrompt`\n- F2: Test for prompt guidance text\n- F3: `allowedTools` contains `compact_history`\n\n**Review the model configuration fix**:\n- Compaction service receives `model` as a config dependency, not hardcoded\n- `COMPACTION_MODEL` env var read in `app.ts`, default `\"haiku\"`\n- Uses SDK short name (`\"haiku\"`), NOT a versioned model ID\n\n**Review Phase 2 implementation**:\n- Threshold checks in message handler BEFORE player message append\n- History-first ordering when both thresholds exceeded\n- Haiku failure fallback (archive reversed, proceed with original)\n- Concurrent compaction skip\n- All six test cases from plan Step 2.3\n\n**Review Phase 3 implementation**:\n- Shared Zod schemas (CompactResponseSchema, CompactErrorSchema)\n- Error response codes (400/404/409/500)\n- Web client compact button with confirmation, disable states\n- Next.js proxy route (Node.js http.request with socketPath, NOT fetch)\n- All five test cases from plan Step 3.5\n\n**Files to review**:\n- `packages/backend/src/services/compaction-service.ts`\n- `packages/backend/src/routes/adventure-routes.ts`\n- `packages/backend/src/services/session-runner.ts`\n- `packages/backend/src/services/compact-tool.ts`\n- `packages/backend/src/services/prompt-service.ts`\n- `packages/backend/src/app.ts`\n- `packages/backend/src/types.ts`\n- `packages/shared/src/schemas/adventures.ts`\n- `packages/web/app/adventure/[id]/page.tsx`\n- `packages/web/app/api/daemon/adventures/[id]/compact/route.ts`\n- All test files in `packages/backend/tests/`\n\n**Also verify**: No merge conflict markers remain anywhere in the codebase. `grep -r \"<<<<<<\" packages/` should return nothing.\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260403-014855
linked_artifacts:
  - packages/backend/src/services/compaction-service.ts

  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/src/types.ts
  - packages/shared/src/schemas/adventures.ts
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/app/api/daemon/[...path]/route.ts
  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/routes/compact-endpoint.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/tests/prompt-service.test.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/compact-tool.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/src/types.ts
  - packages/shared/src/schemas/adventures.ts
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/app/api/daemon/[...path]/route.ts
  - packages/backend/tests/services/compaction-service.test.ts
  - packages/backend/tests/routes/message-threshold.test.ts
  - packages/backend/tests/routes/compact-endpoint.test.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/tests/prompt-service.test.ts
activity_timeline:
  - timestamp: 2026-04-03T08:49:12.200Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T08:49:12.201Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T09:02:28.764Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T09:02:28.766Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T09:02:28.794Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T09:02:36.830Z
    event: progress_report
    reason: "Starting full review of compaction system. Reading spec, plan, and dependency commission first."
  - timestamp: 2026-04-03T09:03:02.615Z
    event: progress_report
    reason: "Core implementation files read. Now reading types.ts, shared schemas, web client files, and all test files."
  - timestamp: 2026-04-03T09:03:35.164Z
    event: progress_report
    reason: "All files read. Now analyzing against spec requirements and previous review findings. Recording findings as I go."
  - timestamp: 2026-04-03T09:07:06.792Z
    event: result_submitted
    reason: "## Compaction System — Full Review\n\n### Verdict\n\nThe implementation is solid. All four phases are complete, all six previous review findings are addressed, merge conflicts are fully resolved, and no conflict markers remain. One MEDIUM finding and one LOW finding.\n\n### Previous Findings Status\n\nAll six previous findings are resolved:\n\n| Finding | Status | Evidence |\n|---------|--------|----------|\n| Phase 1 F1: 60s timeout | ✅ Fixed | `compaction-service.ts:176-203` — AbortController with 60,000ms setTimeout, cleared in finally |\n| Phase 1 F2: Type assertions | ✅ Fixed | `compaction-service.ts:78-82` — property checks (`\"result\" in msg`) instead of type assertions |\n| Phase 1 F3: deleteFile rollback | ✅ Fixed | `compaction-service.ts:165-174` — explanatory comment + try-catch rollback |\n| Phase 4 F1: compactionEnabled wiring | ✅ Fixed | `adventure-routes.ts:244` — `compactionEnabled: !!compactionService` passed to `assembleSystemPrompt` |\n| Phase 4 F2: Prompt guidance test | ✅ Fixed | `prompt-service.test.ts:261-297` — two tests cover true/false/omitted cases |\n| Phase 4 F3: allowedTools verification | ✅ Fixed | `compact-tool.test.ts:123-197` — verifies inclusion with compaction deps and exclusion without |\n\n### Merge Conflict Check\n\n`grep -r \"<<<<<<\" packages/` returns nothing. Clean.\n\n### Model Configuration\n\nShort name `\"haiku\"` used throughout. No versioned model ID anywhere. Env var `COMPACTION_MODEL` read in `app.ts:104`. One deviation documented as F1 below.\n\n### New Findings\n\n**F1 — MEDIUM: `AppDeps` missing `compactionModel` field, breaks DI chain**\n\nFile: `packages/backend/src/app.ts:83-89` (interface), line 104 (usage)\n\nREQ-COMP-9a specifies: \"The `AppDeps` interface gains a `compactionModel?: string` field. The DI chain in `app.ts` resolves as: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? 'haiku'`.\"\n\nThe current code skips the deps level:\n```\nconst compactionModel = process.env.COMPACTION_MODEL ?? \"haiku\";\n```\n\nThe session runner model follows the full DI chain (`deps.model ?? process.env.MODEL ?? \"sonnet\"` at line 114). The compaction model doesn't. This breaks DI consistency and prevents tests from overriding the compaction model through deps without env var manipulation.\n\nFix: Add `compactionModel?: string` to `AppDeps`. Change line 104 to `const compactionModel = deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? \"haiku\";`.\n\n**F2 — LOW: Silent failure when history refresh fails after successful compaction**\n\nFile: `packages/web/app/adventure/[id]/page.tsx:118-122`\n\nAfter a successful `POST /compact`, the client fetches `GET /history` to refresh the display. If this refresh fails (`historyRes.ok` is false), no error is shown and the old messages remain. The compaction succeeded on disk, so data integrity is fine, but the UI is stale until the user refreshes the page.\n\nFix: Add an else branch that sets `compactError(\"Compaction succeeded but failed to refresh display. Please reload the page.\")` or similar.\n\n### Requirement Coverage\n\nAll 41 requirements (REQ-COMP-1 through REQ-COMP-41, plus REQ-COMP-9a) are addressed:\n\n- **Phase 1 (Compaction mechanism)**: REQ-COMP-1 through 6, 9a, 16-25, 29, 36-40 — `compaction-service.ts` implements archive-summarize-save, sequential numbering, concurrency lock, prompts, and edge cases. 9 unit tests.\n- **Phase 2 (Threshold trigger)**: REQ-COMP-7-10, 26, 35, 41 — `adventure-routes.ts:147-183` checks thresholds before player message append, history-first ordering, Haiku failure fallback. 6 integration tests.\n- **Phase 3 (Player endpoint + web button)**: REQ-COMP-15, 28, 31-33 — `adventure-routes.ts:381-413` with proper error codes (400/404/409/500). Shared Zod schemas exported. Web button with confirmation, disable states, inline status, history refresh. Catch-all proxy handles routing. 5 endpoint tests.\n- **Phase 4 (GM tool + prompt guidance)**: REQ-COMP-11-14, 27, 30, 34 — `compact-tool.ts` follows dice-tool pattern. `session-runner.ts:62-81` conditionally registers tool and adds to allowedTools. `prompt-service.ts:107-118` adds guidance section. 6 tool tests."
  - timestamp: 2026-04-03T09:07:18.275Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All files read. Now analyzing against spec requirements and previous review findings. Recording findings as I go."
projectName: corvran
---
## Compaction System — Full Review

### Verdict

The implementation is solid. All four phases are complete, all six previous review findings are addressed, merge conflicts are fully resolved, and no conflict markers remain. One MEDIUM finding and one LOW finding.

### Previous Findings Status

All six previous findings are resolved:

| Finding | Status | Evidence |
|---------|--------|----------|
| Phase 1 F1: 60s timeout | ✅ Fixed | `compaction-service.ts:176-203` — AbortController with 60,000ms setTimeout, cleared in finally |
| Phase 1 F2: Type assertions | ✅ Fixed | `compaction-service.ts:78-82` — property checks (`"result" in msg`) instead of type assertions |
| Phase 1 F3: deleteFile rollback | ✅ Fixed | `compaction-service.ts:165-174` — explanatory comment + try-catch rollback |
| Phase 4 F1: compactionEnabled wiring | ✅ Fixed | `adventure-routes.ts:244` — `compactionEnabled: !!compactionService` passed to `assembleSystemPrompt` |
| Phase 4 F2: Prompt guidance test | ✅ Fixed | `prompt-service.test.ts:261-297` — two tests cover true/false/omitted cases |
| Phase 4 F3: allowedTools verification | ✅ Fixed | `compact-tool.test.ts:123-197` — verifies inclusion with compaction deps and exclusion without |

### Merge Conflict Check

`grep -r "<<<<<<" packages/` returns nothing. Clean.

### Model Configuration

Short name `"haiku"` used throughout. No versioned model ID anywhere. Env var `COMPACTION_MODEL` read in `app.ts:104`. One deviation documented as F1 below.

### New Findings

**F1 — MEDIUM: `AppDeps` missing `compactionModel` field, breaks DI chain**

File: `packages/backend/src/app.ts:83-89` (interface), line 104 (usage)

REQ-COMP-9a specifies: "The `AppDeps` interface gains a `compactionModel?: string` field. The DI chain in `app.ts` resolves as: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? 'haiku'`."

The current code skips the deps level:
```
const compactionModel = process.env.COMPACTION_MODEL ?? "haiku";
```

The session runner model follows the full DI chain (`deps.model ?? process.env.MODEL ?? "sonnet"` at line 114). The compaction model doesn't. This breaks DI consistency and prevents tests from overriding the compaction model through deps without env var manipulation.

Fix: Add `compactionModel?: string` to `AppDeps`. Change line 104 to `const compactionModel = deps?.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku";`.

**F2 — LOW: Silent failure when history refresh fails after successful compaction**

File: `packages/web/app/adventure/[id]/page.tsx:118-122`

After a successful `POST /compact`, the client fetches `GET /history` to refresh the display. If this refresh fails (`historyRes.ok` is false), no error is shown and the old messages remain. The compaction succeeded on disk, so data integrity is fine, but the UI is stale until the user refreshes the page.

Fix: Add an else branch that sets `compactError("Compaction succeeded but failed to refresh display. Please reload the page.")` or similar.

### Requirement Coverage

All 41 requirements (REQ-COMP-1 through REQ-COMP-41, plus REQ-COMP-9a) are addressed:

- **Phase 1 (Compaction mechanism)**: REQ-COMP-1 through 6, 9a, 16-25, 29, 36-40 — `compaction-service.ts` implements archive-summarize-save, sequential numbering, concurrency lock, prompts, and edge cases. 9 unit tests.
- **Phase 2 (Threshold trigger)**: REQ-COMP-7-10, 26, 35, 41 — `adventure-routes.ts:147-183` checks thresholds before player message append, history-first ordering, Haiku failure fallback. 6 integration tests.
- **Phase 3 (Player endpoint + web button)**: REQ-COMP-15, 28, 31-33 — `adventure-routes.ts:381-413` with proper error codes (400/404/409/500). Shared Zod schemas exported. Web button with confirmation, disable states, inline status, history refresh. Catch-all proxy handles routing. 5 endpoint tests.
- **Phase 4 (GM tool + prompt guidance)**: REQ-COMP-11-14, 27, 30, 34 — `compact-tool.ts` follows dice-tool pattern. `session-runner.ts:62-81` conditionally registers tool and adds to allowedTools. `prompt-service.ts:107-118` adds guidance section. 6 tool tests.

## Decisions

**Were all Phase 1 review findings addressed?**
All three Phase 1 findings are resolved.
*Reasoning: F1 (60s timeout): compaction-service.ts:176-203 implements AbortController with 60_000ms setTimeout, properly cleared in finally block. F2 (type assertions): extractQueryResult at line 78 uses property checks (`"result" in msg`, `"errors" in msg`) instead of type assertions. F3 (deleteFile rollback comment): Lines 165-166 have an explanatory comment. Lines 168-174 implement try-catch with rollback on delete failure.*

**Were all Phase 4 review findings addressed?**
All three Phase 4 findings are resolved.
*Reasoning: F1 HIGH (compactionEnabled wired to assembleSystemPrompt): adventure-routes.ts:244 passes `compactionEnabled: !!compactionService`. prompt-service.ts:107-118 conditionally includes the History Compaction guidance section. F2 MEDIUM (test for prompt guidance): prompt-service.test.ts:261-297 has two tests covering compactionEnabled=true and compactionEnabled=false/omitted. F3 LOW (allowedTools verification): compact-tool.test.ts:123-166 verifies allowedTools contains mcp__corvran__compact_history alongside roll_dice and set_mood. Lines 168-197 verify backward compatibility when compaction deps are absent.*

**Was the model configuration fix applied correctly?**
Partially. The compaction service receives model correctly, and the env var is read. But the AppDeps interface is missing the compactionModel field, breaking the DI chain specified by REQ-COMP-9a.
*Reasoning: compaction-service.ts:126 has `model?: string` in CompactionServiceDeps. Line 131 defaults to "haiku". app.ts:104 reads `process.env.COMPACTION_MODEL ?? "haiku"`. But AppDeps at lines 83-89 has no `compactionModel` field. The spec explicitly states: "The `AppDeps` interface gains a `compactionModel?: string` field. The DI chain in `app.ts` resolves as: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? 'haiku'`." The current code skips the deps level entirely: `process.env.COMPACTION_MODEL ?? "haiku"`. This breaks DI consistency (compare to session runner model: `deps.model ?? process.env.MODEL ?? "sonnet"`) and prevents tests from overriding the compaction model through deps.*

**Does the web client handle post-compaction history refresh failure?**
No. Silent failure when history refresh fails after successful compaction.
*Reasoning: page.tsx:118-122: After successful compaction, the client fetches history. If `historyRes.ok` is false, the code silently does nothing. No error is shown to the user, and the old (pre-compaction) messages remain displayed. The compaction actually succeeded on disk, so data integrity is fine, but the UI is stale. A page refresh would correct it. This is a minor UX gap, not a data integrity issue.*

**Do merge conflict markers remain in the codebase?**
No. Clean. grep for `<<<<<<` across all packages returned no results.
*Reasoning: Direct grep search confirmed zero files with conflict markers.*

**Are all spec requirements covered?**
All 41 requirements (REQ-COMP-1 through REQ-COMP-41, including REQ-COMP-9a) are addressed. One requirement (REQ-COMP-9a) has a partial deviation documented as a MEDIUM finding.
*Reasoning: Verified each requirement against implementation: REQ-COMP-1 through 6 (archive-summarize-save mechanism) in compaction-service.ts. REQ-COMP-7 through 10 (threshold trigger) in adventure-routes.ts:147-183 and app.ts:121-126. REQ-COMP-9a (model config) partially met. REQ-COMP-11 through 14 (GM tool) in compact-tool.ts and session-runner.ts:62-81. REQ-COMP-15 (player endpoint) in adventure-routes.ts:381-413. REQ-COMP-16 through 20 (prompts) in compaction-service.ts:26-51. REQ-COMP-21 through 23 (file format) in compaction-service.ts. REQ-COMP-24 through 28 (architecture integration) verified across app.ts, adventure-routes.ts, session-runner.ts, shared schemas. REQ-COMP-29 (concurrency) via in-memory Set in compaction-service.ts:132. REQ-COMP-30 (inline with turn) handled by SDK tool execution model. REQ-COMP-31 through 34 (web client) in page.tsx. REQ-COMP-35 through 41 (edge cases) in service and route error handling. All test suites cover the required cases from the plan.*
