---
title: "Commission: Spec: RPG System Plugin Structure"
date: 2026-04-04
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Review both `plugins/daggerheart-system/` and `plugins/d20-system/` thoroughly. Read every file in each directory. Understand:\n\n- What files exist and their roles\n- The bootstrap prompt structure and conventions\n- How skills are defined and what they provide\n- The manifest format and fields\n- How the system integrates with the engine (adventure-routes, session-runner, plugin loading)\n\nThen synthesize your findings into a spec at `.lore/specs/rpg-system-plugin-spec.md` that defines what constitutes a `plugins/<name>-system/` directory. This spec should be authoritative enough that someone could create a new RPG system plugin from scratch by following it.\n\nCover:\n1. Required files and their purposes\n2. Manifest schema (all fields, which are required, validation rules)\n3. Bootstrap prompt structure (what sections, what conventions, what the engine expects)\n4. Skill definitions (format, naming, how they're loaded and invoked)\n5. How a system plugin is discovered, loaded, and wired into the engine at runtime\n6. Any conventions or patterns shared between the two existing systems\n7. Any differences between the two systems that represent valid variation vs. inconsistency\n\nReference the existing plugin code directly. Cite file paths and line numbers where relevant. The audience is a developer (or AI worker) who needs to build a new system plugin."
dependencies: []
linked_artifacts:
  - .lore/specs/rpg-system-plugin-spec.md

activity_timeline:
  - timestamp: 2026-04-04T13:51:02.114Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T13:51:02.116Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T13:51:02.148Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-04T13:51:10.078Z
    event: progress_report
    reason: "Starting commission: reading both plugin directories to understand structure before writing the spec."
  - timestamp: 2026-04-04T13:51:22.315Z
    event: progress_report
    reason: "Manifests and bootstraps read. Now reading all skill files for both plugins."
  - timestamp: 2026-04-04T13:51:41.178Z
    event: progress_report
    reason: "All skill files read. Now reading engine integration code: plugin loading, adventure routes, session runner."
  - timestamp: 2026-04-04T13:52:26.450Z
    event: progress_report
    reason: "All source material read. Now reading a couple reference templates to complete the picture, then writing the spec."
  - timestamp: 2026-04-04T13:53:00.422Z
    event: progress_report
    reason: "Research complete. Writing the RPG system plugin spec now."
  - timestamp: 2026-04-04T13:55:46.539Z
    event: result_submitted
    reason: "Created `.lore/specs/rpg-system-plugin-spec.md` (41 requirements, ~3200 words).\n\nThe spec covers:\n\n1. **Directory layout** with naming conventions and file purposes\n2. **Engine manifest** (`corvran-plugin.json`) schema with all fields, validation rules, and code references to `plugin-registry.ts`\n3. **Claude plugin manifest** (`.claude-plugin/plugin.json`) schema\n4. **Bootstrap prompt structure** with six required sections (Identity, Core Mechanic, Dice Convention, Narrative Philosophy, Key Vocabulary, Onboarding), constraints on length and content\n5. **Skill definitions** covering SKILL.md frontmatter format, body guidelines, references directory conventions, and the four required skill domains (rules, combat, players, adversaries)\n6. **Engine integration** documenting discovery, per-adventure resolution, prompt assembly, and SDK plugin loading with specific file/line references\n7. **Shared patterns** between d20-system and daggerheart-system (labeled dice groups, cross-referencing, HTML comment templates, tiered reference material)\n8. **Differences analysis** separating valid system-dependent variation from inconsistencies worth normalizing\n9. **Success criteria** by inspection, demonstration, and test\n\nAll technical claims verified against source: `plugin-registry.ts`, `adventure-routes.ts`, `prompt-service.ts`, `session-runner.ts`, `adventure-config.ts`, and every file in both plugin directories."
  - timestamp: 2026-04-04T13:55:51.230Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Research complete. Writing the RPG system plugin spec now."
projectName: corvran
---
Created `.lore/specs/rpg-system-plugin-spec.md` (41 requirements, ~3200 words).

The spec covers:

1. **Directory layout** with naming conventions and file purposes
2. **Engine manifest** (`corvran-plugin.json`) schema with all fields, validation rules, and code references to `plugin-registry.ts`
3. **Claude plugin manifest** (`.claude-plugin/plugin.json`) schema
4. **Bootstrap prompt structure** with six required sections (Identity, Core Mechanic, Dice Convention, Narrative Philosophy, Key Vocabulary, Onboarding), constraints on length and content
5. **Skill definitions** covering SKILL.md frontmatter format, body guidelines, references directory conventions, and the four required skill domains (rules, combat, players, adversaries)
6. **Engine integration** documenting discovery, per-adventure resolution, prompt assembly, and SDK plugin loading with specific file/line references
7. **Shared patterns** between d20-system and daggerheart-system (labeled dice groups, cross-referencing, HTML comment templates, tiered reference material)
8. **Differences analysis** separating valid system-dependent variation from inconsistencies worth normalizing
9. **Success criteria** by inspection, demonstration, and test

All technical claims verified against source: `plugin-registry.ts`, `adventure-routes.ts`, `prompt-service.ts`, `session-runner.ts`, `adventure-config.ts`, and every file in both plugin directories.
