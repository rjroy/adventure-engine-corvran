# Domain Overview

This reference provides an overview of all 9 Daggerheart domains, their thematic focus, and class access. For full domain card listings and detailed card effects, reference the Daggerheart SRD via `dh-rules/references/srd/domains/` and `dh-rules/references/srd/abilities/`.

---

## Arcana

**Focus**: Innate and instinctual magic

**Description**: Arcana is the domain of raw, enigmatic magical forces. Practitioners tap into volatile elemental power and energy manipulation. While dangerous, Arcana is incredibly potent when correctly channeled.

**Classes with Access**: Druid, Sorcerer

**Thematic Elements**:
- Elemental manipulation (fire, lightning, force)
- Protective wards and runes
- Flight and teleportation
- Reality warping at high levels

**Example Cards**: Rune Ward (L1), Counterspell (L3), Chain Lightning (L5), Telekinesis (L6)

---

## Blade

**Focus**: Weapon mastery

**Description**: Blade is the domain of martial excellence. Whether by steel, bow, or specialized armament, those who follow this path dedicate themselves to achieving inexorable power over death through combat prowess.

**Classes with Access**: Guardian, Warrior

**Thematic Elements**:
- Weapon enhancement and technique
- Endurance and resilience in battle
- Fury and reckless combat power
- Area attacks and overwhelming force

**Example Cards**: Get Back Up (L1), Versatile Fighter (L3), Champion's Edge (L5), Onslaught (L10)

---

## Bone

**Focus**: Tactics and body mastery

**Description**: Bone is the domain of physical control and combat awareness. Practitioners develop uncanny control over their own bodies and an eye for predicting enemy behaviors. This domain grants unparalleled understanding of bodies and their movements.

**Classes with Access**: Ranger, Warrior

**Thematic Elements**:
- Tactical positioning and awareness
- Precise, calculated strikes
- Defensive reactions and counters
- Physical enhancement and recovery

**Example Cards**: Deft Maneuvers (L1), Tactician (L3), Know Thy Enemy (L5), Deathrun (L10)

---

## Codex

**Focus**: Magical study and written power

**Description**: Codex is the domain of intensive magical scholarship. Devotees pursue knowledge beyond common wisdom through equations of power recorded in books, scrolls, walls, or tattoos. This domain offers commanding and versatile understanding of magic.

**Classes with Access**: Bard, Wizard

**Thematic Elements**:
- Books of power (named magical tomes)
- Spatial manipulation (teleportation, walls)
- Banishment and binding
- Knowledge-based magic

**Example Cards**: Book of Ava (L1), Book of Korvax (L3), Teleport (L5), Transcendent Union (L10)

---

## Grace

**Focus**: Charisma and language mastery

**Description**: Grace is the domain of social power. Through rapturous storytelling, charming spells, or a shroud of lies, practitioners bend perception to their will. Grace offers raw magnetism and mastery over language.

**Classes with Access**: Bard, Rogue

**Thematic Elements**:
- Inspiration and encouragement
- Deception and misdirection
- Mind reading and thought manipulation
- Charm and social dominance

**Example Cards**: Inspirational Words (L1), Invisibility (L3), Words of Discord (L5), Encore (L10)

---

## Midnight

**Focus**: Shadows and secrecy

**Description**: Midnight is the domain of obscurity. Through clever tricks, deft magic, or the cloak of night, practitioners control and create enigmas. This domain offers power over darkness and hidden things.

**Classes with Access**: Rogue, Sorcerer

**Thematic Elements**:
- Stealth enhancement
- Shadow manipulation
- Fear and terror effects
- Concealment and disguise

**Example Cards**: Uncanny Disguise (L1), Veil of Night (L3), Hush (L5), Eclipse (L10)

---

## Sage

**Focus**: The natural world

**Description**: Sage is the domain of nature's unfettered power. Practitioners tap into the earth and its creatures to unleash raw magic, gaining the vitality of a blooming flower and the ferocity of a ravenous predator.

**Classes with Access**: Druid, Ranger

**Thematic Elements**:
- Beast companions and communication
- Plant manipulation
- Natural healing and vitality
- Weather and elemental nature forces

**Example Cards**: Nature's Tongue (L1), Natural Familiar (L2), Thorn Skin (L5), Tempest (L10)

---

## Splendor

**Focus**: Life and healing

**Description**: Splendor is the domain of life itself. Practitioners gain the ability to heal and, to an extent, control death. This domain offers the magnificent ability to both give and end life.

**Classes with Access**: Seraph, Wizard

**Thematic Elements**:
- Healing and restoration
- Protection and wards
- Light and radiant energy
- Resurrection at high levels

**Example Cards**: Mending Touch (L1), Healing Hands (L2), Restoration (L6), Resurrection (L10)

---

## Valor

**Focus**: Protection and defense

**Description**: Valor is the domain of the shield. Whether through attack or defense, practitioners channel formidable strength to protect their allies in battle. This domain offers great power to those who raise their shields in defense of others.

**Classes with Access**: Guardian, Seraph

**Thematic Elements**:
- Ally protection and shielding
- Defensive stances and reactions
- Inspiring and bolstering allies
- Unyielding endurance

**Example Cards**: I Am Your Shield (L1), Lean on Me (L3), Rise Up (L6), Unbreakable (L10)

---

## Domain Card Structure

All domain cards follow a consistent format:

### Card Components

| Component | Description |
|-----------|-------------|
| **Name** | The card's title |
| **Level** | 1-10, determines when available during advancement |
| **Domain** | Which domain the card belongs to |
| **Recall Cost** | Stress spent to recall after use (0 = always available) |
| **Effect** | What happens when the card is activated |

### Example Card Format

```
# CARD NAME

> **Level [N] [Domain] Spell**
> **Recall Cost:** [0-3]

[Effect text describing what the card does, possibly including
Spellcast Rolls, damage dice, conditions, duration, etc.]
```

---

## Spellcast Roll Reference

Many domain cards require a Spellcast Roll - a standard Duality Dice action roll.

### Roll Formula
```
DdD + Spellcasting Trait vs. Difficulty
```

### Spellcasting Traits by Class

| Class | Primary Trait | Secondary Trait |
|-------|---------------|-----------------|
| Bard | Presence | Knowledge |
| Druid | Instinct | Agility |
| Seraph | Presence | Strength |
| Sorcerer | Presence | Instinct |
| Wizard | Knowledge | Presence |

### Spellcast Outcomes

Standard action roll interpretation applies:
- **Critical**: Both dice match - automatic success with enhanced effect
- **Success with Hope**: Total >= Difficulty, hope die higher
- **Success with Fear**: Total >= Difficulty, fear die higher
- **Failure with Hope**: Total < Difficulty, hope die higher
- **Failure with Fear**: Total < Difficulty, fear die higher

---

## Class-Domain Matrix

Quick reference for which classes access which domains:

| Class | Domain 1 | Domain 2 |
|-------|----------|----------|
| Bard | Codex | Grace |
| Druid | Arcana | Sage |
| Guardian | Blade | Valor |
| Ranger | Bone | Sage |
| Rogue | Grace | Midnight |
| Seraph | Splendor | Valor |
| Sorcerer | Arcana | Midnight |
| Warrior | Blade | Bone |
| Wizard | Codex | Splendor |

---

## SRD Reference Paths

For complete domain card content, reference the Daggerheart SRD:

- **Domain descriptions**: `dh-rules/references/srd/domains/[Domain].md`
- **Individual cards**: `dh-rules/references/srd/abilities/[Card Name].md`

Do not duplicate full card text from the SRD. Instead, reference the SRD files for authoritative card effects.
