---
title: "Commission: Build apocrypha-system plugin"
date: 2026-04-04
status: completed
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Build the `plugins/apocrypha-system/` plugin directory from scratch.\n\n## Guiding Specs\n\n1. **Plugin structure**: `.lore/specs/rpg-system-plugin-spec.md` defines the directory layout, manifest schemas, bootstrap structure, skill format, and naming conventions. Follow every REQ-PLG requirement.\n2. **Game system substance**: `.lore/specs/keyword-rpg-system.md` defines the Apocrypha RPG system. Every REQ-KW requirement is the source of truth for mechanics, character creation, combat, progression, stress, hope/fear economy, adversaries, and GM guidelines.\n\n## Key Decisions\n\n- **Alias**: `apocrypha` (directory: `plugins/apocrypha-system/`)\n- **Skill prefix**: `ap-` (e.g., `ap-rules`, `ap-combat`, `ap-players`, `ap-adversaries`)\n- **No SRD**: Apocrypha is an original system. There is no external SRD to reference. The rules skill contains the complete rules text (derived from the spec). The License.md should state the system is original content authored for this project.\n- **No submodules**: No external reference material to symlink.\n\n## Required Files\n\n### Manifests\n- `corvran-plugin.json` — per REQ-PLG-3 through REQ-PLG-7\n- `.claude-plugin/plugin.json` — per REQ-PLG-8 through REQ-PLG-11\n\n### Bootstrap\n- `bootstrap.md` — per REQ-PLG-12 through REQ-PLG-24. Must contain all six sections:\n  1. System Identity (Apocrypha, keyword-based, LLM-native)\n  2. Core Mechanic (2d12 hope/fear, keyword modifiers, difficulty scale, four outcomes, criticals on doubles)\n  3. Dice Convention (at least 3 `mcp__corvran__roll_dice` examples: standard check, combat roll, roll with high modifier)\n  4. Narrative Philosophy (keywords-as-fiction, stress-as-narrative, collaborative authority)\n  5. Key Vocabulary (all Apocrypha-specific terms: keywords, stress levels, hope/fear, crisis, montage, acts, scenes, tiers)\n  6. Onboarding (character creation flow from REQ-KW-43, world-from-keywords from REQ-KW-45, \"Use the ap-* skills\" directive)\n  \n  **Critical**: Must stay under 3000 words (REQ-PLG-22). The entire Apocrypha system fits in the bootstrap. Lean and dense. Skills provide procedural depth; the bootstrap provides mechanical foundation.\n  \n  **Critical**: The bootstrap must include Fear tracking in adventure.md frontmatter (REQ-KW-21A) and instruct the GM to update it after spending or gaining Fear.\n  \n  **Critical**: The bootstrap must instruct the GM to spend Fear actively (REQ-KW-21). A Fear pool above 6 is a missed narrative beat.\n\n### Skills\n\n#### `ap-rules` (required per REQ-PLG-35)\n- SKILL.md: Complete rules reference. Since there's no external SRD, this IS the rules. Cover: dice resolution, outcomes, hope/fear economy, stress, rest/recovery, progression, session/act structure, GM guidelines. All derived from REQ-KW requirements.\n- `references/`: May not need subdirectories since the rules are self-contained. Include a `quick-reference.md` with a condensed one-page summary of resolution, outcomes, and stress.\n- `License.md`: State this is original content.\n\n#### `ap-combat` (required per REQ-PLG-36)\n- SKILL.md: Combat procedures. Player-rolls-everything (REQ-KW-30A/B/C). Stress dealing to adversaries (REQ-KW-27-29A). Fear spending in combat (REQ-KW-19). No initiative system. Adversary degradation as stress accumulates.\n- `references/conditions.md`: Stress conditions and their effects (light stress, deep stress, crisis state)\n- `references/encounter-template.md`: Template for tracking an encounter (adversary blocks, stress counters, Fear pool)\n\n#### `ap-players` (required per REQ-PLG-37)\n- SKILL.md: Character creation (REQ-KW-42-44), keyword scoping (REQ-KW-5-7), progression (REQ-KW-37-41), keyword splitting (REQ-KW-10), retirement (REQ-KW-11), rest/recovery (REQ-KW-46-48A).\n- `references/sheet-template.md`: Character sheet format from the spec's \"Character Sheet Format\" section. Use `[placeholder]` syntax with HTML comments.\n- `references/sheet-example.md`: A completed example character at level 1. Three keywords, proper scoping and exclusions, all sections filled.\n- `references/story-template.md`: Story tracking template (current act, scene, objectives, arcs, recent events).\n\n#### `ap-adversaries` (required per REQ-PLG-38)\n- SKILL.md: Adversary creation (REQ-KW-32-36), tier system, stress thresholds, Fear abilities, per-keyword vs aggregate tracking (REQ-KW-29A).\n- `references/adversary-template.md`: Adversary block format from the spec's \"Adversary Block Format\" section.\n- `references/adversary-examples.md`: One example of each tier (minor, standard, major) with keywords, Fear abilities, and stress thresholds.\n\n## Existing Plugin Reference\n\nRead `plugins/daggerheart-system/` for concrete examples of:\n- Bootstrap tone and density\n- SKILL.md frontmatter `description` field (trigger text quality matters)\n- Reference file conventions (HTML comments, placeholder syntax)\n- How skills cross-reference each other\n\nMatch the quality and conventions of the existing plugins. The Apocrypha system is mechanically simpler than Daggerheart (no classes, no domains, no spell lists), so the plugin should be proportionally leaner. But the keyword scoping, stress system, and hope/fear economy need thorough coverage because they ARE the system.\n\n## What NOT to Do\n\n- Do not modify any engine code. This is content only.\n- Do not create test files. Plugin content is validated by inspection and by running the engine (per the plugin spec's success criteria).\n- Do not duplicate bootstrap content in skills. Skills provide depth; the bootstrap provides foundation. If it's in the bootstrap, the skill references it rather than restating it."
dependencies: []
linked_artifacts:
  - plugins/apocrypha-system/bootstrap.md

  - plugins/apocrypha-system/corvran-plugin.json
  - plugins/apocrypha-system/.claude-plugin/plugin.json
  - plugins/apocrypha-system/skills/ap-rules/SKILL.md
  - plugins/apocrypha-system/skills/ap-rules/License.md
  - plugins/apocrypha-system/skills/ap-rules/references/quick-reference.md
  - plugins/apocrypha-system/skills/ap-combat/SKILL.md
  - plugins/apocrypha-system/skills/ap-combat/references/conditions.md
  - plugins/apocrypha-system/skills/ap-combat/references/encounter-template.md
  - plugins/apocrypha-system/skills/ap-players/SKILL.md
  - plugins/apocrypha-system/skills/ap-players/references/sheet-template.md
  - plugins/apocrypha-system/skills/ap-players/references/sheet-example.md
  - plugins/apocrypha-system/skills/ap-players/references/story-template.md
  - plugins/apocrypha-system/skills/ap-adversaries/SKILL.md
  - plugins/apocrypha-system/skills/ap-adversaries/references/adversary-template.md
  - plugins/apocrypha-system/skills/ap-adversaries/references/adversary-examples.md
  - plugins/apocrypha-system/corvran-plugin.json
  - plugins/apocrypha-system/.claude-plugin/plugin.json
  - plugins/apocrypha-system/skills/ap-rules/SKILL.md
  - plugins/apocrypha-system/skills/ap-rules/License.md
  - plugins/apocrypha-system/skills/ap-rules/references/quick-reference.md
  - plugins/apocrypha-system/skills/ap-combat/SKILL.md
  - plugins/apocrypha-system/skills/ap-combat/references/conditions.md
  - plugins/apocrypha-system/skills/ap-combat/references/encounter-template.md
  - plugins/apocrypha-system/skills/ap-players/SKILL.md
  - plugins/apocrypha-system/skills/ap-players/references/sheet-template.md
  - plugins/apocrypha-system/skills/ap-players/references/sheet-example.md
  - plugins/apocrypha-system/skills/ap-players/references/story-template.md
  - plugins/apocrypha-system/skills/ap-adversaries/SKILL.md
  - plugins/apocrypha-system/skills/ap-adversaries/references/adversary-template.md
  - plugins/apocrypha-system/skills/ap-adversaries/references/adversary-examples.md
