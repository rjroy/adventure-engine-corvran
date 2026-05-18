---
title: "Implementation plan: pi-agent model resolution fix"
date: 2026-05-18
status: draft
tags: [plan, pi-agent, model-resolution, compaction, provider-neutrality]
modules: [backend]
related: [.lore/retros/2026-05-pi-agent-migration.md]
---

# Plan: pi-agent model resolution fix

## Goal

Make Adventure Engine model resolution respect the user's pi-agent provider config — including extension-registered providers like `pi-fallback-provider` and `~/.pi/agent/settings.json` defaults — instead of hardcoding Anthropic aliases at startup. Two surfaces are wrong today and need separate fixes:

1. **GM session-runner** resolves a model eagerly via static `getModel("anthropic", ...)` at runner-construction time. The static API only sees compile-time-known built-in models, so extension-registered providers are invisible. The migration guide gotcha #5 spells out that `session.modelRegistry.find` post-`bindExtensions` is the only correct path.
2. **Compaction service** calls `completeSimple(model, ...)` standalone outside any bound session. Per migration guide gotcha #4, this bypasses every extension hook — including `pi-fallback-provider`'s `streamSimple` wrapper — so the user's fallback routing never applies to summarization even if we fixed (1).

Success looks like: a user with `defaultProvider: "fallback"` and the `pi-fallback-provider` extension can run both a GM turn and a compaction without any Anthropic-specific config, and both calls route through the fallback provider's hooks. A user who explicitly configures `MODEL=openrouter/some-model` and `COMPACTION_MODEL=openai/gpt-5` gets exactly those providers, with a console warning + sensible fallback if a configured model isn't in the registry.

## Codebase Context

**The three sites that need to change**:

- `packages/backend/src/services/session-runner.ts:30-63` — `MODEL_ALIASES` table, `resolveModel`, `ProviderKey`/`ModelIdKey` casts, and the eager `resolveModel(config.model)` in `createSessionRunner` (line 156). The runner's return object exposes a `model` field that is no longer meaningful once resolution is deferred to `runQuery`.
- `packages/backend/src/app.ts:91-114` — `createSummarizeFn(modelString)` builds a `Model` once via `resolveModel` and captures it in closure. The closure body calls `completeSimple(model, ...)` directly — no bound session, no extension hooks.
- `packages/backend/src/services/compaction-service.ts` — `SummarizeFn(systemPrompt, text, signal) → string` contract is fine as-is. Only the production wiring needs to change; the service itself is decoupled from how the model is resolved or called.

**Reference pattern** (oracle-keep, `/home/rjroy/Projects/oracle-keep/lib/session.ts:49-57, 110-130`):

```ts
function parseModelString(s: string): { provider: string; modelId: string } | null {
  if (!s) return null;
  const slash = s.indexOf("/");
  if (slash === -1) return null;
  return { provider: s.slice(0, slash), modelId: s.slice(slash + 1) };
}

// post-bindExtensions:
const parsed = parseModelString(config.model);
if (parsed) {
  const model = session.modelRegistry.find(parsed.provider, parsed.modelId);
  if (model) await session.setModel(model);
  else console.warn(`model "${config.model}" not found in registry, using session default`);
}
```

