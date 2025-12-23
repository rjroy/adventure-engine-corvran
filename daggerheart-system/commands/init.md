---
description: Initialize Daggerheart system in the current adventure directory
allowed-tools: [Read, Write, Bash, Glob]
---

# Daggerheart System Initialization

Initialize Daggerheart system mechanics in the current adventure directory by copying core files and merging GM guidance.

## Instructions

Perform the following steps to initialize the Daggerheart system:

### Step 0: Verify SRD Submodule

Before proceeding, verify that the Daggerheart SRD submodule is present and populated. This is required for rule lookups during play.

1. Check if the directory `docs/research/daggerheart-srd/` exists at the project root
2. Verify the directory contains files (not empty)

**If the SRD submodule is missing or empty, STOP and report this error:**

```
ERROR: Daggerheart SRD submodule not found or empty.

The Daggerheart system requires the SRD submodule for rule lookups.
Run the following command to initialize it:

  git submodule update --init docs/research/daggerheart-srd

Then run /daggerheart-system:init again.
```

Do not proceed with the remaining steps if the SRD check fails.

### Step 1: Copy System.md

Read the core rules from the plugin directory and write them to the current directory:

1. Read `${CLAUDE_PLUGIN_ROOT}/System.md`
2. Write the contents to `./System.md` in the current working directory

This file contains the core Daggerheart mechanics (Duality Dice, traits, Hope/Fear tokens, etc.) that the GM references during play.

### Step 2: Merge dh-CLAUDE.md into CLAUDE.md

The dh-CLAUDE.md file contains GM guidance for running Daggerheart adventures. It must be appended to the project's CLAUDE.md file.

1. Read `${CLAUDE_PLUGIN_ROOT}/dh-CLAUDE.md`
2. Check if `./CLAUDE.md` exists in the current directory:
   - If it exists, read its contents
   - If it does not exist, start with empty contents
3. **Idempotency check**: Search the existing CLAUDE.md content for the marker `# Daggerheart System GM Guidance`
   - If the marker is found, the Daggerheart guidance has already been merged - skip this step
   - If the marker is NOT found, append the dh-CLAUDE.md content to the end of CLAUDE.md
4. Write the updated CLAUDE.md to `./CLAUDE.md`

**Important**: When appending, preserve all existing CLAUDE.md content exactly as-is. Add a blank line before the new content for separation.

### Step 3: Report Success

After completing all steps, report the results:

```
Daggerheart system initialized!

Files created/updated:
- System.md (core Daggerheart rules)
- CLAUDE.md (GM guidance appended)

Next steps:
1. Review System.md for core mechanics (Duality Dice, Hope/Fear tokens)
2. Create a character using the dh-players skill
3. Start your adventure!
```

If the dh-CLAUDE.md content was already present (idempotency check triggered), report:

```
Daggerheart system initialized!

Files created/updated:
- System.md (core Daggerheart rules, refreshed)
- CLAUDE.md (GM guidance already present, no changes)

Next steps:
1. Review System.md for core mechanics (Duality Dice, Hope/Fear tokens)
2. Create a character using the dh-players skill
3. Start your adventure!
```

## Error Handling

### SRD Submodule Missing

If the SRD submodule check in Step 0 fails, report the error message shown above and do not proceed with other steps.

### File Operation Errors

If any file operations fail, report the specific error and which step failed. The user may need to check permissions or the plugin installation.

## Notes

- This command is idempotent: running it multiple times will not duplicate content in CLAUDE.md
- System.md is always refreshed (overwritten) to ensure the latest rules are available
- The SRD submodule is required but not copied - skills reference it via symlink
