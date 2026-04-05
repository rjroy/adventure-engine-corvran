---
title: "Commission: Review apocrypha-system plugin"
date: 2026-04-04
status: completed
type: one-shot
tags: [commission]
worker: Thorne
workerDisplayTitle: "Guild Warden"
prompt: "Review the `plugins/apocrypha-system/` directory built by Dalton.\n\n## Review Against Two Specs\n\n1. **Plugin structure**: `.lore/specs/rpg-system-plugin-spec.md` — verify every REQ-PLG requirement is satisfied. Check directory layout, both manifests, bootstrap sections, skill format, naming conventions, reference files, License.md.\n2. **Game system substance**: `.lore/specs/keyword-rpg-system.md` — verify every REQ-KW requirement is represented in the plugin content. The bootstrap and skills together must cover the complete Apocrypha system. No requirement should be missing or misrepresented.\n\n## Review Focus\n\n- **Bootstrap completeness**: All six sections present? Under 3000 words? Dice examples use correct `mcp__corvran__roll_dice` JSON format with labeled groups? Fear tracking in adventure.md frontmatter mentioned? GM instructed to spend Fear actively?\n- **Keyword scoping**: Does the players skill teach proper keyword scoping with positive scope AND explicit exclusions (REQ-KW-5)?\n- **Combat model**: Player-rolls-everything (REQ-KW-30A/B/C)? No initiative? Adversary stress dealing on success (REQ-KW-27)?\n- **Stress system accuracy**: Light vs deep stress, -3 cap, crisis definition, death-is-player-choice (REQ-KW-25A), stress spread on maxed keywords (REQ-KW-26A)?\n- **Hope/Fear economy**: Correct token caps (6/12), correct spending options, criticals generate no tokens (REQ-KW-15)?\n- **Adversary tiers**: Minor/standard/major with correct stress thresholds and Fear ability scaling (REQ-KW-34-35)? Per-keyword vs aggregate tracking (REQ-KW-29A)?\n- **Skill cross-references**: Do skills reference each other appropriately? Does the combat skill point to ap-rules for authoritative wording?\n- **No content duplication**: Bootstrap provides foundation, skills provide depth. Nothing restated between them.\n- **Consistency with existing plugins**: Compare conventions against `plugins/daggerheart-system/` for SKILL.md description quality, reference file format, placeholder syntax.\n\nSurface all findings. Do not triage or defer."
dependencies:
  - commission-Dalton-20260404-073113
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
activity_timeline:
  - timestamp: 2026-04-04T14:33:37.047Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T14:33:37.048Z
    event: status_blocked
    reason: "Dependencies not satisfied"
    from: "pending"
    to: "blocked"
  - timestamp: 2026-04-04T14:50:55.200Z
    event: status_pending
    reason: "Dependencies satisfied"
    from: "blocked"
    to: "pending"
  - timestamp: 2026-04-04T14:50:55.204Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T14:50:55.235Z
    event: status_in_progress
    reason: "Execution started"
    from: "dispatched"
    to: "in_progress"
  - timestamp: 2026-04-04T14:51:03.486Z
    event: progress_report
    reason: "Starting review. Reading specs, Dalton's commission artifact, and plugin directory structure."
  - timestamp: 2026-04-04T14:51:40.697Z
    event: progress_report
    reason: "All SKILL.md files and most references read. Now reading remaining reference files (sheet-template, sheet-example, story-template, adversary-template, adversary-examples). Then cross-checking against both specs."
  - timestamp: 2026-04-04T14:52:10.007Z
    event: progress_report
    reason: "All files read. Now systematically cross-checking against REQ-PLG and REQ-KW requirements. Recording findings as I go."
  - timestamp: 2026-04-04T14:56:22.754Z
    event: progress_report
    reason: "5 findings recorded. Finishing REQ coverage verification and preparing final submission."
  - timestamp: 2026-04-04T14:57:27.364Z
    event: result_submitted
    reason: "# Review: plugins/apocrypha-system/\n\n## Verdict\n\nThe plugin is well-built. All REQ-PLG structural requirements are satisfied. All REQ-KW mechanical requirements are represented in the bootstrap and skills. Dalton's self-review findings (F1: Failure with Hope token accuracy, F2: bootstrap duplication) were addressed before delivery. One new MEDIUM defect and four LOW observations.\n\n---\n\n## Findings\n\n### F1: MEDIUM — ap-combat encounter flow contradicts player-rolls-everything\n\n**File**: `plugins/apocrypha-system/skills/ap-combat/SKILL.md`, line 113\n\n**What's wrong**: Encounter flow step 3 reads: \"Player rolls (or GM rolls for environment/trap effects that the player reacts to).\" The parenthetical introduces a GM-rolling exception that does not exist in the spec.\n\n**Evidence**: REQ-KW-30A says \"The player always rolls.\" REQ-KW-30C says \"When an adversary surprises the player or forces a reaction, the player still rolls.\" Bootstrap line 81 correctly says \"When an adversary surprises the player, the player still rolls their reaction.\" The ap-combat flow contradicts all three.\n\n**Impact**: An AI reading this during an encounter may roll dice for traps itself rather than narrating the threat and having the player roll their reaction. This violates a core principle of the system.\n\n**Fix**: Change to \"Player rolls (if the trigger is a trap or environment effect, the player rolls their reaction to it).\"\n\n---\n\n### F2: LOW — Adversary tier-to-difficulty mapping is an invention\n\n**File**: `plugins/apocrypha-system/skills/ap-adversaries/SKILL.md`, lines 24-28 and 69-75\n\n**What's wrong**: The tier table includes a \"Difficulty\" column (Minor 10-14, Standard 14-17, Major 17-20), and Step 5 says \"Choose based on the adversary's tier and the desired challenge level.\" The spec does not tie difficulty to tier. REQ-KW-13 defines difficulty as a general GM tool; REQ-KW-34 defines tiers by keyword count and stress threshold only.\n\n**Impact**: The AI may mechanically derive difficulty from tier rather than from the fiction. An easy action against a standard adversary could warrant difficulty 10, but the table implies 14-17.\n\n**Fix**: Reframe as guidance, not prescription: \"Typical difficulty range for this tier. Adjust based on the fiction and the specific action.\"\n\n---\n\n### F3: LOW — Bootstrap section structure deviates from recommended 6-section layout\n\n**File**: `plugins/apocrypha-system/bootstrap.md`\n\n**What's wrong**: The bootstrap has 8 top-level sections instead of the spec's recommended 6. Hope/Fear Economy and Stress System are broken out as separate `##` headings rather than being part of Core Mechanic. Additionally, \"Player-Rolls-Everything Combat\" is a subsection of \"Stress System\" in the heading hierarchy, which is structurally odd since combat procedure isn't a stress topic.\n\n**Evidence**: The spec says \"New plugins SHOULD maintain this structure.\" Daggerheart's bootstrap matches the 6-section layout exactly.\n\n**Impact**: Low. The content is correct, the word count is under budget (~1300 words), and the deviation is defensible since hope/fear and stress ARE the core mechanic for Apocrypha. The combat-under-stress nesting is the only structurally misleading part.\n\n**Fix**: Either fold Hope/Fear and Stress into Core Mechanic as subsections, or leave as-is and move \"Player-Rolls-Everything Combat\" out of the Stress System section into its own `##` heading. The latter preserves the current density while fixing the odd nesting.\n\n---\n\n### F4: LOW — Encounter template comment uses \"Round\" terminology\n\n**File**: `plugins/apocrypha-system/skills/ap-combat/references/encounter-template.md`, lines 35-36\n\n**What's wrong**: HTML comment examples in the Fear spending log use \"Round 2\", \"Round 3\" as action labels. Apocrypha has no round structure. The actual combat log section correctly uses \"Action 1\", \"Action 2.\"\n\n**Impact**: Low. Comments guide AI behavior when it reads the template. \"Round\" is D&D-adjacent terminology the system's vocabulary intentionally avoids.\n\n**Fix**: Change \"Round 2\" and \"Round 3\" in the comment to \"Action 2\" and \"Action 3\" to match the combat log convention.\n\n---\n\n### F5: LOW — Missing rationale for why keyword exclusions matter\n\n**File**: `plugins/apocrypha-system/skills/ap-players/SKILL.md`, scoping guidelines section\n\n**What's wrong**: The plugin correctly specifies that keywords need positive scope and exclusions, but never explains the design rationale. REQ-KW-5 says exclusions are \"the bounded constraint format from the Daggerheart Experience research\" that \"prevent authority drift more effectively than inclusions alone.\"\n\n**Impact**: An AI that understands WHY exclusions exist will enforce scoping more consistently than one that just knows the format. The ap-players skill says \"Keywords are bounded permissions, not general traits\" (line 82), which gestures at the concept without naming the failure mode.\n\n**Fix**: Add one sentence to the scoping principle: \"Exclusions prevent the keyword's applicability from gradually expanding beyond its intended scope.\"\n\n---\n\n## REQ-PLG Requirements (all 41 checked)\n\nAll pass. Summary of key verifications:\n\n- **Directory layout**: Matches spec. All required files present.\n- **corvran-plugin.json**: All fields valid. `name` matches directory, `type` is \"system\", `alias` is \"apocrypha\", `description` present, `bootstrap` points to bootstrap.md.\n- **.claude-plugin/plugin.json**: `name` matches engine manifest, semver version, detailed description, MIT license (appropriate for original content).\n- **Bootstrap**: All six conceptual sections present (eight headings). Under 3000 words. Three correct dice tool examples. Fear tracking in adventure.md frontmatter mentioned. GM instructed to spend Fear actively.\n- **Required skills**: ap-rules (with License.md), ap-combat (with conditions.md, encounter-template.md), ap-players (with sheet-template.md, sheet-example.md, story-template.md), ap-adversaries (with adversary-template.md, adversary-examples.md covering all three tiers).\n- **SKILL.md format**: All four have valid frontmatter (name matches directory, description uses \"This skill should be used when...\" trigger format, version present). All have opening summaries. Cross-references are clean.\n- **Reference conventions**: Templates use [placeholder] syntax with HTML comments. Relative paths used throughout.\n- **Naming**: Consistent `ap-` prefix across all skill directories and frontmatter names.\n\n## REQ-KW Requirements (all 55 checked)\n\nAll pass. Highlights by domain:\n\n- **Core Philosophy (1-4)**: Keywords-only, no canonical content, LLM interprets situationally. ✓\n- **Keywords (5-11)**: Structure with positive scope and exclusions, modifier depth (+1/+2/+3), keyword count (3/level), splitting, retirement. ✓\n- **Dice Resolution (12-17)**: 2d12, difficulty 10/14/17/20, four outcomes correct (including the fixed Failure with Hope), criticals on doubles with no tokens, stakes declared before roll. ✓\n- **Hope/Fear (18-21A)**: Caps correct (6/12), all spending options correct, Fear in adventure.md frontmatter, active spending instruction. ✓\n- **Stress (22-26A)**: Light/deep correctly specified, stacking to -3 cap, crisis definition, death as player choice, stress spreading on maxed keywords. ✓\n- **Adversary Stress (27-29A)**: Correct stress dealing (2 on Hope success, 1 on Fear success), per-keyword for standard/major, aggregate for minor. ✓\n- **Player Stress (30-31)**: Two channels (Fear spending and failure consequences). ✓\n- **Combat (30A-30C)**: Player-rolls-everything in bootstrap and ap-combat (contradicted only by F1's parenthetical). ✓\n- **Adversaries (32-36)**: Keywords fixed at introduction, tiers with correct thresholds, Fear abilities scaling correctly, recorded in world.md. ✓\n- **Progression (37-41)**: Narrative milestones, no formula, 3 new keywords, deepening, splitting uses a slot. ✓\n- **Character Creation (42-45)**: Conversational flow, 6 steps, budget of 4 (one +2, two +1), world from keywords. ✓\n- **Rest/Recovery (46-48A)**: Light clears with rest, deep requires narrative scene, montage resets Hope/Fear to 1, anti-over-compliance instruction present. ✓\n- **Session/Act (49-52)**: 3-7 scenes, 2-5 session acts, retrospective to history.md, session recap. ✓\n- **GM Guidelines (53-55)**: Never narrate player actions, reuse world elements, use montage. ✓\n\n## Quality Observations (no action required)\n\n- The adversary examples (adversary-examples.md) are excellent. Three tiers with rich narrative, keyword degradation narration, mid-fight state tables, and GM strategy notes for the major adversary. This is the kind of reference material that actually teaches an AI how to run a fight.\n- The character sheet example (Kael Ashenmoor) demonstrates proper keyword design with well-crafted scoping and exclusions. The backstory connects all three keywords narratively.\n- The conditions reference (conditions.md) provides narrative expression examples for each stress level, going beyond mechanical definitions. The combined stress section is a useful addition.\n- Cross-references between skills are consistent: ap-combat and ap-players both point to ap-rules as authoritative source, ap-adversaries points to both ap-rules and ap-combat.\n- Template conventions (HTML comments, [placeholder] syntax) match the existing daggerheart-system plugin exactly."
  - timestamp: 2026-04-04T14:57:38.777Z
    event: status_completed
    reason: "Execution completed"
    from: "in_progress"
    to: "completed"
