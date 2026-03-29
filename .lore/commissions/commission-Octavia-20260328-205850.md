---
title: "Commission: Update MVP Scope with Conversation History Decision"
date: 2026-03-29
status: completed
type: one-shot
tags: [commission]
worker: Octavia
workerDisplayTitle: "Guild Chronicler"
prompt: "Update `.lore/brainstorm/mvp-scope.md` to incorporate the conversation history decision from `.lore/brainstorm/conversation-history.md`.\n\nThe conversation history brainstorm reached a clear recommendation: **Approach 2 (file-based history), compaction deferred.** The rationale is documented in the brainstorm.\n\nWhat to do:\n\n1. **Remove the \"Conversation History\" open question** from mvp-scope.md (it's now answered).\n2. **Add conversation history to \"The MVP Shape\"** section. It should sit alongside the existing items (daemon, AI GM, markdown state, web client, adventures). The conversation history model is: `history.md` in the adventure directory, append on each exchange, fresh SDK `query()` each turn with assembled prompt, no compaction for MVP.\n3. **Update \"Markdown state\"** bullet to include `history.md` alongside character sheets and world state.\n4. **Update \"What This Proves\"** table if needed. Principle 1 (markdown is memory) now explicitly includes conversation history.\n5. **Update \"What This Defers\"** list: add conversation history compaction, scene-based history (Approach 3 from the brainstorm), and any other relevant deferrals.\n6. **Update the prompt assembly open question** to reflect the user's answer (skill references, not full integration) plus the new context that history is file-based. If there are remaining open questions from the conversation-history brainstorm that affect the MVP, add them.\n\nKeep the document as a brainstorm, not a spec. It should read as \"here's the shape we've landed on\" not \"here are the requirements.\" The next step is turning this into a spec, so make it easy for a spec writer to work from.\n\nDon't change the voice or structure of the document. Octavia wrote it; she's updating her own work."
dependencies: []
linked_artifacts:
  - .lore/brainstorm/mvp-scope.md

activity_timeline:
  - timestamp: 2026-03-29T03:58:50.281Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T03:58:50.283Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-03-29T03:58:50.721Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-03-29T03:59:04.065Z
    event: progress_report
    reason: "Read both brainstorm files. Now incorporating the conversation-history decision into mvp-scope.md."
  - timestamp: 2026-03-29T04:00:11.892Z
    event: result_submitted
    reason: "Updated `.lore/brainstorm/mvp-scope.md` to incorporate the conversation history decision from the companion brainstorm.\n\nChanges made:\n1. **Removed** the \"conversation history\" open question (was answered by the dedicated brainstorm).\n2. **Added item 4** to \"The MVP Shape\": conversation history as file-based (`history.md`), append-on-exchange, fresh `query()` each turn, no compaction.\n3. **Updated item 3** (markdown state) to name the specific files: `character.md`, `world.md`, `history.md`.\n4. **Updated Principle 1 row** in \"What This Proves\" to explicitly include conversation history.\n5. **Expanded \"What This Defers\"** with four new items: compaction, scene-based history (Approach 3), SDK session resume (Approach 1), custom SDK compaction instructions, and history format standardization.\n6. **Updated the prompt assembly open question** to reflect the settled answers (skill references, file-based history) and the remaining design question (how history content enters the prompt).\n7. **Added two new open questions** carried forward from the conversation-history brainstorm: history format and tool-use inclusion in `history.md`.\n8. **Added** `conversation-history.md` to the frontmatter `related` field."
  - timestamp: 2026-03-29T04:00:16.849Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "Read both brainstorm files. Now incorporating the conversation-history decision into mvp-scope.md."
projectName: corvran
---
Updated `.lore/brainstorm/mvp-scope.md` to incorporate the conversation history decision from the companion brainstorm.

Changes made:
1. **Removed** the "conversation history" open question (was answered by the dedicated brainstorm).
2. **Added item 4** to "The MVP Shape": conversation history as file-based (`history.md`), append-on-exchange, fresh `query()` each turn, no compaction.
3. **Updated item 3** (markdown state) to name the specific files: `character.md`, `world.md`, `history.md`.
4. **Updated Principle 1 row** in "What This Proves" to explicitly include conversation history.
5. **Expanded "What This Defers"** with four new items: compaction, scene-based history (Approach 3), SDK session resume (Approach 1), custom SDK compaction instructions, and history format standardization.
6. **Updated the prompt assembly open question** to reflect the settled answers (skill references, file-based history) and the remaining design question (how history content enters the prompt).
7. **Added two new open questions** carried forward from the conversation-history brainstorm: history format and tool-use inclusion in `history.md`.
8. **Added** `conversation-history.md` to the frontmatter `related` field.
