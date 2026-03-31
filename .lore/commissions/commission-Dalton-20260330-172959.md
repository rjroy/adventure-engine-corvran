---
title: "Commission: Fix GM send stuck on stop button (SSE parser + missing Accept header)"
date: 2026-03-31
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix two bugs in the adventure play streaming flow that cause the stop button to never revert to the send button after the GM responds.\n\n## Bug 1: SSE parser loses event type across chunks (PRIMARY CAUSE)\n\nIn `packages/web/lib/use-adventure-stream.ts`, line 79: `let currentEventType = \"\"` is declared INSIDE the `while (true)` reader loop. This resets the event type on every `reader.read()` call. If an SSE `event: done` line and its corresponding `data: {...}` line arrive in different chunks from the reader, the event type is lost. The data line is parsed with `currentEventType === \"\"`, matches no handler (text, tool_use, done, error), and is silently ignored. `isStreaming` never becomes `false`.\n\n**Fix:** Move `let currentEventType = \"\"` OUTSIDE the `while` loop (before it), so the event type persists across reader chunks. Keep the `currentEventType = \"\"` reset on line 124 (after processing a data line) as-is, since that correctly resets between SSE events.\n\nAlso: after the `while` loop breaks (reader done), process any remaining data in `buffer` the same way. Currently, if the final chunk doesn't end with `\\n`, the last line stays in `buffer` and is never processed.\n\n## Bug 2: Missing Accept header causes buffered proxy instead of streaming\n\nIn `packages/web/lib/use-adventure-stream.ts`, the `fetch` call on line 50 doesn't set `Accept: text/event-stream`. The proxy at `packages/web/app/api/daemon/[...path]/route.ts` line 135 checks `request.headers.get(\"accept\")?.includes(\"text/event-stream\")` to decide whether to stream or buffer. Without this header, the proxy buffers the ENTIRE daemon response before returning it, so the user sees no progressive text, just everything at once.\n\n**Fix:** Add `Accept: \"text/event-stream\"` to the fetch headers:\n```js\nheaders: { \"Content-Type\": \"application/json\", \"Accept\": \"text/event-stream\" },\n```\n\n## Testing\n\n- Write tests for the SSE parser fix in `use-adventure-stream`. Test cases:\n  1. `done` event split across two chunks (event line in chunk 1, data line in chunk 2) - must still set isStreaming to false\n  2. All events in a single chunk - must still work (regression)\n  3. Final data line without trailing newline - must still be processed\n- Run `bun test` and ensure all tests pass."
dependencies: []
linked_artifacts:
  - packages/web/lib/use-adventure-stream.ts

  - packages/web/tests/use-adventure-stream.test.ts
  - packages/web/tests/use-adventure-stream.test.ts
activity_timeline:
  - timestamp: 2026-03-31T00:29:59.456Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T00:29:59.459Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-31T00:29:59.486Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-31T00:30:08.030Z
    event: progress_report
    reason: "Reading source files for the two bug fixes: SSE parser chunk persistence and missing Accept header."
  - timestamp: 2026-03-31T00:32:19.194Z
    event: result_submitted
    reason: "Fixed both SSE streaming bugs in `packages/web/lib/use-adventure-stream.ts`:\n\n**Bug 1 (SSE parser loses event type across chunks):** Moved `let currentEventType = \"\"` from inside the `while` loop to outside it, so event type persists across `reader.read()` calls. Added post-loop processing of any remaining buffer data for streams that don't end with `\\n`. Extracted line-processing into a local `processLine` function to eliminate duplication between the loop body and the post-loop handler.\n\n**Bug 2 (Missing Accept header):** Added `Accept: \"text/event-stream\"` to the fetch headers so the proxy streams instead of buffering.\n\n**Tests:** Added 7 new cross-chunk parsing tests covering: done event split across chunks, single-chunk regression, final line without trailing newline, event type split mid-line, data JSON split across chunks, error event split across chunks, and extreme 5-char chunking. All 14 tests in the file pass. Full suite: 239 pass, 0 fail. Typecheck clean."
  - timestamp: 2026-03-31T00:32:23.672Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Reading source files for the two bug fixes: SSE parser chunk persistence and missing Accept header."
projectName: corvran
---
Fixed both SSE streaming bugs in `packages/web/lib/use-adventure-stream.ts`:

**Bug 1 (SSE parser loses event type across chunks):** Moved `let currentEventType = ""` from inside the `while` loop to outside it, so event type persists across `reader.read()` calls. Added post-loop processing of any remaining buffer data for streams that don't end with `\n`. Extracted line-processing into a local `processLine` function to eliminate duplication between the loop body and the post-loop handler.

**Bug 2 (Missing Accept header):** Added `Accept: "text/event-stream"` to the fetch headers so the proxy streams instead of buffering.

**Tests:** Added 7 new cross-chunk parsing tests covering: done event split across chunks, single-chunk regression, final line without trailing newline, event type split mid-line, data JSON split across chunks, error event split across chunks, and extreme 5-char chunking. All 14 tests in the file pass. Full suite: 239 pass, 0 fail. Typecheck clean.
