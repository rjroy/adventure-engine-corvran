---
title: "Commission: Review: Compaction System Phase 4"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the Phase 4 implementation of the compaction system (GM compact tool and system prompt guidance).\n\nRead the plan at `.lore/plans/compaction-system-plan.md` (Phase 4 section) and the spec at `.lore/specs/compaction-system-spec.md`.\n\nAlso verify that any Phase 1 review findings were addressed.\n\nReview focus areas from the plan:\n- Tool registered in `allowedTools` array (mcp__corvran__compact_history)\n- Adventure context reading via fileOps (not stale data from turn start)\n- Prompt text matches spec REQ-COMP-13 verbatim\n- Tool follows dice-tool.ts pattern exactly\n- Session runner dependency changes (fileOps, compactionService) wired in app.ts\n- Test coverage for all five cases in Step 4.4\n\nFiles to review:\n- `packages/backend/src/services/compact-tool.ts`\n- `packages/backend/src/services/session-runner.ts` (tool registration, new deps)\n- `packages/backend/src/services/prompt-service.ts` (GM guidance)\n- `packages/backend/src/app.ts` (DI wiring changes)\n- `packages/backend/tests/services/compact-tool.test.ts`\n\nReport all findings by severity (HIGH/MEDIUM/LOW) with file paths and line numbers."
dependencies:
  - commission-Dalton-20260402-211949
linked_artifacts:
  - packages/backend/src/services/compact-tool.ts

  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/src/services/compaction-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/services/prompt-service.ts
  - packages/backend/src/app.ts
  - packages/backend/tests/services/compact-tool.test.ts
  - packages/backend/src/services/compaction-service.ts
