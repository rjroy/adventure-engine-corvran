---
title: "Commission: Configure Tailscale Origin Support"
date: 2026-03-29
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "The servers bind to localhost (which is correct), but need to accept requests from the Tailscale hostname `gsai.raptor-piranha.ts.net` as an allowed origin.\n\n**What to do:**\n\n1. **Backend (Hono):** Add CORS middleware that allows `gsai.raptor-piranha.ts.net` as an origin. The daemon listens on a Unix socket so it doesn't have its own origin concept, but if there's any origin checking or CORS headers being set, make sure this hostname is allowed.\n\n2. **Web (Next.js):** This is the main one. Next.js dev server binds to localhost, but when accessed via the Tailscale hostname, it needs to accept that origin. Configure `next.config.ts` to allow `gsai.raptor-piranha.ts.net` as an allowed origin/hostname. This likely means:\n   - Adding the hostname to `allowedDevOrigins` or equivalent Next.js config\n   - Making sure any CSP or CORS headers include this origin\n\n3. **Make the Tailscale hostname configurable** via environment variable (e.g., `ALLOWED_ORIGIN` or `TAILSCALE_HOSTNAME`) so it's not hardcoded. Default to `gsai.raptor-piranha.ts.net` but let it be overridden. Document the env var in CLAUDE.md.\n\n**Read first:**\n- `packages/web/next.config.ts`\n- `packages/backend/src/app.ts`\n- `packages/backend/src/index.ts`\n- `CLAUDE.md`\n\n**After fixes:**\n- `tsc --build` must be clean\n- `bun test` must pass"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-29T19:05:42.204Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T19:05:42.206Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
