---
title: Compaction System
date: 2026-04-02
status: draft
tags: [compaction, history, context-management, narrative, haiku, scene-boundaries]
modules: [backend, shared, web]
related: [.lore/specs/mvp.md, .lore/brainstorm/compaction-system.md, .lore/brainstorm/conversation-history.md, .lore/research/scene-boundaries.md, .lore/vision.md]
req-prefix: COMP
---

# Spec: Compaction System

## Overview

The MVP defers compaction with an honest failure mode: when history exceeds the context window, the player gets an error and edits the file (REQ-MVP-13). This spec replaces that failure mode with a system that manages context growth.

Three actors can trigger compaction: the daemon (safety net when files get too large), the AI (editorial judgment at natural narrative pauses), and the player (manual control via button). All three run the same mechanism: archive the current file, summarize it with Haiku, save the summary as the new working file. The archive preserves the verbatim transcript so nothing is lost.

This spec does not attempt formal scene detection. The research at `.lore/research/scene-boundaries.md` shows that even human annotators agree on scene boundaries only 70% of the time, and automated detection from raw text achieves F1 = 0.24. Instead of detecting scenes, the system gives the GM the concept of narrative pacing and a tool to act on it. The threshold trigger is a safety net, not an intelligence.

## Entry Points

- Player sends a message (`POST /adventures/:id/message`). The daemon checks file sizes before prompt assembly.
- The AI calls the `compact_history` tool during its turn, at a moment it judges narratively appropriate.
- The player clicks a compaction button in the web client, which calls `POST /adventures/:id/compact`.

## Requirements

### Compaction Mechanism

The archive-summarize-save mechanism is the same regardless of which trigger fires. These requirements define what happens, not when.

- REQ-COMP-1: When compaction runs on a file, the system performs three steps in order: (1) archive the current file, (2) generate a summary of the archived content, (3) write the summary as the new file. If any step fails, the process aborts and the original file remains unchanged.

- REQ-COMP-2: **Archive.** The current file is moved (not copied) to the `past/` subdirectory inside the adventure directory. History files are named `scene-NNN.md` with zero-padded three-digit sequential numbering (e.g., `scene-001.md`, `scene-002.md`). World files are named `world-NNN.md` with a separate sequence. The next sequence number is determined by scanning `past/` for existing files of the matching prefix.

  Rationale: Separate sequences per file type keep the archive browsable by type. Sequential numbering preserves chronological order. Move-not-copy prevents the brief moment where two copies of the same content exist on disk.

- REQ-COMP-3: **Summarize.** The daemon sends the archived file's content to Claude Haiku with a summarization prompt (see REQ-COMP-16 through REQ-COMP-19 for prompt requirements). The summary is a standalone narrative that reads as the story record, not as a meta-description of what happened.

- REQ-COMP-4: **Save.** The summary is written as the new file (e.g., the new `history.md`). From this point, new exchanges append to it as before (REQ-MVP-16). The GM's next turn reads this file and picks up from the recap naturally.

- REQ-COMP-5: The `past/` directory is created automatically on first compaction if it does not exist. It lives inside the adventure directory alongside `history.md`, `character.md`, and `world.md`.

- REQ-COMP-6: Archived files in `past/` are player-readable markdown. Principle 1 applies to archives: the player can open any `past/scene-NNN.md` and read the verbatim transcript of that segment.

### Trigger 1: Character Threshold (System-Owned)

The daemon checks file sizes before prompt assembly on each turn. This is a safety net. It fires when neither the GM nor the player has compacted and the file is approaching context limits.

- REQ-COMP-7: Before assembling the prompt for a `query()` call, the daemon checks the character count of `history.md`. If it exceeds the configured threshold, the daemon runs compaction on `history.md` before proceeding with prompt assembly. The player's current message is not yet appended to history when this check runs.

- REQ-COMP-8: The default threshold for `history.md` is 150,000 characters. This is configurable via environment variable `HISTORY_COMPACT_THRESHOLD`. The value represents a character count, not a token count.

  Rationale: 150K characters is approximately 37,500 tokens (at ~4 chars/token for English prose). With the model's 200K token context window, this leaves roughly 160K tokens for the system prompt, adventure state, skills, and the current turn. The threshold is deliberately conservative: it's better to compact too early than to discover at prompt assembly time that the context doesn't fit. Actual tuning requires playtesting.

