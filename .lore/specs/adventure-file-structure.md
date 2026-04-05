---
title: Adventure file structure and GM interaction model
date: 2026-04-05
status: approved
tags: [adventure, file-structure, gm-behavior, prompt-assembly]
modules: [prompt-service, adventure-service]
req-prefix: AFS
related:
  - .lore/specs/mvp.md
  - .lore/specs/adventure-system-integration.md
  - .lore/specs/adventure-creation-flow.md
  - .lore/specs/compaction-system-spec.md
---

# Spec: Adventure File Structure

## Overview

Adventures use a two-layer file structure. A small set of bootstrap files are loaded into the GM's system prompt each turn, providing just enough context to maintain tone, continuity, and orientation. Detailed reference material lives in typed subdirectories that the GM reads on demand using its existing file tools.

This replaces the current pattern where full character and world content is dumped into the prompt every turn. The GM already has Read, Write, Edit, Glob, and Grep with `cwd` set to the adventure directory. The convention change gives that capability a structure to work against.

## Entry Points

- GM prompt assembly (every turn, reads bootstrap files)
- GM file tool use during play (reads/writes reference files on demand)
- Adventure creation / onboarding (GM builds the initial structure)
- Adventure import (user brings files from another system)

## Requirements

### Bootstrap Layer (Prompt-Loaded)

- REQ-AFS-1: The system prompt includes content from four sources: adventure concept (from `adventure.md` body), character bootstrap (`character.md`), world index (`world.md`), and conversation history (`history.md`). These are the only files the engine reads into the prompt.

- REQ-AFS-2: `character.md` is a bootstrap summary of the player character. It contains identity (name, class, ancestry, level), a short narrative description (background, motivation, current situation), and a pointer to the full character sheet (e.g., "Full character sheet: characters/dwig.md"). The pointer is a human/GM-readable convention, not a field the engine parses. It is not the character sheet.

- REQ-AFS-3: `world.md` is an index document. It contains a brief world orientation (era, tone, major powers, active threats) followed by a directory of reference files organized by type. Each directory entry is a relative path with a one-line description. Orientation prose is acceptable and expected (the GM needs world context to maintain tone), but detailed descriptions of individual locations, NPCs, or factions belong in reference files, not the index.

- REQ-AFS-4: `adventure.md` and `history.md` are unchanged from the current spec. `adventure.md` carries frontmatter config (name, system, mood) and concept body. `history.md` is managed by the system.

### Reference Layer (On-Demand)

- REQ-AFS-5: Detailed adventure content lives in typed subdirectories using the pattern `<type>/<name>.md`. The type is whatever the adventure needs: `characters/`, `locations/`, `quests/`, `factions/`, `artifacts/`, or anything else that warrants its own entries. Directory names are not a fixed convention the engine enforces. All types are symmetrical from the engine's perspective.

- REQ-AFS-6: The player character's full sheet lives in `characters/<name>.md`. NPCs with enough detail to reference live here as individual files. Most adventures will have a `characters/` directory, but the engine does not depend on it existing.

- REQ-AFS-7: The engine does not enumerate, validate, or depend on reference directories. The world index (`world.md`) is the discovery mechanism. The engine reads `character.md`, `world.md`, and `history.md`. Everything else is between the GM and the files.

### GM Behavior

- REQ-AFS-8: The GM maintains the two-layer structure during play. When introducing a new element (NPC, location, quest), the GM writes the reference file AND adds an index entry to `world.md`. When updating an element, the GM updates the reference file AND the index entry if the summary has changed.

- REQ-AFS-9: When the player character's state changes significantly (mechanical: level up, inventory, status effects; narrative: reputation shifts, relationship changes, new goals), the GM updates the full character sheet (reference file) and the character bootstrap (`character.md`) if the change affects the summary. The examples are illustrative, not exhaustive; this is GM judgment.

