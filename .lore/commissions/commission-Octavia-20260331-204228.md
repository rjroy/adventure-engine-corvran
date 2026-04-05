---
title: "Commission: Spec: Compaction System for Adventure Engine"
date: 2026-04-01
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "## Task\n\nWrite a specification for the adventure engine's compaction system. Output to `.lore/specs/compaction-system-spec.md`.\n\n## Inputs\n\nRead these two documents thoroughly before writing:\n\n1. **`.lore/research/scene-boundaries.md`** — Verity's research on how TTRPGs, interactive fiction, and AI narrative systems define and detect scene boundaries.\n2. **`.lore/brainstorm/compaction-system.md`** — Brainstorm exploring compaction approaches, tradeoffs, and open questions.\n\nAlso read for architecture context:\n- **`.lore/brainstorm/conversation-history.md`** — The original brainstorm that established Approach 2 (file-based history) as the MVP foundation and Approach 3 (scene-based hybrid) as the evolution target.\n- **`CLAUDE.md`** — Current architecture and project conventions.\n- **`.lore/vision.md`** — Project vision and principles (especially Principle 1: markdown is memory).\n\n## What the Spec Should Cover\n\n1. **Scene boundary definition**: Drawing from the research, define what constitutes a scene boundary in Corvran. Be concrete. If multiple trigger types coexist, specify how they interact and which takes precedence.\n\n2. **Compaction trigger**: When does compaction fire? Token count threshold? Scene boundary detection? Both? Define the mechanism.\n\n3. **Compaction process**: What happens during compaction? What gets summarized, what's preserved verbatim, what gets archived? Define the data flow from \"history.md is too long\" to \"history.md is manageable again.\"\n\n4. **Summary quality requirements**: What must a scene summary preserve? Character names, quest state, unresolved tensions, location, mechanical state? Define the contract.\n\n5. **File format**: How do scene summaries relate to history.md? Do they live in separate files? Inline in history.md with markers? Define the file structure.\n\n6. **Integration with existing architecture**: How does this connect to the current prompt assembly pipeline? The daemon's query flow? The adventure directory structure?\n\n7. **Edge cases**: Mid-scene compaction (context window full but no scene boundary), very short scenes, player-edited history files, daemon restart during compaction.\n\n## Constraints\n\n- Must be compatible with Approach 2 (file-based history) as it exists today\n- Must satisfy Principle 1 (all state in markdown, player-readable)\n- Must not require the SDK's session resume (we use fresh queries per turn)\n- The spec should be implementable incrementally (scene detection can ship before auto-compaction)\n\n## Style\n\nWrite requirements as testable statements (REQ-COMP-N format). Include rationale for non-obvious decisions. Keep it concrete enough that a developer could implement from it without asking clarifying questions."
dependencies:
  - commission-Verity-20260331-202258
linked_artifacts:
  - .lore/specs/compaction-system-spec.md

resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-04-01T03:42:28.875Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-01T03:42:28.878Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-01T03:47:04.211Z
    event: status_failed
    reason: "Session error: Claude Code returned an error result: You've hit your limit · resets Apr 2, 8pm (America/Los_Angeles)"
  - timestamp: 2026-04-03T03:30:01.070Z
    event: status_pending
    reason: "Redispatched for retry"
    from: "failed"
    to: "pending"
  - timestamp: 2026-04-03T03:30:01.072Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T03:30:01.169Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T03:30:09.138Z
    event: progress_report
    reason: "Reading input documents: research, brainstorms, vision, and architecture context."
  - timestamp: 2026-04-03T03:30:58.199Z
    event: progress_report
    reason: "All input documents read. Now checking existing spec conventions and loading the specify skill for structure guidance."
  - timestamp: 2026-04-03T03:31:14.458Z
    event: progress_report
    reason: "Drafting the compaction system spec. All inputs consumed: scene-boundaries research, compaction brainstorm, conversation history brainstorm, MVP spec, architecture pattern, and current implementation."
  - timestamp: 2026-04-03T03:36:34.016Z
    event: progress_report
    reason: "Spec written and refined based on fresh-context review. Addressed all priority findings: clarified message handler sequence ordering, added allowedTools requirement for MCP tool, specified minimal options set for Haiku calls, added Haiku timeout/failure handling, clarified missing-file edge case, and marked playtest criteria explicitly."
  - timestamp: 2026-04-03T03:36:54.481Z
    event: result_submitted
    reason: "Wrote the compaction system spec at `.lore/specs/compaction-system-spec.md`.\n\n**What the spec defines:**\n\n41 requirements (REQ-COMP-1 through REQ-COMP-41) covering:\n\n- **Three triggers, one mechanism**: System threshold (safety net at 150K chars), GM tool (AI editorial judgment at narrative pauses), player button (manual control). All three run the same archive-summarize-save pipeline.\n- **Compaction process**: Move current file to `past/scene-NNN.md`, call Haiku with summarization prompt, write recap as new `history.md`. World compaction uses the same mechanism with different parameters.\n- **Summary quality contract**: Seven categories of information Haiku must preserve (character names, active quests, unresolved tensions, location, mechanical state, key decisions, emotional tone). Recent events get more detail. Final paragraph establishes current situation.\n- **File structure**: `past/` directory with sequential numbering, separate sequences for history and world archives. Archives are verbatim copies, no transformation.\n- **Integration**: CompactionService following route/service split with DI. Uses same QueryFn interface with minimal options (Haiku model, no tools/plugins). compact_history MCP tool on corvran server with allowedTools registration. Message handler sequence clarified with ordering note.\n- **Edge cases**: Mid-turn overflow, short history minimum (500 chars), missing history file, player-edited files, daemon restart during compaction, Haiku unavailability with 60s timeout and archive rollback.\n- **Incremental delivery**: Phase 1 (mechanism + threshold), Phase 2 (player button), Phase 3 (GM tool). Each independently useful.\n\n**Design decisions:**\n- No formal scene detection. Research shows F1=0.24 for automated detection and 70% human agreement. The GM gets pacing guidance and a tool, not a classification algorithm.\n- No structural markers in history.md after compaction. The recap reads as continuous narrative flowing into new exchanges.\n- Threshold check runs before player message is appended, preserving current route ordering.\n\n**Review pass**: Fresh-context spec reviewer caught three priority issues (message handler sequence vs. actual route code, missing allowedTools entry, underspecified QueryFn options) and four minor issues (Haiku timeout, missing-file case, playtest criteria honesty, recap-to-exchange transition clarity). All addressed in the final spec."
  - timestamp: 2026-04-03T03:36:59.027Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Spec written and refined based on fresh-context review. Addressed all priority findings: clarified message handler sequence ordering, added allowedTools requirement for MCP tool, specified minimal options set for Haiku calls, added Haiku timeout/failure handling, clarified missing-file edge case, and marked playtest criteria explicitly."
projectName: corvran
---
Wrote the compaction system spec at `.lore/specs/compaction-system-spec.md`.

**What the spec defines:**

41 requirements (REQ-COMP-1 through REQ-COMP-41) covering:

- **Three triggers, one mechanism**: System threshold (safety net at 150K chars), GM tool (AI editorial judgment at narrative pauses), player button (manual control). All three run the same archive-summarize-save pipeline.
- **Compaction process**: Move current file to `past/scene-NNN.md`, call Haiku with summarization prompt, write recap as new `history.md`. World compaction uses the same mechanism with different parameters.
- **Summary quality contract**: Seven categories of information Haiku must preserve (character names, active quests, unresolved tensions, location, mechanical state, key decisions, emotional tone). Recent events get more detail. Final paragraph establishes current situation.
- **File structure**: `past/` directory with sequential numbering, separate sequences for history and world archives. Archives are verbatim copies, no transformation.
- **Integration**: CompactionService following route/service split with DI. Uses same QueryFn interface with minimal options (Haiku model, no tools/plugins). compact_history MCP tool on corvran server with allowedTools registration. Message handler sequence clarified with ordering note.
- **Edge cases**: Mid-turn overflow, short history minimum (500 chars), missing history file, player-edited files, daemon restart during compaction, Haiku unavailability with 60s timeout and archive rollback.
- **Incremental delivery**: Phase 1 (mechanism + threshold), Phase 2 (player button), Phase 3 (GM tool). Each independently useful.

**Design decisions:**
- No formal scene detection. Research shows F1=0.24 for automated detection and 70% human agreement. The GM gets pacing guidance and a tool, not a classification algorithm.
- No structural markers in history.md after compaction. The recap reads as continuous narrative flowing into new exchanges.
- Threshold check runs before player message is appended, preserving current route ordering.

**Review pass**: Fresh-context spec reviewer caught three priority issues (message handler sequence vs. actual route code, missing allowedTools entry, underspecified QueryFn options) and four minor issues (Haiku timeout, missing-file case, playtest criteria honesty, recap-to-exchange transition clarity). All addressed in the final spec.