current_progress: "5 findings recorded. Finishing REQ coverage verification and preparing final submission."
projectName: corvran
---
# Review: plugins/apocrypha-system/

## Verdict

The plugin is well-built. All REQ-PLG structural requirements are satisfied. All REQ-KW mechanical requirements are represented in the bootstrap and skills. Dalton's self-review findings (F1: Failure with Hope token accuracy, F2: bootstrap duplication) were addressed before delivery. One new MEDIUM defect and four LOW observations.

---

## Findings

### F1: MEDIUM — ap-combat encounter flow contradicts player-rolls-everything

**File**: `plugins/apocrypha-system/skills/ap-combat/SKILL.md`, line 113

**What's wrong**: Encounter flow step 3 reads: "Player rolls (or GM rolls for environment/trap effects that the player reacts to)." The parenthetical introduces a GM-rolling exception that does not exist in the spec.

**Evidence**: REQ-KW-30A says "The player always rolls." REQ-KW-30C says "When an adversary surprises the player or forces a reaction, the player still rolls." Bootstrap line 81 correctly says "When an adversary surprises the player, the player still rolls their reaction." The ap-combat flow contradicts all three.

**Impact**: An AI reading this during an encounter may roll dice for traps itself rather than narrating the threat and having the player roll their reaction. This violates a core principle of the system.