- REQ-AFS-10: The GM reads reference files on demand rather than relying on prompt context for detail. When a player enters a location, the GM reads that location's file. When an NPC speaks, the GM reads that NPC's file. The bootstrap and index provide enough context to know what exists and where to find it.

- REQ-AFS-11: The GM creates the two-layer structure from the start during onboarding. A new character is written as both a bootstrap summary (`character.md`) and a full sheet (`characters/<name>.md`). A new world gets an index (`world.md`) and at least one reference file for the starting location. The split is structural, not a response to file size. (Note: onboarding mechanics are deferred to [STUB: adventure-onboarding-flow]; this requirement defines the structural outcome, not the interaction flow.)

### Prompt Instructions

- REQ-AFS-12: The file tool instructions in the system prompt describe the two-layer convention: `character.md` is a summary, `world.md` is an index, detailed content lives in `<type>/<name>.md` files. The instructions tell the GM to maintain both layers when state changes, and to read reference files for detail rather than relying on prompt context.

- REQ-AFS-13: The instructions tell the GM not to modify `adventure.md` or `history.md` (system-managed), but everything else in the adventure directory is the GM's to read and write.

### File Tool Instruction Text

REQ-AFS-12 requires updated file tool instructions. The following is the target instruction content for the prompt's "File Tools" section:

```
## File Tools

You have file tools (Read, Write, Edit, Glob, Grep) with access to the adventure directory.

The adventure directory uses a two-layer structure:

**Bootstrap files** (loaded into this prompt):
- `character.md` -- A summary of the player character. Not the full sheet.
- `world.md` -- An index of the world: orientation, active threats, and a directory of reference files.

**Reference files** (read on demand):
- Detailed content lives in typed subdirectories: `characters/`, `locations/`, `quests/`, and any other types the adventure needs.
- Each entry is a single file: `<type>/<name>.md` (e.g., `characters/sister-marne.md`, `locations/crossroads-inn.md`).
- Read reference files when you need detail. The index tells you what exists and where.

**When state changes:**
- Write or update the reference file in the appropriate directory.
- Update `world.md` to add or revise the index entry.
- If the player character changed, update `characters/<name>.md` (full sheet) and `character.md` (summary) if the change affects the summary.

**When introducing new elements:**
- Write a reference file: `<type>/<name>.md`
- Add an index entry to `world.md` with the path and a one-line description.
- Create a new type directory if nothing existing fits.

Do not modify `adventure.md` or `history.md` -- those are managed by the system.
```

### Adventure Directory Summary

| File | Owner | Loaded Into Prompt | Purpose |
|------|-------|--------------------|---------|
| `adventure.md` | System | Yes (concept body) | Frontmatter config (name, system, mood) + adventure concept. See [Spec: adventure-system-integration] |
| `character.md` | GM | Yes | Bootstrap summary of player character with pointer to full sheet |
| `world.md` | GM | Yes | World orientation + index of reference files |
| `history.md` | System | Yes | Conversation history, appended each turn. See [Spec: mvp] |
| `artstyle.md` | GM | No (read by routes) | Optional art style override. See [Spec: adventure-system-integration] |
| `mood.png` | System | No (served via endpoint) | Current mood image. See [Spec: dynamic-mood-system] |
| `<type>/<name>.md` | GM | No (read on demand) | Reference files: characters, locations, quests, etc. |
| `past/scene-*.md` | System | No (archived history) | Compacted history segments. See [Spec: compaction-system] |

## Exit Points

| Exit | Triggers When | Target |
|------|---------------|--------|
| Prompt assembly | Every turn | prompt-service (reads bootstrap files, assembles prompt) |
| File operations | During GM response | Agent SDK file tools (Read/Write/Edit in adventure dir) |
| Onboarding | New adventure, missing character or world | [STUB: adventure-onboarding-flow] |
| Migration | User imports old-format adventure | [STUB: adventure-migration] |
| Bootstrap sync | Character state changes significantly | Future: [STUB: summarization-agent] for auto-generating bootstrap from reference |

