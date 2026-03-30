---
title: "Commission: Spec: Adventure System Integration"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a spec for adventure system integration based on the decisions in `.lore/brainstorm/rpg-system-loading.md` (sections 1-7).\n\n## Scope\n\nThis spec covers plugin manifests, per-adventure system declaration, bootstrap prompts, plugin resolution, prompt service changes, and API changes. A separate spec (\"Engine Dice Tool\") is being written in parallel and covers the MCP dice tool that replaces the corvran dice-roller skill. Do not duplicate that work. Reference it where relevant (e.g., \"the dice roller moves to an engine-provided MCP tool; see Engine Dice Tool spec\").\n\n## What to specify\n\n1. **`adventure.md` format**: YAML frontmatter with `system` field. What values it accepts (plugin aliases like `daggerheart`, `d20`). What happens with no `adventure.md` (freeform). What happens with an unrecognized system value (clear error). File naming rationale.\n\n2. **`corvran-plugin.json` manifest schema**: Fields: `name`, `type` (`core` | `system`), `aliases` (string array), optional `bootstrap` (path relative to plugin root). Where it lives (plugin root). How the engine discovers it (scan `plugins/` at startup).\n\n3. **Bootstrap prompts**: Convention for authoring (well-structured markdown, self-contained, no comparative framing anti-pattern). Where they live (declared in manifest, file in plugin directory). How they're read (engine reads at session start). How they slot into the system prompt (Identity section). Include the anti-pattern guidance from the brainstorm (no \"unlike D&D\" framing).\n\n4. **Plugin resolution changes**: \n   - `resolveConfig()` in `app.ts` stops hardcoding plugin paths\n   - Engine scans `plugins/` at startup, builds alias-to-path map from manifests\n   - Session runner receives plugin paths per-query, not globally\n   - Corvran (type: core) always loads regardless of adventure system\n\n5. **Prompt service changes**: `AdventureState` gains `systemBootstrap: string | null`. Assembly order: Identity + bootstrap, Principles, Adventure state, Onboarding, History, Instructions. Onboarding guidance from the brainstorm (system-aware onboarding is a co-requirement with bootstrap prompts, but the bootstrap prompt itself should be comprehensive enough to cover it).\n\n6. **API changes**: `AdventureListItemSchema` gains `system: string | null`. The adventure detail and list endpoints return the system field.\n\n7. **Backward compatibility**: Adventures without `adventure.md` are freeform. No error, no warning. Behavioral change: they lose implicit access to system skills they previously had when all plugins loaded globally. Document this.\n\n8. **Testing**: What needs tests? Manifest parsing, alias resolution, plugin path resolution, prompt assembly with/without bootstrap, API response shape, error on unknown system.\n\n## Output\n\nWrite to `.lore/specs/adventure-system-integration.md`."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T00:25:21.955Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:25:21.956Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
