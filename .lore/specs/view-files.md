---
title: View Files
date: 2026-04-06
status: draft
tags: [ux, file-browser, adventure-view, markdown]
modules: [backend, web, shared]
req-prefix: VF
related:
  - .lore/issues/view-files.md
  - .lore/specs/adventure-file-structure.md
  - .lore/specs/mvp.md
  - .lore/reference/architecture-pattern.md
---

# Spec: View Files

## Overview

A "Files" tab in the adventure play view gives the player read-only access to every file in their adventure directory. The tree mirrors the two-layer structure described in the Adventure File Structure spec: bootstrap files at the root, reference files in typed subdirectories, compacted history in `past/`. Selecting a file displays its content; markdown files are rendered. This closes the gap between what the AI is writing (character sheets, world entries, reference files) and what the player can see — without opening a terminal.

Editing is explicitly out of scope.

## Entry Points

- Player is on the adventure play page (`/adventure/[id]`)
- Player clicks the "Files" tab
- Player selects a file in the tree view

## Requirements

### FileOps: Directory Entry Support

- REQ-VF-1: The `FileOps` interface in `packages/backend/src/types.ts` gains a new method:

```typescript
readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]>
```

This returns all entries (both files and directories) in the given directory. The production implementation in `createRealFileOps()` in `app.ts` uses `readdir` with `{ withFileTypes: true }`, mapping each entry to `{ name: e.name, type: e.isDirectory() ? "directory" : "file" }`. All in-memory test implementations add this method alongside existing ones.

The existing `readDir` (directories only) and `readFiles` (files only) methods are unchanged; their callers rely on the filtered behavior.

### Backend: File Tree Endpoint

- REQ-VF-2: The daemon exposes `GET /adventures/:id/files`. It returns the complete, recursive directory tree for the adventure.

Response shape:
```json
{
  "tree": [
    { "name": "adventure.md", "path": "adventure.md", "type": "file" },
    { "name": "character.md", "path": "character.md", "type": "file" },
    {
      "name": "characters",
      "path": "characters",
      "type": "directory",
      "children": [
        { "name": "dwig.md", "path": "characters/dwig.md", "type": "file" }
      ]
    },
    { "name": "world.md", "path": "world.md", "type": "file" }
  ]
}
```

`path` is a relative path from the adventure root using `/` as separator. Within each level, entries are sorted: directories first (alphabetically), then files (alphabetically). The tree is fully expanded in the response; there is no lazy child-loading.

- REQ-VF-3: All files and subdirectories are included. Nothing is excluded. The player owns these files; the browser shows everything.

- REQ-VF-4: Returns 404 if the adventure does not exist. Returns 400 for invalid adventure IDs (same `isValidId` guard used by existing adventure routes).

### Backend: File Content Endpoint

- REQ-VF-5: The daemon exposes `GET /adventures/:id/file?path=<relative-path>`. It returns the content of a single file.

Response for text files:
```json
{
  "path": "characters/dwig.md",
  "content": "# Dwig Ironforge\n...",
  "binary": false
}
```

Response for binary files:
```json
{
  "path": "mood.png",
  "content": null,
  "binary": true
}
```

- REQ-VF-6: The `path` query parameter is required and must be non-empty. Returns 400 if missing.

- REQ-VF-7: Path traversal is rejected. The backend resolves the requested path relative to the adventure directory and verifies that the resulting absolute path starts with the adventure directory path. Any path containing `..` segments, beginning with `/`, or resolving outside the adventure directory returns 400 with `{ "error": "Invalid path" }`. URL encoding (e.g., `%2F`, `%2E%2E`) is handled by URL decoding before validation.

- REQ-VF-8: Returns 404 if the adventure does not exist or the requested file does not exist at the given path.

- REQ-VF-9: A file is classified as binary if its extension is not in the text allowlist: `.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.csv`. Files in the allowlist return `binary: false` with the file content as a UTF-8 string. Files outside the allowlist return `binary: true` and `content: null`. Binary files are not read from disk.

- REQ-VF-10: Returns 400 for invalid adventure IDs (same guard as other adventure routes).

### Shared: Schemas

- REQ-VF-11: Add the following Zod schemas to `packages/shared/src/schemas/adventures.ts`:

```typescript
// FileTreeNode uses z.lazy for self-reference
export const FileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(["file", "directory"]),
    children: z.array(FileTreeNodeSchema).optional(),
  })
);

export const FileTreeResponseSchema = z.object({
  tree: z.array(FileTreeNodeSchema),
});

export const FileContentResponseSchema = z.object({
  path: z.string(),
  content: z.string().nullable(),
  binary: z.boolean(),
});
```

Export inferred TypeScript types alongside the schemas, following the existing convention in `adventures.ts`.

### Frontend: Tab Bar

- REQ-VF-12: The adventure play page (`/adventure/[id]/page.tsx`) gains a tab bar with two tabs: "Play" and "Files". The active tab is local React state, defaulting to "Play".

- REQ-VF-13: The tab bar renders between the header and the main content area. Both tabs are always visible.

- REQ-VF-14: Switching tabs does not navigate or reload the page. Conversation state (messages, streaming status) is preserved when the player switches to "Files" and back.

- REQ-VF-15: When the "Files" tab is active, the player input area is hidden. It only appears when "Play" is active.

### Frontend: File Tree Component

- REQ-VF-16: When the "Files" tab is activated for the first time, the client fetches `GET /adventures/:id/files`. The tree is not fetched eagerly on page load. After the initial fetch, the tree is not automatically refreshed; the player re-fetches by navigating away and returning.

