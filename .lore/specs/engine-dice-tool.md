---
title: Engine Dice Tool
date: 2026-03-29
status: approved
tags: [dice, mcp, engine-tool, session-runner, agent-sdk]
modules: [backend]
related: [.lore/brainstorm/rpg-system-loading.md, .lore/specs/mvp.md]
req-prefix: DICE
---

# Spec: Engine Dice Tool

## Overview

The dice roller moves from a plugin skill to an engine-provided MCP tool. Every session gets it automatically, regardless of which plugins are loaded. The engine does all arithmetic; the AI narrates results without computing anything.

This replaces the corvran `dice-roller` skill (`plugins/corvran/skills/dice-roller/`), which is a bash script invoked through the Bash tool. The new tool is an in-process MCP server registered with the Agent SDK, eliminating the shell overhead and the cross-plugin path dependency (`${CLAUDE_PLUGIN_ROOT}/../corvran/`) that currently ties system plugins to corvran.

The corvran dice-roller skill and all cross-plugin references to it are removed as part of this spec. The companion "Adventure System Integration" spec covers plugin manifests, bootstrap prompts, per-adventure plugin loading, and prompt service changes. This spec does not duplicate that work.

## Entry Points

- AI invokes `mcp__corvran__roll_dice` tool during gameplay (attack rolls, skill checks, damage, etc.)
- The tool is available in every session, registered by the session runner at query time

## Requirements

### MCP Tool Contract

- REQ-DICE-1: The tool is named `roll_dice`, exposed through an MCP server named `corvran`. The AI sees it as `mcp__corvran__roll_dice`.

- REQ-DICE-2: Input schema:

```typescript
{
  groups: Array<{
    n: number,       // number of dice to roll (minimum 1)
    d: number,       // number of sides per die (minimum 2)
    label?: string   // optional label for this group (e.g., "attack", "hope", "fear")
  }>,                // at least one group required
  modifier?: number, // integer added to the total (default 0, may be negative)
  threshold?: number // target number; if provided, output includes whether total met it
}
```

- REQ-DICE-3: Output schema:

```typescript
{
  groups: Array<{
    label?: string,   // echoed from input if provided
    rolls: number[]   // individual die results for this group
  }>,
  modifier: number,   // echoed from input (0 if not provided)
  total: number,       // sum of all rolls across all groups plus modifier
  threshold?: number,  // echoed from input if provided
  met?: boolean        // true if total >= threshold (present only when threshold is provided)
}
```

- REQ-DICE-4: The tool returns its output as a JSON string in a text content block (`{ type: "text", text: JSON.stringify(result) }`), following MCP `CallToolResult` conventions.

### Examples

- REQ-DICE-5: D&D attack roll (d20+5 vs AC 15):

```json
// Input
{ "groups": [{ "n": 1, "d": 20, "label": "attack" }], "modifier": 5, "threshold": 15 }
// Output
{ "groups": [{ "label": "attack", "rolls": [14] }], "modifier": 5, "total": 19, "threshold": 15, "met": true }
```

The AI sees: roll was 14, modifier +5, total 19, met the threshold of 15. It narrates: "Your sword strikes true."

- REQ-DICE-6: Daggerheart action roll (Duality Dice + 3 vs difficulty 14):

```json
// Input
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 3, "threshold": 14 }
// Output
{ "groups": [{ "label": "hope", "rolls": [9] }, { "label": "fear", "rolls": [6] }], "modifier": 3, "total": 18, "threshold": 14, "met": true }
```

The AI sees: hope die was 9, fear die was 6 (player gains Hope), total 18 meets the threshold. It narrates accordingly. The "which die is higher" logic is the AI's job (it reads the labeled groups), not the tool's.

- REQ-DICE-7: Simple damage roll (2d6+3, no threshold):

```json
// Input
{ "groups": [{ "n": 2, "d": 6 }], "modifier": 3 }
// Output
{ "groups": [{ "rolls": [4, 2] }], "modifier": 3, "total": 9 }
```

