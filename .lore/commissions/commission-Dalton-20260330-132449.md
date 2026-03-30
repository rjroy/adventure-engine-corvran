---
title: "Commission: Auto-scroll chat on page load and new responses"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix the chat scroll behavior in the web client. Currently when returning to a chat, the user has to manually scroll to the bottom. Two behaviors needed:\n\n1. **On page load**: Auto-scroll to the bottom of the chat history so the user sees the most recent messages.\n2. **On new response**: Auto-scroll to the bottom when a new message/response arrives.\n\nLook at the chat component in `packages/web/` (likely in `app/adventure/` or similar). Find where the message list is rendered and add scroll-to-bottom behavior using a ref on the container or sentinel element.\n\nStandard pattern: `useEffect` with a ref to scroll to bottom when messages change, plus scroll on initial render. Use `scrollIntoView({ behavior: 'smooth' })` for new messages, instant scroll for initial load.\n\nInclude tests if there's an existing test pattern for web components. At minimum, `bun run build` must pass clean."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T20:24:49.510Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T20:24:49.512Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
