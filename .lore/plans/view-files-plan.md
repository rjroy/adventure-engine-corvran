---
title: "Implementation plan: view-files"
date: 2026-04-06
status: approved 
tags: [plan, file-browser, adventure-view, markdown, ux]
modules: [backend, shared, web]
related:
  - .lore/specs/view-files.md
  - .lore/reference/architecture-pattern.md
---

# Plan: View Files

Five phases: extend `FileOps`, add shared schemas, add backend routes, update the web page with tab state, and build the two frontend components (tree + content pane). Backend and shared work can proceed in parallel before the frontend phase begins.

## Spec Reference

**Spec**: `.lore/specs/view-files.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-VF-1 | 1 | Add `readDirEntries` to `FileOps` interface and mock |
| REQ-VF-2 | 3 | `GET /adventures/:id/files` returns full recursive tree |
| REQ-VF-3 | 3 | All files and subdirectories included, nothing excluded |
| REQ-VF-4 | 3 | 404 for missing adventure, 400 for invalid ID |
| REQ-VF-5 | 3 | `GET /adventures/:id/file?path=...` returns file content |
| REQ-VF-6 | 3 | Missing `path` query param returns 400 |
| REQ-VF-7 | 3 | Path traversal rejected at boundary |
| REQ-VF-8 | 3 | 404 for missing adventure or missing file |
| REQ-VF-9 | 3 | Binary classification by extension allowlist |
| REQ-VF-10 | 3 | 400 for invalid adventure ID |
| REQ-VF-11 | 2 | Add `FileTreeNodeSchema`, `FileTreeResponseSchema`, `FileContentResponseSchema` to shared |
| REQ-VF-12 | 4 | Tab bar with "Play" and "Files" tabs added to adventure play page |
| REQ-VF-13 | 4 | Tab bar renders between header and main content |
| REQ-VF-14 | 4 | Tab switch is local state; conversation state survives |
| REQ-VF-15 | 4 | Player input area hidden when Files tab is active |
| REQ-VF-16 | 5 | File tree fetched on first Files tab activation, not eager |
| REQ-VF-17 | 5 | Tree rendered as indented list with directory indicators |
| REQ-VF-18 | 5 | All directories expanded by default; click to collapse/expand |
| REQ-VF-19 | 5 | Clicking a file selects it; re-clicking selected file does nothing |
| REQ-VF-20 | 5 | Selected file is visually distinguished |
| REQ-VF-21 | 5 | Loading state shown while file content fetches |
| REQ-VF-22 | 5 | Text files rendered with `ReactMarkdown` |
| REQ-VF-23 | 5 | Binary files show "Binary file — preview not available" |
| REQ-VF-24 | 5 | Fetch errors shown in content pane |
| REQ-VF-25 | 5 | Empty state: "Select a file to view its contents" |
| REQ-VF-26 | 5 | Two-column layout on viewports >= 640px |
| REQ-VF-27 | 5 | Stacked layout on viewports < 640px |

## Codebase Context

### Backend: what exists

**`packages/backend/src/types.ts`** (40 lines): The `FileOps` interface (lines 5-16) currently has: `readDir` (directories only, via `e.isDirectory()`), `readFiles` (files only, via `e.isFile()`), `readFile`, `writeFile`, `appendFile`, `fileExists`, `stat`, `readFileBytes`, `deleteFile`, `resolvePath`. There is no `readDirEntries` that returns both types in one call.

**`packages/backend/src/app.ts`** (lines 21-65): `createRealFileOps()` is the production `FileOps` implementation. `readDir` calls `readdir(..., { withFileTypes: true })` and filters with `e.isDirectory()`. `readFiles` does the same, filtering with `e.isFile()`. The new `readDirEntries` follows the same pattern without filtering, mapping each dirent to `{ name: e.name, type: e.isDirectory() ? "directory" : "file" }`.

**`packages/backend/tests/helpers/mock-file-ops.ts`** (110 lines): `createMockFileOps()` stores files as a flat `Map<string, string>` and infers directory membership from path prefixes. `readDir` returns first-level segments that contain a `/` (directory heuristic). `readFiles` returns direct-child segments that do not contain `/`. The new `readDirEntries` combines both: return all direct-child segments (with or without deeper children) plus their type.

**`packages/backend/src/routes/adventure-routes.ts`**: Defines `isValidId` at line 18. All existing adventure routes use it as the first guard. The new routes reuse this guard. `createAdventureRoutes` receives `fileOps` in deps (line 35); it's already wired through from `createApp`.

**`packages/backend/src/services/adventure-service.ts`**: `getAdventurePath(id)` returns the absolute adventure directory path (line 156). The new routes need this to construct the absolute root for path traversal checks.

### Shared: what exists

**`packages/shared/src/schemas/adventures.ts`** (111 lines): Exports Zod schemas and inferred TypeScript types. Convention: schema name ends in `Schema`, type is `z.infer<typeof XSchema>` exported as a bare type (e.g., `AdventureDetail`, `MoodState`). New schemas follow the same pattern. The `FileTreeNodeSchema` is recursive; the spec provides the `z.lazy()` pattern to use.

**`packages/shared/src/index.ts`**: Re-exports everything from schemas. New schemas must be added to this file to make them importable by web.

### Frontend: what exists

**`packages/web/app/adventure/[id]/page.tsx`** (412 lines): A `"use client"` component. Already imports `ReactMarkdown` (line 7). State: `adventure`, `messages`, `loadError`, `inputValue`, streaming hooks. The page structure is: `<PlayHeader>`, `<div className={styles.conversation}>`, `<div className={styles.inputArea}>`. The new tab bar inserts between header and conversation/input areas. The `inputArea` div becomes conditionally rendered based on active tab.

**`packages/web/app/adventure/[id]/page.module.css`**: Defines all current visual styles. New CSS classes for the tab bar, file tree, and content pane are added to this file.

**`packages/web/app/api/daemon/[...path]/route.ts`**: Catch-all proxy that forwards all requests to the daemon's Unix socket using `http.request()` with `socketPath`. The query string is preserved via `request.nextUrl.search` (line 120). No changes needed; the new daemon endpoints are automatically proxied.

### What does NOT need to change

- `adventureService`: no new service methods needed; `getAdventurePath(id)` is already available.
- The web proxy route: the catch-all already handles the new endpoints.
- The session runner, history service, compaction service: not involved.
- `createApp`: `fileOps` is already passed to `createAdventureRoutes`; the new routes use it directly.

---

## Implementation Steps

### Phase 1: Extend `FileOps` with `readDirEntries`

Touches two files: the interface and the mock. The production implementation in `app.ts` is the third file.

#### Step 1.1: Add method to `FileOps` interface

**File**: `packages/backend/src/types.ts`

Add to the `FileOps` interface after `readFiles`:

```typescript
readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]>;
```

#### Step 1.2: Implement in `createRealFileOps`

**File**: `packages/backend/src/app.ts`

Add after the `readFiles` method (around line 61):

```typescript
async readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    type: e.isDirectory() ? "directory" : "file",
  }));
},
```

#### Step 1.3: Implement in `createMockFileOps`

**File**: `packages/backend/tests/helpers/mock-file-ops.ts`

The mock infers directory vs. file by presence of deeper path segments. Add after `readFiles`:

```typescript
async readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]> {
  const prefix = path.endsWith("/") ? path : path + "/";
  const seen = new Map<string, "file" | "directory">();
  for (const key of store.keys()) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const firstSegment = rest.split("/")[0];
    // If there's more path after the first segment, it's a directory
    const type: "file" | "directory" = rest.includes("/") ? "directory" : "file";
    // Directories win over files if the same name appears both ways
    if (!seen.has(firstSegment) || type === "directory") {
      seen.set(firstSegment, type);
    }
  }
  return [...seen.entries()].map(([name, type]) => ({ name, type }));
},
```

#### Step 1.4: Write tests for `readDirEntries`

**File**: `packages/backend/tests/adventure-service.test.ts` (or a new `file-ops.test.ts`)

The `readDirEntries` implementation test from the spec AI validation: create a store with mixed files and subdirectories in the same directory, assert the returned entries have correct `type` values. This tests the mock directly (the real implementation is thin enough that it relies on `node:fs` correctness).

```typescript
describe("readDirEntries", () => {
  test("returns files and directories with correct types", async () => {
    const fileOps = createMockFileOps({
      "/adv/character.md": "...",
      "/adv/world.md": "...",
      "/adv/characters/dwig.md": "...",
    });
    const entries = await fileOps.readDirEntries("/adv");
    const byName = Object.fromEntries(entries.map((e) => [e.name, e.type]));
    expect(byName["character.md"]).toBe("file");
    expect(byName["world.md"]).toBe("file");
    expect(byName["characters"]).toBe("directory");
  });
});
```

---

### Phase 2: Add Shared Schemas

Touches two files in the shared package.

#### Step 2.1: Add schemas to `adventures.ts`

**File**: `packages/shared/src/schemas/adventures.ts`

Append at the end of the file (after `CompactErrorSchema`):

```typescript
// Recursive file tree node
export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
};

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

