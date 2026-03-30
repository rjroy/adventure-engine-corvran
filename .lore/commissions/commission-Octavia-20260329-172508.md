---
title: "Commission: Spec: Engine Dice Tool"
date: 2026-03-30
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a spec for the engine-provided dice tool based on the decisions in `.lore/brainstorm/rpg-system-loading.md` (section 8: \"Dice Roller as Engine Tool\").\n\n## Scope\n\nThis spec covers ONLY the dice tool. A separate spec (\"Adventure System Integration\") is being written in parallel and covers plugin manifests, bootstrap prompts, per-adventure plugin loading, and prompt service changes. Do not duplicate that work. Reference it where the boundary matters (e.g., \"the dice tool replaces the corvran dice-roller skill, which is removed as part of the Adventure System Integration spec\").\n\n## What to specify\n\n1. **MCP tool contract**: The tool name, input schema, output schema. The brainstorm defines this clearly:\n   - Input: `groups` array (each with `n`, `d`, optional `label`), optional `modifier`, optional `threshold`\n   - Output: `groups` array (each with optional `label`, `rolls` array), `modifier`, `total`, optional `threshold`, optional `met`\n   - Include the D&D and Daggerheart examples from the brainstorm\n\n2. **Implementation location**: Where does the MCP server live in the backend? How does the session runner expose it to the Agent SDK? Reference the existing architecture in `packages/backend/src/services/session-runner.ts`.\n\n3. **Randomness**: How are dice rolls generated? `Math.random()` is fine, but the spec should be explicit. The tool does all arithmetic; the AI narrates results.\n\n4. **What gets removed**: The `plugins/corvran/skills/dice-roller/` skill directory and all cross-plugin references (`${CLAUDE_PLUGIN_ROOT}/../corvran/` paths in d20-combat and dh-combat skills). The corvran plugin retains only gm-craft.\n\n5. **Scope boundaries**: Standard dice (NdD) with modifier and threshold. Fudge/Fate dice, exploding dice, and other variants are explicitly out of scope (v2).\n\n6. **Testing**: What needs tests? The dice tool's arithmetic, threshold evaluation, group labeling, edge cases (0 dice, negative modifier, etc.).\n\n## Output\n\nWrite to `.lore/specs/engine-dice-tool.md`."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-30T00:25:08.050Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:25:08.052Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
