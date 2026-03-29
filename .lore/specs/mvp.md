---
title: Adventure Engine MVP
date: 2026-03-28
status: approved
tags: [mvp, daemon, agent-sdk, web-client, adventure, greenfield]
modules: [backend, web, shared]
related: [.lore/vision.md, .lore/reference/architecture-pattern.md, .lore/brainstorm/mvp-scope.md, .lore/brainstorm/conversation-history.md]
req-prefix: MVP
---

# Spec: Adventure Engine MVP

## Overview

The MVP is one player, one AI game master, one conversation. The player picks an adventure, types what their character does, and the AI responds as the world. State lives in markdown files the player owns. RPG systems are taught through plugin documents, not application code. The bar is "worth an evening of play," not "technically validates the architecture."

This spec defines what to build and how to verify it's done. For structural patterns (route/service split, DI factories, operations registry, type boundaries), follow `.lore/reference/architecture-pattern.md`. That document is not repeated here.

## Entry Points

- Player opens the web client in a browser (from [web client URL, localhost in development])
- Player has created an adventure directory (may be empty; character and world files are optional and can be created through play)

## Requirements

### Adventures

- REQ-MVP-1: An adventure is a directory under a configurable `adventures/` root path. The daemon discovers adventures by listing directories in this path.
- REQ-MVP-2: An adventure directory may contain `character.md`, `world.md`, and `history.md`. All are optional. The daemon lists the adventure regardless of which files exist. A player can start a session in an empty adventure directory and create character/world content through conversation with the GM (the RPG system plugins have skills for guided character creation and world building).
- REQ-MVP-3: `history.md` is created by the daemon on first player message if it does not exist. It is not required for adventure discovery.
- REQ-MVP-4: Adventure identity is its directory name. No manifest file, no metadata. The directory name is the adventure's display name and its ID.
- REQ-MVP-5: Adventure directories are created manually by the player (mkdir). State files (`character.md`, `world.md`) can be created manually or through conversation with the GM. There is no dedicated creation UI in the MVP; the conversation *is* the creation UI when plugin skills handle it.

### Daemon

- REQ-MVP-6: The daemon is a Hono application served on a Unix socket via `Bun.serve()`. The daemon and the Agent SDK subprocess it spawns are the only processes that read or write adventure state. The daemon manages `history.md` directly; the SDK subprocess (the AI) may create or update `character.md` and `world.md` via its tool access, scoped to the adventure's `cwd`.
- REQ-MVP-7: The daemon exposes the following REST endpoints:

#### `GET /adventures`

Lists available adventures.

Response:
```json
{
  "adventures": [
    {
      "id": "lost-mines",
      "name": "lost-mines",
      "hasCharacter": true | false,
      "hasWorld": true | false,
      "hasHistory": true | false
    }
  ]
}
```

`hasCharacter`, `hasWorld`, and `hasHistory` indicate whether the respective files exist. All adventures are playable regardless of which files are present. The web client may use these flags for display hints (e.g., "New adventure" vs. "Continue").

#### `GET /adventures/:id`

Returns adventure detail, including the content of state files.

Response:
```json
{
  "id": "lost-mines",
  "name": "lost-mines",
  "character": "# Thorin Ironforge\n...",
  "world": "# The Lost Mines\n...",
  "hasHistory": true | false
}
```

Returns 404 if the adventure directory does not exist. `character` and `world` are the raw markdown content of the respective files. Either may be `null` if the file does not exist yet.

#### `POST /adventures/:id/message`

Sends a player message and streams the GM response.

Request:
```json
{
  "message": "I search the room for hidden doors."
}
```

Response: Server-Sent Events stream. Each SSE event has a `type` field:

| Event type | Payload | When |
|------------|---------|------|
| `text` | `{ "text": "..." }` | Incremental GM narrative text |
| `tool_use` | `{ "name": "...", "result": "..." }` | A tool was used (dice roll, file read). Only the human-readable result, not raw invocation. |
| `done` | `{ "fullResponse": "..." }` | Stream complete. Full response text for client-side display without buffering. |
| `error` | `{ "error": "..." }` | Something went wrong. |