**Fix**: Change to "Player rolls (if the trigger is a trap or environment effect, the player rolls their reaction to it)."

---

### F2: LOW — Adversary tier-to-difficulty mapping is an invention

**File**: `plugins/apocrypha-system/skills/ap-adversaries/SKILL.md`, lines 24-28 and 69-75

**What's wrong**: The tier table includes a "Difficulty" column (Minor 10-14, Standard 14-17, Major 17-20), and Step 5 says "Choose based on the adversary's tier and the desired challenge level." The spec does not tie difficulty to tier. REQ-KW-13 defines difficulty as a general GM tool; REQ-KW-34 defines tiers by keyword count and stress threshold only.

**Impact**: The AI may mechanically derive difficulty from tier rather than from the fiction. An easy action against a standard adversary could warrant difficulty 10, but the table implies 14-17.

**Fix**: Reframe as guidance, not prescription: "Typical difficulty range for this tier. Adjust based on the fiction and the specific action."

---

### F3: LOW — Bootstrap section structure deviates from recommended 6-section layout

**File**: `plugins/apocrypha-system/bootstrap.md`

**What's wrong**: The bootstrap has 8 top-level sections instead of the spec's recommended 6. Hope/Fear Economy and Stress System are broken out as separate `##` headings rather than being part of Core Mechanic. Additionally, "Player-Rolls-Everything Combat" is a subsection of "Stress System" in the heading hierarchy, which is structurally odd since combat procedure isn't a stress topic.