No threshold means no `threshold` or `met` fields in the output.

### Implementation Location

- REQ-DICE-8: The dice tool lives in a new module at `packages/backend/src/services/dice-tool.ts`. This module exports a function that creates the MCP server configuration using the Agent SDK's `createSdkMcpServer` and `tool` helpers:

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
```

The module exports a factory function (consistent with the project's DI pattern) that returns the `McpSdkServerConfigWithInstance` value. The session runner passes this to query options via `mcpServers`.

- REQ-DICE-9: The session runner (`packages/backend/src/services/session-runner.ts`) creates the dice MCP server once at construction time and includes it in every query's `mcpServers` option. The server is shared across queries because no per-query or per-session state is accumulated; each `roll_dice` invocation is independent. The dice MCP server creation is independent of the per-adventure plugin path changes described in the companion Adventure System Integration spec.

```typescript
// In session-runner.ts, conceptually:
const diceMcpServer = createDiceTool();

return queryFn({
  prompt: playerMessage,
  options: {
    // ...existing options...
    mcpServers: {
      corvran: diceMcpServer,
    },
  },
});
```

The `allowedTools` array in session runner gains `"mcp__corvran__roll_dice"` so the tool is auto-approved (no permission prompt).

### Randomness

- REQ-DICE-10: Dice rolls use `Math.random()` via `Math.floor(Math.random() * d) + 1` for a die with `d` sides. This is adequate for gameplay. Cryptographic randomness is not required.

- REQ-DICE-11: The randomness source is injected as a dependency to the dice tool factory, defaulting to `Math.random`. Tests supply a deterministic source.

```typescript
export function createDiceTool(deps?: { random?: () => number }) {
  const random = deps?.random ?? Math.random;
  // ...
}
```

### Input Validation

- REQ-DICE-12: The tool validates inputs and returns clear errors:
  - `groups` must be a non-empty array
  - Each group's `n` must be a positive integer (>= 1)
  - Each group's `d` must be an integer >= 2
  - `modifier`, if provided, must be an integer (may be negative or zero)
  - `threshold`, if provided, must be a number

Zod handles validation at the schema level. Invalid inputs produce a Zod validation error that surfaces to the AI, which can retry with corrected input.

- REQ-DICE-13: Upper bounds: `n` is capped at 100 dice per group. `d` is capped at 1000 sides. These prevent runaway computation from malformed requests without restricting any real RPG use case. Exceeding the cap returns an error, not a silent clamp.

### What Gets Removed

- REQ-DICE-14: The entire `plugins/corvran/skills/dice-roller/` directory is deleted:
  - `plugins/corvran/skills/dice-roller/SKILL.md`
  - `plugins/corvran/skills/dice-roller/scripts/roll.sh`
  - `plugins/corvran/skills/dice-roller/scripts/roll.test.sh`

The corvran plugin retains only `skills/gm-craft/`.

- REQ-DICE-15: All cross-plugin dice-roller references are removed from system plugin skill files. These are `${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh` invocations in:
  - `plugins/d20-system/skills/d20-combat/SKILL.md`
  - `plugins/d20-system/skills/d20-players/SKILL.md`
  - `plugins/d20-system/skills/d20-monsters/SKILL.md` (and `references/npc-example.md`)
  - `plugins/daggerheart-system/skills/dh-combat/SKILL.md`
  - `plugins/daggerheart-system/skills/dh-players/SKILL.md`
  - `plugins/daggerheart-system/skills/dh-adversaries/references/stat-block-example.md`
  - `plugins/daggerheart-system/skills/dh-domains/SKILL.md`

These references are replaced with instructions to use the `mcp__corvran__roll_dice` tool with the appropriate input. Each replacement must include a concrete example input showing the equivalent call. For example, where a skill currently says:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d20+5"
```

It becomes:

```
Use the mcp__corvran__roll_dice tool:
{ "groups": [{ "n": 1, "d": 20 }], "modifier": 5 }
```

Any "dice roller fallback" prose in skill files (e.g., "if the dice-roller skill is unavailable, describe the required roll") is removed. The engine dice tool is always available; there is no fallback scenario.

Verification: run `grep -r 'corvran/skills/dice-roller' plugins/` after cleanup to confirm no references remain.

- REQ-DICE-16: The existing Duality Dice notation (`DdD`) in the bash script is not preserved. Duality Dice are expressed as two labeled groups (`{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }`). The AI determines which die is higher from the labeled output. This is more explicit and works for any system that uses distinguishable dice.

### Scope Boundaries

- REQ-DICE-17: In scope: standard dice (NdD) where D >= 2, with optional integer modifier and optional threshold comparison. Groups with labels. Multiple groups in a single call.

- REQ-DICE-18: Out of scope (v2):
  - Fudge/Fate dice (d values of -1, 0, +1 instead of 1-to-N)
  - Exploding dice (reroll and add on max value)
  - Drop lowest/keep highest (e.g., "4d6 drop lowest")
  - Advantage/disadvantage as a built-in. For D&D-style advantage (roll twice, pick higher), the AI makes two tool calls and selects the higher result. For Daggerheart-style advantage (add a d6), the AI includes the d6 as an additional labeled group in the same call; the total sums all groups, so it works naturally. For Daggerheart-style disadvantage (subtract a d6), the AI makes a separate call for the d6 and subtracts narratively, since all groups are additive. The skill file replacement instructions should document these patterns.
  - Per-group modifiers (modifier applies to the total, not individual groups)
  - Dice expression string parsing (the old `"2d6+3"` format). Input is structured JSON, not a string to parse.

## Testing

- REQ-DICE-19: The dice tool module (`dice-tool.ts`) requires unit tests covering:

  **Arithmetic correctness:**
  - Single group, single die (1d20)
  - Single group, multiple dice (3d6)
  - Multiple groups (hope d12 + fear d12)
  - Positive modifier applied to total
  - Negative modifier applied to total
  - Zero modifier (explicit and default)

  **Threshold evaluation:**
  - Total meets threshold exactly (met: true)
  - Total exceeds threshold (met: true)
  - Total below threshold (met: false)
  - No threshold provided (no `threshold` or `met` in output)

  **Labels:**
  - Labels echoed from input to output
  - Groups without labels produce output without labels
  - Mixed labeled and unlabeled groups

  **Edge cases:**
  - Minimum valid input: one group, one die, two sides (`{ groups: [{ n: 1, d: 2 }] }`)
  - Maximum cap: 100 dice per group, 1000 sides per die (succeeds)
  - Over cap: 101 dice or 1001 sides (error)
  - n = 0 (rejected by validation, n >= 1)
  - d = 1 (rejected by validation, d >= 2)
  - Empty groups array (rejected by validation)
  - Large negative modifier that makes total negative (valid, total can be negative)

  **Determinism:**
  - All tests inject a deterministic random function so results are predictable
  - Tests verify exact roll values, not just ranges

- REQ-DICE-20: Tests live at `packages/backend/tests/services/dice-tool.test.ts`, following the existing test directory structure.

## Assumptions

1. The Agent SDK's `createSdkMcpServer` creates an in-process MCP server that the SDK subprocess can call without spawning a separate process. Verified: the SDK types export this function with a `tools` array parameter (see `agentSdkTypes.d.ts:28`).

2. The `mcpServers` option on query accepts `McpSdkServerConfigWithInstance` values (in-process servers) alongside stdio/SSE/HTTP configs. Verified: `Options.mcpServers` is typed as `Record<string, McpServerConfig>` where `McpServerConfig` includes `McpSdkServerConfigWithInstance` (see `runtimeTypes.d.ts:71,395`).

3. MCP tool names follow the `mcp__<server>__<tool>` convention. The server name `corvran` and tool name `roll_dice` produce `mcp__corvran__roll_dice`.

4. `Math.random()` in Bun uses a PRNG seeded from system entropy, same as Node.js. Adequate for non-cryptographic gameplay dice.