- REQ-VF-17: The file tree is rendered as an indented list. Directories show a disclosure triangle or equivalent indicator. Files are leaf nodes with no indicator.

- REQ-VF-18: All directories are expanded by default on load. The player can collapse and expand directories by clicking their names or indicators. Collapsed directories hide their children.

- REQ-VF-19: Clicking a file selects it. Only one file is selected at a time. Clicking the currently selected file does not re-fetch.

- REQ-VF-20: The selected file is visually distinguished from other entries (e.g., highlighted background or bold label).

### Frontend: File Content Pane

- REQ-VF-21: While a file is loading, the content pane shows a "Loading..." indicator.

- REQ-VF-22: When a file with `binary: false` is loaded, its content is rendered using `ReactMarkdown` (already a project dependency). Raw markdown text is not shown.

- REQ-VF-23: When a file with `binary: true` is loaded, the content pane shows the message: "Binary file — preview not available."

- REQ-VF-24: When a fetch fails, the content pane shows the error message.

- REQ-VF-25: When no file is selected, the content pane shows the hint: "Select a file to view its contents."

### Frontend: Layout

- REQ-VF-26: On viewports ≥640px wide, the Files tab uses a two-column layout: tree panel on the left (fixed ~240px width), content pane on the right (remaining width). Both panels scroll independently.

- REQ-VF-27: On viewports <640px, the layout stacks vertically: tree on top, content below. Both sections are visible without hiding either.

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Return to Play | Player clicks "Play" tab | Conversation view (no fetch) |
| Tree load | Files tab first activated | `GET /adventures/:id/files` |
| File load | Player selects a file | `GET /adventures/:id/file?path=...` |

## Success Criteria

- [ ] "Files" tab appears in the adventure play page; "Play" tab remains functional
- [ ] Switching between tabs preserves conversation state
- [ ] Files tab loads the full adventure directory tree on first activation
- [ ] All files and subdirectories appear, including those in nested reference directories (e.g., `characters/dwig.md` shown under a `characters/` node)
- [ ] Clicking a `.md` file displays rendered markdown (not raw text)
- [ ] Clicking `mood.png` displays "Binary file — preview not available"
- [ ] Clicking a directory name collapses and expands it
- [ ] Requesting `?path=../../../etc/passwd` from the file content endpoint returns 400
- [ ] Requesting a non-existent file returns 404
- [ ] Player input area is hidden while on the Files tab

## AI Validation

**Defaults:**
- Unit tests with mocked `fileOps` via dependency injection
- 90%+ coverage on new route and service code
- Code review by fresh-context sub-agent

**Custom:**
- Tree sort order test: create a directory with mixed files and subdirectories; verify the response places all directories before files, each group sorted alphabetically
- Recursive tree test: create an adventure with at least one subdirectory containing files; verify nested entries appear under the correct parent in the response tree
- Path traversal test (URL-encoded `..`): verify `GET /adventures/:id/file?path=..%2F..%2Fetc%2Fpasswd` returns 400
- Path traversal test (absolute path): verify `GET /adventures/:id/file?path=%2Fetc%2Fpasswd` returns 400
- Binary classification test: verify `.png` returns `binary: true, content: null`; verify `.md` returns `binary: false` with content
- Missing `path` param test: verify `GET /adventures/:id/file` (no query param) returns 400
- Missing file test: verify `GET /adventures/:id/file?path=nonexistent.md` returns 404
- `readDirEntries` implementation test: verify it returns entries with correct `type` values for both files and directories in the same directory
- Frontend unit test: tree renders directories before files; clicking a directory node toggles collapsed state; clicking a file node emits a selection event

## Constraints

- **Read-only.** No write, edit, create, or delete operations are in scope. The endpoints are GET-only.
- **No live refresh.** The tree is fetched once per Files tab activation. No polling, no WebSocket-based push.
- **Path security is non-negotiable.** The content endpoint must reject any path that resolves outside the adventure directory. This is not optional; path traversal to read arbitrary host files is a serious vulnerability.
- **No URL state for selected file.** The selected file is local component state, not reflected in the URL. Deep-linking to a specific file is not in scope.
- **No search.** Full-text search across adventure files is not in scope.
- **No size limits.** Large files (e.g., a long `history.md`) are served and rendered in full. Pagination is not in scope.
- **`FileOps` extension is required.** The existing `readDir` returns only directories and `readFiles` returns only files. Building the tree requires both. The spec requires adding `readDirEntries` rather than repurposing an existing method, to avoid breaking callers that depend on the current filtered behavior.

## Context

- `.lore/issues/view-files.md`: Original issue
- `.lore/specs/adventure-file-structure.md`: Two-layer file structure (bootstrap + reference) this feature exposes to the player
- `.lore/specs/mvp.md`: Adventure play page layout, existing endpoints, conversation view (REQ-MVP-19)
- `.lore/reference/architecture-pattern.md`: Route/service split, DI factories, `FileOps` interface, type boundaries
- `packages/backend/src/types.ts`: `FileOps` interface definition (line 5: `readDir`, `readFiles` — both need to coexist with new `readDirEntries`)
- `packages/backend/src/app.ts`: Production `FileOps` implementation (lines 21–65)
- `packages/backend/src/routes/adventure-routes.ts`: Existing route factory pattern and `isValidId` guard to reuse
- `packages/shared/src/schemas/adventures.ts`: Schema file where new Zod schemas are added
- `packages/web/app/adventure/[id]/page.tsx`: Adventure play page where tabs and Files view are integrated; note existing use of `ReactMarkdown` (line 7)
