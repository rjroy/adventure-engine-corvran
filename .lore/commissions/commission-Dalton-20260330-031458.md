---
title: "Commission: Fix iOS keyboard zoom/resize on input focus"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix an iOS Safari issue in the web package: when the on-screen keyboard opens, the viewport zooms in slightly and the layout resizes. It should stay stable.\n\nThis is a known iOS Safari behavior. The typical fixes:\n\n1. **Viewport meta tag** in `packages/web/app/layout.tsx`: ensure `maximum-scale=1` and `user-scalable=no` are set. iOS Safari zooms into input fields with font-size < 16px, so also check that input font sizes are at least 16px.\n\n2. **CSS viewport units**: if the layout uses `vh`, switch to `dvh` (dynamic viewport height) or use `-webkit-fill-available` where appropriate, so the layout doesn't jump when the keyboard appears.\n\n3. **`interactive-widget=resizes-content`** or **`interactive-widget=overlaps-content`** on the viewport meta tag (the latter prevents resize entirely, letting the keyboard overlay content instead of pushing it up).\n\nCheck the current viewport meta tag and CSS, apply the minimal fix that prevents both the zoom and the resize. Test that the fix doesn't break desktop behavior."
dependencies: []
linked_artifacts:
  - packages/web/app/layout.tsx

  - packages/web/app/adventure/[id]/page.module.css
  - packages/web/app/adventure/[id]/page.module.css
resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-03-30T10:14:58.003Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T10:14:58.005Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T10:14:58.031Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T10:15:04.517Z
    event: progress_report
    reason: "Reading current viewport meta tag and CSS to understand what needs fixing."
  - timestamp: 2026-03-30T10:16:39.463Z
    event: result_submitted
    reason: "Fixed iOS Safari keyboard zoom and layout resize. Two changes:\n\n1. `packages/web/app/layout.tsx`: Changed `interactiveWidget` from `resizes-visual` to `overlays-content`, added `maximumScale: 1` and `userScalable: false`. The root cause was `resizes-visual` + `height: 100dvh` — `dvh` tracks the visual viewport, which shrinks when the keyboard opens under `resizes-visual`, triggering a layout reflow. `overlays-content` keeps the keyboard over the content without any viewport resize. The zoom properties prevent iOS Safari from auto-zooming on input focus.\n\n2. `packages/web/app/adventure/[id]/page.module.css`: Bumped `.textarea` font-size from `15px` to `16px`. iOS Safari auto-zooms into any input with font-size below 16px regardless of the meta tag.\n\nNo `vh` units found anywhere — the codebase already uses `dvh` throughout. Desktop behavior is unaffected: `overlays-content` and `maximumScale=1` are no-ops on desktop, and the 1px font bump is imperceptible. Typecheck passes clean."
  - timestamp: 2026-03-30T10:16:44.552Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Reading current viewport meta tag and CSS to understand what needs fixing."
projectName: corvran
---
Fixed iOS Safari keyboard zoom and layout resize. Two changes:

1. `packages/web/app/layout.tsx`: Changed `interactiveWidget` from `resizes-visual` to `overlays-content`, added `maximumScale: 1` and `userScalable: false`. The root cause was `resizes-visual` + `height: 100dvh` — `dvh` tracks the visual viewport, which shrinks when the keyboard opens under `resizes-visual`, triggering a layout reflow. `overlays-content` keeps the keyboard over the content without any viewport resize. The zoom properties prevent iOS Safari from auto-zooming on input focus.

2. `packages/web/app/adventure/[id]/page.module.css`: Bumped `.textarea` font-size from `15px` to `16px`. iOS Safari auto-zooms into any input with font-size below 16px regardless of the meta tag.

No `vh` units found anywhere — the codebase already uses `dvh` throughout. Desktop behavior is unaffected: `overlays-content` and `maximumScale=1` are no-ops on desktop, and the 1px font bump is imperceptible. Typecheck passes clean.
