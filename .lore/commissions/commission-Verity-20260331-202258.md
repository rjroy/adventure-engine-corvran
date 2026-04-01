---
title: "Commission: Research: Scene Boundaries in Interactive Narrative and TTRPGs"
date: 2026-04-01
status: dispatched
type: one-shot
tags: [commission]
worker: Verity
workerDisplayTitle: "Guild Pathfinder"
prompt: "## Task\n\nResearch what \"scene boundaries\" mean in the context of tabletop RPGs, interactive fiction, and AI-driven narrative systems. Produce a research artifact at `.lore/research/scene-boundaries.md`.\n\n## Context\n\nWe're building an AI game master for a text-based RPG engine. The conversation history brainstorm (`.lore/brainstorm/conversation-history.md`) proposes a scene-based hybrid approach where the system summarizes completed scenes and starts fresh context for new ones. The concept is promising but \"what is a scene?\" is undefined and load-bearing.\n\nFour possibilities were floated:\n1. **Location-based**: scene changes when the party moves locations\n2. **Event-based**: scene changes when a narrative event resolves (a negotiation ends, a combat concludes)\n3. **Player-declared**: the player says \"next scene\" or equivalent\n4. **AI-detected**: the AI recognizes a natural break point\n\n## Research Questions\n\n1. **How do published TTRPG systems define scenes?** Look at systems that explicitly use scenes as a mechanical unit (Fate, Blades in the Dark, Apocalypse World/PbtA, Ironsworn/Starforged, Daggerheart). What triggers a scene transition? What mechanical effects do scene boundaries have?\n\n2. **How does interactive fiction handle scene transitions?** Look at both parser IF (Inform/Z-machine era) and modern narrative games (Ink/Inkle, Twine, Choice of Games). What defines a \"passage\" or \"scene\" in these systems?\n\n3. **How do AI narrative systems handle context segmentation?** Look at AI Dungeon, NovelAI, KoboldAI, ChatRPG, or any system that manages long-running AI-generated narratives. How do they handle context window limits? Do any of them use explicit scene boundaries?\n\n4. **What are the detection signals?** If a system wanted to automatically detect scene boundaries, what signals would it look for? Location changes, time skips, dramatic resolution, topic shifts, pacing cues? Is there academic work on narrative segmentation?\n\n5. **What's the practical recommendation?** Given our architecture (AI GM, markdown files, file-based history that we want to eventually segment), which definition of \"scene\" is most robust? Can multiple definitions coexist (e.g., location change OR dramatic resolution OR player declaration)?\n\n## Output Structure\n\nStructure the research around the questions above. Include specific citations and examples from the systems you find. End with a synthesis that maps findings to our specific use case.\n\nCheck `.lore/research/llm-optimized-rpg-systems.md` for prior research on some of these systems (particularly Ironsworn/Starforged) that may provide a starting point."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-04-01T03:22:58.456Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-01T03:22:58.458Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
