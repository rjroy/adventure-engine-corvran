# Example Stat Block: Goblin Warrior

This example demonstrates a complete SRD 5.2 stat block using the Goblin Warrior from the System Reference Document.

---

## Goblin Warrior

*Small Fey (Goblinoid), Chaotic Neutral*

- **Armor Class:** 15 (leather armor, shield)
- **Hit Points:** 10 (3d6)
- **Speed:** 30 ft.
- **Initiative:** +2 (12)

|STAT|SCORE|MOD|SAVE|
| --- | --- | --- | --- |
| STR | 8 | -1 | -1 |
| DEX | 15 | +2 | +2 |
| CON | 10 | +0 | +0 |
| INT | 10 | +0 | +0 |
| WIS | 8 | -1 | -1 |
| CHA | 8 | -1 | -1 |

- **Skills:** Stealth +6
- **Gear:** Leather Armor, Scimitar, Shield, Shortbow
- **Senses:** darkvision 60 ft.; Passive Perception 9
- **Languages:** Common, Goblin
- **CR:** 1/4 (XP 50; PB +2)

### Actions

***Scimitar.*** *Melee Attack Roll:* +4, reach 5 ft. 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.

***Shortbow.*** *Ranged Attack Roll:* +4, range 80/320 ft. 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.

### Bonus Actions

***Nimble Escape.*** The goblin takes the Disengage or Hide action.

---

## Breakdown of the Stat Block

### Header Analysis

| Element | Value | Explanation |
|---------|-------|-------------|
| Size | Small | Uses d6 for Hit Dice |
| Type | Fey | Creature type classification |
| Tag | Goblinoid | Descriptive subtype |
| Alignment | Chaotic Neutral | Default roleplaying suggestion |

### Combat Statistics

| Statistic | Value | Calculation |
|-----------|-------|-------------|
| AC | 15 | 10 + 2 (DEX) + 1 (leather) + 2 (shield) |
| HP | 10 | 3d6 = 3 x 3.5 average = 10.5, rounded to 10 |
| Initiative | +2 (12) | DEX mod (+2), score = 10 + 2 |

### Ability Score Analysis

The Goblin Warrior has:
- **Low STR (8)**: Weak physically, -1 to STR-based attacks and checks
- **High DEX (15)**: Agile and quick, +2 to AC, attacks, and Stealth
- **Average CON (10)**: Standard health, no bonus HP per Hit Die
- **Average INT (10)**: Typical reasoning ability
- **Low WIS (8)**: Poor perception and insight, low Passive Perception
- **Low CHA (8)**: Not socially adept

### Skill Proficiency

**Stealth +6** = DEX modifier (+2) + Proficiency Bonus (+2) + Expertise (+2)

The goblin has Expertise in Stealth (double proficiency), making it exceptionally sneaky despite its otherwise modest abilities.

### Attack Calculations

**Attack Bonus (+4)**:
- DEX modifier: +2
- Proficiency Bonus: +2
- Total: +4

**Scimitar Damage (5 / 1d6 + 2)**:
- Uses DEX (finesse weapon): +2
- Average: 3.5 + 2 = 5.5, shown as 5

**Bonus Damage on Advantage (+2 / 1d4)**:
- Triggers when attack has Advantage
- Rewards the goblin's sneaky tactics via Nimble Escape

### Tactical Considerations

The Goblin Warrior's design encourages hit-and-run tactics:

1. **Nimble Escape** (Bonus Action): Hide or Disengage each turn
2. **Bonus damage on Advantage**: Rewards attacking from hiding
3. **High Stealth (+6)**: Reliably hides from most opponents
4. **Low HP (10)**: Cannot survive prolonged combat

**Optimal Goblin Tactics**:
1. Hide using Nimble Escape
2. Attack with Advantage (from hiding) for bonus damage
3. Use remaining movement to reposition
4. Repeat

---

## Additional Goblin Variants

### Goblin Minion (CR 1/8)

A weaker goblin for larger groups:
- **HP:** 7 (2d6)
- **AC:** 12 (no armor)
- **Gear:** Dagger x 3

### Goblin Boss (CR 1)

A goblin leader with better equipment and more Hit Dice:
- **HP:** 21 (6d6)
- **AC:** 17 (chain shirt, shield)
- **Multiattack:** Two attacks with Scimitar or Shortbow

---

## Rolling HP and Damage

Use the corvran dice-roller skill for randomized rolls:

**Rolling Goblin HP:**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "3d6"
```

**Rolling Scimitar Damage:**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d6+2"
```

**Rolling Bonus Damage (on Advantage):**
```bash
bash "${CLAUDE_PLUGIN_ROOT}/../corvran/skills/dice-roller/scripts/roll.sh" "1d4"
```

---

## License

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC. The SRD 5.2.1 is licensed under CC-BY-4.0.
