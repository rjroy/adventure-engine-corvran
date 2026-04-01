---
title: V1 Spec Gap Analysis
date: 2026-03-31
status: complete
tags: [analysis, gap-analysis, v1-spec, v2-implementation]
v1_spec: .lore/_archive/adventure-engine-v1-spec.md
---

# V1 Spec Gap Analysis

Comparison of the V1 specification (reverse-engineered from the original implementation, dated 2025-12-20) against the current V2 codebase across `packages/shared`, `packages/backend`, and `packages/web`.

**Vision status**: Approved (`.lore/vision.md`, 2026-03-28)
**Context scanned**: All three packages, plugin manifests, `.lore/` artifacts (specs, brainstorms, retros, issues, vision)
**Recent brainstorm check**: 5 brainstorms in `.lore/brainstorm/` reviewed; no overlap with this analysis

---

## 1. Implemented (Carried Forward)

Requirements from the V1 spec that are present in the V2 codebase. Organized by functional domain.

### Adventure Lifecycle (AL)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-AL-1 | Create adventures with unique identifiers | `adventure-service.ts:createAdventure()` | **Evolved.** IDs are slugified names (e.g., `the-healers-burden`), not UUIDs. Deliberate design decision: human-readable directory names for developer maintenance. |
| REQ-AL-2 | Persist adventure state to filesystem | `adventure-service.ts`, adventure directories under `~/.corvran/adventures/` | **Evolved.** Markdown files (adventure.md, character.md, world.md, history.md) instead of JSON state files. Aligns with Vision Principle 1 (Markdown is Memory). No atomic writes (temp+rename); direct file writes via Bun fs. |
| REQ-AL-5 | Update lastActiveAt timestamp | `adventure-service.ts:listAdventures()` reads file modification times | **Evolved.** No explicit lastActiveAt field. Uses filesystem mtime instead. |
| REQ-AL-6 | Initialize with default theme | `adventure-config.ts` returns null mood when no frontmatter mood fields | **Evolved.** No default calm/high-fantasy/village theme. Mood is null until the GM sets it via `set_mood` tool. Frontend defaults to hue 270 (purple). |
| REQ-AL-7 | Create adventures via POST endpoint | `POST /adventures` in `adventure-routes.ts` | **Match.** Body: `{name, system?, concept?}`. Returns created adventure. |
| REQ-AL-10 | List available adventures | `GET /adventures` in `adventure-routes.ts` | **Match.** Returns array with metadata (name, system, concept, character, hasHistory, lastPlayed). |
| REQ-AL-11 | Display adventure metadata | `app/page.tsx` adventure cards | **Evolved.** Shows name, system, concept preview, character name, "New"/"Continue" badge. No background image in list view (V1 had it). |
| REQ-AL-12 | GET /health endpoint | `health-routes.ts` | **Match.** Returns `{status: "ok", version: "0.1.0"}`. |
| REQ-AL-13 | GET /adventures list endpoint | `adventure-routes.ts` | **Match.** |
| REQ-AL-14 | POST /adventures create endpoint | `adventure-routes.ts` | **Match.** |
| REQ-AL-15 | GET /adventures/:id detail endpoint | `adventure-routes.ts` | **Match.** Returns character, world, mood, system, concept. |
| REQ-AL-16 | Sort by lastActiveAt descending | `app/page.tsx` sorts by `lastPlayed` | **Match.** Frontend sorts; backend returns unsorted. |
| REQ-AL-22 | ADVENTURES_DIR configuration | `ADVENTURES_PATH` env var, defaults to `$CORVRAN_HOME/adventures` | **Evolved.** Different env var name; same concept. |

