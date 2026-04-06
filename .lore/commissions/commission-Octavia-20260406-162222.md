---
title: "Commission: Spec: View Files tab in adventure view"
date: 2026-04-06
status: dispatched
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a specification for the View Files feature described in `.lore/issues/view-files.md`.\n\n**Issue summary:** Add a tab to the adventure view that shows a tree view of files within the adventure directory. Selecting a file displays its markdown content rendered appropriately. Editing is out of scope.\n\n**Context to read before writing:**\n- `.lore/issues/view-files.md` — the issue\n- `.lore/specs/adventure-file-structure.md` — the two-layer file structure (bootstrap + reference files) this feature will expose\n- `.lore/specs/mvp.md` — adventure view structure, existing tabs\n- `packages/web/app/adventures/[slug]/` — current adventure view pages\n- `packages/backend/src/routes/adventure-routes.ts` — existing backend endpoints\n- `packages/shared/src/schemas/` — shared Zod schemas\n- `.lore/reference/architecture-pattern.md` — route/service split, DI pattern\n\n**Spec requirements:**\n- Follow the project's spec format (see other specs in `.lore/specs/` for structure)\n- Define the API contract: what endpoint(s) the backend exposes for listing files and reading file content\n- Define the frontend: tree view component, markdown rendering, tab integration\n- Scope boundary: read-only, no editing, no file creation/deletion\n- Address: what files are visible (all adventure files? exclude system files like history.md?), tree structure display, markdown rendering approach\n- Include AI validation criteria (unit tests, integration expectations)\n- Use req-prefix VF\n\nWrite the spec to `.lore/specs/view-files.md`."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: sonnet

activity_timeline:
  - timestamp: 2026-04-06T23:22:22.810Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-06T23:22:22.811Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
