---
description: Initialize Daggerheart system in the current adventure directory
allowed-tools: [Read, Write, Bash, Glob]
---

# Daggerheart System Initialization

Initialize Daggerheart system mechanics in the current adventure directory by merging GM guidance into CLAUDE.md.

## Instructions

Perform the following steps to initialize the Daggerheart system:

### Step 1: Merge dh-CLAUDE.md into CLAUDE.md

The dh-CLAUDE.md file contains complete Daggerheart GM guidance including quick reference tables for all core mechanics. It must be appended to the project's CLAUDE.md file.

1. Read `${CLAUDE_PLUGIN_ROOT}/dh-CLAUDE.md`
2. Check if `./CLAUDE.md` exists in the current directory:
   - If it exists, read its contents
   - If it does not exist, start with empty contents
3. **Idempotency check**: Search the existing CLAUDE.md content for the marker `# Daggerheart System GM Guidance`
   - If the marker is found, the Daggerheart guidance has already been merged - skip to Step 2
   - If the marker is NOT found, append the dh-CLAUDE.md content to the end of CLAUDE.md
4. Write the updated CLAUDE.md to `./CLAUDE.md`

**Important**: When appending, preserve all existing CLAUDE.md content exactly as-is. Add a blank line before the new content for separation.

### Step 2: Report Success

After completing, report the results:

```
Daggerheart system initialized!

Files updated:
- CLAUDE.md (GM guidance and quick reference appended)

Next steps:
1. Create a character using the dh-players skill
2. Start your adventure!

For detailed mechanics, invoke the appropriate skill:
- dh-players: Character creation and advancement
- dh-combat: Combat and spotlight flow
- dh-domains: Domain card lookups
- dh-rules: Authoritative SRD rule lookups
```

If the dh-CLAUDE.md content was already present (idempotency check triggered), report:

```
Daggerheart system already initialized!

CLAUDE.md already contains Daggerheart GM guidance - no changes made.

Ready to play! Use dh-players to create a character or dh-rules for rule lookups.
```

## Error Handling

If any file operations fail, report the specific error and which step failed. The user may need to check permissions or the plugin installation.

## Notes

- This command is idempotent: running it multiple times will not duplicate content in CLAUDE.md
- All Daggerheart mechanics are now in CLAUDE.md - no separate System.md file needed
- For detailed mechanics during play, invoke the appropriate skill (dh-players, dh-combat, dh-domains, dh-rules)
