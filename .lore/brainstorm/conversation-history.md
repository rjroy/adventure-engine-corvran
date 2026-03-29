---
title: Conversation History for Adventure Engine MVP
date: 2026-03-28
status: open
tags: [conversation-history, mvp, agent-sdk, state-management, architecture]
related: [.lore/vision.md, .lore/brainstorm/mvp-scope.md, .lore/reference/architecture-pattern.md]
---

# Brainstorm: Conversation History

## Context

The MVP scope brainstorm deferred conversation history as "warrants its own brainstorm." The question is how the adventure's conversation persists, both within a play session and across sessions. Three approaches are on the table, each with different tradeoffs around simplicity, player visibility, and long-term viability.

### Constraints

- **Architecture**: Claude Agent SDK only. No raw API client, no other LLM libraries (architecture-pattern.md).
- **MVP bar**: The simplest thing worth playing. But "simplest" includes not hitting a wall after 30 minutes of play.
- **Principle 1**: Markdown is memory. The player should be able to read their adventure history.

### What the Agent SDK Actually Does

Before comparing approaches, here's what the SDK provides (verified against `@anthropic-ai/claude-agent-sdk` v0.1.77 type definitions):

- **Session persistence**: On by default (`persistSession: true`). Sessions write to `~/.claude/projects/` and survive process restarts. Resume by session ID.
- **Auto-compaction**: The SDK compacts conversation history automatically when it approaches context limits. Emits `SDKCompactBoundaryMessage` with pre/post token counts. The `SessionStart` hook fires with `source: 'compact'` when compaction triggers a new internal context.
- **Resume at point**: `resumeSessionAt` lets you resume up to a specific message UUID, not just the latest state. `forkSession` creates a new session ID from a resume point.
- **Budget controls**: `maxTurns`, `maxBudgetUsd`, `maxThinkingTokens` all cap resource usage.
- **No expiration**: No documented session lifetime. Sessions persist on disk indefinitely and can be resumed at any time.
- **1M context beta**: `context-1m-2025-08-07` beta flag enables 1M token context for Sonnet models.

This is load-bearing context. The SDK already solves several problems we might otherwise build ourselves.

## Ideas Explored

### Approach 1: Agent SDK Resume (Let Claude Manage It)

The session never closes for the duration of the adventure. The daemon creates a session on first play, stores the session ID in the adventure directory, and resumes it on every subsequent connection. Claude maintains the full conversation history internally.

#### Answering: "We never close the session for the adventure. Is this bad?"

No. This is how the SDK is designed to work. Here's what actually happens:

**Token limits**: The SDK auto-compacts when the context window fills. The conversation doesn't crash or truncate; the SDK summarizes older context and continues. The player doesn't notice because compaction is internal to the SDK. With the 1M context beta on Sonnet, you'd get substantial play before the first compaction.

**Cost**: The Agent SDK routes through Claude Code's OAuth. There is no per-token billing. Cost is effectively zero for the API calls themselves (it's part of the Claude Code subscription). This removes the strongest argument against long sessions. In a raw API world, replaying a growing history on every turn would be expensive. Here it isn't.

**Context window pressure**: Auto-compaction handles this. The real question is whether compaction preserves narrative quality. The SDK compacts for code context (what files were read, what changes were made). It may or may not preserve the nuance of "the innkeeper mentioned her missing daughter in scene two." This is an unknown we can only answer by playing.

**Daemon restart**: Sessions persist to disk at `~/.claude/projects/`. The daemon stores the session ID in the adventure directory (a simple file). On restart, it reads the ID and calls `unstable_v2_resumeSession(sessionId, options)`. The conversation continues where it left off. This is not a theoretical path; it's the SDK's documented resume flow.

**Practical ceiling**: No documented expiration. The ceiling is disk space for session storage (likely negligible) and whether compaction degrades narrative quality over very long adventures. A one-evening adventure (the MVP target) is unlikely to hit either limit.

#### Tradeoffs

**Strengths:**
- Simplest implementation. Create session, store ID, resume on reconnect. Maybe 20 lines of session management code.
- Auto-compaction is free. No compaction logic to write or maintain.
- Proven infrastructure. This is the same mechanism Claude Code uses for its own conversations.
- Fastest to "playing." You could have this working in an afternoon.

