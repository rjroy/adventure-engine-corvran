---
title: "Commission: Brainstorm: Deliberate RPG System Loading and AI Direction"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "We need to think deliberately about how the Adventure Engine handles RPG game systems (plugins like d20-system, daggerheart-system).\n\n## Current Problem\n\nRight now, `packages/backend/src/app.ts` loads ALL three plugins (corvran, d20-system, daggerheart-system) for every session. The prompt service (`packages/backend/src/services/prompt-service.ts`) says \"You are the Game Master for a tabletop RPG adventure\" but gives no direction about which game system to use. The AI defaults to D&D because that's dominant in its training data, even when Daggerheart skills are available.\n\n## Key Questions to Explore\n\n1. **One system per adventure, not all:** The user's gut instinct is that loading all game system plugins at once just confuses everyone. An adventure should declare which game system it uses, and only that system's plugin gets loaded. What does this mean for the adventure definition format? For the session runner? For the plugin loading architecture?\n\n2. **AI direction beyond skills:** Simply having the skills available may not be enough. The AI needs to be told \"you are running a Daggerheart game\" or \"you are running a D&D 5e game.\" Each game system might need a bootstrap prompt that establishes the right mental model, tone, and mechanical approach. What should these bootstrap prompts contain? Where should they live?\n\n3. **Bootstrap prompt per system:** What would a bootstrap prompt for Daggerheart look like vs D&D? What game-specific context does the AI need beyond just the skill tools? Think about: dice mechanics, narrative style, player expectations, character creation flow, combat philosophy.\n\n4. **The corvran plugin:** The corvran plugin contains GM craft and dice rolling that seem game-system-agnostic. Should it always load regardless of system? Is it the \"core\" plugin vs system-specific plugins?\n\n5. **Adventure creation flow:** If an adventure declares its system, when does the player choose? At adventure creation? Can it change? What's the UX?\n\n## Context\n\n- Plugin structure is in `plugins/` directory (corvran, d20-system, daggerheart-system)\n- Each has a `.claude-plugin/plugin.json` and skills directories\n- The Daggerheart SRD research is in `docs/research/daggerheart-srd/`\n- The D&D SRD research is in `docs/research/dndsrd5.2_markdown/`\n- Current prompt assembly is in `packages/backend/src/services/prompt-service.ts`\n- Session runner passes plugins to the Agent SDK in `packages/backend/src/services/session-runner.ts`\n\n## Output\n\nWrite a brainstorm document to `.lore/brainstorm/rpg-system-loading.md` exploring these questions. Include concrete proposals where you have them, and open questions where you don't. This will feed into a spec later."
dependencies: []
linked_artifacts:
  - .lore/brainstorm/rpg-system-loading.md

activity_timeline:
  - timestamp: 2026-03-29T21:04:14.846Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T21:04:14.848Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T21:04:14.874Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T21:04:22.655Z
    event: progress_report
    reason: "Starting research phase: reading current plugin loading, prompt assembly, session runner, and plugin structures to understand the landscape before brainstorming."
  - timestamp: 2026-03-29T21:05:31.504Z
    event: progress_report
    reason: "Research complete. Read: app.ts (plugin loading), prompt-service.ts (system prompt assembly), session-runner.ts (SDK integration), all three plugin.json files, all skill SKILL.md files for corvran/d20/daggerheart, adventure schemas, adventure routes, vision.md, and MVP scope brainstorm. Now invoking the brainstorm skill to write the document."
  - timestamp: 2026-03-29T21:07:56.539Z
    event: progress_report
    reason: "Brainstorm document written to .lore/brainstorm/rpg-system-loading.md. Running a fresh-context review to catch gaps before submitting."
  - timestamp: 2026-03-29T21:10:07.015Z
    event: result_submitted
    reason: "Wrote brainstorm document exploring RPG system loading and selection for Adventure Engine. The document covers 7 ideas with concrete proposals:\n\n1. **One system per adventure**: Adventures declare their system in `adventure.md` with YAML frontmatter. Only that system's plugin loads per session.\n2. **Corvran as core plugin**: Always loads. Provides system-agnostic GM craft and dice rolling. No-system = freeform storytelling.\n3. **Bootstrap prompts**: Each system plugin includes a `bootstrap.md` that frames the AI's mental model (drafted both D&D and Daggerheart versions). Recommended location: inside the plugin directory (Option A).\n4. **Adventure definition format**: `adventure.md` with `system: daggerheart` in frontmatter. Minimal, hand-editable.\n5. **Plugin loading architecture**: Move plugin paths from global config to per-query resolution (Option A). Session runner becomes plugin-stateless.\n6. **Prompt service changes**: New `systemBootstrap` field in AdventureState, inserted into the Identity section.\n7. **Adventure creation flow**: Manual for now (create file), UI dropdown later.\n\nAlso includes a Risks section (config-vs-state file tension, bootstrap-vs-skill content overlap, onboarding must be system-aware, backward compatibility) and 7 open questions for the spec phase.\n\nReviewed by fresh-context design reviewer; incorporated findings on write protection, onboarding co-requirement, backward compatibility migration path, and plugin path resolution fragility."
  - timestamp: 2026-03-29T21:10:11.862Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Brainstorm document written to .lore/brainstorm/rpg-system-loading.md. Running a fresh-context review to catch gaps before submitting."
projectName: corvran
---
Wrote brainstorm document exploring RPG system loading and selection for Adventure Engine. The document covers 7 ideas with concrete proposals:

1. **One system per adventure**: Adventures declare their system in `adventure.md` with YAML frontmatter. Only that system's plugin loads per session.
2. **Corvran as core plugin**: Always loads. Provides system-agnostic GM craft and dice rolling. No-system = freeform storytelling.
3. **Bootstrap prompts**: Each system plugin includes a `bootstrap.md` that frames the AI's mental model (drafted both D&D and Daggerheart versions). Recommended location: inside the plugin directory (Option A).
4. **Adventure definition format**: `adventure.md` with `system: daggerheart` in frontmatter. Minimal, hand-editable.
5. **Plugin loading architecture**: Move plugin paths from global config to per-query resolution (Option A). Session runner becomes plugin-stateless.
6. **Prompt service changes**: New `systemBootstrap` field in AdventureState, inserted into the Identity section.
7. **Adventure creation flow**: Manual for now (create file), UI dropdown later.

Also includes a Risks section (config-vs-state file tension, bootstrap-vs-skill content overlap, onboarding must be system-aware, backward compatibility) and 7 open questions for the spec phase.

Reviewed by fresh-context design reviewer; incorporated findings on write protection, onboarding co-requirement, backward compatibility migration path, and plugin path resolution fragility.
