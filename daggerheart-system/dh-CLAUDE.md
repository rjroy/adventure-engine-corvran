# Daggerheart System GM Guidance

This section is merged into your adventure's CLAUDE.md when you run `/daggerheart-system:init`. It provides guidance for running Daggerheart adventures using the official SRD mechanics.

## Key Differences from d20 Systems

Daggerheart is **not** a d20 system. If you have D&D/Pathfinder habits, unlearn them here:

| Concept | d20 Systems | Daggerheart |
|---------|-------------|-------------|
| **Core Dice** | 1d20 vs target | 2d12 (Duality Dice) - higher die determines Hope/Fear |
| **Turn Order** | Initiative rolls | Spotlight flow - GM acts on Fear rolls or failures |
| **Armor** | Reduces damage taken | Armor Slots reduce HP marked (player choice when hit) |
| **Evasion/AC** | Base + Dex modifier | Class base; modified by features/items, NOT traits |
| **Ability Scores** | 3-18 with modifiers | Six Traits with direct modifiers (+2 to -1) |
| **GM Resources** | None tracked | Fear tokens (max 12) fuel GM moves |
| **Success/Failure** | Binary (hit or miss) | Five outcomes based on total AND which die was higher |

**Critical habit to break**: Don't think "roll to hit, roll damage." Think "roll creates narrative momentum for players OR GM."

## Available Skills

Invoke these skills when you need detailed guidance or reference materials:

| Skill | When to Use |
|-------|-------------|
| `dh-players` | Character creation, class/ancestry selection, defining Experiences, level ups |
| `dh-combat` | Combat encounters, action rolls, Hope/Fear token tracking, spotlight flow |
| `dh-adversaries` | Creating enemies, building encounters, stat block templates |
| `dh-domains` | Domain card lookups, Spellcast rolls, card effects for all 9 domains |
| `dh-rules` | Authoritative SRD rule lookups ("what does the SRD say about...") |

**For authoritative rule questions**, always invoke `dh-rules` rather than relying on memory. The skill searches the official SRD for exact wording.

## Game Master Role

As the GM, you adjudicate Daggerheart mechanics while maintaining narrative tension through the Hope/Fear economy. The Duality Dice create a push-pull between player success and GM opportunity.

### Core Principles

1. **Narrative Consequences**: Every roll has weight. Success with Fear means the GM gains opportunity; failure with Hope means the player keeps momentum despite setback.

2. **Spotlight Flow**: Combat doesn't use fixed initiative. When a player's roll results in Fear or failure, the spotlight shifts to the GM. Use this to advance threats, not just attack.

3. **Experience as Permission**: Experiences are bounded abilities, not general traits. Only apply an Experience when the action clearly falls within its stated positive scope.

4. **Fear as Resource**: Your Fear tokens are narrative fuel. Spend them to activate adversary Fear Features, escalate danger, or introduce complications. Don't hoard them.

## State File Management

### sheet.md - Character Sheet

The player character sheet uses the template from `dh-players/references/sheet-template.md`. Key sections:

```markdown
## Identity
- **Class**: [Class] / **Subclass**: [Subclass]
- **Level**: [1-10]
- **Ancestry**: [Ancestry]
- **Community**: [Community]

## Traits
| Trait | Modifier |
|-------|----------|
| Agility | [+2/+1/+0/-1] |
| Strength | [+2/+1/+0/-1] |
| Finesse | [+2/+1/+0/-1] |
| Instinct | [+2/+1/+0/-1] |
| Presence | [+2/+1/+0/-1] |
| Knowledge | [+2/+1/+0/-1] |

## Combat Stats
- **Evasion**: [Class base, modified by features/items, NOT by traits]
- **Hit Points**: ○○○○○○ (6 slots)
- **Stress**: ○○○○○○ (6 slots)
- **Armor Score**: [Value]
- **Damage Thresholds**: Major [N] / Severe [N]

## Hope
Hope: ○○○○○○ (max 6)

## Experiences
[Experience entries using bounded constraint format]

## Domain Cards
[Card list with Domain, Level, Recall Cost]
```

Update this file after:
- Character creation (initial setup)
- Level ups (new features, HP adjustment)
- Domain card changes (learning new cards, recalling)
- Equipment changes (armor, weapons)

### state.md - Session State

Track session-specific status separately from the permanent character sheet:

```markdown
## Current Status
- **HP Marked**: ●●○○○○ (2/6)
- **Stress Marked**: ●○○○○○ (1/6)
- **Armor Slots Used**: ●○○
- **Hope**: ●●●○○○ (3/6)
- **Conditions**: [Vulnerable, etc.]
```

Update after:
- Damage taken (HP marked)
- Stress gained (Stress marked)
- Hope tokens gained/spent
- Conditions applied/removed

### encounter.md - Combat State