export type FileTreeResponse = z.infer<typeof FileTreeResponseSchema>;
export type FileContentResponse = z.infer<typeof FileContentResponseSchema>;
```

**Note on type declaration**: TypeScript cannot infer `FileTreeNode` from `z.lazy()` without a pre-declared type. The pattern here is to declare the interface first, then use it as the generic parameter on `ZodType<FileTreeNode>`. This is what the spec prescribes and it is correct.

#### Step 2.2: Re-export from package index

**File**: `packages/shared/src/index.ts`

Verify the file uses a wildcard export of schemas (likely `export * from "./schemas/adventures"`). If so, no change is needed — the new schemas are picked up automatically. If named exports are listed explicitly, add the four new names.

---

### Phase 3: Backend Routes

Two new route handlers added to `createAdventureRoutes`. A new pure helper function handles recursive tree building. No new service file is needed: the logic is contained and routes already have `fileOps` and `adventureService` in scope.

#### Step 3.1: Add the recursive tree builder

**File**: `packages/backend/src/routes/adventure-routes.ts`

Add a pure function above `createAdventureRoutes`. It is exported separately so it can be tested without the HTTP layer:

```typescript
import type { FileTreeNode } from "@corvran/shared";

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".csv"]);

export function isBinaryPath(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return !TEXT_EXTENSIONS.has(ext);
}

