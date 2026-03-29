---
description: Initialize d20 system in the current adventure directory
allowed-tools: [Read, Write, Bash, Glob]
---

# d20 System Initialization

Initialize d20 system mechanics in the current adventure directory by merging GM guidance into CLAUDE.md.

## Instructions

Perform the following steps to initialize the d20 system:

### Step 1: Merge d20-CLAUDE.md into CLAUDE.md

The d20-CLAUDE.md file contains complete d20 GM guidance including quick reference tables for all core mechanics. It must be appended to the project's CLAUDE.md file.

1. Read `${CLAUDE_PLUGIN_ROOT}/d20-CLAUDE.md`
2. Check if `./CLAUDE.md` exists in the current directory:
   - If it exists, read its contents
   - If it does not exist, start with empty contents
3. **Idempotency check**: Search the existing CLAUDE.md content for the marker `# d20 System GM Guidance`
   - If the marker is found, the d20 guidance has already been merged - skip to Step 2
   - If the marker is NOT found, append the d20-CLAUDE.md content to the end of CLAUDE.md
4. Write the updated CLAUDE.md to `./CLAUDE.md`

**Important**: When appending, preserve all existing CLAUDE.md content exactly as-is. Add a blank line before the new content for separation.

### Step 2: Report Success

After completing, report the results:

```
d20-system initialized!

Files updated:
- CLAUDE.md (GM guidance and quick reference appended)

Next steps:
1. Create player.md using the d20-players skill
2. Start your adventure!

For detailed mechanics, invoke the appropriate skill:
- d20-players: Character creation and advancement
- d20-combat: Combat and initiative
- d20-magic: Spellcasting mechanics
- d20-rules: Authoritative SRD rule lookups
```

If the d20-CLAUDE.md content was already present (idempotency check triggered), report:

```
d20-system already initialized!

CLAUDE.md already contains d20 GM guidance - no changes made.

Ready to play! Use d20-players to create a character or d20-rules for rule lookups.
```

## Error Handling

If any file operations fail, report the specific error and which step failed. The user may need to check permissions or the plugin installation.

## Notes

- This command is idempotent: running it multiple times will not duplicate content in CLAUDE.md
- All d20 mechanics are now in CLAUDE.md - no separate System.md file needed
- For detailed mechanics during play, invoke the appropriate skill (d20-players, d20-combat, d20-magic, d20-rules)