Returns 404 if adventure does not exist. Returns 400 if `message` is empty or missing.

**Streaming behavior**: The daemon begins streaming SSE events as the Agent SDK `query()` yields messages. The client receives text incrementally. This is the only long-lived connection in the system.

**Stop behavior**: When the client closes the SSE connection (e.g., the player clicks "Stop"), the daemon aborts the in-flight `query()` call. This is a collaborative game, not background work. The AI is playing *with* the player; if the player disconnects, there's no game to continue. The GM's response up to that point is still appended to `history.md`. Any file writes the GM completed before the abort (character updates, world state changes) remain on disk. Partial progress is better than rollback, and the player can always edit the files.

#### `GET /adventures/:id/history`

Returns the raw content of `history.md`.

Response:
```json
{
  "history": "**Player:** I search the room...\n\n**GM:** You run your hands along...",
  "exists": true
}
```

Returns the content as a string. `exists` is `false` and `history` is `null` if `history.md` does not exist yet.

#### `GET /health`

Returns daemon status.

Response:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

- REQ-MVP-8: The daemon follows the route/service split from the architecture pattern. Routes handle HTTP concerns (parsing, validation, response formatting). Services handle business logic (file I/O, prompt assembly, SDK calls). Route files are DI factories: `createAdventureRoutes(deps) -> RouteModule`.

- REQ-MVP-9: The daemon registers all endpoints in the operations registry per the architecture pattern. The `/help` endpoint returns the correct operation tree for all adventure endpoints. (No CLI binary in MVP scope, but the registry and discovery endpoint are testable directly.)

### AI Game Master

- REQ-MVP-10: Each player message triggers a fresh Agent SDK `query()` call. No session resume, no persistent SDK session. The conversation context is reconstructed from files on every turn.

- REQ-MVP-11: The `query()` call is configured with:

| Option | Value | Reason |
|--------|-------|--------|
| `systemPrompt` | Custom GM prompt (see REQ-MVP-12) | Defines GM identity and behavioral constraints |
| `cwd` | Adventure directory path | Scopes file access to the adventure |
| `plugins` | `[{ type: 'local', path: '<repo>/plugins/corvran' }, { type: 'local', path: '<repo>/plugins/d20-system' }, { type: 'local', path: '<repo>/plugins/daggerheart-system' }]` | Plugin paths hardcoded for MVP. Absolute paths resolved from the repo root at startup. |
| `tools` | `['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob']` | Bash for dice roller. Read/Grep/Glob for reference files and adventure state. Write/Edit for creating and updating state files (character.md, world.md) through plugin skills. |
| `allowedTools` | `['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob']` | Auto-approves these tools so `permissionMode: 'dontAsk'` doesn't silently deny them |
| `permissionMode` | `'dontAsk'` | No interactive permission prompts in daemon context |
| `persistSession` | `false` | We manage our own history; SDK session persistence is unnecessary |
| `maxTurns` | Not set (unlimited) | The GM takes as many turns as it needs: rolling dice, writing files, looking up rules, narrating. The player stops it, not an arbitrary cap. |
| `model` | Configurable, default `'claude-sonnet-4-5-20250929'` | Sonnet balances quality and speed for interactive play |

- REQ-MVP-12: The system prompt assembles the GM's identity. It is a plain string (not the `claude_code` preset) with these sections in order:

1. **Identity**: "You are the Game Master for a tabletop RPG adventure."
2. **Principles**: Player agency is sacred (Principle 3). Never narrate player actions or decisions. Describe the world; the player describes their character.
3. **Adventure state**: The full content of `character.md` and `world.md`, each under a labeled header. If either file does not exist, include a note under that header: "No character/world has been created yet." Do not include a header for a missing file with no note; the absence should be visible, not silent.
4. **Onboarding** (only when character or world is missing): "The player hasn't set up [character/world/both] yet. You can help them create one through conversation. Ask what kind of adventure they want to play, then use your skills to guide character creation and world building. Let the player drive the choices."
5. **Conversation history**: The full content of `history.md` (if it exists), under a labeled header.
6. **Instructions**: Respond to the player's latest message. Use available skills for dice rolls, rules lookup, and GM techniques. When you roll dice or look up rules, include the meaningful result in your narrative (e.g., "You rolled 14 + 3 = 17, a success!") but not the raw tool invocation.

