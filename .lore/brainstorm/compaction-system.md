---
title: Compaction System Design
date: 2026-03-31
status: resolved
tags: [compaction, history, context-management, narrative, haiku, tools]
modules: [backend]
related: [.lore/brainstorm/conversation-history.md, .lore/specs/mvp.md, .lore/issues/recap-and-history-compaction.md, .lore/_archive/adventure-engine-v1-spec.md]
---

# Brainstorm: Compaction System Design

## Context

The MVP spec (REQ-MVP-13) defers compaction with an honest failure mode: when history exceeds the context window, the player gets an error and edits the file. The conversation history brainstorm recommended Approach 2 (file-based history, system-owned) specifically because it creates the right foundation for compaction later. "Later" is now.

Two prior designs exist. The archived V1 spec (REQ-RC-1 through REQ-RC-14) described a mechanical system: character-count thresholds, JSON archives, Haiku summaries, retained entry counts, frontend recap buttons with confirmation dialogs. The conversation history brainstorm's Approach 3 described a narrative system: scene boundaries as compaction points, scene summaries as story artifacts, world state checkpoints. Both solve the same problem (context growth) but disagree on where the intelligence lives.

This brainstorm rejects the binary choice. The V1 spec's scene detection problem ("what is a scene?") has no clean programmatic answer: location-based breaks when two conversations happen in the same room, event-based requires knowing when events "resolve," player-declared adds friction, AI-detected is fragile. But the V1 spec's purely mechanical approach (compact at 100K characters, retain 20 entries) ignores narrative structure entirely.

The design that emerged: don't detect scenes. Give the GM the concept of narrative pacing and a tool to act on it. Use the character threshold as a safety net. Give the player a button for manual control. Three triggers, one mechanism.

## Ideas Explored

### Three Triggers, One Mechanism

The core insight is that compaction is a generic operation ("this file is too big, condense it") with three different owners who notice at different times:

**Character threshold (system-owned).** A safety net. The daemon checks file size before prompt assembly. If `history.md` exceeds the configured limit, it fires compaction before the next query. This is the V1 spec's REQ-RC-1/RC-2 idea, stripped of the JSON archiving and retained-entry-count machinery. The threshold fires when nothing else has. The compaction it produces won't land on a narrative boundary, but it prevents context overflow.

**GM tool (AI-owned).** The GM recognizes a natural pause in the narrative and calls a compaction tool. It doesn't need to classify "this is a scene boundary" formally. It just needs to notice "we've been going for a while, this is a good moment to consolidate." This is a lighter cognitive load than scene detection: it's editorial judgment, not structural classification. Claude is good at this when the system prompt explains narrative pacing and story structure (which is good GM guidance regardless of compaction).

**Player button (player-owned).** The player knows when they feel lost, want a fresh start, or want to bookmark a natural stopping point. This is REQ-RC-10 from the V1 spec, and it's the right idea independent of the other two triggers. A confirmation dialog (REQ-RC-11) is reasonable UX since compaction is a significant action.

### What Compaction Does

When any trigger fires on `history.md`:

1. **Archive.** Move `history.md` to `past/scene-NNN.md` (zero-padded sequential numbering). The `past/` directory lives inside the adventure directory. This preserves the full verbatim transcript. The player can read any past scene.

2. **Summarize.** Call Haiku with the archived scene file. The prompt must be explicit: the output will be saved directly as the ongoing story record. No meta-commentary ("Here's a summary of..."), no hedging ("I'll compact this for you"), no framing. Haiku writes narrative prose that reads as the story so far. The prompt should instruct: character names, active quests, unresolved tensions, current location, and the emotional state of the narrative.

3. **Save.** Write Haiku's output as the new `history.md`. From this point, new exchanges append to it as before (REQ-MVP-16). The GM's next turn reads this file as conversation history and picks up from the recap naturally.

The adventure directory after a few compactions:

```
adventure-name/
  adventure.md
  character.md
  world.md
  history.md          # Haiku's recap + recent exchanges since last compaction
  past/
    scene-001.md      # Full verbatim transcript, first segment
    scene-002.md      # Full verbatim transcript, second segment
```

### Generic Mechanism, Different Parameters