**Evidence**: The spec says "New plugins SHOULD maintain this structure." Daggerheart's bootstrap matches the 6-section layout exactly.

**Impact**: Low. The content is correct, the word count is under budget (~1300 words), and the deviation is defensible since hope/fear and stress ARE the core mechanic for Apocrypha. The combat-under-stress nesting is the only structurally misleading part.

**Fix**: Either fold Hope/Fear and Stress into Core Mechanic as subsections, or leave as-is and move "Player-Rolls-Everything Combat" out of the Stress System section into its own `##` heading. The latter preserves the current density while fixing the odd nesting.

---

### F4: LOW — Encounter template comment uses "Round" terminology

**File**: `plugins/apocrypha-system/skills/ap-combat/references/encounter-template.md`, lines 35-36

**What's wrong**: HTML comment examples in the Fear spending log use "Round 2", "Round 3" as action labels. Apocrypha has no round structure. The actual combat log section correctly uses "Action 1", "Action 2."

**Impact**: Low. Comments guide AI behavior when it reads the template. "Round" is D&D-adjacent terminology the system's vocabulary intentionally avoids.

**Fix**: Change "Round 2" and "Round 3" in the comment to "Action 2" and "Action 3" to match the combat log convention.

---

### F5: LOW — Missing rationale for why keyword exclusions matter

**File**: `plugins/apocrypha-system/skills/ap-players/SKILL.md`, scoping guidelines section

**What's wrong**: The plugin correctly specifies that keywords need positive scope and exclusions, but never explains the design rationale. REQ-KW-5 says exclusions are "the bounded constraint format from the Daggerheart Experience research" that "prevent authority drift more effectively than inclusions alone."