- REQ-COMP-9: The daemon also checks `world.md` against a separate threshold (default: 200,000 characters, configurable via `WORLD_COMPACT_THRESHOLD`). World state is denser than conversation, so the threshold is higher. If exceeded, the daemon runs compaction on `world.md` using the world-specific summarization prompt (REQ-COMP-20).

- REQ-COMP-10: If both `history.md` and `world.md` exceed their thresholds on the same turn, the daemon compacts history first, then world. Sequential, not parallel. Each compaction is an independent Haiku call.

### Trigger 2: GM Tool (AI-Owned)

The AI recognizes a natural narrative pause and calls a compaction tool. This is editorial judgment, not structural classification. The GM doesn't need to identify "this is a scene boundary." It needs to notice "we've been going for a while and this is a good moment to consolidate."

- REQ-COMP-11: The daemon exposes a `compact_history` tool to the AI via the corvran MCP server (the same server that provides `roll_dice` and `set_mood`). The tool takes no required parameters.

- REQ-COMP-12: When the AI calls `compact_history`, the daemon runs the compaction mechanism (REQ-COMP-1 through REQ-COMP-4) on `history.md`. The tool returns a confirmation message: "History compacted. Scene archived to past/scene-NNN.md." The AI can reference this in its narration or proceed silently.

- REQ-COMP-13: The GM system prompt includes guidance about when to use the compaction tool. This guidance is part of the Instructions section (alongside existing tool guidance) and reads:

  > You have a `compact_history` tool. Use it at natural pause points in the narrative: after a major confrontation resolves, when the party travels to a new location, when a significant conversation or negotiation concludes, or when the player takes a rest. You don't need to use it at every pause. Use your judgment about when the story has accumulated enough that a consolidation would help. When you use it, the current history is archived and replaced with a narrative recap. Your next response should pick up naturally from where the story left off.

  Rationale: This is the "teach, don't code" approach (Principle 2). Rather than building scene detection logic, the system explains pacing to the GM and gives it a tool to act on that understanding. The AI is already generating the narrative; it's well-positioned to judge when a consolidation point is appropriate.

- REQ-COMP-14: There is no minimum history length for the GM tool. The AI can compact a short history if it judges that appropriate (e.g., after a brief but complete encounter). The threshold trigger (REQ-COMP-7) is the safety net for growth; the GM tool is for narrative structure.

### Trigger 3: Player Button (Player-Owned)

The player can trigger compaction manually. This is the escape valve for when the AI misses a good moment, the player wants a clean break, or the player is ending a session and wants a bookmark.

- REQ-COMP-15: The daemon exposes `POST /adventures/:id/compact` to trigger manual compaction.

  Request: `{}` (empty body; no parameters needed).

  Response (success):
  ```json
  {
    "archived": "past/scene-003.md",
    "previousSize": 145230,
    "newSize": 4820
  }
  ```

  Response (nothing to compact):
  ```json
  {
    "error": "History is empty or too short to compact."
  }
  ```
  Returns HTTP 400.

  Response (adventure not found): HTTP 404.

  Response (compaction already in progress): HTTP 409 with `{ "error": "Compaction is already running for this adventure." }`

  The endpoint runs the same compaction mechanism as the other triggers (REQ-COMP-1 through REQ-COMP-4).

### Summary Quality: History

The summarization prompt is the most important implementation detail. A bad summary that drops "the innkeeper's missing daughter" breaks continuity. These requirements define the contract between the daemon and Haiku.

- REQ-COMP-16: The history summarization prompt instructs Haiku to write a narrative recap that will be saved directly as the ongoing story record. The prompt must explicitly state: "Your output will be saved as the adventure's history file. Do not include meta-commentary ('Here is a summary of...'), headers like 'Summary:', or references to the act of summarizing. Write as though you are the story's narrator recapping events for a reader who will continue the adventure from where you leave off."

