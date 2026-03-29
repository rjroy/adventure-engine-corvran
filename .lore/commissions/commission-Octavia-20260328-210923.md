---
title: "Commission: Write MVP Spec from Brainstorm"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write the MVP spec for the Adventure Engine of Corvran. Output to `.lore/specs/mvp.md`.\n\n## Source Material\n\nRead these in order. They build on each other:\n\n1. `.lore/vision.md` — The approved vision. Design principles are non-negotiable.\n2. `.lore/reference/architecture-pattern.md` — The architecture pattern. Daemon-first, Agent SDK only, operations registry, DI factories.\n3. `.lore/brainstorm/mvp-scope.md` — The MVP scope brainstorm. This is the shape. The spec makes it precise.\n4. `.lore/brainstorm/conversation-history.md` — The conversation history brainstorm. Approach 2 (file-based, compaction deferred) is the decision.\n\nAlso check what exists in the repo already. There may be prior code (`packages/`), plugin content (`plugins/`), or other artifacts worth referencing. The spec should account for what already exists, not just what needs to be built.\n\n## What the Spec Is\n\nA document that a developer (Dalton) can build from. Requirements, success criteria, and enough design detail that implementation decisions are clear. Not a tutorial, not a pitch, not a brainstorm.\n\nThe brainstorm already made the hard decisions. The spec's job is to make them precise and buildable:\n\n- **Daemon**: Hono on Unix socket. What endpoints? What does each one do? What are the request/response shapes?\n- **AI Game Master**: Agent SDK session. How is the prompt assembled? What skills are loaded? How does `history.md` get into the query?\n- **Markdown state**: `character.md`, `world.md`, `history.md`. What's the minimum content? What does the daemon expect to find?\n- **Web client**: Next.js. Adventure list, conversation view, input box. What does each screen show? How does it talk to the daemon?\n- **Adventures**: Directory-based. What structure? How does the daemon discover them?\n\n## What the Spec Is Not\n\n- Not a brainstorm. Decisions are made. Open questions from the brainstorm that affect MVP implementation need answers in the spec. Open questions that don't affect the MVP can be noted as deferred.\n- Not an architecture doc. The architecture pattern already exists. Reference it, don't repeat it.\n- Not a v2 roadmap. The \"What This Defers\" list from the brainstorm is useful context but doesn't belong in the spec requirements.\n\n## Guidance\n\n- The user's answers to open questions are in mvp-scope.md (look for \"USER RESPONSE\" lines). Honor them exactly.\n- The prompt assembly question has a remaining design piece (how history gets into the prompt). The spec should make a decision here, not leave it open. Pick the simplest approach that works and explain why.\n- The history format question (open question in the brainstorm) needs a decision for the spec. Pick something simple that a developer can implement without ambiguity.\n- Success criteria should be playable, not just \"technically works.\" \"A player can sit down and have a one-evening D&D session\" is the bar.\n- Reference the architecture pattern doc for structural decisions (route/service split, DI factories, operations registry, type boundaries). Don't reinvent those patterns in the spec.\n- Use the `/lore-development:specify` skill if available for structure guidance."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T04:09:23.191Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T04:09:23.192Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