### Narrative Streaming (NS)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-NS-1 | Display narrative history chronologically | `app/adventure/[id]/page.tsx`, `parseHistory()` | **Match.** Player and GM messages rendered in order from history.md. |
| REQ-NS-2 | Render streaming responses incrementally | `useAdventureStream` hook, SSE `text` events | **Match.** Text accumulates token-by-token during streaming. |
| REQ-NS-4 | Render markdown in GM responses | `react-markdown` in GmMessage component | **Evolved.** Uses react-markdown with default sanitization. V1 spec required explicit allowlist (p, strong, em, ul, ol, li only). V2 allows react-markdown defaults. |
| REQ-NS-5 | Auto-scroll to bottom | `app/adventure/[id]/page.tsx` scroll refs | **Match.** Instant scroll on load, smooth scroll on new messages, live scroll during streaming. |

### Persistent State Management (PS)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-PS-5 | Markdown for all state documents | adventure.md, character.md, world.md, history.md | **Match.** Vision Principle 1 (Markdown is Memory). |
| REQ-PS-11 | Claude Agent SDK file access to character/world dirs | `session-runner.ts` sets CWD to adventure directory | **Match.** SDK has Read/Write/Edit/Grep/Glob access to the entire adventure directory. All files are read/write for the AI. |

### Dynamic Themes (DT)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-DT-1 | Update theme via MCP tool | `set_mood` in `mood-tool.ts` | **Evolved.** Single `set_mood` tool replaces `set_theme`. Input is a description string, not mood/genre/region enums. |
| REQ-DT-3 | Persist theme to adventure state | `mood-tool.ts` writes to adventure.md frontmatter | **Match.** Stores mood_hue, mood_description, mood_image. |
| REQ-DT-7 | Generate background images via Replicate | `image-gen.ts` using flux-schnell model | **Evolved.** Always generates (no catalog lookup). Art style from adventure.md frontmatter prepended to prompt. |
| REQ-DT-9 | Handle image generation failures gracefully | `mood-tool.ts` falls back to keyword hue | **Match.** Non-blocking; continues with fallback hue if generation fails. |
| REQ-DT-13 | Apply theme changes from server | `applyMood()` in `apply-mood.ts`, triggered by SSE `mood` event | **Match.** Updates CSS custom properties on `:root`. |
| REQ-DT-14 | Update CSS custom properties | `apply-mood.ts` sets OKLCH-based color variables | **Evolved.** OKLCH color space instead of named theme properties. Single hue angle drives entire palette. |
| REQ-DT-18 | Smooth theme transitions | CSS transitions in `globals.css` (2s backgrounds, 1.5s text) | **Match.** |

### Dice Rolling (DR)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-DR-1 | Parse standard dice notation | `dice-tool.ts:rollDice()` | **Evolved.** Input is structured (`{groups: [{n, d}], modifier}`) not notation strings. The AI handles parsing notation into structured input. Aligns with Vision Principle 2 (Teach, Don't Code). |
| REQ-DR-2 | Support common die types | `dice-tool.ts` accepts any integer for `d` | **Match.** No die type restrictions. |
| REQ-DR-5 | JSON output with rolls, modifier, total | `dice-tool.ts` returns `{groups, modifier, total}` | **Match.** |
| REQ-DR-7 | Apply modifiers after summing | `dice-tool.ts` logic | **Match.** |

### Error Handling (ER)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-ER-6 (partial) | Map errors to user-friendly codes | `adventure-routes.ts` SSE error events | **Evolved.** No formal error code enum. Errors are plain strings. Context overflow detection exists (checks for "context"/"token"/"too long" in SDK errors). |

### Input Processing (IP)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-IP-6 | Support abort | `useAdventureStream.stop()`, AbortController in route handler | **Evolved.** Client aborts the fetch request. Backend catches AbortError and saves partial response. |
| REQ-IP-16 | Text input field | `app/adventure/[id]/page.tsx` InputArea component | **Match.** Textarea with auto-resize. |
| REQ-IP-17 | Submit on Enter (desktop) | `keyboard-handler.ts:shouldSendOnEnter()` | **Evolved.** Platform-aware: Enter on desktop, button tap on mobile. |
| REQ-IP-18 | Clear input after submission | Play page `sendMessage` handler | **Match.** |
| REQ-IP-13 | Max input length | `MessageRequestSchema` in shared schemas: `min(1)` validation | **Partial.** Minimum length enforced; no maximum length enforcement found. |
| REQ-IP-19 | Abort button during streaming | Play page Stop button | **Match.** Red stop button visible during streaming. |