The player's message is passed as the `prompt` parameter to `query()`.

**Why history goes in the system prompt, not as a prior conversation**: The SDK's `query()` takes a single prompt string. There is no "conversation history" parameter. Inlining history in the system prompt is the only option that doesn't require session resume (which we've decided against) or a streaming input iterator (unnecessary complexity for the MVP). The system prompt is the right place because it's read-once context, not a conversation the AI is continuing. The AI treats the history as narrative context, not as its own prior messages.

- REQ-MVP-13: The prompt string (system prompt + player message) must fit within the model's context window. For the MVP, no compaction or truncation. The daemon catches SDK errors caused by context overflow and returns a clear error to the client: `{ "error": "Adventure history is too long. Edit history.md to shorten it." }`. No pre-flight token estimation is required. This is the honest failure mode. Compaction is deferred.

### Conversation History

- REQ-MVP-14: `history.md` is a markdown file in the adventure directory. It is the canonical record of the adventure. The daemon appends to it; the player can read and edit it.

- REQ-MVP-15: History format uses labeled blocks separated by blank lines:

```markdown
**Player:** I search the room for hidden doors.

**GM:** You run your hands along the rough stone walls, feeling for any irregularity. Near the northeast corner, behind a moth-eaten tapestry, your fingers find a seam. A hidden door, cleverly disguised. (Rolled 15 + 3 = 18, Perception check succeeded.)

**Player:** I carefully push the door open and peek through.

**GM:** The door swings inward with a low groan...
```

This format is:
- Human-readable without tools
- Trivially parseable (split on `\n\n`, check prefix)
- Appendable (write label + content + blank line)
- Editable (player can delete, rewrite, or annotate entries)

- REQ-MVP-16: The daemon appends to `history.md` at two points during each turn:
  1. **Before** sending the `query()`: append `**Player:** {message}\n\n`
  2. **After** the `query()` completes: append `**GM:** {response}\n\n`

The GM response includes narrative text and tool results (dice rolls, rules lookups) as natural language, not raw JSON. If the SDK yields tool use events, the daemon extracts the human-readable result and weaves it into the GM's response text before appending.

If `query()` fails after the player message has been appended (step 1) but before a GM response is produced, the orphaned player entry remains in `history.md`. No rollback. The next successful query will see the unanswered message in context and the GM can respond to it naturally.

- REQ-MVP-17: If the player edits `history.md` between turns, the next turn picks up the edits. The daemon reads the file fresh on every turn. There is no in-memory history cache.

### Web Client

- REQ-MVP-18: The web client is a Next.js application (App Router). It talks to the daemon via HTTP over the Unix socket. It never reads or writes files directly.

- REQ-MVP-19: The web client has two views:

**Adventure List** (`/`)
- Fetches `GET /adventures` on load
- Shows each adventure's name. All adventures are clickable.
- Shows context hints per adventure: "New adventure" (no history), "Continue" (has history). May show whether character/world exist as secondary info.
- If only one adventure exists, navigate directly to it
- If no adventures exist, show a message explaining how to create one (create a directory under `adventures/`)
- No adventure is ever blocked from starting. An empty directory is a valid starting point; the GM will help the player set up.

**Adventure Play** (`/adventure/[id]`)
- Fetches `GET /adventures/:id` on load for initial state
- Shows the conversation history (fetched from `GET /adventures/:id/history`, or empty if new)
- Shows a text input at the bottom for player messages
- On submit: POST to `/adventures/:id/message`, consume the SSE stream, display text incrementally
- Scroll to bottom as new text arrives
- Disable input while the GM is responding. Show a "Stop" button that closes the SSE connection, aborting the GM's response.
- Show tool use events inline (e.g., "Rolled 15 + 3 = 18") in a visually distinct way (lighter text, italic, or similar)
- Show errors from the stream clearly

- REQ-MVP-20: No authentication, no user accounts, no multi-player. One player, one browser, localhost.

- REQ-MVP-21: The web client connects to the daemon via Unix socket. A Next.js catch-all API route (e.g., `app/api/daemon/[...path]/route.ts`) forwards requests to the daemon Unix socket. The socket path is read from a `DAEMON_SOCKET_PATH` environment variable. The client-side code calls `/api/daemon/adventures/...` and never knows the socket path. For SSE streams, the proxy forwards the response as a stream.

### Markdown State Files

- REQ-MVP-22: `character.md` is freeform markdown. The engine imposes no schema. The content is whatever the player and the RPG system need. For a D&D 5e character, it might follow the template in `plugins/d20-system/skills/d20-players/references/sheet-template.md`. For freeform narrative, it might be three sentences. The AI reads it as context.

- REQ-MVP-23: `world.md` is freeform markdown. It describes the adventure setting, active quests, NPCs, locations, and any world state the GM needs to maintain continuity. The AI reads it as context and updates it as the story progresses: recording NPC deaths, location changes, quest completions, faction shifts, and other world-state consequences of play. The AI may also create `world.md` during initial setup (through plugin skills like `dh-frame`). This is the GM maintaining continuity, the same job a human GM does with their notes.

- REQ-MVP-24: `history.md` is managed by the daemon (see REQ-MVP-14 through REQ-MVP-17). The player can read and edit it freely between turns.

### Plugins

- REQ-MVP-25: Three plugin paths are hardcoded in the daemon's SDK `query()` configuration:
  - `plugins/corvran` (gm-craft techniques, dice roller)
  - `plugins/d20-system` (D&D 5e SRD: rules, combat, magic, monsters, characters)
  - `plugins/daggerheart-system` (Daggerheart SRD: rules, combat, domains, classes, adversaries)

These are passed as `plugins` in the SDK `Options` using the `{ type: 'local', path: string }` format. Paths are absolute, resolved from the repo root at daemon startup (not relative to the adventure `cwd`). The Agent SDK resolves them, making their skills available to the AI. No plugin content is inlined into the prompt.

- REQ-MVP-26: The plugins already exist in the repo and are production-ready. No plugin work is needed for the MVP. The dice roller (`plugins/corvran/skills/dice-roller/`) uses a bash script that the AI invokes via the Bash tool.

### Project Structure

- REQ-MVP-27: The project is a monorepo with three packages:

| Package | Path | Contents |
|---------|------|----------|
| `backend` | `packages/backend/` | Hono daemon, services, SDK integration |
| `web` | `packages/web/` | Next.js client |
| `shared` | `packages/shared/` | Shared types (Zod schemas for API contracts) |

`packages/backend/` and `packages/shared/` already exist (with dependencies installed). `packages/web/` needs to be created.

Types flow one direction: `shared` is imported by `backend` and `web`. Neither `backend` nor `web` imports from the other.

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Adventure creation | Player wants a new adventure | Manual (mkdir). Character/world creation through GM conversation or manual file creation. |
| State editing | Player wants to manually edit character/world/history | Manual (text editor). The AI also updates state files during normal play as part of game mastering. |
| Plugin configuration | Player wants different RPG systems | [STUB: plugin-configuration] |
| History compaction | History exceeds context window | [STUB: history-compaction] |
| Session recovery | Daemon restarts mid-conversation | [STUB: session-recovery] |

## Success Criteria

These are playability criteria, not just technical checks. Criteria 1-4 require a human playtest session to fully verify. Automated tests validate the machinery; playtesting validates the experience.

- [ ] A player can create an adventure directory (even an empty one), start the daemon, open the web client, and begin playing. The GM helps them create a character and world through conversation if the files don't exist yet.
- [ ] A one-evening D&D 5e session (2-3 hours of play) works without hitting the context window limit. The AI references rules correctly, rolls dice, and maintains narrative continuity.
- [ ] A Daggerheart session works with the same engine. No code changes, just different content in `character.md` and `world.md`.
- [ ] A freeform narrative session (no RPG system) works. The AI game masters without rules reference.
- [ ] The player can close the browser, reopen it, and continue the adventure from where they left off. History persists in `history.md`.
- [ ] The player can edit `history.md` in a text editor (correct a misunderstanding, remove a tangent), and the next turn reflects the edit.
- [ ] The player can read `history.md` as a readable record of the adventure. It reads like a story, not like debug output.
- [ ] The web client shows GM responses streaming in real-time. The player doesn't stare at a blank screen for 10 seconds waiting for a complete response.
- [ ] Dice rolls happen and the results appear in the narrative naturally ("You rolled 14 + 3 = 17, clearing the DC 15 check").
- [ ] The daemon starts with a single command (`bun run dev` or equivalent) and the web client starts with another. No manual configuration beyond setting the adventures directory path.

## AI Validation

**Defaults** (apply to all implementation work):
- Unit tests with mocked dependencies (file I/O, Agent SDK `query()`)
- Integration tests for daemon endpoints using Hono's `app.request()` test client
- Code review by fresh-context sub-agent

**Custom**:
- SSE stream integration test: mock SDK query that yields multiple text events, verify the SSE stream delivers them incrementally with correct event types
- History append test: send two messages, verify `history.md` contains both exchanges in the correct format with correct labels
- Adventure discovery test: create temp directories with various combinations of files (all, some, none), verify the list endpoint returns correct file-existence flags for each
- Prompt assembly test: verify the assembled system prompt contains character, world, and history content in the correct order with correct labels. When files are missing, verify the prompt includes the absence note and onboarding section.
- Context overflow test: verify the daemon returns the expected error (not a crash) when history is too large

## Constraints

- **Agent SDK only.** No `@anthropic-ai/sdk`, no other LLM libraries. See architecture pattern.
- **No database.** All state is files.
- **No auth.** Localhost only. Single player.
- **No compaction.** If history exceeds context, the player gets an error and edits the file. This is the honest failure mode for the MVP.
- **No adventure creation UI.** The player uses a file manager and text editor.
- **Plugin paths are hardcoded.** All three plugin sets load on every adventure. RPG system selection is deferred.
- **The AI manages state files as part of game mastering.** The AI creates, reads, and updates `character.md` and `world.md` as needed: tracking HP after combat, recording inventory changes, noting that an NPC died or a location changed. This is bookkeeping, not authority. The boundary is player agency (Principle 3), not file access. The AI never makes decisions that belong to the player (choosing to attack, selling an item, abandoning a quest), but it tracks the consequences of play without asking permission for each write. `history.md` is append-only by the daemon, not the AI.

## Deferred (Not in Scope)

These items are acknowledged as natural next steps but are explicitly excluded from this spec. They are listed here to prevent scope creep during implementation.

- Adventure creation UI (directory creation is manual; character/world creation happens through GM conversation)
- RPG system selection per adventure
- Conversation history compaction and summarization
- Scene-based history (Approach 3 from conversation-history brainstorm)
- SDK session resume for conversation continuity
- Session recovery after daemon restart mid-stream
- Structured state schema (the AI manages freeform markdown; structured/typed state tracking is deferred)
- Panels, theming, background images, or any UI beyond conversation
- CLI client (the operations registry enables it, but no CLI binary is in MVP scope)
- Multi-player or authentication

## Context

- `.lore/vision.md`: Design principles. All six are validated by this MVP (see mvp-scope brainstorm, "What This Proves" table).
- `.lore/reference/architecture-pattern.md`: Structural patterns for the daemon. Route/service split, DI factories, operations registry, type boundaries.
- `.lore/brainstorm/mvp-scope.md`: Scope decisions and user responses to open questions.
- `.lore/brainstorm/conversation-history.md`: Decision to use Approach 2 (file-based history, compaction deferred). Analysis of SDK capabilities that informed the decision.
- `plugins/corvran/`: GM craft techniques and dice roller. Already built.
- `plugins/d20-system/`: D&D 5e SRD content. Already built.
- `plugins/daggerheart-system/`: Daggerheart SRD content. Already built.
