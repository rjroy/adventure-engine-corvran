---
title: "Commission: Reverse-engineer the Adventure Engine vision"
date: 2026-03-28
status: completed
type: one-shot
tags: [commission]
worker: Celeste
workerDisplayTitle: "Guild Visionary"
prompt: "Review the entire Adventure Engine of Corvran project and reverse-engineer what the vision must be.\n\nRead the codebase, the specs in `.lore/specs/`, the retros in `.lore/retros/`, the CLAUDE.md, and the git history. Look at what was built, what was prioritized, what patterns repeat, and what the architecture implies about where this is headed.\n\nYour deliverable is a vision document in `.lore/` that answers:\n\n1. **What is this project trying to be?** Not what it says it is in the README, but what the decisions, architecture, and feature choices reveal about the actual ambition.\n\n2. **What design principles are evident?** What values show up repeatedly in how things were built? (e.g., file-based state, LLM-native design, player agency, etc.)\n\n3. **What's the trajectory?** Based on what exists and what was specced, where does this naturally want to go next? What capabilities are implied but not yet built?\n\n4. **What's missing or underdeveloped?** Where are the gaps between what the architecture promises and what's actually there?\n\n5. **What tensions exist?** Any architectural decisions that pull against each other, or areas where the design philosophy isn't consistently applied?\n\nWrite this as a vision document, not a feature list. Ground everything in evidence from the codebase. This should help the project owner decide what to pick up next."
dependencies: []
linked_artifacts:
  - .lore/vision.md

activity_timeline:
  - timestamp: 2026-03-28T06:20:36.225Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-28T06:20:36.227Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-28T06:20:36.249Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-28T06:20:44.095Z
    event: progress_report
    reason: "Starting deep read of the Adventure Engine codebase. Reading project structure, specs, retros, and key source files in parallel."
  - timestamp: 2026-03-28T06:21:32.128Z
    event: progress_report
    reason: "Read specs (adventure-engine, d20-system, daggerheart-system, panels-as-pages), retros, plans, CLAUDE.md, and key source files (gm-prompt.ts, shared/protocol.ts). Now reading remaining source files, plugins, and git history for deeper pattern analysis."
  - timestamp: 2026-03-28T06:22:27.994Z
    event: progress_report
    reason: "Deep read complete. I've examined: 4 specs, 2 retros, 2 plans, the full git history (80 commits), core source files (gm-prompt.ts, game-session.ts, adventure-state.ts, protocol.ts, validation.ts, background-image.ts, history-compactor.ts), plugin structures (corvran, d20-system, daggerheart-system), all skill definitions, frontend component tree, and the meeting notes. No existing vision document found. Now drafting the vision document."
  - timestamp: 2026-03-28T06:25:14.903Z
    event: progress_report
    reason: "Vision document written to .lore/vision.md. Reviewing for any gaps or issues to file before submitting."
  - timestamp: 2026-03-28T06:25:40.073Z
    event: result_submitted
    reason: "Delivered `.lore/vision.md`: a reverse-engineered vision document for Adventure Engine of Corvran.\n\nThe document covers five areas grounded in evidence from the codebase:\n\n1. **What the project is**: Not a game engine but an AI runtime. The Claude Agent SDK IS the game engine. RPG rules are taught through markdown skills, not coded. The player talks to a world, not an interface.\n\n2. **Five design principles discovered**: Markdown is Memory (all state in .md files), Teach Don't Code (skills over application logic), Player Agency as Security Boundary (treated as inviolable as prompt injection prevention), Progressive Simplification (removing custom tools when the LLM can use standard ones), System-Agnostic Core (backend knows nothing about d20 or Daggerheart).\n\n3. **Trajectory**: Multi-player anticipated but unbuilt. More rule systems will follow the plugin pattern. Mobile emerging. Deployment maturing. Skills are the primary extension mechanism. Protocol types (CombatState, DiceLogEntry, NPC) define a combat tracker and dice log UI that haven't been built yet.\n\n4. **Gaps**: Frontend depth lags backend sophistication. No observability for a service that now runs via systemd. Test coverage asymmetry (853+ backend, minimal frontend). No world authoring/templating story. Session continuity degrades over long campaigns.\n\n5. **Tensions**: Structured protocol types vs. freeform markdown state (two parallel data models). Hardcoded theme enums in a system-agnostic engine. Generate-first images vs. cost/latency. AI GM autonomy vs. deterministic testing.\n\nThe closing observation: three independent implementations (d20, daggerheart, panels-as-pages) arrived at the same pattern without naming it. That pattern (markdown + metadata + AI judgment + standard file tools) was discovered, not designed."
  - timestamp: 2026-03-28T06:25:50.598Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Vision document written to .lore/vision.md. Reviewing for any gaps or issues to file before submitting."
projectName: corvran
---
Delivered `.lore/vision.md`: a reverse-engineered vision document for Adventure Engine of Corvran.

The document covers five areas grounded in evidence from the codebase:

1. **What the project is**: Not a game engine but an AI runtime. The Claude Agent SDK IS the game engine. RPG rules are taught through markdown skills, not coded. The player talks to a world, not an interface.

2. **Five design principles discovered**: Markdown is Memory (all state in .md files), Teach Don't Code (skills over application logic), Player Agency as Security Boundary (treated as inviolable as prompt injection prevention), Progressive Simplification (removing custom tools when the LLM can use standard ones), System-Agnostic Core (backend knows nothing about d20 or Daggerheart).

3. **Trajectory**: Multi-player anticipated but unbuilt. More rule systems will follow the plugin pattern. Mobile emerging. Deployment maturing. Skills are the primary extension mechanism. Protocol types (CombatState, DiceLogEntry, NPC) define a combat tracker and dice log UI that haven't been built yet.

4. **Gaps**: Frontend depth lags backend sophistication. No observability for a service that now runs via systemd. Test coverage asymmetry (853+ backend, minimal frontend). No world authoring/templating story. Session continuity degrades over long campaigns.

5. **Tensions**: Structured protocol types vs. freeform markdown state (two parallel data models). Hardcoded theme enums in a system-agnostic engine. Generate-first images vs. cost/latency. AI GM autonomy vs. deterministic testing.

The closing observation: three independent implementations (d20, daggerheart, panels-as-pages) arrived at the same pattern without naming it. That pattern (markdown + metadata + AI judgment + standard file tools) was discovered, not designed.
