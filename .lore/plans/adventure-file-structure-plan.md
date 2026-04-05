---
title: "Implementation plan: adventure-file-structure"
date: 2026-04-05
status: approved
tags: [plan, prompt-service, file-structure, gm-behavior]
modules: [backend]
related: [.lore/specs/adventure-file-structure.md, .lore/reference/architecture-pattern.md]
---

# Plan: Adventure File Structure

Two phases: update the prompt instructions, then update the tests. The work is contained to a single file (`prompt-service.ts`) and its test file. No new files, no new services, no adventure-service changes.

## Spec Reference

**Spec**: `.lore/specs/adventure-file-structure.md`

Requirements addressed:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| REQ-AFS-1 | — | Already satisfied. Prompt reads character.md, world.md, history.md, adventure.md concept. No code change. |
| REQ-AFS-2 | — | Convention for character.md content. No engine change; enforced by prompt instructions. |
| REQ-AFS-3 | — | Convention for world.md content. No engine change; enforced by prompt instructions. |
| REQ-AFS-4 | — | adventure.md and history.md unchanged. No code change. |
| REQ-AFS-5 | — | Reference directory convention. No engine change. |
| REQ-AFS-6 | — | Player character sheet location. No engine change. |
| REQ-AFS-7 | — | Engine does not enumerate reference dirs. Already true. No code change. |
| REQ-AFS-8 | 1 | GM maintains two-layer structure. Communicated via prompt instructions. |
| REQ-AFS-9 | 1 | GM updates both bootstrap and reference on character changes. Communicated via prompt instructions. |
| REQ-AFS-10 | 1 | GM reads reference files on demand. Communicated via prompt instructions. |
| REQ-AFS-11 | 1 | GM creates two-layer structure during onboarding. Communicated via onboarding section update. |
| REQ-AFS-12 | 1 | File tool instructions describe two-layer convention. Direct text replacement. |
| REQ-AFS-13 | 1 | Instructions say don't modify adventure.md or history.md. Already present; verify preserved. |

## Codebase Context

### What exists

**`packages/backend/src/services/prompt-service.ts`** (121 lines): Pure function `assembleSystemPrompt(state: AdventureState) → string`. Assembles seven sections in order: Identity, Principles, Adventure Concept (conditional), Adventure State (character + world), Onboarding (conditional), Conversation History (conditional), Instructions. The Instructions section contains the current File Tools subsection (lines 87-105) and an optional History Compaction subsection (lines 107-118).

**`packages/backend/tests/prompt-service.test.ts`** (298 lines): 17 tests covering section order, absence notes, onboarding conditions, bootstrap behavior, concept ordering, compaction guidance. Two tests directly assert File Tools content:
- `"instructions include file tool guidance"` (line 132): checks for `## File Tools`, `character.md`, `world.md`, `Do not modify`, `Files are the persistent record`
- `"onboarding mentions writing to files"` (line 148): checks for `write them to the appropriate file`

**`packages/backend/src/routes/adventure-routes.ts`** (line 257): Call site. Passes `{ character, world, history, systemBootstrap, concept, compactionEnabled }` to `assembleSystemPrompt`. No change needed here; the function signature is unchanged.

**`packages/backend/src/services/adventure-service.ts`**: Reads `character.md`, `world.md`, `history.md`, `adventure.md`. Returns their content as strings. No awareness of file structure conventions. No change needed (REQ-AFS-7).

### What the reference adventures show

**`the-golden-age/`** (target format): Bootstrap `character.md` is 11 lines (name, description, pointer to `characters/dwig.md`). Bootstrap `world.md` is 69 lines (orientation, major powers, active threats, then a directory of 20 character files, 8 location files, 1 quest file). Reference files in `characters/`, `locations/`, `quests/` subdirectories. Full character sheet `characters/dwig.md` is separate from the bootstrap.

**`new-arcana/`** (current flat format): `character.md` is 100 lines (full character sheet with keywords, background, inventory, notes). `world.md` is 136 lines (full world description with factions, locations, people, mysteries inlined). No subdirectories.

