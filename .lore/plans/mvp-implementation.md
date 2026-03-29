---
title: MVP Implementation Plan
date: 2026-03-28
status: draft
tags: [plan, mvp, implementation, phased]
spec: .lore/specs/mvp.md
references:
  - .lore/reference/architecture-pattern.md
  - .lore/art/corvran-visual-brief.md
---

# MVP Implementation Plan

Five phases, each producing something testable. Dalton executes each phase as a commission. Thorne reviews before the next phase begins.

## Current State of the Codebase

**What exists:**
- `packages/backend/` — `node_modules/` and `bun.lock` only. No `package.json`, no `src/`, no `tsconfig.json`. Dependencies are installed (Hono 4.6, Agent SDK 0.1.77, pino, zod 3.24.1) but there's no project configuration or source code.
- `packages/shared/` — Same situation. `node_modules/` with zod 3.24.1 installed. No project files.
- `packages/web/` — Does not exist.
- `plugins/corvran/` — Complete. Has `dice-roller` and `gm-craft` skills. Plugin.json present.
- `plugins/d20-system/` — Complete. Five skill sets (combat, magic, monsters, players, rules).
- `plugins/daggerheart-system/` — Complete. Six skill sets (adversaries, combat, domains, frame, players, rules).
- No root `package.json`, no root `tsconfig.json`, no `CLAUDE.md`.

**What this means:** Phase 1 is a true scaffolding phase. The existing `node_modules` directories will be replaced when we set up a proper workspace with a root `package.json`.

## Requirement Coverage Index

Every REQ-MVP-* requirement is listed below with its phase assignment. Use this to verify completeness.

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-MVP-1 | 2 | Adventure discovery by directory listing |
| REQ-MVP-2 | 2 | Optional state files, list regardless |
| REQ-MVP-3 | 3 | History created on first message |
| REQ-MVP-4 | 2 | Directory name is identity |
| REQ-MVP-5 | — | Manual creation (no code needed) |
| REQ-MVP-6 | 2 | Hono on Unix socket via Bun.serve() |
| REQ-MVP-7 | 2, 3 | REST endpoints (adventures in P2, message/history in P3) |
| REQ-MVP-8 | 2 | Route/service split with DI factories |
| REQ-MVP-9 | 2 | Operations registry, /help endpoint |
| REQ-MVP-10 | 3 | Fresh query() per message |
| REQ-MVP-11 | 3 | query() configuration (tools, plugins, permissions) |
| REQ-MVP-12 | 3 | System prompt assembly |
| REQ-MVP-13 | 3 | Context overflow error handling |
| REQ-MVP-14 | 3 | history.md as canonical record |
| REQ-MVP-15 | 3 | History format (Player/GM labels) |
| REQ-MVP-16 | 3 | Append at two points per turn |
| REQ-MVP-17 | 3 | Fresh file read each turn |
| REQ-MVP-18 | 4 | Next.js App Router |
| REQ-MVP-19 | 4 | Two views (list + play) |
| REQ-MVP-20 | — | No auth (constraint, no code) |
| REQ-MVP-21 | 5 | Unix socket proxy route |
| REQ-MVP-22 | — | Freeform character.md (no schema to enforce) |
| REQ-MVP-23 | — | Freeform world.md (no schema to enforce) |
| REQ-MVP-24 | 3 | history.md management |
| REQ-MVP-25 | 3 | Hardcoded plugin paths |
| REQ-MVP-26 | — | Plugins already exist (no work) |
| REQ-MVP-27 | 1 | Monorepo with three packages |

---

## Phase 1: Project Scaffolding

**Goal:** A buildable monorepo with shared types that both backend and web can import. No runtime behavior yet, just the structure that everything else builds on.

**Requirements covered:** REQ-MVP-27

### What gets built

