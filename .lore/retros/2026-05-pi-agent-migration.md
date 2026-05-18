# Migration: claude-agent-sdk → pi-coding-agent

Date: 2026-05-18

## What changed

Replaced `@anthropic-ai/claude-agent-sdk@^0.2.112` with `@earendil-works/pi-coding-agent@^0.75.1` (and its peers `pi-agent-core`, `pi-ai`) across the backend. Migration guide: `pi-agent-migration.md` (workspace root).

## Why

User-driven move toward the pi tooling family. Pi gives us provider flexibility (`pi-ai` abstracts Anthropic/OpenAI/Google/etc.) and a richer extension surface. The Adventure Engine is more complex than the guide's "simple processing" target — it streams over SSE, gates tools, and runs out-of-loop summarization — so the cleanest path was a focused rewrite of the boundary, not a drop-in swap.

## Notable design decisions

**SessionRunner contract changed.** The old `runQuery()` returned an `SDKMessage` async iterable; the new one is push-based with `onTextDelta`/`onToolUse`/`onDone`/`onError` callbacks. Pi's `session.subscribe(...)` is naturally push-shaped, and inverting the boundary kept the SSE layer simple. Test mocks build a script of `ScriptedEvent`s instead of pre-fabricated provider messages — much less coupled to provider shapes.

**Compaction service no longer takes a `queryFn`.** It depends on a `SummarizeFn(systemPrompt, text, signal) → string`. Production wires it through `completeSimple` from `pi-ai` (one-shot Haiku call). Tests pass a function that captures inputs and returns a canned summary. This decouples the service from the agent runtime entirely — it was always doing one-shot summarization, never tool-looping.

**Plugin skills are now eagerly loaded into the system prompt.** Claude Code's plugin loader injected skills lazily via the Skill tool; pi has no equivalent Skill tool. We use pi's `loadSkillsFromDir` + `formatSkillsForPrompt` to embed an XML manifest of available SKILL.md skills into the system prompt at runtime. The agent reads full SKILL.md content via the built-in `read` tool when needed. Token cost is higher up front; the lazy/eager tradeoff is a behavior change worth noting.

**MCP server abstraction is gone.** The old code wrapped tools in `createSdkMcpServer({ name: "corvran", tools })`. In pi, custom tools are passed directly via `createAgentSession({ customTools: [...] })`. Tool names are plain (`set_mood`) instead of MCP-prefixed (`mcp__corvran__set_mood`). The SSE suppression filter for dedicated channels (mood, compacted) now lives in `session-runner.ts` and matches plain names.

**Model aliases.** The session runner accepts `"sonnet"`/`"haiku"`/`"opus"` aliases or a `"provider/modelId"` string. Aliases map to `anthropic/claude-sonnet-4-6` etc. Auth comes from `~/.pi/agent/auth.json` (managed by pi) or env vars, not `ANTHROPIC_API_KEY` directly.

**Auto-compaction disabled.** Pi has built-in auto-compaction at `contextWindow - 16384`. The Adventure Engine has its own narrative-aware compaction tied to history.md/world.md files. Disabled pi's via `SessionManager.inMemory()` + omitting compaction settings. Each adventure message creates a fresh in-memory session; persistence happens externally through the adventure file structure.

## Risks / open follow-ups

- **No real provider has been smoke-tested yet.** Tests cover the SSE shape and mock interactions but the production `completeSimple` + `createAgentSession` + `setModel` path has not been exercised against `anthropic/claude-sonnet-4-6` end-to-end. First live run may surface auth/model resolution issues.
- **Skill eager-loading bloats prompts** for adventures with many skills installed. May need to re-introduce lazy loading if context pressure becomes an issue.
- **Compaction service uses Anthropic-flavored model strings** by default. The full pi-ai provider matrix isn't wired up at the alias level; users wanting non-Anthropic compaction must use `"provider/modelId"` form.
- **Plugin paths still passed to runner** even though pi's resource loader doesn't load them as packages — only the `skills/` subdirectory under each plugin path is read. The `plugin.json` manifests are no longer honored by the agent loop; only the registry layer uses them.

## Test coverage

658 tests across 49 files pass. Reworked test helpers:
- `tests/helpers/mock-session-runner.ts` — script-based SessionRunner stub
- `tests/helpers/invoke-tool.ts` — invokes pi `ToolDefinition.execute` for unit tests
- Removed `tests/helpers/mock-query.ts` (SDK-coupled)