resource_overrides:
  model: opus

activity_timeline:
  - timestamp: 2026-04-04T14:31:13.890Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T14:31:13.892Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T14:31:13.926Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-04T14:31:32.085Z
    event: progress_report
    reason: "Starting commission. Reading specs and existing plugin reference."
  - timestamp: 2026-04-04T14:32:13.099Z
    event: progress_report
    reason: "Finished reading both specs and all daggerheart reference files. Now building the Apocrypha plugin. Launching parallel agents to write all files."
  - timestamp: 2026-04-04T14:44:28.711Z
    event: progress_report
    reason: "All files read. Starting systematic review against REQ-PLG and REQ-KW requirements. Checking directory layout, manifests, bootstrap, skills, and spec coverage."
  - timestamp: 2026-04-04T14:46:05.078Z
    event: progress_report
    reason: "Directory layout, manifests, bootstrap, and skill structure all pass. Now checking REQ-KW requirements coverage across all plugin files."
  - timestamp: 2026-04-04T14:48:25.597Z
    event: progress_report
    reason: "Review complete. All REQ-PLG and REQ-KW requirements checked. Found 1 MEDIUM defect (outcome table inaccuracy), 1 MEDIUM concern (bootstrap/skill content duplication), and 1 LOW observation (stale spec alias). Preparing final submission."
  - timestamp: 2026-04-04T14:49:19.594Z
    event: result_submitted
    reason: "# Review: plugins/apocrypha-system/\n\n## Verdict\n\nThe plugin is well-built and substantially complete. All REQ-PLG structural requirements pass. All REQ-KW mechanical requirements are covered across the bootstrap and skills. The quality of the reference material (adversary examples, character sheet example, conditions reference) is high. Two findings require attention; the rest is observation.\n\n---\n\n## Findings\n\n### F1: MEDIUM - Failure with Hope outcome table is mechanically inaccurate\n\n**File**: `plugins/apocrypha-system/skills/ap-rules/SKILL.md`, line 32\n\n**What's wrong**: The outcome table says \"Player gains Hope\" as the unconditional token effect for Failure with Hope. REQ-KW-14 specifies the character \"gains something (information, positioning, or a Hope token)\" - a Hope token is one of three possible benefits, not guaranteed.\n\n**Evidence**: The bootstrap (line 24) correctly says \"the character gains something: information, positioning, or a Hope token.\" The ap-rules table collapses this into an unconditional Hope gain.\n\n**Impact**: This changes the mechanic. The GM loses flexibility to give information or positioning instead of a token on partial failures. Over many rolls, it inflates the Hope economy since every Failure with Hope now produces a token instead of sometimes producing non-token narrative benefits.\n\n**Fix**: Change the Token Effect column for Failure with Hope from \"Player gains Hope\" to \"Player gains Hope or narrative benefit\" and add a note below the table clarifying the alternatives.\n\n---\n\n### F2: MEDIUM - Bootstrap duplicates skill-level reference content\n\n**File**: `plugins/apocrypha-system/bootstrap.md`, lines 52-89\n\n**What's wrong**: The Hope/Fear Economy section (lines 52-66) and Stress System section (lines 68-89) reproduce nearly the same spending tables, stress definitions, adversary stress rules, and combat procedures that appear in ap-rules and ap-combat. REQ-PLG-23 states the bootstrap \"MUST NOT duplicate content that belongs in skills.\"\n\n**Evidence**: Compare bootstrap lines 59-64 (Fear spending options) against ap-rules lines 112-117. Compare bootstrap lines 72-73 (stress levels) against ap-rules lines 131-134. Compare bootstrap lines 82-83 (adversary stress table) against ap-combat lines 34-40. The content is nearly verbatim.\n\n**Counterpoint**: REQ-PLG-12 requires the core mechanic section be \"complete enough that the AI can resolve any standard action without consulting skills.\" The hope/fear and stress mechanics ARE the core mechanic. The tension between REQ-PLG-12 and REQ-PLG-23 is real.\n\n**Impact**: At 1454 words, the bootstrap is within budget (3000 max). The duplication costs about 400 words of context that gets injected into every message. The Daggerheart bootstrap handles equivalent mechanics in 788 words by summarizing without full tables.\n\n**Fix**: Condense the Hope/Fear and Stress sections to summaries: \"Hope (max 6): spend to reroll (1), clear light stress (1), narrative declaration (2). Fear (max 12): spend to inflict stress (1-2), complication (1), Fear ability (varies), scene interrupt (3). Track Fear in adventure.md frontmatter.\" Then point to ap-rules for the full reference. This would shave roughly 300 words while preserving the foundation knowledge.\n\n---\n\n### F3: LOW - Stale alias in keyword-rpg-system.md spec\n\n**File**: `.lore/specs/keyword-rpg-system.md`, line 21\n\n**What's wrong**: The spec says `system: keyword` in adventure.md frontmatter. The commission and implementation use alias `apocrypha`. The plugin is correct; the spec has a stale reference.\n\n**Fix**: Update the spec's entry points section to say `system: apocrypha`.\n\n---\n\n## Requirements Satisfied\n\nAll 55+ REQ-KW requirements checked. All pass except the Failure with Hope table inaccuracy noted in F1.\n\nAll REQ-PLG requirements (1-41) checked. All pass except the duplication concern noted in F2.\n\n### Specific coverage highlights:\n- REQ-KW-5 through 11 (keyword structure, scoping, splitting, retirement): Thorough coverage across ap-rules and ap-players with good/bad examples\n- REQ-KW-12 through 17 (dice resolution): Correctly implemented with 2d12, correct difficulty scale, all four outcomes, criticals on doubles with no tokens, stakes declaration\n- REQ-KW-18 through 21A (hope/fear economy): All spending options, caps, Fear in adventure.md frontmatter, active spending instruction\n- REQ-KW-22 through 26A (stress system): All levels, stacking, cap at -3, crisis definition, death as player choice, stress spreading\n- REQ-KW-27 through 31 (stress dealing): Adversary and player stress channels correctly specified\n- REQ-KW-30A through 30C (player-rolls-everything): All three combat situations covered\n- REQ-KW-32 through 36 (adversaries): Tiers, thresholds, Fear abilities, fixed keywords, world.md recording\n- REQ-KW-37 through 41 (progression): Narrative milestones, no formula, new keywords, deepening, splitting\n- REQ-KW-42 through 45 (character creation): Conversational flow, keyword scoping, starting budget, world from keywords\n- REQ-KW-46 through 48A (rest/recovery): Light stress clearing, deep stress resolution with anti-over-compliance instruction, montage mechanics\n- REQ-KW-49 through 52 (session/act structure): Scene counts, act spans, retrospective, session recap\n- REQ-KW-53 through 55 (GM guidelines): Never narrate player actions, reuse world elements, use montage\n\n### Quality observations (no action required):\n- The adversary examples (adversary-examples.md) are excellent: three tiers with rich narrative, keyword degradation examples, mid-fight state tables, and GM strategy notes\n- The character sheet example (Kael Ashenmoor) demonstrates proper keyword design with well-crafted scoping and exclusions\n- The conditions.md reference provides narrative expression examples for each stress level, going beyond mechanical definitions\n- Cross-references between skills are clean and consistent\n- Template conventions (HTML comments, [placeholder] syntax) match existing plugins"
  - timestamp: 2026-04-04T14:50:29.367Z
    event: progress_report
    reason: "All 16 files written. Review findings addressed: F1 (Failure with Hope token accuracy) fixed in ap-rules and quick-reference. F2 (bootstrap duplication) addressed by condensing spending lists with skill pointers. F3 (spec alias housekeeping) noted but out of scope. Preparing to submit."
  - timestamp: 2026-04-04T14:50:54.891Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "All 16 files written. Review findings addressed: F1 (Failure with Hope token accuracy) fixed in ap-rules and quick-reference. F2 (bootstrap duplication) addressed by condensing spending lists with skill pointers. F3 (spec alias housekeeping) noted but out of scope. Preparing to submit."
