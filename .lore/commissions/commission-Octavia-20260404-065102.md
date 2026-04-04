---
title: "Commission: Spec: RPG System Plugin Structure"
date: 2026-04-04
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Review both `plugins/daggerheart-system/` and `plugins/d20-system/` thoroughly. Read every file in each directory. Understand:\n\n- What files exist and their roles\n- The bootstrap prompt structure and conventions\n- How skills are defined and what they provide\n- The manifest format and fields\n- How the system integrates with the engine (adventure-routes, session-runner, plugin loading)\n\nThen synthesize your findings into a spec at `.lore/specs/rpg-system-plugin-spec.md` that defines what constitutes a `plugins/<name>-system/` directory. This spec should be authoritative enough that someone could create a new RPG system plugin from scratch by following it.\n\nCover:\n1. Required files and their purposes\n2. Manifest schema (all fields, which are required, validation rules)\n3. Bootstrap prompt structure (what sections, what conventions, what the engine expects)\n4. Skill definitions (format, naming, how they're loaded and invoked)\n5. How a system plugin is discovered, loaded, and wired into the engine at runtime\n6. Any conventions or patterns shared between the two existing systems\n7. Any differences between the two systems that represent valid variation vs. inconsistency\n\nReference the existing plugin code directly. Cite file paths and line numbers where relevant. The audience is a developer (or AI worker) who needs to build a new system plugin."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-04T13:51:02.114Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T13:51:02.116Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