### Application Lifecycle (APP)

| Req | V1 Description | V2 Location | Status |
|-----|---------------|-------------|--------|
| REQ-APP-1 (partial) | Launch the application | `bun run dev` / `bun run start` in root package.json | **Evolved.** Concurrently starts daemon + Next.js. No Claude Code plugin launch skill; standalone development server. |

---

## 2. Missing (Not Yet Implemented)

Requirements from the V1 spec that have no corresponding implementation.

### Session Authentication (High Priority Cluster)

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-AL-3 | Load adventures with session token auth | **No.** V2 uses adventure ID in URL path. No authentication. Single-user daemon on localhost makes session tokens unnecessary for current deployment model. Revisit if multi-user becomes a goal. | - | - |
| REQ-AL-4 | Validate session tokens, reject invalid | **No.** Same reasoning as above. | - | - |
| REQ-AL-8 | Resume adventures with stored credentials | **No.** No credentials to store. Navigation by URL. | - | - |
| REQ-AL-9 | Persist session credentials in localStorage | **No.** No session credentials. | - | - |

### Input Queue and Concurrency Control

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-IP-1 | Queue inputs during active GM response | **Yes, likely needed.** V2 has no server-side input queue. Frontend disables input during streaming, but rapid requests or concurrent tabs could race. | Medium | None |
| REQ-IP-2 | Process queued inputs FIFO | **Yes.** Follows from IP-1. | Medium | REQ-IP-1 |
| REQ-IP-3 | Don't drop inputs under concurrent submission | **Yes.** Follows from IP-1. | Medium | REQ-IP-1 |
| REQ-IP-4 | Append both player input and GM response to history | **Implemented.** `history-service.ts` appends both. Marking as present. | - | - |
| REQ-IP-5 | Update scene description after each GM response | **No.** V2 has no scene description concept. Adventure.md concept field is static. Not useful for V2's design. | - | - |
| REQ-IP-7 | Clear queue on abort | **Deferred.** No queue to clear. Revisit with IP-1. | Small | REQ-IP-1 |
| REQ-IP-8 | Send partial response on abort | **Implemented.** Route handler catches AbortError, appends partial to history. | - | - |
| REQ-IP-9 | Save partial response with interrupted marker | **Partial.** Partial response saved but no "[Response interrupted]" marker. | Small | None |

### Input Sanitization

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-IP-11 | Sanitize player input for prompt injection | **Yes.** No sanitization exists. The AI receives raw player input. Worth discussing whether the Claude Agent SDK's built-in safeguards are sufficient or if application-level sanitization adds value. | Medium | None |
| REQ-IP-12 | Block role manipulation attempts | **Yes.** Same as above. | Medium | REQ-IP-11 |
| REQ-IP-13 (max) | Max input length (5000 chars) | **Yes.** Only min(1) enforced currently. | Small | None |
| REQ-IP-14 | Log flagged inputs | **Deferred.** Depends on IP-11. | Small | REQ-IP-11 |