- REQ-COMP-17: The prompt requires Haiku to preserve these categories of information:
  - **Character names** (all named characters who appeared, with their roles or relationships)
  - **Active quests and objectives** (what the player is trying to accomplish, including sub-goals)
  - **Unresolved tensions** (threads that were raised but not resolved: the missing daughter, the suspicious guard, the locked door)
  - **Current location** (where the player is at the end of the segment)
  - **Mechanical state changes** (level ups, significant inventory changes, HP loss, conditions acquired or cleared, if the RPG system tracks these)
  - **Key decisions the player made** (alliances formed, enemies spared, paths chosen)
  - **The emotional state of the narrative** (is the mood tense? Triumphant? Desperate? The recap should carry this forward.)

- REQ-COMP-18: The prompt instructs Haiku to structure the summary with the most recent events given the most detail. The final paragraph must clearly establish the current situation: where the player is, what they were doing, and what's immediately ahead or unresolved. The GM's next response builds on this paragraph.

- REQ-COMP-19: The prompt includes the adventure's `character.md` and `world.md` content (if they exist) as reference context, so Haiku can resolve ambiguous names, verify quest state, and maintain consistency with the canonical adventure state. These are passed as context, not as content to summarize.

### Summary Quality: World

- REQ-COMP-20: World compaction uses a different prompt than history compaction. Where history compaction replaces a transcript with a narrative recap, world compaction consolidates a reference document. The prompt instructs Haiku to: remove information that is no longer relevant (dead NPCs with no remaining plot threads, abandoned locations), consolidate duplicate or overlapping descriptions, tighten prose without losing specificity, and preserve all active quest state, living NPC details, and mechanical facts (prices, distances, faction relationships). The output should read as a clean reference document, not as a narrative.

### File Format and Directory Structure

- REQ-COMP-21: After compaction, the adventure directory structure is:

  ```
  adventure-name/
    adventure.md          # Adventure config (system, name)
    character.md          # Player character state
    world.md              # World state
    history.md            # Haiku's recap + recent exchanges since last compaction
    past/
      scene-001.md        # Full verbatim transcript, first segment
      scene-002.md        # Full verbatim transcript, second segment
      world-001.md        # Archived world state (if world compaction has fired)
  ```

- REQ-COMP-22: `history.md` after compaction contains only the Haiku-generated recap. New exchanges append after it in the same format as before (REQ-MVP-15: `**Player:** ...` / `**GM:** ...`). There is no structural marker separating the recap from new exchanges. The recap is written as prose that reads naturally followed by conversation-format exchanges.

  Rationale: Adding a marker (like `---` or `<!-- compaction boundary -->`) would be visible to the player in a way that breaks the illusion of a continuous story. The recap is written to flow into new exchanges. If the player opens history.md, it should read as "the story so far" followed by "what happened today," not as "machine summary" followed by "real conversation."

- REQ-COMP-23: Archived scene files (`past/scene-NNN.md`) contain the exact content of `history.md` at the moment of archival. No transformation, no added headers, no metadata. The file is a verbatim copy of what was in `history.md` before compaction replaced it.

  Rationale: The archive is the lossless record. Any transformation risks losing information or changing meaning. If the player wants to review exactly what happened, the archive is identical to what they would have seen in `history.md` before compaction.

### Integration with Existing Architecture

- REQ-COMP-24: Compaction runs as a service within the daemon, following the route/service split from the architecture pattern. A `CompactionService` exposes `compactHistory(adventurePath)` and `compactWorld(adventurePath)`. The adventure routes call the service; the service handles archival, Haiku calls, and file writes.

- REQ-COMP-25: The Haiku summarization call uses the same `QueryFn` interface as the session runner (see `session-runner.ts`). The compaction service receives a `queryFn` dependency via DI. No separate API client. The Agent SDK's OAuth routing applies to compaction calls the same as gameplay calls.

  The compaction `query()` call uses a minimal options set: `model: 'claude-haiku-4-5-20251001'`, `systemPrompt` (the summarization prompt), `persistSession: false`, `permissionMode: 'dontAsk'`. It does not set `cwd`, `plugins`, `tools`, `allowedTools`, or `mcpServers`. Haiku is summarizing text, not interacting with files or tools.

  Rationale: One entry point for SDK calls (architecture pattern). Compaction is an AI call like any other. Using the same `queryFn` means tests can mock compaction the same way they mock gameplay queries. The minimal options set avoids giving Haiku capabilities it doesn't need.

