---
title: "Commission: Brainstorm: Adventure Creation Flow"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Brainstorm the adventure creation experience for Corvran. This is a design exploration, not implementation.\n\n## Current State\n\nWhen a user logs in and there's only one adventure, the app jumps straight into it. That needs to change regardless of what we decide here.\n\n## The Core Question\n\nWhat happens when a user wants to start a new adventure? Two ends of the spectrum:\n\n**Option A: Pre-session Setup Conversation**\nA conversation with a GM-like agent before the adventure begins. The user would:\n- Select an RPG system (d20, Daggerheart, etc.)\n- Discuss character concepts (not full creation, since that requires system rules, but ideas like \"I want to play a rogue who used to be a noble\")\n- Discuss world/setting concepts (\"dark fantasy,\" \"post-apocalyptic,\" etc.)\n- Then the adventure begins with this context already established\n\n**Option B: Minimal Setup, In-Session Discovery**\n- Select a system\n- Name the adventure\n- Jump in, and the GM handles character creation and world-building as part of the opening session\n\n**Option C: Something in between or something else entirely**\n\n## What to Explore\n\n1. What does each approach feel like from the player's perspective? What's the emotional arc?\n2. What are the tradeoffs? (time to first play, quality of opening experience, player investment, etc.)\n3. How does the RPG system choice affect this? Some systems have heavy character creation (D&D), others are lighter (Daggerheart, PbtA).\n4. What about returning to an adventure list? What information does the user need to distinguish adventures?\n5. Is there a \"session zero\" concept that maps well here?\n6. What about the adventure list/lobby screen itself? What does the user see when they have multiple adventures?\n\n## Context\n\n- Read the existing adventure system integration spec at `.lore/specs/adventure-system-integration.md` and plan at `.lore/plans/adventure-system-integration.md` for current architecture\n- Read `.lore/research/llm-optimized-rpg-systems.md` for RPG system research (especially the session zero and character creation patterns)\n- The backend supports multiple RPG system plugins with bootstrap prompts\n- Adventures are stored as directories with config, history, and state\n\n## Output\n\nWrite your brainstorm to `.lore/brainstorms/adventure-creation-flow.md`. Structure it however makes sense for the ideas, but make sure the tradeoffs are clear and the options are concrete enough to make a decision from. This is for the project owner to read and react to, not a spec."
dependencies: []
linked_artifacts:
  - .lore/brainstorm/adventure-creation-flow.md

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
  - timestamp: 2026-03-30T17:30:31.579Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T17:30:38.352Z
    event: progress_report
    reason: "Starting brainstorm on adventure creation flow. Reading existing specs, plans, and RPG system research to build context."
  - timestamp: 2026-03-30T17:32:03.022Z
    event: progress_report
    reason: "Context gathered. Read the spec, plan, research, vision, and explored the current codebase. No adventure creation UI or API exists today. Single-adventure auto-redirect is the current behavior. Now writing the brainstorm."
  - timestamp: 2026-03-30T17:34:23.794Z
    event: result_submitted
    reason: "Wrote brainstorm at `.lore/brainstorm/adventure-creation-flow.md`.\n\nExplored three options for adventure creation:\n- **Option A** (pre-session setup conversation): Full session zero with an AI collaborator. High investment, high opening quality, risk of feeling like homework.\n- **Option B** (minimal setup): Pick system, name it, jump in. Fast start but the GM has nothing to work with.\n- **Option C** (recommended middle path): Short wizard with system picker, optional concept text field, and name. 60 seconds to first GM message, but the GM has a seed to build on.\n\nKey conclusions:\n- The concept field is the differentiator. A single sentence of player intent transforms the opening experience without requiring a full conversation.\n- The creation flow should be system-agnostic. The concept is narrative; the bootstrap handles system-specific onboarding.\n- The lobby always shows (kill the single-adventure auto-redirect). Adventure cards need name, system badge, concept snippet, character name, and last-played timestamp.\n- Option A isn't gone, just deferred. The wizard can later gain an \"advanced setup conversation\" path without structural changes.\n\nFour open questions flagged: AI writing character/world files during play, name-vs-directory-name mapping, systems endpoint for the picker, and freeform-with-blank-concept handling."
  - timestamp: 2026-03-30T17:34:28.848Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Context gathered. Read the spec, plan, research, vision, and explored the current codebase. No adventure creation UI or API exists today. Single-adventure auto-redirect is the current behavior. Now writing the brainstorm."
projectName: corvran
---
Wrote brainstorm at `.lore/brainstorm/adventure-creation-flow.md`.

Explored three options for adventure creation:
- **Option A** (pre-session setup conversation): Full session zero with an AI collaborator. High investment, high opening quality, risk of feeling like homework.
- **Option B** (minimal setup): Pick system, name it, jump in. Fast start but the GM has nothing to work with.
- **Option C** (recommended middle path): Short wizard with system picker, optional concept text field, and name. 60 seconds to first GM message, but the GM has a seed to build on.

Key conclusions:
- The concept field is the differentiator. A single sentence of player intent transforms the opening experience without requiring a full conversation.
- The creation flow should be system-agnostic. The concept is narrative; the bootstrap handles system-specific onboarding.
- The lobby always shows (kill the single-adventure auto-redirect). Adventure cards need name, system badge, concept snippet, character name, and last-played timestamp.
- Option A isn't gone, just deferred. The wizard can later gain an "advanced setup conversation" path without structural changes.

Four open questions flagged: AI writing character/world files during play, name-vs-directory-name mapping, systems endpoint for the picker, and freeform-with-blank-concept handling.
