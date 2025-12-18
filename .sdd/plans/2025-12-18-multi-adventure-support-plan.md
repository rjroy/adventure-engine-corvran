---
specification: [.sdd/specs/2025-12-17-multi-adventure-support.md](./../specs/2025-12-17-multi-adventure-support.md)
status: Approved
version: 1.0.0
created: 2025-12-18
last_updated: 2025-12-18
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Multi-Adventure Support - Technical Plan

## Overview

This plan restructures the Adventure Engine's file organization to support multiple concurrent adventures with different characters. The core approach is:

1. **New directory managers** for players/ and worlds/ with slug generation and collision handling
2. **Extended state.json** with `playerRef` and `worldRef` fields pointing to subdirectories
3. **Modified GM prompt** to use dynamic paths based on references instead of hardcoded root files
4. **Backward compatibility** via fallback detection when references are missing

## Architecture

### System Context

```
PROJECT_DIR/
├── players/                    # NEW: Character data
│   └── {character-slug}/
│       ├── sheet.md           # Rules data (stats, inventory)
│       └── state.md           # Narrative data (situation, quests)
├── worlds/                     # NEW: World data
│   └── {world-slug}/
│       ├── world_state.md     # Universal facts (genre, era)
│       ├── locations.md
│       ├── characters.md      # NPCs
│       └── quests.md
├── System.md                   # RPG rules (unchanged)
└── player.md, world_state.md   # LEGACY: Fallback files

ADVENTURES_DIR/
└── {adventureId}/
    ├── state.json             # MODIFIED: Add playerRef, worldRef
    └── history.json           # Unchanged
```

### Components

| Component | Responsibility | Changes |
|-----------|---------------|---------|
| `PlayerManager` | NEW: CRUD for players/, slug generation, collision handling | New class |
| `WorldManager` | NEW: CRUD for worlds/, template initialization | New class |
| `AdventureStateManager` | Persist adventure state, load/save | Add playerRef/worldRef fields, backward compat |
| `buildGMSystemPrompt()` | Generate GM system prompt | Use dynamic paths, minimal init trigger |
| `GameSession` | Orchestrate game flow | Wire new MCP tools |
| `character-world-init` skill | NEW: Initialization guidance and markdown templates | New skill in corvran/ |

## Technical Decisions

### TD-1: Slug Generation Algorithm
**Choice**: Custom slugify function with collision detection via filesystem check
**Requirements**: REQ-F-7, REQ-F-9, REQ-F-11, REQ-NF-4, REQ-NF-5

**Rationale**:
- No external dependency needed for simple slug generation (lowercase, replace spaces/special chars with hyphens)
- Collision detection by checking filesystem directly is simpler than maintaining an index
- 64-char truncation before slugification prevents path length issues
- Path traversal protection reuses existing `safeResolvePath()` pattern

**Algorithm**:
```
1. Truncate name to 64 chars
2. Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens
3. Check if directory exists
4. If collision, append "-2", "-3", etc. until unique
5. Validate result with safeResolvePath()
```

### TD-2: State References as Relative Paths
**Choice**: Store `playerRef` and `worldRef` as relative paths from PROJECT_DIR (e.g., `"players/kael-thouls"`)
**Requirements**: REQ-F-4, REQ-F-14, REQ-F-15

**Rationale**:
- Relative paths are portable if PROJECT_DIR moves
- Matches existing pattern of relative file references in GM prompt
- Easy to construct full path: `join(PROJECT_DIR, playerRef, "sheet.md")`
- Simple string comparison for reference equality checks

### TD-3: Backward Compatibility via Fallback Detection
**Choice**: Check for `playerRef`/`worldRef` presence; if missing, fall back to root-level files
**Requirements**: REQ-NF-1

**Rationale**:
- Existing adventures have no refs, so absence indicates legacy mode
- No migration required; legacy mode works transparently
- GM prompt path generation branches based on ref presence
- Allows gradual adoption without breaking existing saves

