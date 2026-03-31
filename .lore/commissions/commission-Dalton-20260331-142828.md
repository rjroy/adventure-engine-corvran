---
title: "Commission: GM Prompt: Instruct File Use for Character/World Data"
date: 2026-03-31
status: dispatched
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "## Context\n\nThe GM has access to file tools (Read, Write, Edit, Glob, Grep) and its cwd is the adventure directory. But the system prompt in `packages/backend/src/services/prompt-service.ts` never instructs the GM to use files. The result: the GM dumps everything (character sheets, world details, etc.) into the chat stream instead of writing to adventure files.\n\nIssue: `.lore/issues/improve-file-use.md`\n\n## What to do\n\nUpdate `assembleSystemPrompt` in `packages/backend/src/services/prompt-service.ts` to instruct the GM to use its file tools. The key files in an adventure directory are:\n\n- `character.md` — character sheet and details\n- `world.md` — world state and lore\n- `history.md` — conversation/session history (already managed by the system, GM shouldn't write this)\n- `adventure.md` — adventure config frontmatter (already managed by the system, GM shouldn't write this)\n\nThe GM should be told:\n\n1. **Write character data to `character.md`** when creating or updating a character. Don't just narrate the character in chat; persist it to the file. Chat should contain the narrative and conversation, the file should contain the structured record.\n2. **Write world data to `world.md`** when establishing or updating world details. Same principle: the chat carries the story, the file carries the reference material.\n3. **Read these files** to recall state when needed, rather than relying solely on conversation context.\n4. **Don't touch `adventure.md` or `history.md`** — those are system-managed.\n\nThe tone should fit the existing prompt style (direct, functional). Don't over-specify the file format; the GM should use whatever markdown structure makes sense for the content. The instruction should make clear that files are the persistent record, chat is the live interaction.\n\n## Rules\n- Update prompt-service.ts and its tests\n- All tests must pass\n- `bun run build` must pass"
dependencies: []
linked_artifacts: []

activity_timeline:
  - timestamp: 2026-03-31T21:28:28.916Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-31T21:28:28.918Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
current_progress: ""
projectName: corvran
---
