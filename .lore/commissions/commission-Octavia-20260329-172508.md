---
title: "Commission: Spec: Engine Dice Tool"
date: 2026-03-30
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Write a spec for the engine-provided dice tool based on the decisions in `.lore/brainstorm/rpg-system-loading.md` (section 8: \"Dice Roller as Engine Tool\").\n\n## Scope\n\nThis spec covers ONLY the dice tool. A separate spec (\"Adventure System Integration\") is being written in parallel and covers plugin manifests, bootstrap prompts, per-adventure plugin loading, and prompt service changes. Do not duplicate that work. Reference it where the boundary matters (e.g., \"the dice tool replaces the corvran dice-roller skill, which is removed as part of the Adventure System Integration spec\").\n\n## What to specify\n\n1. **MCP tool contract**: The tool name, input schema, output schema. The brainstorm defines this clearly:\n   - Input: `groups` array (each with `n`, `d`, optional `label`), optional `modifier`, optional `threshold`\n   - Output: `groups` array (each with optional `label`, `rolls` array), `modifier`, `total`, optional `threshold`, optional `met`\n   - Include the D&D and Daggerheart examples from the brainstorm\n\n2. **Implementation location**: Where does the MCP server live in the backend? How does the session runner expose it to the Agent SDK? Reference the existing architecture in `packages/backend/src/services/session-runner.ts`.\n\n3. **Randomness**: How are dice rolls generated? `Math.random()` is fine, but the spec should be explicit. The tool does all arithmetic; the AI narrates results.\n\n4. **What gets removed**: The `plugins/corvran/skills/dice-roller/` skill directory and all cross-plugin references (`${CLAUDE_PLUGIN_ROOT}/../corvran/` paths in d20-combat and dh-combat skills). The corvran plugin retains only gm-craft.\n\n5. **Scope boundaries**: Standard dice (NdD) with modifier and threshold. Fudge/Fate dice, exploding dice, and other variants are explicitly out of scope (v2).\n\n6. **Testing**: What needs tests? The dice tool's arithmetic, threshold evaluation, group labeling, edge cases (0 dice, negative modifier, etc.).\n\n## Output\n\nWrite to `.lore/specs/engine-dice-tool.md`."
dependencies: []
linked_artifacts:
  - .lore/specs/engine-dice-tool.md

activity_timeline:
  - timestamp: 2026-03-30T00:25:08.050Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-30T00:25:08.052Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-30T00:25:08.079Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-30T00:25:15.720Z
    event: progress_report
    reason: "Starting context gathering: reading brainstorm decisions and session runner architecture."
  - timestamp: 2026-03-30T00:25:40.192Z
    event: progress_report
    reason: "Context gathered. Read brainstorm section 8, session runner, existing dice roller skill/script, cross-plugin references (13 files), and existing spec format. Now checking Agent SDK MCP server support before drafting."
  - timestamp: 2026-03-30T00:26:29.871Z
    event: progress_report
    reason: "All context gathered. Confirmed Agent SDK has `createSdkMcpServer` + `tool` helpers for in-process MCP servers. Read cross-plugin references (13 skill files), existing dice roller bash script, session runner architecture, and MVP spec format. Drafting spec now."
  - timestamp: 2026-03-30T00:30:57.657Z
    event: result_submitted
    reason: "Wrote the Engine Dice Tool spec at `.lore/specs/engine-dice-tool.md`. \n\nThe spec covers all six areas from the commission:\n\n1. **MCP tool contract** (REQ-DICE-1 through REQ-DICE-7): Tool name `roll_dice` on MCP server `corvran`, full input/output schemas with Zod validation, three concrete examples (D&D attack, Daggerheart duality, simple damage).\n\n2. **Implementation location** (REQ-DICE-8, REQ-DICE-9): New module at `packages/backend/src/services/dice-tool.ts` using Agent SDK's `createSdkMcpServer` + `tool` helpers. Session runner creates the server once at construction, includes it in every query's `mcpServers` option.\n\n3. **Randomness** (REQ-DICE-10, REQ-DICE-11): `Math.random()` with DI for test determinism.\n\n4. **What gets removed** (REQ-DICE-14 through REQ-DICE-16): Dice roller skill directory deleted, all 7 cross-plugin skill files updated, fallback prose removed, verification grep documented.\n\n5. **Scope boundaries** (REQ-DICE-17, REQ-DICE-18): Standard NdD with modifier and threshold. Fudge dice, exploding, drop-lowest, and expression parsing are v2. Advantage/disadvantage patterns documented for both D&D and Daggerheart styles.\n\n6. **Testing** (REQ-DICE-19, REQ-DICE-20): Comprehensive test matrix covering arithmetic, thresholds, labels, edge cases, and determinism.\n\nFresh-context review was run and three findings were addressed: incomplete Daggerheart advantage gap documentation, missing fallback prose cleanup guidance, and a verification grep criterion."
  - timestamp: 2026-03-30T00:31:04.080Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All context gathered. Confirmed Agent SDK has `createSdkMcpServer` + `tool` helpers for in-process MCP servers. Read cross-plugin references (13 skill files), existing dice roller bash script, session runner architecture, and MVP spec format. Drafting spec now."
projectName: corvran
---
Wrote the Engine Dice Tool spec at `.lore/specs/engine-dice-tool.md`. 

The spec covers all six areas from the commission:

1. **MCP tool contract** (REQ-DICE-1 through REQ-DICE-7): Tool name `roll_dice` on MCP server `corvran`, full input/output schemas with Zod validation, three concrete examples (D&D attack, Daggerheart duality, simple damage).

2. **Implementation location** (REQ-DICE-8, REQ-DICE-9): New module at `packages/backend/src/services/dice-tool.ts` using Agent SDK's `createSdkMcpServer` + `tool` helpers. Session runner creates the server once at construction, includes it in every query's `mcpServers` option.

3. **Randomness** (REQ-DICE-10, REQ-DICE-11): `Math.random()` with DI for test determinism.

4. **What gets removed** (REQ-DICE-14 through REQ-DICE-16): Dice roller skill directory deleted, all 7 cross-plugin skill files updated, fallback prose removed, verification grep documented.

5. **Scope boundaries** (REQ-DICE-17, REQ-DICE-18): Standard NdD with modifier and threshold. Fudge dice, exploding, drop-lowest, and expression parsing are v2. Advantage/disadvantage patterns documented for both D&D and Daggerheart styles.

6. **Testing** (REQ-DICE-19, REQ-DICE-20): Comprehensive test matrix covering arithmetic, thresholds, labels, edge cases, and determinism.

Fresh-context review was run and three findings were addressed: incomplete Daggerheart advantage gap documentation, missing fallback prose cleanup guidance, and a verification grep criterion.
