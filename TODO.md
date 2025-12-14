# Adventure Engine TODO

Ideas, questions, and technical debt to explore. Not a strict task list.

---

## Security Concerns

### Critical

- [ ] Session token passed in WebSocket query string
  - Visible in server logs, browser history
  - Should use `sec-websocket-protocol` header or auth before upgrade
- [ ] No validation of adventure ID for path traversal
  - ID comes from user, used directly in file paths
  - Path joining prevents `../` but add explicit validation
- [ ] No CSRF protection on WebSocket upgrade
  - No `Origin` header validation
  - Any origin can connect

### Medium

- [ ] State files are world-readable
  - Default umask exposes state.json
  - Should chmod 0600 on created files
- [ ] No input sanitization before Claude
  - Player text passed directly to agent
  - Prompt injection possible
- [ ] Replicate API token could leak in logs
  - Environment variable, but if logged exposes image generation

---

## Documentation Drift

- [ ] Specs are wildly out of sync with implementation
  - Initial MVP spec no longer reflects what was built
  - Need to decide: update specs or treat them as historical artifacts?
- [ ] README lists commands/agents that don't exist
  - `/adventure-engine-corvran:new-adventure` - not implemented
  - `game-master` agent - not implemented
  - `world-builder` agent - not implemented
- [ ] README "Planned Components" section implies future work, but no roadmap

---

## Testing

### Backend Gaps

- [ ] WebSocket connection limits not tested
- [ ] Concurrent request handling not tested
- [ ] PROJECT_DIR validation not tested
- [ ] Disk full / permission error scenarios not tested
- [ ] Mock SDK doesn't test MCP tool_use interactions
- [ ] Memory leaks in connection tracking not tested
- [ ] Large responses (> 100KB) not tested

### Frontend Gaps

- [ ] BackgroundLayer tests are placeholder stubs
  - Image load sequence not tested
  - Layer swap logic not verified
- [ ] No integration tests for full message flows
- [ ] No accessibility audit tests

---

## World State Architecture

### JSON vs Markdown Interaction

- [ ] How does `adventure-state.json` interact with the world MD files Claude creates?
  - Is there duplication of truth?
  - Which is authoritative when they conflict?
  - Should the JSON be derived from MD files or vice versa?

### State Generation on Startup

- [ ] Server generates `adventure-state.json` on every start
  - This needs better management
  - Should it only generate if missing?
  - How to handle state persistence across restarts?

---

## Architecture Questions

### PROJECT_DIR and Multi-World Design

The core concept: **the server is not the world**. Goals:
- Server can run different worlds depending on how adventure was started
- Worlds can exist in their own repositories
- Claude Code plugin allows world setup before server launch

**Questions to resolve:**

- [ ] Am I overcomplicating this?
- [ ] Should I embrace that this is a server with data?
- [ ] Alternative: server with agent + world subdirectories instead of external repos?
- [ ] Is the plugin-based world setup actually valuable, or just complexity?

Trade-offs to consider:
- External world repos: more flexible, more complex
- Embedded worlds: simpler, less portable
- Hybrid: default embedded, optional external?

### PROJECT_DIR Critical Issues

- [ ] Falls back to `null` if not set (only errors at query time)
- [ ] No validation that directory exists
- [ ] All adventures share same PROJECT_DIR (no per-adventure isolation)
- [ ] System prompt assumes file operations work, no error handling if they fail

### Dual State Manager Pattern

- [ ] Why are there two AdventureStateManager instances?
  - Line 48 in server.ts creates singleton
  - Line 322 creates fresh instance in validateAndLoadAdventure
  - Inconsistent pattern needs resolution

---

## Error Handling

### Frontend

- [ ] No React Error Boundary - render errors crash entire app
- [ ] Error codes from protocol ignored (only message shown)
- [ ] No distinction between retryable vs permanent errors
- [ ] `void` operator suppresses promise rejections in AdventureMenu

### Backend

- [ ] No request ID tracking for log correlation
- [ ] Stack traces not included in WebSocket errors
- [ ] Console.error only - no structured logging integration

---

## Type Safety

- [ ] No runtime validation of WebSocket messages (TypeScript only)
- [ ] Frontend trusts server messages without verification
- [ ] Consider Zod schemas for message boundaries
- [ ] `@ts-expect-error` bypass in gm-prompt.ts for MCP tool preset

---

## Build & Deploy

- [ ] No unified build script - each directory managed separately
- [ ] Relative paths break if run from different directory
  - `./adventures` assumes CWD
  - `../frontend/dist` assumes directory structure
- [ ] Frontend must be pre-built before backend serves it
- [ ] No graceful shutdown handling (connections not cleaned up)
- [ ] Async initialization not awaited (image service init is fire-and-forget)

---

## Operations

### Launch Script Logging

- [ ] `launch-world.sh` logs are verbose
  - Good for debugging
  - Bad for long-term sustainability

Options to explore:
- Log levels (debug/info/warn)
- Log rotation
- Rewrite in Python for better control?
- Separate debug mode vs production mode?

### Configuration Gaps

- [ ] No validation that required env vars are set at startup
- [ ] No config file support (all via env vars)
- [ ] REPLICATE_API_TOKEN warned but not fatal if missing

### Connection Management

- [ ] No max connection limit
- [ ] Connection map grows indefinitely if connections leak
- [ ] Heartbeat interval could miss fast reconnects

### Monitoring

- [ ] No admin endpoint to see active sessions
- [ ] No metrics endpoint
- [ ] No way to debug connection issues in production

---

## Performance Concerns

- [ ] History append reads entire file, appends, writes back - O(n) per input
- [ ] Image catalog glob scans on every theme change (no caching)
- [ ] No timeout on input queue processing - could stall forever
- [ ] Hard-coded string matching for region detection (10+ if statements)

---

## Plugin Completeness

- [ ] Only `enter-world` skill implemented
- [ ] No commands implemented (README lists planned ones)
- [ ] No agents implemented
- [ ] launch-world.sh has no cleanup/shutdown mechanism
- [ ] No background images in repository (relies on generation)

---

## Future Ideas

(Add new ideas here as they come up)

