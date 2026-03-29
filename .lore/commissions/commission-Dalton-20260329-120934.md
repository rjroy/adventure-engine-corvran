---
title: "Commission: Investigate 502 on /api/daemon/adventures and Add Logging"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "The user started the app and hit `/api/daemon/adventures` — it returns a 502 with no useful logs. Investigate why and fix it. Regardless of root cause, add better logging so this class of failure is never silent again.\n\n**Investigate:**\n\n1. Read the proxy route: `packages/web/app/api/daemon/[...path]/route.ts`. This is the Next.js catch-all that forwards to the backend daemon over the Unix socket. A 502 means the proxy couldn't reach the daemon, or the daemon responded with something unexpected.\n\n2. Read the backend entry point: `packages/backend/src/index.ts`. Check how the daemon starts and binds to the socket.\n\n3. Read `packages/backend/src/app.ts` to understand the Hono app setup.\n\n4. Read `package.json` at root for the dev scripts — how are daemon and web started?\n\n5. Try starting the daemon yourself (`bun run dev:daemon`) and see what happens. Check if the socket file is created. Try hitting the daemon directly.\n\n6. Common causes of 502 from a Unix socket proxy:\n   - Daemon isn't running or crashed on startup\n   - Socket path mismatch between daemon and proxy\n   - Socket file exists from a previous run but no process is listening\n   - Import/startup error in the daemon that prevents it from binding\n   - The proxy is using the wrong fetch API for Unix sockets (Bun's fetch supports `unix:` option, Node/Next.js might not)\n\n**Fix:**\nIf you find the root cause, fix it. The most likely issue is the Next.js proxy route — it runs in Node.js (not Bun), and Node's fetch doesn't support Unix socket connections the same way Bun's does. If that's the case, you'll need to use a different approach for the socket connection in the Next.js route (e.g., `http` module, `undici`, or a Unix socket fetch polyfill).\n\n**Logging (mandatory regardless of root cause):**\n- The proxy route must log: the incoming request path, the daemon URL it's connecting to, and any connection errors with full error details (not just \"502\")\n- The daemon must log on startup: what socket path it's binding to, when it's ready\n- The daemon should log each incoming request (method, path, status code)\n- Use `console.error` for errors, `console.log` for info — keep it simple, no logging library needed for MVP\n\n**After fixes:**\n- `tsc --build` must be clean\n- `bun test` must pass\n- Start the daemon and web server, confirm `/api/daemon/adventures` returns the adventure list (or empty array), not 502"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T19:09:34.013Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T19:09:34.015Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