projectName: corvran
---
# Review: plugins/apocrypha-system/

## Verdict

The plugin is well-built and substantially complete. All REQ-PLG structural requirements pass. All REQ-KW mechanical requirements are covered across the bootstrap and skills. The quality of the reference material (adversary examples, character sheet example, conditions reference) is high. Two findings require attention; the rest is observation.

---

## Findings

### F1: MEDIUM - Failure with Hope outcome table is mechanically inaccurate

**File**: `plugins/apocrypha-system/skills/ap-rules/SKILL.md`, line 32

**What's wrong**: The outcome table says "Player gains Hope" as the unconditional token effect for Failure with Hope. REQ-KW-14 specifies the character "gains something (information, positioning, or a Hope token)" - a Hope token is one of three possible benefits, not guaranteed.

**Evidence**: The bootstrap (line 24) correctly says "the character gains something: information, positioning, or a Hope token." The ap-rules table collapses this into an unconditional Hope gain.

**Impact**: This changes the mechanic. The GM loses flexibility to give information or positioning instead of a token on partial failures. Over many rolls, it inflates the Hope economy since every Failure with Hope now produces a token instead of sometimes producing non-token narrative benefits.

**Fix**: Change the Token Effect column for Failure with Hope from "Player gains Hope" to "Player gains Hope or narrative benefit" and add a note below the table clarifying the alternatives.