- REQ-COMP-26: The threshold check (REQ-COMP-7) runs in the adventure route's message handler. The full sequence for `POST /adventures/:id/message` becomes:

  1. Read adventure state (character, world, adventure.md)
  2. Read history
  3. Check history size against threshold; if exceeded, run compaction, then re-read history
  4. Check world size against threshold; if exceeded, run compaction, then re-read world
  5. Append player message to history
  6. Assemble system prompt with (possibly compacted) state + the just-appended player message
  7. Run `query()`
  8. Append GM response to history

  Note: The player message is appended (step 5) before prompt assembly (step 6) but after the threshold check (step 3). This means the threshold check does not count the player's current message. The current route implementation appends the player message early; this spec preserves that ordering. The threshold fires on the accumulated history from prior turns, not on the current turn's input.

- REQ-COMP-27: The `compact_history` MCP tool (REQ-COMP-11) is registered on the corvran MCP server alongside `roll_dice` and `set_mood`. It follows the same MCP tool definition pattern: `createCompactToolDef()` returns a tool definition, the handler calls `CompactionService.compactHistory()`. The tool's fully-qualified name (`mcp__corvran__compact_history`) must be added to the `allowedTools` array in the session runner configuration, alongside the existing `mcp__corvran__roll_dice` and `mcp__corvran__set_mood` entries. Without this, `permissionMode: 'dontAsk'` will silently deny the tool call.

- REQ-COMP-28: The `POST /adventures/:id/compact` endpoint (REQ-COMP-15) is added to the adventure routes. It reuses the same `CompactionService`. The Zod schema for the response is added to `@corvran/shared`.

### Concurrency

- REQ-COMP-29: Only one compaction may run per adventure at a time. The `CompactionService` tracks in-flight compactions by adventure ID. If a second compaction is requested (from any trigger) while one is running, it is rejected. The threshold trigger skips compaction and proceeds with the current file. The GM tool returns an error message. The player endpoint returns HTTP 409.

  Rationale: Compaction reads the full file, sends it to Haiku, and replaces it. Two concurrent compactions on the same file would race: both read the same content, both archive it, both write a summary, and one overwrites the other. The lock is per-adventure, not global. Different adventures can compact concurrently.

- REQ-COMP-30: If a player sends a message while the GM is mid-response and the GM calls `compact_history` during that response, the compaction runs inline with the GM's turn. The player's next message waits for the current turn (including compaction) to complete. This is the existing behavior for any tool the GM calls: the turn doesn't finish until all tool calls resolve.

### Web Client

- REQ-COMP-31: The adventure play view shows a "Compact" button. The button is:
  - Visible when history exists (the adventure has at least one exchange)
  - Disabled while the GM is responding (same disable logic as the input field)
  - Disabled while a compaction is in progress
  - Enabled otherwise

- REQ-COMP-32: When the player clicks "Compact," the client shows a confirmation prompt: "Archive the current history and create a recap? The full transcript will be saved in the past/ folder." On confirm, the client calls `POST /adventures/:id/compact`.

- REQ-COMP-33: While compaction is running, the client shows an inline status message (e.g., "Creating recap...") in the chat area. When compaction completes, the client refreshes the displayed history by fetching `GET /adventures/:id/history`.

- REQ-COMP-34: When the GM triggers compaction via the `compact_history` tool during a streaming response, no special UI treatment is needed. The compaction happens server-side as part of the GM's turn. The GM's response text (which streams to the client normally) may reference the compaction or may not. The client does not need to know that compaction happened mid-turn.

### Edge Cases

- REQ-COMP-35: **Mid-turn compaction with context overflow.** If the threshold check fires (REQ-COMP-7) and the Haiku summary plus the remaining prompt still exceeds the context window, the daemon returns the existing overflow error from REQ-MVP-13. Compaction reduces the problem; it does not guarantee the problem is solved. In practice, a 150K history compacted to ~5-10K should always leave room. But the error path must exist.

