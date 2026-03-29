---
title: "Commission: Fix iOS Mobile UX: Viewport Stability and Enter Key Behavior"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Two iOS mobile UX bugs found during manual testing. Fix both.\n\n## Bug 1: iOS Viewport Resize and Slide\n\nThe page resizes and slides around on iOS when the virtual keyboard appears/disappears.\n\n**Fix needed:**\n- Add viewport meta tag to `packages/web/app/layout.tsx` with `viewport-fit=cover` and `interactive-widget=resizes-content` (or `resizes-visual`)\n- Use `dvh` (dynamic viewport height) units in CSS where `vh` is currently used, or use `100dvh` for the main layout container\n- Ensure the input area stays pinned at the bottom when the keyboard opens\n\nCheck `packages/web/app/globals.css` and `packages/web/app/adventure/[id]/page.module.css` for any `vh` usage that needs updating.\n\n## Bug 2: Enter Key Should Insert Newline on Mobile\n\nCurrently in `packages/web/app/adventure/[id]/page.tsx` line 70-75, `Enter` sends the message and `Shift+Enter` adds a newline. On iOS there's no convenient Shift+Enter key.\n\n**Fix needed:**\n- On mobile/touch devices: Enter should insert a newline. Users tap the send button to send.\n- On desktop: Keep current behavior (Enter sends, Shift+Enter for newline).\n- Detect touch capability via `'ontouchstart' in window` or `navigator.maxTouchPoints > 0` (check once, not on every keypress).\n- The send button already exists in the UI, so mobile users have a clear send affordance.\n\n## Testing\n- Write tests for the keyboard handler logic (desktop vs mobile behavior)\n- Verify the build passes after changes"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T21:03:58.090Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T21:03:58.094Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
