---
title: "Commission: MVP Phase 3: AI Integration"
date: 2026-03-29
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 3 from `.lore/plans/mvp-implementation.md`: AI Integration.\n\n**Read the full plan first** — the Phase 3 section has exact specifications including SDK message type discriminants and the streaming model.\n\n**What to build:**\n1. Prompt assembly service (`src/services/prompt-service.ts`) — assembleSystemPrompt() builds system prompt per REQ-MVP-12: identity, principles, adventure state (character+world with absence notes), conditional onboarding, conversation history, instructions. Pure function, no I/O.\n2. Session runner (`src/services/session-runner.ts`) — runQuery() wraps the SDK call. Takes injected queryFn matching SDK signature. Returns async generator of SDKMessage. Configuration: systemPrompt, cwd, plugins (3 hardcoded paths), tools, permissionMode: 'dontAsk', persistSession: false, model from config, includePartialMessages: true, abortController.\n3. History service (`src/services/history-service.ts`) — appendPlayerMessage(), appendGMResponse(), readHistory(). Uses injected FileOps. Creates history.md on first message (REQ-MVP-3). Format: **Player:** and **GM:** labels with blank line separators.\n4. Message route — extend adventure-routes.ts with POST /adventures/:id/message. SSE streaming endpoint: validate body, read adventure state, append player message, assemble prompt, call session runner, stream SSE events (text, tool_use, done, error). Handle client disconnect via AbortController.\n5. Context overflow handling — detect token limit errors in SDKResultMessage errors[], return spec error message.\n\n**Critical SDK details from the plan:**\n- SDK call: `query({ prompt: playerMessage, options: { systemPrompt, cwd, plugins, tools, allowedTools, permissionMode, persistSession, model, includePartialMessages, abortController } })`\n- Streaming: query() returns AsyncGenerator<SDKMessage>. With includePartialMessages: true, yields SDKPartialAssistantMessage (type === 'stream_event') containing RawMessageStreamEvent. Text deltas in content_block_delta where delta.type === 'text_delta'.\n- Tool results: SDKAssistantMessage (type === 'assistant') with tool_use content blocks, followed by SDKUserMessage (type === 'user') with tool_use_result.\n- Terminal: SDKResultMessage (type === 'result'). On success, result field has full response text.\n- Abort: use AbortController in options, NOT query.interrupt()\n- Plugin paths: plugins/corvran, plugins/d20-system, plugins/daggerheart-system resolved to absolute paths\n\n**Tests required:**\n- Prompt assembly: all file states, correct order, absence notes, onboarding conditional\n- SSE stream: mock queryFn yielding text events, verify SSE output\n- History append: two messages, verify format and ordering\n- Fresh file read: modify history between requests, verify second request reflects edit\n- Context overflow: mock SDK error with token limit message, verify spec error response. Also test AbortError exception path.\n- Stop behavior: abort mid-stream, verify partial response appended to history\n- Empty/missing message: POST returns 400"
dependencies:
  - commission-Thorne-20260329-100927
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T17:09:50.525Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:09:50.528Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
