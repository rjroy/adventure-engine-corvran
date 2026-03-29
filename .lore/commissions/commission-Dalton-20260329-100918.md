---
title: "Commission: MVP Phase 2: Daemon Core"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 2 from `.lore/plans/mvp-implementation.md`: Daemon Core.\n\n**Read the full plan first** — the Phase 2 section has exact specifications.\n\n**What to build:**\n1. Server entry point (`src/index.ts`) — Bun.serve() on Unix socket (DAEMON_SOCKET env var, default `./corvran.sock`), Hono app, config resolution for ADVENTURES_PATH, plugin paths resolved as absolute, `idleTimeout: 0`\n2. Adventure service (`src/services/adventure-service.ts`) — listAdventures(), getAdventure(id), getHistory(id), adventureExists(id) with path traversal prevention. All file I/O through injected FileOps interface.\n3. Adventure routes (`src/routes/adventure-routes.ts`) — createAdventureRoutes(deps) returning RouteModule. GET /adventures, GET /adventures/:id, GET /adventures/:id/history. Input validation on :id.\n4. Health route (`src/routes/health-routes.ts`) — GET /health returning { status: \"ok\", version: \"0.1.0\" }\n5. Operations registry (`src/registry.ts`) — collects OperationDefinition[] from route modules, GET /help endpoint\n6. App assembly (`src/app.ts`) — wires real dependencies, creates Hono app, mounts routes. Exported separately from server start for testing.\n\n**Critical details:**\n- Route/service split and DI factory pattern from `.lore/reference/architecture-pattern.md` — follow it exactly\n- FileOps interface is the testing seam (readDir, readFile, fileExists, resolvePath). Production uses node:fs/promises, tests use in-memory.\n- Stub POST /adventures/:id/message as 501 so the operations registry is complete\n- Path traversal protection: reject IDs with `/`, `..`, or that resolve outside adventures root\n\n**Tests required (all using Hono's app.request() with injected mock FileOps):**\n- Adventure discovery: temp directories with various file combinations, verify correct hasCharacter/hasWorld/hasHistory\n- Adventure detail: file contents, nulls for missing, 404 for nonexistent\n- History endpoint: content when exists, { exists: false, history: null } when not\n- Path traversal: ../etc/passwd and foo/../../bar return 400\n- Health: correct payload\n- Operations registry: GET /help returns all registered endpoints"
dependencies:
  - commission-Thorne-20260329-100901
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T17:09:18.751Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:09:18.754Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-03-29T17:44:35.286Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-03-29T17:44:35.288Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
