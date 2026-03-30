---
title: "Implementation plan: engine-dice-tool"
date: 2026-03-29
status: draft
tags: [plan, dice, mcp, engine-tool, session-runner, agent-sdk]
modules: [backend]
related: [.lore/specs/engine-dice-tool.md, .lore/reference/architecture-pattern.md, .lore/plans/mvp-implementation.md]
---

# Plan: Engine Dice Tool

Three phases: build the tool, wire it in, clean up the old one. Each phase is independently testable. Each has a review gate before proceeding.

## Spec Reference

**Spec**: `.lore/specs/engine-dice-tool.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-DICE-1 | 1 | Tool named `roll_dice`, MCP server named `corvran` |
| REQ-DICE-2 | 1 | Input schema (groups, modifier, threshold) |
| REQ-DICE-3 | 1 | Output schema (groups with rolls, modifier, total, threshold, met) |
| REQ-DICE-4 | 1 | JSON string in text content block |
| REQ-DICE-5 | 1 | D&D attack roll example (verified by test) |
| REQ-DICE-6 | 1 | Daggerheart Duality Dice example (verified by test) |
| REQ-DICE-7 | 1 | Simple damage roll example (verified by test) |
| REQ-DICE-8 | 1 | Module at `packages/backend/src/services/dice-tool.ts` |
| REQ-DICE-9 | 2 | Session runner creates and includes dice MCP server |
| REQ-DICE-10 | 1 | `Math.random()` via `Math.floor(Math.random() * d) + 1` |
| REQ-DICE-11 | 1 | Randomness source injected, defaults to `Math.random` |
| REQ-DICE-12 | 1 | Input validation (non-empty groups, n >= 1, d >= 2, integer modifier) |
| REQ-DICE-13 | 1 | Upper bounds (n <= 100, d <= 1000, error on exceed) |
| REQ-DICE-14 | 3 | Delete `plugins/corvran/skills/dice-roller/` |
| REQ-DICE-15 | 3 | Remove all cross-plugin dice-roller references |
| REQ-DICE-16 | 3 | DdD notation not preserved (Duality Dice via labeled groups) |
| REQ-DICE-17 | 1 | Standard dice scope (NdD, modifier, threshold, labels, groups) |
| REQ-DICE-18 | — | Out of scope items (no work needed, but advantage/disadvantage patterns documented inline per REQ-DICE-15 replacements) |
| REQ-DICE-19 | 1 | Unit tests covering arithmetic, thresholds, labels, edges, determinism |
| REQ-DICE-20 | 1 | Tests at `packages/backend/tests/services/dice-tool.test.ts` |

## Codebase Context

**Session runner** (`packages/backend/src/services/session-runner.ts`): 48 lines. DI factory pattern (`createSessionRunner(deps)`). Returns `{ runQuery }`. Currently configures `tools`, `allowedTools`, `plugins`, `permissionMode`, and `model` on each query. No `mcpServers` option used yet. The `TOOLS` constant at line 17 lists allowed tools; `allowedTools` mirrors it at line 36.

**App wiring** (`packages/backend/src/app.ts`): `createApp(deps)` builds the Hono app. Session runner is created when `deps.queryFn` is provided (line 85-93). Plugin paths are resolved from `cwd()` (line 57-61). The session runner receives `{ queryFn, config: { pluginPaths, model } }`.

**Agent SDK types** (`package.json` declares `^0.1.69`; installed version at time of plan was 0.1.77):
- `createSdkMcpServer({ name, version?, tools? })` returns `McpSdkServerConfigWithInstance` (`agentSdkTypes.d.ts:17-28`)
- `tool(name, description, inputSchema, handler)` returns `SdkMcpToolDefinition` (`agentSdkTypes.d.ts:16`)
- `Options.mcpServers` accepts `Record<string, McpServerConfig>` where `McpServerConfig` includes `McpSdkServerConfigWithInstance` (`runtimeTypes.d.ts:395`)
- The `tool` helper and `createSdkMcpServer` are both top-level exports of `@anthropic-ai/claude-agent-sdk`

**Existing dice-roller** (`plugins/corvran/skills/dice-roller/`): Three files. `SKILL.md` describes the skill, `scripts/roll.sh` is a bash script supporting NdD, NdF (Fudge), and DdD (Duality) notation, `scripts/roll.test.sh` tests it. Uses `$RANDOM` for randomness, outputs flat JSON.

**Cross-plugin references**: 21 invocations of `${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh` across 8 files in two system plugins:

| File | Count | Dice Expressions Used |
|------|-------|-----------------------|
| `plugins/d20-system/skills/d20-combat/SKILL.md` | 3 | `1d20+2`, `1d20+5`, `1d8+3` |
| `plugins/d20-system/skills/d20-players/SKILL.md` | 5 | `4d6` (x2), `1d10`, `5d4`, `1d100` |
| `plugins/d20-system/skills/d20-monsters/SKILL.md` | 3 | `3d8+6`, `1d8+3`, `2d6+4` |
| `plugins/d20-system/skills/d20-monsters/references/npc-example.md` | 3 | `3d6`, `1d6+2`, `1d4` |
| `plugins/daggerheart-system/skills/dh-combat/SKILL.md` | 1 | `DdD+3` |
| `plugins/daggerheart-system/skills/dh-players/SKILL.md` | 2 | `DdD+2`, `1d6` |
| `plugins/daggerheart-system/skills/dh-domains/SKILL.md` | 1 | `DdD+[trait]` |
| `plugins/daggerheart-system/skills/dh-adversaries/references/stat-block-example.md` | 3 | `1d8+2`, `1d6` (x2) |

Additionally, 4 files contain "Dice Roller Fallback" or "Fallback Without Dice Roller" sections that must be removed (d20-combat, d20-players, d20-monsters, dh-combat).

**Test conventions**: Tests use `bun:test` (`describe`, `test`, `expect`). Test files live in `packages/backend/tests/`. Services are tested via their factory functions with injected deps. No `mock.module()`.

## Implementation Steps

### Phase 1: Build the Dice Tool Module

Create the MCP server, wire up the tool, write all unit tests. This phase is self-contained: no other files change.

#### Step 1.1: Create `packages/backend/src/services/dice-tool.ts`

**Files**: `packages/backend/src/services/dice-tool.ts` (new)
**Addresses**: REQ-DICE-1, REQ-DICE-2, REQ-DICE-3, REQ-DICE-4, REQ-DICE-8, REQ-DICE-10, REQ-DICE-11, REQ-DICE-12, REQ-DICE-13, REQ-DICE-17

The module exports a single factory function:

```typescript
export function createDiceTool(deps?: { random?: () => number }): McpSdkServerConfigWithInstance
```

Internal structure:

1. Define the Zod input schema matching REQ-DICE-2. Use `z.array()` with `.min(1)` for groups. Each group: `n` as `z.number().int().min(1).max(100)`, `d` as `z.number().int().min(2).max(1000)`, `label` as `z.string().optional()`. Top-level: `modifier` as `z.number().int().optional()`, `threshold` as `z.number().optional()`.

2. Implement the roll logic. For each group, roll `n` dice of `d` sides using the injected random function (defaulting to `Math.random`). Formula per die: `Math.floor(random() * d) + 1`.

3. Build the output per REQ-DICE-3: echo labels from input, compute total across all groups plus modifier, evaluate threshold if provided.

4. Return the result as `{ type: "text", text: JSON.stringify(result) }` per MCP `CallToolResult` conventions (REQ-DICE-4).

5. Use `tool()` from the Agent SDK to define the tool with name `roll_dice` and the Zod schema.

6. Use `createSdkMcpServer({ name: "corvran", tools: [rollDiceTool] })` to create the server. Return the result directly from the factory.

Import pattern:
```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
```

**SDK version note**: The spec references SDK v0.1.77 types; the `package.json` declares `^0.1.69`. Before writing imports, verify that `createSdkMcpServer` and `tool` are exported by the installed version. Check `node_modules/@anthropic-ai/claude-agent-sdk/` for the actual type declarations. If the installed version lacks these exports, run `bun add @anthropic-ai/claude-agent-sdk@latest` to update.

#### Step 1.2: Write unit tests

**Files**: `packages/backend/tests/services/dice-tool.test.ts` (new)
**Addresses**: REQ-DICE-19, REQ-DICE-20

All tests inject a deterministic random function. The simplest approach: a function that returns values from a pre-defined sequence. For example, a `createSequence([0.5, 0.1, 0.9])` helper that returns values in order, making roll results predictable.

Since the tool is wrapped in an MCP server, tests should call the tool handler directly rather than going through the MCP protocol. Extract or export the roll logic as a testable function alongside the factory. One clean approach: export both `createDiceTool` (the MCP server factory) and a `rollDice` function (the pure logic) from the module. The `rollDice` function should accept already-validated input and handle the arithmetic. The Zod schema and validation live in the tool handler that wraps `rollDice`.

Tests exercise `rollDice` directly for arithmetic correctness. Validation error tests (n=0, d=1, empty groups) must invoke the tool handler, not `rollDice`, because Zod validation happens before the handler calls `rollDice`. Export the handler or a thin wrapper that runs validation + logic for this purpose. One integration test verifies `createDiceTool` returns a valid `McpSdkServerConfigWithInstance`.

Test categories from REQ-DICE-19:

**Arithmetic correctness** (6 tests):
- Single group, single die: `{ groups: [{ n: 1, d: 20 }] }` with random returning 0.65 produces roll of 14
- Single group, multiple dice: `{ groups: [{ n: 3, d: 6 }] }` with known sequence
- Multiple groups with labels: hope d12 + fear d12, verify labeled output
- Positive modifier: total = sum of rolls + modifier
- Negative modifier: total = sum of rolls + (negative modifier)
- Zero modifier: explicit `modifier: 0` and default (omitted) both produce modifier 0 in output

**Threshold evaluation** (4 tests):
- Total equals threshold exactly: `met: true`
- Total exceeds threshold: `met: true`
- Total below threshold: `met: false`
- No threshold: output has no `threshold` or `met` fields

**Labels** (3 tests):
- Labels echoed from input
- Groups without labels: no `label` field in output group
- Mixed labeled and unlabeled groups

**Edge cases** (5 tests):
- Minimum valid: `{ groups: [{ n: 1, d: 2 }] }` succeeds
- Maximum cap: `{ groups: [{ n: 100, d: 1000 }] }` succeeds
- Over cap n: `{ groups: [{ n: 101, d: 6 }] }` errors
- Over cap d: `{ groups: [{ n: 1, d: 1001 }] }` errors
- Large negative modifier making total negative: valid, returns negative total

**Validation errors** (3 tests):
- `n = 0` rejected
- `d = 1` rejected
- Empty groups array rejected

**Integration** (1 test):
- `createDiceTool()` returns an object with an `instance` property (confirming MCP server creation)

#### Step 1.3: Run tests, verify all pass

```bash
bun test packages/backend/tests/services/dice-tool.test.ts
```

**Review gate**: All 22+ tests pass. Thorne reviews the module for correctness, schema compliance with spec, and DI pattern consistency before Phase 2.

---

### Phase 2: Wire Into Session Runner

Connect the dice tool to the session runner so every query gets it. Small change, high impact.

#### Step 2.1: Update session runner

**Files**: `packages/backend/src/services/session-runner.ts`
**Addresses**: REQ-DICE-9

Three changes to the session runner:

1. Import `createDiceTool` from `./dice-tool.js`.

2. Create the dice MCP server once at the top of `createSessionRunner`, before `runQuery` is defined. The spec says it's created at construction time and shared across queries (no per-query state). Add this after the destructuring of `deps`:

   ```typescript
   const diceMcpServer = createDiceTool();
   ```

3. In the `runQuery` function, add `mcpServers` to the options passed to `queryFn`:

   ```typescript
   mcpServers: {
     corvran: diceMcpServer,
   },
   ```

4. Add `"mcp__corvran__roll_dice"` to the `allowedTools` array so the tool is auto-approved. The current `TOOLS` constant is used for both `tools` (available built-in tools) and `allowedTools`. The MCP tool name goes only in `allowedTools`, not in `tools` (which controls built-in tools like Bash, Read, etc.). Update the `allowedTools` line in the query options:

   ```typescript
   allowedTools: [...TOOLS, "mcp__corvran__roll_dice"],
   ```

#### Step 2.2: Verify build

```bash
cd packages/backend && bunx tsc --noEmit
```

Typecheck confirms the imports resolve and the `mcpServers` option is correctly typed.

#### Step 2.3: Run full backend test suite

```bash
bun test packages/backend/tests/
```

Existing tests must still pass. The session runner tests (if any exist via `message-route.test.ts`) should not break because the mock `queryFn` receives the new options but doesn't validate them.

**Review gate**: Build passes. All existing tests pass. Thorne reviews the session runner changes for correct placement (construction-time, not per-query) and `allowedTools` wiring.

---

### Phase 3: Remove Old Dice-Roller and Update References

Delete the bash skill, rewrite all cross-plugin references to use `mcp__corvran__roll_dice`, remove fallback prose. This phase touches only plugin markdown files; no TypeScript changes.

#### Step 3.1: Delete the dice-roller skill directory

**Files**: `plugins/corvran/skills/dice-roller/` (entire directory removed)
**Addresses**: REQ-DICE-14

Delete these three files:
- `plugins/corvran/skills/dice-roller/SKILL.md`
- `plugins/corvran/skills/dice-roller/scripts/roll.sh`
- `plugins/corvran/skills/dice-roller/scripts/roll.test.sh`

Verify `plugins/corvran/skills/` still contains `gm-craft/` and nothing else.

#### Step 3.2: Update d20-system skill files

**Files**: 4 files in `plugins/d20-system/`
**Addresses**: REQ-DICE-15, REQ-DICE-16

For each bash invocation, replace with an `mcp__corvran__roll_dice` tool call example showing the equivalent structured input. The replacement pattern:

**Before** (bash code block):
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d20+5"
```

**After** (plain text block):
```
Use the mcp__corvran__roll_dice tool:
{ "groups": [{ "n": 1, "d": 20 }], "modifier": 5 }
```

Specific replacements by file:

**`d20-combat/SKILL.md`** (3 replacements + 1 section removal):
- Line 30: `1d20+2` (initiative) becomes `{ "groups": [{ "n": 1, "d": 20 }], "modifier": 2 }`
- Line 101: `1d20+5` (attack) becomes `{ "groups": [{ "n": 1, "d": 20 }], "modifier": 5 }`
- Line 134: `1d8+3` (damage) becomes `{ "groups": [{ "n": 1, "d": 8 }], "modifier": 3 }`
- Remove the "Dice Roller Fallback" section at the bottom (lines 228-233)

**`d20-players/SKILL.md`** (5 replacements + 1 section removal):
- Line 45: `4d6` (ability scores) becomes `{ "groups": [{ "n": 4, "d": 6 }] }`. Note: the "drop lowest" logic stays in the surrounding prose (the AI handles it)
- Line 168: `1d10` (HP on level up) becomes `{ "groups": [{ "n": 1, "d": 10 }] }`
- Line 199: `4d6` (ability scores again) becomes `{ "groups": [{ "n": 4, "d": 6 }] }`
- Line 204: `5d4` (starting gold) becomes `{ "groups": [{ "n": 5, "d": 4 }] }`
- Line 209: `1d100` (trinket) becomes `{ "groups": [{ "n": 1, "d": 100 }] }`
- Remove the "Fallback Without Dice Roller" section (lines 212-217)

**`d20-monsters/SKILL.md`** (3 replacements + 1 fallback line removal):
- Line 151: `3d8+6` becomes `{ "groups": [{ "n": 3, "d": 8 }], "modifier": 6 }`
- Line 154: `1d8+3` becomes `{ "groups": [{ "n": 1, "d": 8 }], "modifier": 3 }`
- Line 157: `2d6+4` becomes `{ "groups": [{ "n": 2, "d": 6 }], "modifier": 4 }`
- Remove the fallback line at 162: "If the dice-roller skill is unavailable..."

**`d20-monsters/references/npc-example.md`** (3 replacements):
- Line 134: `3d6` becomes `{ "groups": [{ "n": 3, "d": 6 }] }`
- Line 139: `1d6+2` becomes `{ "groups": [{ "n": 1, "d": 6 }], "modifier": 2 }`
- Line 144: `1d4` becomes `{ "groups": [{ "n": 1, "d": 4 }] }`

#### Step 3.3: Update daggerheart-system skill files

**Files**: 4 files in `plugins/daggerheart-system/`
**Addresses**: REQ-DICE-15, REQ-DICE-16

Daggerheart replacements convert `DdD` notation to labeled groups per REQ-DICE-16.

**`dh-combat/SKILL.md`** (1 replacement + 1 section removal + advantage/disadvantage pattern notes):
- Line 106: `DdD+3` becomes:
  ```
  Use the mcp__corvran__roll_dice tool:
  { "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 3 }
  ```
  Update the example output block below it to match the new schema (groups with labeled rolls instead of flat `hope`/`fear`/`higher` fields).
- Remove the "Dice Roller Fallback" section at the bottom (lines 373-378)
- In the Advantage section (~line 127), add a brief inline note showing how advantage works with the new tool: include a third labeled d6 group (`{ "label": "advantage" }`) in the same call, since all groups sum. For disadvantage, note that the AI makes a separate call for the d6 and subtracts narratively (all groups are additive). These notes are part of the replacement instructions per REQ-DICE-15, documenting the patterns the spec describes in REQ-DICE-18's scope boundary.

**`dh-players/SKILL.md`** (2 replacements + 1 section removal):
- Line 360: `DdD+2` becomes `{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 2 }`
- Line 365: `1d6` becomes `{ "groups": [{ "n": 1, "d": 6 }] }`
- Remove the "Fallback Without Dice Roller" section (lines 368-373)

**`dh-domains/SKILL.md`** (1 replacement):
- Line 67: `DdD+[trait]` becomes:
  ```
  Use the mcp__corvran__roll_dice tool:
  { "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": [trait] }
  ```

**`dh-adversaries/references/stat-block-example.md`** (3 replacements):
- Line 191: `1d8+2` becomes `{ "groups": [{ "n": 1, "d": 8 }], "modifier": 2 }`
- Line 196: `1d6` becomes `{ "groups": [{ "n": 1, "d": 6 }] }`
- Line 201: `1d6` becomes `{ "groups": [{ "n": 1, "d": 6 }] }`

#### Step 3.4: Verify no references remain

Run a grep across all plugins to confirm cleanup is complete:

```bash
grep -r 'corvran/skills/dice-roller' plugins/
```

Expected result: no matches. If any remain, fix them before proceeding.

#### Step 3.5: Build verification

```bash
cd packages/backend && bunx tsc --noEmit
bun test packages/backend/tests/
```

TypeScript changes were only in Phase 2, but verify the full build still passes after all changes. Run the dice-tool tests specifically to confirm they're unaffected by the plugin file changes.

**Review gate**: Grep returns zero matches for old references. All tests pass. Thorne reviews the skill file rewrites for: correct JSON input examples, consistent formatting, complete removal of fallback sections, and that Duality Dice examples use labeled groups correctly.

## Delegation Guide

| Phase | Worker | Expertise |
|-------|--------|-----------|
| Phase 1 (build) | Dalton | Standard TypeScript, Agent SDK MCP integration |
| Phase 2 (wire) | Dalton | Session runner internals |
| Phase 3 (cleanup) | Dalton | Markdown editing (no code, but many files) |
| Review gates | Thorne | Correctness review at each phase boundary |
| Final validation | Thorne | Spec compliance check against all REQ-DICE-* requirements |

Phase 3 is the most error-prone despite being "just markdown." Twenty-one replacements across eight files with system-specific formatting. The review gate catches missed references or malformed JSON examples.

## Open Questions

1. **Test directory structure**: The spec says `packages/backend/tests/services/dice-tool.test.ts`, but existing tests live flat in `packages/backend/tests/` (no `services/` subdirectory). Dalton should create the `services/` subdirectory as specified in REQ-DICE-20, establishing the pattern for future service tests.

2. **MCP server name collision**: The server is named `corvran`, which is also the name of the corvran plugin. If the plugin ever exposes its own MCP server with the same name, there would be a conflict. This is fine for now (the plugin uses skills, not MCP servers), but worth noting. The spec explicitly chose this name (REQ-DICE-1).

3. **Export shape of dice-tool.ts**: The plan recommends exporting both `createDiceTool` (factory) and `rollDice` (pure logic) for testability. The spec only mentions the factory. Dalton should export both, but keep `rollDice` as a named export, not a default. The factory is the public contract; the pure function is the testing seam.