- REQ-COMP-36: **Very short or missing history.** If `history.md` does not exist or contains fewer than 500 characters when any trigger fires, the compaction is skipped. The threshold trigger silently proceeds. The GM tool returns "History is too short to compact." The player endpoint returns HTTP 400 with the message from REQ-COMP-15. There is nothing meaningful to summarize in a few exchanges, and a missing history file means no adventure has started.

  Rationale: Compacting a two-turn conversation would produce a summary roughly the same length as the original, with less detail. The 500-character minimum prevents wasted Haiku calls.

- REQ-COMP-37: **Player-edited history.** If the player edits `history.md` between turns (REQ-MVP-17), the next compaction operates on the edited content. The archive preserves the player's edits. The summary reflects the edited version. No special handling is needed; compaction treats the file as-is.

- REQ-COMP-38: **Daemon restart during compaction.** If the daemon restarts after archiving the file (step 1) but before writing the summary (step 3), the adventure directory will have an archived file in `past/` and an empty or missing `history.md`. On restart, the daemon does not attempt to detect or recover from partial compaction. The player sees an empty history and can recover by copying the most recent `past/scene-NNN.md` back to `history.md`. This is an acceptable failure mode for an operation that takes a few seconds and requires a daemon crash to interrupt.

  Rationale: Building crash recovery for a sub-5-second operation adds complexity disproportionate to the risk. The archive in `past/` is the safety net. The player's data is never lost, only temporarily disconnected.

- REQ-COMP-39: **Empty `past/` directory after multiple compactions.** The sequential numbering (REQ-COMP-2) monotonically increases. If the player deletes files from `past/`, the next compaction does not reuse their numbers. Numbering is based on the highest existing number plus one, not on gap detection.

- REQ-COMP-40: **Tool use artifacts in history.** The MVP spec (REQ-MVP-16) says the daemon weaves tool results into the GM's response as natural language before appending to history. Archived transcripts should already read naturally. The Haiku summarization prompt does not need special handling for tool invocations. If raw tool syntax somehow appears in history (a bug), Haiku should treat it as noise and summarize the meaningful content around it.

- REQ-COMP-41: **Haiku unavailability during threshold trigger.** If the Haiku summarization call fails (network error, timeout, API error) during the threshold-triggered compaction path (REQ-COMP-7), the daemon reverses the archive (moves the file back from `past/` to its original location) and proceeds with the original file. The player's turn continues with the un-compacted history. This may result in a context overflow error (REQ-MVP-13) if the history is large enough, but that error is preferable to hanging the request. The compaction service should set a timeout of 60 seconds on the Haiku call. For the player-triggered and GM-triggered paths, the failure is surfaced directly: the player endpoint returns HTTP 500 with `{ "error": "Compaction failed: <reason>" }`, and the GM tool returns an error message.

## Incremental Delivery

This spec is designed for phased implementation. Each phase is independently useful.

**Phase 1: Compaction mechanism and threshold trigger.** The `CompactionService`, the archive-summarize-save pipeline, and the threshold check in the message handler. This replaces REQ-MVP-13's error-and-edit failure mode with automatic compaction. No UI changes, no GM tool.

**Phase 2: Player button.** The `POST /adventures/:id/compact` endpoint and the web client button. Gives the player manual control.

**Phase 3: GM tool.** The `compact_history` MCP tool and the system prompt guidance. Gives the AI editorial judgment over compaction timing.

Phase 1 removes the wall. Phase 2 gives the player control. Phase 3 makes compaction narratively intelligent. Each phase can ship and be playtested independently.

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Scene-based hybrid | Compaction stabilizes, scene detection becomes desirable | [STUB: scene-based-history] Evolution from Approach 2 to Approach 3 per conversation-history brainstorm. The archive structure (`past/scene-NNN.md`) is forward-compatible. |
| Mythic-style scene transitions | Scene boundaries become gameplay mechanics | [STUB: scene-transitions] The research identifies Mythic GME's altered/interrupted scene mechanic as the strongest design pattern for turning compaction into a gameplay feature. |
| World compaction tuning | Play sessions long enough to stress `world.md` | Adjust `WORLD_COMPACT_THRESHOLD` and the world summarization prompt based on real data. |

