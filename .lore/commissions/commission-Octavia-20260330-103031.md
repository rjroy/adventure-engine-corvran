---
title: "Commission: Brainstorm: Adventure Creation Flow"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Brainstorm the adventure creation experience for Corvran. This is a design exploration, not implementation.\n\n## Current State\n\nWhen a user logs in and there's only one adventure, the app jumps straight into it. That needs to change regardless of what we decide here.\n\n## The Core Question\n\nWhat happens when a user wants to start a new adventure? Two ends of the spectrum:\n\n**Option A: Pre-session Setup Conversation**\nA conversation with a GM-like agent before the adventure begins. The user would:\n- Select an RPG system (d20, Daggerheart, etc.)\n- Discuss character concepts (not full creation, since that requires system rules, but ideas like \"I want to play a rogue who used to be a noble\")\n- Discuss world/setting concepts (\"dark fantasy,\" \"post-apocalyptic,\" etc.)\n- Then the adventure begins with this context already established\n\n**Option B: Minimal Setup, In-Session Discovery**\n- Select a system\n- Name the adventure\n- Jump in, and the GM handles character creation and world-building as part of the opening session\n\n**Option C: Something in between or something else entirely**\n\n## What to Explore\n\n1. What does each approach feel like from the player's perspective? What's the emotional arc?\n2. What are the tradeoffs? (time to first play, quality of opening experience, player investment, etc.)\n3. How does the RPG system choice affect this? Some systems have heavy character creation (D&D), others are lighter (Daggerheart, PbtA).\n4. What about returning to an adventure list? What information does the user need to distinguish adventures?\n5. Is there a \"session zero\" concept that maps well here?\n6. What about the adventure list/lobby screen itself? What does the user see when they have multiple adventures?\n\n## Context\n\n- Read the existing adventure system integration spec at `.lore/specs/adventure-system-integration.md` and plan at `.lore/plans/adventure-system-integration.md` for current architecture\n- Read `.lore/research/llm-optimized-rpg-systems.md` for RPG system research (especially the session zero and character creation patterns)\n- The backend supports multiple RPG system plugins with bootstrap prompts\n- Adventures are stored as directories with config, history, and state\n\n## Output\n\nWrite your brainstorm to `.lore/brainstorms/adventure-creation-flow.md`. Structure it however makes sense for the ideas, but make sure the tradeoffs are clear and the options are concrete enough to make a decision from. This is for the project owner to read and react to, not a spec."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-03-30T17:30:31.551Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T17:30:31.553Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
