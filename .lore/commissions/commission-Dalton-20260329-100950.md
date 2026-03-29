---
title: "Commission: MVP Phase 3: AI Integration"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 from `.lore/plans/mvp-implementation.md`: AI Integration.\n\n**Read the full plan first** — the Phase 3 section has exact specifications including SDK message type discriminants and the streaming model.\n\n**What to build:**\n1. Prompt assembly service (`src/services/prompt-service.ts`) — assembleSystemPrompt() builds system prompt per REQ-MVP-12: identity, principles, adventure state (character+world with absence notes), conditional onboarding, conversation history, instructions. Pure function, no I/O.\n2. Session runner (`src/services/session-runner.ts`) — runQuery() wraps the SDK call. Takes injected queryFn matching SDK signature. Returns async generator of SDKMessage. Configuration: systemPrompt, cwd, plugins (3 hardcoded paths), tools, permissionMode: 'dontAsk', persistSession: false, model from config, includePartialMessages: true, abortController.\n3. History service (`src/services/history-service.ts`) — appendPlayerMessage(), appendGMResponse(), readHistory(). Uses injected FileOps. Creates history.md on first message (REQ-MVP-3). Format: **Player:** and **GM:** labels with blank line separators.\n4. Message route — extend adventure-routes.ts with POST /adventures/:id/message. SSE streaming endpoint: validate body, read adventure state, append player message, assemble prompt, call session runner, stream SSE events (text, tool_use, done, error). Handle client disconnect via AbortController.\n5. Context overflow handling — detect token limit errors in SDKResultMessage errors[], return spec error message.\n\n**Critical SDK details from the plan:**\n- SDK call: `query({ prompt: playerMessage, options: { systemPrompt, cwd, plugins, tools, allowedTools, permissionMode, persistSession, model, includePartialMessages, abortController } })`\n- Streaming: query() returns AsyncGenerator<SDKMessage>. With includePartialMessages: true, yields SDKPartialAssistantMessage (type === 'stream_event') containing RawMessageStreamEvent. Text deltas in content_block_delta where delta.type === 'text_delta'.\n- Tool results: SDKAssistantMessage (type === 'assistant') with tool_use content blocks, followed by SDKUserMessage (type === 'user') with tool_use_result.\n- Terminal: SDKResultMessage (type === 'result'). On success, result field has full response text.\n- Abort: use AbortController in options, NOT query.interrupt()\n- Plugin paths: plugins/corvran, plugins/d20-system, plugins/daggerheart-system resolved to absolute paths\n\n**Tests required:**\n- Prompt assembly: all file states, correct order, absence notes, onboarding conditional\n- SSE stream: mock queryFn yielding text events, verify SSE output\n- History append: two messages, verify format and ordering\n- Fresh file read: modify history between requests, verify second request reflects edit\n- Context overflow: mock SDK error with token limit message, verify spec error response. Also test AbortError exception path.\n- Stop behavior: abort mid-stream, verify partial response appended to history\n- Empty/missing message: POST returns 400"
dependencies:
  - commission-Thorne-20260329-100927
linked_artifacts:
  - packages/backend/src/services/prompt-service.ts

  - packages/backend/src/services/history-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/app.ts
  - packages/backend/src/index.ts
  - packages/backend/src/types.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/tests/prompt-service.test.ts
  - packages/backend/tests/history-service.test.ts
  - packages/backend/tests/message-route.test.ts
  - packages/backend/tests/helpers/mock-query.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
  - packages/backend/tests/routes.test.ts
  - packages/backend/src/services/history-service.ts
  - packages/backend/src/services/session-runner.ts
  - packages/backend/src/routes/adventure-routes.ts
  - packages/backend/src/app.ts
  - packages/backend/src/index.ts
  - packages/backend/src/types.ts
  - packages/backend/src/services/adventure-service.ts
  - packages/backend/tests/prompt-service.test.ts
  - packages/backend/tests/history-service.test.ts
  - packages/backend/tests/message-route.test.ts
  - packages/backend/tests/helpers/mock-query.ts
  - packages/backend/tests/helpers/mock-file-ops.ts
  - packages/backend/tests/routes.test.ts