export async function buildFileTree(
  fileOps: FileOps,
  dirPath: string,
  relativePath: string,
): Promise<FileTreeNode[]> {
  const entries = await fileOps.readDirEntries(dirPath);

  // Sort: directories first (alpha), then files (alpha)
  const dirs = entries.filter((e) => e.type === "directory").sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((e) => e.type === "file").sort((a, b) => a.name.localeCompare(b.name));

  const nodes: FileTreeNode[] = [];

  for (const dir of dirs) {
    const childRelPath = relativePath ? `${relativePath}/${dir.name}` : dir.name;
    const childAbsPath = fileOps.resolvePath(dirPath, dir.name);
    const children = await buildFileTree(fileOps, childAbsPath, childRelPath);
    nodes.push({ name: dir.name, path: childRelPath, type: "directory", children });
  }

  for (const file of files) {
    const childRelPath = relativePath ? `${relativePath}/${file.name}` : file.name;
    nodes.push({ name: file.name, path: childRelPath, type: "file" });
  }

  return nodes;
}
```

**Why a pure exported function**: the spec's AI validation requires a tree sort order test and a recursive tree test. Testing these through the HTTP layer requires more scaffolding; testing `buildFileTree` directly is simpler.

#### Step 3.2: Add `GET /adventures/:id/files`

**File**: `packages/backend/src/routes/adventure-routes.ts`

Add inside `createAdventureRoutes`, after the existing `GET /adventures/:id/history` handler (around line 71):

```typescript
routes.get("/adventures/:id/files", async (c) => {
  const id = c.req.param("id");
  if (!isValidId(id)) {
    return c.json({ error: "Invalid adventure ID" }, 400);
  }
  if (!fileOps) {
    return c.json({ error: "File operations unavailable" }, 503);
  }

  const adventure = await adventureService.getAdventure(id);
  if (!adventure) {
    return c.json({ error: "Adventure not found" }, 404);
  }

  const adventurePath = adventureService.getAdventurePath(id);
  const tree = await buildFileTree(fileOps, adventurePath, "");
  return c.json({ tree });
});
```

#### Step 3.3: Add `GET /adventures/:id/file`

**File**: `packages/backend/src/routes/adventure-routes.ts`

Add after the files route:

```typescript
routes.get("/adventures/:id/file", async (c) => {
  const id = c.req.param("id");
  if (!isValidId(id)) {
    return c.json({ error: "Invalid adventure ID" }, 400);
  }
  if (!fileOps) {
    return c.json({ error: "File operations unavailable" }, 503);
  }

  const relativePath = c.req.query("path");
  if (!relativePath) {
    return c.json({ error: "Missing required query parameter: path" }, 400);
  }

  const adventure = await adventureService.getAdventure(id);
  if (!adventure) {
    return c.json({ error: "Adventure not found" }, 404);
  }

  // Path traversal check (REQ-VF-7)
  const adventurePath = adventureService.getAdventurePath(id);
  const resolvedPath = fileOps.resolvePath(adventurePath, relativePath);
  const normalizedRoot = fileOps.resolvePath(adventurePath);
  if (!resolvedPath.startsWith(normalizedRoot + "/") && resolvedPath !== normalizedRoot) {
    return c.json({ error: "Invalid path" }, 400);
  }

  // Binary classification (REQ-VF-9)
  if (isBinaryPath(relativePath)) {
    return c.json({ path: relativePath, content: null, binary: true });
  }

  // File existence check (REQ-VF-8)
  if (!(await fileOps.fileExists(resolvedPath))) {
    return c.json({ error: "File not found" }, 404);
  }

  const content = await fileOps.readFile(resolvedPath);
  return c.json({ path: relativePath, content, binary: false });
});
```

**Note on path traversal**: `resolvePath` calls `node:path`'s `resolve`, which normalizes `..` segments. The check verifies the resulting absolute path starts with the adventure directory. URL decoding happens automatically because Hono parses query parameters from the decoded URL.

**Note on binary check ordering**: Binary files are identified before the filesystem existence check. A request for a nonexistent `.png` file returns `binary: true, content: null` rather than 404. This avoids unnecessary stat calls and is consistent with the spec's response shape for binary files.

#### Step 3.4: Add operations to the operations registry

**File**: `packages/backend/src/routes/adventure-routes.ts`

Add to the `operations` array (before the closing `]`):

```typescript
{
  operationId: "adventures.files.list",
  name: "files",
  description: "Get the complete file tree for an adventure",
  invocation: { method: "GET", path: "/adventures/:id/files" },
  hierarchy: { root: "adventures", feature: "files" },
  parameters: [
    { name: "id", in: "path", required: true, description: "Adventure directory name" },
  ],
  idempotent: true,
},
{
  operationId: "adventures.file.get",
  name: "file",
  description: "Get the content of a single adventure file",
  invocation: { method: "GET", path: "/adventures/:id/file" },
  hierarchy: { root: "adventures", feature: "files" },
  parameters: [
    { name: "id", in: "path", required: true, description: "Adventure directory name" },
    { name: "path", in: "query", required: true, description: "Relative path to file" },
  ],
  idempotent: true,
},
```

#### Step 3.5: Write backend route tests

**File**: `packages/backend/tests/routes.test.ts` (or a new `packages/backend/tests/file-routes.test.ts`)

Prefer a new file to keep the existing routes test focused. Tests use `createMockFileOps` with inline file stores and `app.request()`.

Tests to write (matching spec AI validation):

1. **Tree sort order**: Store with a mix of files and subdirectories; assert response places all directories before files in each group, each sorted alphabetically.
2. **Recursive tree**: Adventure with `characters/dwig.md`; assert response has a `characters` directory node with `dwig.md` as a child, and `path` is `characters/dwig.md`.
3. **Path traversal (URL-encoded `..`)**: `GET /adventures/adv/file?path=..%2F..%2Fetc%2Fpasswd` returns 400.
4. **Path traversal (absolute path)**: `GET /adventures/adv/file?path=%2Fetc%2Fpasswd` returns 400.
5. **Binary classification**: `.png` path returns `binary: true, content: null`.
6. **Text file**: `.md` path returns `binary: false` with content.
7. **Missing `path` param**: `GET /adventures/adv/file` (no query) returns 400.
8. **Missing file**: `GET /adventures/adv/file?path=nonexistent.md` returns 404.
9. **Adventure not found (files endpoint)**: 404.
10. **Adventure not found (file endpoint)**: 404.
11. **Invalid adventure ID (files endpoint)**: 400.
12. **Invalid adventure ID (file endpoint)**: 400.

---

### Phase 4: Tab Bar in the Adventure Play Page

This phase is contained to the page component and its CSS module. No new component files.

#### Step 4.1: Add tab state to the page component

**File**: `packages/web/app/adventure/[id]/page.tsx`

Add a single state variable after the existing state declarations:

```typescript
const [activeTab, setActiveTab] = useState<"play" | "files">("play");
```

Also add a ref to track whether the file tree has been fetched (for lazy fetch on first activation):

```typescript
const hasActivatedFilesTab = useRef(false);
```

#### Step 4.2: Add the tab bar JSX

**File**: `packages/web/app/adventure/[id]/page.tsx`

Insert between `<PlayHeader>` and the conversation div:

```tsx
<div className={styles.tabBar}>
  <button
    className={`${styles.tabBtn} ${activeTab === "play" ? styles.tabBtnActive : ""}`}
    onClick={() => setActiveTab("play")}
    type="button"
  >
    Play
  </button>
  <button
    className={`${styles.tabBtn} ${activeTab === "files" ? styles.tabBtnActive : ""}`}
    onClick={() => {
      setActiveTab("files");
      hasActivatedFilesTab.current = true;
    }}
    type="button"
  >
    Files
  </button>