---

### F2: MEDIUM - Bootstrap duplicates skill-level reference content

**File**: `plugins/apocrypha-system/bootstrap.md`, lines 52-89

**What's wrong**: The Hope/Fear Economy section (lines 52-66) and Stress System section (lines 68-89) reproduce nearly the same spending tables, stress definitions, adversary stress rules, and combat procedures that appear in ap-rules and ap-combat. REQ-PLG-23 states the bootstrap "MUST NOT duplicate content that belongs in skills."

**Evidence**: Compare bootstrap lines 59-64 (Fear spending options) against ap-rules lines 112-117. Compare bootstrap lines 72-73 (stress levels) against ap-rules lines 131-134. Compare bootstrap lines 82-83 (adversary stress table) against ap-combat lines 34-40. The content is nearly verbatim.

**Counterpoint**: REQ-PLG-12 requires the core mechanic section be "complete enough that the AI can resolve any standard action without consulting skills." The hope/fear and stress mechanics ARE the core mechanic. The tension between REQ-PLG-12 and REQ-PLG-23 is real.

**Impact**: At 1454 words, the bootstrap is within budget (3000 max). The duplication costs about 400 words of context that gets injected into every message. The Daggerheart bootstrap handles equivalent mechanics in 788 words by summarizing without full tables.

**Fix**: Condense the Hope/Fear and Stress sections to summaries: "Hope (max 6): spend to reroll (1), clear light stress (1), narrative declaration (2). Fear (max 12): spend to inflict stress (1-2), complication (1), Fear ability (varies), scene interrupt (3). Track Fear in adventure.md frontmatter." Then point to ap-rules for the full reference. This would shave roughly 300 words while preserving the foundation knowledge.

---

### F3: LOW - Stale alias in keyword-rpg-system.md spec

**File**: `.lore/specs/keyword-rpg-system.md`, line 21

**What's wrong**: The spec says `system: keyword` in adventure.md frontmatter. The commission and implementation use alias `apocrypha`. The plugin is correct; the spec has a stale reference.

**Fix**: Update the spec's entry points section to say `system: apocrypha`.

---

## Requirements Satisfied

All 55+ REQ-KW requirements checked. All pass except the Failure with Hope table inaccuracy noted in F1.

All REQ-PLG requirements (1-41) checked. All pass except the duplication concern noted in F2.

### Specific coverage highlights:
- REQ-KW-5 through 11 (keyword structure, scoping, splitting, retirement): Thorough coverage across ap-rules and ap-players with good/bad examples
- REQ-KW-12 through 17 (dice resolution): Correctly implemented with 2d12, correct difficulty scale, all four outcomes, criticals on doubles with no tokens, stakes declaration
- REQ-KW-18 through 21A (hope/fear economy): All spending options, caps, Fear in adventure.md frontmatter, active spending instruction
- REQ-KW-22 through 26A (stress system): All levels, stacking, cap at -3, crisis definition, death as player choice, stress spreading
- REQ-KW-27 through 31 (stress dealing): Adversary and player stress channels correctly specified
- REQ-KW-30A through 30C (player-rolls-everything): All three combat situations covered
- REQ-KW-32 through 36 (adversaries): Tiers, thresholds, Fear abilities, fixed keywords, world.md recording
- REQ-KW-37 through 41 (progression): Narrative milestones, no formula, new keywords, deepening, splitting
- REQ-KW-42 through 45 (character creation): Conversational flow, keyword scoping, starting budget, world from keywords
- REQ-KW-46 through 48A (rest/recovery): Light stress clearing, deep stress resolution with anti-over-compliance instruction, montage mechanics
- REQ-KW-49 through 52 (session/act structure): Scene counts, act spans, retrospective, session recap
- REQ-KW-53 through 55 (GM guidelines): Never narrate player actions, reuse world elements, use montage

