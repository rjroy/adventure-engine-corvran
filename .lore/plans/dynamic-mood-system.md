---
title: "Implementation plan: dynamic-mood-system"
date: 2026-03-30
status: executed
tags: [plan, mood, mcp, sse, image-generation, color, replicate, frontend, atmosphere]
modules: [backend, web, shared]
related: [.lore/specs/dynamic-mood-system.md, .lore/brainstorm/dynamic-mood-system.md, .lore/research/dynamic-color-palettes.md, .lore/reference/architecture-pattern.md]
---

# Plan: Dynamic Mood System

Seven phases. Phases 1–5 build and wire the backend end-to-end. A Thorne review follows Phase 5. Phase 6 delivers the frontend. A second Thorne review closes it. Phase 7 patches the bootstrap prompt.

Each phase is independently testable and leaves the build green. Phases 1–3 carry zero risk to existing tests; they add new code without touching existing files. Phases 4–5 modify existing files with test coverage verified at each step.

---

## Spec Reference

**Spec**: `.lore/specs/dynamic-mood-system.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-MOOD-01 | 1 | MoodStateSchema in shared |
| REQ-MOOD-02 | 1 | MoodEventSchema in shared |
| REQ-MOOD-03 | 1 | AdventureDetailSchema gains currentMood |
| REQ-MOOD-04 | 3 | AdventureConfig gains artStyle and mood |
| REQ-MOOD-05 | 3 | adventure.md frontmatter fields |
| REQ-MOOD-06 | 4 | set_mood tool registration |
| REQ-MOOD-07 | 4 | Tool input schema |
| REQ-MOOD-08 | 4 | Tool output string |
| REQ-MOOD-09 | 5 | Session runner registration |
| REQ-MOOD-10 | 4 | Tool handler execution order |
| REQ-MOOD-11 | 2 | Replicate API call |
| REQ-MOOD-12 | 2 | Prompt construction |
| REQ-MOOD-13 | 2 | Image storage |
| REQ-MOOD-14 | 2 | Image generation failure handling |
| REQ-MOOD-15 | 2 | Dominant hue extraction |
| REQ-MOOD-16 | 2 | OKLCH conversion via culori |
| REQ-MOOD-17 | 4 | Fallback keyword→hue map |
| REQ-MOOD-18 | 5 | mood event type, no tool_use for set_mood |
| REQ-MOOD-19 | 5 | SSE event payload |
| REQ-MOOD-20 | 5 | adventure-routes.ts conditional emission |
| REQ-MOOD-21 | 3 | Frontmatter write via setMood |
| REQ-MOOD-22 | 3 | parseAdventureConfig extension |
| REQ-MOOD-23 | 5 | Adventure detail response includes currentMood |
| REQ-MOOD-25 | 5 | GET /adventures/:id/mood-image endpoint |
| REQ-MOOD-26 | 6 | applyMood utility |
| REQ-MOOD-27 | 6 | CSS variable updates |
| REQ-MOOD-28 | 6 | @property declarations |
| REQ-MOOD-29 | 6 | CSS transitions |
| REQ-MOOD-30 | 6 | Background image layer |
| REQ-MOOD-31 | 6 | SSE hook integration |
| REQ-MOOD-32 | 6 | Page mount application |
| REQ-MOOD-33 | 7 | GM-craft skill instructions |
| REQ-MOOD-36 | 4 | mood-tool.ts unit tests |
| REQ-MOOD-37 | 2 | image-gen.ts unit tests |
| REQ-MOOD-38 | 2 | color-extract.ts unit tests |
| REQ-MOOD-39 | 3 | parseAdventureConfig tests extended |
| REQ-MOOD-40 | 6 | apply-mood.ts unit tests |
| REQ-MOOD-41 | 4 | Keyword fallback tests |

---

## Architectural Decisions

These decisions are recorded here because they resolve ambiguities or impose constraints that are not obvious from the spec alone.

### 1. Tool composition: two tools, one MCP server

The spec requires both `roll_dice` and `set_mood` to live in the `corvran` MCP server. `createDiceTool()` currently returns a full `McpSdkServerConfigWithInstance` built around a single-tool server. Passing two separate `McpSdkServerConfigWithInstance` objects with the same name to `mcpServers` would produce a conflict.

**Decision:** Refactor `dice-tool.ts` to export an additional `createDiceToolDef()` function that returns just the raw `tool()` result (the SDK tool definition object). Keep the existing `createDiceTool()` export unchanged for backward compatibility with tests. Similarly, `mood-tool.ts` exports `createMoodToolDef(deps)` returning the SDK tool definition. The session runner assembles the combined server:

```typescript
createSdkMcpServer({
  name: "corvran",
  tools: [createDiceToolDef(diceDeps), createMoodToolDef(moodDeps)],
})
```

This is done per-invocation inside `runQuery` because the mood tool requires per-session context.

### 2. Stream reference: move runQuery inside streamSSE

The mood tool must call `stream.writeSSE` to emit the `mood` SSE event. Currently in `adventure-routes.ts`, `runQuery` is called at line 195, before `streamSSE` creates the stream reference at line 204. The fix is to move both `abortController` creation and `runQuery` inside the `streamSSE` callback:

```typescript
return streamSSE(c, async (stream) => {
  const abortController = new AbortController();
  stream.onAbort(() => abortController.abort());
  const queryResult = sessionRunner.runQuery({
    ...params,
    emitMoodEvent: (payload) =>
      stream.writeSSE({ event: "mood", data: JSON.stringify(payload) }),
  });
  for await (const msg of queryResult) { ... }
});
```

This requires adding `emitMoodEvent` to `RunQueryParams`.

### 3. Session runner dependencies

`createMoodTool` needs `adventureService.setMood` to persist mood state. Rather than passing `adventureService` into the session runner factory (which would create a coupling that wasn't there before), the plan keeps the session runner's existing dependency surface and extends `RunQueryParams` with the dependencies the mood tool needs per-invocation:

- `adventureId: string` (already computable from `adventurePath`, but adding it explicitly is cleaner)
- `artStyle: string | null` (read from the adventure config in the route, as it already reads config for system resolution)
- `setMood: (mood: MoodState) => Promise<void>` (bound to the adventure service in the route)
- `emitMoodEvent: (payload: MoodEventPayload) => Promise<void>` (bound to `stream.writeSSE` in the route)

The session runner factory keeps its current signature. The route is responsible for resolving adventure-scoped context before calling `runQuery`.

### 4. artStyle read timing

The spec says to read `art_style` at call time (step 1 of REQ-MOOD-10). In the route handler, `adventure.md` is already parsed for `systemAlias` (lines 147–158 of `adventure-routes.ts`). The `artStyle` read is piggybacked onto that same parse — both happen before `runQuery`. If `art_style` changes during a session, the change takes effect on the next message (the session reruns fresh each turn per REQ-MVP-17). This is acceptable per spec assumption 6.

### 5. Frontend: useLayoutEffect for mount application

REQ-MOOD-32 requires applying mood "synchronously during the render cycle after data is available, not in a `useEffect` that fires after paint." The mechanism for this in React is `useLayoutEffect`, which fires synchronously after DOM mutations but before the browser paints. Use `useLayoutEffect` (not `useEffect`) for the page mount mood application. On the server side, `useLayoutEffect` is a no-op, which is correct — the DOM update must happen on the client.

### 6. Backend fetch for Replicate

The backend daemon runs under Bun, not Node.js. Bun's native `fetch` supports standard HTTP requests. The 502 proxy issue in project memory applies to Next.js API routes (Node.js) calling the daemon socket via Unix socket — it does not affect the daemon making outbound HTTP calls to Replicate. Use `fetch` directly in `image-gen.ts`.

---

## Phase 1: Shared Types

**Packages:** `@corvran/shared`
**New files:** none
**Modified files:** `packages/shared/src/schemas/adventures.ts`

### Steps

1. Add `MoodStateSchema` (REQ-MOOD-01) above `AdventureDetailSchema`. Export both the schema and its inferred type `MoodState`.

2. Add `MoodEventSchema` (REQ-MOOD-02) after `MoodStateSchema`. Export it.

3. Extend `AdventureDetailSchema` with `currentMood: MoodStateSchema.nullable()` (REQ-MOOD-03). The inferred `AdventureDetail` type updates automatically.

### Tests

No new test file required. The schema changes are covered by TypeScript compilation. Optionally add a small schema validation test to `packages/shared/` confirming that valid/invalid `MoodState` objects parse correctly — but this is low-value given Zod's own test coverage. Defer unless there's a specific edge case to pin.

### Verification

- `tsc --build` from root passes with no errors
- `AdventureDetail` type now includes `currentMood: MoodState | null`

---

## Phase 2: Backend Utility Services

**Packages:** `@corvran/backend`
**New files:**
- `packages/backend/src/services/image-gen.ts`
- `packages/backend/src/services/color-extract.ts`
- `packages/backend/tests/services/image-gen.test.ts`
- `packages/backend/tests/services/color-extract.test.ts`

**Modified files:** `packages/backend/package.json` (add `culori`)

**Dependency:** `bun add culori` in `packages/backend/`

### image-gen.ts

Export `generateMoodImage(prompt: string, fetchFn?: typeof fetch): Promise<string | null>`.

The implementation:
- POSTs to `https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions` with the `Prefer: wait` header
- Reads `REPLICATE_API_TOKEN` from `process.env`. Returns `null` immediately if absent (REQ-MOOD-14's "disabled for all calls" case — the caller handles the fallback).
- Uses a 30-second `AbortSignal` timeout (REQ-MOOD-14)
- On HTTP 200 with `status: "succeeded"` and a non-empty `output` array, returns `output[0]` (the image URL)
- On any other outcome (non-200 status, `status: "failed"`, network error, timeout), logs at WARN level and returns `null`
- The `fetchFn` parameter (defaulting to `globalThis.fetch`) is the injection point for tests

The file imports nothing from application code. It is a pure HTTP utility with no business logic.

### color-extract.ts

Export `extractDominantHue(imagePath: string): Promise<number>`.

The implementation:
- Reads the PNG file from `imagePath`
- Decodes the PNG — use Bun's built-in `Buffer` or a lightweight PNG decoder. Check if Bun exposes a canvas API; if not, use `@homeservenow/pngjs` or a similar minimal decoder (add to `package.json` dependencies). **Dalton: verify which PNG decoder is available in Bun's runtime before choosing. A pure-JS decoder like `pngjs` is the safe choice; avoid native bindings.**
- Samples every Nth pixel (N tuned so processing stays under 100ms for typical 1024×1024 output). A stride of 8 (sample every 8th pixel in both x and y) yields ~16,000 samples from a 1024×1024 image — more than sufficient for hue histogram accuracy.
- Converts each sampled RGB pixel to OKLCH using `culori/fn`: `import { useMode, modeOklch, converter } from "culori/fn"`
- Builds a 36-bucket hue histogram (10° buckets, indices 0–35). Achromatic pixels (OKLCH chroma < 0.02) are skipped.
- Returns the center hue of the most-populated bucket as a number in `[0, 360)`.
- If no chromatic pixels are found (entirely achromatic image), returns `270` (the default neutral hue).

The function is pure — its only I/O is reading the file at `imagePath`. Tests can pass synthetic PNG buffers.

### Tests: image-gen.test.ts (REQ-MOOD-37)

Cover (all via injected `fetchFn` mock):
- Returns image URL string when response is `status: "succeeded"` with `output` array
- Returns `null` on non-200 HTTP status
- Returns `null` when response body has `status: "failed"`
- Returns `null` when `fetchFn` throws (simulates network error)
- Returns `null` when `REPLICATE_API_TOKEN` is absent (set `process.env.REPLICATE_API_TOKEN` to `undefined` in test, restore after)
- Request body includes the prompt string

### Tests: color-extract.test.ts (REQ-MOOD-38)

Cover (using small synthetic PNG buffers or fixture files):
- Returns a number in `[0, 360)` for a valid PNG with a clear dominant hue (e.g., a solid red square → hue near 20–30)
- Returns `270` for an entirely achromatic image (all-gray pixels)
- Correctly distinguishes warm vs. cool dominant hues (a green-dominant image returns hue near 140, a blue-dominant image returns hue near 220)

For synthetic PNGs: generate minimal valid PNG buffers in the test using raw byte construction or a tiny fixture file committed to `packages/backend/tests/fixtures/`.

### Verification

- `bun test packages/backend` passes
- `tsc --build` passes (culori has types bundled)

---

## Phase 3: Adventure Config and Persistence

**Packages:** `@corvran/backend`
**New files:** none
**Modified files:**
- `packages/backend/src/services/adventure-config.ts`
- `packages/backend/src/services/adventure-service.ts`
- `packages/backend/tests/services/adventure-config.test.ts`

### adventure-config.ts changes

1. Extend `AdventureConfig` interface (REQ-MOOD-04):

   ```typescript
   export interface AdventureConfig {
     system: string | null;
     name: string | null;
     concept: string | null;
     artStyle: string | null;
     mood: {
       hue: number;
       description: string;
       imagePath: string | null;
     } | null;
     warning?: string;
   }
   ```

2. Extend `parseAdventureConfig` to extract (REQ-MOOD-22):
   - `art_style`: same regex pattern as `system` and `name` (strip optional quotes, trim)
   - `mood_hue`: regex match on the frontmatter, parsed with `parseFloat`. Invalid or absent → treated as absent.
   - `mood_description`: same regex pattern as `name`
   - `mood_image`: same regex pattern, trim. Absent → `null`
   - Return `mood: { hue, description, imagePath }` when both `mood_hue` is a valid number and `mood_description` is non-empty; otherwise `mood: null`.
   - Return `artStyle: string | null` from `art_style` field.

### adventure-service.ts changes

1. Add `setMood(id: string, mood: MoodState): Promise<void>` to the `AdventureService` interface.

2. Implement `setMood` in `createAdventureService` (REQ-MOOD-21):
   - Read `adventure.md` content via `fileOps.readFile`
   - Apply frontmatter mutations (see below)
   - Write the result via `fileOps.writeFile`

   **Frontmatter write logic**: extract the frontmatter block (between the `---` delimiters). For each mood field (`mood_hue`, `mood_description`, `mood_image`):
   - If the field already exists on its own line, replace it with the new value
   - If the field does not exist, insert it before the closing `---`
   - If `mood.imagePath` is absent (fallback case), remove the `mood_image:` line entirely rather than leaving a stale path

   Use the same regex-replace approach as the read side: scan with `content.replace(/^mood_hue:.*$/m, ...)`. Add missing fields by splitting at the closing delimiter and inserting before it. Keep it simple; it does not need to handle every YAML edge case — only the fields it manages.

3. Update `getAdventure` to populate `currentMood` in the returned `AdventureDetail`. After `readAdventureConfig`, map `config.mood` to `currentMood`:
   ```typescript
   currentMood: config?.mood
     ? { hue: config.mood.hue, description: config.mood.description, imagePath: config.mood.imagePath ?? undefined }
     : null,
   ```

4. Add `setMood` to the return value of `createAdventureService`.

### Tests: adventure-config.test.ts extensions (REQ-MOOD-39)

Add to the existing `describe("parseAdventureConfig")` block:
- Parses `art_style` without quotes
- Parses `art_style` with double quotes (strips quotes)
- Returns `artStyle: null` when field is absent
- Parses complete mood state (`mood_hue`, `mood_description`, `mood_image` all present)
- Returns `mood: null` when `mood_hue` is absent
- Returns `mood: null` when `mood_hue` is present but not a valid number
- Returns `mood` with `imagePath: null` when `mood_image` is absent
- `mood_description` with quotes is stripped correctly

Add tests for `setMood` in `adventure-service.test.ts` (or a new `adventure-service-mood.test.ts` if the existing file is too large):
- Writes all three mood fields to previously-frontmatterless `adventure.md`
- Updates existing `mood_hue` and `mood_description` in place
- Removes `mood_image` line when `imagePath` is absent in the new mood state
- Does not disturb other frontmatter fields

### Verification

- `bun test packages/backend` passes (existing + new tests)
- `tsc --build` passes

---

## Phase 4: MCP Mood Tool

**Packages:** `@corvran/backend`
**New files:**
- `packages/backend/src/services/mood-tool.ts`
- `packages/backend/tests/services/mood-tool.test.ts`

**Modified files:**
- `packages/backend/src/services/dice-tool.ts` (minor export addition)

### dice-tool.ts change

Add `createDiceToolDef(deps?: { random?: () => number })` export. This function contains the current `const rollDiceTool = tool(...)` logic and returns the tool object. The existing `createDiceTool` calls it and wraps it in `createSdkMcpServer`. No behavior change; existing tests remain green.

```typescript
export function createDiceToolDef(deps?: { random?: () => number }) {
  const random = deps?.random ?? Math.random;
  return tool("roll_dice", "...", RollDiceInputSchema, async (args) => {
    const result = rollDice(args, random);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
}

export function createDiceTool(deps?: { random?: () => number }): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({ name: "corvran", tools: [createDiceToolDef(deps)] });
}
```

### mood-tool.ts

Export:

```typescript
export interface MoodToolDeps {
  adventureId: string;
  adventurePath: string;
  artStyle: string | null;
  generateImage: (prompt: string) => Promise<string | null>;
  extractHue: (imagePath: string) => Promise<number>;
  saveImage: (url: string, destPath: string) => Promise<void>;
  setMood: (mood: MoodState) => Promise<void>;
  emitMoodEvent: (payload: MoodEventPayload) => Promise<void>;
}

export interface MoodEventPayload {
  hue: number;
  description: string;
  imagePath?: string;
}

export const SetMoodInputSchema = {
  description: z.string().min(1).max(500),
};

export function keywordHue(description: string): number { ... }

export function createMoodToolDef(deps: MoodToolDeps) { ... }
```

**`keywordHue(description: string): number`**: Pure function. Implements REQ-MOOD-17's keyword table. Lowercases the description, checks each keyword group in table order, returns the hue on first match. Returns `270` when no keyword matches.

**`createMoodToolDef`**: Creates and returns the SDK `tool("set_mood", ...)` definition. The handler implements REQ-MOOD-10's execution order:

1. Construct prompt: `deps.artStyle ? \`${deps.artStyle}. ${args.description}\` : args.description`
2. Call `deps.generateImage(prompt)` → `imageUrl: string | null`
3. If `imageUrl`:
   - Download and save to `adventurePath/mood.png` via `deps.saveImage(imageUrl, moodImagePath)`
   - Extract hue via `deps.extractHue(moodImagePath)`
   - Call `deps.setMood({ hue, description: args.description, imagePath: "mood.png" })`
   - Call `deps.emitMoodEvent({ hue, description: args.description, imagePath: "mood.png" })`
   - Return `{ content: [{ type: "text", text: "mood set" }] }`
4. If `imageUrl` is null (generation failed or token absent):
   - Derive `hue = keywordHue(args.description)`
   - Call `deps.setMood({ hue, description: args.description })` (no imagePath)
   - Call `deps.emitMoodEvent({ hue, description: args.description })` (no imagePath)
   - Return `{ content: [{ type: "text", text: "mood set (image generation failed — using fallback hue)" }] }`

**`saveImage` dependency**: accepts a URL and a destination path. Downloads the image and writes it to disk. Inject in production using a helper function in `image-gen.ts` or a small util. Injected in tests with a mock.

### Tests: mood-tool.test.ts (REQ-MOOD-36 + REQ-MOOD-41)

All deps are mocked via injection. No real Replicate calls.

**keywordHue tests** (REQ-MOOD-41):
- Each of the 10 keyword groups maps to its documented hue
- First match wins when multiple keywords appear
- Default hue 270 when no keyword matches
- Matching is case-insensitive ("FOREST" → 142)

**createMoodToolDef handler tests** (REQ-MOOD-36):
- Returns `"mood set"` when `generateImage` returns a URL
- Returns the fallback message when `generateImage` returns `null`
- Prompt is `"artStyle. description"` when `artStyle` is non-null
- Prompt is `description` alone when `artStyle` is null
- `setMood` is called with the hue returned by `extractHue` when generation succeeds
- `setMood` is called with the keyword-derived hue when generation fails
- `emitMoodEvent` is called in both success and failure cases
- `saveImage` is called with the image URL on success; not called on failure

These tests invoke the handler directly by calling the tool's handler function. The testing pattern follows `dice-tool.test.ts`: call `createMoodToolDef(mockDeps)`, extract the handler, call it with test args, check results.

### Verification

- `bun test packages/backend` passes
- `tsc --build` passes

---

## Phase 5: Backend Route Wiring

**Packages:** `@corvran/backend`
**New files:** none
**Modified files:**
- `packages/backend/src/services/session-runner.ts`
- `packages/backend/src/routes/adventure-routes.ts`

### session-runner.ts changes

1. Import `createDiceToolDef`, `createMoodToolDef` instead of `createDiceTool`. Remove `createDiceTool` import.

2. Remove `const diceMcpServer = createDiceTool()` from the factory body (it was constructed once; now it's constructed per-invocation).

3. Extend `RunQueryParams`:
   ```typescript
   export interface RunQueryParams {
     systemPrompt: string;
     playerMessage: string;
     adventureId: string;          // NEW
     adventurePath: string;
     artStyle: string | null;       // NEW
     pluginPaths: string[];
     abortController: AbortController;
     setMood: (mood: MoodState) => Promise<void>;       // NEW
     emitMoodEvent: (payload: MoodEventPayload) => Promise<void>;  // NEW
   }
   ```

4. Import `MoodState`, `MoodEventPayload` from `@corvran/shared` (once Phase 1 adds them) or define minimal local types. `MoodState` is the shared type; `MoodEventPayload` can be a local type matching `MoodEventSchema`.

5. In `runQuery`, create the combined MCP server per-invocation:
   ```typescript
   const diceToolDef = createDiceToolDef();
   const moodToolDef = createMoodToolDef({
     adventureId: params.adventureId,
     adventurePath: params.adventurePath,
     artStyle: params.artStyle,
     generateImage: generateMoodImage,
     extractHue: extractDominantHue,
     saveImage: downloadImage,    // helper function, see below
     setMood: params.setMood,
     emitMoodEvent: params.emitMoodEvent,
   });
   const corvranServer = createSdkMcpServer({
     name: "corvran",
     tools: [diceToolDef, moodToolDef],
   });
   ```

6. Add `"mcp__corvran__set_mood"` to `allowedTools`. Update `mcpServers: { corvran: corvranServer }`.

7. Add `downloadImage(url: string, destPath: string): Promise<void>` as a module-level helper (or import from `image-gen.ts`). This function fetches the URL and writes the response body to `destPath` using `Bun.write`. It does not need to be injectable at this level — image generation tests already inject `generateImage` and `saveImage` at the tool level.

**Note on DI**: the `generateMoodImage` and `extractDominantHue` functions are imported directly in the session runner (not injected into the factory). This is acceptable because:
- Both functions are pure utilities with no shared state
- Testing the mood tool injects them via `createMoodToolDef(deps)` — the session runner's use of the real implementations is integration behavior, not unit behavior
- If future tests require mocking at the session runner level, promote them to factory deps at that time

### adventure-routes.ts changes

**Move runQuery inside streamSSE** (Architectural Decision 2):

```typescript
// Before streamSSE: setup that doesn't require stream
const adventurePath = adventureService.getAdventurePath(id);
const history = await historyService.readHistory(adventurePath);
await historyService.appendPlayerMessage(adventurePath, message);
// ... plugin resolution and systemBootstrap assembly (unchanged) ...
const systemPrompt = assembleSystemPrompt({ ... });

return streamSSE(c, async (stream) => {
  const abortController = new AbortController();
  stream.onAbort(() => abortController.abort());

  const queryResult = sessionRunner.runQuery({
    systemPrompt,
    playerMessage: message,
    adventureId: id,
    adventurePath,
    artStyle,                    // NEW: read from config below
    pluginPaths,
    abortController,
    setMood: (mood) => adventureService.setMood(id, mood),   // NEW
    emitMoodEvent: (payload) =>
      stream.writeSSE({ event: "mood", data: JSON.stringify(payload) }),  // NEW
  });

  for await (const msg of queryResult) { ... }
});
```

**Read artStyle from config**: in the existing config-reading block (lines 147–158), extract `artStyle` alongside `systemAlias`:
```typescript
const config = parseAdventureConfig(content);
systemAlias = config.system;
artStyle = config.artStyle ?? null;    // NEW
```

**Suppress tool_use for set_mood** (REQ-MOOD-20): in the `msg.type === "user"` block:
```typescript
if (toolName === "set_mood") {
  // mood event already emitted by the tool handler; suppress tool_use
} else {
  await stream.writeSSE({
    event: "tool_use",
    data: JSON.stringify({ name: toolName, result }),
  });
}
```

**Update GET /adventures/:id** (REQ-MOOD-23): the `getAdventure` method now returns `currentMood` (from Phase 3). No change needed in the route handler — it already calls `c.json(adventure)` which serializes the full `AdventureDetail`. Verify that `AdventureDetail` now includes `currentMood` from the shared type update in Phase 1.

**Add GET /adventures/:id/mood-image** (REQ-MOOD-25):

```typescript
routes.get("/adventures/:id/mood-image", async (c) => {
  const id = c.req.param("id");
  if (!isValidId(id)) return c.json({ error: "Invalid adventure ID" }, 400);

  const adventurePath = adventureService.getAdventurePath(id);
  const moodImagePath = /* fileOps.resolvePath(adventurePath, "mood.png") */;

  if (!(await fileOps.fileExists(moodImagePath))) {
    return c.json({ error: "No mood image" }, 404);
  }

  const imageBytes = await fileOps.readFileBytes(moodImagePath);
  return new Response(imageBytes, {
    headers: { "Content-Type": "image/png" },
  });
});
```

**FileOps extension**: `fileOps.readFileBytes(path): Promise<Uint8Array>` may not exist yet. Check `packages/backend/src/types.ts` for the `FileOps` interface. If `readFileBytes` is absent, add it. The production implementation uses `Bun.file(path).arrayBuffer()` or `fs.readFile(path)`. Add to the `FileOps` interface and mock implementations.

**Operations registry**: add `adventures.moodImage.get` to the `operations` array in `adventure-routes.ts`.

### Verification

- `bun test packages/backend` passes (all existing + new tests)
- Manual integration smoke test (if environment permits): start daemon, create adventure, send message containing a set_mood call, confirm mood SSE event arrives before the done event

---

## Review Gate: Thorne (after Phase 5)

Commission Thorne to review the backend implementation. The review should check:
- `setMood` frontmatter write logic handles all edge cases (missing fields, existing fields, no `mood_image` on fallback)
- Session runner restructure doesn't regress existing tests (especially `message-route.test.ts`)
- SSE suppression for `set_mood` is correctly scoped (uses `toolName`, not `block.content`)
- Image endpoint returns 404 gracefully when adventure exists but has no mood image
- `REPLICATE_API_TOKEN` absence is handled at `generateMoodImage` level, not at the tool level
- `downloadImage` uses the timeout that's consistent with the 30s Replicate call budget
- No `mock.module()` usage anywhere

Fix all findings before starting Phase 6.

---

## Phase 6: Frontend

**Packages:** `@corvran/web`
**New files:**
- `packages/web/lib/apply-mood.ts`
- `packages/web/tests/lib/apply-mood.test.ts`

**Modified files:**
- `packages/web/app/globals.css`
- `packages/web/app/adventure/[id]/page.tsx`
- `packages/web/lib/use-adventure-stream.ts`

### globals.css changes

**Add @property declarations** (REQ-MOOD-28): before the `:root` block, add registrations for all nine base color variables:
```css
@property --bg-base        { syntax: '<color>'; initial-value: oklch(20% 0.045 270); inherits: true; }
@property --bg-surface     { syntax: '<color>'; initial-value: oklch(25% 0.045 270); inherits: true; }
@property --bg-elevated    { syntax: '<color>'; initial-value: oklch(30% 0.045 270); inherits: true; }
@property --text-primary   { syntax: '<color>'; initial-value: oklch(90% 0.024 85);  inherits: true; }
@property --text-secondary { syntax: '<color>'; initial-value: oklch(65% 0.024 85);  inherits: true; }
@property --text-tertiary  { syntax: '<color>'; initial-value: oklch(45% 0.024 85);  inherits: true; }
@property --accent         { syntax: '<color>'; initial-value: oklch(65% 0.135 78);  inherits: true; }
@property --accent-hover   { syntax: '<color>'; initial-value: oklch(85% 0.135 78);  inherits: true; }
@property --gm-accent      { syntax: '<color>'; initial-value: oklch(70% 0.075 238); inherits: true; }
```

**Add CSS transitions** (REQ-MOOD-29): inside `:root`:
```css
transition:
  --bg-base 2s ease,
  --bg-surface 2s ease,
  --bg-elevated 2s ease,
  --text-primary 1.5s ease,
  --text-secondary 1.5s ease,
  --text-tertiary 1.5s ease,
  --accent 1.5s ease,
  --accent-hover 1.5s ease,
  --gm-accent 1.5s ease;
```

Do not add transitions to any `color-mix()` derived variables.

### apply-mood.ts

```typescript
export function applyMood(hue: number, imageSrc?: string): void
```

Implementation (REQ-MOOD-27):
- Calls `document.documentElement.style.setProperty` for all nine variables using the hue-offset formulas from the spec
- Gets the element `document.getElementById("mood-bg-layer")` and sets its `style.backgroundImage`
  - If `imageSrc` is provided: `\`url("${imageSrc}")\``
  - If absent: empty string (clears any previous image)
- Handles the case where `mood-bg-layer` does not exist (no-op; relevant in test environments without the full DOM)
- No React imports; pure DOM operations

The nine variable derivations (H = input hue):

| Variable | Value |
|---|---|
| `--bg-base` | `oklch(20% 0.045 ${H})` |
| `--bg-surface` | `oklch(25% 0.045 ${H})` |
| `--bg-elevated` | `oklch(30% 0.045 ${H})` |
| `--text-primary` | `oklch(90% 0.024 ${(H + 175) % 360})` |
| `--text-secondary` | `oklch(65% 0.024 ${(H + 175) % 360})` |
| `--text-tertiary` | `oklch(45% 0.024 ${(H + 175) % 360})` |
| `--accent` | `oklch(65% 0.135 ${(H + 168) % 360})` |
| `--accent-hover` | `oklch(85% 0.135 ${(H + 168) % 360})` |
| `--gm-accent` | `oklch(70% 0.075 ${(H + 328) % 360})` |

### adventure/[id]/page.tsx changes

1. **Add background image layer** (REQ-MOOD-30): before the `return` statement's outer `<div>`, add:
   ```tsx
   <div
     id="mood-bg-layer"
     style={{
       position: "fixed",
       inset: 0,
       zIndex: -1,
       pointerEvents: "none",
       backgroundSize: "cover",
       backgroundPosition: "center",
       opacity: 0.1,
     }}
   />
   ```
   Place it as the first child of the page wrapper div so it is behind all content.

2. **Apply mood on mount** (REQ-MOOD-32): after `adventure` state is set, apply the mood using `useLayoutEffect` (not `useEffect`) to prevent a flash of the default palette before paint:
   ```typescript
   useLayoutEffect(() => {
     if (adventure?.currentMood) {
       const imageUrl = adventure.currentMood.imagePath
         ? `/api/daemon/adventures/${id}/mood-image`
         : undefined;
       applyMood(adventure.currentMood.hue, imageUrl);
     }
   }, [adventure, id]);
   ```

### use-adventure-stream.ts changes

Add `mood` event handling (REQ-MOOD-31): in `processLine`, alongside the existing `eventType === "text"` / `"tool_use"` / `"done"` / `"error"` branches:

```typescript
} else if (eventType === "mood") {
  const parsed = MoodEventSchema.safeParse(JSON.parse(data));
  if (parsed.success) {
    const imageUrl = parsed.data.imagePath
      ? `/api/daemon/adventures/${adventureId}/mood-image`
      : undefined;
    applyMood(parsed.data.hue, imageUrl);
  }
}
```

- Import `applyMood` from `@/lib/apply-mood`
- Import `MoodEventSchema` from `@corvran/shared`
- No state update; no re-render; DOM-only side effect

### Tests: apply-mood.test.ts (REQ-MOOD-40)

Use `happy-dom` or jsdom (check what the existing web tests use):
- All nine CSS variables are set with correct OKLCH strings at hue 0
- All nine CSS variables are set with correct OKLCH strings at hue 270 (default)
- Hue offset arithmetic is correct: at H=100, text variables use H+175=275, accent uses H+168=268, gm-accent uses H+328=68
- Modulo wraps correctly: at H=350, accent uses (350+168)%360=158
- Background image layer gets `url("...")` when `imageSrc` is provided
- Background image layer is cleared (`""`) when `imageSrc` is absent
- Function does not throw when `#mood-bg-layer` element is absent

### Verification

- `bun test packages/web` passes
- Visual check: open an adventure page, send a message that triggers a mood change, confirm the palette shifts smoothly over 1.5–2 seconds and the background image appears at low opacity
- Reload the page and confirm the mood is restored from `currentMood` without a flash

---

## Review Gate: Thorne (after Phase 6)

Commission Thorne to review the frontend implementation. The review should check:
- `useLayoutEffect` is used for mount application (not `useEffect`, which would cause a flash)
- `applyMood` handles the missing `mood-bg-layer` gracefully (no throws)
- `MoodEventSchema` parsing uses `safeParse` (not `parse`) to avoid throwing on malformed events
- Hue offset arithmetic uses `% 360` (modulo handles wrap correctly for all inputs)
- The background layer's `z-index: -1` does not clip through any parent stacking context
- The `@property` initial values match the current defaults in `:root`
- The transition declarations are on `:root`, not on `html` or `body`

Fix all findings before starting Phase 7.

---

## Phase 7: Bootstrap Prompt

**Packages:** `plugins/corvran`
**New files:** none
**Modified files:** `plugins/corvran/skills/gm-craft/SKILL.md`

Add the `## Mood and Atmosphere` section from REQ-MOOD-33 to `SKILL.md`. Place it after the `## Scene Pacing` section, before `## Improv Principles` — mood changes are a form of scene transition, and Scene Pacing is the most adjacent concept.

No tests required. This is content, not code.

---

## Implementation Notes for Dalton

### PNG decoder choice

Before implementing `color-extract.ts`, verify which PNG decoding options are available in the Bun runtime. Bun does not expose a browser canvas API by default. Options:
- `pngjs` (pure JS, `bun add pngjs`) — safest choice, no native bindings, maintained
- `sharp` — powerful but has native bindings that may not install cleanly in all environments
- Bun's built-in image APIs (if any — check the Bun 1.x changelog)

Go with `pngjs` unless Bun has grown a native option. Add `@types/pngjs` to devDependencies.

### FileOps readFileBytes

Check `packages/backend/src/types.ts` for the `FileOps` interface before assuming `readFileBytes` exists. If it is absent:
1. Add `readFileBytes(path: string): Promise<Uint8Array>` to the interface
2. Implement it in the production `FileOps` implementation using `Bun.file(path).bytes()`
3. Add a stub to any mock `FileOps` used in tests

### REPLICATE_API_TOKEN in test environments

Tests for `image-gen.ts` that test the "token absent" case must save and restore `process.env.REPLICATE_API_TOKEN` around each test. Use `beforeEach`/`afterEach`. Do not assume the token is absent by default — CI environments may have it set.

### Session runner runQuery restructure

Moving `runQuery` inside `streamSSE` in `adventure-routes.ts` changes when the query starts relative to the HTTP response lifecycle. Verify that the existing `message-route.test.ts` tests pass — they use Hono's `app.request()` test client and should be unaffected, but confirm.

### Two tools in one server: SDK behavior

Before finalizing Phase 5, verify that passing two tool definitions to `createSdkMcpServer` produces a single server accessible to the SDK under `mcp__corvran__roll_dice` and `mcp__corvran__set_mood`. If the SDK does not support this combination, fall back to creating two separate servers with distinct names — but update `allowedTools` accordingly and note the deviation from the spec's "alongside" language.