</div>
```

#### Step 4.3: Conditionally render conversation and input area

**File**: `packages/web/app/adventure/[id]/page.tsx`

Wrap the existing conversation `<div>` with `{activeTab === "play" && ...}`. Do the same for `inputArea`.

Replace the direct render of `<div className={styles.conversation} ...>` with:
```tsx
{activeTab === "play" && (
  <div className={styles.conversation} ref={conversationRef}>
    {/* existing conversation contents unchanged */}
  </div>
)}
```

Replace the direct render of `<div className={styles.inputArea}>` with:
```tsx
{activeTab === "play" && (
  <div className={styles.inputArea}>
    {/* existing input area contents unchanged */}
  </div>
)}
```

Add the Files panel immediately after (between the two conditional blocks):

```tsx
{activeTab === "files" && (
  <FilesView adventureId={id} triggered={hasActivatedFilesTab.current} />
)}
```

**Note on conversation state preservation**: By keeping `messages`, `isStreaming`, and all hooks outside the conditional, they survive tab switches. The conversation div is unmounted on tab switch; `conversationRef` scroll state is lost. This is acceptable per spec (no requirement to preserve scroll position).

#### Step 4.4: Add tab bar styles

**File**: `packages/web/app/adventure/[id]/page.module.css`

Add after the `.header` rules:

```css
/* ── Tab bar ─────────────────────────────────────────────── */
.tabBar {
  display: flex;
  border-bottom: 1px solid var(--accent-border);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.tabBtn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 20px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text-tertiary);
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.tabBtn:hover {
  color: var(--text-secondary);
}

