---
title: "Commission: MVP Phase 1: Project Scaffolding"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 1 from `.lore/plans/mvp-implementation.md`: Project Scaffolding.\n\n**Read the full plan first** — the Phase 1 section has exact specifications for everything below.\n\n**What to build:**\n1. Root workspace configuration (package.json with bun workspaces, root tsconfig.json with project references, .gitignore, CLAUDE.md)\n2. `packages/shared/` — Zod schemas for all API contracts (AdventureListItem, AdventureListResponse, AdventureDetail, MessageRequest, HistoryResponse, HealthResponse, SSE event types), TypeScript types inferred via z.infer\n3. `packages/backend/` — package.json with workspace dependency on @corvran/shared, tsconfig.json, empty entry point, eslint config\n4. `packages/web/` — Create via `bunx create-next-app@latest` with App Router, TypeScript, no Tailwind, no src/ directory. Add workspace dependency on @corvran/shared.\n5. Clean install — delete existing node_modules and bun.lock from packages/backend/ and packages/shared/, run `bun install` from root.\n\n**Critical details from the plan:**\n- Bump zod to 3.25.x to satisfy Agent SDK peer dependency\n- Don't carry forward leftover dependencies (replicate, gray-matter, @modelcontextprotocol/sdk) unless needed\n- Next.js creation flags: `--app --ts --eslint --no-tailwind --no-src-dir --import-alias \"@/*\"`\n- The existing bun.lock files are pre-workspace artifacts — delete them\n\n**Tests required:**\n- Schema validation tests: valid payloads parse, invalid payloads reject (happy path + one invalid per schema)\n- `tsc --build` from root compiles all three packages without errors\n- Shared types importable from both backend and web (verified by the build)\n\n**Reference:** `.lore/reference/architecture-pattern.md` for the route/service/DI pattern that Phase 2 will use (understand it now so schemas align).\n\n**Reference:** `.lore/art/corvran-visual-brief.md` for the visual brief (understand palette/typography decisions for Phase 4 alignment).\n\n**Reference:** `.lore/specs/mvp.md` for the full spec (schemas must match the API contracts described there)."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T17:08:50.957Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:34:46.236Z
    event: status_failed
    reason: "Recovery: process lost on restart"
    from: "dispatched"
    to: "failed"
  - timestamp: 2026-03-29T17:34:46.237Z
    event: status_failed
    reason: "Recovery: process lost on restart"
  - timestamp: 2026-03-29T17:35:07.687Z
    event: status_pending
    reason: "Redispatched for retry"
    from: "failed"
    to: "pending"
  - timestamp: 2026-03-29T17:35:07.689Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