The "no model configured" path (parsed is null) skips `setModel` entirely; the session uses whatever `~/.pi/agent/settings.json` resolves to (in this user's case, `fallback/basic`).

**Test surface**:

- `packages/backend/tests/services/compaction-service.test.ts` — passes `summarize: SummarizeFn` stubs directly. Unaffected.
- `packages/backend/tests/routes/compact-endpoint.test.ts` — passes `summarize` stubs. Unaffected.
- `packages/backend/tests/routes/message-threshold.test.ts` — same. Unaffected.
- `packages/backend/tests/message-route.test.ts` — uses `createMockSessionRunner`, never touches the real session-runner. Unaffected.
- `packages/backend/tests/adventure-creation.test.ts`, `system-routes.test.ts` — use `createApp({ noAi: true })`. Unaffected.
- `tests/mock-sdk-integration.test.ts` — injects a mock SessionRunner. Unaffected.

The real session-runner has **no direct unit tests**. It's covered transitively through `mock-sdk-integration` (mock runner) and live smoke. This is a gap, but introducing tests for it here would couple to pi-agent internals; punt to a follow-up issue.

**Out of scope for this plan** (call out for back-propagation later):

- `.lore/reference/architecture-pattern.md` — still mandates claude-agent-sdk. Stale since the migration commit.
- `.lore/specs/compaction-system.md` REQ-COMP-9a and REQ-COMP-25 — still talk about `QueryFn` and SDK options. Stale.
- `.lore/retros/2026-05-pi-agent-migration.md` — documents the alias scheme this plan is removing. After this plan executes, the retro needs an addendum.

## Implementation Steps

### Step 1: Strip the alias scheme from session-runner (and its mock)

**Files**: `packages/backend/src/services/session-runner.ts`, `packages/backend/tests/helpers/mock-session-runner.ts`
**Expertise**: none

In `session-runner.ts`, remove:
- The `MODEL_ALIASES` table (lines 30-35).
- `resolveModel` function (lines 42-63).
- The `AnyModel`, `ProviderKey`, `ModelIdKey` type aliases (lines 14-17, 37-40).
- The `getModel` import from `@earendil-works/pi-ai`.
- The `modelOverride?: AnyModel` field on `createSessionRunner`'s deps.
- The `const model = deps.modelOverride ?? resolveModel(config.model);` line in `createSessionRunner`.
- The `model` field on the runner's return value.

`modelOverride` is safe to drop without replacement: every real-runner test path uses `createMockSessionRunner` rather than the real `createSessionRunner`, and once resolution is deferred into `runQuery` against a live pi session, there is no construction-time injection point that could be meaningful.

Keep `ImageContent`, `TextContent` imports — still used by `formatToolResultForClient`.

Change `SessionRunnerConfig` to:

```ts
export interface SessionRunnerConfig {
  /** Optional "provider/modelId" string. When omitted, the session uses pi's settings default. */
  model?: string;
}
```

`createSessionRunner`'s return becomes `{ runQuery }` (no `model`).

In `mock-session-runner.ts`:
- Drop the `model: ...` field on the returned object (line 98 — currently casts a stub through `SessionRunner["model"]`, which becomes a compile error the moment `model` is removed from the source type).
- Drop any field-by-field references on `MockSessionRunner`; the `extends SessionRunner` clause already inherits the new shape.

Without this, all 658 tests fail to compile.

### Step 2: Add deferred model resolution inside runQuery

**Files**: `packages/backend/src/services/session-runner.ts`
**Expertise**: none

Add a private helper near the top of the file:

```ts
function parseModelString(s: string | undefined): { provider: string; modelId: string } | null {
  if (!s) return null;
  const slash = s.indexOf("/");
  if (slash === -1) return null;
  return { provider: s.slice(0, slash), modelId: s.slice(slash + 1) };
}
```

In `runQuery`, between `await session.bindExtensions({})` and any other use of the session, do the registry lookup:

```ts
await session.bindExtensions({});

const parsed = parseModelString(config.model);
if (parsed) {
  const model = session.modelRegistry.find(parsed.provider, parsed.modelId);
  if (model) {
    await session.setModel(model);
  } else {
    console.warn(
      `[session-runner] model "${config.model}" not found in registry, using session default`,
    );
  }
} else if (config.model) {
  // Set but malformed (no slash) — log and fall through to default.
  console.warn(
    `[session-runner] model "${config.model}" is malformed (expected "provider/modelId"), using session default`,
  );
}
```

Remove the existing `await session.setModel(model)` line that ran after `bindExtensions`. If no model is configured or it doesn't resolve, the session stays at registry default (which respects `~/.pi/agent/settings.json`'s `defaultProvider`/`defaultModel`, including the user's `fallback/basic`).

### Step 3: Build a bound-session summarize fn for compaction

**Files**: `packages/backend/src/app.ts`
**Expertise**: pi-agent integration knowledge — fresh eyes worth getting on lifecycle (AbortSignal threading, dispose ordering, per-call cost in steady state). See Delegation Guide.

Behavioral facts to lean on (confirmed against the user's hands-on pi experience, not just docs):
- A session whose `setModel` is never called uses pi's `~/.pi/agent/settings.json` `defaultProvider`/`defaultModel` (the user's `fallback/basic`) once `bindExtensions` runs.
- `noExtensions: false` + `noTools: "all"` is a valid combination: extensions that register tools are loaded but their tools are not surfaced to the agent. Hooks like `pi-fallback-provider`'s `streamSimple` wrapper still fire.

Replace `createSummarizeFn(modelString: string): SummarizeFn` with a new factory that builds a fresh bound session per call. The session is purpose-built for one-shot summarization: no tools, fresh in-memory session, extensions enabled so `pi-fallback-provider`'s `streamSimple` hook fires.

New signature:

```ts
function createSummarizeFn(
  modelString: string | undefined,
  cwd: string,
): SummarizeFn
```

Body (per `summarize` call):

1. Build a `SessionManager.inMemory(cwd)`.
2. Build a `DefaultResourceLoader({ cwd, agentDir: getAgentDir(), systemPrompt, noExtensions: false, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true })`. Note: `noExtensions: false` (we want the fallback-provider extension to load). Pass the per-call `systemPrompt` directly so the loader uses it verbatim.
3. `await loader.reload()`.
4. `await createAgentSession({ cwd, resourceLoader: loader, sessionManager: manager, noTools: "all" })`. `noTools: "all"` keeps the agent from calling anything — this is a single-turn text-out call.
5. `await session.bindExtensions({})`.
6. Resolve model: same `parseModelString` + `session.modelRegistry.find` pattern as Step 2. Skip `setModel` on miss, warn.
7. Wire abort: if the caller's `signal` aborts, call `session.abort()`. Remove the listener in the finally block.
8. Subscribe long enough to detect errors via `session.agent.state.errorMessage` after `agent_end` (mirroring session-runner's pattern). Capture the final assistant text from `session.messages` after `prompt` resolves.
9. `await session.prompt(text)` — `text` is the content being summarized; `systemPrompt` is already on the loader.
10. Extract the last assistant message's text content from `session.messages` (filter `{type: "text"}` blocks, join). Throw if empty.
11. `session.dispose()` in finally.

Reuse the `parseModelString` helper from session-runner by exporting it from there (or duplicating — duplicating is fine since it's three lines; export is cleaner).

Cost: one `createAgentSession` + `bindExtensions` + `prompt` + `dispose` per compaction. Compaction fires on threshold crossings or explicit `/compact` calls — rare per adventure, not per message. Acceptable.

### Step 4: Update app.ts wiring to pass-through optional config

**Files**: `packages/backend/src/app.ts`
**Expertise**: none

Changes:

- Drop the `resolveModel` import from `./services/session-runner`.
- `gmModel: string | undefined = deps?.model ?? process.env.MODEL` (no `?? "sonnet"` fallback). Pass to `createSessionRunner({ config: { model: gmModel } })`. If undefined, the runner uses the session's registry-default.
- `compactionModel: string | undefined = deps?.compactionModel ?? process.env.COMPACTION_MODEL` (no `?? "haiku"` fallback).
- `createSummarizeFn(compactionModel, cwd)` — pass `cwd` so the compaction session has a working directory. Use `adventuresPath` or `process.cwd()` — pick `process.cwd()` since compaction doesn't run per-adventure-cwd in the production wiring (cwd here is just for session bookkeeping, not file resolution).
- The `AppDeps` interface keeps `model?: string` and `compactionModel?: string` — both already optional.

The `noAi: true` test path still skips both factories entirely. No test changes needed.

### Step 5: Update CLAUDE.md + add retro addendum

**Files**: `CLAUDE.md`, `.lore/retros/2026-05-pi-agent-migration.md`
**Expertise**: none

`CLAUDE.md`'s "Architecture" section currently doesn't mention model resolution. Add one line:

> Model selection is deferred to `session.modelRegistry.find` after `bindExtensions` so extension-registered providers (`pi-fallback-provider`, etc.) are visible. Configure via `MODEL=provider/modelId` and `COMPACTION_MODEL=provider/modelId`; omit to use pi's settings default.

`.lore/retros/2026-05-pi-agent-migration.md` — add a short addendum at the bottom under a new `## Addendum 2026-05-18: alias scheme reverted` heading. Two-line shape, but carry the lesson, not just the change: the `MODEL_ALIASES` + static `getModel` path was wrong because the static API only sees compile-time-known built-in models — it cannot see extension-registered providers like `pi-fallback-provider`, which is the whole point of pi's provider abstraction. Same with standalone `completeSimple`: bypasses extension hooks. Fix per `.lore/plans/pi-agent-model-resolution-fix.md`.

### Step 6: Lint + typecheck + test

**Files**: none (validation)
**Expertise**: none

Run in order:

1. `bun run typecheck` — must pass. The optional `model: string` on `SessionRunnerConfig` may surface call sites that assumed it was required.
2. `bun run lint` — must pass. Removing the `Model<never>` aliases should reduce `no-explicit-any` pressure, not add to it.
3. `bun test` — all 658 tests must still pass. Test surface is unchanged because mocks are used everywhere the runner is exercised.

If tests fail, do not bypass — the test injection points were specifically designed to survive this kind of refactor.

### Step 7: Live smoke (manual)

**Files**: none (validation, manual)
**Expertise**: deployment/runtime knowledge of pi config

After CI passes, manually verify both paths against the user's actual pi config (`defaultProvider: "fallback"`, `pi-fallback-provider` extension):

1. **GM turn**: `bun run dev`, create an adventure, send a message. Expect: response streams through. Watch logs for "model not found" warnings — there should be none if the `MODEL` env var is omitted or set to a model the fallback provider routes.
2. **Compaction**: write ~150k of text into an adventure's `history.md`, send a message. Expect: a `compacted` SSE event fires before the GM response. The summarize call should route through `pi-fallback-provider`. Watch logs for the same warning class.
3. **Explicit non-Anthropic model**: set `MODEL=openrouter/openrouter/free` (or another model the user has configured), restart, repeat (1). Expect: requests route through OpenRouter, not Anthropic.

This is the validation step from this plan's perspective. The migration retro's "live smoke test follow-up" item gets closed by this.

### Step 8: Validate Against Goal

**Files**: none (validation)
**Expertise**: fresh context

Launch the `plan-reviewer` agent against this plan after Step 6 passes. The reviewer reads only this plan + the goal section + the modified files, and checks:

- Provider neutrality: no Anthropic-specific paths remain in production code (test fixtures may still reference Anthropic for cost-of-rewrite reasons — that's fine).
- Both surfaces (GM + compaction) route through bound sessions with extension hooks active.
- The "warn and fall back" behavior is implemented identically for both surfaces.
- No new architectural assumptions introduced that weren't in the goal.

This is not optional. The migration commit shipped the bug that this plan fixes; the same context curse could let a re-introduction slip past me.

## Delegation Guide

- **Step 3 (bound-session summarize fn)**: the architectural risk lives here. Worth a fresh-eyes review *before* implementation — invoke `lore-development:design-reviewer` with the Step 3 description, asking whether the per-call session-build pattern has lifecycle hazards (resource leaks, extension state across calls, dispose ordering).
- **Step 8 (post-implementation review)**: `lore-development:plan-reviewer` against the saved plan, then a fresh `lore-development:fresh-lore` pass on the diff to catch what the implementer missed.

No security-sensitive paths; no frontend work; no performance hot path beyond "compaction does an extra session build" which is acceptable.

## Open Questions

These are explicitly **deferred** — not blockers for this plan:

- **Lore back-propagation**: `.lore/reference/architecture-pattern.md` and `.lore/specs/compaction-system.md` (REQ-COMP-9a, REQ-COMP-25) are stale after this plan executes. File a follow-up using `lore-development:back-propagate` or `lore-development:file-issue` after merge.
- **Direct unit tests for session-runner**: currently exercised only through mocks + live smoke. Worth a follow-up issue to add coverage that doesn't couple to pi internals (e.g. parseModelString as a pure function, the warn-on-miss path with a stub registry).
- **Compaction session reuse**: if per-call session-build becomes a measurable latency problem in practice, revisit option (B) from the design discussion (cached singleton). Don't optimize speculatively.