### Quality observations (no action required):
- The adversary examples (adversary-examples.md) are excellent: three tiers with rich narrative, keyword degradation examples, mid-fight state tables, and GM strategy notes
- The character sheet example (Kael Ashenmoor) demonstrates proper keyword design with well-crafted scoping and exclusions
- The conditions.md reference provides narrative expression examples for each stress level, going beyond mechanical definitions
- Cross-references between skills are clean and consistent
- Template conventions (HTML comments, [placeholder] syntax) match existing plugins

## Decisions

**Does the alias 'apocrypha' match the spec's expected alias?**
LOW: The keyword-rpg-system.md spec says `system: keyword` in adventure.md frontmatter (line 21), but the commission explicitly specifies alias `apocrypha`. The plugin correctly follows the commission. The spec has a stale alias that should be updated to reflect the final naming decision.
*Reasoning: The commission is the authoritative naming decision, made after the spec was written. The plugin follows the commission correctly. The spec's `system: keyword` reference is outdated but this is a spec maintenance issue, not a plugin defect.*

**REQ-PLG-1 through REQ-PLG-2: Directory layout and naming conventions**
PASS. Directory is `apocrypha-system`, alias is `apocrypha`. Skill prefix is `ap-` consistently across all four skill directories (ap-rules, ap-combat, ap-players, ap-adversaries). All SKILL.md frontmatter `name` fields match their directory names.
*Reasoning: REQ-PLG-1: directory `apocrypha-system` matches alias `apocrypha` + `-system`. REQ-PLG-2: prefix `ap-` used consistently in all skill directory names and SKILL.md name fields (ap-rules, ap-combat, ap-players, ap-adversaries).*

**REQ-PLG-3 through REQ-PLG-7: corvran-plugin.json validation**
PASS. All fields correct. name: "apocrypha-system" matches directory (REQ-PLG-3). type: "system" (REQ-PLG-4). alias: "apocrypha" non-empty (REQ-PLG-5). description present as noun phrase (REQ-PLG-6). bootstrap: "bootstrap.md" (REQ-PLG-7).
*Reasoning: Inspected corvran-plugin.json. All five fields present and valid. The description "A keyword-driven RPG where characters are defined by natural-language phrases, not classes or spell lists" is a noun phrase as required.*

**REQ-PLG-8 through REQ-PLG-11: .claude-plugin/plugin.json validation**
PASS. name "apocrypha-system" matches corvran-plugin.json (REQ-PLG-8). version "1.0.0" follows semver (REQ-PLG-9). description is more detailed than engine manifest (REQ-PLG-10). license is "MIT" which accurately reflects original content (REQ-PLG-11).
*Reasoning: All fields present and valid. The MIT license is appropriate for original content with no SRD dependency. The description covers mechanical domains (keyword-based character creation, 2d12 resolution, stress, adversaries, progression).*

**REQ-PLG-12 through REQ-PLG-24: Bootstrap completeness and constraints**
PASS with one MEDIUM finding. All 6 sections present: System Identity (line 1-3), Core Mechanic (5-29), Dice Convention (31-50), Hope/Fear Economy (52-66) which is additional to the required sections, Stress System (68-89), Narrative Philosophy (91-97), Key Vocabulary (99-119), Onboarding (121-136). Word count 1454, well under 3000 limit (REQ-PLG-22). Three dice examples with exact JSON payloads (REQ-PLG-14). Fear tracked in adventure.md frontmatter (REQ-KW-21A, line 66). GM instructed to spend Fear actively when pool > 6 (REQ-KW-21, line 66). No content duplication with skills for templates or stat blocks (REQ-PLG-23). No adventure-specific content (REQ-PLG-24). MEDIUM finding recorded separately.
*Reasoning: Verified section-by-section. Bootstrap is well-structured and dense. The Hope/Fear Economy and Stress System sections are additional to the required 6, which is fine (they provide foundation knowledge). The bootstrap includes stress dealing to adversaries and player-rolls-everything combat, which are concise foundational summaries, not skill-level detail.*

**Does the bootstrap duplicate content that belongs in skills (REQ-PLG-23)?**
MEDIUM: The bootstrap's Hope/Fear Economy section (lines 52-66) and Stress System section (lines 68-89) repeat substantial content that also appears in ap-rules SKILL.md and ap-combat SKILL.md. The hope spending options, fear spending options, stress levels, stress stacking, crisis definition, adversary stress dealing table, and player-rolls-everything summary all appear nearly verbatim in both the bootstrap and skills. REQ-PLG-23 says the bootstrap "MUST NOT duplicate content that belongs in skills." However, the bootstrap also must be complete enough to resolve standard actions without consulting skills (REQ-PLG-12). The tension is real, but the current bootstrap is already 1454 words. Approximately 400 words could be saved by condensing the Hope/Fear and Stress sections to summaries that reference skills for the full tables.
*Reasoning: Compared bootstrap lines 52-89 against ap-rules SKILL.md lines 88-167 and ap-combat SKILL.md lines 52-98. The content is nearly identical: same spending tables, same stress definitions, same adversary stress rules. The bootstrap needs to teach the mechanic (REQ-PLG-12), but the current level of detail crosses into reference territory. The existing Daggerheart bootstrap handles this by summarizing outcomes in 5 bullet points without full spending tables, then leaving detail to skills. The Apocrypha bootstrap is more verbose in these sections than the Daggerheart precedent suggests is necessary.*

