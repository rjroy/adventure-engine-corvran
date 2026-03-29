---
title: "MVP Scope Review + Conversation History Brainstorm"
date: 2026-03-29
status: closed
tags: [meeting]
worker: Guild Master
workerDisplayTitle: "Guild Master"
agenda: "We are rebuilding."
deferred_until: ""
linked_artifacts: []
meeting_log:
  - timestamp: 2026-03-29T03:42:08.334Z
    event: opened
    reason: "User started audience"
  - timestamp: 2026-03-29T03:48:04.431Z
    event: renamed
    reason: "Renamed to: MVP Scope Review + Conversation History Brainstorm"
  - timestamp: 2026-03-29T20:46:28.309Z
    event: closed
    reason: "User closed audience"
---
Meeting Notes: Corvran MVP Phase 5 Review & Remediation

Thorne completed Phase 5 integration review, identifying four findings with the most significant being absence of automated end-to-end testing for the message streaming path. User directed that mock SDK harness using queryFn injection was mandatory, not deferrable. All findings were consolidated into a single fix commission to Dalton rather than distributed across multiple reviews. Subsequently, two additional compliance reviews were commissioned: full specification requirements verification (REQ-MVP) and visual design brief adherence. Spec review confirmed 26 of 27 requirements satisfied, with one critical finding that sample adventure files were not actually committed to git despite .gitignore exception attempt. Visual brief review identified two styling issues: extraneous "Palatino Linotype" in font stack and missing monospace class application to error messages. In production testing, initial API endpoint call returned 502 error with no diagnostic information. Dalton investigated and identified root cause: Next.js API routes run under Node.js runtime, which silently ignores Bun's `fetch({ unix })` syntax. Proxy was rewritten using Node's `http.request()` with socketPath parameter. Comprehensive logging was added to both proxy and daemon to prevent future silent failures. Tailscale origin configuration for `gsai.raptor-piranha.ts.net` was also implemented.

Decisions made: Mock SDK harness is required; all shell `&` backgrounding replaced with `concurrently` for proper process group handling; sample adventure restructured in git with corrected .gitignore pattern (negate parent directory, re-ignore all children, then negate sample subdirectory specifically); Next.js proxy must use Node.js http module for Unix socket communication; production deployments must include request/response logging on both proxy and daemon sides.

Artifacts: `.lore/specs/mvp.md` (26/27 requirements verified), `.lore/art/corvran-visual-brief.md` (visual design specification), five fix/investigation commissions dispatched to Dalton, two completed compliance reviews from Thorne.

Open items: Commission Dalton-20260329-120934 (502 investigation and logging) still in progress; commissions for visual fixes, gitignore restructure, and Tailscale configuration awaiting completion. End-to-end socket communication testing blocked by sandbox permission limitations but all unit tests passing.
