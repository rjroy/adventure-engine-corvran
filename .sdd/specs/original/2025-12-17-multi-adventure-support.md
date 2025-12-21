---
version: 1.0.0
status: Approved
created: 2025-12-17
last_updated: 2025-12-17
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Multi-Adventure Support Specification

## Executive Summary

The Adventure Engine currently supports only one adventure at a time because character and world state files (`player.md`, `world_state.md`) live at the PROJECT_DIR root, while adventure-specific data (`state.json`, `history.json`) lives in `ADVENTURES_DIR/{adventureId}/`. This creates a coupling that prevents running multiple adventures concurrently or switching between characters.

This specification defines a restructured file organization that separates persistent character/world data from ephemeral adventure state, enabling multiple adventures with different characters and preparing the foundation for future multi-player support.

## User Story

As a player, I want to maintain multiple characters and switch between adventures, so that I can explore different storylines without losing progress on existing characters.

## Stakeholders

- **Primary**: Players who want to maintain multiple characters or run parallel adventures
- **Secondary**: GM system (Claude) that reads/writes state files; developers maintaining the codebase
- **Tertiary**: System administrators managing multi-user installations; future party members sharing world state

## Success Criteria

1. Multiple adventures can exist simultaneously without state collision
2. Characters persist independently of adventures and can be reused
3. World definitions are shared across adventures using the same world
4. Starting a new adventure allows selecting an existing character or creating new
5. Existing single-adventure deployments continue working (backward compatible)
6. New adventure `state.json` excludes `npcs`, `diceLog`, and `combatState` fields

## Functional Requirements

### File Organization

- **REQ-F-1**: Character data lives at `{PROJECT_DIR}/players/{character-slug}/` with character sheet and narrative state
- **REQ-F-2**: World data lives at `{PROJECT_DIR}/worlds/{world-slug}/` with universal world facts
- **REQ-F-3**: Adventure state (`state.json`, `history.json`) remains at `{ADVENTURES_DIR}/{adventureId}/`
- **REQ-F-4**: `state.json` references the active character and world by relative path
- **REQ-F-5**: GM prompt uses paths relative to PROJECT_DIR based on `state.json` references

### Character Files Structure

- **REQ-F-6**: Each character directory contains `sheet.md` (rules data: stats, inventory, abilities) and `state.md` (narrative data: current situation, personal quest progress)
- **REQ-F-7**: Character directory names are filesystem-safe slugs derived from character names
- **REQ-F-8**: Characters can be created fresh for a new adventure or selected from existing `players/` directory
- **REQ-F-9**: Slug generation appends numeric suffix if collision detected (e.g., `kael-thouls-2`)

### World Files Structure

- **REQ-F-10**: Each world directory contains `world_state.md` (universal: name, genre, era, factions), `locations.md`, `characters.md` (NPCs), `quests.md`
- **REQ-F-11**: World directory names are filesystem-safe slugs
- **REQ-F-12**: Multiple adventures can reference the same world
- **REQ-F-13**: Adventure-specific NPC relationship/dialogue state lives in adventure's `history.json`, not world's `characters.md`

### Adventure State (state.json) Updates

- **REQ-F-14**: Add `playerRef` field containing path to active character directory (e.g., `"players/kael-thouls"`); singular for current scope
- **REQ-F-15**: Add `worldRef` field containing path to active world directory (e.g., `"worlds/eldoria"`)
- **REQ-F-16**: Remove unused fields: `npcs`, `diceLog`, `combatState`
- **REQ-F-17**: Retain `systemDefinition` for RPG rules caching
- **REQ-F-18**: `playerCharacter` field becomes a cache/summary extracted from character's `sheet.md`

### GM Prompt Updates

- **REQ-F-19**: GM reads character files from `{playerRef}/sheet.md` and `{playerRef}/state.md`
- **REQ-F-20**: GM reads world files from `{worldRef}/world_state.md`, `{worldRef}/locations.md`, etc.
- **REQ-F-21**: GM writes character changes to the character-specific directory
- **REQ-F-22**: GM writes world changes (NPCs, locations, quests) to the world-specific directory

### Adventure Lifecycle

- **REQ-F-23**: Character/world selection is GM prompt-driven during first interaction
- **REQ-F-24**: GM prompts for world selection (existing or new) when starting fresh adventure
- **REQ-F-25**: GM prompts for character selection (existing or new) when starting fresh adventure
- **REQ-F-26**: Creating a new character initializes `players/{slug}/sheet.md` and `state.md` with templates
- **REQ-F-27**: Creating a new world initializes `worlds/{slug}/` with template files

### Error Handling

- **REQ-F-28**: If `playerRef` directory does not exist at adventure load, auto-create with empty templates
- **REQ-F-29**: If `worldRef` directory does not exist at adventure load, auto-create with empty templates
- **REQ-F-30**: If character/world files are corrupted (invalid markdown), log warning and continue with empty state
- **REQ-F-31**: Concurrent access to same character files from multiple adventures must not corrupt data (last-write-wins acceptable)

### Multi-Player Foundation

- **REQ-F-32**: File structure supports `playerRefs` array for future multi-player (not activated in this scope)
- **REQ-F-33**: Directory layout allows multiple characters per adventure without structural changes

## Non-Functional Requirements

- **REQ-NF-1** (Compatibility): Existing adventures without `playerRef`/`worldRef` continue working with fallback to root-level files
- **REQ-NF-2** (Performance): File operations complete in <100ms for typical character/world loads
- **REQ-NF-3** (Integrity): Atomic writes for all state changes (existing pattern preserved)
- **REQ-NF-4** (Validation): Path traversal protection on character/world names
- **REQ-NF-5** (Limits): Character/world names truncated to 64 characters before slugification

## Explicit Constraints (DO NOT)

- Do NOT implement concurrent multi-player input handling (future scope)
- Do NOT move `history.json` or `state.json` from adventure directory
- Do NOT change the WebSocket protocol or message types
- Do NOT remove backward compatibility for existing single-file deployments
- Do NOT auto-migrate existing data; provide migration utility separately

## Technical Context

- **Existing Stack**: Bun runtime, TypeScript, Claude Agent SDK, WebSocket protocol
- **Integration Points**: State management system, game session lifecycle, GM prompt generation, world initialization scripts
- **Patterns to Respect**: Atomic writes with temp files, Zod validation, path traversal protection

## Acceptance Tests

1. **New Adventure with New Character**: Create adventure, create character "Kael Thouls" → files at `players/kael-thouls/sheet.md` and `state.md`
2. **New Adventure with Existing Character**: Create adventure, select existing "Kael Thouls" → adventure uses existing character files
3. **Two Adventures Same Character**: Create two adventures both referencing "Kael Thouls" → changes in one reflect in other's next session
4. **Two Adventures Different Characters**: Create two adventures with different characters → state isolation verified
5. **World Sharing**: Two adventures reference "Eldoria" world → NPC added in one appears in other
6. **Backward Compatibility**: Load existing adventure without `playerRef` → falls back to `player.md` at root
7. **State.json Cleanup**: New adventure `state.json` does not contain `npcs`, `diceLog`, `combatState` fields
8. **Missing Reference Auto-Create**: Load adventure with `playerRef` pointing to non-existent directory → directory auto-created with templates
9. **Slug Collision**: Create two characters named "Kael" → second gets slug `kael-2`

## Out of Scope

- Multi-player concurrent input handling
- Character import/export between PROJECT_DIRs
- World template marketplace
- Migration tool for existing adventures (separate task)
- CLI flags for character/world selection (GM prompt-driven only)

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