activity_timeline:
  - timestamp: 2026-03-29T17:09:50.525Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:09:50.528Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-29T17:53:57.595Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-29T17:53:57.597Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T17:53:57.614Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T17:54:04.891Z
    event: progress_report
    reason: "Starting Phase 3: AI Integration. Reading the implementation plan and existing codebase."
  - timestamp: 2026-03-29T17:55:08.714Z
    event: progress_report
    reason: "Read plan, spec, architecture pattern, and all Phase 2 code. Starting implementation: prompt-service, history-service, session-runner, then message route. FileOps needs a writeFile method for history service."
  - timestamp: 2026-03-29T18:00:44.499Z
    event: progress_report
    reason: "All source files built: prompt-service, history-service, session-runner, message route. Existing tests pass (24/24). Now writing Phase 3 tests."
  - timestamp: 2026-03-29T18:04:51.941Z
    event: progress_report
    reason: "Phase 3 implementation complete. All source files written, build clean, 49/49 tests passing (25 new Phase 3 tests + 24 existing Phase 2 tests). Ready for review submission."
  - timestamp: 2026-03-29T18:05:12.403Z
    event: result_submitted
    reason: "Phase 3 (AI Integration) implemented. Build clean, 49/49 tests pass.\n\n**New files created:**\n- `src/services/prompt-service.ts` — assembleSystemPrompt() builds system prompt per REQ-MVP-12 (identity, principles, adventure state with absence notes, conditional onboarding, history, instructions). Pure function.\n- `src/services/history-service.ts` — appendPlayerMessage(), appendGMResponse(), readHistory(). Uses injected FileOps. Creates history.md on first message (REQ-MVP-3).\n- `src/services/session-runner.ts` — runQuery() wraps SDK call with injected queryFn. Configures tools, plugins (3 hardcoded paths), permissionMode: 'dontAsk', persistSession: false, includePartialMessages: true, AbortController.\n- `tests/helpers/mock-query.ts` — Test helpers: createMockQueryFn, createThrowingQueryFn, textDelta, successResult, errorResult.\n- `tests/prompt-service.test.ts` — 8 tests: all file states, section order, absence notes, onboarding conditional.\n- `tests/history-service.test.ts` — 6 tests: create, append, format, read null/content, fresh file read (REQ-MVP-17).\n- `tests/message-route.test.ts` — 11 tests: SSE streaming, history append, context overflow, AbortError, 400/404 validation, fresh read between requests.\n\n**Modified files:**\n- `src/types.ts` — Added writeFile/appendFile to FileOps interface.\n- `src/app.ts` — Wires historyService and sessionRunner into adventure routes. Production passes real SDK query(). AppDeps interface for DI.\n- `src/index.ts` — Imports and passes real SDK query function.\n- `src/routes/adventure-routes.ts` — Replaced 501 stub with full SSE streaming endpoint. Validates body, reads adventure state fresh each turn, appends player message, assembles prompt, streams SDK events (text, tool_use, done, error), handles context overflow and AbortError.\n- `src/services/adventure-service.ts` — Added getAdventurePath() method.\n- `tests/helpers/mock-file-ops.ts` — Added writeFile, appendFile, getStore() for test inspection.\n- `tests/routes.test.ts` — Updated 501 stub test to expect 503 (AI not configured).\n\n**Decisions made:**\n- Extended FileOps with writeFile/appendFile (history service needs write access, DI pattern preserved).\n- Fixed Thorne's CONCERN-1: POST /message returns 404 for nonexistent adventures (consistent with GET /adventures/:id)."
  - timestamp: 2026-03-29T18:05:20.699Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Phase 3 implementation complete. All source files written, build clean, 49/49 tests passing (25 new Phase 3 tests + 24 existing Phase 2 tests). Ready for review submission."
projectName: corvran
---
Phase 3 (AI Integration) implemented. Build clean, 49/49 tests pass.

**New files created:**
- `src/services/prompt-service.ts` — assembleSystemPrompt() builds system prompt per REQ-MVP-12 (identity, principles, adventure state with absence notes, conditional onboarding, history, instructions). Pure function.
- `src/services/history-service.ts` — appendPlayerMessage(), appendGMResponse(), readHistory(). Uses injected FileOps. Creates history.md on first message (REQ-MVP-3).
- `src/services/session-runner.ts` — runQuery() wraps SDK call with injected queryFn. Configures tools, plugins (3 hardcoded paths), permissionMode: 'dontAsk', persistSession: false, includePartialMessages: true, AbortController.
- `tests/helpers/mock-query.ts` — Test helpers: createMockQueryFn, createThrowingQueryFn, textDelta, successResult, errorResult.
- `tests/prompt-service.test.ts` — 8 tests: all file states, section order, absence notes, onboarding conditional.
- `tests/history-service.test.ts` — 6 tests: create, append, format, read null/content, fresh file read (REQ-MVP-17).
- `tests/message-route.test.ts` — 11 tests: SSE streaming, history append, context overflow, AbortError, 400/404 validation, fresh read between requests.

**Modified files:**
- `src/types.ts` — Added writeFile/appendFile to FileOps interface.
- `src/app.ts` — Wires historyService and sessionRunner into adventure routes. Production passes real SDK query(). AppDeps interface for DI.
- `src/index.ts` — Imports and passes real SDK query function.
- `src/routes/adventure-routes.ts` — Replaced 501 stub with full SSE streaming endpoint. Validates body, reads adventure state fresh each turn, appends player message, assembles prompt, streams SDK events (text, tool_use, done, error), handles context overflow and AbortError.
- `src/services/adventure-service.ts` — Added getAdventurePath() method.
- `tests/helpers/mock-file-ops.ts` — Added writeFile, appendFile, getStore() for test inspection.
- `tests/routes.test.ts` — Updated 501 stub test to expect 503 (AI not configured).

**Decisions made:**
- Extended FileOps with writeFile/appendFile (history service needs write access, DI pattern preserved).
- Fixed Thorne's CONCERN-1: POST /message returns 404 for nonexistent adventures (consistent with GET /adventures/:id).

## Decisions

**How should history-service write to files given FileOps has no write method?**
Add writeFile and appendFile to the FileOps interface. The history service needs appendFile for appending messages. writeFile covers the "create file if it doesn't exist" case (though appendFile to a nonexistent file could also work).
*Reasoning: The plan says history service "uses injected FileOps from Phase 2" but Phase 2 FileOps only has read operations. Writing history.md is a core requirement (REQ-MVP-16). Extending the existing interface keeps the DI pattern intact. appendFile is the natural operation for history appending.*

**Should I fix Thorne's CONCERN-1 (history endpoint returning 200 for nonexistent adventures)?**
Yes, fix it now. POST /message needs adventure existence checks returning 404, and the history endpoint inconsistency compounds. I'll add existence checks to the history GET endpoint while I'm wiring up the message route.
*Reasoning: Thorne flagged this as "recommended for resolution before Phase 3." Since I'm modifying adventure-routes.ts anyway, fixing this now is minimal extra work and prevents the inconsistency from propagating.*
