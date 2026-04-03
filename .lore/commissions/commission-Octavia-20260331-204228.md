---
title: "Commission: Spec: Compaction System for Adventure Engine"
date: 2026-04-01
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "## Task\n\nWrite a specification for the adventure engine's compaction system. Output to `.lore/specs/compaction-system-spec.md`.\n\n## Inputs\n\nRead these two documents thoroughly before writing:\n\n1. **`.lore/research/scene-boundaries.md`** — Verity's research on how TTRPGs, interactive fiction, and AI narrative systems define and detect scene boundaries.\n2. **`.lore/brainstorm/compaction-system.md`** — Brainstorm exploring compaction approaches, tradeoffs, and open questions.\n\nAlso read for architecture context:\n- **`.lore/brainstorm/conversation-history.md`** — The original brainstorm that established Approach 2 (file-based history) as the MVP foundation and Approach 3 (scene-based hybrid) as the evolution target.\n- **`CLAUDE.md`** — Current architecture and project conventions.\n- **`.lore/vision.md`** — Project vision and principles (especially Principle 1: markdown is memory).\n\n## What the Spec Should Cover\n\n1. **Scene boundary definition**: Drawing from the research, define what constitutes a scene boundary in Corvran. Be concrete. If multiple trigger types coexist, specify how they interact and which takes precedence.\n\n2. **Compaction trigger**: When does compaction fire? Token count threshold? Scene boundary detection? Both? Define the mechanism.\n\n3. **Compaction process**: What happens during compaction? What gets summarized, what's preserved verbatim, what gets archived? Define the data flow from \"history.md is too long\" to \"history.md is manageable again.\"\n\n4. **Summary quality requirements**: What must a scene summary preserve? Character names, quest state, unresolved tensions, location, mechanical state? Define the contract.\n\n5. **File format**: How do scene summaries relate to history.md? Do they live in separate files? Inline in history.md with markers? Define the file structure.\n\n6. **Integration with existing architecture**: How does this connect to the current prompt assembly pipeline? The daemon's query flow? The adventure directory structure?\n\n7. **Edge cases**: Mid-scene compaction (context window full but no scene boundary), very short scenes, player-edited history files, daemon restart during compaction.\n\n## Constraints\n\n- Must be compatible with Approach 2 (file-based history) as it exists today\n- Must satisfy Principle 1 (all state in markdown, player-readable)\n- Must not require the SDK's session resume (we use fresh queries per turn)\n- The spec should be implementable incrementally (scene detection can ship before auto-compaction)\n\n## Style\n\nWrite requirements as testable statements (REQ-COMP-N format). Include rationale for non-obvious decisions. Keep it concrete enough that a developer could implement from it without asking clarifying questions."
dependencies:
  - commission-Verity-20260331-202258
linked_artifacts: []

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
current_progress: ""
projectName: corvran
---
