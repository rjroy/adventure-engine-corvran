---
title: "Commission: Research: Scene Boundaries in Interactive Narrative and TTRPGs"
date: 2026-04-01
status: completed
type: one-shot
tags: [commission]
worker: Verity
workerDisplayTitle: "Guild Pathfinder"
prompt: "## Task\n\nResearch what \"scene boundaries\" mean in the context of tabletop RPGs, interactive fiction, and AI-driven narrative systems. Produce a research artifact at `.lore/research/scene-boundaries.md`.\n\n## Context\n\nWe're building an AI game master for a text-based RPG engine. The conversation history brainstorm (`.lore/brainstorm/conversation-history.md`) proposes a scene-based hybrid approach where the system summarizes completed scenes and starts fresh context for new ones. The concept is promising but \"what is a scene?\" is undefined and load-bearing.\n\nFour possibilities were floated:\n1. **Location-based**: scene changes when the party moves locations\n2. **Event-based**: scene changes when a narrative event resolves (a negotiation ends, a combat concludes)\n3. **Player-declared**: the player says \"next scene\" or equivalent\n4. **AI-detected**: the AI recognizes a natural break point\n\n## Research Questions\n\n1. **How do published TTRPG systems define scenes?** Look at systems that explicitly use scenes as a mechanical unit (Fate, Blades in the Dark, Apocalypse World/PbtA, Ironsworn/Starforged, Daggerheart). What triggers a scene transition? What mechanical effects do scene boundaries have?\n\n2. **How does interactive fiction handle scene transitions?** Look at both parser IF (Inform/Z-machine era) and modern narrative games (Ink/Inkle, Twine, Choice of Games). What defines a \"passage\" or \"scene\" in these systems?\n\n3. **How do AI narrative systems handle context segmentation?** Look at AI Dungeon, NovelAI, KoboldAI, ChatRPG, or any system that manages long-running AI-generated narratives. How do they handle context window limits? Do any of them use explicit scene boundaries?\n\n4. **What are the detection signals?** If a system wanted to automatically detect scene boundaries, what signals would it look for? Location changes, time skips, dramatic resolution, topic shifts, pacing cues? Is there academic work on narrative segmentation?\n\n5. **What's the practical recommendation?** Given our architecture (AI GM, markdown files, file-based history that we want to eventually segment), which definition of \"scene\" is most robust? Can multiple definitions coexist (e.g., location change OR dramatic resolution OR player declaration)?\n\n## Output Structure\n\nStructure the research around the questions above. Include specific citations and examples from the systems you find. End with a synthesis that maps findings to our specific use case.\n\nCheck `.lore/research/llm-optimized-rpg-systems.md` for prior research on some of these systems (particularly Ironsworn/Starforged) that may provide a starting point."
dependencies: []
linked_artifacts:
  - .lore/research/scene-boundaries.md

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
  - timestamp: 2026-04-01T03:22:58.507Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-01T03:23:05.578Z
    event: progress_report
    reason: "Starting research on scene boundaries. Reading existing project context first."
  - timestamp: 2026-04-01T03:23:26.610Z
    event: progress_report
    reason: "Existing project context loaded. Now gathering external sources on TTRPG scene mechanics, interactive fiction scene transitions, AI narrative systems, and narrative segmentation research."
  - timestamp: 2026-04-01T03:26:12.045Z
    event: progress_report
    reason: "External research gathered across all five question areas. Now synthesizing into the research artifact."
  - timestamp: 2026-04-01T03:29:38.542Z
    event: result_submitted
    reason: "Research artifact produced at `.lore/research/scene-boundaries.md`.\n\n**What it covers:**\n1. Scene definitions across six TTRPG systems (Fate, Blades, PbtA, Ironsworn, Daggerheart, Mythic GME), with mechanical effects at boundaries\n2. Scene models in five IF systems (Inform 7, Twine, Ink, ChoiceScript), from condition-triggered to file-based\n3. Context management in four AI narrative systems (AI Dungeon, NovelAI, KoboldAI, ChatRPG), none of which use scene boundaries\n4. Academic research on narrative scene detection (Zehe et al. 2021, NAACL 2025), including the finding that even humans agree on scene placement only ~70% of the time\n5. Synthesis with four coexisting trigger mechanisms and the Mythic GME pattern as a design recommendation\n\n**Key findings:**\n- Fate Core is the strongest model for scene-as-mechanical-unit (stress clears, aspects vanish, abilities reset at boundaries)\n- Mythic GME's altered/interrupted scene mechanic is the strongest pattern for turning scene boundaries from infrastructure into gameplay\n- No existing AI narrative system uses scene boundaries; all use sliding windows with pinned memory, and all suffer coherence degradation as a result\n- Automated scene detection from raw text achieves only F1=0.24; the system should use structured signals (location change, combat resolution, player declaration) rather than trying to detect narrative rhythm from text alone\n- Multiple trigger mechanisms should coexist rather than choosing one definition"
  - timestamp: 2026-04-01T03:29:41.676Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "External research gathered across all five question areas. Now synthesizing into the research artifact."
projectName: corvran
---
Research artifact produced at `.lore/research/scene-boundaries.md`.

**What it covers:**
1. Scene definitions across six TTRPG systems (Fate, Blades, PbtA, Ironsworn, Daggerheart, Mythic GME), with mechanical effects at boundaries
2. Scene models in five IF systems (Inform 7, Twine, Ink, ChoiceScript), from condition-triggered to file-based
3. Context management in four AI narrative systems (AI Dungeon, NovelAI, KoboldAI, ChatRPG), none of which use scene boundaries
4. Academic research on narrative scene detection (Zehe et al. 2021, NAACL 2025), including the finding that even humans agree on scene placement only ~70% of the time
5. Synthesis with four coexisting trigger mechanisms and the Mythic GME pattern as a design recommendation

**Key findings:**
- Fate Core is the strongest model for scene-as-mechanical-unit (stress clears, aspects vanish, abilities reset at boundaries)
- Mythic GME's altered/interrupted scene mechanic is the strongest pattern for turning scene boundaries from infrastructure into gameplay
- No existing AI narrative system uses scene boundaries; all use sliding windows with pinned memory, and all suffer coherence degradation as a result
- Automated scene detection from raw text achieves only F1=0.24; the system should use structured signals (location change, combat resolution, player declaration) rather than trying to detect narrative rhythm from text alone
- Multiple trigger mechanisms should coexist rather than choosing one definition
