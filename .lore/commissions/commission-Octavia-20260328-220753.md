---
title: "Commission: Prepare MVP Implementation Plan"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write an implementation plan for the Adventure Engine MVP. Output to `.lore/plans/mvp-implementation.md`.\n\n## Source Material\n\nRead these fully:\n\n1. **`.lore/specs/mvp.md`** — The MVP spec. This is the requirements document. Every requirement (REQ-MVP-*) must be covered by the plan.\n2. **`.lore/art/corvran-visual-brief.md`** — Sienna's visual design brief. This defines the aesthetic, palette, typography, layout decisions, and implementation notes for the web client.\n3. **`.lore/reference/architecture-pattern.md`** — The architecture pattern. Structural decisions (route/service split, DI, operations registry) are already made.\n\nAlso check:\n- What already exists in `packages/backend/` and `packages/shared/` (they have dependencies installed)\n- What exists in `plugins/` (the plugin content the spec references)\n- Any existing `CLAUDE.md` files or project config\n\n## What the Plan Is\n\nA phased implementation plan that Dalton (the developer) can execute as a series of commissions. Each phase should be:\n\n- **Self-contained**: produces something testable at the end\n- **Sequential**: each phase builds on the previous\n- **Scoped**: small enough for one commission (a few hours of focused work)\n\nThe plan should cover:\n1. **Project scaffolding** — monorepo structure, shared types, build configuration\n2. **Daemon core** — Hono server, routes, services, adventure discovery\n3. **AI integration** — Agent SDK query, prompt assembly, history management\n4. **Web client** — Next.js app, both views, SSE consumption, visual design from Sienna's brief\n5. **Integration** — wiring it all together, the Unix socket proxy, end-to-end flow\n\nFor each phase, specify:\n- What gets built\n- What requirements it covers\n- What tests verify it\n- What the developer needs to know (gotchas, decisions already made, things to reference)\n\n## What the Plan Is Not\n\n- Not a spec (that already exists)\n- Not a design doc (architecture pattern already exists)\n- Not a visual guide (Sienna's brief already exists)\n\nThe plan is the bridge between \"what to build\" (spec) and \"build it\" (commissions). It answers \"in what order, and how do we verify each step?\"\n\n## Guidance\n\n- Use the `/lore-development:prep-plan` skill if available.\n- The plan should reference the spec requirements by ID (REQ-MVP-*) so progress can be tracked.\n- Include a review step after each phase (Thorne reviews before moving to the next phase).\n- The visual brief has specific implementation notes (font loading, scroll behavior, streaming state, stop button, tool events). These should land in the web client phase, not be rediscovered.\n- Account for what already exists. If `packages/backend/` has real code, the plan should build on it. If it's just scaffolding with node_modules, say so.\n- The spec's AI Validation section defines testing expectations. The plan's test steps should match."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T05:07:53.884Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T05:07:53.886Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