**Detection Logic**:
```typescript
if (state.playerRef) {
  playerPath = join(projectDir, state.playerRef);
} else {
  playerPath = projectDir; // Legacy: files at root
}
```

### TD-4: GM Prompt Path Rewriting
**Choice**: Modify `buildGMSystemPrompt()` to accept resolved paths and generate dynamic file references
**Requirements**: REQ-F-5, REQ-F-19, REQ-F-20, REQ-F-21, REQ-F-22

**Rationale**:
- Current prompt hardcodes `./player.md`, `./world_state.md` etc.
- New prompt will use paths derived from state refs: `./{playerRef}/sheet.md`, `./{worldRef}/world_state.md`
- GM reads/writes to the same paths, maintaining state in correct location
- Single source of truth for path generation prevents drift

**Prompt Changes**:
```
BEFORE: "./player.md - Player character details"
AFTER:  "./{playerRef}/sheet.md - Character rules data"
        "./{playerRef}/state.md - Character narrative state"
```

### TD-5: Auto-Create Missing Directories with Templates
**Choice**: On adventure load, if referenced directory doesn't exist, create it with empty template files
**Requirements**: REQ-F-28, REQ-F-29

**Rationale**:
- Prevents "missing file" errors from breaking the session
- Empty templates let GM populate on first interaction
- Matches existing pattern of creating adventure dir on first save
- Atomic directory creation using `mkdir({ recursive: true })`

**Templates**:
- `sheet.md`: `# Character Sheet\n\n*Details to be established in adventure.*`
- `state.md`: `# Character State\n\n*Current situation will be recorded here.*`
- `world_state.md`: `# World State\n\n*World facts will be established in adventure.*`

### TD-6: Remove Unused state.json Fields
**Choice**: Stop initializing `npcs`, `diceLog`, `combatState` in new adventures; keep for backward compat on load
**Requirements**: REQ-F-16

**Rationale**:
- These fields were planned for structured RPG data but never used
- NPC data goes in world's `characters.md` (managed by GM)
- Dice logs live in history.json narrative
- Combat state managed in world files by GM
- Removal reduces state.json size and schema complexity
- Backward compat: existing adventures with these fields still load fine (fields just ignored)

### TD-7: Initialization via Skill (Not Prompt Bloat)
**Choice**: GM detects empty refs → invokes `character-world-init` skill for guidance; main prompt stays lean
**Requirements**: REQ-F-23, REQ-F-24, REQ-F-25

**Rationale**:
- Keeps main GM prompt focused on gameplay, not setup mechanics
- Skill loaded on-demand only for new adventures
- GM remains responsible for markdown content (better at it than server)
- Server handles state.json mechanics via MCP tools
- Consistent with existing skill pattern (dice-roller, rules, etc.)

**Flow**:
1. New adventure created with empty `playerRef`/`worldRef`
2. First GM interaction detects empty refs
3. GM invokes `character-world-init` skill for guidance
4. Skill instructs: use `list_*` tools, present options, call `set_*` tools
5. GM writes markdown files following skill's structure guidance

**GM Prompt Addition** (minimal):
```
ON FIRST INTERACTION - If playerRef or worldRef is null:
  Invoke the character-world-init skill for setup guidance.
```

### TD-8: Minimal MCP Tools for State Management
**Choice**: MCP tools handle state.json refs and directory discovery; GM handles markdown content
**Requirements**: REQ-F-23, REQ-F-26, REQ-F-27

**Rationale**:
- Clear separation: server owns JSON state, GM owns markdown content
- Tools are minimal - just set refs and list directories
- Directory creation is empty (GM populates via skill guidance)
- Consistent pattern with existing `set_theme` and `set_xp_style` tools

**Tool Signatures**:
```typescript
// State management (write to state.json, create empty dirs)
set_character({ name: string, is_new: boolean })
  → Sets playerRef, creates empty directory if is_new

set_world({ name: string, is_new: boolean })
  → Sets worldRef, creates empty directory if is_new

// Discovery (read filesystem)
list_characters()
  → Returns array of { slug, name } from players/

list_worlds()
  → Returns array of { slug, name } from worlds/
```

