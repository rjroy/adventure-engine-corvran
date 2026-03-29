---
title: "Commission: Fix iOS Mobile UX: Viewport Stability and Enter Key Behavior"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Two iOS mobile UX bugs found during manual testing. Fix both.\n\n## Bug 1: iOS Viewport Resize and Slide\n\nThe page resizes and slides around on iOS when the virtual keyboard appears/disappears.\n\n**Fix needed:**\n- Add viewport meta tag to `packages/web/app/layout.tsx` with `viewport-fit=cover` and `interactive-widget=resizes-content` (or `resizes-visual`)\n- Use `dvh` (dynamic viewport height) units in CSS where `vh` is currently used, or use `100dvh` for the main layout container\n- Ensure the input area stays pinned at the bottom when the keyboard opens\n\nCheck `packages/web/app/globals.css` and `packages/web/app/adventure/[id]/page.module.css` for any `vh` usage that needs updating.\n\n## Bug 2: Enter Key Should Insert Newline on Mobile\n\nCurrently in `packages/web/app/adventure/[id]/page.tsx` line 70-75, `Enter` sends the message and `Shift+Enter` adds a newline. On iOS there's no convenient Shift+Enter key.\n\n**Fix needed:**\n- On mobile/touch devices: Enter should insert a newline. Users tap the send button to send.\n- On desktop: Keep current behavior (Enter sends, Shift+Enter for newline).\n- Detect touch capability via `'ontouchstart' in window` or `navigator.maxTouchPoints > 0` (check once, not on every keypress).\n- The send button already exists in the UI, so mobile users have a clear send affordance.\n\n## Testing\n- Write tests for the keyboard handler logic (desktop vs mobile behavior)\n- Verify the build passes after changes"
dependencies: []
linked_artifacts:
  - packages/web/app/layout.tsx

  - packages/web/app/globals.css
  - packages/web/app/adventure/[id]/page.module.css
  - packages/web/app/page.module.css
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/lib/keyboard-handler.ts
  - packages/web/tests/keyboard-handler.test.ts
  - packages/web/app/globals.css
  - packages/web/app/adventure/[id]/page.module.css
  - packages/web/app/page.module.css
  - packages/web/app/adventure/[id]/page.tsx
  - packages/web/lib/keyboard-handler.ts
  - packages/web/tests/keyboard-handler.test.ts
activity_timeline:
  - timestamp: 2026-03-29T21:03:58.090Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T21:03:58.094Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T21:03:58.121Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T21:04:04.386Z
    event: progress_report
    reason: "Starting work on two iOS mobile UX bugs. Reading source files to understand current state."
  - timestamp: 2026-03-29T21:05:44.280Z
    event: result_submitted
    reason: "Fixed both iOS mobile UX bugs.\n\n**Bug 1 (viewport resize/slide):**\n- Added `viewport` export to `packages/web/app/layout.tsx` with `viewportFit: \"cover\"` and `interactiveWidget: \"resizes-visual\"` to prevent iOS keyboard from pushing the page around\n- Changed `100vh` to `100dvh` in three CSS files: `globals.css`, `adventure/[id]/page.module.css`, and `page.module.css`. Dynamic viewport height units respond correctly to the iOS virtual keyboard\n\n**Bug 2 (Enter key behavior):**\n- Created `packages/web/lib/keyboard-handler.ts` with `isTouchDevice()` and `shouldSendOnEnter()` utilities\n- On mobile/touch: Enter inserts a newline (default textarea behavior), users tap Send button\n- On desktop: Enter sends, Shift+Enter inserts newline (unchanged)\n- Touch detection runs once via `useMemo`, not on every keypress\n- Updated hint text: mobile shows \"Tap Send to submit\", desktop shows \"Enter to send\"\n\n**Testing:**\n- 7 new tests in `packages/web/tests/keyboard-handler.test.ts` covering desktop Enter, desktop Shift+Enter, mobile Enter, and non-Enter keys for both modes\n- Full suite: 213 tests, 0 failures\n- Build: typecheck clean, Next.js production build clean"
  - timestamp: 2026-03-29T21:05:49.697Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Starting work on two iOS mobile UX bugs. Reading source files to understand current state."
projectName: corvran
---
Fixed both iOS mobile UX bugs.

**Bug 1 (viewport resize/slide):**
- Added `viewport` export to `packages/web/app/layout.tsx` with `viewportFit: "cover"` and `interactiveWidget: "resizes-visual"` to prevent iOS keyboard from pushing the page around
- Changed `100vh` to `100dvh` in three CSS files: `globals.css`, `adventure/[id]/page.module.css`, and `page.module.css`. Dynamic viewport height units respond correctly to the iOS virtual keyboard

**Bug 2 (Enter key behavior):**
- Created `packages/web/lib/keyboard-handler.ts` with `isTouchDevice()` and `shouldSendOnEnter()` utilities
- On mobile/touch: Enter inserts a newline (default textarea behavior), users tap Send button
- On desktop: Enter sends, Shift+Enter inserts newline (unchanged)
- Touch detection runs once via `useMemo`, not on every keypress
- Updated hint text: mobile shows "Tap Send to submit", desktop shows "Enter to send"

**Testing:**
- 7 new tests in `packages/web/tests/keyboard-handler.test.ts` covering desktop Enter, desktop Shift+Enter, mobile Enter, and non-Enter keys for both modes
- Full suite: 213 tests, 0 failures
- Build: typecheck clean, Next.js production build clean