1. **Root workspace configuration**
   - `package.json` with bun workspaces: `["packages/*"]`
   - Root `tsconfig.json` with project references to all three packages
   - Root `.gitignore` (node_modules, .next, dist, *.tsbuildinfo, .env*)
   - `CLAUDE.md` with project-specific instructions (testing with bun test, no mock.module, DI pattern, Agent SDK only constraint)

2. **`packages/shared/`**
   - `package.json` (name: `@corvran/shared`, exports Zod schemas)
   - `tsconfig.json` (strict, composite for project references)
   - `src/index.ts` — barrel export
   - `src/schemas/adventures.ts` — Zod schemas for all API contracts:
     - `AdventureListItem` (id, name, hasCharacter, hasWorld, hasHistory)
     - `AdventureListResponse` ({ adventures: AdventureListItem[] })
     - `AdventureDetail` (id, name, character, world, hasHistory)
     - `MessageRequest` ({ message: string })
     - `HistoryResponse` ({ history, exists })
     - `HealthResponse` ({ status, version })
     - SSE event types: `TextEvent`, `ToolUseEvent`, `DoneEvent`, `ErrorEvent`
   - `src/types.ts` — TypeScript types inferred from schemas (z.infer)

3. **`packages/backend/`**
   - `package.json` (name: `@corvran/backend`, dependency on `@corvran/shared: "workspace:*"`)
   - `tsconfig.json` (strict, composite, references `../shared`)
   - `src/index.ts` — empty entry point placeholder
   - `eslint.config.js`