### Recap and History Compaction

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-RC-1 | Detect history exceeding character threshold | **Yes.** History is append-only with no compaction. Long adventures will hit context limits. Existing brainstorm at `.lore/brainstorm/conversation-history.md` covers this. | Large | None |
| REQ-RC-2 | Set compaction pending flag | **Yes.** Part of RC-1. | - | REQ-RC-1 |
| REQ-RC-3 | Execute forceSave before compaction | **Deferred.** V2 writes state immediately; no deferred save buffer. | - | REQ-RC-1 |
| REQ-RC-4 | Run compaction between input cycles | **Yes.** Part of RC-1 design. | - | REQ-RC-1 |
| REQ-RC-5 | Retain recent entries after compaction | **Yes.** Part of RC-1 design. | - | REQ-RC-1 |
| REQ-RC-6 | Generate summary of archived entries | **Yes.** Part of RC-1 design. | - | REQ-RC-1 |
| REQ-RC-7 | Archive to timestamped files | **Yes.** Part of RC-1 design. | - | REQ-RC-1 |
| REQ-RC-8 | Manual recap via user action | **Yes.** Frontend would need a recap button. | Medium | REQ-RC-1 |
| REQ-RC-9 | Tool status bar showing GM state | **Partial.** Streaming indicator exists ("Game Master is responding...") but no general tool status bar. | Medium | None |
| REQ-RC-10-14 | Frontend recap controls | **Yes.** Depends on RC-1 backend. | Medium | REQ-RC-1 |

