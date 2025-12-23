---
version: 1.0.0
status: Draft
created: 2025-12-22
last_updated: 2025-12-22
authored_by:
  - Ronald Roy <gsdwig@gmail.com>
---

# Daggerheart System Plugin Specification

## Executive Summary

The daggerheart-system plugin provides Daggerheart RPG mechanics for Adventure Engine adventures, mirroring the structure and approach of the existing d20-system plugin. Daggerheart is a narrative-focused fantasy TTRPG by Darrington Press (Critical Role) that uses Duality Dice (2d12) representing Hope and Fear, creating a dynamic tension between player success and GM opportunity.

This plugin enables a Claude-powered GM to run Daggerheart adventures with proper mechanical support: character creation with constrained Experiences, Hope/Fear token economy, spotlight-based turn flow, adversary management, and authoritative SRD rule lookups. The plugin must also extend the corvran dice roller to support Duality Dice with structured output.

Unlike d20's procedural resolution, Daggerheart relies on keyword interpretation (Experiences, Traits). The LLM integration notes identify this as both an opportunity (LLMs excel at interpretation) and a risk (semantic drift without constraints). This spec addresses that risk with structured Experience definitions.

## User Story

As a GM using Adventure Engine, I want to run Daggerheart adventures with proper mechanical support, so that the system handles Hope/Fear economy, character traits, and combat flow while I focus on narrative.

## Stakeholders

- **Primary**: Adventure Engine GMs running Daggerheart campaigns
- **Secondary**: Plugin maintainers, corvran dice-roller maintainers
- **Tertiary**: Darrington Press (license compliance), d20-system users (shared dice roller), Adventure Engine core maintainers

## Success Criteria

1. GM can create Daggerheart characters with all SRD options (classes, ancestries, communities, domains)
2. Duality Dice rolls produce structured Hope/Fear output via `DdD` notation
3. Hope/Fear token economy is tracked and applied correctly per SRD rules
4. Experiences use bounded constraint format to prevent semantic drift
5. Adversary stat blocks follow SRD format with all required fields
6. SRD content is searchable for authoritative rule lookups

## Functional Requirements

### Dice Roller Extension

- **REQ-F-1**: Extend `roll.sh` to support `DdD` notation (Duality Dice)
- **REQ-F-2**: `DdD` output must include: `hope` (first d12), `fear` (second d12), `higher` ("hope"|"fear"|"critical"), `total` (sum of both dice)
- **REQ-F-3**: `DdD` must support modifiers: `DdD+3` adds modifier to total
- **REQ-F-4**: Critical success occurs when both dice show matching values (any double)

### Plugin Structure

- **REQ-F-5**: Plugin follows claude-plugin format with `.claude-plugin/plugin.json`
- **REQ-F-6**: Plugin includes `/daggerheart-system:init` command to set up adventures
- **REQ-F-7**: Init command copies `System.md` (core rules) to adventure directory
- **REQ-F-8**: Init command merges `dh-CLAUDE.md` (GM guidance) into project CLAUDE.md

### Character Creation (dh-players skill)

- **REQ-F-9**: Support all 9 SRD classes: Bard, Druid, Guardian, Ranger, Rogue, Seraph, Sorcerer, Warrior, Wizard
- **REQ-F-10**: Support all SRD ancestries with ancestry features
- **REQ-F-11**: Support all SRD communities with community features
- **REQ-F-12**: Support 6 character traits: Agility, Strength, Finesse, Instinct, Presence, Knowledge
- **REQ-F-13**: Character sheet template includes: traits, HP, Stress, Evasion, Hope slots, armor/weapon, domain cards
- **REQ-F-14**: Experiences use bounded constraint format (see REQ-F-28-30)
- **REQ-F-15**: Support level advancement (1-10) with proficiency increases

### Combat (dh-combat skill)

- **REQ-F-16**: Track Hope tokens per player (max 6 per PC)
- **REQ-F-17**: Track Fear tokens for GM (max 12)
- **REQ-F-18**: Implement action roll outcomes: Success with Hope, Success with Fear, Failure with Hope, Failure with Fear, Critical Success
- **REQ-F-19**: Support spotlight flow: GM moves trigger on Fear rolls or failures
- **REQ-F-20**: Track damage thresholds (Major/Severe) for HP marking (1/2/3 HP)
- **REQ-F-21**: Track Stress with Vulnerable condition at max
- **REQ-F-22**: Support reaction rolls (no Hope/Fear generation)
- **REQ-F-23**: Support advantage/disadvantage (+/- d6)

### Adversaries (dh-adversaries skill)

- **REQ-F-24**: Adversary stat blocks include: Tier, Type, Difficulty, Thresholds, HP, Stress, Attack Modifier, Standard Attack, Features
- **REQ-F-25**: Support adversary types: Bruiser, Horde, Leader, Minion, Ranged, Skulk, Social, Solo, Standard, Support
- **REQ-F-26**: Provide encounter building formula: `[(3 x PCs) + 2]` Battle Points with adjustments
- **REQ-F-27**: Support Fear Features that cost Fear to activate

### Experiences (LLM Safety)

