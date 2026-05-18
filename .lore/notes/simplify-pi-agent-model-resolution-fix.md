---
title: "Simplification notes: pi-agent model resolution fix"
date: 2026-05-18
status: in_progress
tags: [simplify, cleanup, code-quality, pi-agent]
modules: [backend]
---

# Simplification Notes: pi-agent model resolution fix

Resumed from `.lore/notes/pi-agent-model-resolution-fix.md`. Targeting only TS source files; the two doc files (CLAUDE.md, retro addendum) are intentionally phrased and not simplify candidates.

## Files Processed

- packages/backend/src/services/session-runner.ts
- packages/backend/src/app.ts
- packages/backend/tests/helpers/mock-session-runner.ts

## Cleanup Agents Run

- general-purpose (acting as code-simplifier — `code-simplifier:code-simplifier` not installed)

## Results

### Simplification

- Agent: general-purpose (as code-simplifier)
  Changes: Extracted `toFriendlyError(message)` helper in session-runner.ts beside `isContextOverflowError` and replaced two identical inline ternaries in the runQuery try/catch. Fixed stale `AppDeps.compactionService` doc comment in app.ts that still claimed "built using pi-ai's completeSimple". Mock unchanged.
  Rejected (with reasons): factoring shared parseModelString resolution block (parity is intentional per hard constraint), tightening `formatToolResultForClient` cast (would just shuffle text), inlining `parseModelString` (kept exported for app.ts), collapsing `??`-style null coalesce (would change behavior on empty string), flattening mock's `calls.push({...})` (tests read its public surface).

### Testing

(pending)

### Review

(pending)

## Failures

(empty)
