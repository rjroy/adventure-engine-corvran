---
title: "Commission: Spec Fix: Compaction System — Configurable Model (not hardcoded)"
date: 2026-04-03
status: dispatched
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Fix the compaction system spec at `.lore/specs/compaction-system-spec.md`.\n\n**The problem**: REQ-COMP-25 hardcodes `model: 'claude-haiku-4-5-20251001'` for the summarization Haiku call. This is wrong for two reasons:\n\n1. The Claude Agent SDK accepts short model names: `\"sonnet\"`, `\"haiku\"`, `\"opus\"`. You get the latest version automatically. Never hardcode a versioned model ID.\n2. The model should be configurable, not baked into the service. The session runner already does this correctly: it receives `config.model` which defaults to `\"sonnet\"` via `deps.model ?? process.env.MODEL ?? \"sonnet\"` (see `packages/backend/src/app.ts` line 113).\n\n**What to change in the spec**:\n\n- REQ-COMP-25: The compaction service should receive a `model` config (default: `\"haiku\"`), NOT hardcode a versioned model string. The SDK resolves `\"haiku\"` to the latest Haiku automatically. Follow the same pattern as the session runner's `SessionRunnerConfig.model`.\n- Add a new requirement or amend an existing one: `COMPACTION_MODEL` env var override (default `\"haiku\"`), read in `app.ts` alongside the existing `MODEL` env var for the session runner. This parallels the threshold env vars (`HISTORY_COMPACT_THRESHOLD`, `WORLD_COMPACT_THRESHOLD`).\n- Scan the rest of the spec for any other references to the full model ID string and replace with the short name pattern.\n\n**Context**: Read the current spec, then read `packages/backend/src/app.ts` and `packages/backend/src/services/session-runner.ts` to see the existing model config pattern. The fix should make compaction's model config follow the exact same pattern."
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-04-03T08:48:20.519Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-03T08:48:20.521Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