4. **`packages/web/`**
   - Created via `bunx create-next-app@latest` with App Router, TypeScript, no Tailwind (we're using custom CSS per the visual brief), no src/ directory (Next.js convention uses app/)
   - Add dependency on `@corvran/shared: "workspace:*"`
   - `tsconfig.json` adjusted for workspace references

5. **Clean install** — Remove existing `node_modules` and `bun.lock` from `packages/backend/` and `packages/shared/`. Run `bun install` from root to wire up workspace dependencies.

### Tests

- `bun run --filter '@corvran/shared' test` — Schema validation tests: valid payloads parse, invalid payloads reject. Cover each schema with at least happy path + one invalid case.
- `tsc --build` from root compiles all three packages without errors.
- Shared types are importable from both backend and web (verified by the build).

### Developer notes

- The existing `bun.lock` files in `packages/backend/` and `packages/shared/` are pre-workspace artifacts. Delete them. The root `bun install` will generate a single root `bun.lock`.
- The backend already has dependencies in its old lockfile (Hono, Agent SDK, pino, eslint, etc.). These need to be declared in the new `package.json`. Copy the dependency list from the old `bun.lock` workspace config.
- Zod version: both packages use 3.24.1. The Agent SDK peers on `^3.25.0 || ^4.0.0`. Bump to zod 3.25.x across the workspace to satisfy the peer dependency.
- Next.js creation: use `--app --ts --eslint --no-tailwind --no-src-dir --import-alias "@/*"`. The visual brief uses custom CSS, not Tailwind.
- Some backend dependencies from the old lockfile (`replicate`, `gray-matter`, `@modelcontextprotocol/sdk`) are leftover from a prior project. Don't carry them forward unless needed. The Agent SDK depends on `@modelcontextprotocol/sdk` transitively; it doesn't need to be a direct dependency.

### Review gate

Thorne verifies: workspace builds clean, schemas match spec API contracts, shared types are importable from both consumers.

---

## Phase 2: Daemon Core

**Goal:** A running Hono server on a Unix socket that discovers adventures and serves their state. No AI yet, but the full route/service/DI structure is in place and the operations registry works.

**Requirements covered:** REQ-MVP-1, REQ-MVP-2, REQ-MVP-4, REQ-MVP-6, REQ-MVP-7 (GET endpoints only), REQ-MVP-8, REQ-MVP-9

### What gets built

1. **Server entry point** (`src/index.ts`)
   - `Bun.serve()` on a Unix socket (path from `DAEMON_SOCKET` env var, default `./corvran.sock`)
   - Hono app with all routes mounted
   - Config resolution: `ADVENTURES_PATH` env var for the adventures root directory
   - Plugin paths resolved as absolute from repo root at startup (stored in config for Phase 3)
   - `idleTimeout: 0` on the server config (required for SSE connections in Phase 3)

2. **Adventure service** (`src/services/adventure-service.ts`)
   - `listAdventures()` — reads the adventures directory, returns array of `AdventureListItem`
   - `getAdventure(id)` — reads character.md, world.md, checks history.md existence
   - `getHistory(id)` — reads history.md content
   - `adventureExists(id)` — path validation (prevents directory traversal: reject IDs with `/`, `..`, or that resolve outside the adventures root)
   - All file I/O through an injected `FileOps` interface (`readDir`, `readFile`, `fileExists`, `resolvePath`). Production implementation uses `node:fs/promises`. Tests use in-memory implementations.

3. **Adventure routes** (`src/routes/adventure-routes.ts`)
   - `createAdventureRoutes(deps: { adventureService }) -> RouteModule`
   - `GET /adventures` — calls service, returns `AdventureListResponse`
   - `GET /adventures/:id` — calls service, returns `AdventureDetail` or 404
   - `GET /adventures/:id/history` — calls service, returns `HistoryResponse`
   - Input validation on `:id` parameter (reject traversal attempts)

4. **Health route** (`src/routes/health-routes.ts`)
   - `createHealthRoutes() -> RouteModule`
   - `GET /health` — returns `{ status: "ok", version: "0.1.0" }`

5. **Operations registry** (`src/registry.ts`)
   - Collects `OperationDefinition[]` from all route modules
   - Builds navigation tree
   - `GET /help` endpoint returns the tree

6. **App assembly** (`src/app.ts`)
   - Wires real dependencies, creates Hono app, mounts routes
   - Exported separately from server start so tests can import the app without starting a server

### Tests

- **Adventure discovery** (spec: "Adventure discovery test"): create temp directories with various file combinations. Verify `GET /adventures` returns correct `hasCharacter`, `hasWorld`, `hasHistory` for each.
- **Adventure detail**: verify `GET /adventures/:id` returns file contents, nulls for missing files, 404 for nonexistent adventures.
- **History endpoint**: verify returns content when file exists, `{ exists: false, history: null }` when it doesn't.
- **Path traversal**: verify IDs like `../etc/passwd` and `foo/../../bar` return 400.
- **Health**: verify `GET /health` returns expected payload.
- **Operations registry**: verify `GET /help` returns operation tree with all registered endpoints.
- All tests use Hono's `app.request()` test client with injected mock `FileOps`.

### Developer notes

- The route/service split and DI factory pattern come from `.lore/reference/architecture-pattern.md`. Reference it for the exact `RouteModule` type shape.
- `Bun.serve()` with Unix socket: `Bun.serve({ fetch: app.fetch, unix: socketPath, idleTimeout: 0 })`. The `unix` option replaces `hostname`/`port`.
- The `FileOps` interface is the testing seam. Production uses `node:fs/promises`, tests use a simple in-memory map. Don't use `mock.module()`.
- The message endpoint (`POST /adventures/:id/message`) is deferred to Phase 3. Register it in the operations registry now with a 501 stub so the registry is complete.

### Review gate

Thorne verifies: server starts on Unix socket, all GET endpoints return correct data with various file states, DI pattern is clean, no direct fs calls in route handlers.

---

## Phase 3: AI Integration

**Goal:** The daemon can receive a player message, call the Agent SDK, stream the response as SSE, and maintain conversation history. This is the core game loop.

**Requirements covered:** REQ-MVP-3, REQ-MVP-7 (`POST /message`), REQ-MVP-10, REQ-MVP-11, REQ-MVP-12, REQ-MVP-13, REQ-MVP-14, REQ-MVP-15, REQ-MVP-16, REQ-MVP-17, REQ-MVP-24, REQ-MVP-25

### What gets built

1. **Prompt assembly service** (`src/services/prompt-service.ts`)
   - `assembleSystemPrompt(adventureState: { character, world, history })` — builds the system prompt per REQ-MVP-12:
     1. Identity section
     2. Principles section (player agency)
     3. Adventure state (character + world content, with absence notes)
     4. Onboarding section (conditional, only when character or world is missing)
     5. Conversation history (full history.md content, if exists)
     6. Instructions section
   - Pure function, no I/O. Takes pre-read file contents.

2. **Session runner** (`src/services/session-runner.ts`)
   - The "one entry point for SDK calls" from the architecture pattern.
   - `runQuery(params: { systemPrompt, playerMessage, adventurePath, abortController })` — returns an async generator of `SDKMessage`
   - Internally calls `queryFn({ prompt: playerMessage, options: { ... } })` per the SDK's actual signature
   - All configuration goes into `options`:
     - `systemPrompt`: from prompt service
     - `cwd`: adventure directory path
     - `plugins`: three hardcoded plugin paths (absolute, resolved at startup)
     - `tools`: `['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob']`
     - `allowedTools`: same list
     - `permissionMode`: `'dontAsk'`
     - `persistSession`: `false`
     - `model`: from config, default `'claude-sonnet-4-5-20250929'`
     - `includePartialMessages`: `true` (needed for streaming text to client)
     - `abortController`: passed through from the caller
   - Accepts an injected `queryFn` matching the SDK signature: `(params: { prompt: string; options?: Options }) => Query`. Tests inject a mock that returns an async generator implementing the `Query` interface (at minimum: the async iterator protocol and `interrupt()`).

3. **History service** (`src/services/history-service.ts`)
   - `appendPlayerMessage(adventurePath, message)` — appends `**Player:** {message}\n\n` to history.md (creates file if needed, per REQ-MVP-3)
   - `appendGMResponse(adventurePath, response)` — appends `**GM:** {response}\n\n`
   - `readHistory(adventurePath)` — reads history.md content (returns null if absent)
   - Uses injected `FileOps` from Phase 2.

4. **Message route** (`src/routes/adventure-routes.ts` — extend Phase 2)
   - `POST /adventures/:id/message` — the SSE streaming endpoint:
     1. Validate request body (`{ message: string }`, reject empty/missing)
     2. Read adventure state (character.md, world.md, history.md)
     3. Append player message to history.md (REQ-MVP-16, step 1)
     4. Assemble system prompt
     5. Call session runner, get async generator
     6. Stream SSE events to client:
        - `SDKPartialAssistantMessage` with text content → emit `text` SSE event
        - Tool use results → emit `tool_use` SSE event with human-readable result
        - On completion → append GM response to history.md (REQ-MVP-16, step 2), emit `done` event
        - On error → emit `error` event
     7. If client disconnects: signal the `AbortController` first (this terminates the SDK subprocess), then append whatever partial response accumulated to history.md
   - SSE response format: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
   - Each SSE event: `event: {type}\ndata: {json}\n\n`

5. **SDK message processing** — The event loop over `query()` output, discriminated by `SDKMessage.type`:

   ```
   for await (const msg of queryResult) {
     if (msg.type === 'stream_event') → text deltas for SSE
     if (msg.type === 'assistant')    → tool_use content blocks for SSE tool events
     if (msg.type === 'user')         → tool_use_result for enriching tool events
     if (msg.type === 'result')       → terminal message, triggers done/error SSE
   }
   ```

   Key type discriminants (from `coreTypes.d.ts`):
   - `type: 'stream_event'` (`SDKPartialAssistantMessage`): contains `event: RawMessageStreamEvent`. Extract text from `content_block_delta` events where `delta.type === 'text_delta'`.
   - `type: 'assistant'` (`SDKAssistantMessage`): complete message with content blocks. Tool use blocks have `type: 'tool_use'` with `name` and `input`.
   - `type: 'user'` (`SDKUserMessage`): when `tool_use_result` is present, contains the human-readable tool result.
   - `type: 'result'` (`SDKResultMessage`): terminal. On `subtype: 'success'`, the `result` field contains the full response text (use this for the `done` SSE event's `fullResponse`). On error subtypes, `errors: string[]` contains the error details.

6. **Context overflow handling** (REQ-MVP-13)
   - The SDK does not have a specific `'error_context_overflow'` result subtype. Context overflow will surface as an `SDKResultMessage` with `subtype: 'error_during_execution'` and an entry in `errors[]` describing the token limit issue.
   - The detection approach: when the result is an error subtype, scan `errors[]` for strings containing "context", "token", or "too long". If matched, return the spec's error message: `{ "error": "Adventure history is too long. Edit history.md to shorten it." }`. For any other error, return the raw error string.
   - This detection heuristic may need refinement after the first live test. If the SDK throws an `AbortError` or other exception instead of yielding a result message, the `try/catch` around the generator loop must also handle that case.
   - No pre-flight token estimation.

### Tests

- **Prompt assembly** (spec: "Prompt assembly test"): verify assembled prompt contains character, world, history in correct order with correct labels. Verify missing files produce absence notes and onboarding section. Verify all-present case omits onboarding.
- **SSE stream** (spec: "SSE stream integration test"): mock `queryFn` that yields a sequence of text events. Verify the SSE response delivers them incrementally with correct `event:` types and `data:` payloads.
- **History append** (spec: "History append test"): send two messages via mock, verify history.md contains both exchanges in `**Player:**`/`**GM:**` format with correct ordering and blank line separators.
- **Fresh file read** (REQ-MVP-17): modify history.md between two requests, verify the second request's prompt reflects the edit.
- **Context overflow** (spec: "Context overflow test"): mock `queryFn` that yields an `SDKResultMessage` with `subtype: 'error_during_execution'` and an `errors` entry containing a token limit message. Verify the endpoint returns the spec's error message. Also test with a `queryFn` that throws an `AbortError` to cover the exception path.
- **Stop behavior**: mock a query, send abort signal mid-stream, verify partial response is appended to history.
- **Empty/missing message**: verify POST returns 400 for empty body and missing `message` field.

### Developer notes

- **SDK call signature:** `query({ prompt: string, options?: Options }): Query`. The `prompt` is the player's message. Everything else (systemPrompt, cwd, plugins, tools, model, abortController, etc.) goes in `options`. Do not confuse `prompt` (the player input) with `systemPrompt` (the GM identity/context, inside options).
- **SDK streaming model:** `query()` returns a `Query` which extends `AsyncGenerator<SDKMessage, void>`. With `includePartialMessages: true`, it yields `SDKPartialAssistantMessage` events (discriminant: `type === 'stream_event'`) containing `event: RawMessageStreamEvent`. These are the Anthropic API's raw stream events. The text deltas are in `content_block_delta` events where `delta.type === 'text_delta'`.
- **Tool results in the SDK flow:** When the AI uses a tool, the SDK executes it internally and the result flows back to the AI. The caller sees `SDKAssistantMessage` (`type === 'assistant'`, with tool_use content blocks) followed by `SDKUserMessage` (`type === 'user'`, with `tool_use_result`). For the SSE stream, extract the tool name and result from these and emit a `tool_use` SSE event.
- **Terminal message:** `SDKResultMessage` (`type === 'result'`) is the last message from the generator. On `subtype: 'success'`, the `result` field contains the full response text. Use this for the `done` SSE event's `fullResponse` rather than accumulating text deltas (more reliable, accounts for tool result weaving).
- **Abort:** Use an `AbortController` passed to `options.abortController`. When the client closes the SSE connection, signal the abort controller. This terminates the SDK subprocess. The `query.interrupt()` method is a Control Request for streaming-input mode, which we don't use (we pass a plain string prompt). Stick with `AbortController` as the cancellation mechanism.
- **Plugin paths:** `plugins/corvran`, `plugins/d20-system`, `plugins/daggerheart-system`. Resolve to absolute paths from `process.cwd()` at startup (the repo root). These are passed as `plugins: [{ type: 'local', path: absolutePath }]`.
- **The queryFn injection pattern:** The session runner takes `queryFn: (params: { prompt: string; options?: Options }) => Query` as a dependency. Production passes the real `query` from `@anthropic-ai/claude-agent-sdk`. Tests pass a mock that returns an object satisfying the `Query` interface: an async generator yielding controlled `SDKMessage` events with a no-op `interrupt()`. This follows the architecture pattern's testing seam approach.

### Review gate

Thorne verifies: prompt assembly matches REQ-MVP-12 exactly, SSE streaming works with mock SDK, history management is correct, error handling covers overflow and abort.

---

## Phase 4: Web Client

**Goal:** A playable web client with both views, SSE consumption, and the visual design from Sienna's brief. This phase builds against mock API responses (the daemon proxy comes in Phase 5).

**Requirements covered:** REQ-MVP-18, REQ-MVP-19

### What gets built

1. **Global styles** (`app/globals.css`)
   - CSS custom properties for the full palette from the visual brief:
     - `--bg-base: #13151e`, `--bg-surface: #1c2030`, `--bg-elevated: #242840`
     - `--text-primary: #e8e0d0`, `--text-secondary: #8a8a9a`, `--text-tertiary: #5a5a6a`
     - `--amber: #c8922a`, `--amber-bright: #f0b84a`, `--amber-border: rgba(200,146,42,0.28)`
     - `--gm-accent: #7aadce`, `--tool-accent: #7a9a6a`, `--stop-red: #b84040`
   - Typography: Georgia serif as body font, system sans for chrome, 16px/1.8 line-height for conversation
   - No web font imports (Georgia is system-wide, per Sienna's brief)
   - Streaming cursor: CSS animation for blinking 2px vertical line (`animation: blink 1s step-end infinite`)

2. **Root layout** (`app/layout.tsx`)
   - Dark theme (`<body>` with `--bg-base` background)
   - Metadata: "Adventure Engine of Corvran"

3. **Adventure List view** (`app/page.tsx`)
   - Fetches `GET /api/daemon/adventures` on load
   - Two states per the visual brief:
     - **Adventures exist:** Centered layout (max-width 600px), heading "Choose Your Adventure" (serif 28px), adventure cards with amber hairline borders, status badges ("New adventure" in sage green, "Continue" in muted blue), secondary hints for existing files
     - **No adventures:** Centered, muted raven icon at 25% opacity, plain language explanation, `mkdir` command in styled code block
   - Single-adventure auto-redirect (REQ-MVP-19: if only one adventure, navigate directly)
   - All adventures clickable, link to `/adventure/[id]`

4. **Adventure Play view** (`app/adventure/[id]/page.tsx`)
   - Fetches `GET /api/daemon/adventures/:id` and `GET /api/daemon/adventures/:id/history` on load
   - Four states per the visual brief:
     - **Mid-conversation (idle):** Full-height layout (header 52px + conversation flex:1 + input fixed bottom). Conversation max-width 720px centered. GM messages with blue left border, "Game Master" label. Player messages with amber left border, "You" label, italic body.
     - **Streaming:** Input disabled (50% opacity, "Waiting for the Game Master..." placeholder). Send button replaced by Stop button (dark red, square icon). Streaming cursor at text end. Tool events inline (sage green italic, die icon).
     - **New adventure:** Empty conversation, centered raven icon at 20% opacity, "A new adventure awaits." text, longer input placeholder.
     - **Error:** Inline error banner (dark red background), literal text from spec, `history.md` in monospace, input remains enabled.

5. **SSE client hook** (`lib/use-adventure-stream.ts`)
   - Custom React hook: `useAdventureStream(adventureId)`
   - On message submit: POST to `/api/daemon/adventures/:id/message`, consume SSE response
   - State management: `isStreaming` boolean drives input/stop toggle, placeholder text
   - Text accumulation: build response from `text` events incrementally
   - Tool events: collect `tool_use` events for inline display
   - Done event: finalize message, re-enable input
   - Error event: display error banner
   - Stop: close the EventSource/fetch connection, keep partial text visible

6. **Conversation rendering**
   - Parse existing history into Player/GM message blocks (split on `\n\n`, check `**Player:**`/`**GM:**` prefix)
   - Render GM message bodies through a markdown renderer (the brief notes this matters for headers, lists, emphasis in GM responses)
   - Auto-scroll: `scrollIntoView` on last message during streaming (step scroll, not smooth, per the brief's performance note)

7. **Input component**
   - Textarea with auto-resize up to 120px max-height (JS listener on input events, per brief)
   - Amber border on focus
   - Send button (amber) / Stop button (stop-red) swap based on `isStreaming` state
   - Enter to send (Shift+Enter for newline)

### Tests

- Component tests for both views with mocked fetch responses
- SSE hook test: mock a fetch that returns an SSE stream, verify events are processed correctly
- History parsing: verify correct splitting and label detection for various history content
- Empty state: verify empty adventure list shows mkdir instruction
- Single adventure: verify auto-redirect behavior

### Developer notes

- **No Tailwind.** The visual brief specifies a custom palette and typography stack. CSS custom properties with vanilla CSS modules or plain CSS is the right approach. The visual brief's mockups are in `.lore/art/mockup-adventure-list.html` and `.lore/art/mockup-adventure-play.html`. Reference them for pixel-level guidance.
- **Font loading:** Georgia is available system-wide. No web font import. Zero font flash. This is a deliberate choice from the brief.
- **Scroll behavior:** `scrollIntoView` on each chunk during streaming. The brief warns smooth scrolling can feel laggy during fast streams. Use step scroll (no `behavior: 'smooth'`).
- **Streaming state:** One boolean (`isStreaming`) drives: input disabled/enabled, Send/Stop swap, placeholder text change. Keep it simple.
- **Stop button position:** Same position as Send button (brief says "player's hand never has to hunt"). Visually distinct (red vs amber).
- **Tool events inline:** Show within GM message flow, not in a separate panel. Sage green italic with `⚄` die icon. The die icon is generic for all tool use in MVP.
- **Markdown rendering:** Install a lightweight markdown renderer (e.g., `react-markdown` or similar). GM responses may include headers, lists, bold, italic. The mockups show plain text but the brief explicitly calls this out as needed.
- **Mock API for development:** This phase builds against `/api/daemon/*` routes that don't exist until Phase 5. Create a temporary mock at `app/api/daemon/[...path]/route.ts` that returns hardcoded JSON for GET endpoints and a simulated SSE stream for POST message. This mock is replaced by the real proxy in Phase 5. Without it, the client can't be developed or tested. The mock should cover: list adventures (2-3 entries), adventure detail, history, and a streaming response with text + tool_use + done events.

### Review gate

Thorne verifies: visual design matches the brief's palette/typography/layout, both views render all states correctly, SSE consumption works, no regressions in shared types.

---

## Phase 5: Integration

**Goal:** Wire the web client to the daemon through the Unix socket proxy. Verify the end-to-end flow: pick an adventure, send a message, see a streaming response, see history persist.

**Requirements covered:** REQ-MVP-21

### What gets built

1. **Unix socket proxy** (`packages/web/app/api/daemon/[...path]/route.ts`)
   - Next.js catch-all API route
   - Reads `DAEMON_SOCKET_PATH` from environment
   - Forwards all requests to the daemon's Unix socket:
     - Preserves method, headers, body
     - For non-streaming responses: forward the JSON response
     - For SSE streams: forward the response as a `ReadableStream` with correct headers (`Content-Type: text/event-stream`, etc.)
   - HTTP over Unix socket in Bun: use `fetch()` with the `unix` option: `fetch(url, { unix: socketPath, ...opts })`
   - Error handling: if daemon is unreachable, return 502 with a clear message

2. **Development scripts** (root `package.json`)
   - `dev:daemon` — starts the backend (`bun run packages/backend/src/index.ts`)
   - `dev:web` — starts Next.js dev server (`bun run --filter '@corvran/web' dev`)
   - `dev` — starts both (could use `bun run --filter '*' dev` or a simple parallel script)
   - Environment defaults: `DAEMON_SOCKET=./corvran.sock`, `DAEMON_SOCKET_PATH=./corvran.sock`, `ADVENTURES_PATH=./adventures/`

3. **Sample adventure** (`adventures/lost-mines/`)
   - A sample adventure directory with `character.md` and `world.md` for D&D 5e
   - Provides immediate playability for testing
   - Not committed to git (add `adventures/` to `.gitignore` with an exception for a sample, or document the setup step)

4. **End-to-end verification**
   - Start daemon, start web client
   - Navigate to adventure list, select adventure
   - Send a message, observe streaming response
   - Verify history.md is written
   - Send a second message, verify history contains both exchanges
   - Test stop button mid-stream
   - Test with empty adventure directory (no character/world)
   - Test context overflow (if feasible with large history)

### Tests

- **Proxy route test:** mock the Unix socket target, verify the proxy forwards requests and streams correctly
- **Integration test script:** a shell script or bun script that starts daemon, sends HTTP requests to the proxy, verifies responses. This validates the full chain without a browser.

### Developer notes

- **Unix socket fetch in Bun:** `fetch('http://localhost/adventures', { unix: '/path/to/corvran.sock' })`. The URL host doesn't matter when using Unix sockets; only the path portion is used. Bun's fetch supports the `unix` option natively.
- **SSE proxy challenge:** The proxy must not buffer the SSE stream. When forwarding, create a `ReadableStream` and pipe chunks as they arrive. In Next.js App Router, return `new Response(readableStream, { headers: { 'Content-Type': 'text/event-stream', ... } })`.
- **Two processes required:** The daemon and the Next.js dev server run separately. Document this in the README or CLAUDE.md. Success criterion 10 from the spec: "daemon starts with a single command, web client starts with another."
- **Socket path coordination:** Both processes need to agree on the socket path. Use the same env var name convention. Default to `./corvran.sock` in the repo root.

### Review gate

Thorne verifies: end-to-end flow works (message in, stream out, history persisted), proxy handles both JSON and SSE responses, development setup is documented and reproducible.

---

## Phase Dependency Graph

```
Phase 1 (Scaffolding)
  └─ Phase 2 (Daemon Core)
       └─ Phase 3 (AI Integration)
            └─ Phase 5 (Integration)
  └─ Phase 4 (Web Client)
       └─ Phase 5 (Integration)
```

Phases 2 and 4 can overlap after Phase 1, but Phase 3 depends on Phase 2 (it extends the daemon), and Phase 5 depends on both 3 and 4.

---

## Validation Mapping

The spec's AI Validation section defines specific test expectations. Here's where each lands:

| Spec validation | Phase | Test |
|-----------------|-------|------|
| Unit tests with mocked dependencies | All | Every phase uses DI + mocked deps |
| Integration tests with `app.request()` | 2, 3 | Hono test client for all endpoints |
| Code review by fresh-context sub-agent | All | Thorne reviews at each gate |
| SSE stream integration test | 3 | Mock SDK yielding text events |
| History append test | 3 | Two messages, verify format |
| Adventure discovery test | 2 | Temp directories with file combos |
| Prompt assembly test | 3 | All file states verified |
| Context overflow test | 3 | Mock SDK error, verify response |
