---
title: "Commission: Review and refine architecture-pattern.md as a reusable reference"
date: 2026-04-04
status: completed
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Review `.lore/reference/architecture-pattern.md` against how it was actually applied in this project (the Corvran adventure engine).\n\nThis document is meant to be a **generic, reusable reference** for route/service split with DI factories, applicable across multiple projects. The Corvran codebase is the first real consumer. Now that the project is fully functional, we need to see if the reference document held up or needs corrections.\n\nYour task:\n1. Read `.lore/reference/architecture-pattern.md` thoroughly.\n2. Read the actual implementation in `packages/backend/src/` to see how the pattern was applied. Key files: `app.ts` (DI wiring), any route files, any service files, any tool definition files.\n3. Compare what the reference document prescribes against what the working code actually does. Look for:\n   - Advice in the doc that led to bugs or friction during implementation\n   - Patterns the code evolved away from that the doc still recommends\n   - Gaps where the doc is silent but the implementation discovered something important\n   - Anything that's Corvran-specific that leaked into what should be a generic doc\n   - Terminology or naming inconsistencies between the doc and common practice\n4. Propose concrete edits. This is a living reference doc, not a museum piece. If something should change, change it. If something should be added, add it.\n\nDo NOT make changes that are speculative or theoretical. Only propose changes grounded in what actually happened during implementation. The user wants battle-tested accuracy, not aspirational patterns."
dependencies: []
linked_artifacts:
  - .lore/reference/architecture-pattern.md

activity_timeline:
  - timestamp: 2026-04-04T19:22:22.999Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T19:22:23.001Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T19:22:23.041Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-04T19:22:30.765Z
    event: progress_report
    reason: "Starting review: reading the architecture pattern reference doc and the backend implementation to compare prescribed patterns against actual usage."
  - timestamp: 2026-04-04T19:22:57.762Z
    event: progress_report
    reason: "Read all backend source files. Now analyzing divergences between the reference doc and the actual implementation. Key areas to examine: DI factory signatures, FileOps vs the doc's named deps, session runner structure, EventBus mention, type export patterns."
  - timestamp: 2026-04-04T19:23:09.406Z
    event: progress_report
    reason: "All source files read. Now synthesizing findings. Identified several divergences: (1) FileOps is the real DI seam, not the named deps the doc lists; (2) no EventBus exists; (3) session runner uses MCP server pattern not mentioned in doc; (4) tools are a distinct architectural layer the doc doesn't cover; (5) type export pattern differs from doc's advice. Drafting edits."
  - timestamp: 2026-04-04T19:25:00.882Z
    event: result_submitted
    reason: "Reviewed `.lore/reference/architecture-pattern.md` against the full Corvran backend implementation (20 source files). Made four grounded corrections:\n\n**1. Replaced phantom Testing Seams examples.** The doc listed `gitOps`, `recordOps`, `createLog` as injectable deps. None exist in the codebase. Replaced with the actual DI seams: `fileOps` (the dominant interface), `queryFn`, and service-level injection. Added note on the two type export conventions (`interface` + factory vs. `ReturnType<typeof createX>` shorthand) since both coexist.\n\n**2. Rewrote EventBus section as SSE Streaming.** The doc described a \"set-based pub/sub\" EventBus that was never built. The implementation uses Hono's `streamSSE` inline in route handlers, with no intermediate bus. Replaced with what actually exists, including the `idleTimeout: 0 as never` type assertion workaround for Bun.\n\n**3. Added Tool Definitions as DI Factories section.** The codebase has a distinct architectural layer (dice-tool, mood-tool, compact-tool) that follows the same factory pattern as routes and services but was completely undocumented. Added the pattern with code examples showing pure-logic extraction for testing and MCP server composition in the session runner.\n\n**4. Softened branded types from assertion to recommendation.** The doc stated branded types \"prevent mixing ID namespaces\" as if they were in use. The implementation uses plain strings for IDs. Changed to \"consider branded types when multiple ID namespaces coexist.\"\n\nAlso added a Config Resolution subsection documenting the conditional `resolveConfig()` pattern that avoids env coupling in tests, since this was a non-obvious design choice that the implementation discovered."
  - timestamp: 2026-04-04T19:25:07.754Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All source files read. Now synthesizing findings. Identified several divergences: (1) FileOps is the real DI seam, not the named deps the doc lists; (2) no EventBus exists; (3) session runner uses MCP server pattern not mentioned in doc; (4) tools are a distinct architectural layer the doc doesn't cover; (5) type export pattern differs from doc's advice. Drafting edits."
projectName: corvran
---
Reviewed `.lore/reference/architecture-pattern.md` against the full Corvran backend implementation (20 source files). Made four grounded corrections:

**1. Replaced phantom Testing Seams examples.** The doc listed `gitOps`, `recordOps`, `createLog` as injectable deps. None exist in the codebase. Replaced with the actual DI seams: `fileOps` (the dominant interface), `queryFn`, and service-level injection. Added note on the two type export conventions (`interface` + factory vs. `ReturnType<typeof createX>` shorthand) since both coexist.

**2. Rewrote EventBus section as SSE Streaming.** The doc described a "set-based pub/sub" EventBus that was never built. The implementation uses Hono's `streamSSE` inline in route handlers, with no intermediate bus. Replaced with what actually exists, including the `idleTimeout: 0 as never` type assertion workaround for Bun.

**3. Added Tool Definitions as DI Factories section.** The codebase has a distinct architectural layer (dice-tool, mood-tool, compact-tool) that follows the same factory pattern as routes and services but was completely undocumented. Added the pattern with code examples showing pure-logic extraction for testing and MCP server composition in the session runner.

**4. Softened branded types from assertion to recommendation.** The doc stated branded types "prevent mixing ID namespaces" as if they were in use. The implementation uses plain strings for IDs. Changed to "consider branded types when multiple ID namespaces coexist."

Also added a Config Resolution subsection documenting the conditional `resolveConfig()` pattern that avoids env coupling in tests, since this was a non-obvious design choice that the implementation discovered.
