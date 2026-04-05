---
title: "Implementation plan: compaction-system"
date: 2026-04-02
status: executed
tags: [plan, compaction, history, context-management, narrative, haiku, mcp]
modules: [backend, shared, web]
related: [.lore/specs/compaction-system-spec.md, .lore/reference/architecture-pattern.md, .lore/brainstorm/compaction-system.md, .lore/brainstorm/conversation-history.md, .lore/research/scene-boundaries.md]
---

# Plan: Compaction System

Four phases, matching the spec's incremental delivery but splitting Phase 1 into two pieces: the service (testable in isolation) and the route integration (depends on the service). Each phase ships, gets reviewed, and gets fixed before the next begins. The spec is dense (41 requirements), so the requirement mapping below is the source of truth for what lands where.

## Spec Reference

**Spec**: `.lore/specs/compaction-system-spec.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-COMP-1 | 1 | Archive-summarize-save mechanism (three steps, atomic) |
| REQ-COMP-2 | 1 | Archive: move to `past/`, sequential naming `scene-NNN.md` / `world-NNN.md` |
| REQ-COMP-3 | 1 | Summarize: Haiku call with summarization prompt |
| REQ-COMP-4 | 1 | Save: write summary as new working file |
| REQ-COMP-5 | 1 | Auto-create `past/` directory on first compaction |
| REQ-COMP-6 | 1 | Archived files are player-readable markdown |
| REQ-COMP-7 | 2 | Threshold check in message handler before prompt assembly |
| REQ-COMP-8 | 2 | Default 150K char threshold, `HISTORY_COMPACT_THRESHOLD` env var |
| REQ-COMP-9 | 2 | World threshold: 200K default, `WORLD_COMPACT_THRESHOLD` env var |
| REQ-COMP-9a | 1 | Configurable compaction model via `COMPACTION_MODEL` env var (default `"haiku"`) |
| REQ-COMP-10 | 2 | History-first ordering when both thresholds exceeded |
| REQ-COMP-11 | 4 | `compact_history` MCP tool on corvran server |
| REQ-COMP-12 | 4 | Tool returns confirmation with archive path |
| REQ-COMP-13 | 4 | GM system prompt guidance for when to use the tool |
| REQ-COMP-14 | 4 | No minimum history length for GM tool |
| REQ-COMP-15 | 3 | `POST /adventures/:id/compact` endpoint |
| REQ-COMP-16 | 1 | History summarization prompt: narrative recap, no meta-commentary |
| REQ-COMP-17 | 1 | Preserve: character names, quests, tensions, location, mechanics, decisions, emotional state |
| REQ-COMP-18 | 1 | Most recent events get most detail; final paragraph establishes current situation |
| REQ-COMP-19 | 1 | Include character.md and world.md as reference context in Haiku call |
| REQ-COMP-20 | 1 | World compaction prompt: consolidate reference document, remove dead threads |
| REQ-COMP-21 | 1 | Directory structure after compaction |
| REQ-COMP-22 | 1 | history.md after compaction: recap only, new exchanges append after |
| REQ-COMP-23 | 1 | Archived files are verbatim, no transformation |
| REQ-COMP-24 | 1 | CompactionService follows route/service split with DI |
| REQ-COMP-25 | 1 | Haiku call uses same QueryFn as session runner, minimal options |
| REQ-COMP-26 | 2 | Full message handler sequence with threshold checks |
| REQ-COMP-27 | 4 | MCP tool registration alongside roll_dice and set_mood |
| REQ-COMP-28 | 3 | Compact endpoint in adventure routes, shared Zod schema |
| REQ-COMP-29 | 1 | Per-adventure concurrency lock |
| REQ-COMP-30 | 4 | GM tool runs inline with turn |
| REQ-COMP-31 | 3 | Compact button visibility and disable logic |
| REQ-COMP-32 | 3 | Confirmation prompt before compaction |
| REQ-COMP-33 | 3 | Inline status message and history refresh after compaction |
| REQ-COMP-34 | 4 | No special UI for GM-triggered compaction |
| REQ-COMP-35 | 2 | Context overflow after compaction still returns error |
| REQ-COMP-36 | 1 | Short/missing history: skip compaction (< 500 chars) |
| REQ-COMP-37 | 1 | Player-edited history is compacted as-is |
| REQ-COMP-38 | 1 | No crash recovery for partial compaction |
| REQ-COMP-39 | 1 | Sequential numbering never reuses deleted numbers |
| REQ-COMP-40 | 1 | Tool artifacts in history handled naturally by Haiku |
| REQ-COMP-41 | 2 | Haiku failure during threshold trigger: reverse archive, proceed with original |

## Codebase Context

### Architecture

The daemon uses a route/service split with DI factories (`.lore/reference/architecture-pattern.md`). Each service is created via `createXxxService(deps)`, each route module via `createXxxRoutes(deps)`. All AI calls flow through a single `QueryFn` type: `(params: { prompt: string; options?: Options }) => Query`.

### Files That Will Change

**`packages/backend/src/services/session-runner.ts`** (84 LOC). Creates the corvran MCP server with `roll_dice` and `set_mood` tools. The `compact_history` tool will be added here in Phase 4. The `allowedTools` array at line 68 needs `mcp__corvran__compact_history`.

**`packages/backend/src/routes/adventure-routes.ts`** (398 LOC). The message handler (`POST /adventures/:id/message`, lines 104-306) reads history, appends the player message, assembles the prompt, streams the SDK response, and appends the GM response. Phase 2 inserts threshold checks between history read (line 136) and player message append (line 139). Phase 3 adds the `POST /adventures/:id/compact` endpoint.

**`packages/backend/src/services/prompt-service.ts`** (107 LOC). Assembles the system prompt. Phase 4 adds the compact_history tool guidance to the Instructions section.

**`packages/backend/src/app.ts`** (150 LOC). DI wiring. Needs to create the CompactionService and pass it to adventure routes.

**`packages/backend/src/types.ts`**. The `FileOps` interface needs two new methods for compaction: `deleteFile(path: string): Promise<void>` (archive is write-then-delete, not copy) and `readFiles(path: string): Promise<string[]>` (list file names in a directory; the existing `readDir` returns only subdirectory names because it filters for `isDirectory()`). Both methods must be added to the interface, the production implementation in `app.ts`, and the mock in `tests/helpers/mock-file-ops.ts`.

**`packages/shared/src/schemas/adventures.ts`** (99 LOC). Zod schemas. Phase 3 adds `CompactResponseSchema` and `CompactErrorSchema`.

**`packages/web/app/adventure/[id]/page.tsx`** (349 LOC). Play view. Phase 3 adds the Compact button with confirmation, disable logic tied to `isStreaming`, and inline status during compaction.

### New Files

- `packages/backend/src/services/compaction-service.ts` (Phase 1)
- `packages/backend/src/services/compact-tool.ts` (Phase 4)
- `packages/backend/tests/services/compaction-service.test.ts` (Phase 1)
- `packages/backend/tests/routes/compact-endpoint.test.ts` (Phase 3)
- `packages/backend/tests/routes/message-threshold.test.ts` (Phase 2)
- `packages/backend/tests/services/compact-tool.test.ts` (Phase 4)

### Existing Patterns to Follow

**MCP tool definition**: `dice-tool.ts` exports `createDiceToolDef()` which returns a tool definition for `createSdkMcpServer`. The compact tool follows this pattern exactly.

**Test infrastructure**: `tests/helpers/mock-file-ops.ts` provides an in-memory filesystem. `tests/helpers/mock-query.ts` creates fake SDK query responses. The CompactionService tests will use `mock-file-ops` for file operations and a mock `queryFn` that returns a canned summary.

**FileOps interface** (`types.ts`): `readFile`, `writeFile`, `appendFile`, `fileExists`, `readDir`, `stat`, `resolvePath`. The compaction service needs all of these plus two new methods: `deleteFile` (for archive move-not-copy) and `readFiles` (for scanning `past/` for existing `scene-NNN.md` files; the existing `readDir` filters for directories only). See "Files That Will Change" above.

### QueryFn for Compaction

REQ-COMP-25 specifies that compaction uses the same `QueryFn` with minimal options: `model` (from config, default `"haiku"`), `systemPrompt`, `persistSession: false`, `permissionMode: 'dontAsk'`. No `cwd`, `plugins`, `tools`, `allowedTools`, or `mcpServers`. The Claude Agent SDK resolves short model names (`"haiku"`, `"sonnet"`, `"opus"`) to the latest available version automatically. Never hardcode a versioned model ID. The compaction service receives `queryFn` and a `model` config string as dependencies (same DI pattern as session runner) and calls `queryFn` directly. The session runner is not involved in compaction calls.

## Implementation Steps

### Phase 1: CompactionService and Summarization Prompts

Build the core mechanism in isolation. No route changes, no UI. Everything is testable through the service interface.

**Dalton commission**: Implement Phase 1.
**Thorne commission**: Review Phase 1.

#### Step 1.1: Create `compaction-service.ts`

**Files**: `packages/backend/src/services/compaction-service.ts` (new)
**Addresses**: REQ-COMP-1, REQ-COMP-2, REQ-COMP-3, REQ-COMP-4, REQ-COMP-5, REQ-COMP-6, REQ-COMP-9a, REQ-COMP-22, REQ-COMP-23, REQ-COMP-24, REQ-COMP-25, REQ-COMP-29, REQ-COMP-36, REQ-COMP-37, REQ-COMP-38, REQ-COMP-39

**Prerequisite**: Add `deleteFile(path: string): Promise<void>` and `readFiles(path: string): Promise<string[]>` to the `FileOps` interface in `types.ts`. Add implementations in `app.ts` (production: `fs.unlink` and `readdir` filtered for `isFile()`) and `tests/helpers/mock-file-ops.ts` (mock: delete from in-memory store, scan keys for files in directory). This is required because the existing `readDir` returns only subdirectories (filters `isDirectory()`), and there is no delete operation.

Create `createCompactionService(deps)` factory following the DI pattern. Dependencies:

```
{
  fileOps: FileOps,
  queryFn: QueryFn,
  model?: string,  // default "haiku"; SDK resolves to latest version
}
```

Public interface:

- `compactHistory(adventurePath: string, context?: { character?: string; world?: string }): Promise<CompactionResult>`
- `compactWorld(adventurePath: string): Promise<CompactionResult>`
- `isCompacting(adventurePath: string): boolean`

Where `CompactionResult` is `{ archived: string; previousSize: number; newSize: number }`.

Implementation for `compactHistory`:

1. Check concurrency lock. If already compacting this adventure path, throw `CompactionInProgressError`.
2. Set concurrency lock for this adventure path.
3. Read `history.md`. If missing or < 500 characters, throw `HistoryTooShortError`.
4. Determine next sequence number: use `fileOps.readFiles()` on the `past/` directory (not `readDir`, which returns only subdirectories), filter for files matching `scene-NNN.md`, find highest NNN, add 1. If `past/` doesn't exist, start at 1.
5. Create `past/` directory if needed (REQ-COMP-5). Use `fileOps.writeFile` on a placeholder, or add `mkdir` to FileOps. Simplest: writing the archive file to `past/scene-NNN.md` will need the directory to exist. Check if the directory exists first; if not, create it. (Bun's `Bun.write` creates intermediate directories, but the FileOps abstraction should be explicit about this.)
6. Move `history.md` to `past/scene-NNN.md`: write the content to the archive path, then `deleteFile` the original (REQ-COMP-2, REQ-COMP-23). Write-then-delete, not copy, per the spec's rationale about avoiding two copies on disk.
7. Call `queryFn` with the history summarization prompt and the archived content as the user message. Include character.md and world.md as context in the system prompt if provided (REQ-COMP-19). Use `model: deps.model ?? "haiku"` (REQ-COMP-9a, REQ-COMP-25), `persistSession: false`, `permissionMode: 'dontAsk'`. Set a 60-second timeout via `AbortSignal.timeout(60_000)` passed as `abortController` (REQ-COMP-41). No other options. The SDK resolves `"haiku"` to the latest Haiku version automatically.
8. Extract the text result from the query response. Write it as the new `history.md` (REQ-COMP-4, REQ-COMP-22).
9. Clear concurrency lock.
10. Return `{ archived: "past/scene-NNN.md", previousSize, newSize }`.

If the Haiku call fails (step 7), move the archived file back from `past/scene-NNN.md` to `history.md` and clear the lock. This reversal is critical for the threshold trigger path (REQ-COMP-41). Re-throw the error so callers can handle it per their trigger type.

The concurrency lock is an in-memory `Set<string>` keyed by adventure path. No persistence needed; daemon restart clears it, which is fine since compaction is sub-5-second (REQ-COMP-38).

`compactWorld` follows the same pattern with `world-NNN.md` naming and the world-specific prompt (REQ-COMP-20).

**Concurrency edge case**: The lock must be released in a `finally` block, not just on success. A failed Haiku call that doesn't release the lock would permanently block compaction for that adventure until daemon restart.

#### Step 1.2: Write Summarization Prompts

**Files**: `packages/backend/src/services/compaction-service.ts` (same file, prompt constants)
**Addresses**: REQ-COMP-16, REQ-COMP-17, REQ-COMP-18, REQ-COMP-20, REQ-COMP-40

Two prompt constants in the compaction service module:

**`HISTORY_SUMMARIZATION_PROMPT`**: The system prompt for history compaction. The spec is unusually prescriptive here (REQ-COMP-16 through REQ-COMP-18 give near-verbatim wording), so follow it closely:

- "Your output will be saved as the adventure's history file." (REQ-COMP-16)
- "Do not include meta-commentary, headers like 'Summary:', or references to the act of summarizing." (REQ-COMP-16)
- "Write as though you are the story's narrator recapping events for a reader who will continue the adventure from where you leave off." (REQ-COMP-16)
- Preservation categories from REQ-COMP-17 listed explicitly.
- "Structure the summary with the most recent events given the most detail." (REQ-COMP-18)
- "The final paragraph must clearly establish the current situation." (REQ-COMP-18)
- If character.md or world.md are provided, include them as reference sections in the system prompt (REQ-COMP-19).

**`WORLD_SUMMARIZATION_PROMPT`**: The system prompt for world compaction. Per REQ-COMP-20: remove dead threads, consolidate duplicates, tighten prose, preserve active quest state and living NPC details.

#### Step 1.3: Extract Query Result Text

**Files**: `packages/backend/src/services/compaction-service.ts`
**Addresses**: REQ-COMP-25, REQ-COMP-9a

The `queryFn` returns a `Query` (async iterable of SDK messages). The compaction service needs to iterate the query result and extract the final text. This is different from the streaming path in adventure routes, which emits SSE events as they arrive. Compaction consumes the full result:

```
for await (const msg of query) {
  if (msg.type === "result" && msg.subtype === "success") {
    return msg.result;  // full text response
  }
  if (msg.type === "result" && msg.subtype !== "success") {
    throw new Error(`Haiku summarization failed: ${msg.errors.join("; ")}`);
  }
}
```

No streaming, no tool handling, no SSE. The compaction service reads only the final result.

#### Step 1.4: Write CompactionService Tests

**Files**: `packages/backend/tests/services/compaction-service.test.ts` (new)
**Addresses**: REQ-COMP-1 through REQ-COMP-6, REQ-COMP-22, REQ-COMP-23, REQ-COMP-29, REQ-COMP-36, REQ-COMP-39

Tests use `createMockFileOps` with pre-populated files and a mock `queryFn` that returns a canned summary string.

Required test cases (from spec's AI Validation section plus edge cases):

1. **Compaction pipeline**: Create history.md with known content, run `compactHistory`. Verify: original moved to `past/scene-001.md` with exact content, `history.md` replaced with Haiku output, `past/` directory created.
2. **Sequential numbering**: Run compaction three times. Verify `scene-001.md`, `scene-002.md`, `scene-003.md`. Pre-populate `past/` with `scene-001.md` and `scene-003.md` (gap), run compaction, verify next file is `scene-004.md` (highest + 1, not gap fill).
3. **Short history**: Set history to < 500 characters. Verify `compactHistory` throws `HistoryTooShortError`.
4. **Missing history**: No history.md. Verify `compactHistory` throws `HistoryTooShortError`.
5. **Concurrency**: Start compaction (use a mock queryFn that delays). Call `isCompacting()`, verify true. Attempt second compaction, verify `CompactionInProgressError`. After first completes, verify `isCompacting()` is false.
6. **Haiku failure reversal**: Mock queryFn throws. Verify history.md is restored from `past/scene-NNN.md`, lock is cleared.
7. **Context passed to Haiku**: Verify the queryFn receives character.md and world.md content in the system prompt when provided.
8. **World compaction**: Same pipeline test with world.md and `world-NNN.md` naming.
9. **Verbatim archive**: Verify archived file content is byte-identical to original history.md (REQ-COMP-23).

#### Step 1.5: Wire CompactionService into DI

**Files**: `packages/backend/src/app.ts`
**Addresses**: REQ-COMP-24, REQ-COMP-9a

Create the CompactionService in `createApp()` alongside the other services. It needs `fileOps`, `queryFn`, and `model`. The model config follows the same DI chain as the session runner: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku"`. Add `compactionModel?: string` to `AppDeps`. Pass the resolved value to `createCompactionService({ fileOps, queryFn, model })`.