### TD-9: New Corvran Skill for Initialization
**Choice**: Add `corvran/skills/character-world-init/` skill with markdown templates and guidance
**Requirements**: REQ-F-6, REQ-F-10, REQ-F-26, REQ-F-27

**Rationale**:
- Encapsulates initialization knowledge outside main prompt
- Provides markdown structure templates GM follows
- Only loaded when needed (new adventures)
- Can evolve independently of core GM prompt

**Skill Contents**:
- When to trigger (refs are null)
- How to use `list_characters`/`list_worlds` tools
- How to present options to player
- Markdown structure for `sheet.md`, `state.md`
- Markdown structure for `world_state.md`, `locations.md`, `characters.md`, `quests.md`
- Examples of well-formed files

## Data Model

### AdventureState (state.json) Changes

```typescript
interface AdventureState {
  // Existing fields...
  id: string;
  sessionToken: string;
  agentSessionId: string | null;
  createdAt: string;
  lastActiveAt: string;
  currentScene: { description: string; location: string };
  playerCharacter: PlayerCharacter;  // Becomes cache/summary
  currentTheme: { mood, genre, region, backgroundUrl };

  // NEW: References to character and world directories
  playerRef: string | null;  // e.g., "players/kael-thouls"
  worldRef: string | null;   // e.g., "worlds/eldoria"

  // KEPT: Still useful for RPG rules caching
  systemDefinition?: SystemDefinition | null;

  // REMOVED from new adventures (kept on load for backward compat):
  // npcs?: NPC[];
  // diceLog?: DiceLogEntry[];
  // combatState?: CombatState | null;
  // worldState: Record<string, unknown>;
}
```

### Character Directory Structure
**Requirements**: REQ-F-1, REQ-F-6

```
players/{character-slug}/
├── sheet.md     # Rules data: name, stats, skills, inventory, abilities
└── state.md     # Narrative data: current situation, personal quest progress
```

### World Directory Structure
**Requirements**: REQ-F-2, REQ-F-10, REQ-F-12

```
worlds/{world-slug}/
├── world_state.md   # Universal: name, genre, era, factions, major events
├── locations.md     # Discovered places
├── characters.md    # NPCs (universal, not adventure-specific relationships)
└── quests.md        # Active/completed quests
```

**NPC State Scoping (REQ-F-13)**: World's `characters.md` contains universal NPC definitions (name, role, description). Adventure-specific NPC state (relationship progress, dialogue history, encounter outcomes) is tracked implicitly in `history.json` narrative, not duplicated in world files. This allows the same NPC to appear in multiple adventures with different relationship arcs.

### Multi-Player Foundation
**Requirements**: REQ-F-32, REQ-F-33

The `playerRef` field is a single string for V1 scope. The directory structure (`players/` as a flat directory containing character subdirectories) supports future multi-player by:
- Adding `playerRefs: string[]` alongside `playerRef` when multi-player is implemented
- No directory restructure needed - just reference multiple character directories
- Each character directory remains independent, enabling party composition changes

## Integration Points

### AdventureStateManager
- **Add**: `playerRef` and `worldRef` fields to state initialization
- **Add**: `updatePlayerRef()` and `updateWorldRef()` methods
- **Modify**: `create()` to initialize refs as null (GM sets on first interaction)
- **Modify**: `load()` backward compat - missing refs default to null (legacy mode)

### buildGMSystemPrompt()
- **Add**: Parameters for resolved player/world paths
- **Modify**: File reference section to use dynamic paths
- **Add**: Instructions for character/world selection if refs are null

### createGMMcpServer()
- **Add**: `set_character`, `set_world`, `list_characters`, `list_worlds` tools
- **Wire**: Callbacks to PlayerManager and WorldManager

### corvran/skills/character-world-init/
- **New**: Skill with SKILL.md containing:
  - Trigger conditions (refs are null)
  - Tool usage guidance (list_*, set_*)
  - Markdown templates for character files (sheet.md, state.md)
  - Markdown templates for world files (world_state.md, locations.md, characters.md, quests.md)