**REQ-PLG-25 through REQ-PLG-31: Skill frontmatter and body quality for all 4 skills**
PASS. All four skills have valid frontmatter: name matches directory name (REQ-PLG-25), description starts with "This skill should be used when..." with comprehensive trigger lists (REQ-PLG-26), version "1.0.0" (REQ-PLG-27). Each SKILL.md begins with a 1-2 sentence summary (REQ-PLG-28). ap-combat, ap-players, and ap-adversaries all include "Authoritative Source" lines pointing to ap-rules (REQ-PLG-29). ap-combat and ap-adversaries include dice tool JSON examples (REQ-PLG-30). Skills reference their own references/ files by relative path (REQ-PLG-31).
*Reasoning: Inspected all four SKILL.md files. The description fields are thorough trigger-text quality. ap-rules covers: dice resolution, hope/fear economy, stress, rest/recovery, progression, session structure, GM guidelines. ap-combat covers: resolving attacks, dealing stress, tracking defeat, spending Fear, Fear abilities, encounter management. ap-players covers: character creation, keyword scoping, advancement, splitting, retirement, rest/recovery, templates. ap-adversaries covers: creation, keyword blocks, Fear abilities, thresholds, tiers, stress tracking, templates.*

**REQ-PLG-35 through REQ-PLG-38: Required skills existence and completeness**
PASS. All four required skills exist: ap-rules (REQ-PLG-35) with License.md, ap-combat (REQ-PLG-36) with conditions.md and encounter-template.md, ap-players (REQ-PLG-37) with sheet-template.md, sheet-example.md, and story-template.md, ap-adversaries (REQ-PLG-38) with adversary-template.md and adversary-examples.md.
*Reasoning: Verified against the directory listing. Each required reference file is present. The ap-rules skill has only a quick-reference.md in references/ rather than an SRD directory, which is correct since Apocrypha is original content with no external SRD.*

**REQ-KW-5 through REQ-KW-11: Keyword structure, scoping, splitting, retirement**
PASS. REQ-KW-5 (keyword structure: name, modifier, origin, positive scope, exclusions): Covered in ap-rules lines 62-67, ap-players lines 27-48, sheet-template lines 27-35. REQ-KW-6 (modifier depth +1/+2/+3): ap-rules line 65. REQ-KW-7 (broad vs narrow scoping): ap-rules lines 71-74, ap-players lines 60-82. REQ-KW-8 (+0 when no keyword): bootstrap line 29, ap-rules lines 44-46. REQ-KW-9 (3 keywords per level): ap-rules line 78, ap-players lines 115-121. REQ-KW-10 (keyword splitting): ap-rules lines 80-82, ap-players lines 112-113. REQ-KW-11 (keyword retirement): ap-rules lines 84-86, ap-players lines 124-125.
*Reasoning: Traced each requirement to at least one plugin file. All requirements are covered with appropriate detail. The scoping guidelines in ap-players are particularly thorough with good/bad examples.*

**REQ-KW-12 through REQ-KW-17: Dice resolution, difficulty, outcomes, criticals, stakes**
PASS. REQ-KW-12 (2d12 hope/fear): bootstrap lines 7-8, ap-rules lines 13-14. REQ-KW-13 (difficulty scale 10/14/17/20): bootstrap lines 9-16, ap-rules lines 16-23. REQ-KW-14 (four outcomes): bootstrap lines 20-25, ap-rules lines 28-33. REQ-KW-15 (criticals on doubles, no tokens): bootstrap line 27, ap-rules lines 36-42. REQ-KW-16 (removed/merged into KW-15): N/A. REQ-KW-17 (declare stakes before roll): bootstrap line 18, ap-rules line 24.
*Reasoning: All dice resolution requirements fully covered. The four outcomes match the spec exactly. Critical handling (doubles = critical, no tokens) is correctly implemented.*

**REQ-KW-18 through REQ-KW-21A: Hope/Fear economy, spending, tracking**
PASS. REQ-KW-18 (Hope max 6, spending options): bootstrap lines 54-57, ap-rules lines 92-101. REQ-KW-19 (Fear max 12, spending options): bootstrap lines 59-64, ap-rules lines 103-117. REQ-KW-20 (token economy as fairness mechanism, fiction-first narration): bootstrap line 66 ("Token spending is always narrated in the fiction"), ap-rules lines 119-123. REQ-KW-21 (spend Fear actively, pool > 6 is missed beat): bootstrap line 66, ap-rules line 123, ap-combat lines 93-98. REQ-KW-21A (Fear in adventure.md frontmatter): bootstrap line 66, ap-rules line 110, ap-combat line 105.
*Reasoning: All hope/fear economy requirements are covered. The fiction-first narration principle from REQ-KW-20 is present but could be more prominent in the bootstrap. The spec's example ("The dragon's flames wash over you...") appears in ap-rules line 121, not in the bootstrap. This is acceptable since the bootstrap instructs "Token spending is always narrated in the fiction" and the skill provides the example.*