## Success Criteria

- [ ] `character.md` loaded into prompt is a bootstrap summary, not a full character sheet
- [ ] `world.md` loaded into prompt is an index with file pointers, not full world content
- [ ] GM reads reference files on demand during play (observable in tool use events)
- [ ] GM writes new reference files to typed subdirectories and updates `world.md` index
- [ ] GM updates both bootstrap and reference file when player character state changes
- [ ] GM creates two-layer structure during onboarding (new adventure starts with bootstrap + reference files)
- [ ] No engine changes to adventure-service file expectations (still reads character.md, world.md, history.md)

## AI Validation

**Defaults:**
- Unit tests with mocked time/network/filesystem/LLM calls
- 90%+ coverage on new code
- Code review by fresh-context sub-agent

**Custom:**
- Prompt-service output includes the file tool instruction text from this spec (or equivalent content covering: two-layer description, read-on-demand guidance, dual-update rules, index maintenance)
- Integration test: prompt assembled from `the-golden-age` adventure contains bootstrap content (~80 lines of character + world), not the full 500+ lines of NPC/location/quest data that the old flat format would have included
- Snapshot test: the file tool instruction section of the assembled prompt matches the expected structure

## Constraints

- The engine reads the same files it always has: `adventure.md`, `character.md`, `world.md`, `history.md`. The structural change is in what those files contain, not in what the engine does with them.
- The GM already has all necessary file tools. No new tools or capabilities are needed.
- Reference directory names are not engine-level concepts. The engine does not need to know about `characters/` or `locations/`. The world index is the contract between the GM and the file tree.
- This spec does not define how the GM creates the initial structure from scratch. That's onboarding flow ([STUB: adventure-onboarding-flow]).
- **Convention over enforcement**: The two-layer structure is communicated through prompt instructions, not validated by engine logic. The engine does not check whether `character.md` is a summary or a full sheet, or whether `world.md` is an index or a prose dump. This is deliberate: the engine cannot understand content semantics, and validation would require it to. If the GM diverges from convention (writes a full sheet to `character.md`, forgets to update the index), the system degrades gracefully (larger prompt, stale index) rather than failing. Detection and recovery are out of scope for this spec.
- **Bootstrap size target**: Bootstrap files (`character.md`, `world.md`) should stay under ~200 lines each. This is a convention, not a hard limit. The integration test validates that the assembled prompt from a mature adventure (the-golden-age) stays meaningfully smaller than it would under the old flat format.
- **Stale index entries**: If a reference file is deleted or moved, its `world.md` entry becomes stale. This is self-correcting: the GM reads on demand and will encounter a missing file, which is a signal to update the index. The instructions do not require the GM to proactively clean stale entries.

## Context

### Prior Art
- `.lore/specs/mvp.md`: Original adventure file conventions (character.md, world.md, history.md)
- `.lore/specs/adventure-system-integration.md`: adventure.md format, plugin bootstrap injection
- `.lore/specs/adventure-creation-flow.md`: Creation endpoint, name/concept fields
- `.lore/specs/compaction-system-spec.md`: History compaction (manages the other major context consumer)

### Reference Implementation
- `/home/rjroy/.corvran/adventures/the-golden-age/`: Fully restructured adventure demonstrating the target format
- `/home/rjroy/.corvran/adventures/new-arcana/`: Current flat format for comparison

### Vision Alignment
- **Markdown is Memory** (principle 1): The two-layer structure keeps markdown as the shared medium while making it scalable. The index is readable by human, AI, and developer.
- **Teach, Don't Code** (principle 2): The file structure convention is communicated through prompt instructions, not enforced by application logic.
- **Progressive Simplification** (principle 4): Uses existing file tools rather than adding custom tooling for file management.
- **System-Agnostic Core** (principle 5): Directory types (`characters/`, `artifacts/`, `factions/`) are determined by the story, not the engine. The engine sees `character.md`, `world.md`, and `history.md`. Everything else is content.
