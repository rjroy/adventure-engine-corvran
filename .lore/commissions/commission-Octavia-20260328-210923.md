---
title: "Commission: Write MVP Spec from Brainstorm"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write the MVP spec for the Adventure Engine of Corvran. Output to `.lore/specs/mvp.md`.\n\n## Source Material\n\nRead these in order. They build on each other:\n\n1. `.lore/vision.md` — The approved vision. Design principles are non-negotiable.\n2. `.lore/reference/architecture-pattern.md` — The architecture pattern. Daemon-first, Agent SDK only, operations registry, DI factories.\n3. `.lore/brainstorm/mvp-scope.md` — The MVP scope brainstorm. This is the shape. The spec makes it precise.\n4. `.lore/brainstorm/conversation-history.md` — The conversation history brainstorm. Approach 2 (file-based, compaction deferred) is the decision.\n\nAlso check what exists in the repo already. There may be prior code (`packages/`), plugin content (`plugins/`), or other artifacts worth referencing. The spec should account for what already exists, not just what needs to be built.\n\n## What the Spec Is\n\nA document that a developer (Dalton) can build from. Requirements, success criteria, and enough design detail that implementation decisions are clear. Not a tutorial, not a pitch, not a brainstorm.\n\nThe brainstorm already made the hard decisions. The spec's job is to make them precise and buildable:\n\n- **Daemon**: Hono on Unix socket. What endpoints? What does each one do? What are the request/response shapes?\n- **AI Game Master**: Agent SDK session. How is the prompt assembled? What skills are loaded? How does `history.md` get into the query?\n- **Markdown state**: `character.md`, `world.md`, `history.md`. What's the minimum content? What does the daemon expect to find?\n- **Web client**: Next.js. Adventure list, conversation view, input box. What does each screen show? How does it talk to the daemon?\n- **Adventures**: Directory-based. What structure? How does the daemon discover them?\n\n## What the Spec Is Not\n\n- Not a brainstorm. Decisions are made. Open questions from the brainstorm that affect MVP implementation need answers in the spec. Open questions that don't affect the MVP can be noted as deferred.\n- Not an architecture doc. The architecture pattern already exists. Reference it, don't repeat it.\n- Not a v2 roadmap. The \"What This Defers\" list from the brainstorm is useful context but doesn't belong in the spec requirements.\n\n## Guidance\n\n- The user's answers to open questions are in mvp-scope.md (look for \"USER RESPONSE\" lines). Honor them exactly.\n- The prompt assembly question has a remaining design piece (how history gets into the prompt). The spec should make a decision here, not leave it open. Pick the simplest approach that works and explain why.\n- The history format question (open question in the brainstorm) needs a decision for the spec. Pick something simple that a developer can implement without ambiguity.\n- Success criteria should be playable, not just \"technically works.\" \"A player can sit down and have a one-evening D&D session\" is the bar.\n- Reference the architecture pattern doc for structural decisions (route/service split, DI factories, operations registry, type boundaries). Don't reinvent those patterns in the spec.\n- Use the `/lore-development:specify` skill if available for structure guidance."
dependencies: []
linked_artifacts:
  - .lore/specs/mvp.md

activity_timeline:
  - timestamp: 2026-03-29T04:09:23.191Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T04:09:23.192Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T04:09:23.624Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T04:09:31.927Z
    event: progress_report
    reason: "Starting MVP spec. Reading source materials and surveying existing repo."
  - timestamp: 2026-03-29T04:10:46.792Z
    event: progress_report
    reason: "All source material read. SDK API verified against actual type definitions. Repo is greenfield (no src/ code yet). Writing the spec now."
  - timestamp: 2026-03-29T04:15:05.003Z
    event: progress_report
    reason: "Spec drafted. Fresh-eyes review complete. Three priority fixes identified: plugin option format, proxy mechanism, and query failure behavior. Applying fixes now."
  - timestamp: 2026-03-29T04:16:26.871Z
    event: result_submitted
    reason: "MVP spec written to `.lore/specs/mvp.md`. 27 requirements across 7 sections (Adventures, Daemon, AI Game Master, Conversation History, Web Client, Markdown State Files, Plugins, Project Structure). \n\nKey decisions made in the spec:\n- **History format**: Labeled blocks (`**Player:**` / `**GM:**`) separated by blank lines. Human-readable, trivially parseable.\n- **History in prompt**: Inlined in the system prompt string. The SDK's `query()` takes a prompt string; no conversation history parameter exists. System prompt is the right place for read-once narrative context.\n- **Tool use in history**: Results included as natural language, not raw JSON.\n- **Context overflow**: Daemon catches SDK error, returns clear message. No pre-flight token estimation.\n- **Query failure mid-turn**: Orphaned player entry stays in history. No rollback. Next query sees and responds to it.\n- **Proxy mechanism**: Next.js catch-all API route forwards to daemon Unix socket via `DAEMON_SOCKET_PATH` env var.\n- **Plugin format**: `{ type: 'local', path: string }` with absolute paths resolved from repo root.\n\nFresh-eyes review completed with 3 priority fixes applied (plugin format, proxy mechanism, query failure behavior) plus 4 minor improvements (zero-adventures UX, tools/allowedTools distinction, operations registry testability, playtest criteria clarification)."
  - timestamp: 2026-03-29T04:16:32.661Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Spec drafted. Fresh-eyes review complete. Three priority fixes identified: plugin option format, proxy mechanism, and query failure behavior. Applying fixes now."
projectName: corvran
---
MVP spec written to `.lore/specs/mvp.md`. 27 requirements across 7 sections (Adventures, Daemon, AI Game Master, Conversation History, Web Client, Markdown State Files, Plugins, Project Structure). 

Key decisions made in the spec:
- **History format**: Labeled blocks (`**Player:**` / `**GM:**`) separated by blank lines. Human-readable, trivially parseable.
- **History in prompt**: Inlined in the system prompt string. The SDK's `query()` takes a prompt string; no conversation history parameter exists. System prompt is the right place for read-once narrative context.
- **Tool use in history**: Results included as natural language, not raw JSON.
- **Context overflow**: Daemon catches SDK error, returns clear message. No pre-flight token estimation.
- **Query failure mid-turn**: Orphaned player entry stays in history. No rollback. Next query sees and responds to it.
- **Proxy mechanism**: Next.js catch-all API route forwards to daemon Unix socket via `DAEMON_SOCKET_PATH` env var.
- **Plugin format**: `{ type: 'local', path: string }` with absolute paths resolved from repo root.

Fresh-eyes review completed with 3 priority fixes applied (plugin format, proxy mechanism, query failure behavior) plus 4 minor improvements (zero-adventures UX, tools/allowedTools distinction, operations registry testability, playtest criteria clarification).