**REQ-KW-22 through REQ-KW-26A: Stress system, levels, crisis, death, cap**
PASS. REQ-KW-22 (stress targets keywords): bootstrap line 70, ap-rules line 127, conditions.md throughout. REQ-KW-23 (light -1, deep -2): bootstrap lines 72-73, ap-rules lines 131-134, conditions.md lines 8-52. REQ-KW-24 (stress stacks to -3): bootstrap line 75, ap-rules lines 136-138, conditions.md lines 55-65. REQ-KW-25 (crisis = more than half keywords negative): bootstrap line 77, ap-rules lines 142-144, conditions.md lines 79-81. REQ-KW-26 (GM chooses keyword by narrative sense): ap-rules lines 165-166, ap-combat lines 72-75. REQ-KW-25A (death is player choice): bootstrap line 77 ("Death is always a player choice, never a mechanical inevitability"), ap-rules lines 146-148, conditions.md line 87. REQ-KW-26A (stress caps at -3, spread to other keywords): bootstrap line 75, ap-rules lines 139-140, conditions.md lines 69-75.
*Reasoning: All stress system requirements are thoroughly covered across multiple files. The conditions.md reference file is particularly well done with examples showing narrative expression of each stress level.*

**REQ-KW-27 through REQ-KW-31: Adversary stress dealing, player stress dealing**
PASS. REQ-KW-27 (success deals stress: hope=2, fear=1): bootstrap lines 82-83, ap-rules lines 152-154, ap-combat lines 34-40. REQ-KW-28 (defeated at threshold): bootstrap line 85, ap-rules line 156, ap-combat lines 43-45. REQ-KW-29 (stressed keywords lose effectiveness): ap-rules line 158, ap-combat line 41. REQ-KW-29A (aggregate vs per-keyword tracking): ap-combat lines 47-50, ap-adversaries lines 30-33, conditions.md lines 91-103. REQ-KW-30 (player stress channels: fear spending and failure): ap-rules lines 160-164, ap-combat lines 52-68. REQ-KW-31 (adversary Fear abilities deal stress): ap-rules line 116-117, ap-adversaries lines 77-96.
*Reasoning: All adversary and player stress dealing requirements covered. The dual-channel stress (Fear spending vs failure consequences) is clearly explained in both ap-rules and ap-combat.*

**REQ-KW-30A through REQ-KW-30C: Player-rolls-everything combat**
PASS. REQ-KW-30A (player always rolls, no adversary turns, no initiative): bootstrap lines 87-89, ap-combat lines 13-15, 17-23. REQ-KW-30B (adversary acts through failure consequences when player acts on environment): ap-combat lines 24-27. REQ-KW-30C (player rolls reaction when adversary forces it): ap-combat lines 28-31.
*Reasoning: All three combat procedure requirements are covered. The ap-combat skill organizes them clearly into three combat situations with step-by-step procedures.*

**REQ-KW-32 through REQ-KW-36: Adversary creation, tiers, Fear abilities**
PASS. REQ-KW-32 (adversaries defined by keywords): ap-adversaries lines 15-20. REQ-KW-33 (keywords fixed at introduction): ap-adversaries line 54, ap-rules line 227 ("do not invent new capabilities mid-encounter"). REQ-KW-34 (tier thresholds: minor 2-3, standard 4-6, major 8-12): ap-adversaries lines 24-28, adversary-template lines 98-104. REQ-KW-35 (Fear abilities scale with tier): ap-adversaries lines 24-28, 77-96. REQ-KW-36 (write adversary blocks into world.md): ap-adversaries lines 98-100, ap-combat line 106.
*Reasoning: All adversary requirements covered. The tier reference table in ap-adversaries matches the spec exactly. The adversary-examples.md file demonstrates all three tiers correctly.*

**REQ-KW-37 through REQ-KW-41: Progression**
PASS. REQ-KW-37 (level up on narrative milestones, no formula): ap-rules lines 184-188, ap-players lines 99-103. REQ-KW-38 (three-act structure as lens, not formula): ap-rules line 188 implicit, ap-players line 103. REQ-KW-39 (3 new keywords at +1 from story): ap-rules line 193, ap-players lines 108-109. REQ-KW-40 (keyword deepening): ap-rules line 194, ap-players lines 110-111. REQ-KW-41 (splitting during level-up uses a slot): ap-rules line 195, ap-players lines 112-113.
*Reasoning: All progression requirements covered. The emphasis on "no formula" from REQ-KW-37 is clear in both files.*

**REQ-KW-42 through REQ-KW-45: Character creation**
PASS. REQ-KW-42 (creation is conversation, no menu): ap-players lines 13-15, bootstrap lines 123-130. REQ-KW-43 (onboarding flow: who/what/survived/drives/scope/scene): bootstrap lines 125-131, ap-players lines 17-58. REQ-KW-44 (starting budget 4, one +2 two +1): bootstrap line 132, ap-players lines 52-54, ap-rules lines 197-199. REQ-KW-45 (world from keywords): bootstrap line 134, ap-players lines 57-58.
*Reasoning: Character creation is thoroughly covered. The ap-players skill adds good/bad examples for each step that go beyond the spec's requirements.*

**REQ-KW-46 through REQ-KW-48A: Rest, recovery, montage, deep stress resolution**
PASS. REQ-KW-46 (rest clears light stress): bootstrap line 72 (implicit in light stress clearing), ap-rules lines 170-172, ap-players lines 129-131. REQ-KW-47 (deep stress clears through narrative resolution): bootstrap lines 95-96, ap-rules lines 174-176, ap-players lines 133-135. REQ-KW-48 (montage: clears light stress, resets Hope/Fear to 1, not deep stress): bootstrap line 97, ap-rules lines 178-180, ap-players lines 137-139. REQ-KW-48A (deep stress resolution is collaborative judgment, instruct against clearing too easily): ap-rules line 176 ("Clearing deep stress too easily undermines the system's tension. Require a genuine scene, not a passing mention"), bootstrap line 96 ("Deep stress resolution requires a genuine narrative scene, not a passing mention. Clearing deep stress too easily undermines the system's tension").
*Reasoning: All rest and recovery requirements covered, including the anti-over-compliance instruction from REQ-KW-48A.*

