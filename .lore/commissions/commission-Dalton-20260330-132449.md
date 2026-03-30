---
title: "Commission: Auto-scroll chat on page load and new responses"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix the chat scroll behavior in the web client. Currently when returning to a chat, the user has to manually scroll to the bottom. Two behaviors needed:\n\n1. **On page load**: Auto-scroll to the bottom of the chat history so the user sees the most recent messages.\n2. **On new response**: Auto-scroll to the bottom when a new message/response arrives.\n\nLook at the chat component in `packages/web/` (likely in `app/adventure/` or similar). Find where the message list is rendered and add scroll-to-bottom behavior using a ref on the container or sentinel element.\n\nStandard pattern: `useEffect` with a ref to scroll to bottom when messages change, plus scroll on initial render. Use `scrollIntoView({ behavior: 'smooth' })` for new messages, instant scroll for initial load.\n\nInclude tests if there's an existing test pattern for web components. At minimum, `bun run build` must pass clean."
dependencies: []
linked_artifacts:
  - packages/web/app/adventure/[id]/page.tsx

activity_timeline:
  - timestamp: 2026-03-30T20:24:49.510Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T20:24:49.512Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T20:24:49.543Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T20:25:35.830Z
    event: progress_report
    reason: "Read the chat component. Current scroll behavior only fires during streaming. Need to add: (1) instant scroll to bottom on initial history load, (2) smooth scroll when messages array grows (new response complete). Implementing now."
  - timestamp: 2026-03-30T20:26:55.132Z
    event: result_submitted
    reason: "Fixed chat scroll behavior in `packages/web/app/adventure/[id]/page.tsx`. Three scroll behaviors now work:\n\n1. **Initial load**: When history loads, instantly scrolls to bottom (no animation) so the user sees the most recent messages. Uses a `hasScrolledOnLoad` ref to fire exactly once.\n2. **New message added**: When messages array grows (stream complete, player sends), smooth-scrolls to bottom. Uses a `prevMessageCount` ref to detect additions vs initial load.\n3. **During streaming**: Existing behavior preserved (scrolls to last message ref as content streams in).\n\nImplementation uses a sentinel `<div ref={bottomRef} />` at the bottom of the conversation container as the scroll target. No new dependencies, no CSS changes.\n\nBuild passes clean (typecheck + Next.js production build). All 35 existing web tests pass."
  - timestamp: 2026-03-30T20:26:59.277Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read the chat component. Current scroll behavior only fires during streaming. Need to add: (1) instant scroll to bottom on initial history load, (2) smooth scroll when messages array grows (new response complete). Implementing now."
projectName: corvran
---
Fixed chat scroll behavior in `packages/web/app/adventure/[id]/page.tsx`. Three scroll behaviors now work:

1. **Initial load**: When history loads, instantly scrolls to bottom (no animation) so the user sees the most recent messages. Uses a `hasScrolledOnLoad` ref to fire exactly once.
2. **New message added**: When messages array grows (stream complete, player sends), smooth-scrolls to bottom. Uses a `prevMessageCount` ref to detect additions vs initial load.
3. **During streaming**: Existing behavior preserved (scrolls to last message ref as content streams in).

Implementation uses a sentinel `<div ref={bottomRef} />` at the bottom of the conversation container as the scroll target. No new dependencies, no CSS changes.

Build passes clean (typecheck + Next.js production build). All 35 existing web tests pass.
