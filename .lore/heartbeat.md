---
status: active
---
# Heartbeat

This file controls what the guild does autonomously. Every hour (configurable),
a Guild Master session reads this file and decides which standing orders warrant
action: creating commissions, dispatching work, or starting meetings.

**Standing Orders** are lines starting with `- `. Write them in plain language.
If you want the guild to check with you before acting on an order, say so in the
order itself.

**Watch Items** are things to monitor. The guild reads these for context but won't
create commissions from them directly.

**Context Notes** are operational context the guild should know (merge freezes, priorities).

**Recent Activity** is managed by the daemon. Don't edit this section manually.
Workers can also add entries to this file during their sessions.

## Standing Orders

## Watch Items

## Context Notes

## Recent Activity
- 16:26 commission-Octavia-20260406-162222 result: Wrote spec to `.lore/specs/view-files.md`.

The spec covers:

**Backend:**
- Two new endpoints: `GET /adventures/:id/files` (recursive tree) and `GET /adventures/:id/file?path=...` (file content)
- Re...

- 16:26 commission-Octavia-20260406-162222 completed
- 16:34 commission-Octavia-20260406-163038 result: Wrote the implementation plan to `.lore/plans/view-files-plan.md`.

The plan covers five phases mapped to all 27 spec requirements:

1. **Phase 1: FileOps extension** — Add `readDirEntries` to the int...
- 16:34 commission-Octavia-20260406-163038 completed
- 16:46 commission-Dalton-20260406-164304 result: Implemented Phases 1, 2, and 3 of the View Files feature. All 19 new tests pass; full suite is 574/574 green; typecheck clean.

**Phase 1 — Extend FileOps:**
- Added `readDirEntries` to the `FileOps` ...
- 16:47 commission-Dalton-20260406-164304 completed
- 16:51 commission-Thorne-20260406-164314 result: Phase 1-3 implementation review complete. 19 tests pass, all spec requirements addressed. Two findings: one defect (directory requests treated as binary files), one test coverage gap (no directory edg...
- 16:51 commission-Thorne-20260406-164314 completed
- 16:59 commission-Dalton-20260406-164329 result: Implemented Phases 4 and 5 of the View Files feature, plus addressed all of Thorne's review findings.

**Thorne's defect fixed:**
- Directory requests to `GET /adventures/:id/file?path=...` now return...
- 16:59 commission-Dalton-20260406-164329 completed
- 17:01 commission-Thorne-20260406-164339 result: View Files Frontend (Phases 4-5) Review: Implementation is structurally correct but contains one critical TypeScript compilation error preventing the code from running.

**Overall Assessment**: The im...
- 17:01 commission-Thorne-20260406-164339 completed