- **REQ-F-28**: Experience template includes: Name, Modifier, Narrative Origin
- **REQ-F-29**: Experience template includes: Positive Scope (applies when)
- **REQ-F-30**: Experience template includes: Explicit Exclusions (does not apply when)
- **REQ-F-31**: GM guidance instructs treating Experiences as bounded permissions, not general traits
- **REQ-F-32**: GM guidance instructs defaulting to NOT applying an Experience when scope is unclear

### Domains (dh-domains skill)

- **REQ-F-33**: Support all 9 SRD domains: Arcana, Blade, Bone, Codex, Grace, Midnight, Sage, Splendor, Valor
- **REQ-F-34**: Domain cards include: Name, Domain, Level, Recall Cost, Effect
- **REQ-F-35**: Support Spellcast Rolls for domain abilities that require them

### Rules Lookup (dh-rules skill)

- **REQ-F-36**: Provide searchable access to Daggerheart SRD content
- **REQ-F-37**: Reference SRD submodule at `docs/research/daggerheart-srd/`
- **REQ-F-38**: Support grep patterns for efficient rule searching

### Error Handling

- **REQ-F-39**: Dice roller returns JSON error for invalid DdD notation (non-numeric modifiers, malformed expressions)
- **REQ-F-40**: Init command fails with clear error if SRD submodule is missing or empty
- **REQ-F-41**: When Hope tokens reach max (6), additional gains are ignored (no error, no overflow)
- **REQ-F-42**: When Fear tokens reach max (12), additional gains are ignored (no error, no overflow)

## Non-Functional Requirements

- **REQ-NF-1** (Performance): Dice roll output returns in <100ms
- **REQ-NF-2** (Consistency): Duality Dice output format is identical across all invocations
- **REQ-NF-3** (Usability): Skill descriptions clearly indicate when each skill should be invoked
- **REQ-NF-4** (Maintainability): Skills reference SRD content via relative paths, not duplicated content
- **REQ-NF-5** (Licensing): Plugin respects Darrington Press Community Gaming License (DPCGL)
- **REQ-NF-6** (Alignment): Plugin structure mirrors d20-system for maintainer familiarity

## Explicit Constraints (DO NOT)

- Do NOT duplicate SRD content into the plugin; reference via paths
- Do NOT implement damage types beyond SRD (physical, magic)
- Do NOT auto-increment Hope/Fear; GM explicitly manages via narrative
- Do NOT interpret Experiences beyond their stated positive scope
- Do NOT modify d20-system plugin files
- Do NOT break existing roll.sh functionality for d4/d6/d8/d10/d12/d20/d100/dF

## Technical Context

- **Existing Stack**: Claude Code plugin format, bash scripts, markdown skills
- **Integration Points**:
  - `corvran/skills/dice-roller/scripts/roll.sh` (extend for DdD)
  - `docs/research/daggerheart-srd/` (submodule for SRD content)
  - Adventure directory structure (`players/`, `worlds/`)
- **Patterns to Respect**:
  - d20-system plugin structure
  - SKILL.md frontmatter format
  - Corvran character file conventions (sheet.md, state.md)

## Acceptance Tests

1. **Duality Dice Basic**: `roll.sh "DdD"` returns valid JSON with hope, fear, higher, total fields
2. **Duality Dice Modifier**: `roll.sh "DdD+3"` returns total = hope + fear + 3
3. **Duality Dice Critical**: When hope == fear, higher field returns "critical"
4. **Existing Dice Unchanged**: `roll.sh "1d20+5"` returns same format as before
5. **Character Creation**: Create a Level 1 Guardian with all required fields populated
6. **Experience Constraints**: Experience template includes positive scope and explicit exclusions
7. **Combat Roll Resolution**: Action roll correctly categorizes Success/Failure with Hope/Fear
8. **Adversary Stat Block**: Create Tier 1 adversary with all required fields
9. **SRD Search**: Search for "Critical Success" returns relevant SRD content
10. **Init Command**: `/daggerheart-system:init` copies System.md and merges GM guidance
11. **Dice Error Handling**: `roll.sh "DdD+abc"` returns JSON with error field
12. **Token Max Handling**: Attempting to add Hope when at 6 does not overflow or error

## Resolved Questions

1. **Massive Damage rule**: Deferred to Out of Scope. Optional rules can be added in a future version; core SRD mechanics are the priority.

2. **Multiclassing**: Include in dh-players skill. The SRD multiclassing rules are straightforward and should be supported in REQ-F-15 (level advancement).

3. **Domain card format**: Markdown only. The SRD submodule contains markdown files; PDF/image references add complexity without significant benefit for LLM-based gameplay.

## Out of Scope

- Custom homebrew domains or classes beyond SRD
- Digital character sheet UI (this is CLI/markdown only)
- Integration with external VTT platforms
- Automated encounter balancing beyond the formula
- Campaign frame content (Witherwild etc.) - can be added as separate plugin
- Optional rules (Massive Damage, etc.) - core SRD mechanics only for v1.0

---

**Next Phase**: Once approved, use `/spiral-grove:plan-generation` to create technical implementation plan.