### Panel Display System

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-PD-1 through REQ-PD-32 | Full panel system (create, update, dismiss, positions, persistence, patterns) | **Mixed.** The V1 panel system was elaborate (5 max panels, 3 positions, drag-to-move overlays, 2KB limits, pattern library). V2 has no panel implementation at all. **Carry forward recommendation:** Yes, but scoped differently. Panels serve the story (Vision Principle 0). A simpler implementation (sidebar-only, GM-managed) would deliver 80% of the value. The panel pattern library (REQ-PD-25 through PD-32) was guidance content for the AI, which aligns with Principle 2 (Teach, Don't Code) and could be delivered as a plugin skill rather than enforced by the system. | Large | None |

### Connection Health and Reconnection

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-RT-4, RT-5 | Ping/pong health monitoring | **No.** V2 uses HTTP/SSE, not WebSocket. Connection health is managed by HTTP semantics. | - | - |
| REQ-RT-15 | Connection status indicator | **Partial.** Input disabled during streaming. No explicit connected/disconnected/reconnecting indicator. Daemon unreachability shows as a 502 error. | Small | None |
| REQ-RT-16, RT-17 | Automatic reconnection with backoff | **No.** SSE has native browser reconnection. For REST failures, the user retries by sending another message. Reconnection is less critical in request/response model vs persistent WebSocket. | - | - |
| REQ-RT-18 | Disable input during disconnected state | **Partial.** Disabled during streaming. Not disabled on daemon unreachable (user gets error after attempting). | Small | None |

### Error Recovery

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-ER-1 through ER-5 | Session error detection and recovery | **Partial.** V2 detects context overflow errors and suggests editing history.md. No automatic session recovery or retry logic. No `agentSessionId` concept (V2 is stateless per-request). | Medium | None |
| REQ-ER-8 | Display error messages | **Implemented.** Error banner in play page. | - | - |
| REQ-ER-9 | Distinguish retryable vs non-retryable errors | **No.** All errors displayed the same way. No retry classification. | Medium | None |
| REQ-ER-10 | Retry button for retryable errors | **No.** User must retype and resend. | Medium | REQ-ER-9 |
| REQ-ER-11 | Dismiss button for errors | **No.** Errors clear on next successful interaction. | Small | None |
| REQ-ER-12, ER-13 | Theme mood on error severity | **No.** Errors don't affect theme. | Small | None |

### Observability and Logging

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-NF-50 | Request-scoped logging with correlation IDs | **Yes.** Console logging with prefixes exists but no correlation IDs or structured JSON logging. Open issue at `.lore/issues/logging-insufficient.md`. | Medium | None |
| REQ-NF-51 | Structured JSON logging | **Yes.** Same as above. | Medium | REQ-NF-50 |
| REQ-NF-52 | File-based logging with rotation | **No.** No file logging. Console only. Low priority for single-user daemon. | Small | None |

### Security Hardening

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-NF-28 | safeResolvePath for all file operations | **Partial.** `adventure-service.ts:isValidId()` blocks `/` and `..` in adventure IDs. No general `safeResolvePath` utility. SDK file access is scoped to CWD (adventure directory). | Medium | None |
| REQ-NF-30 | Origin header validation on WebSocket | **N/A.** No WebSocket. CORS middleware handles origin for REST. | - | - |
| REQ-NF-31 | Session tokens with UUID entropy | **N/A.** No session tokens. | - | - |
| REQ-NF-32 | File permissions 0o700/0o600 | **No.** No explicit permission setting on created files/directories. | Small | None |
| REQ-NF-33 | Markdown sanitization allowlist | **Partial.** react-markdown defaults, not explicit allowlist. | Small | None |

### Testing Coverage

| Req | Description | Carry Forward? | Effort | Dependencies |
|-----|-------------|---------------|--------|--------------|
| REQ-NF-54 | Unit tests for core logic | **Partial.** 24 test files in backend, tests in web. No GameSession or PanelManager (these don't exist in V2). Coverage exists for adventure service, dice, mood, config, history, prompts, plugins, routes. | Ongoing | None |
| REQ-NF-55 | Integration tests for endpoints | **Partial.** Route tests exist but are closer to unit tests with mocked services. No true integration tests against a running daemon. | Medium | None |

---

## 3. Superseded or Contradicted

Requirements where the V2 implementation deliberately diverges from V1. Each divergence traced to a design decision.

### Communication Protocol: WebSocket to SSE

**V1 (REQ-RT-1 through RT-26):** WebSocket-based real-time communication with authentication handshake, discriminated union message schemas, typed client/server message envelopes, parsing/formatting helpers.

**V2:** REST API + Server-Sent Events (SSE) for streaming. No WebSocket. No message envelope protocol.

**Decision source:** Architecture pattern at `.lore/reference/architecture-pattern.md` (daemon-first design). The V2 architecture uses a Unix socket daemon with HTTP, which naturally leads to REST+SSE. SSE provides one-way streaming (GM responses) which is the only real-time need. Player input is discrete REST requests.

**What changed:**
- 26 RT requirements are replaced by ~5 REST endpoints + SSE event types
- Shared protocol schemas (`packages/shared`) define request/response bodies, not message envelopes
- No discriminated unions, no `parseClientMessage`/`parseServerMessage`, no `formatValidationError`
- No session-based connection state; each request is independent

**Vision alignment:** Principle 4 (Progressive Simplification). WebSocket added complexity for bidirectional communication that wasn't needed. The system only streams in one direction (GM to player). SSE is the simpler tool.

### Frontend Framework: React+Vite SPA to Next.js App Router

**V1 (Technical Context):** React 19 + Vite 6, single-page application served as static files from the backend.

**V2:** Next.js 15 App Router, server-side rendering, API routes as proxy layer.

**Decision source:** User's TypeScript setup rules (`.dotfiles/config/claude/rules/typescript/setup.md`) specify Next.js as default for web applications.

**What changed:**
- REQ-AL-17 (serve static files, SPA fallback): Replaced by Next.js build output. No static file serving from daemon.
- REQ-AL-18 (serve background images): Mood images served via `GET /adventures/:id/mood-image` route instead of static path.
- Frontend builds independently with `next build`, not served by the daemon.
- API proxy (`app/api/daemon/[...path]/route.ts`) bridges Next.js to the Unix socket daemon.

### Adventure Identity: UUIDs to Slugified Names

**V1 (REQ-AL-1, REQ-NF-68):** Adventures use UUID v4 identifiers.

**V2:** Adventures use slugified names (e.g., `the-healers-burden`).

**Decision source:** Project memory records this explicitly: "Adventure directory names are slugified from player-chosen names. Human-readable for developer maintenance. Display name stored in adventure.md frontmatter `name` field."

**What changed:**
- No UUID generation or validation
- Adventure ID is the directory name, which is the slugified player-chosen name
- `DuplicateAdventureError` handles name collisions (V1 had no collision risk with UUIDs)

### State Persistence: JSON to Markdown

**V1 (REQ-PS-4):** JSON for all server-managed state variables. Separate state.json with agentSessionId, currentTheme, playerRef, worldRef, etc.

**V2:** Markdown files with YAML frontmatter. No JSON state files.

**Decision source:** Vision Principle 1 (Markdown is Memory). "All game-meaningful state lives in markdown files. Not because markdown is a good database, but because it's the shared medium between the AI, the developer, and the player."

**What changed:**
- `adventure.md` YAML frontmatter stores: name, system, concept, art_style, mood_hue, mood_description, mood_image
- `character.md` and `world.md` are free-form markdown managed by the GM
- `history.md` is append-only markdown conversation log
- No `state.json`, no `agentSessionId` field, no `playerRef`/`worldRef` references

### Adventure File Access: Read-Only to Read-Write

**V1 (REQ-SYS-5, from adventure-system-integration spec):** adventure.md is read-only for AI.

**V2:** All adventure files (adventure.md, character.md, world.md, history.md) are fully read/write for both the AI and the player.

**Decision source:** Project memory: "REQ-SYS-5's 'adventure.md is read-only for AI' was a bad spec decision that contradicts the project vision. Must be corrected in spec."

**What changed:**
- Claude Agent SDK has full Read/Write/Edit access to the adventure directory
- GM updates character.md and world.md as state changes during play
- No filesystem permission restrictions within the adventure directory

### Theme System: Mood/Genre/Region Enums to Hue-Based

**V1 (REQ-DT-10 through DT-23):** Five mood enums, seven genre enums, nine region enums. Theme definitions in themes.json with named colors, fonts, decorations. `set_theme` MCP tool takes `{mood, genre, region, force_generate?, custom_prompt?}`.

**V2:** Single `set_mood` MCP tool takes `{description: string}`. Generates image, extracts dominant hue, derives entire palette from one number.

**Decision source:** `.lore/brainstorm/dynamic-mood-system.md` and `.lore/specs/dynamic-mood-system.md`.

**What changed:**
- No mood/genre/region enums. No ThemeMood, Genre, Region schemas.
- No themes.json. No named theme definitions.
- OKLCH color space. Single hue (0-360) generates all background, text, and accent colors via fixed lightness/chroma offsets.
- Image-first: mood generates an image, image drives the palette. V1 was palette-first: enums select palette, optionally generate image.
- Debouncing (REQ-DT-2) not implemented. Each `set_mood` call generates a new image.
- Background image catalog (REQ-DT-5) eliminated. Always generates fresh.

**Vision alignment:** Principle 4 (Progressive Simplification). Enums constrain the AI's expressiveness. A description string gives the GM full creative control. The system extracts visual properties from what the GM imagines, rather than forcing the GM to pick from a menu.

### Plugin Manifest: Aliases Array to Singular Alias

**V1 (implicit, from adventure-creation-flow brainstorm):** `"aliases": ["daggerheart", "dh"]` (array of strings).

**V2:** `"alias": "daggerheart"` (single string) + `"description"` field added.

**Decision source:** `.lore/brainstorm/adventure-creation-flow.md` line 177: "aliases (array) becomes alias (singular string)... a breaking change to the manifest schema." Project memory confirms this.

**What changed:**
- `corvran-plugin.json` uses `alias` (string), not `aliases` (array)
- `description` field added for system picker UI (`GET /systems` returns `{alias, description}[]`)
- `bootstrap` field points to system-specific bootstrap.md

### Freeform Adventures: No Special Treatment

**V1:** No explicit freeform handling documented.

**V2:** Freeform adventures (no system selected) load only the core plugin. No freeform-specific bootstrap prompt.

**Decision source:** Project memory: "Freeform adventures get no special treatment. No freeform-specific bootstrap. The generic GM prompt carries the weight. Blank concept + no system = blank slate, and that's valid."

**Vision alignment:** Principle 5 (System-Agnostic Core). The engine doesn't know about any RPG system. A freeform adventure is just the engine with no system plugin loaded.

### Character/World Management: MCP Tools to SDK File Access

**V1 (REQ-PS-6 through PS-16):** Dedicated MCP tools (`set_character`, `set_world`, `list_characters`, `list_worlds`). Character/world directories at `PROJECT_DIR/players/`, `PROJECT_DIR/worlds/`. Explicit onboarding guidance when refs are null.

**V2:** No character/world MCP tools. The GM reads and writes character.md and world.md directly via Claude Agent SDK file tools. Onboarding instructions in `prompt-service.ts` guide the GM to ask about character/world setup when files are empty.

**Decision source:** Vision Principle 4 (Progressive Simplification). "If the AI can do it with standard tools, remove the custom tool."

**What changed:**
- No `set_character`, `set_world`, `list_characters`, `list_worlds` MCP tools
- No `playerRef`/`worldRef` fields in state
- Character and world state live in single files (character.md, world.md) per adventure, not in shared `players/`/`worlds/` directories
- No slug generation for character/world names (no cross-adventure character sharing)
- System prompt includes onboarding instructions when character.md or world.md have no content

### Application Lifecycle: Plugin Launch to Standalone Daemon

**V1 (REQ-APP-1 through APP-17):** Claude Code plugin launches the application. Bash scripts for start/stop. PID file management. Health checks with browser opening. Environment variable cascading from multiple .env files.

**V2:** Standalone daemon started via `bun run dev` (concurrently). No PID files, no launch scripts, no Claude Code plugin lifecycle management.

**Decision source:** Architecture shift to daemon-first model. The daemon runs independently; the web client connects to it. No plugin needed to start/stop.

**What changed:**
- No launch/stop bash scripts
- No PID file management (REQ-APP-9, APP-10, APP-11, APP-12)
- No health check polling (REQ-APP-5)
- No browser auto-open (REQ-APP-6, APP-7)
- No .env cascading (REQ-APP-13, APP-14)
- Development uses `concurrently` to run daemon + Next.js together
- Production uses `bun run start` which does the same

### Corvran Claude Code Plugin: Dissolved

**V1 (Domain 11 + Plugin section):** Full Claude Code plugin with skills for launching, stopping, dice rolling, world initialization, atmospheric enhancement.

**V2:** Plugins are RPG system content (d20, daggerheart), not application lifecycle tools. The corvran core plugin has one skill (`gm-craft`). Dice rolling moved to engine MCP tool. No launch/stop/init skills.

**Decision source:** Vision Principle 2 (Teach, Don't Code) and Principle 4 (Progressive Simplification).

---

## Observations

Three patterns emerge from this analysis that aren't individual requirements but shape what's worth carrying forward:

1. **The queue gap is real.** V2's stateless per-request model has no protection against concurrent messages from the same adventure. Frontend disabling input is a UI-only guard. Multiple tabs, programmatic access, or race conditions during network delays could produce interleaved GM responses writing to the same history.md. REQ-IP-1 through IP-3 addressed a real problem that still exists.

2. **History compaction is the ceiling.** Without compaction (REQ-RC-1 through RC-8), adventures have a hard limit determined by the AI's context window. The existing brainstorm at `.lore/brainstorm/conversation-history.md` has explored this. It's the single largest missing feature that directly impacts how long someone can play.

3. **Error UX is thin.** V1 had a detailed error taxonomy (7 error codes, retryable classification, retry buttons, error-driven theme changes). V2 shows error strings. This works for a developer audience but won't survive contact with anyone else. The gap between "daemon unreachable" and "what do I do about it" is where users get stuck.
