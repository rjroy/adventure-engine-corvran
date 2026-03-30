---
title: "Commission: Fix iOS keyboard zoom/resize on input focus"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix an iOS Safari issue in the web package: when the on-screen keyboard opens, the viewport zooms in slightly and the layout resizes. It should stay stable.\n\nThis is a known iOS Safari behavior. The typical fixes:\n\n1. **Viewport meta tag** in `packages/web/app/layout.tsx`: ensure `maximum-scale=1` and `user-scalable=no` are set. iOS Safari zooms into input fields with font-size < 16px, so also check that input font sizes are at least 16px.\n\n2. **CSS viewport units**: if the layout uses `vh`, switch to `dvh` (dynamic viewport height) or use `-webkit-fill-available` where appropriate, so the layout doesn't jump when the keyboard appears.\n\n3. **`interactive-widget=resizes-content`** or **`interactive-widget=overlaps-content`** on the viewport meta tag (the latter prevents resize entirely, letting the keyboard overlay content instead of pushing it up).\n\nCheck the current viewport meta tag and CSS, apply the minimal fix that prevents both the zoom and the resize. Test that the fix doesn't break desktop behavior."
dependencies: []
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