The same compaction machinery works for `world.md`. The difference is the ratio.

`history.md` compacts aggressively: a 200K transcript becomes a narrative recap of maybe 5-10K. The archived original in `past/` preserves everything. The point is to reset context while keeping the story coherent.

`world.md` compacts gently: trim redundancy, consolidate overlapping descriptions, remove details that are no longer relevant. A 200K `world.md` might compact to 100K, not 10K. The threshold can be higher than history's because world state is denser (less conversational padding). Different parameters, same mechanism:

1. Archive original to `past/world-NNN.md`
2. Call Haiku to consolidate
3. Save result as new `world.md`

In practice, `world.md` probably rarely needs this. An adventure would have to run for a very long time before world state alone gets unwieldy. But having the mechanism means it's not a wall if it does.

### Why Teaching Story Structure to the GM Matters

Even without compaction, explaining narrative pacing to the GM improves play quality. A GM that understands rising action, scene beats, and transitions naturally creates moments where compaction fits. The compaction tool gives the GM a way to act on that understanding.

This means the system prompt should include guidance about story structure regardless. Compaction is a side benefit of good GMing, not a separate system bolted on top. The GM tool for compaction is the bridge: "you understand pacing, here's a tool to use at natural pause points."

### What the Haiku Prompt Needs to Say

The summarization prompt is the most important implementation detail. It determines whether the player's next session feels continuous or disjointed. Key constraints:

- **Output is the record.** "Write a narrative recap of this adventure segment. Your output will be saved directly as the story record. Do not include meta-commentary, headers like 'Summary:', or references to summarizing. Write as though you are continuing the story's narration."
- **Preserve specifics.** "Retain all character names, location names, active quests, unresolved threads, and the current situation. A reader should be able to continue the adventure from your recap without losing context."
- **Tone match.** The recap should read like the adventure's voice, not like a book report. If the adventure has been darkly comic, the recap should be darkly comic.
- **End state is paramount.** The final paragraph must clearly establish where the player is, what they were doing, and what's unresolved. The GM's next response builds on this.

## Open Questions

1. **What are the right default thresholds?** The V1 spec used 100K characters. The MVP context window is 200K tokens (or 1M with the beta flag). Characters and tokens aren't 1:1. A threshold that's too low creates unnecessary compactions; too high risks hitting the context limit before the safety net fires. Needs empirical testing with real play sessions.

2. **Should the GM tool take parameters?** A bare "compact now" is simplest. But should the GM be able to say "compact, but make sure to preserve the negotiation with the merchant"? Guidance in the compaction prompt might be valuable. Or it might be over-engineering for the first iteration.

3. **What happens to tool use in the archived transcript?** The MVP spec (REQ-MVP-16) says the daemon weaves tool results into the GM's response as natural language before appending. So `past/scene-NNN.md` should already read naturally. But if raw tool invocations somehow end up in history, the Haiku summarization prompt needs to handle them gracefully.

4. **Sequential numbering across both file types.** Should `past/` use separate sequences (`scene-001.md`, `scene-002.md` for history; `world-001.md`, `world-002.md` for world)? Or a single global sequence? Separate sequences are simpler to reason about and make the archive browsable by type.

5. **Should the frontend show compaction happening?** The V1 spec had REQ-RC-13 (recap in-progress indicator) and REQ-RC-9 (tool status bar). Some feedback is needed when the player triggers it via button. When the GM triggers it mid-session, should the player see "compacting..." or should it be invisible? Invisible is smoother but the pause might confuse the player.

6. ~~**Haiku model availability.**~~ Confirmed available. No separate API path needed.

## Next Steps

This brainstorm is ready to inform a spec. The design questions are settled: three triggers, generic archive-summarize-save mechanism, Haiku for summarization, `past/` directory for archives. The open questions are implementation-level details that belong in the spec, not the brainstorm.

The spec should reference:
- This brainstorm for the design rationale
- The conversation history brainstorm for the Approach 2 foundation
- The MVP spec (REQ-MVP-13 through REQ-MVP-17) for the current history system it builds on
- The V1 spec's REQ-RC section for the ideas it selectively adopts (thresholds, player button) and rejects (JSON archives, retained entry counts, mechanical compaction)