The contrast: `the-golden-age` loads ~80 lines of bootstrap into the prompt. `new-arcana` loads ~236 lines of full content. The two-layer convention keeps the prompt slim while the GM reads detail on demand.

### What needs to change

1. **File Tools instruction text** (prompt-service.ts lines 93-104): Replace the current flat-file instructions with the two-layer convention text from REQ-AFS-12.
2. **Onboarding section** (prompt-service.ts lines 60-78): Update to mention the two-layer structure when guiding character/world creation. Currently tells the GM to "write them to the appropriate file." Needs to say: write a bootstrap summary to `character.md`/`world.md` AND create reference files in subdirectories.
3. **Tests**: Update assertions that match the old instruction text. Add new assertions for two-layer content. Add integration-style test using `the-golden-age` content.

### What does NOT need to change

- `AdventureState` interface: unchanged. The engine still reads the same files.
- `adventure-service.ts`: unchanged. Still reads character.md, world.md, history.md, adventure.md.
- `adventure-routes.ts`: unchanged. Same call site, same arguments.
- Section order in prompt assembly: unchanged. The seven-section structure stays.
- History Compaction subsection: unchanged. Sits after File Tools, unaffected.

## Implementation Steps

### Phase 1: Update Prompt Instructions and Onboarding

Update `assembleSystemPrompt` to use the two-layer file tool instructions and update the onboarding guidance. This is a text-replacement phase: the function's structure, signature, and section order don't change.

#### Step 1.1: Replace File Tools instruction text

**File**: `packages/backend/src/services/prompt-service.ts`

Replace lines 93-104 (the current `## File Tools` block inside the Instructions section string) with the instruction text from the spec (REQ-AFS-12). The spec provides the exact target text in the "File Tool Instruction Text" section.

The replacement preserves the surrounding structure: the Instructions section starts with dice/skills guidance (lines 87-92), then the File Tools subsection, then optionally History Compaction. Only the File Tools content changes.

Current text to replace:
```
"## File Tools\n\n" +
"You have file tools (Read, Write, Edit, Glob, Grep) with access to the adventure directory. " +
"Use them to maintain persistent records:\n\n" +
"- **`character.md`** — Write character data here when creating or updating a character. " +
"The chat carries the narrative; this file is the structured record (stats, inventory, abilities, background).\n" +
"- **`world.md`** — Write world details here when establishing or updating locations, NPCs, factions, or lore. " +
"The chat carries the story; this file is the reference material.\n" +
"- Read these files to recall state rather than relying solely on conversation context.\n" +
"- Do not modify `adventure.md` or `history.md` — those are managed by the system.\n\n" +
"Files are the persistent record. Chat is the live interaction. " +
"When something changes (a character levels up, a new NPC is introduced, an item is acquired), " +
"update the relevant file."
```

Target text (from spec, formatted as TypeScript string concatenation matching the existing style):
```
"## File Tools\n\n" +
"You have file tools (Read, Write, Edit, Glob, Grep) with access to the adventure directory.\n\n" +
"The adventure directory uses a two-layer structure:\n\n" +
"**Bootstrap files** (loaded into this prompt):\n" +
"- `character.md` -- A summary of the player character. Not the full sheet.\n" +
"- `world.md` -- An index of the world: orientation, active threats, and a directory of reference files.\n\n" +
"**Reference files** (read on demand):\n" +
"- Detailed content lives in typed subdirectories: `characters/`, `locations/`, `quests/`, and any other types the adventure needs.\n" +
"- Each entry is a single file: `<type>/<name>.md` (e.g., `characters/sister-marne.md`, `locations/crossroads-inn.md`).\n" +
"- Read reference files when you need detail. The index tells you what exists and where.\n\n" +
"**When state changes:**\n" +
"- Write or update the reference file in the appropriate directory.\n" +
"- Update `world.md` to add or revise the index entry.\n" +
"- If the player character changed, update `characters/<name>.md` (full sheet) and `character.md` (summary) if the change affects the summary.\n\n" +
"**When introducing new elements:**\n" +
"- Write a reference file: `<type>/<name>.md`\n" +
"- Add an index entry to `world.md` with the path and a one-line description.\n" +
"- Create a new type directory if nothing existing fits.\n\n" +
"Do not modify `adventure.md` or `history.md` -- those are managed by the system."
```

