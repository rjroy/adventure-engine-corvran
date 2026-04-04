# Adversary Block Template

This template follows the Apocrypha adversary block format. Replace placeholder text with appropriate values. Remove sections that don't apply.

---

## [Adversary Name] ([Tier])

<!--
  HEADER
  ======
  Name: Descriptive name for the adversary
  Tier: Minor, Standard, or Major

  Tier guidelines:
    Minor: 2-3 keywords, threshold 2-3, 0-1 Fear abilities
    Standard: 3-4 keywords, threshold 4-6, 1-2 Fear abilities
    Major: 4-6 keywords, threshold 8-12, 2-4 Fear abilities
-->

*[One to two sentences describing the adversary's appearance, nature, and threat]*

<!--
  DESCRIPTION
  ===========
  What does this adversary look like?
  What makes it dangerous or interesting?
  Example: A hulking wolf-beast with frost-rimed fur and eyes that glow like cold stars.
-->

**Difficulty**: [N]

<!--
  DIFFICULTY
  ==========
  The target number for player rolls against this adversary.
    Minor: 10-14
    Standard: 14-17
    Major: 17-20
-->

**Stress Threshold**: [N] (Current: 0)

<!--
  STRESS THRESHOLD
  ================
  Total stress the adversary can absorb before defeat.
    Minor: 2-3
    Standard: 4-6
    Major: 8-12
-->

### Keywords

<!--
  KEYWORDS
  ========
  Define the adversary's capabilities as keywords with modifiers.
  Keywords are fixed once introduced. Do not invent new capabilities mid-encounter.

  For standard and major adversaries, track stress per-keyword:
    - [Keyword Name] (+N) [Stress: N, if any]

  For minor adversaries, use aggregate tracking instead.
  Stress notation matches the character sheet format.
-->

- [Keyword Name] (+N)
- [Keyword Name] (+N)

### Fear Abilities

<!--
  FEAR ABILITIES
  ==============
  Special capabilities activated by GM spending Fear tokens.
  Cost is defined per ability. Scale with tier:
    Minor: 0-1 abilities, cost 1 Fear each
    Standard: 1-2 abilities, cost 1-2 Fear each
    Major: 2-4 abilities, cost 1-3 Fear each

  Remove this section if the adversary has no Fear abilities.
-->

- [Ability description] (Cost: [N] Fear)

<!--
  Examples:
  - Terrifying Roar: inflict light stress on a courage-related keyword (Cost: 1 Fear)
  - Breath of Ruin: inflict deep stress on one keyword, light stress on another (Cost: 3 Fear)
  - Rally the Pack: restore 2 stress to allied minor adversaries (Cost: 2 Fear)
-->

---

## Quick Reference

### Tier Benchmarks

| Tier | Keywords | Threshold | Fear Abilities | Difficulty |
|------|----------|-----------|----------------|------------|
| Minor | 2-3 | 2-3 | 0-1 (1 Fear each) | 10-14 |
| Standard | 3-4 | 4-6 | 1-2 (1-2 Fear each) | 14-17 |
| Major | 4-6 | 8-12 | 2-4 (1-3 Fear each) | 17-20 |

### Stress Tracking

- **Minor**: Aggregate pool. Single counter toward threshold.
- **Standard/Major**: Per-keyword. Each keyword degrades independently. Total across all keywords counts toward threshold.

### Stress Dealt by Players

| Outcome | Stress |
|---------|--------|
| Success with Hope | 2 |
| Success with Fear | 1 |
