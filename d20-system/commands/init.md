---
description: Initialize d20 system in the current adventure directory
allowed-tools: [Read, Write, Bash, Glob]
---

# d20 System Initialization

Initialize d20 system mechanics in the current adventure directory by copying core files.

## Instructions

Perform the following steps to initialize the d20 system:

### Step 1: Copy System.md

Read the core rules from the plugin directory and write them to the current directory:

1. Read `${CLAUDE_PLUGIN_ROOT}/System.md`
2. Write the contents to `./System.md` in the current working directory

This file contains the core d20 mechanics (ability scores, D20 tests, skills, etc.) that the GM references during play.

### Step 2: Merge d20-CLAUDE.md into CLAUDE.md

The d20-CLAUDE.md file contains GM guidance for running d20 adventures. It must be appended to the project's CLAUDE.md file.

1. Read `${CLAUDE_PLUGIN_ROOT}/d20-CLAUDE.md`
2. Check if `./CLAUDE.md` exists in the current directory:
   - If it exists, read its contents
   - If it does not exist, start with empty contents
3. **Idempotency check**: Search the existing CLAUDE.md content for the marker `# d20 System GM Guidance`
   - If the marker is found, the d20 guidance has already been merged - skip this step
   - If the marker is NOT found, append the d20-CLAUDE.md content to the end of CLAUDE.md
4. Write the updated CLAUDE.md to `./CLAUDE.md`

### Step 3: Report Success

After completing both steps, report the results:

```
d20-system initialized!

Files created/updated:
- System.md (core d20 rules)
- CLAUDE.md (GM guidance appended)

Next steps:
1. Review System.md for core mechanics
2. Create player.md using the d20-players skill
3. Start your adventure!
```

If the d20-CLAUDE.md content was already present (idempotency check triggered), report:

```
d20-system initialized!

Files created/updated:
- System.md (core d20 rules, refreshed)
- CLAUDE.md (GM guidance already present, no changes)

Next steps:
1. Review System.md for core mechanics
2. Create player.md using the d20-players skill
3. Start your adventure!
```

## Error Handling

If any file operations fail, report the specific error and which step failed. The user may need to check permissions or the plugin installation.
