# Daggerheart System Manual Validation Checklist

This document provides comprehensive validation checklists for the daggerheart-system plugin. Each section maps to acceptance tests from the spec and provides step-by-step validation instructions.

---

## Acceptance Test Mapping

| Test ID | Spec Acceptance Test | Validation Section |
|---------|---------------------|-------------------|
| AT-1 | Duality Dice Basic | [Dice Roller: Duality Dice](#dice-roller-duality-dice) |
| AT-2 | Duality Dice Modifier | [Dice Roller: Duality Dice](#dice-roller-duality-dice) |
| AT-3 | Duality Dice Critical | [Dice Roller: Duality Dice](#dice-roller-duality-dice) |
| AT-4 | Existing Dice Unchanged | [Dice Roller: Standard Dice](#dice-roller-standard-dice) |
| AT-5 | Character Creation | [Character Creation Checklist](#character-creation-checklist) |
| AT-6 | Experience Constraints | [Experience Template Validation](#experience-template-validation) |
| AT-7 | Combat Roll Resolution | [Combat Resolution Checklist](#combat-resolution-checklist) |
| AT-8 | Adversary Stat Block | [Adversary Creation Checklist](#adversary-creation-checklist) |
| AT-9 | SRD Search | [SRD Search Validation](#srd-search-validation) |
| AT-10 | Init Command | [Init Command Validation](#init-command-validation) |
| AT-11 | Dice Error Handling | [Dice Roller: Error Handling](#dice-roller-error-handling) |
| AT-12 | Token Max Handling | [Token Economy Validation](#token-economy-validation) |

---

## Dice Roller: Duality Dice

### AT-1: Basic Duality Dice Roll

**Command**:
```bash
bash corvran/skills/dice-roller/scripts/roll.sh "DdD"
```

**Validation Steps**:
- [ ] Output is valid JSON
- [ ] Contains `hope` field (integer 1-12)
- [ ] Contains `fear` field (integer 1-12)
- [ ] Contains `higher` field (value: "hope", "fear", or "critical")
- [ ] Contains `total` field (equals hope + fear)
- [ ] Contains `rolls` array with two values
- [ ] `higher` is "hope" when hope > fear
- [ ] `higher` is "fear" when fear > hope
- [ ] `higher` is "critical" when hope == fear

**Example Expected Output**:
```json
{
  "expression": "DdD",
  "rolls": [7, 4],
  "modifier": 0,
  "total": 11,
  "hope": 7,
  "fear": 4,
  "higher": "hope"
}
```

### AT-2: Duality Dice with Modifier

**Command**:
```bash
bash corvran/skills/dice-roller/scripts/roll.sh "DdD+3"
```

**Validation Steps**:
- [ ] Output is valid JSON
- [ ] `modifier` field equals 3
- [ ] `total` equals hope + fear + 3
- [ ] All other DdD fields present and valid

**Additional modifier tests**:
- [ ] `DdD+1` adds 1 to total
- [ ] `DdD+5` adds 5 to total
- [ ] `DdD-2` subtracts 2 from total (if supported)
- [ ] `DdD+0` works with zero modifier

### AT-3: Duality Dice Critical Detection

**Verification Method**: Run multiple DdD rolls until a critical occurs (both dice match)

**Validation Steps**:
- [ ] When hope == fear, `higher` returns "critical"
- [ ] Critical can occur on any matching value (1-1 through 12-12)
- [ ] Total still calculates correctly on critical (hope + fear + modifier)

**Example Critical Output**:
```json
{
  "expression": "DdD",
  "rolls": [5, 5],
  "modifier": 0,
  "total": 10,
  "hope": 5,
  "fear": 5,
  "higher": "critical"
}
```

---

## Dice Roller: Standard Dice

### AT-4: Existing Dice Unchanged

**Commands to test**:
```bash
bash corvran/skills/dice-roller/scripts/roll.sh "1d20+5"
bash corvran/skills/dice-roller/scripts/roll.sh "2d6"
bash corvran/skills/dice-roller/scripts/roll.sh "1d8+3"
```

**Validation Steps**:
- [ ] `1d20+5` returns valid JSON with total between 6-25
- [ ] `2d6` returns valid JSON with total between 2-12
- [ ] `1d8+3` returns valid JSON with total between 4-11
- [ ] Standard dice do NOT contain `hope`, `fear`, or `higher` fields
- [ ] All existing dice notations continue to work: d4, d6, d8, d10, d12, d20, d100, dF

---

## Dice Roller: Error Handling

### AT-11: Dice Error Handling

**Commands to test**:
```bash
bash corvran/skills/dice-roller/scripts/roll.sh "DdD+abc"
bash corvran/skills/dice-roller/scripts/roll.sh "DdDx"
bash corvran/skills/dice-roller/scripts/roll.sh "DdD+"
```

**Validation Steps**:
- [ ] Invalid modifier returns JSON with `error` field
- [ ] Error message is descriptive (indicates what went wrong)
- [ ] No crash or stack trace exposed
- [ ] Valid expressions continue to work after error

---

## Character Creation Checklist

### AT-5: Character Creation (All 9 Classes)

For each class, validate that a Level 1 character can be created with all required fields.

#### Class: Bard

- [ ] Character Identity section complete (Name, Class=Bard, Level=1, Ancestry, Community)
- [ ] All 6 Traits have modifiers (Agility, Strength, Finesse, Instinct, Presence, Knowledge)
- [ ] Primary traits match class (Presence, Knowledge)
- [ ] Combat Stats complete (Evasion, HP Slots=6, Stress Slots=6, Armor Score, Thresholds)
- [ ] Hope section present (max 6)
- [ ] At least 1 Experience with bounded constraint format
- [ ] Domain Cards from accessible domains (Grace, Codex)
- [ ] Equipment section (weapon, armor, gear)
- [ ] Class Features section with Level 1 features
- [ ] Ancestry Features (2 features)
- [ ] Community Feature (1 feature)

#### Class: Druid

- [ ] Class=Druid in identity
- [ ] Primary traits: Instinct, Agility
- [ ] Domain access: Sage, Arcana
- [ ] All standard sections complete

#### Class: Guardian

- [ ] Class=Guardian in identity
- [ ] Primary traits: Strength, Agility
- [ ] Domain access: Valor, Blade
- [ ] All standard sections complete

#### Class: Ranger

- [ ] Class=Ranger in identity
- [ ] Primary traits: Instinct, Finesse
- [ ] Domain access: Bone, Sage
- [ ] All standard sections complete

#### Class: Rogue

- [ ] Class=Rogue in identity
- [ ] Primary traits: Finesse, Agility
- [ ] Domain access: Midnight, Grace
- [ ] All standard sections complete

#### Class: Seraph

- [ ] Class=Seraph in identity
- [ ] Primary traits: Presence, Strength
- [ ] Domain access: Splendor, Valor
- [ ] All standard sections complete

#### Class: Sorcerer

- [ ] Class=Sorcerer in identity
- [ ] Primary traits: Presence, Instinct
- [ ] Domain access: Arcana, Midnight
- [ ] All standard sections complete

#### Class: Warrior

- [ ] Class=Warrior in identity
- [ ] Primary traits: Strength, Finesse
- [ ] Domain access: Blade, Bone
- [ ] All standard sections complete

#### Class: Wizard

- [ ] Class=Wizard in identity
- [ ] Primary traits: Knowledge, Presence
- [ ] Domain access: Codex, Splendor
- [ ] All standard sections complete

### Ancestry Validation

Verify character creation supports all SRD ancestries:

- [ ] Clank (Constructed beings)
- [ ] Daemon (Fiendish heritage)
- [ ] Drakona (Draconic lineage)
- [ ] Dwarf (Mountain folk)
- [ ] Elf (Fey-touched)
- [ ] Faerie (Small magical beings)
- [ ] Faun (Nature-connected)
- [ ] Firbolg (Giant-kin)
- [ ] Fungril (Fungal beings)
- [ ] Galapa (Turtle folk)
- [ ] Giant (Towering humanoids)
- [ ] Goblin (Small and cunning)
- [ ] Halfling (Small and lucky)
- [ ] Human (Adaptable)
- [ ] Inferis (Hell-touched)
- [ ] Katari (Cat folk)
- [ ] Orc (Strong and proud)
- [ ] Ribbet (Frog folk)
- [ ] Simiah (Ape folk)

For each ancestry:
- [ ] Two ancestry features selectable
- [ ] Physical characteristics guidance available
- [ ] Narrative hooks present

### Community Validation

Verify character creation supports all SRD communities:

- [ ] Highborne (Nobility)
- [ ] Loreborne (Scholars)
- [ ] Orderborne (Military/Law)
- [ ] Ridgeborne (Mountain dwellers)
- [ ] Seaborne (Coastal/Sailors)
- [ ] Slyborne (Criminals/Rogues)
- [ ] Underborne (Underground)
- [ ] Wanderborne (Travelers/Nomads)
- [ ] Wildborne (Wilderness)

For each community:
- [ ] One community feature provided
- [ ] Social connections implied
- [ ] Cultural background available

---

## Experience Template Validation

### AT-6: Experience Constraints

**Reference**: `skills/dh-players/references/experience-template.md`

**Structure Validation**:
- [ ] Experience has Name field
- [ ] Modifier field present (+1, +2, or +3)
- [ ] Narrative Origin field with player description
- [ ] "Applies When" section with specific situations (positive scope)
- [ ] "Does NOT Apply" section with explicit exclusions

**Bounded Constraint Validation**:
- [ ] Modifier is bounded: +1 (minor), +2 (significant), +3 (defining)
- [ ] Positive scope lists 3-5 specific situations
- [ ] Exclusions list 2-4 explicit situations
- [ ] Scope is actionable (not vague like "when being clever")
- [ ] Exclusions prevent obvious scope creep

**Example Experience Checklist** (Former Pirate +2):
- [ ] Modifier is +2 (significant training)
- [ ] Applies When: Navigation, rope work, spotting marks, pirate customs, swimming
- [ ] Does NOT Apply: General combat, non-criminal social, landlocked regions, magic
- [ ] Narrative origin explains acquisition

**GM Guidance Validation**:
- [ ] Skill instructs to check positive scope first
- [ ] Skill instructs to check exclusions second
- [ ] Skill instructs to default to NOT applying when unclear
- [ ] Skill treats Experiences as bounded permissions, not general traits

---

## Combat Resolution Checklist

### AT-7: Combat Roll Resolution (All 5 Outcomes)

**Reference**: `skills/dh-combat/references/action-outcomes.md`

#### Outcome 1: Critical Success

**Condition**: Both dice match (any double 1-12)

- [ ] Roll shows hope == fear
- [ ] `higher` field returns "critical"
- [ ] Action automatically succeeds regardless of difficulty
- [ ] No Hope or Fear tokens generated
- [ ] Player retains spotlight for bonus action

**Validation Roll**:
```bash
# Run until critical occurs
bash corvran/skills/dice-roller/scripts/roll.sh "DdD"
```

#### Outcome 2: Success with Hope

**Condition**: Total >= Difficulty AND hope > fear

- [ ] Total meets or exceeds difficulty target
- [ ] Hope die value is higher than Fear die value
- [ ] Player gains 1 Hope token
- [ ] Spotlight passes to another player (party chooses)

**Test Scenario**:
- Difficulty: 15
- Roll result: hope=8, fear=6, total=14+3(modifier)=17
- Expected: Success with Hope

#### Outcome 3: Success with Fear

**Condition**: Total >= Difficulty AND fear > hope

- [ ] Total meets or exceeds difficulty target
- [ ] Fear die value is higher than Hope die value
- [ ] GM gains 1 Fear token
- [ ] GM takes the spotlight

**Test Scenario**:
- Difficulty: 15
- Roll result: hope=5, fear=9, total=14+3(modifier)=17
- Expected: Success with Fear

#### Outcome 4: Failure with Hope

**Condition**: Total < Difficulty AND hope > fear

- [ ] Total is below difficulty target
- [ ] Hope die value is higher than Fear die value
- [ ] Player gains 1 Hope token
- [ ] Spotlight passes to another player (party chooses)

**Test Scenario**:
- Difficulty: 15
- Roll result: hope=7, fear=3, total=10+2(modifier)=12
- Expected: Failure with Hope

#### Outcome 5: Failure with Fear

**Condition**: Total < Difficulty AND fear > hope

- [ ] Total is below difficulty target
- [ ] Fear die value is higher than Hope die value
- [ ] GM gains 1 Fear token
- [ ] GM takes the spotlight

**Test Scenario**:
- Difficulty: 15
- Roll result: hope=4, fear=8, total=12+0(modifier)=12
- Expected: Failure with Fear

### Reaction Roll Validation

- [ ] Reaction rolls resolve success/failure normally
- [ ] Reaction rolls do NOT generate Hope or Fear tokens
- [ ] Spotlight does NOT shift based on reaction results

### Advantage/Disadvantage Validation

- [ ] Advantage adds +1d6 to total
- [ ] Disadvantage subtracts 1d6 from total
- [ ] Multiple advantages stack (roll multiple d6s)
- [ ] Multiple disadvantages stack (roll multiple d6s)
- [ ] Advantages and disadvantages cancel one-to-one

---

## Token Economy Validation

### AT-12: Token Max Handling

**Hope Token Validation** (per player, max 6):

- [ ] Hope tokens track per character (not shared)
- [ ] Maximum is 6 per character
- [ ] Hope gained when hope die is higher on action rolls
- [ ] Hope NOT gained on reaction rolls
- [ ] Hope NOT gained on critical success
- [ ] Attempting to add Hope at max 6 does NOT error
- [ ] Excess Hope tokens are silently ignored (no overflow)

**Test Procedure**:
1. Set player Hope to 6
2. Roll action with hope > fear result
3. Verify Hope stays at 6 (no error, no overflow)

**Fear Token Validation** (GM, max 12):

- [ ] Fear tokens track for GM (single pool)
- [ ] Maximum is 12 total
- [ ] Fear gained when fear die is higher on player action rolls
- [ ] Fear NOT gained on reaction rolls
- [ ] Fear NOT gained on critical success
- [ ] Attempting to add Fear at max 12 does NOT error
- [ ] Excess Fear tokens are silently ignored (no overflow)

**Test Procedure**:
1. Set GM Fear to 12
2. Roll action with fear > hope result
3. Verify Fear stays at 12 (no error, no overflow)

### Token Spending Validation

**Hope Spending Options**:
- [ ] Can spend Hope to reroll one Duality Die
- [ ] Can spend Hope to add +2 to damage after rolling
- [ ] Can spend Hope to assist ally's roll (+1 to their total)
- [ ] Class features that cost Hope function correctly

**Fear Spending Options**:
- [ ] Can spend Fear to activate adversary Fear Features
- [ ] Can spend Fear for environmental complications
- [ ] Can spend Fear to bring in reinforcements
- [ ] Fear costs vary by feature (typically 1-2)

---

## Adversary Creation Checklist

### AT-8: Adversary Stat Block

**Reference**: `skills/dh-adversaries/references/stat-block-template.md`

#### Required Fields Validation

For any adversary stat block:

**Header**:
- [ ] Adversary Name present (ALL CAPS in header)
- [ ] Tier specified (1, 2, 3, or 4)
- [ ] Type specified (one of 10 types)
- [ ] Description present (1-2 sentences)

**Motives & Tactics**:
- [ ] Behavioral guidance for GM
- [ ] Opening behavior described
- [ ] Retreat conditions specified (if applicable)

**Combat Statistics**:
- [ ] Difficulty value present (target number to hit)
- [ ] Major Threshold present (damage for 2 HP)
- [ ] Severe Threshold present (damage for 3 HP)
- [ ] HP slots present
- [ ] Stress capacity present

**Attack Line**:
- [ ] Attack modifier (ATK: +N)
- [ ] Attack name (descriptive)
- [ ] Range (Melee/Close/Far/Very Far)
- [ ] Damage expression (NdX+M)
- [ ] Damage type (Physical or Magic)

**Features**:
- [ ] At least one feature present
- [ ] Feature type indicated (Action/Reaction/Passive)
- [ ] Feature effect clearly described

**Fear Features** (optional but common):
- [ ] Fear cost specified (typically 1-2)
- [ ] Effect significantly more powerful than standard features
- [ ] Creates dramatic moment opportunity

### Tier Validation

Verify stat blocks follow tier benchmarks:

**Tier 1 Adversary**:
- [ ] Difficulty: 10-14
- [ ] Major Threshold: 5-8
- [ ] Severe Threshold: 10-14
- [ ] HP: 3-8
- [ ] Stress: 2-4
- [ ] ATK: +3 to +4

**Tier 2 Adversary**:
- [ ] Difficulty: 14-18
- [ ] Major Threshold: 8-12
- [ ] Severe Threshold: 14-20
- [ ] HP: 6-12
- [ ] Stress: 4-6
- [ ] ATK: +4 to +5

**Tier 3 Adversary**:
- [ ] Difficulty: 18-22
- [ ] Major Threshold: 12-16
- [ ] Severe Threshold: 20-26
- [ ] HP: 10-18
- [ ] Stress: 6-9
- [ ] ATK: +5 to +7

**Tier 4 Adversary**:
- [ ] Difficulty: 22-26
- [ ] Major Threshold: 16-22
- [ ] Severe Threshold: 26-34
- [ ] HP: 15-30+
- [ ] Stress: 9-12
- [ ] ATK: +7 to +8

### Adversary Type Validation

Verify all 10 adversary types are documented:

- [ ] **Bruiser**: Heavy melee, high HP, high damage
- [ ] **Horde**: Group/swarm, shared HP pools, quantity over quality
- [ ] **Leader**: Command/buff focused, enhances allies
- [ ] **Minion**: Expendable, 1-3 HP, no Stress
- [ ] **Ranged**: Distance attacks, positioning abilities
- [ ] **Skulk**: Stealth/ambush, hide abilities
- [ ] **Social**: Non-combat focused, high Presence
- [ ] **Solo**: Boss, multiple actions, high HP, Fear Features
- [ ] **Standard**: Balanced baseline, 1-2 features
- [ ] **Support**: Healer/buffer, enhances allies

### Encounter Building Formula

**Battle Points Formula**: `[(3 x Number of PCs) + 2]`

- [ ] Formula documented in skill
- [ ] Minions cost 1 BP
- [ ] Standard adversaries cost 2-3 BP
- [ ] Leaders cost 4-5 BP
- [ ] Solo adversaries equal party BP

---

## SRD Search Validation

### AT-9: SRD Search

**Reference**: `skills/dh-rules/`

**Search for "Critical Success"**:
```bash
grep -ri "critical success" docs/research/daggerheart-srd/
```

**Validation Steps**:
- [ ] Search returns relevant SRD content
- [ ] Results include rule definitions
- [ ] Multiple relevant files may be returned
- [ ] Content matches Daggerheart SRD rules

**Additional Search Tests**:
- [ ] Search "Hope" returns token economy rules
- [ ] Search "Fear" returns GM resource rules
- [ ] Search "Evasion" returns combat target rules
- [ ] Search "Domain" returns card system rules
- [ ] Search by class name returns class content

---

## Init Command Validation

### AT-10: Init Command

**Command**: `/daggerheart-system:init`

**Pre-requisites**:
- [ ] SRD submodule present at `docs/research/daggerheart-srd/`
- [ ] SRD submodule not empty

**Validation Steps**:

**System.md Copy**:
- [ ] `System.md` copied to adventure directory
- [ ] Content matches source file
- [ ] File readable and complete

**CLAUDE.md Merge**:
- [ ] `dh-CLAUDE.md` content merged into project CLAUDE.md
- [ ] Existing CLAUDE.md content preserved
- [ ] Daggerheart GM guidance added
- [ ] No duplicate content if run multiple times

**Error Handling**:
- [ ] Clear error if SRD submodule missing
- [ ] Clear error if SRD submodule empty
- [ ] Error does not crash plugin

---

## Domain Card Validation

Verify all 9 domains are accessible:

- [ ] **Arcana**: Innate magic, elements (Druid, Sorcerer)
- [ ] **Blade**: Weapon mastery (Guardian, Warrior)
- [ ] **Bone**: Tactics, body control (Ranger, Warrior)
- [ ] **Codex**: Magical study (Bard, Wizard)
- [ ] **Grace**: Charisma, charm (Bard, Rogue)
- [ ] **Midnight**: Shadows, stealth (Rogue, Sorcerer)
- [ ] **Sage**: Nature, beasts (Druid, Ranger)
- [ ] **Splendor**: Life, healing (Seraph, Wizard)
- [ ] **Valor**: Protection, shields (Guardian, Seraph)

**Domain Card Format**:
- [ ] Name present
- [ ] Level specified (1-10)
- [ ] Domain specified
- [ ] Recall Cost specified (0-3)
- [ ] Effect description present

---

## Damage Resolution Validation

**Threshold-based HP Marking**:
- [ ] Damage below Major threshold: Mark 1 HP
- [ ] Damage meets/exceeds Major: Mark 2 HP
- [ ] Damage meets/exceeds Severe: Mark 3 HP

**Armor Interaction**:
- [ ] Armor Score reduces incoming damage
- [ ] Armor slots can be marked instead of HP
- [ ] 1 armor slot = 1 HP regardless of threshold

**Death/Dying**:
- [ ] All HP marked = dying (for PCs)
- [ ] All HP marked = defeated (for adversaries)
- [ ] Stabilization requires action from ally

---

## Stress Validation

**Stress Accumulation**:
- [ ] Stress tracked separately from HP
- [ ] Stress gained from narrative consequences
- [ ] Stress gained from certain ability effects

**Maximum Stress**:
- [ ] At max Stress, character gains Vulnerable condition
- [ ] Vulnerable: attacks against have advantage

**Stress Clearing**:
- [ ] Short rest clears some Stress
- [ ] Long rest clears all Stress
- [ ] Some class features clear Stress

---

## Validation Sign-Off

| Section | Validated | Date | Validator |
|---------|-----------|------|-----------|
| Dice Roller: Duality Dice | [ ] | | |
| Dice Roller: Standard Dice | [ ] | | |
| Dice Roller: Error Handling | [ ] | | |
| Character Creation (9 Classes) | [ ] | | |
| Ancestry Support (19 ancestries) | [ ] | | |
| Community Support (9 communities) | [ ] | | |
| Experience Template | [ ] | | |
| Combat Resolution (5 outcomes) | [ ] | | |
| Token Economy | [ ] | | |
| Adversary Creation | [ ] | | |
| Adversary Types (10 types) | [ ] | | |
| SRD Search | [ ] | | |
| Init Command | [ ] | | |
| Domain Cards (9 domains) | [ ] | | |
| Damage Resolution | [ ] | | |
| Stress System | [ ] | | |

---

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL). Daggerheart and all related marks are trademarks of Darrington Press LLC.