## Success Criteria

These criteria mix automated checks and human judgment. Criteria 1 and 3-5 are verifiable by test. Criteria 2 and 6 require a playtest session with a human reading the output, same as the MVP spec's playability criteria.

- A player can play a 4+ hour session without hitting a context overflow error. The threshold trigger fires automatically and the adventure continues with no player intervention.
- After automatic compaction, the GM's next response is narratively coherent with the adventure so far. The player does not feel like the GM "forgot" what happened. (Playtest criterion.)
- The player can click "Compact" between turns. The history is archived, a recap appears, and the next turn builds on the recap.
- The GM uses the `compact_history` tool at narratively appropriate moments during extended play. The compaction lands at a pause point, not mid-action.
- Archived transcripts in `past/` are readable markdown. The player can open any `scene-NNN.md` and read the verbatim transcript.
- After compaction, `history.md` reads as a continuous story: the recap flows into new exchanges without visible seams. (Playtest criterion.)

## AI Validation

**Defaults** (apply to all implementation work):
- Unit tests with mocked dependencies (file I/O, `queryFn`)
- Integration tests for daemon endpoints using Hono's `app.request()` test client
- Code review by fresh-context sub-agent

**Custom**:
- **Compaction pipeline test:** Create a `history.md` with known content, run compaction, verify: (1) original moved to `past/scene-001.md` with exact content, (2) `history.md` replaced with Haiku output, (3) `past/` directory created if needed.
- **Threshold trigger test:** Create a `history.md` exceeding the threshold, send a message, verify compaction ran before prompt assembly (check that the prompt contains the recap, not the original history).
- **Sequential numbering test:** Run compaction three times, verify files are `scene-001.md`, `scene-002.md`, `scene-003.md`. Delete `scene-002.md`, run again, verify next file is `scene-004.md` (not `scene-002.md`).
- **Concurrency test:** Start two compactions on the same adventure simultaneously. Verify only one runs; the other is rejected.
- **Short history test:** Set history to < 500 characters, attempt compaction, verify it is skipped with appropriate response.
- **Player endpoint test:** Call `POST /adventures/:id/compact`, verify response includes `archived`, `previousSize`, and `newSize`. Verify the archived file exists and the new history is shorter.
- **MCP tool test:** Mock a `query()` call where the AI invokes `compact_history`. Verify the compaction runs and the tool returns the confirmation message.

## Constraints

- Agent SDK only. Haiku calls go through the same `queryFn` as gameplay (architecture pattern).
- All state in markdown files (Principle 1). Archives, summaries, and working files are all player-readable markdown.
- No SDK session resume. Every turn is a fresh `query()` (REQ-MVP-10). Compaction operates on files, not sessions.
- No formal scene detection. The GM tool relies on AI judgment, not programmatic boundary detection.
- Compaction of `history.md` is the primary scope. World compaction (`world.md`) uses the same mechanism with different parameters but is expected to fire rarely.

## Context

- `.lore/brainstorm/compaction-system.md`: Design rationale for the three-trigger model and the archive-summarize-save mechanism.
- `.lore/brainstorm/conversation-history.md`: Established Approach 2 (file-based history) as the MVP foundation and Approach 3 (scene-based hybrid) as the evolution target.
- `.lore/research/scene-boundaries.md`: Research showing why formal scene detection is unreliable and how TTRPG systems, interactive fiction, and AI narrative systems handle scene boundaries. Informed the decision to use AI judgment rather than programmatic detection.
- `.lore/specs/mvp.md`: Current system this builds on. REQ-MVP-13 (context overflow error), REQ-MVP-14 through REQ-MVP-17 (history format and management).
- `.lore/_archive/adventure-engine-v1-spec.md`: Prior art. REQ-RC-1 through REQ-RC-14 described a mechanical compaction system. This spec selectively adopts thresholds and the player button, rejects JSON archives, retained entry counts, and mechanical scene detection.
