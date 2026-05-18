---
title: "Implementation notes: pi-agent model resolution fix"
date: 2026-05-18
status: in_progress
tags: [implementation, notes, pi-agent, model-resolution]
source: .lore/plans/pi-agent-model-resolution-fix.md
modules: [backend]
---

# Implementation Notes: pi-agent model resolution fix

## Summary

Implemented across 6 autonomous phases (1+2 combined, plus 3, 4, 5, 6, and 8). Phase 7 (live smoke) is the only outstanding step and must be run by the user against their actual pi config.

What landed:
- `session-runner.ts`: stripped `MODEL_ALIASES`, `resolveModel`, `getModel` import, `modelOverride` dep, eager model resolution, and the `model` field on the runner return. Added exported `parseModelString` helper. Inside `runQuery`, deferred model lookup via `session.modelRegistry.find` runs after `bindExtensions({})`; on miss or malformed string, a warn fires and the session uses pi's registry default.
- `app.ts`: replaced `createSummarizeFn` with a per-call bound-session factory (`SessionManager.inMemory` + `DefaultResourceLoader` with `noExtensions: false` + `createAgentSession` with `noTools: "all"` + `bindExtensions` + registry-based model resolution + abort threading with already-aborted guard + differentiated empty-response errors + unconditional dispose). Removed `?? "haiku"` / `?? "sonnet"` env defaults. Removed `completeSimple` and `resolveModel` imports.
- `mock-session-runner.ts`: dropped the cast-through-`SessionRunner["model"]` `model:` field.
- `CLAUDE.md`: rewrote the Architecture bullet that referenced `completeSimple` + "Haiku"; added a new bullet documenting deferred model resolution via `session.modelRegistry.find`.
- `.lore/retros/2026-05-pi-agent-migration.md`: appended an addendum that names the lesson (static `getModel` can't see extension-registered providers; standalone `completeSimple` bypasses extension hooks).

Validation: typecheck pass, lint pass (one in-flight fix for `@typescript-eslint/no-floating-promises` on `session.abort()`), 658/658 tests pass.

Plan-reviewer (Phase 8) flagged one important live-smoke question: the GM runner's `DefaultResourceLoader` still uses `noExtensions: true`. If that flag prevents `pi-fallback-provider` from populating the session's `modelRegistry`, the GM surface is still broken despite the resolution code being correct. The compaction surface uses `noExtensions: false` explicitly. Phase 7 is the only thing that can resolve this.

No divergences from the plan. One minor mechanical decision: combined Phase 1+2 into a single dispatch because Step 1 alone leaves a knowingly broken intermediate state that Step 2 immediately fixes.

## Progress

- [x] Phase 1: Strip alias scheme from session-runner + mock
- [x] Phase 2: Add deferred model resolution inside runQuery
- [x] Phase 3: Build bound-session summarize fn for compaction (preceded by design review)
- [x] Phase 4: Update app.ts wiring to pass-through optional config
- [x] Phase 5: Update CLAUDE.md + add retro addendum
- [x] Phase 6: typecheck + lint + tests
- [ ] Phase 7: Live smoke (manual, surfaced to user)
- [x] Phase 8: Validate via plan-reviewer

## Log

### Context gathered (pre-phase)

Prior work surfaced via lore-researcher:
- `.lore/retros/2026-05-pi-agent-migration.md` — risks 1 and 3 are exactly what this plan closes.
- `.lore/reference/architecture-pattern.md` — stale (still says "Hard Constraint: Claude Agent SDK Only"). Plan flags it; do not consult for SDK constraints.
- `.lore/specs/compaction-system.md` REQ-COMP-9a — preserves `COMPACTION_MODEL` env contract (default was `"haiku"`, the plan removes that fallback intentionally).
- Memory `feedback_provider_neutrality.md` — load-bearing rule: never `getModel("anthropic", ...)`; resolve via `session.modelRegistry.find` post-`bindExtensions`; on miss, leave session at registry default.
- Memory `feedback_review_before_documenting.md` — pause before propagating patterns from this fix into reference docs.

Source files inspected:
- `packages/backend/src/services/session-runner.ts` (302 lines)
- `packages/backend/src/app.ts` (224 lines)
- `packages/backend/src/services/compaction-service.ts` (215 lines)
- `packages/backend/tests/helpers/mock-session-runner.ts` (104 lines)

No project agent registry — using `general-purpose` for impl/test/review, and the named `lore-development:design-reviewer` / `lore-development:plan-reviewer` agents the plan explicitly calls for.

### Phase 1+2: session-runner refactor

- Dispatched: combined Steps 1 and 2 into one general-purpose agent dispatch. Step 1 alone leaves the file knowingly broken; combining avoids a dead test cycle.
- Result: clean. `MODEL_ALIASES`, `resolveModel`, `AnyModel`, `ProviderKey`, `ModelIdKey`, `getModel`, `modelOverride` all removed. `parseModelString` exported (per plan, for Phase 3 reuse). Mock updated.
- Tests: skipped per orchestrator decision — intermediate state has known type errors in `app.ts` from orphaned `resolveModel` import; clears in Phase 4. Full validation at Phase 6.
- Minor mechanical: agent split `ImageContent`/`TextContent` into a pure `import type` line. Same behavior, cleaner.

### Phase 8: plan-reviewer

- Dispatched: `lore-development:plan-reviewer` against the plan + the five changed files.
- Verdict: **Sound** with one important live-smoke question.
- Important: GM runner uses `noExtensions: true` on its `DefaultResourceLoader` (session-runner.ts:177) while compaction uses `noExtensions: false`. The reviewer cannot resolve from source whether pi's `bindExtensions` still queues provider hooks under `noExtensions: true`. If it does not, surface 1 (GM loop) is still broken despite the deferred-resolution code being correct. Live smoke (Phase 7) catches this. If broken, flip the GM loader flag to `noExtensions: false` and verify other suppression (`noSkills`, `noPromptTemplates`, etc.) still does the work.
- Minor (fixed): retro addendum claimed risk 1 was closed by the code change. Retitled — risk 3 closed by code; risk 1 addressed-but-requires-smoke.
- Optional (deferred): one-line comment in `createSummarizeFn` explaining the abort-listener-after-model-resolution sequencing. Default no-comment rule applies; user can add if they want.

### Phase 6: validate

- Typecheck: pass.
- Lint (first pass): one new violation — `@typescript-eslint/no-floating-promises` on `session.abort()` in the already-aborted guard branch in app.ts:180 (the in-block sibling of the closure-internal `void session.abort()` seven lines above). Fixed by mirroring the `void` prefix.
- Lint (second pass): pass. Only pre-existing warnings in web/ unrelated to this work.
- Tests: 658/658 pass.

### Phase 5: CLAUDE.md + retro addendum

- Dispatched: general-purpose agent. CLAUDE.md's stale Architecture bullet (mentioned `completeSimple` and "Haiku") rewritten; new bullet added for deferred model resolution. Retro addendum appended at the bottom; closes risks 1 and 3 of the original retro.
- Per `feedback_review_before_documenting` memory: `.lore/reference/architecture-pattern.md` and `.lore/specs/compaction-system.md` left alone — they're stale but the plan defers their rewrite, and the user should review the code before reference docs get rewritten on top of it.

### Phase 4: app.ts wiring

- Dispatched: general-purpose agent. Removed `?? "haiku"` and `?? "sonnet"` defaults; `compactionModel` and `gmModel` are now `string | undefined`. Passed `process.cwd()` to `createSummarizeFn`. Updated AppDeps JSDoc to drop "alias" framing.
- Result: clean. No Anthropic-shaped string literals remain in app.ts. `noAi` test path untouched.

### Phase 3: implementation

- Dispatched: general-purpose agent with the three design-review refinements baked in.
- Verification result: pi-coding-agent 0.75.1 types `noTools?: "all" | "builtin"`. `"all"` is the documented value for "start with no tools enabled" while still loading extensions. Plan was correct.
- Result: clean. `createSummarizeFn(modelString, cwd)` builds a per-call in-memory bound session with `noExtensions: false` (extensions load), `noTools: "all"` (no tool surface), `systemPrompt` threaded via loader, model resolution post-`bindExtensions`, abort listener guarded with already-aborted check, three differentiated empty-response error messages, unconditional `dispose()` in finally.
- Known follow-up: call site still calls `createSummarizeFn(compactionModel)` with one arg — type error until Phase 4.

### Phase 3: design review (pre-implementation)

- Dispatched: lore-development:design-reviewer against Step 3 only, focused on lifecycle hazards.
- Findings (3 real, 4 non-issues):
  1. Verify `noTools: "all"` is a valid typed value; fall back to `tools: []` if not.
  2. Declare `onAbort` outside try; guard removal in finally; add already-aborted check after listener registration.
  3. Distinguish empty-response failure modes (no messages / no text blocks / empty content) for forensics.
- Resolution: baked all three into the implementation prompt.

## Divergence

(empty)