**Weaknesses:**
- **Principle 1 violation.** The conversation lives in the SDK's internal format at `~/.claude/projects/`. The player cannot open a markdown file and read their adventure history. This is the single biggest problem with this approach.
- **Compaction is a black box.** The SDK decides what to keep and what to summarize. It optimizes for code assistance context, not narrative context. "The bridge collapsed in scene three" might get compacted away if the SDK doesn't recognize it as important.
- **No narrative artifacts.** The adventure produces no readable record. When the player finishes, there's nothing to look back on. The story happened in a terminal and left no trace the player can hold.
- **Session storage location.** Sessions live in `~/.claude/projects/`, which is Claude Code's domain. The adventure engine doesn't control this path. If Claude Code cleans up old sessions, adventure history disappears.

#### The Principle 1 Problem Has a Partial Fix

The daemon could append each exchange to a markdown file as a side-effect. Player sends message, daemon writes it to `history.md`. AI responds, daemon appends that too. The SDK still owns the "real" context, but the player gets a readable log.

This is a read-only mirror, not the source of truth. The player can read it but editing it changes nothing (the SDK's internal state is what matters). That's a weaker form of Principle 1 than "all state lives in markdown files," but it might be good enough for the MVP if we're honest about the limitation.

### Approach 2: File-Based History (System Manages It)

Every exchange is appended to a markdown file. On each new player message, the daemon reads the history file, assembles it into context, and sends it as a new (non-resumed) SDK query. The system owns the full conversation history.

#### Answering: "Compaction is now the system's problem, but is that a feature and not a problem?"

Yes, for three reasons.

**Reason 1: Narrative-aware compaction.** The SDK compacts for code context. A system that owns its own compaction can compact for narrative context. "Summarize the story so far, preserving character names, active quests, unresolved tensions, and the current location" is a fundamentally different compaction prompt than whatever the SDK uses internally. The system can keep the last N exchanges verbatim and summarize everything before them, preserving the feel of an ongoing conversation while managing context size.

**Reason 2: Player-readable history.** The history file IS the adventure record. The player can open it, read it, share it, edit it. Principle 1 is satisfied natively, not as a side-effect mirror.

**Reason 3: Player-editable history.** If the player edits the history file (corrects a misunderstanding, removes a tangent, adds a note), the next turn picks up those edits. The conversation is a living document, not a sealed log. This is Principle 1 at its strongest: the shared medium between AI, developer, and player.

#### What Prompt Assembly Looks Like

Each turn, the daemon builds a prompt from layers:

1. **System prompt**: GM identity, principles, behavioral constraints
2. **Skills/plugins**: Referenced via Agent SDK skill paths (corvran/gm-craft, d20-system, etc.), not inlined
3. **Adventure state**: `character.md` and `world.md` from the adventure directory, loaded as context
4. **Conversation history**: The full (or compacted) contents of `history.md`
5. **Current message**: The player's latest input

The SDK call is a fresh `query()` each time (not `resume`). The conversation context is reconstructed from files on every turn. This is the "stateless request" pattern: each query is self-contained.

#### Failure Modes

**History file grows unbounded.** Without compaction, the history file eventually exceeds the context window. The daemon needs a compaction strategy before the adventure hits this limit. For a one-evening MVP, this might not matter (200K tokens is a lot of conversation). But it's a wall, and the wall is real.

**Compaction quality.** When the daemon summarizes older exchanges, narrative details will be lost. The question is which details and whether the player notices. A bad summary that drops "the innkeeper's missing daughter" breaks continuity. A good summary that preserves it is indistinguishable from full context. The quality of the compaction prompt is the entire game here.

**No SDK auto-compaction safety net.** If the assembled prompt exceeds the context window, the query fails. The SDK's auto-compaction only works on sessions it manages. The daemon must handle this itself: measure the assembled context, compact if too large, retry.

**Prompt assembly cost.** Each turn sends the full history as context. With the Agent SDK's OAuth billing model (no per-token cost), this is not a financial problem. But it is a latency problem: larger context means slower responses. The player waits longer as the adventure progresses.

**Loss of SDK features.** No `resumeSessionAt` (can't rewind to a specific turn via the SDK). No `forkSession` (can't branch the narrative at a decision point via the SDK). These features would need to be rebuilt on the file layer. For the MVP, neither is needed. But they're capabilities you give up.

#### Tradeoffs

**Strengths:**
- Full Principle 1 compliance. The history file is the story.
- Narrative-aware compaction is possible (and is genuinely an advantage over the SDK's generic compaction).
- Player can read, edit, and share their adventure history.
- The system controls its own context. No dependence on SDK internals.

**Weaknesses:**
- More implementation work. Prompt assembly, context measurement, compaction triggering, compaction prompting.
- Every turn is a fresh query. No conversational continuity at the SDK level (though the history in the prompt provides continuity at the content level).
- Compaction is a real problem to solve, not a deferred one. The "feature not a problem" framing is true, but it's still work.
- Latency increases with history length. The player's experience degrades gradually.

### Approach 3: Scene-Based Hybrid

Use Agent SDK resume within a scene. When a scene ends, the system summarizes the scene to a file, updates world state (`world.md`), and starts the next scene as a fresh session with the summary as context.

#### Answering: "Does this even make sense?"

It makes sense as a destination, but it requires answering "what is a scene?" and that answer shapes everything downstream.

**What a scene could be:** A location-bounded narrative unit. "You're in the tavern" is one scene. When you leave, the tavern scene ends, gets summarized, and "you're on the road" begins as a new scene. Or it could be event-bounded: "the negotiation with the merchant" is a scene that ends when the negotiation resolves, regardless of location.

**The unique benefits are real:**

- **Natural compaction boundaries.** Scene transitions are where humans naturally expect context to shift. "Let me tell you what happened in the tavern" is a natural summary. "Let me summarize turns 1-47 of your conversation" is not.
- **Scene summaries as narrative artifacts.** Each scene produces a readable summary. The adventure's history becomes a series of scene records, each one a self-contained narrative beat. This is better than a single growing history file because it mirrors how stories are structured.
- **World state checkpoints.** At each scene boundary, `world.md` is updated. You can see the world evolve scene by scene. If something goes wrong, you can revert to a specific scene's world state.
- **Context is always fresh.** Each scene starts with a clean context: scene summary, world state, character sheet, current situation. No accumulated noise from 45 minutes of conversation. The AI performs better with focused context than with a sprawling history.

**The decomposition question:** Is this an entire system? It decomposes into: (a) scene detection (when does a scene end?), (b) scene summarization (compress a scene into a narrative beat), (c) world state update (what changed?), (d) session handoff (start fresh with new context). Each of these is a bounded problem. But (a) is the hard one, because it requires the AI to recognize scene boundaries, or the system to impose them.

#### Answering: "Could we start with one of the others and move here later?"

Yes. This is the critical migration question.

**From Approach 1 to Approach 3:** Hard. Approach 1 stores history in the SDK's internal format. There's no structured history to decompose into scenes. You'd need to extract the conversation from the SDK's session storage, parse it, and retroactively identify scene boundaries. Migration is a rewrite.

**From Approach 2 to Approach 3:** Natural. Approach 2 already has a history file the system owns. Adding scene boundaries means: (a) detect when a scene ends, (b) summarize everything since the last boundary, (c) archive the scene summary, (d) start a fresh query with the summary context. The history file becomes the scene's working memory. The archived summaries become the adventure's long-term memory. The prompt assembly from Approach 2 evolves rather than gets replaced.

This is the strongest argument for Approach 2 as the MVP starting point: it's the one that migrates cleanly to Approach 3.

#### Tradeoffs

**Strengths:**
- Best narrative artifacts (scene summaries are the story's chapters).
- Best context quality (fresh context per scene, no accumulated noise).
- Natural compaction that mirrors story structure.
- World state checkpoints at meaningful boundaries.

**Weaknesses:**
- Most implementation work. Scene detection alone is a design problem.
- "What is a scene?" is load-bearing and not obvious. Location-based? Event-based? Player-declared? AI-detected? Each answer creates different behavior.
- For the MVP, this is over-built. The one-evening adventure might be one or two scenes. The machinery to manage scene transitions costs more than it saves at that scale.
- Requires either the AI to reliably detect scene boundaries (fragile) or the player to declare them (friction).

## Synthesis

### The Real Question

The three approaches differ on two axes:

| | System owns history | SDK owns history |
|--|--|--|
| **Player can read history** | Approach 2, 3 | Approach 1 + mirror |
| **Player can edit history** | Approach 2, 3 | No |

The token management question ("what happens when context fills up?") has the same answer in all three cases: something compacts. The difference is who compacts and whether the compaction is narrative-aware.

The Principle 1 question ("can the player read and edit their adventure?") is the real differentiator. Approach 1 violates it natively and can only partially restore it with a read-only mirror. Approaches 2 and 3 satisfy it by design.

### The MVP Recommendation

**Start with Approach 2 (file-based history). Defer compaction.**

Here's why:

1. **Principle 1 is non-negotiable.** The vision says "all game-meaningful state lives in markdown files." The conversation is the most game-meaningful state there is. A read-only mirror (Approach 1's partial fix) is not the same as a living document the player owns.

2. **Compaction isn't needed for the MVP.** A one-evening adventure in a 200K token context window (or 1M with the beta) is unlikely to hit the limit. Build prompt assembly, skip compaction, and add compaction when real play sessions prove it's needed. "Defers compaction" is already in the MVP scope brainstorm's deferral list.

3. **Migration to Approach 3 is clean.** When the engine grows beyond one-evening adventures, scene-based history is a natural evolution of file-based history. The history file becomes the scene's working memory. Scene summaries become the long-term memory. Prompt assembly evolves; it doesn't get replaced.

4. **Approach 1 is faster to build but harder to evolve.** The 20-line session management is appealing, but it creates a dependency on SDK internals for the most important piece of game state. Moving from "SDK owns history" to "system owns history" later is a rewrite, not a refactor.

5. **The cost model removes Approach 2's historic weakness.** In a per-token billing model, replaying full history on every turn is expensive. Under the Agent SDK's OAuth model, it's free. The main argument against file-based history has disappeared.

### What "Start with Approach 2" Looks Like

Minimum implementation:

- `history.md` in the adventure directory. Markdown formatted conversation log.
- On player message: append to `history.md`, assemble prompt (system + skills + state + history + message), send as fresh `query()`.
- On AI response: append to `history.md`.
- No compaction. No summarization. No scene boundaries. Just a growing file.

That's it for the MVP. The player can read their adventure. The system owns the context. And when compaction becomes necessary, we own the problem and can solve it with narrative awareness.

## Open Questions

1. **What format should `history.md` use?** Options: raw transcript (player/GM labels), structured markdown (headers per exchange, timestamps), or something in between. The format needs to be readable by humans AND parseable by the prompt assembly layer. Simpler is better for the MVP but the format is hard to change later if adventures already exist.

2. **Does the SDK's auto-compaction quality actually degrade narrative context?** We assumed it does (it's optimized for code), but nobody has tested it with narrative content. A quick experiment (run a 30-minute adventure on Approach 1, check if narrative details survive compaction) would answer this definitively and might change the calculus.

3. **How does prompt assembly interact with the skill reference pattern?** The MVP scope brainstorm says RPG system docs are integrated "by referencing the skill, not by full integration." If skills are referenced by path, the SDK resolves them. But conversation history isn't a skill. How does the history file get into the prompt? Inlined as a user message? As a system prompt section? As a file the SDK can read via tools? Each has different implications for context budget.

4. **What happens when `history.md` is edited mid-session?** If the player edits the file between turns, the next prompt picks up the edit. But what if they edit it while the AI is responding? The daemon needs to decide when to read the file (before sending the query, not during streaming). This is simple but should be explicit.

5. **Should the history file include AI tool use?** When the AI rolls dice or reads a character sheet, does that go in `history.md`? Including it gives the player a complete record. Excluding it keeps the file focused on narrative. A middle ground: include the result ("Rolled 14 + 3 = 17, success") but not the tool invocation mechanics.

6. **Is there a way to give the SDK custom compaction instructions?** The `PreCompactHookInput` type includes `custom_instructions: string | null`. If we could tell the SDK "when compacting, preserve character names, active quests, and unresolved narrative threads," Approach 1 becomes significantly more viable. Worth investigating but not blocking.

## Next Steps

This brainstorm is ready to inform the MVP spec. The recommendation (Approach 2, defer compaction) should be validated against the spec's requirements when they're written. The open questions, particularly #1 (history format) and #3 (prompt assembly for history), need answers before implementation.
