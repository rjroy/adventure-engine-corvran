---
title: "Commission: View Files: Phases 1-3 (FileOps, shared schemas, backend routes)"
date: 2026-04-06
status: dispatched
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phases 1, 2, and 3 of the View Files feature per `.lore/plans/view-files-plan.md`.\n\n**Read the plan first.** It has exact code, file paths, and step-by-step instructions for all three phases.\n\n**Phase 1: Extend FileOps** (Steps 1.1-1.4)\n- Add `readDirEntries` to the `FileOps` interface in `packages/backend/src/types.ts`\n- Implement in `createRealFileOps` in `packages/backend/src/app.ts`\n- Implement in `createMockFileOps` in `packages/backend/tests/helpers/mock-file-ops.ts`\n- Write tests for the mock implementation\n\n**Phase 2: Shared schemas** (Steps 2.1-2.2)\n- Add `FileTreeNodeSchema`, `FileTreeResponseSchema`, `FileContentResponseSchema` to `packages/shared/src/schemas/adventures.ts`\n- Verify re-export from `packages/shared/src/index.ts`\n\n**Phase 3: Backend routes** (Steps 3.1-3.5)\n- Add `buildFileTree` and `isBinaryPath` helpers to `packages/backend/src/routes/adventure-routes.ts`\n- Add `GET /adventures/:id/files` and `GET /adventures/:id/file` routes\n- Register operations in the ops array\n- Write all 12 backend route tests listed in Step 3.5\n\nThe spec is at `.lore/specs/view-files.md`. Key constraints:\n- Path traversal protection is critical (REQ-VF-7). Test both URL-encoded `..` and absolute paths.\n- Binary classification by extension allowlist, checked BEFORE file existence.\n- `buildFileTree` sorts directories before files, each group alphabetical.\n\nRun `bun test` in the backend package to confirm all tests pass."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-04-06T23:43:04.660Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-06T23:43:04.662Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
