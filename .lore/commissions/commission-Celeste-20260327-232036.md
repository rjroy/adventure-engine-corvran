---
title: "Commission: Reverse-engineer the Adventure Engine vision"
date: 2026-03-28
status: dispatched
type: one-shot
tags: [commission]
worker: Celeste
workerDisplayTitle: "Guild Visionary"
prompt: "Review the entire Adventure Engine of Corvran project and reverse-engineer what the vision must be.\n\nRead the codebase, the specs in `.lore/specs/`, the retros in `.lore/retros/`, the CLAUDE.md, and the git history. Look at what was built, what was prioritized, what patterns repeat, and what the architecture implies about where this is headed.\n\nYour deliverable is a vision document in `.lore/` that answers:\n\n1. **What is this project trying to be?** Not what it says it is in the README, but what the decisions, architecture, and feature choices reveal about the actual ambition.\n\n2. **What design principles are evident?** What values show up repeatedly in how things were built? (e.g., file-based state, LLM-native design, player agency, etc.)\n\n3. **What's the trajectory?** Based on what exists and what was specced, where does this naturally want to go next? What capabilities are implied but not yet built?\n\n4. **What's missing or underdeveloped?** Where are the gaps between what the architecture promises and what's actually there?\n\n5. **What tensions exist?** Any architectural decisions that pull against each other, or areas where the design philosophy isn't consistently applied?\n\nWrite this as a vision document, not a feature list. Ground everything in evidence from the codebase. This should help the project owner decide what to pick up next."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-28T06:20:36.225Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-28T06:20:36.227Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