activity_timeline:
  - timestamp: 2026-04-03T04:19:56.224Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T04:19:56.226Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-03T04:32:21.065Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-03T04:32:21.068Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T04:32:21.096Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T04:32:27.943Z
    event: progress_report
    reason: "Starting Phase 4 review. Reading plan, spec, and prior commission results."
  - timestamp: 2026-04-03T04:32:49.907Z
    event: progress_report
    reason: "All implementation files read. Now reading Phase 4 plan section and Phase 1 review findings, plus reference patterns."
  - timestamp: 2026-04-03T04:33:06.217Z
    event: progress_report
    reason: "All context loaded. Beginning systematic review against plan and spec requirements. Reviewing: compact-tool.ts, session-runner.ts, prompt-service.ts, app.ts, compact-tool.test.ts."
  - timestamp: 2026-04-03T04:35:33.967Z
    event: progress_report
    reason: "Review complete. Found 3 findings total: 1 HIGH (compactionEnabled never wired), 1 MEDIUM (no prompt guidance test), 1 LOW (MCP integration test doesn't verify allowedTools). Phase 1 findings all fixed. Preparing final report."
  - timestamp: 2026-04-03T04:36:08.569Z
    event: result_submitted
    reason: "## Phase 4 Compaction System Review: GM Compact Tool and System Prompt Guidance\n\n### Phase 1 Findings Remediation\n\nAll three Phase 1 findings are fixed:\n\n| Finding | Severity | Status | Evidence |\n|---|---|---|---|\n| F1: Missing 60s timeout | MEDIUM | Fixed | compaction-service.ts:174-198 — AbortController + setTimeout(60_000), cleared in finally |\n| F2: Type assertions | LOW | Fixed | compaction-service.ts:78,81 — Runtime property checks replace `as` casts |\n| F3: deleteFile rollback | LOW | Fixed | compaction-service.ts:164-170 — try-catch with archive cleanup on delete failure |\n\n### Phase 4 Requirements Coverage\n\n| Requirement | Status | Notes |\n|---|---|---|\n| REQ-COMP-11 (compact_history MCP tool) | Satisfied | compact-tool.ts:16, name `compact_history`, no required params |\n| REQ-COMP-12 (confirmation with archive path) | Satisfied | compact-tool.ts:25, \"History compacted. Scene archived to past/scene-NNN.md.\" |\n| REQ-COMP-13 (GM system prompt guidance) | **Defective** | Prompt text matches spec verbatim (prompt-service.ts:110-116), but `compactionEnabled` is never set to `true` in any code path. See F1. |\n| REQ-COMP-14 (no minimum for GM tool) | Satisfied | Tool has no length check; service's 500-char minimum applies (per spec interpretation) |\n| REQ-COMP-27 (tool in allowedTools) | Satisfied | session-runner.ts:80, `mcp__corvran__compact_history` added to toolNames array, which feeds allowedTools at line 95 |\n| REQ-COMP-30 (GM tool runs inline) | Satisfied | Tool is registered on the MCP server within runQuery; tool calls resolve as part of the SDK turn |\n| REQ-COMP-34 (no special UI for GM-triggered) | N/A | No UI changes needed, and none were made |\n\n### Findings\n\n**F1 — HIGH: `compactionEnabled` is never set to `true`; GM never sees compact_history guidance**\n\nFile: `packages/backend/src/routes/adventure-routes.ts:193-199`\nSpec: REQ-COMP-13\n\nThe `assembleSystemPrompt` call at adventure-routes.ts:193 does not pass `compactionEnabled: true`. Grep for `compactionEnabled` across the entire backend package returns only the type definition (prompt-service.ts:7) and the conditional check (prompt-service.ts:107). No code path ever enables this flag.\n\nImpact: The compact_history tool is registered on the MCP server and added to allowedTools (the tool is callable), but the system prompt never tells the GM it exists or when to use it. The AI would need to discover the tool from the MCP server's tool list on its own. REQ-COMP-13 requires the GM to receive explicit guidance about when to use the tool. Without this guidance, the tool is dead weight.\n\nFix: In adventure-routes.ts, pass `compactionEnabled: !!compactionService` (or `true` when compactionService is available) to `assembleSystemPrompt`. The route already receives `compactionService` as a dependency (line 123 of app.ts), so the signal is available.\n\n**F2 — MEDIUM: No test coverage for compactionEnabled prompt guidance**\n\nFile: `packages/backend/tests/prompt-service.test.ts`\nSpec: REQ-COMP-13\n\nThe prompt-service test file has 18 test cases but none test the `compactionEnabled` branch. No test verifies that the History Compaction section appears when `compactionEnabled: true`, or is absent when `false`. This means F1's fix won't have regression coverage.\n\nFix: Add two test cases to prompt-service.test.ts:\n1. `compactionEnabled: true` produces a prompt containing the compact_history guidance text\n2. `compactionEnabled: false` (or omitted) produces a prompt without it\n\n**F3 — LOW: MCP integration test does not verify tool registration or allowedTools**\n\nFile: `packages/backend/tests/services/compact-tool.test.ts:123-150`\nPlan: Step 4.4, test case 5\n\nThe test creates a session runner with compaction deps and asserts `runner` is defined and `runQuery` is a function. The test comment acknowledges this: \"We verify the allowedTools list includes compact_history by checking the runner was created without error\" (line 138-140). Creating a runner without error proves the factory doesn't throw, not that the tool is registered or that `mcp__corvran__compact_history` is in allowedTools.\n\nImpact: If someone accidentally removes the tool from the tools array or allowedTools, this test still passes. The actual registration is verified only by code inspection.\n\nFix: Spy on queryFn in this test. Call `runner.runQuery(...)` with minimal params, then inspect the options passed to queryFn. Assert that `options.allowedTools` includes `mcp__corvran__compact_history` and that `options.mcpServers.corvran` is defined. Also verify backward compat: a runner without compaction deps should have allowedTools that does NOT include compact_history.\n\n### Summary\n\nThe tool implementation (compact-tool.ts) and session runner registration (session-runner.ts) are correctly built. The prompt text matches the spec verbatim. The DI wiring in app.ts is correct. Phase 1 findings are all fixed.\n\nThe critical gap is F1: the wiring is incomplete at the last mile. The guidance text exists in the prompt service, the flag exists in the type, but nothing connects them. The route that calls `assembleSystemPrompt` doesn't pass `compactionEnabled`. This is a one-line fix, but without it, REQ-COMP-13 is not satisfied at runtime."
  - timestamp: 2026-04-03T04:36:17.163Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Review complete. Found 3 findings total: 1 HIGH (compactionEnabled never wired), 1 MEDIUM (no prompt guidance test), 1 LOW (MCP integration test doesn't verify allowedTools). Phase 1 findings all fixed. Preparing final report."
projectName: corvran
---
## Phase 4 Compaction System Review: GM Compact Tool and System Prompt Guidance

### Phase 1 Findings Remediation

All three Phase 1 findings are fixed:

| Finding | Severity | Status | Evidence |
|---|---|---|---|
| F1: Missing 60s timeout | MEDIUM | Fixed | compaction-service.ts:174-198 — AbortController + setTimeout(60_000), cleared in finally |
| F2: Type assertions | LOW | Fixed | compaction-service.ts:78,81 — Runtime property checks replace `as` casts |
| F3: deleteFile rollback | LOW | Fixed | compaction-service.ts:164-170 — try-catch with archive cleanup on delete failure |

### Phase 4 Requirements Coverage

| Requirement | Status | Notes |
|---|---|---|
| REQ-COMP-11 (compact_history MCP tool) | Satisfied | compact-tool.ts:16, name `compact_history`, no required params |
| REQ-COMP-12 (confirmation with archive path) | Satisfied | compact-tool.ts:25, "History compacted. Scene archived to past/scene-NNN.md." |
| REQ-COMP-13 (GM system prompt guidance) | **Defective** | Prompt text matches spec verbatim (prompt-service.ts:110-116), but `compactionEnabled` is never set to `true` in any code path. See F1. |
| REQ-COMP-14 (no minimum for GM tool) | Satisfied | Tool has no length check; service's 500-char minimum applies (per spec interpretation) |
| REQ-COMP-27 (tool in allowedTools) | Satisfied | session-runner.ts:80, `mcp__corvran__compact_history` added to toolNames array, which feeds allowedTools at line 95 |
| REQ-COMP-30 (GM tool runs inline) | Satisfied | Tool is registered on the MCP server within runQuery; tool calls resolve as part of the SDK turn |
| REQ-COMP-34 (no special UI for GM-triggered) | N/A | No UI changes needed, and none were made |

### Findings

**F1 — HIGH: `compactionEnabled` is never set to `true`; GM never sees compact_history guidance**

File: `packages/backend/src/routes/adventure-routes.ts:193-199`
Spec: REQ-COMP-13

The `assembleSystemPrompt` call at adventure-routes.ts:193 does not pass `compactionEnabled: true`. Grep for `compactionEnabled` across the entire backend package returns only the type definition (prompt-service.ts:7) and the conditional check (prompt-service.ts:107). No code path ever enables this flag.

Impact: The compact_history tool is registered on the MCP server and added to allowedTools (the tool is callable), but the system prompt never tells the GM it exists or when to use it. The AI would need to discover the tool from the MCP server's tool list on its own. REQ-COMP-13 requires the GM to receive explicit guidance about when to use the tool. Without this guidance, the tool is dead weight.

Fix: In adventure-routes.ts, pass `compactionEnabled: !!compactionService` (or `true` when compactionService is available) to `assembleSystemPrompt`. The route already receives `compactionService` as a dependency (line 123 of app.ts), so the signal is available.

**F2 — MEDIUM: No test coverage for compactionEnabled prompt guidance**

File: `packages/backend/tests/prompt-service.test.ts`
Spec: REQ-COMP-13

The prompt-service test file has 18 test cases but none test the `compactionEnabled` branch. No test verifies that the History Compaction section appears when `compactionEnabled: true`, or is absent when `false`. This means F1's fix won't have regression coverage.

Fix: Add two test cases to prompt-service.test.ts:
1. `compactionEnabled: true` produces a prompt containing the compact_history guidance text
2. `compactionEnabled: false` (or omitted) produces a prompt without it

**F3 — LOW: MCP integration test does not verify tool registration or allowedTools**

File: `packages/backend/tests/services/compact-tool.test.ts:123-150`
Plan: Step 4.4, test case 5

The test creates a session runner with compaction deps and asserts `runner` is defined and `runQuery` is a function. The test comment acknowledges this: "We verify the allowedTools list includes compact_history by checking the runner was created without error" (line 138-140). Creating a runner without error proves the factory doesn't throw, not that the tool is registered or that `mcp__corvran__compact_history` is in allowedTools.

Impact: If someone accidentally removes the tool from the tools array or allowedTools, this test still passes. The actual registration is verified only by code inspection.

Fix: Spy on queryFn in this test. Call `runner.runQuery(...)` with minimal params, then inspect the options passed to queryFn. Assert that `options.allowedTools` includes `mcp__corvran__compact_history` and that `options.mcpServers.corvran` is defined. Also verify backward compat: a runner without compaction deps should have allowedTools that does NOT include compact_history.

### Summary

The tool implementation (compact-tool.ts) and session runner registration (session-runner.ts) are correctly built. The prompt text matches the spec verbatim. The DI wiring in app.ts is correct. Phase 1 findings are all fixed.

The critical gap is F1: the wiring is incomplete at the last mile. The guidance text exists in the prompt service, the flag exists in the type, but nothing connects them. The route that calls `assembleSystemPrompt` doesn't pass `compactionEnabled`. This is a one-line fix, but without it, REQ-COMP-13 is not satisfied at runtime.

## Decisions

**Is compactionEnabled ever set to true in any code path?**
FINDING — MEDIUM: compactionEnabled is never set to true. The flag exists in AdventureState and is checked in prompt-service.ts, but no code in the routes or elsewhere passes compactionEnabled: true when calling assembleSystemPrompt. The GM will never see the compact_history tool guidance.
*Reasoning: Grep for "compactionEnabled" across the entire backend package returns only the type definition (prompt-service.ts:7) and the conditional check (prompt-service.ts:107). No code sets it to true. The adventure routes call assembleSystemPrompt but don't include compactionEnabled in the state. The tool is registered on the MCP server and in allowedTools, so the AI CAN call it, but the system prompt never tells the AI about it. REQ-COMP-13 requires the GM to receive guidance about when to use the tool.*

**Is the compactionEnabled flag tested anywhere?**
FINDING — MEDIUM: No test for compactionEnabled in prompt-service.test.ts. The flag was added to the type and checked in the function, but no test verifies the prompt includes the compaction guidance when compactionEnabled is true, or omits it when false.
*Reasoning: Grep for "compactionEnabled" in the tests directory returns no matches. The prompt-service.test.ts has many test cases but none test the compactionEnabled conditional branch. This means the feature has no test coverage at all for the prompt guidance.*

**Does the MCP integration test (test 5) actually verify compact_history is in allowedTools?**
FINDING — LOW: The MCP integration test (compact-tool.test.ts:123-150) does not verify that compact_history is in the allowedTools array. It creates a session runner with compaction deps and asserts the runner exists and has runQuery, but never inspects the tools or allowedTools. The test also verifies backward compat (runner without compaction), which is good, but the core claim — that compact_history is registered alongside roll_dice and set_mood and is in allowedTools — is not verified.
*Reasoning: The test at line 131-136 creates a runner and at line 141-142 asserts `expect(runner).toBeDefined()` and `expect(runner.runQuery).toBeTypeOf("function")`. This proves the factory doesn't throw, not that the tool is registered. To actually verify registration, the test would need to inspect the options passed to queryFn (via spy/mock) or inspect the MCP server's tool list. The comment at line 138-140 acknowledges this limitation: "We verify the allowedTools list includes compact_history by checking the runner was created without error" — which is not a verification of allowedTools at all.*

**Were all three Phase 1 review findings addressed?**
All three Phase 1 findings are fixed.
*Reasoning: F1 (MEDIUM, missing timeout): compaction-service.ts:174-198 creates AbortController with setTimeout(60_000), passes it to queryFn options, and clears in finally block. Fixed correctly.

F2 (LOW, type assertions): compaction-service.ts:78 uses `"result" in msg && typeof msg.result === "string"` runtime check instead of `as` cast. Line 81 uses `"errors" in msg && Array.isArray(msg.errors)`. Fixed correctly.

F3 (LOW, deleteFile rollback): compaction-service.ts:164-170 wraps deleteFile in try-catch, and on failure attempts to delete the archive to prevent two copies on disk. Fixed correctly.*

**Does the compact tool's input schema correctly implement REQ-COMP-11's "no required parameters"?**
The implementation uses `{ _unused: z.string().optional() }` which exposes an `_unused` parameter to the AI. This is a workaround for the SDK's `tool()` function likely requiring a non-empty schema object. Functionally correct (no required parameters), but the `_unused` name is visible to the AI and could confuse it.
*Reasoning: REQ-COMP-11 says "The tool takes no required parameters." The dice-tool.ts uses a real schema with required fields. The SDK `tool()` function's third argument is the input schema, and it may not accept an empty object `{}`. The `_unused: z.string().optional()` pattern ensures the schema has at least one key while making it optional. This satisfies "no required parameters" but exposes the field name to the AI. This is LOW severity since the AI won't meaningfully interact with it.*

**Does getAdventureContext read adventure context at tool-call time (not stale from turn start)?**
PASS. The callback reads files via fileOps at invocation time.
*Reasoning: session-runner.ts:69-77 creates a closure that reads character.md and world.md via fileOps.readFile when called. The closure is passed to createCompactToolDef as `getAdventureContext`. In compact-tool.ts:21, the handler calls `await getAdventureContext()` at the moment the tool is invoked by the AI, not when the tool definition is created. This means the context is fresh at tool-call time. The plan explicitly required this: "reads character.md and world.md at tool-call time (not stale from turn start)."*

**Does the prompt guidance placement match the plan's specification?**
PASS. The `## History Compaction` subsection appears after the `# Instructions` section, matching the plan's Step 4.3 specification.
*Reasoning: The plan says: "as a `## History Compaction` subsection after the Instructions section." The implementation adds it as a separate element in the sections array (line 107-118), which after join("\n\n") places it immediately after the Instructions section. The `##` heading makes it visually a subsection of the preceding `#` section in markdown hierarchy. The spec says it should be "part of the Instructions section (alongside existing tool guidance)." The `##` heading under `# Instructions` achieves this in markdown's heading hierarchy.*

**Is the DI wiring in app.ts correct for Phase 4?**
PASS. DI wiring is correct.
*Reasoning: app.ts:103-105 creates compactionService when queryFn exists. Lines 109-116 pass both fileOps and compactionService to createSessionRunner. Line 123-124 passes compactionService to createAdventureRoutes. The ordering is correct: compactionService is created before sessionRunner (which depends on it). Backward compatible: when queryFn is absent, both compactionService and sessionRunner are undefined.*

**Do the tests cover all five cases from Step 4.4?**
All five test cases are present, but two have quality concerns (see separate findings for test 5 and missing prompt test).
*Reasoning: Plan Step 4.4 lists:
1. Tool definition shape — compact-tool.test.ts:26-39. Checks name, description, inputSchema. ✓
2. Successful compaction — compact-tool.test.ts:41-60. Uses real compaction service with mock fileOps and queryFn, verifies confirmation text with archive path. ✓
3. Short history — compact-tool.test.ts:62-76. Uses real service, verifies "too short" message. ✓
4. Concurrency — compact-tool.test.ts:78-121. Uses delaying queryFn to hold lock, verifies "already in progress" message. ✓
5. MCP integration — compact-tool.test.ts:123-150. Creates session runner with compaction deps, verifies it exists. Weak verification (see separate finding).*