**Verify**: REQ-AFS-13 (don't modify adventure.md/history.md) is preserved in the new text.

#### Step 1.2: Update Onboarding section

**File**: `packages/backend/src/services/prompt-service.ts`

The current onboarding text (lines 70-78) tells the GM to "write them to the appropriate file (character.md for the character, world.md for the world)." This is correct but incomplete for REQ-AFS-11: onboarding should produce the two-layer structure from the start.

Replace the onboarding guidance to mention both layers. The updated text should tell the GM to:
- Write a bootstrap summary to `character.md` and a full character sheet to `characters/<name>.md`
- Write a world index to `world.md` and at least one reference file for the starting location
- Use the same subdirectory conventions described in the File Tools section

Keep the conditional logic unchanged: onboarding only appears when `systemBootstrap` is null and character or world is missing.

Target onboarding text:
```
"# Onboarding\n\n" +
`The player hasn't set up a ${missing} yet. ` +
"You can help them create one through conversation. " +
"Ask what kind of adventure they want to play, then guide character creation and world building. " +
"Let the player drive the choices.\n\n" +
"When creating a character, write both a bootstrap summary to `character.md` " +
"(identity, short description, pointer to full sheet) and a full character sheet " +
"to `characters/<name>.md`.\n\n" +
"When creating the world, write an index to `world.md` " +
"(orientation, major powers, active threats, directory of reference files) " +
"and at least one reference file for the starting location in `locations/`."
```

**Note**: The conditional missing-item logic (`character`, `world`, or `character or world`) stays exactly as-is. Only the instructional prose changes.

#### Step 1.3: Verify no other prompt text needs updating

Scan the rest of `assembleSystemPrompt` for references to the old flat-file model:

- **Identity section** (line 27): No file references. Clean.
- **Principles section** (line 34): No file references. Clean.
- **Adventure State section** (lines 46-54): Inserts character/world content with headers. No instructions about file structure. Clean.
- **History section** (line 83): No file references. Clean.
- **Compaction section** (lines 107-118): References `compact_history` tool only. Clean.

No other changes needed in prompt-service.ts.

### Phase 2: Update Tests

Update existing tests and add new ones to validate the two-layer instruction content.

#### Step 2.1: Update existing File Tools test

**File**: `packages/backend/tests/prompt-service.test.ts`

The test `"instructions include file tool guidance"` (line 132) currently asserts:
- `## File Tools` (still valid)
- `character.md` (still valid)
- `world.md` (still valid)
- `Do not modify \`adventure.md\` or \`history.md\`` (spec uses `--` not backtick-backtick, update assertion)
- `Files are the persistent record` (removed in new text, remove assertion)

Update to assert the new content instead:
- `two-layer structure`
- `Bootstrap files`
- `Reference files`
- `characters/`, `locations/`
- `Do not modify` (adventure.md and history.md)

#### Step 2.2: Update onboarding test

The test `"onboarding mentions writing to files"` (line 148) asserts `write them to the appropriate file`. This text is gone in the new onboarding. Replace with assertions for the two-layer onboarding:
- `bootstrap summary to \`character.md\``
- `full character sheet`
- `characters/<name>.md`
- `world.md`
- `locations/`

#### Step 2.3: Add snapshot test for file tool instruction section

**File**: `packages/backend/tests/prompt-service.test.ts`

New test: `"file tool instructions describe two-layer convention (REQ-AFS-12)"`. Extract the File Tools section from the assembled prompt and verify it contains all key elements from the spec:

- Two-layer structure description
- Bootstrap files: `character.md` as summary, `world.md` as index
- Reference files: typed subdirectories, `<type>/<name>.md` pattern
- Read-on-demand guidance
- Dual-update rules (state changes: reference file + index)
- New element rules (reference file + index entry)
- System file protection (adventure.md, history.md)

This satisfies the spec's AI Validation custom requirement: "Prompt-service output includes the file tool instruction text from this spec."

#### Step 2.4: Add integration test with the-golden-age content

**File**: `packages/backend/tests/prompt-service.test.ts`

New test: `"prompt from mature adventure contains bootstrap content, not full reference data (REQ-AFS-1)"`. This uses realistic content matching the `the-golden-age` adventure format:

- Provide a ~12-line character bootstrap (name, description, pointer) as `character`
- Provide a ~70-line world index (orientation, threats, directory) as `world`
- Assemble the prompt
- Assert the prompt contains the bootstrap content (character name, pointer text, world orientation)
- Assert the prompt does NOT contain detailed NPC/location content that would only appear in reference files
- Assert total character + world content in the prompt is under ~200 lines (the bootstrap size target)

This satisfies the spec's AI Validation custom requirement: "Integration test: prompt assembled from the-golden-age adventure contains bootstrap content (~80 lines), not the full 500+ lines of NPC/location/quest data."

**Implementation note**: The test uses hardcoded string fixtures that match the structure of `the-golden-age`, not live file reads. The test validates the prompt-service's behavior with bootstrap-shaped input, not the adventure directory contents. This keeps the test deterministic and independent of the filesystem.

#### Step 2.5: Verify existing tests still pass

All other tests in `prompt-service.test.ts` should pass without modification because:
- Section order is unchanged
- `AdventureState` interface is unchanged
- Conditional logic (onboarding, concept, compaction) is unchanged
- Tests that check for `## File Tools` presence still pass (header unchanged)
- Tests that check section ordering don't depend on instruction content

Run `bun test packages/backend/tests/prompt-service.test.ts` to confirm.

## Delegation Guide

Both phases go to a single Dalton commission. The changes are small (one file + one test file), tightly coupled (instruction text drives test assertions), and don't benefit from parallelization.

**Reviewer**: Fresh-context sub-agent after Phase 2. Review checklist:
- File tool instruction text matches spec content (REQ-AFS-12)
- Onboarding mentions both layers (REQ-AFS-11)
- No references to old flat-file model remain in prompt-service.ts
- adventure-service.ts is untouched (REQ-AFS-7)
- All existing tests pass alongside new tests
- No changes to `AdventureState` interface or section ordering

## Gaps and Ambiguities

### Resolved during planning

**Onboarding text scope**: The spec says REQ-AFS-11 "defines the structural outcome, not the interaction flow" and defers flow to a stub. The plan updates the onboarding prose to describe the target structure (both layers) without changing the conversational flow guidance. This is the right boundary: the GM knows what to build, the stub will define how the conversation gets there.

**Spec instruction text formatting**: The spec provides the target text using `--` for dashes (markdown convention). The current code uses backtick-wrapped names and `—` em-dashes in some places. The plan uses the spec's `--` convention to stay consistent with the spec's exact wording, which is also consistent with project writing style rules (no em-dashes).

**"Or equivalent content" clause**: The spec's AI Validation says the prompt should include the spec's instruction text "or equivalent content covering: two-layer description, read-on-demand guidance, dual-update rules, index maintenance." The plan uses the spec's exact text rather than paraphrasing, because there's no reason to diverge when the spec provides the canonical version.

### Not addressed (out of scope per spec)

- **Migration of existing flat-format adventures** (e.g., `new-arcana`): Deferred to [STUB: adventure-migration]. The prompt instructions will guide the GM to use the two-layer convention for new content, but won't retroactively restructure existing flat files.
- **Onboarding interaction flow**: Deferred to [STUB: adventure-onboarding-flow]. The plan updates the structural guidance (what to create) but not the conversational UX (how to guide the player through creation).
- **Summarization agent**: Deferred to [STUB: summarization-agent]. Auto-generating bootstrap from reference files is future work.

### Observation

The `new-arcana` adventure will continue to work: its full character.md and world.md content will load into the prompt as before. The GM will receive instructions about the two-layer convention but won't be prompted to restructure the existing files. This is the "degrades gracefully" behavior the spec describes in its Constraints section. Over time, the GM may organically adopt the convention as it creates new content, but that's emergent behavior, not guaranteed.
