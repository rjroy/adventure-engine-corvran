---
title: "Commission: Brainstorm: Conversation History Persistence"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Run a brainstorm on \"Conversation History\" for the Adventure Engine MVP. Context lives in `.lore/vision.md`, `.lore/brainstorm/mvp-scope.md`, and `.lore/reference/architecture-pattern.md`.\n\nThe user sees three approaches. Explore all three, surface tradeoffs, and answer the specific questions embedded in each.\n\n## Approach 1: Agent SDK Resume (Let Claude Manage It)\n\nUse the Claude Agent SDK's `resume` feature. The session never closes for the duration of the adventure. Claude maintains the full conversation history internally.\n\n**User's question:** \"We never close the session for the adventure. Is this bad?\"\n\nExplore: What happens to long-running sessions? Token limits, cost implications, context window pressure, what happens if the daemon restarts. Does the Agent SDK even support indefinite sessions, or is there a practical ceiling?\n\n## Approach 2: File-Based History (System Manages It)\n\nAs the user sends a message, append it to a file. As the AI responds, append that too. On each new query, feed the file contents as context. The system owns the full history.\n\n**User's question:** \"Compaction is now the system's problem, but is that a feature and not a problem?\"\n\nExplore: Is owning compaction actually an advantage? The system could summarize older exchanges, keep recent ones verbatim, and the player could read/edit the history file (Principle 1: markdown is memory). What does prompt assembly look like? What are the failure modes?\n\n## Approach 3: Scene-Based Hybrid\n\nUse Agent SDK resume within a scene. When a scene ends, summarize it to a file. Update world state and current act. Start the next scene as a fresh session with the summary as context.\n\n**User's questions:** \"Does this even make sense? Could we start with one of the others and move here later?\"\n\nExplore: What are the unique benefits? (Natural compaction boundaries, scene summaries as narrative artifacts, world state checkpoints.) Is this an entire system of its own or does it decompose into manageable pieces? What's the migration path from Approach 1 or 2 to this?\n\n## Guidance\n\n- The architecture constraint is Claude Agent SDK only (see architecture-pattern.md).\n- MVP principle: the simplest thing worth playing. But \"simplest\" includes \"doesn't hit a wall after 30 minutes of play.\"\n- Principle 1 (markdown is memory) is relevant. The player should be able to read their adventure history.\n- Consider which approach lets you start playing soonest AND doesn't require a rewrite to reach the scene-based model if that turns out to be the right long-term answer.\n- Record open questions. Don't close them artificially.\n\nOutput: `.lore/brainstorm/conversation-history.md`"
dependencies: []
linked_artifacts:
  - .lore/brainstorm/conversation-history.md

activity_timeline:
  - timestamp: 2026-03-29T03:48:19.768Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T03:48:19.772Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T03:48:20.212Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T03:48:29.764Z
    event: progress_report
    reason: "Reading context files: vision.md, mvp-scope.md, architecture-pattern.md"
  - timestamp: 2026-03-29T03:50:31.092Z
    event: progress_report
    reason: "Context loaded. Researching Agent SDK session/resume mechanics to ground the brainstorm in verified behavior."
  - timestamp: 2026-03-29T03:51:10.266Z
    event: progress_report
    reason: "Research complete. Writing the brainstorm document covering all three approaches with verified Agent SDK behavior."
  - timestamp: 2026-03-29T03:53:28.974Z
    event: result_submitted
    reason: "Brainstorm complete. Explored all three conversation history approaches with verified Agent SDK behavior (v0.1.77 types). Key findings:\n\n- Approach 1 (SDK Resume) is fastest to build but violates Principle 1 (player can't read/edit history in markdown). SDK has auto-compaction and session persistence, but optimized for code context, not narrative.\n- Approach 2 (File-Based) satisfies Principle 1 natively and the cost model (OAuth, no per-token billing) removes its historic weakness. Migration to Approach 3 is clean.\n- Approach 3 (Scene-Based Hybrid) is the best long-term answer but over-built for MVP.\n\nRecommendation: Start with Approach 2, defer compaction. Six open questions recorded, particularly around history format and prompt assembly."
  - timestamp: 2026-03-29T03:53:35.696Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Research complete. Writing the brainstorm document covering all three approaches with verified Agent SDK behavior."
projectName: corvran
---
Brainstorm complete. Explored all three conversation history approaches with verified Agent SDK behavior (v0.1.77 types). Key findings:

- Approach 1 (SDK Resume) is fastest to build but violates Principle 1 (player can't read/edit history in markdown). SDK has auto-compaction and session persistence, but optimized for code context, not narrative.
- Approach 2 (File-Based) satisfies Principle 1 natively and the cost model (OAuth, no per-token billing) removes its historic weakness. Migration to Approach 3 is clean.
- Approach 3 (Scene-Based Hybrid) is the best long-term answer but over-built for MVP.

Recommendation: Start with Approach 2, defer compaction. Six open questions recorded, particularly around history format and prompt assembly.
