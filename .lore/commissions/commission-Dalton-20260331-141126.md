---
title: "Commission: Mood System: Diagnose and Fix End-to-End Pipeline"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "## Context\n\nThree bugs surfaced during runtime testing of the dynamic mood system. They may share a root cause. Your job is to **diagnose the full pipeline first**, then fix at the root. Do not patch symptoms.\n\n## The Bugs\n\n1. **Logging insufficient** (`.lore/issues/logging-insufficient.md`) — The mood tool fires and a mood.png appeared in an adventure directory, but there are no logs about what happened. Debugging is blind.\n\n2. **Mood set semi-failed** (`.lore/issues/mood-set-semi-failed.md`) — The tool response for mood set was \"unrecognized on the stream.\" Unknown error source.\n\n3. **The mood didn't take** (`.lore/issues/the-mood-didn-t-take.md`) — mood.png exists in the adventure directory but the client never displays it, neither on initial set nor on reload.\n\n## Approach\n\n**Phase 1: Diagnose.** Trace the mood system end-to-end before writing any fix:\n- Backend: How does the mood tool get invoked? What does it return? Where does mood.png get written? What logging exists (or doesn't)?\n- API/streaming: How does the mood tool result flow through the streaming response? What does \"unrecognized on the stream\" mean? Where does that error come from?\n- Frontend: How is the client supposed to know about mood.png? Does it poll, get notified via stream, or check on load? Is that wiring actually connected?\n\nWrite your findings as comments in the code or as a brief diagnostic summary before proceeding to fixes.\n\n**Phase 2: Fix.** Based on what you find:\n- If the architecture is sound but the wiring is broken, fix the wiring.\n- If the design is fundamentally wrong (e.g., the client has no way to learn about mood changes), redesign that part.\n- Add proper logging to the mood tool pipeline so future debugging isn't blind.\n- A rewrite is acceptable if that's what the diagnosis calls for. Don't preserve broken structure out of politeness.\n\n**Phase 3: Verify.** Run tests. Add tests for any new or changed behavior. Ensure `bun run build` passes.\n\n## Key files to start with\n- Read `.lore/issues/` for all three bugs\n- Check `packages/backend/` for the mood tool implementation\n- Check `packages/web/` for mood rendering\n- Check `packages/shared/` for any mood-related schemas\n\n## Rules\n- Do not use `mock.module()` in tests\n- Use dependency injection for testability\n- All tests must pass before declaring done\n- `bun run build` must pass"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T21:11:26.974Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T21:11:26.978Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
