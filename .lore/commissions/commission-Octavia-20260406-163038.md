---
title: "Commission: Plan: View Files feature implementation"
date: 2026-04-06
status: completed
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Prepare an implementation plan for the View Files feature.\n\n**Read these first:**\n- `.lore/specs/view-files.md` — the spec you just wrote\n- `.lore/reference/architecture-pattern.md` — route/service split, DI pattern\n- `.lore/plans/adventure-file-structure-plan.md` — example of plan format and level of detail\n\n**Examine the current codebase:**\n- `packages/backend/src/routes/adventure-routes.ts` — existing adventure endpoints\n- `packages/backend/src/services/adventure-service.ts` — existing adventure service\n- `packages/web/app/adventures/[slug]/` — current adventure view pages, tab structure\n- `packages/shared/src/schemas/` — shared Zod schemas\n- `packages/web/components/` — existing components for patterns to follow\n\n**Plan requirements:**\n- Follow the same structure as `.lore/plans/adventure-file-structure-plan.md` (phases, steps with file paths, codebase context, delegation guide, gaps)\n- Map each spec requirement to a phase\n- Identify which files need changes vs new files\n- Include a delegation guide: which phases can parallelize, which need sequential ordering, reviewer checkpoints\n- Address: backend endpoints (list files, read file content), shared schemas, frontend components (tree view, markdown renderer, tab integration)\n- Note any dependencies between backend and frontend work\n\nWrite the plan to `.lore/plans/view-files-plan.md`."
dependencies:
  - commission-Octavia-20260406-162222
linked_artifacts:
  - .lore/plans/view-files-plan.md

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-04-06T23:30:38.846Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-06T23:30:38.848Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-06T23:30:38.882Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-06T23:30:44.776Z
    event: progress_report
    reason: "Starting plan preparation. Reading spec, architecture reference, and example plan in parallel."
  - timestamp: 2026-04-06T23:31:23.750Z
    event: progress_report
    reason: "Codebase review complete. Writing the plan to .lore/plans/view-files-plan.md."
  - timestamp: 2026-04-06T23:34:15.245Z
    event: result_submitted
    reason: "Wrote the implementation plan to `.lore/plans/view-files-plan.md`.\n\nThe plan covers five phases mapped to all 27 spec requirements:\n\n1. **Phase 1: FileOps extension** — Add `readDirEntries` to the interface, production implementation, and mock. Includes a direct unit test for the mock.\n\n2. **Phase 2: Shared schemas** — Add `FileTreeNodeSchema` (recursive via `z.lazy()`), `FileTreeResponseSchema`, `FileContentResponseSchema`, and their inferred types to `adventures.ts`. Note the two-step pattern (declare TypeScript type first, then use as `ZodType<T>` generic parameter).\n\n3. **Phase 3: Backend routes** — Two GET routes plus a pure exported `buildFileTree` helper and `isBinaryPath` helper. Includes the operations registry entries. 12 backend test cases covering all spec AI validation requirements including both path traversal variants.\n\n4. **Phase 4: Tab bar** — Local React state, JSX tab bar inserted between header and content, conditional rendering of conversation and input areas. No new component files.\n\n5. **Phase 5: FilesView components** — `FilesView` (fetch orchestration), `FileTree`, `FileTreeNode` (recursive). Lazy fetch on first tab activation via ref. CSS for both desktop two-column and mobile stacked layouts.\n\nKey decisions documented in the plan:\n- Binary classification happens before the existence check (avoids disk reads and information disclosure for nonexistent binary paths)\n- Path traversal relies on `node:path` `resolve()` normalization + prefix check; Hono decodes query params automatically\n- `buildFileTree` is exported as a pure function for direct testing without the HTTP layer\n- Phases 1 and 2 can be dispatched in parallel; Phase 3 needs Phase 1 first; Phases 4 and 5 must be sequential (share the same files)\n- Two reviewer checkpoints: after Phase 3 (security and sort order focus) and after Phase 5 (state preservation and UX correctness focus)"
  - timestamp: 2026-04-06T23:34:23.212Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Codebase review complete. Writing the plan to .lore/plans/view-files-plan.md."
projectName: corvran
---
Wrote the implementation plan to `.lore/plans/view-files-plan.md`.

The plan covers five phases mapped to all 27 spec requirements:

1. **Phase 1: FileOps extension** — Add `readDirEntries` to the interface, production implementation, and mock. Includes a direct unit test for the mock.

2. **Phase 2: Shared schemas** — Add `FileTreeNodeSchema` (recursive via `z.lazy()`), `FileTreeResponseSchema`, `FileContentResponseSchema`, and their inferred types to `adventures.ts`. Note the two-step pattern (declare TypeScript type first, then use as `ZodType<T>` generic parameter).

3. **Phase 3: Backend routes** — Two GET routes plus a pure exported `buildFileTree` helper and `isBinaryPath` helper. Includes the operations registry entries. 12 backend test cases covering all spec AI validation requirements including both path traversal variants.

4. **Phase 4: Tab bar** — Local React state, JSX tab bar inserted between header and content, conditional rendering of conversation and input areas. No new component files.

5. **Phase 5: FilesView components** — `FilesView` (fetch orchestration), `FileTree`, `FileTreeNode` (recursive). Lazy fetch on first tab activation via ref. CSS for both desktop two-column and mobile stacked layouts.

Key decisions documented in the plan:
- Binary classification happens before the existence check (avoids disk reads and information disclosure for nonexistent binary paths)
- Path traversal relies on `node:path` `resolve()` normalization + prefix check; Hono decodes query params automatically
- `buildFileTree` is exported as a pure function for direct testing without the HTTP layer
- Phases 1 and 2 can be dispatched in parallel; Phase 3 needs Phase 1 first; Phases 4 and 5 must be sequential (share the same files)
- Two reviewer checkpoints: after Phase 3 (security and sort order focus) and after Phase 5 (state preservation and UX correctness focus)
