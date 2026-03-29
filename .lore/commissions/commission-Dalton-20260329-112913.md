---
title: "Commission: Fix All Review Findings Across MVP Phases 1-5"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Fix all review findings from Thorne's MVP Phase 1-5 reviews. Read each review commission artifact for full context, then fix everything listed below.\n\n**Read first:**\n- `.lore/commissions/commission-Thorne-20260329-100901.md` (Phase 1 review)\n- `.lore/commissions/commission-Thorne-20260329-100927.md` (Phase 2 review)\n- `.lore/commissions/commission-Thorne-20260329-101000.md` (Phase 3 review)\n- `.lore/commissions/commission-Thorne-20260329-101034.md` (Phase 4 review)\n- `.lore/commissions/commission-Thorne-20260329-101057.md` (Phase 5 review)\n- `.lore/plans/mvp-implementation.md`\n- `.lore/specs/mvp.md`\n\n**Fixes required:**\n\n**Phase 1:**\n- Remove or justify `pino-roll` dependency (if unused, remove it)\n- Fix backend eslint tsconfig for type-checked config when tests directory exists\n\n**Phase 2:**\n- CONCERN-1: GET /adventures/:id/history must return 404 for nonexistent adventures (consistent with GET /adventures/:id)\n- STYLE-1: Fix readFile name collision in app.ts\n- STYLE-2: Don't call resolveConfig() when deps are already provided\n\n**Phase 3:**\n- F1: Tool event emission sends invocation input, not result. The spec says tool_use events should contain the human-readable result. Fix: defer emission until the user message pairs invocation with result.\n- F2: Add test coverage for tool events. Add mock helpers for tool event factories and tests exercising the assistant message (tool_use blocks) and user message (tool_use_result) code paths.\n\n**Phase 4:**\n- F5: Error message is hardcoded to \"history too long.\" Use the actual error string from the backend SSE error event instead.\n- F1: Streaming cursor renders as sibling after ReactMarkdown output. It should appear inline at the end of the streaming text.\n- F4: streamingMessage not cleared after committing to messages state. Fix the React Strict Mode duplication risk.\n\n**Phase 5:**\n- F1: Commit the sample adventure files (`adventures/lost-mines/character.md` and `adventures/lost-mines/world.md`) to git. Create reasonable sample content for a Lost Mines of Phandelver-style adventure.\n- F2: Create a mock SDK harness for integration testing. The architecture already has `queryFn` injection. Build an integration test that starts the daemon with a mock `queryFn` (no real API key needed), sends a POST /adventures/:id/message, and verifies the full SSE chain through the Unix socket. This covers the core game loop end-to-end.\n- F3: Proxy drops query strings. Append `request.nextUrl.search` to the daemon URL in `packages/web/app/api/daemon/[...path]/route.ts`.\n- F4: Replace shell `&` backgrounding with `concurrently` package for all parallel scripts in root `package.json`. This includes `dev`, `start`, and any other parallel script. `concurrently` manages process groups properly and provides good log prefixing. Add `concurrently` as a dev dependency.\n\n**After all fixes:**\n- Run `tsc --build` — must be clean\n- Run `bun test` across all packages — all tests must pass\n- Verify no regressions in existing tests"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T18:29:13.898Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T18:29:13.901Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