Pass the CompactionService to `createAdventureRoutes(deps)` as a new optional dependency (same pattern as `historyService` and `sessionRunner`).

This step is small but must happen before Phase 2 can integrate the threshold checks.

---

### Phase 2: Threshold Trigger in Message Handler

Wire the CompactionService into the message flow. When history or world exceed their thresholds, compact before prompt assembly.

**Dalton commission**: Implement Phase 2.
**Thorne commission**: Review Phase 2.

#### Step 2.1: Add Threshold Configuration

**Files**: `packages/backend/src/app.ts` or `packages/backend/src/services/compaction-service.ts`
**Addresses**: REQ-COMP-8, REQ-COMP-9

Read `HISTORY_COMPACT_THRESHOLD` and `WORLD_COMPACT_THRESHOLD` from environment variables. Defaults: 150,000 and 200,000 characters respectively. Parse as integers. These can be passed as configuration to the CompactionService factory, or read by the route. The route needs the thresholds to decide whether to call the service, so passing them as route-level config is cleaner.

Decision: Add a `CompactionConfig` type with `historyThreshold` and `worldThreshold` fields. Read from env in `app.ts`, pass to `createAdventureRoutes`.

#### Step 2.2: Modify Message Handler

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-COMP-7, REQ-COMP-10, REQ-COMP-26, REQ-COMP-35, REQ-COMP-41

