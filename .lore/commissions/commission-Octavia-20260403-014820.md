---
title: "Commission: Spec Fix: Compaction System — Configurable Model (not hardcoded)"
date: 2026-04-03
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Fix the compaction system spec at `.lore/specs/compaction-system-spec.md`.\n\n**The problem**: REQ-COMP-25 hardcodes `model: 'claude-haiku-4-5-20251001'` for the summarization Haiku call. This is wrong for two reasons:\n\n1. The Claude Agent SDK accepts short model names: `\"sonnet\"`, `\"haiku\"`, `\"opus\"`. You get the latest version automatically. Never hardcode a versioned model ID.\n2. The model should be configurable, not baked into the service. The session runner already does this correctly: it receives `config.model` which defaults to `\"sonnet\"` via `deps.model ?? process.env.MODEL ?? \"sonnet\"` (see `packages/backend/src/app.ts` line 113).\n\n**What to change in the spec**:\n\n- REQ-COMP-25: The compaction service should receive a `model` config (default: `\"haiku\"`), NOT hardcode a versioned model string. The SDK resolves `\"haiku\"` to the latest Haiku automatically. Follow the same pattern as the session runner's `SessionRunnerConfig.model`.\n- Add a new requirement or amend an existing one: `COMPACTION_MODEL` env var override (default `\"haiku\"`), read in `app.ts` alongside the existing `MODEL` env var for the session runner. This parallels the threshold env vars (`HISTORY_COMPACT_THRESHOLD`, `WORLD_COMPACT_THRESHOLD`).\n- Scan the rest of the spec for any other references to the full model ID string and replace with the short name pattern.\n\n**Context**: Read the current spec, then read `packages/backend/src/app.ts` and `packages/backend/src/services/session-runner.ts` to see the existing model config pattern. The fix should make compaction's model config follow the exact same pattern."
dependencies: []
linked_artifacts:
  - .lore/specs/compaction-system-spec.md

activity_timeline:
  - timestamp: 2026-04-03T08:48:20.519Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T08:48:20.521Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-03T08:48:20.550Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-03T08:48:43.479Z
    event: progress_report
    reason: "Read the spec, app.ts, session-runner.ts, and compaction-service.ts. Confirmed the problem: REQ-COMP-25 hardcodes 'claude-haiku-4-5-20251001'. The session runner uses configurable `config.model` (default \"sonnet\" via env/DI). Compaction should follow the same pattern with \"haiku\" default. Now editing the spec."
  - timestamp: 2026-04-03T08:49:39.710Z
    event: result_submitted
    reason: "Fixed the compaction system spec at `.lore/specs/compaction-system-spec.md`. Two changes:\n\n1. **REQ-COMP-25 rewritten**: Removed hardcoded `model: 'claude-haiku-4-5-20251001'`. The compaction service now receives its model as a config string (default `\"haiku\"`) via DI. Documents that the Agent SDK resolves short names to the latest version automatically, and explicitly warns against hardcoding versioned model IDs. References the session runner's `SessionRunnerConfig.model` as the pattern to follow, including the full DI chain: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? \"haiku\"`.\n\n2. **REQ-COMP-9a added**: New requirement for `COMPACTION_MODEL` env var (default `\"haiku\"`), read in `app.ts` alongside the existing `MODEL` env var for the session runner. Parallels the existing threshold env vars (`HISTORY_COMPACT_THRESHOLD`, `WORLD_COMPACT_THRESHOLD`). Documents the `AppDeps.compactionModel` field addition.\n\nNo other references to the versioned model ID existed in the spec. The one remaining mention of `claude-haiku-4-5-20251001` is in REQ-COMP-25's \"never hardcode\" guidance, where it serves as a counter-example."
  - timestamp: 2026-04-03T08:49:45.066Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read the spec, app.ts, session-runner.ts, and compaction-service.ts. Confirmed the problem: REQ-COMP-25 hardcodes 'claude-haiku-4-5-20251001'. The session runner uses configurable `config.model` (default \"sonnet\" via env/DI). Compaction should follow the same pattern with \"haiku\" default. Now editing the spec."
projectName: corvran
---
Fixed the compaction system spec at `.lore/specs/compaction-system-spec.md`. Two changes:

1. **REQ-COMP-25 rewritten**: Removed hardcoded `model: 'claude-haiku-4-5-20251001'`. The compaction service now receives its model as a config string (default `"haiku"`) via DI. Documents that the Agent SDK resolves short names to the latest version automatically, and explicitly warns against hardcoding versioned model IDs. References the session runner's `SessionRunnerConfig.model` as the pattern to follow, including the full DI chain: `deps.compactionModel ?? process.env.COMPACTION_MODEL ?? "haiku"`.

2. **REQ-COMP-9a added**: New requirement for `COMPACTION_MODEL` env var (default `"haiku"`), read in `app.ts` alongside the existing `MODEL` env var for the session runner. Parallels the existing threshold env vars (`HISTORY_COMPACT_THRESHOLD`, `WORLD_COMPACT_THRESHOLD`). Documents the `AppDeps.compactionModel` field addition.

No other references to the versioned model ID existed in the spec. The one remaining mention of `claude-haiku-4-5-20251001` is in REQ-COMP-25's "never hardcode" guidance, where it serves as a counter-example.