**REQ-KW-49 through REQ-KW-52: Session/act structure**
PASS. REQ-KW-49 (3-7 scenes per session): ap-rules lines 203-205. REQ-KW-50 (act spans 2-5 sessions): ap-rules lines 207-209. REQ-KW-51 (act retrospective, summary in history.md): ap-rules lines 211-213. REQ-KW-52 (session recap, player can correct): ap-rules lines 215-217.
*Reasoning: Session and act structure requirements are covered in the ap-rules skill. The story-template.md in ap-players also provides tracking for current act and scene.*

**REQ-KW-53 through REQ-KW-55: GM guidelines**
PASS. REQ-KW-53 (never narrate player actions): bootstrap line 97, ap-rules line 221. REQ-KW-54 (reuse established world elements): bootstrap line 97, ap-rules line 222. REQ-KW-55 (use montage for time passage): bootstrap line 97, ap-rules line 223.
*Reasoning: All three GM guidelines are present in both bootstrap and ap-rules skill. The bootstrap condenses them into the Narrative Philosophy section.*

**REQ-PLG-40: License.md in ap-rules**
PASS. License.md exists at skills/ap-rules/License.md. States Apocrypha is original content, authored by Ronald Roy, licensed under MIT. No external attribution required. Appropriate for an original system with no SRD.
*Reasoning: Inspected the file. It clearly states authorship, license, and that no external material is used. This satisfies REQ-PLG-40.*

**Template conventions: [placeholder] syntax and HTML comments (REQ-PLG-33)**
PASS. All templates use [placeholder] syntax: sheet-template.md uses [Character Name], [Keyword Name], [N], [How acquired], etc. HTML comments explain each section with multi-line block comments. Encounter-template.md, adversary-template.md, and story-template.md all follow the same pattern. Matches daggerheart convention.
*Reasoning: Inspected all template files. Consistent use of bracketed placeholders and HTML comments throughout. The HTML comments are detailed and instructive.*

**Cross-references between skills (pattern from plugin spec)**
PASS. ap-combat references ap-rules ("Authoritative Source: For complete rules, use the ap-rules skill", line 11) and ap-adversaries ("see ap-adversaries skill", line 106). ap-players references ap-rules (line 12). ap-adversaries references both ap-rules (line 12) and ap-combat (line 12). Bootstrap references "ap-* skills" (line 136). The cross-referencing matches the daggerheart pattern.
*Reasoning: Verified cross-references in all four SKILL.md files. Each skill properly directs to the authoritative source and cross-references related skills.*

**Does the adversary-template.md match the spec's Adversary Block Format?**
LOW: Minor format divergence. The keyword-rpg-system.md spec (lines 277-288) defines the adversary block as a flat list under "### Keywords" with inline stress notation: "- [Keyword Name] (+N) [Stress: N, if any]". The adversary-template.md uses the same format. However, the adversary-examples.md (adversary-examples.md lines 40-43, 79-83) uses a table format with columns "Keyword | Base | Stress | Effective" for the fight-state examples, while the initial keyword listing uses the flat format. This is fine since the table format appears only in GM Notes for tracking during combat, not in the adversary block itself.
*Reasoning: Compared the spec's adversary block format against the template and examples. The template matches. The examples use the flat format for the initial block and tables only for mid-combat tracking examples, which is a sensible extension.*

**Does sheet-template.md match the spec's Character Sheet Format section?**
PASS. The sheet-template.md matches the spec's character sheet format (keyword-rpg-system.md lines 227-271). Sections present: Keywords with origin/scope/exclusions, Tokens (Hope), Level with max keywords, Progression Log table, Notes (Appearance, Personality, Goals, Backstory). The template adds HTML comments explaining each section and stress notation, which is a good addition per REQ-PLG-33. The sheet-example.md (Kael Ashenmoor) demonstrates all sections filled in correctly with well-crafted keywords, proper scoping, and exclusions.
*Reasoning: Compared sheet-template.md against the spec's character sheet format line by line. All fields present. The example character demonstrates proper keyword design with good/bad examples of scope and exclusion quality.*

**Does the ap-rules SKILL.md outcome table correctly represent Failure with Hope?**
MEDIUM: The ap-rules SKILL.md outcome table (line 32) states "Player gains Hope" as the token effect for Failure with Hope. But REQ-KW-14 says the character "gains something (information, positioning, or a Hope token)" - meaning a Hope token is one possible benefit, not guaranteed. The bootstrap (line 24) correctly says "the character gains something: information, positioning, or a Hope token." The ap-rules table collapses this into an unconditional Hope gain, which changes the mechanic: the GM can choose to give information instead of a token, creating flexibility the table removes. File: skills/ap-rules/SKILL.md, line 32.
*Reasoning: The spec's Failure with Hope outcome explicitly lists three alternatives: information, positioning, OR a Hope token. The bootstrap correctly preserves the "or." The ap-rules table simplifies this to always granting Hope, which would inflate the Hope economy and reduce the GM's flexibility to give non-token benefits on partial failures. This is a mechanical inaccuracy that could affect gameplay.*