.tabBtnActive {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

---

### Phase 5: `FilesView` Component

Two new components: `FilesView` (container with fetch logic) and `FileTree` (tree renderer). Both live in the same component file alongside the adventure page components, keeping things co-located. If either grows beyond ~150 lines it should be extracted to a separate file — but start co-located.

**Alternative**: extract to `packages/web/app/adventure/[id]/FilesView.tsx`. Either is acceptable. Co-location is simpler for the first pass.

#### Step 5.1: Add `FilesView` component

**File**: `packages/web/app/adventure/[id]/page.tsx`

Add after the `NewAdventureState` component at the bottom:

```tsx
import type { FileTreeNode, FileTreeResponse, FileContentResponse } from "@corvran/shared";

function FilesView({ adventureId, triggered }: { adventureId: string; triggered: boolean }) {
  const [tree, setTree] = useState<FileTreeNode[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Fetch tree on first activation (lazy, not on page load)
  useEffect(() => {
    if (!triggered || hasFetched.current) return;
    hasFetched.current = true;

    fetch(`/api/daemon/adventures/${adventureId}/files`)
      .then((r) => r.json() as Promise<FileTreeResponse>)
      .then((data) => setTree(data.tree))
      .catch(() => setTreeError("Failed to load file tree"));
  }, [triggered, adventureId]);

  const handleSelectFile = useCallback((path: string) => {
    if (path === selectedPath) return; // REQ-VF-19: no re-fetch on same file
    setSelectedPath(path);
    setFileContent(null);
    setFileError(null);
    setFileLoading(true);

    fetch(`/api/daemon/adventures/${adventureId}/file?path=${encodeURIComponent(path)}`)
      .then((r) => r.json() as Promise<FileContentResponse>)
      .then((data) => setFileContent(data))
      .catch(() => setFileError("Failed to load file"))
      .finally(() => setFileLoading(false));
  }, [selectedPath, adventureId]);

  return (
    <div className={styles.filesView}>
      <div className={styles.filesTree}>
        {treeError && <div className={styles.filesError}>{treeError}</div>}
        {!tree && !treeError && <div className={styles.filesLoading}>Loading...</div>}
        {tree && (
          <FileTree
            nodes={tree}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        )}
      </div>
      <div className={styles.filesContent}>
        {!selectedPath && (
          <div className={styles.filesEmpty}>Select a file to view its contents.</div>
        )}
        {selectedPath && fileLoading && (
          <div className={styles.filesLoading}>Loading...</div>
        )}
        {selectedPath && fileError && (
          <div className={styles.filesError}>{fileError}</div>
        )}
        {fileContent && !fileLoading && (
          fileContent.binary
            ? <div className={styles.filesEmpty}>Binary file — preview not available.</div>
            : <div className={styles.fileMarkdown}>
                <ReactMarkdown>{fileContent.content ?? ""}</ReactMarkdown>
              </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 5.2: Add `FileTree` component

**File**: `packages/web/app/adventure/[id]/page.tsx`

Add after `FilesView`:

```tsx
function FileTree({
  nodes,
  selectedPath,
  onSelectFile,
}: {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  return (
    <ul className={styles.treeList}>
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </ul>
  );
}

function FileTreeNode({
  node,
  selectedPath,
  onSelectFile,
}: {
  node: FileTreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false); // default: expanded (REQ-VF-18)

  if (node.type === "directory") {
    return (
      <li className={styles.treeItem}>
        <button
          className={styles.treeDirBtn}
          onClick={() => setCollapsed((c) => !c)}
          type="button"
        >
          <span className={styles.treeDirIcon}>{collapsed ? "▶" : "▼"}</span>
          {node.name}
        </button>
        {!collapsed && node.children && (
          <FileTree
            nodes={node.children}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        )}
      </li>
    );
  }

  const isSelected = node.path === selectedPath;
  return (
    <li className={styles.treeItem}>
      <button
        className={`${styles.treeFileBtn} ${isSelected ? styles.treeFileBtnSelected : ""}`}
        onClick={() => onSelectFile(node.path)}
        type="button"
      >
        {node.name}
      </button>
    </li>
  );
}
```

#### Step 5.3: Add layout and tree styles

**File**: `packages/web/app/adventure/[id]/page.module.css`

Add at the end:

```css
/* ── Files view ─────────────────────────────────────────── */
.filesView {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* Desktop: side-by-side (REQ-VF-26) */
@media (min-width: 640px) {
  .filesView {
    flex-direction: row;
  }

  .filesTree {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--accent-border);
    overflow-y: auto;
    padding: 16px 0;
  }

  .filesContent {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
  }
}

/* Mobile: stacked (REQ-VF-27) */
@media (max-width: 639px) {
  .filesView {
    flex-direction: column;
  }

  .filesTree {
    border-bottom: 1px solid var(--accent-border);
    overflow-y: auto;
    padding: 12px 0;
    max-height: 40vh;
  }

  .filesContent {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
}

/* Tree elements */
.treeList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.treeItem {
  margin: 0;
}

.treeDirBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: transparent;
  border: none;
  padding: 4px 16px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
}

.treeDirBtn:hover {
  background: var(--bg-elevated);
}

.treeDirIcon {
  font-size: 9px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

/* Children of directory are indented via nested .treeList padding */
.treeItem .treeList {
  padding-left: 16px;
}

.treeFileBtn {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  padding: 4px 16px;
  font-size: 13px;
  font-family: var(--font-sans);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
}

.treeFileBtn:hover {
  background: var(--bg-elevated);
}

.treeFileBtnSelected {
  background: var(--bg-elevated);
  color: var(--accent);
  font-weight: 500;
}

/* Content pane */
.filesEmpty {
  color: var(--text-tertiary);
  font-size: 13px;
  font-style: italic;
  font-family: var(--font-serif);
}

.filesError {
  color: var(--error-text);
  font-size: 13px;
}

.filesLoading {
  color: var(--text-tertiary);
  font-size: 13px;
  font-style: italic;
  font-family: var(--font-serif);
}

.fileMarkdown {
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
}

.fileMarkdown p {
  margin-bottom: 1em;
}

.fileMarkdown p:last-child {
  margin-bottom: 0;
}

.fileMarkdown h1,
.fileMarkdown h2,
.fileMarkdown h3 {
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  font-weight: normal;
}

.fileMarkdown ul,
.fileMarkdown ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
```

#### Step 5.4: Write frontend unit tests

**File**: `packages/web/tests/files-view.test.tsx` (if web has a test setup) or document that frontend tests are deferred.

Check whether `packages/web` has a `tests/` directory and bun test config before assuming frontend tests run. If web tests exist, add:

- Tree renders directories before files (use mock data, inspect DOM order)
- Clicking a directory node toggles `collapsed` state
- Clicking a file node calls `onSelectFile` with the correct path

If web tests do not exist, note this gap and confirm with the reviewer whether backend-only coverage is acceptable for this phase.

---

## Delegation Guide

### Parallelization

Phases 1, 2, and 3 are independent:
- Phase 1 (FileOps extension) touches only backend types and mock
- Phase 2 (Shared schemas) touches only shared package
- Phase 3 (Backend routes) requires Phase 1 (needs `readDirEntries` on `FileOps`), but not Phase 2

**Dispatch order**:
1. **Dispatch Phases 1 and 2 in parallel** (no shared files; no conflict).
2. **Dispatch Phase 3 after Phase 1 completes** (imports `readDirEntries` from `FileOps`).
3. **Dispatch Phase 4 after all backend/shared work is complete** (uses shared types in imports).
4. **Dispatch Phase 5 after Phase 4** (adds components that import shared types and slots into the tab structure from Phase 4).

Phases 4 and 5 both modify `page.tsx` and `page.module.css`. They must be sequential or bundled into a single commission.

### Reviewer Checkpoints

**After Phase 3**: Fresh-context review of backend routes. Check:
- Path traversal test coverage (URL-encoded `..`, absolute path)
- Binary classification: correct extension set, no disk read for binary
- `buildFileTree` sort order: directories before files, each group alpha
- `isValidId` guard on both new routes
- `readDirEntries` in mock handles mixed children correctly
- Operations registered in ops array

**After Phase 5**: Fresh-context review of frontend. Check:
- Tab switch does not reset `messages`, `isStreaming`, or streaming hooks
- `FilesView` does not fetch on page load; only on first Files tab activation
- Re-clicking the selected file does not trigger a re-fetch
- Binary file shows correct message string (exact match from spec: "Binary file — preview not available")
- Empty state shows correct hint string: "Select a file to view its contents."
- Player input area is absent when Files tab is active

---

## Gaps and Ambiguities

### Resolved during planning

**Where `FilesView` lives**: The spec says "frontend components." Co-locating with `page.tsx` keeps things simple for a first pass. If either component exceeds ~150 lines, extract to a sibling file (`FilesView.tsx`). The plan defaults to co-location and leaves extraction to implementer judgment.

**Binary check before existence check**: The spec says 404 if the file does not exist (REQ-VF-8) and binary classification by extension (REQ-VF-9). A request for a nonexistent binary file is ambiguous. The plan resolves this: binary classification happens first. Binary files return `binary: true, content: null` regardless of existence, avoiding a disk read. This is the most defensive behavior (no information disclosure about what paths exist).

**Path traversal and URL decoding**: Hono's `c.req.query()` returns the decoded query parameter value. `node:path`'s `resolve()` normalizes `..` segments. The combination means both URL-encoded and literal `..` are handled without explicit decoding. The plan documents this rather than adding redundant decoding.

**Frontend tests**: `packages/web` may not have a test setup. The plan flags this as something to check before Phase 5 dispatch. If tests don't exist, the reviewer checkpoint covers the gap.

**`hasActivatedFilesTab` ref vs. state**: The tab activation trigger for lazy fetch is a `ref`, not state. This prevents a re-render on activation. The `triggered` prop to `FilesView` captures the value at render time. The `hasFetched` ref inside `FilesView` prevents duplicate fetches on tab re-activation. This pattern is correct but should be explicitly reviewed.

### Not addressed (out of scope per spec)

- **URL state for selected file**: Deep-linking to a specific file is not in scope.
- **Live refresh**: No polling or SSE-based tree refresh.
- **Search**: No full-text search.
- **Pagination / size limits**: Large files are served in full.
- **Write operations**: No create, edit, or delete endpoints.