**Impact**: An AI that understands WHY exclusions exist will enforce scoping more consistently than one that just knows the format. The ap-players skill says "Keywords are bounded permissions, not general traits" (line 82), which gestures at the concept without naming the failure mode.

**Fix**: Add one sentence to the scoping principle: "Exclusions prevent the keyword's applicability from gradually expanding beyond its intended scope."

---

## REQ-PLG Requirements (all 41 checked)

All pass. Summary of key verifications:

- **Directory layout**: Matches spec. All required files present.
- **corvran-plugin.json**: All fields valid. `name` matches directory, `type` is "system", `alias` is "apocrypha", `description` present, `bootstrap` points to bootstrap.md.
- **.claude-plugin/plugin.json**: `name` matches engine manifest, semver version, detailed description, MIT license (appropriate for original content).
- **Bootstrap**: All six conceptual sections present (eight headings). Under 3000 words. Three correct dice tool examples. Fear tracking in adventure.md frontmatter mentioned. GM instructed to spend Fear actively.
- **Required skills**: ap-rules (with License.md), ap-combat (with conditions.md, encounter-template.md), ap-players (with sheet-template.md, sheet-example.md, story-template.md), ap-adversaries (with adversary-template.md, adversary-examples.md covering all three tiers).
- **SKILL.md format**: All four have valid frontmatter (name matches directory, description uses "This skill should be used when..." trigger format, version present). All have opening summaries. Cross-references are clean.
- **Reference conventions**: Templates use [placeholder] syntax with HTML comments. Relative paths used throughout.
- **Naming**: Consistent `ap-` prefix across all skill directories and frontmatter names.

## REQ-KW Requirements (all 55 checked)

All pass. Highlights by domain:

