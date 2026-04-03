---
title: Lore Config
status: active
custom_directories:
  art: [draft, approved, archived]
  commissions: [pending, active, completed, abandoned]
  meetings: [open, closed, deferred]

filename_exemptions:
  - "^commission-.+-\\d{8}-\\d{6}\\.md$"
  - "^audience-.+-\\d{8}-\\d{6}.*\\.md$"

custom_fields:
  commissions: [worker, workerDisplayTitle, prompt, dependencies, linked_artifacts, activity_timeline]
  meetings: [worker, workerDisplayTitle, workerPortraitUrl, agenda, deferred_until, meeting_log, linked_artifacts]
  art: [commission, type]
---

# Project Lore Configuration

This file tells `/tend` what's intentional about this project's `.lore/` structure.

Updated by `/tend` on 2026-03-29.