The current message handler flow at lines 134-197:

1. Read adventure state
2. Read history (line 136)
3. Append player message (line 139)
4. Resolve plugins
5. Assemble system prompt
6. Stream SSE query

The new flow per REQ-COMP-26:

1. Read adventure state
2. Read history
3. **Check history size against threshold; if exceeded, compact, then re-read history**
4. **Check world size against threshold; if exceeded, compact, then re-read world**
5. Append player message
6. Assemble system prompt with (possibly compacted) state
7. Stream SSE query

Key details:

- The threshold check counts characters in the history string. Simple `.length` comparison.
- If compaction fires, the service reads the character/world context needed for the Haiku prompt. The route passes the adventure path; the service reads the files.
- After history compaction, re-read history (it's now the Haiku recap). Use the re-read value for prompt assembly.
- After world compaction, re-read world.md content from the file. The `adventure` object from `getAdventure()` (line 129) holds the pre-compaction world content; don't use it for prompt assembly if world was compacted. Either re-read the file directly via `fileOps` or re-call `getAdventure(id)`.
- If the Haiku call fails during threshold-triggered compaction (REQ-COMP-41), the service reverses the archive and re-throws. The route catches this, logs a warning, and proceeds with the original history. If the original history then causes context overflow, the existing error handling (line 277-284, `isContextOverflowError`) surfaces REQ-MVP-13's error message.
- History-first ordering (REQ-COMP-10): check and compact history before checking world. Sequential, not parallel.
- The threshold trigger path must handle `CompactionInProgressError` gracefully: if another trigger is already compacting, skip and proceed with the current file (REQ-COMP-29).

#### Step 2.3: Write Threshold Integration Tests

**Files**: `packages/backend/tests/routes/message-threshold.test.ts` (new file, following the `buildTestApp` pattern from `tests/message-route.test.ts`)
**Addresses**: REQ-COMP-7, REQ-COMP-10, REQ-COMP-35, REQ-COMP-41

Tests use the `buildTestApp` pattern from the existing message route tests: in-memory file system, mock queryFn.

Required test cases:

1. **Threshold trigger**: History exceeds threshold. Send a message. Verify compaction ran (history.md is now shorter, `past/scene-001.md` exists) and the prompt assembly used the compacted history.
2. **Below threshold**: History is under threshold. Send a message. Verify no compaction ran.
3. **Both thresholds exceeded**: Both history and world exceed thresholds. Verify history compacted first, then world, sequentially (REQ-COMP-10).
4. **Haiku failure fallback**: Threshold exceeded, mock queryFn fails. Verify archive is reversed, original history is used, request continues.
5. **Context overflow after compaction**: Threshold exceeded, compaction succeeds but the recap plus prompt still exceeds context. Verify the overflow error from REQ-MVP-13 is returned.
6. **Concurrent compaction skip**: Simulate compaction already in progress (e.g., from player button). Threshold check fires. Verify it skips compaction and proceeds with original file.

---

### Phase 3: Player Compact Endpoint and Web Client Button

Add `POST /adventures/:id/compact` and the frontend Compact button with confirmation.

**Dalton commission**: Implement Phase 3.
**Thorne commission**: Review Phase 3.

#### Step 3.1: Add Compact Response Schema to Shared

**Files**: `packages/shared/src/schemas/adventures.ts`, `packages/shared/src/index.ts`, `packages/shared/src/types.ts`
**Addresses**: REQ-COMP-28

Add Zod schemas for the compact endpoint responses:

- `CompactResponseSchema`: `{ archived: string, previousSize: number, newSize: number }`
- `CompactErrorSchema`: `{ error: string }`

Export the schemas and inferred types from the shared package index.

#### Step 3.2: Add Compact Endpoint to Adventure Routes

**Files**: `packages/backend/src/routes/adventure-routes.ts`
**Addresses**: REQ-COMP-15, REQ-COMP-28, REQ-COMP-29, REQ-COMP-36

Add `POST /adventures/:id/compact`:

1. Validate adventure ID.
2. Verify adventure exists (404 if not).
3. Call `compactionService.compactHistory(adventurePath, { character, world })`.
4. Return `CompactResponseSchema` on success.
5. Catch `HistoryTooShortError` and return HTTP 400 with "History is empty or too short to compact."
6. Catch `CompactionInProgressError` and return HTTP 409 with "Compaction is already running for this adventure."
7. Catch other errors and return HTTP 500 with "Compaction failed: {reason}".

Add the operation definition to the `operations` array for CLI discovery.

#### Step 3.3: Add Compact Button to Web Client

**Files**: `packages/web/app/adventure/[id]/page.tsx`, `packages/web/app/adventure/[id]/page.module.css`
**Addresses**: REQ-COMP-31, REQ-COMP-32, REQ-COMP-33

Add a "Compact" button to the play view:

- **Visibility**: Only when history exists (the `messages` array is non-empty). This is already available in component state.
- **Disabled when**: `isStreaming` is true (same logic as the send button), or `isCompacting` is true (new state).
- **Position**: In the input area, next to the send/stop buttons, or as a secondary action above the input. Follow the existing layout pattern. The spec doesn't prescribe position, so place it where it makes sense for the UI. A compact button is a secondary action; it shouldn't compete with send/stop for visual priority.

On click:

1. Show `window.confirm()` with the message from REQ-COMP-32: "Archive the current history and create a recap? The full transcript will be saved in the past/ folder."
2. If confirmed, set `isCompacting = true`.
3. Call `POST /api/daemon/adventures/:id/compact` (through the Next.js proxy).
4. On success: fetch `GET /api/daemon/adventures/:id/history` to refresh displayed messages. Set `isCompacting = false`.
5. On error: show the error message (toast or inline). Set `isCompacting = false`.

Inline status: While `isCompacting` is true, show "Creating recap..." in the chat area (similar to how streaming shows the GM response being built). A simple text node below the last message works.

#### Step 3.4: Add Next.js API Proxy Route for Compact

**Files**: `packages/web/app/api/daemon/adventures/[id]/compact/route.ts` (new)
**Addresses**: REQ-COMP-15

Follow the existing proxy pattern. The web package proxies daemon requests through Next.js API routes (the Node.js `http.request` with `socketPath` pattern from the 502 fix). Add a POST handler that forwards to the daemon's `POST /adventures/:id/compact`.

#### Step 3.5: Write Compact Endpoint Tests

**Files**: `packages/backend/tests/routes/compact-endpoint.test.ts` (new)
**Addresses**: REQ-COMP-15, REQ-COMP-28, REQ-COMP-29, REQ-COMP-36

Test cases from spec's AI Validation section:

1. **Success**: Call `POST /adventures/:id/compact`. Verify response includes `archived`, `previousSize`, `newSize`. Verify archived file exists. Verify new history is shorter.
2. **Adventure not found**: Call with invalid ID. Verify 404.
3. **Short history**: History < 500 chars. Verify 400 with "History is empty or too short to compact."
4. **Concurrent**: Simulate compaction in progress. Verify 409.
5. **Haiku failure**: Mock queryFn fails. Verify 500 with "Compaction failed: {reason}".

---

### Phase 4: GM Compact Tool and System Prompt Guidance

Add the `compact_history` MCP tool and teach the GM when to use it.

**Dalton commission**: Implement Phase 4.
**Thorne commission**: Review Phase 4.

#### Step 4.1: Create `compact-tool.ts`

**Files**: `packages/backend/src/services/compact-tool.ts` (new)
**Addresses**: REQ-COMP-11, REQ-COMP-12, REQ-COMP-14

Follow the `dice-tool.ts` pattern. Export `createCompactToolDef(deps)`.

Dependencies: The tool handler needs access to the CompactionService and the adventure path. Since MCP tool handlers receive input and return output but don't have ambient context, the tool definition factory must receive the adventure-specific context:

```typescript
createCompactToolDef(deps: {
  compactionService: CompactionService;
  adventurePath: string;
  getAdventureContext: () => Promise<{ character?: string; world?: string }>;
})
```

The tool:
- Name: `compact_history`
- Description: "Archive the current history and create a narrative recap."
- Input schema: empty object (no required parameters, per REQ-COMP-11).
- Handler: Calls `compactionService.compactHistory(adventurePath, context)`.
  - On success: return "History compacted. Scene archived to past/scene-NNN.md." (REQ-COMP-12).
  - On `HistoryTooShortError`: return "History is too short to compact."
  - On `CompactionInProgressError`: return "Compaction is already in progress."
  - On other error: return "Compaction failed: {reason}."

No minimum history check is needed beyond what the service already does (REQ-COMP-14 says the GM can compact short history, but the service's 500-char minimum still applies from REQ-COMP-36).

#### Step 4.2: Register Tool on Corvran MCP Server

**Files**: `packages/backend/src/services/session-runner.ts`
**Addresses**: REQ-COMP-27, REQ-COMP-30

The session runner creates the corvran MCP server at lines 56-59. Add `compactToolDef` to the tools array alongside `diceToolDef` and `moodToolDef`.

The tool definition needs the CompactionService and adventure context. These are available in `runQuery` because the caller passes `adventurePath` and the adventure service. The session runner factory needs the CompactionService as a new dependency:

```typescript
createSessionRunner(deps: {
  queryFn: QueryFn;
  config: SessionRunnerConfig;
  compactionService?: CompactionService;  // new, optional for backward compat
})
```

In `runQuery`, if `compactionService` is provided, create the compact tool def and include it.

Add `"mcp__corvran__compact_history"` to the `allowedTools` array (line 68). Without this, `permissionMode: 'dontAsk'` silently denies the tool call (REQ-COMP-27).

The adventure context (`character.md`, `world.md`) for the Haiku prompt needs to be readable from the adventure path. The compact tool's `getAdventureContext` callback reads these files via `fileOps`. The session runner needs `fileOps` as a dependency too, or the callback can be passed from the route.

**Decision**: Pass `fileOps` to the session runner factory. This is a deliberate scope expansion for the session runner (it currently has no file I/O capability), but the alternative (pre-reading context in the route and closing over it) means the compact tool uses stale data from turn start, not the moment the tool fires. Since the session runner already receives `adventurePath` per-query, adding `fileOps` to the factory keeps file reads co-located with the tool that needs them.

Concrete changes to `createSessionRunner`:
- Factory signature gains `fileOps?: FileOps` and `compactionService?: CompactionService`.
- `RunQueryParams` gains no new fields (adventure path and context reading are handled internally).
- In `runQuery`, if `compactionService` and `fileOps` are provided, create the compact tool def with a `getAdventureContext` callback that reads `character.md` and `world.md` from `adventurePath` using `fileOps`.
- In `app.ts`, pass `fileOps` and `compactionService` to `createSessionRunner` alongside the existing `queryFn` and `config`.

#### Step 4.3: Add GM System Prompt Guidance

**Files**: `packages/backend/src/services/prompt-service.ts`
**Addresses**: REQ-COMP-13

Add the compact_history tool guidance to the Instructions section of the system prompt. The spec provides near-verbatim text for REQ-COMP-13:

> You have a `compact_history` tool. Use it at natural pause points in the narrative: after a major confrontation resolves, when the party travels to a new location, when a significant conversation or negotiation concludes, or when the player takes a rest. You don't need to use it at every pause. Use your judgment about when the story has accumulated enough that a consolidation would help. When you use it, the current history is archived and replaced with a narrative recap. Your next response should pick up naturally from where the story left off.

This text goes in `assembleSystemPrompt` alongside existing tool guidance (dice rolling, mood setting). The function signature needs a new optional field (e.g., `compactionEnabled?: boolean`) to conditionally include this guidance, since `assembleSystemPrompt` is a pure function that doesn't receive service references. The route passes `true` when the compaction service is available.

#### Step 4.4: Write Compact Tool Tests

**Files**: `packages/backend/tests/services/compact-tool.test.ts` (new)
**Addresses**: REQ-COMP-11, REQ-COMP-12, REQ-COMP-14, REQ-COMP-27

Test cases:

1. **Tool definition shape**: Verify the tool def has the correct name, description, and input schema.
2. **Successful compaction**: Mock compactionService.compactHistory succeeds. Verify tool returns confirmation with archive path.
3. **Short history**: Mock throws HistoryTooShortError. Verify tool returns appropriate message.
4. **Concurrency**: Mock throws CompactionInProgressError. Verify tool returns appropriate message.
5. **MCP integration**: Verify the tool is registered on the corvran server alongside roll_dice and set_mood. Verify `mcp__corvran__compact_history` is in `allowedTools`.

---

## Delegation Guide

Each phase is a Dalton implementation commission followed by a Thorne review commission. The fix-from-review pattern is the same as the MVP and adventure system work.

| Phase | Dalton Commission | Thorne Commission | Dependencies |
|-------|-------------------|-------------------|--------------|
| 1 | Implement CompactionService, prompts, tests, DI wiring | Review Phase 1 implementation | None |
| 2 | Implement threshold trigger in message handler, tests | Review Phase 2 implementation | Phase 1 complete and reviewed |
| 3 | Implement compact endpoint, shared schemas, web button, proxy route, tests | Review Phase 3 implementation | Phase 1 complete and reviewed |
| 4 | Implement compact tool, session runner changes, prompt guidance, tests | Review Phase 4 implementation | Phase 1 complete and reviewed |

Phases 2, 3, and 4 all depend on Phase 1 but are independent of each other. They can be implemented in any order after Phase 1 ships. The spec suggests 2-3-4 for incremental value delivery (threshold removes the wall, button gives player control, tool makes it narratively intelligent). That ordering is recommended but not structurally required.

**Review focus areas per phase:**

- **Phase 1**: Concurrency lock correctness (finally block), archive reversal on failure, prompt quality, sequential numbering edge cases.
- **Phase 2**: Message handler flow ordering (threshold check before player message append), Haiku failure fallback path, concurrent compaction skip path.
- **Phase 3**: Error response codes match spec (400/404/409/500), confirmation dialog text matches spec, button disable states, proxy route forwarding.
- **Phase 4**: Tool registered in allowedTools, adventure context reading, prompt text matches spec verbatim.

## Cleanup Before Remaining Phases

Abandoned Phase 2/3 implementation commissions left merge conflicts in `packages/backend/src/app.ts` and `packages/backend/src/services/compaction-service.ts`. Before implementing Phases 2 and 3, Dalton needs a cleanup commission that:

1. **Resolves all merge conflict markers** in `app.ts` and `compaction-service.ts`. The HEAD side has Phase 1 code (reviewed and approved); the incoming side has unreviewed Phase 2/3 code that should be discarded. Keep HEAD, remove conflict markers and the incoming blocks.

2. **Applies Thorne's Phase 1 review findings**:
   - F1: Add 60-second timeout on Haiku calls (`AbortSignal.timeout(60_000)`)
   - F2: Replace type assertions with proper typing
   - F3: Add rollback comment explaining the `deleteFile` reversal pattern

3. **Applies Thorne's Phase 4 review findings**:
   - F1: `compactionEnabled` flag is defined in prompt-service but never wired from the route
   - F2: No test verifying the prompt includes compaction guidance
   - F3: `allowedTools` array needs verification that `mcp__corvran__compact_history` is included

4. **Fixes model config** to use the updated spec pattern: the compaction service factory receives `model` as a config string (default `"haiku"`) via DI, following `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku"` in `app.ts`. See REQ-COMP-9a and REQ-COMP-25.

5. **Then implements Phases 2 and 3 cleanly** on a conflict-free codebase.

This ordering is critical. Implementing new phases on top of conflict markers guarantees cascading merge problems. Clean first, build second.

## Spec Ambiguities and Pre-Implementation Decisions

### Resolved by this plan

1. **Where does the CompactionService read adventure context?** The service's `compactHistory` method receives an optional `context` parameter with character and world content. For the threshold trigger (Phase 2) and player endpoint (Phase 3), the route reads these files and passes them in. For the GM tool (Phase 4), a callback reads them from the adventure path. This avoids the service needing to know about adventure directory structure.

2. **How does the compact tool get adventure context at runtime?** The tool definition factory receives a `getAdventureContext` callback. The session runner creates this callback from `fileOps` and the per-query `adventurePath`. This keeps the tool definition stateless and testable.

3. **Where do threshold values live?** In `app.ts`, read from environment with defaults. Passed to `createAdventureRoutes` as configuration. The route uses them; the service doesn't need them.

### Resolved by the review cycle

4. **Minimum history for compaction via GM tool.** REQ-COMP-14 says "no minimum history length for the GM tool" but REQ-COMP-36 says "fewer than 500 characters... compaction is skipped." Resolution: the service enforces the 500-char minimum universally. REQ-COMP-14 means there is no separate higher threshold for the GM path (unlike the threshold trigger which has its own 150K ceiling). The GM tool can compact any history above 500 chars. This is a firm decision, not an open question.

### Open questions (don't block starting)

2. **World compaction from player endpoint.** REQ-COMP-15 describes the player compact endpoint as compacting history only. World compaction is only triggered by the threshold (REQ-COMP-9). The player cannot manually compact world.md. This seems intentional (world compaction is rare and the player shouldn't need to think about it), but worth confirming during review.

3. **Compact tool's `getAdventureContext` reading stale data.** If the GM calls compact_history mid-turn, the character/world files reflect state from before the turn started (the GM may have just narrated changes that aren't in the files yet). This is acceptable: the GM's narration is in history.md (which is being compacted), and world.md updates happen outside the turn flow. No action needed, but reviewers should note this behavior.