- **Core Philosophy (1-4)**: Keywords-only, no canonical content, LLM interprets situationally. ✓
- **Keywords (5-11)**: Structure with positive scope and exclusions, modifier depth (+1/+2/+3), keyword count (3/level), splitting, retirement. ✓
- **Dice Resolution (12-17)**: 2d12, difficulty 10/14/17/20, four outcomes correct (including the fixed Failure with Hope), criticals on doubles with no tokens, stakes declared before roll. ✓
- **Hope/Fear (18-21A)**: Caps correct (6/12), all spending options correct, Fear in adventure.md frontmatter, active spending instruction. ✓
- **Stress (22-26A)**: Light/deep correctly specified, stacking to -3 cap, crisis definition, death as player choice, stress spreading on maxed keywords. ✓
- **Adversary Stress (27-29A)**: Correct stress dealing (2 on Hope success, 1 on Fear success), per-keyword for standard/major, aggregate for minor. ✓
- **Player Stress (30-31)**: Two channels (Fear spending and failure consequences). ✓
- **Combat (30A-30C)**: Player-rolls-everything in bootstrap and ap-combat (contradicted only by F1's parenthetical). ✓
- **Adversaries (32-36)**: Keywords fixed at introduction, tiers with correct thresholds, Fear abilities scaling correctly, recorded in world.md. ✓
- **Progression (37-41)**: Narrative milestones, no formula, 3 new keywords, deepening, splitting uses a slot. ✓
- **Character Creation (42-45)**: Conversational flow, 6 steps, budget of 4 (one +2, two +1), world from keywords. ✓
- **Rest/Recovery (46-48A)**: Light clears with rest, deep requires narrative scene, montage resets Hope/Fear to 1, anti-over-compliance instruction present. ✓
- **Session/Act (49-52)**: 3-7 scenes, 2-5 session acts, retrospective to history.md, session recap. ✓
- **GM Guidelines (53-55)**: Never narrate player actions, reuse world elements, use montage. ✓

## Quality Observations (no action required)

- The adversary examples (adversary-examples.md) are excellent. Three tiers with rich narrative, keyword degradation narration, mid-fight state tables, and GM strategy notes for the major adversary. This is the kind of reference material that actually teaches an AI how to run a fight.
- The character sheet example (Kael Ashenmoor) demonstrates proper keyword design with well-crafted scoping and exclusions. The backstory connects all three keywords narratively.
- The conditions reference (conditions.md) provides narrative expression examples for each stress level, going beyond mechanical definitions. The combined stress section is a useful addition.
- Cross-references between skills are consistent: ap-combat and ap-players both point to ap-rules as authoritative source, ap-adversaries points to both ap-rules and ap-combat.
- Template conventions (HTML comments, [placeholder] syntax) match the existing daggerheart-system plugin exactly.

## Decisions

**F1: Does ap-combat's encounter flow correctly implement player-rolls-everything (REQ-KW-30A/B/C)?**
MEDIUM defect. ap-combat SKILL.md line 113 says "Player rolls (or GM rolls for environment/trap effects that the player reacts to)." The parenthetical suggests the GM rolls dice for traps, directly contradicting the player-rolls-everything principle.
*Reasoning: REQ-KW-30A: "The player always rolls." REQ-KW-30C: "When an adversary surprises the player or forces a reaction, the player still rolls." Bootstrap line 81 correctly says "When an adversary surprises the player, the player still rolls their reaction." The ap-combat encounter flow step 3 introduces a GM-rolling exception that does not exist in the spec. An AI reading this during an encounter might roll for traps itself rather than having the player roll their reaction, violating a core principle.*

**F2: Does the ap-adversaries tier table's "Difficulty" column have spec support?**
LOW concern. The ap-adversaries tier table (lines 24-28) and Step 5 (lines 69-75) map difficulty ranges to adversary tiers: Minor 10-14, Standard 14-17, Major 17-20. This mapping is not in the spec. REQ-KW-13 defines difficulty as a general GM tool; REQ-KW-34 defines tiers by keyword count and stress threshold only.
*Reasoning: The mapping is a reasonable heuristic for an AI GM and probably improves gameplay. But it reads as prescriptive: "Set difficulty based on the adversary's tier and the desired challenge level." This could cause the AI to mechanically derive difficulty from tier rather than the fiction. A minor adversary performing a trivially easy action could warrant difficulty 10 even though its tier maps to 10-14. The fix is framing: "Starting point" or "typical range" rather than the current prescriptive tone. Step 5 of the creation procedure says "Choose based on the adversary's tier" which is especially rigid.*

**F3: Does the bootstrap's section structure match the spec's recommended 6-section layout?**
LOW observation. The bootstrap has 8 top-level sections (Identity, Core Mechanic, Dice Convention, Hope/Fear Economy, Stress System, Narrative Philosophy, Key Vocabulary, Onboarding) instead of the spec's recommended 6 (Identity, Core Mechanic, Dice Convention, Narrative Philosophy, Key Vocabulary, Onboarding).
*Reasoning: REQ-PLG structure says "New plugins SHOULD maintain this structure" (SHOULD, not MUST). The Daggerheart bootstrap matches the 6-section pattern. Apocrypha breaks out Hope/Fear Economy and Stress System (including combat) as separate top-level sections because those ARE the core mechanic. The content is correct and under word budget (~1300 words vs 3000 max). The deviation is defensible but breaks convention. Additionally, "Player-Rolls-Everything Combat" is structurally a subsection of "Stress System" in the heading hierarchy, which is structurally odd since combat procedure isn't a stress topic.*

**F4: Does the encounter-template.md avoid non-Apocrypha terminology?**
LOW observation. The Fear spending log HTML comment examples use "Round 2", "Round 3" as action labels (encounter-template.md lines 35-36). Apocrypha has no round structure. The term "round" is D&D-adjacent terminology the system explicitly avoids.
*Reasoning: The actual template structure uses "Action 1", "Action 2" in the combat log section (lines 89-96), which is correct. The "Round N" language appears only in HTML comment examples. But comments guide AI behavior when the AI reads the template. Using "Action 2" or "Beat 2" in the comment examples would be consistent with the system's vocabulary. REQ-PLG-17/18 establish that the system's specific vocabulary should be used exclusively/naturally.*

**F5: Does the plugin explain WHY keyword exclusions matter (authority drift prevention)?**
LOW observation. Neither the bootstrap nor the ap-players skill explains that exclusions "prevent authority drift more effectively than inclusions alone" (REQ-KW-5's rationale). The mechanics are correctly specified but the design rationale is absent.
*Reasoning: REQ-KW-5 says exclusions are "the bounded constraint format from the Daggerheart Experience research." The spec research (.lore/research/llm-integration-notes-daggerheart.md) identifies authority drift as the primary keyword failure mode. An AI GM that understands WHY exclusions exist will enforce them more consistently than one that just knows the mechanics. The ap-players skill's scoping principle (line 80-82) says "Keywords are bounded permissions, not general traits" which gestures at the concept but doesn't name the failure mode. The fix is one sentence in the scoping section: "Exclusions prevent the AI from gradually expanding a keyword's applicability beyond its intended scope."*