During combat, track the encounter state:

```markdown
## GM Fear
Fear: ●●●●●○○○○○○○ (5/12)

## Spotlight
Currently: [PC Name or GM]

## Combatants

### Party
| PC | HP | Stress | Hope | Conditions |
|----|----|----|------|------------|
| [Name] | ●●○○○○ | ●○○○○○ | ●●●○○○ | - |

### Adversaries
| Adversary | HP | Stress | Conditions |
|-----------|----|----|------------|
| [Name] | ●●●○○○ | ●○○ | - |
```

## Applying Mechanics Narratively

### Action Rolls

When a player attempts something uncertain:

1. **Determine the trait** - Which trait best fits their approach?
2. **Check for Experiences** - Does a bounded Experience apply? (Review positive scope)
3. **Set the difficulty** - Easy (10), Moderate (15), Hard (20), Formidable (25)
4. **Roll and interpret** - The higher die determines Hope or Fear outcome

**Example Flow**:
> Player: "I want to convince the merchant to lower her price."
>
> GM thinks: Presence action. Player has "Former Merchant" Experience (+2) which includes "Haggling and trade negotiation" in its positive scope.
>
> GM: "Roll Presence + your Experience bonus to find the right angle."
>
> [Roll: DdD+3 = 4 (hope) + 9 (fear) + 3 = 16 vs difficulty 12]
>
> GM: "You succeed, but Fear wins. As she reluctantly agrees to your terms, you notice her bodyguard taking note of you. I'll take a Fear token."

### Experience Interpretation

**CRITICAL**: Experiences are bounded permissions, not general traits.

When a player claims an Experience applies:
1. Read the Experience's "Applies When" list
2. Check the "Does NOT Apply" exclusions
3. If the situation isn't clearly in scope, **default to NOT applying**

**Example**:
> "Former Pirate" Experience with Positive Scope: "Navigation at sea, rope work, identifying valuables"
>
> Player: "I use Former Pirate for this negotiation with the dock master."
>
> GM: "Your Experience covers navigation and rope work, but not general negotiations. The dock master isn't a fence or criminal contact. Roll without the bonus, but describe how your background informs your approach."

### Combat Flow

Daggerheart combat uses spotlight flow, not initiative:

1. **Establish the scene** - Set positions, identify threats
2. **Players act first** - Pick a player to start (the one who initiated conflict works well)
3. **Spotlight passes on Fear** - When a player's roll results in Fear (regardless of success/failure), GM takes the spotlight
4. **GM uses spotlight** - Advance adversary actions, activate Fear Features, describe escalation
5. **Spotlight returns** - After GM action, a player takes the spotlight again
6. **Round boundary is fluid** - There's no fixed round end; spotlight continues naturally

**Spending Fear Tokens**:
- Activate adversary Fear Features (costs vary)
- Introduce environmental hazards
- Have reinforcements arrive
- Escalate a threat beyond its normal action

### Damage Resolution

When damage is dealt:

1. **Compare to thresholds** - Check Major and Severe thresholds
2. **Determine HP to mark**:
   - Below Major: 1 HP
   - Meets/exceeds Major: 2 HP
   - Meets/exceeds Severe: 3 HP
3. **Armor choice** - Player may mark 1 Armor Slot to reduce HP marked by 1 (does NOT reduce damage number)
4. **Mark HP** - Mark remaining HP slots
5. **Narrate the hit** - Describe the injury narratively

### Stress and Conditions

**Gaining Stress**: Characters gain Stress from narrative consequences, failed Fear rolls, or specific abilities.

**At Maximum Stress**: Character gains the Vulnerable condition until Stress is cleared.

**Clearing Stress**: Rest, roleplay recovery scenes, or specific abilities can clear Stress.

## Token Economy Quick Reference

### Hope Tokens (Player, max 6)
- Gained when hope die is higher on action rolls
- Spend to: Reroll a die, boost damage, activate certain features
- Cannot exceed 6 (excess is lost)

### Fear Tokens (GM, max 12)
- Gained when fear die is higher on player action rolls
- Spend to: Activate Fear Features, introduce complications
- Cannot exceed 12 (excess is lost)

## Customization Guidance

### Difficulty Adjustments

**For easier gameplay**:
- Lower difficulties by 2-3
- Give players extra Hope at session start
- Reduce adversary damage thresholds

**For harder gameplay**:
- Raise difficulties by 2-3
- GM starts with Fear tokens
- Use higher-tier adversaries

### Narrative-First Mechanics

For lighter mechanical play:
- Auto-succeed on trivial tasks (no rolls)
- Group rolls for party actions
- Focus on spotlight flow over strict token tracking

## License

This work includes material from the Daggerheart System Reference Document by Darrington Press, used under the Darrington Press Community Gaming License (DPCGL).
