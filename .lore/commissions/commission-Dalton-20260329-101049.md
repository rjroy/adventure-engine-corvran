---
title: "Commission: MVP Phase 5: Integration"
date: 2026-03-29
status: blocked
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Implement Phase 5 from `.lore/plans/mvp-implementation.md`: Integration.\n\n**Read the full plan first** — the Phase 5 section has exact specifications.\n\n**What to build:**\n1. Unix socket proxy (`packages/web/app/api/daemon/[...path]/route.ts`) — Replace the Phase 4 mock with a real catch-all API route. Reads DAEMON_SOCKET_PATH from env. Forwards all requests to daemon's Unix socket preserving method/headers/body. For non-streaming: forward JSON. For SSE: forward as ReadableStream with correct headers. Use Bun's fetch with unix option: `fetch(url, { unix: socketPath, ...opts })`. Return 502 if daemon unreachable.\n2. Development scripts (root package.json) — `dev:daemon` (starts backend), `dev:web` (starts Next.js), `dev` (starts both). Environment defaults: DAEMON_SOCKET=./corvran.sock, DAEMON_SOCKET_PATH=./corvran.sock, ADVENTURES_PATH=./adventures/\n3. Sample adventure (`adventures/lost-mines/`) — character.md and world.md for D&D 5e. Add adventures/ to .gitignore with appropriate handling.\n4. End-to-end verification — start daemon + web, navigate list, select adventure, send message, observe streaming, verify history.md written, send second message, test stop button, test empty adventure, test context overflow if feasible.\n\n**Critical details:**\n- SSE proxy must NOT buffer the stream — pipe chunks as they arrive via ReadableStream\n- Unix socket fetch: `fetch('http://localhost/adventures', { unix: '/path/to/corvran.sock' })` — URL host doesn't matter, only path\n- Two separate processes (daemon + web) documented in README/CLAUDE.md\n- Socket path coordination via shared env var convention\n\n**Tests required:**\n- Proxy route test: mock Unix socket target, verify forwarding for both JSON and SSE\n- Integration test script: starts daemon, sends HTTP requests to proxy, verifies responses for the full chain"
dependencies:
  - commission-Thorne-20260329-101000
  - commission-Thorne-20260329-101034
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T17:10:49.297Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T17:10:49.301Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
current_progress: ""
projectName: corvran
---