### GameSession
- **Add**: Dependency on PlayerManager and WorldManager
- **Modify**: `initialize()` to auto-create missing directories per TD-5
- **Add**: Handlers for new MCP tool callbacks

### validation.ts
- **Add**: `validateSlug()` function for slug validation
- **Add**: `generateSlug()` function for name-to-slug conversion
- **Extend**: `safeResolvePath()` usage for player/world paths

## Error Handling, Performance, Security

### Error Strategy
- **Missing directory**: Auto-create with templates (REQ-F-28, REQ-F-29)
- **Corrupted files**: Log warning, continue with empty state (REQ-F-30)
- **Path traversal**: Rejected by `safeResolvePath()` with clear error (REQ-NF-4)
- **Slug collision**: Append numeric suffix, no error to user (REQ-F-9)
- **Atomic writes (REQ-NF-3)**: Preserve existing pattern - write to temp file, then rename. Applies to all state changes in PlayerManager and WorldManager.

### Performance Targets
- Directory existence check: <10ms (single `stat()` call)
- Slug generation with collision check: <50ms (up to 10 collision checks)
- Total file load: <100ms per REQ-NF-2 (existing pattern)

### Security Measures
- All player/world names validated and slugified before filesystem access
- Path traversal protection via existing `safeResolvePath()`
- 64-char truncation prevents path length attacks (REQ-NF-5)
- Directory creation uses restrictive permissions (0o700)

## Testing Strategy

### Unit Tests
- `generateSlug()`: Basic conversion, special characters, collision suffix
- `PlayerManager`: Create, load, list, collision handling
- `WorldManager`: Create, load, list, template initialization
- `buildGMSystemPrompt()`: Path generation with refs, legacy fallback
- MCP tools: `set_character`, `set_world`, `list_characters`, `list_worlds`

### Integration Tests
- New adventure → character/world selection → refs populated
- Load existing adventure with refs → correct paths used
- Load legacy adventure without refs → fallback to root files
- Two adventures same character → changes visible across sessions
- Missing ref directory → auto-created with templates

### Acceptance Test Coverage
| Acceptance Test | Unit | Integration |
|----------------|------|-------------|
| 1. New Adventure with New Character | generateSlug, PlayerManager.create | Full flow |
| 2. New Adventure with Existing Character | PlayerManager.load | Selection flow |
| 3. Two Adventures Same Character | N/A | State sharing |
| 4. Two Adventures Different Characters | N/A | State isolation |
| 5. World Sharing | WorldManager | Cross-adventure |
| 6. Backward Compatibility | buildGMSystemPrompt fallback | Legacy load |
| 7. State.json Cleanup | AdventureStateManager.create | Field absence |
| 8. Missing Reference Auto-Create | PlayerManager/WorldManager | Load with missing |
| 9. Slug Collision | generateSlug | Full flow |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GM doesn't follow new path conventions | M | H | Clear prompt instructions, integration tests validating file locations |
| Concurrent writes corrupt character data | L | M | Last-write-wins acceptable per REQ-F-31; atomic writes prevent corruption |
| Legacy adventures break on upgrade | L | H | Comprehensive backward compat testing; fallback is default behavior |
| Slug generation creates duplicate names | L | L | Collision detection with numeric suffix; filesystem is source of truth |

## Dependencies

### Technical
- No new external dependencies
- Reuses existing: `node:fs/promises`, `node:path`, `node:crypto`
- Existing validation utilities extended, not replaced

### Team
- No external approvals needed
- Self-contained backend changes

## Open Questions

- [x] UI for selection → Resolved: GM prompt-driven via skill (TD-7)
- [x] Missing directory handling → Resolved: Auto-create (TD-5)
- [x] `list_characters` / `list_worlds` MCP tools → Resolved: Yes, included in TD-8

---

**Next Phase**: Once approved, use `/spiral-grove:task-breakdown` to decompose into implementable tasks.
