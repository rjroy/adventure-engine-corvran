---
title: "Commission: Configure Tailscale Origin Support"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "The servers bind to localhost (which is correct), but need to accept requests from the Tailscale hostname `gsai.raptor-piranha.ts.net` as an allowed origin.\n\n**What to do:**\n\n1. **Backend (Hono):** Add CORS middleware that allows `gsai.raptor-piranha.ts.net` as an origin. The daemon listens on a Unix socket so it doesn't have its own origin concept, but if there's any origin checking or CORS headers being set, make sure this hostname is allowed.\n\n2. **Web (Next.js):** This is the main one. Next.js dev server binds to localhost, but when accessed via the Tailscale hostname, it needs to accept that origin. Configure `next.config.ts` to allow `gsai.raptor-piranha.ts.net` as an allowed origin/hostname. This likely means:\n   - Adding the hostname to `allowedDevOrigins` or equivalent Next.js config\n   - Making sure any CSP or CORS headers include this origin\n\n3. **Make the Tailscale hostname configurable** via environment variable (e.g., `ALLOWED_ORIGIN` or `TAILSCALE_HOSTNAME`) so it's not hardcoded. Default to `gsai.raptor-piranha.ts.net` but let it be overridden. Document the env var in CLAUDE.md.\n\n**Read first:**\n- `packages/web/next.config.ts`\n- `packages/backend/src/app.ts`\n- `packages/backend/src/index.ts`\n- `CLAUDE.md`\n\n**After fixes:**\n- `tsc --build` must be clean\n- `bun test` must pass"
dependencies: []
linked_artifacts:
  - packages/backend/src/app.ts

  - packages/web/next.config.ts
  - CLAUDE.md
  - packages/web/next.config.ts
  - CLAUDE.md
activity_timeline:
  - timestamp: 2026-03-29T19:05:42.204Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T19:05:42.206Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T19:05:42.231Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T19:05:57.475Z
    event: progress_report
    reason: "Read all target files. Backend has no CORS middleware currently. Next.js config is empty. Planning changes now."
  - timestamp: 2026-03-29T19:06:34.704Z
    event: result_submitted
    reason: "Added Tailscale hostname support for remote access via `gsai.raptor-piranha.ts.net`:\n\n1. **Backend CORS** (`packages/backend/src/app.ts`): Added `hono/cors` middleware allowing `localhost:3000`, and the Tailscale hostname on both HTTP and HTTPS.\n\n2. **Next.js dev origins** (`packages/web/next.config.ts`): Added `allowedDevOrigins` with the Tailscale hostname so the dev server accepts requests from that origin.\n\n3. **Configurable via env var**: Both use `TAILSCALE_HOSTNAME` (defaults to `gsai.raptor-piranha.ts.net`). Documented in CLAUDE.md.\n\nBuild clean, 206 tests pass."
  - timestamp: 2026-03-29T19:06:39.900Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read all target files. Backend has no CORS middleware currently. Next.js config is empty. Planning changes now."
projectName: corvran
---
Added Tailscale hostname support for remote access via `gsai.raptor-piranha.ts.net`:

1. **Backend CORS** (`packages/backend/src/app.ts`): Added `hono/cors` middleware allowing `localhost:3000`, and the Tailscale hostname on both HTTP and HTTPS.

2. **Next.js dev origins** (`packages/web/next.config.ts`): Added `allowedDevOrigins` with the Tailscale hostname so the dev server accepts requests from that origin.

3. **Configurable via env var**: Both use `TAILSCALE_HOSTNAME` (defaults to `gsai.raptor-piranha.ts.net`). Documented in CLAUDE.md.

Build clean, 206 tests pass.
