---
title: "Commission: Spec: View Files tab in adventure view"
date: 2026-04-06
status: completed
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a specification for the View Files feature described in `.lore/issues/view-files.md`.\n\n**Issue summary:** Add a tab to the adventure view that shows a tree view of files within the adventure directory. Selecting a file displays its markdown content rendered appropriately. Editing is out of scope.\n\n**Context to read before writing:**\n- `.lore/issues/view-files.md` — the issue\n- `.lore/specs/adventure-file-structure.md` — the two-layer file structure (bootstrap + reference files) this feature will expose\n- `.lore/specs/mvp.md` — adventure view structure, existing tabs\n- `packages/web/app/adventures/[slug]/` — current adventure view pages\n- `packages/backend/src/routes/adventure-routes.ts` — existing backend endpoints\n- `packages/shared/src/schemas/` — shared Zod schemas\n- `.lore/reference/architecture-pattern.md` — route/service split, DI pattern\n\n**Spec requirements:**\n- Follow the project's spec format (see other specs in `.lore/specs/` for structure)\n- Define the API contract: what endpoint(s) the backend exposes for listing files and reading file content\n- Define the frontend: tree view component, markdown rendering, tab integration\n- Scope boundary: read-only, no editing, no file creation/deletion\n- Address: what files are visible (all adventure files? exclude system files like history.md?), tree structure display, markdown rendering approach\n- Include AI validation criteria (unit tests, integration expectations)\n- Use req-prefix VF\n\nWrite the spec to `.lore/specs/view-files.md`."
dependencies: []
linked_artifacts:
  - .lore/specs/view-files.md

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
  - timestamp: 2026-04-06T23:22:22.843Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-06T23:22:29.051Z
    event: progress_report
    reason: "Reading context files before drafting the spec."
  - timestamp: 2026-04-06T23:22:50.727Z
    event: progress_report
    reason: "Context gathered. Now checking existing spec format and adventure service for file operations before drafting."
  - timestamp: 2026-04-06T23:25:11.948Z
    event: progress_report
    reason: "Context fully gathered. Key finding: FileOps.readDir returns only directories; FileOps.readFiles returns only files. A new readDirEntries method is needed. Now writing the spec."
  - timestamp: 2026-04-06T23:26:22.119Z
    event: result_submitted
    reason: "Wrote spec to `.lore/specs/view-files.md`.\n\nThe spec covers:\n\n**Backend:**\n- Two new endpoints: `GET /adventures/:id/files` (recursive tree) and `GET /adventures/:id/file?path=...` (file content)\n- Required extension to `FileOps`: new `readDirEntries` method, since existing `readDir` returns only directories and `readFiles` returns only files — neither is sufficient for tree building\n- Binary file detection by extension allowlist (`.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.csv`)\n- Path traversal protection: resolved path must be contained within the adventure directory\n\n**Shared:**\n- Three new Zod schemas: `FileTreeNodeSchema` (recursive via `z.lazy`), `FileTreeResponseSchema`, `FileContentResponseSchema`\n\n**Frontend:**\n- Two-tab layout (\"Play\" / \"Files\") with client-side state; no route change\n- Lazy tree fetch on first tab activation\n- ReactMarkdown rendering for text files (already a dependency)\n- Two-column layout on ≥640px, stacked on mobile\n- Input area hidden while Files tab is active\n\n**Design decisions documented in spec:**\n- Nothing excluded from the tree (player owns the files)\n- Tree fetched once per tab activation, no auto-refresh\n- Selected file is local state only (no URL deep-linking)\n- `readDirEntries` added rather than repurposing `readDir` or `readFiles` to avoid breaking existing callers"
  - timestamp: 2026-04-06T23:26:29.948Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Context fully gathered. Key finding: FileOps.readDir returns only directories; FileOps.readFiles returns only files. A new readDirEntries method is needed. Now writing the spec."
projectName: corvran
---
Wrote spec to `.lore/specs/view-files.md`.

The spec covers:

**Backend:**
- Two new endpoints: `GET /adventures/:id/files` (recursive tree) and `GET /adventures/:id/file?path=...` (file content)
- Required extension to `FileOps`: new `readDirEntries` method, since existing `readDir` returns only directories and `readFiles` returns only files — neither is sufficient for tree building
- Binary file detection by extension allowlist (`.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.csv`)
- Path traversal protection: resolved path must be contained within the adventure directory

**Shared:**
- Three new Zod schemas: `FileTreeNodeSchema` (recursive via `z.lazy`), `FileTreeResponseSchema`, `FileContentResponseSchema`

**Frontend:**
- Two-tab layout ("Play" / "Files") with client-side state; no route change
- Lazy tree fetch on first tab activation
- ReactMarkdown rendering for text files (already a dependency)
- Two-column layout on ≥640px, stacked on mobile
- Input area hidden while Files tab is active

**Design decisions documented in spec:**
- Nothing excluded from the tree (player owns the files)
- Tree fetched once per tab activation, no auto-refresh
- Selected file is local state only (no URL deep-linking)
- `readDirEntries` added rather than repurposing `readDir` or `readFiles` to avoid breaking existing callers
