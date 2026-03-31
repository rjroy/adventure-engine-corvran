---
title: "Commission: Fix GM send stuck on stop button (SSE parser + missing Accept header)"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix two bugs in the adventure play streaming flow that cause the stop button to never revert to the send button after the GM responds.\n\n## Bug 1: SSE parser loses event type across chunks (PRIMARY CAUSE)\n\nIn `packages/web/lib/use-adventure-stream.ts`, line 79: `let currentEventType = \"\"` is declared INSIDE the `while (true)` reader loop. This resets the event type on every `reader.read()` call. If an SSE `event: done` line and its corresponding `data: {...}` line arrive in different chunks from the reader, the event type is lost. The data line is parsed with `currentEventType === \"\"`, matches no handler (text, tool_use, done, error), and is silently ignored. `isStreaming` never becomes `false`.\n\n**Fix:** Move `let currentEventType = \"\"` OUTSIDE the `while` loop (before it), so the event type persists across reader chunks. Keep the `currentEventType = \"\"` reset on line 124 (after processing a data line) as-is, since that correctly resets between SSE events.\n\nAlso: after the `while` loop breaks (reader done), process any remaining data in `buffer` the same way. Currently, if the final chunk doesn't end with `\\n`, the last line stays in `buffer` and is never processed.\n\n## Bug 2: Missing Accept header causes buffered proxy instead of streaming\n\nIn `packages/web/lib/use-adventure-stream.ts`, the `fetch` call on line 50 doesn't set `Accept: text/event-stream`. The proxy at `packages/web/app/api/daemon/[...path]/route.ts` line 135 checks `request.headers.get(\"accept\")?.includes(\"text/event-stream\")` to decide whether to stream or buffer. Without this header, the proxy buffers the ENTIRE daemon response before returning it, so the user sees no progressive text, just everything at once.\n\n**Fix:** Add `Accept: \"text/event-stream\"` to the fetch headers:\n```js\nheaders: { \"Content-Type\": \"application/json\", \"Accept\": \"text/event-stream\" },\n```\n\n## Testing\n\n- Write tests for the SSE parser fix in `use-adventure-stream`. Test cases:\n  1. `done` event split across two chunks (event line in chunk 1, data line in chunk 2) - must still set isStreaming to false\n  2. All events in a single chunk - must still work (regression)\n  3. Final data line without trailing newline - must still be processed\n- Run `bun test` and ensure all tests pass."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T00:29:59.456Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:29:59.459Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
