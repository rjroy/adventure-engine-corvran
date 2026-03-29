# Action Outcomes Reference

Daggerheart action rolls produce five possible outcomes based on the total versus difficulty and which Duality Die (Hope or Fear) shows the higher value.

---

## Quick Reference Table

| Outcome | Total vs Difficulty | Higher Die | Player Token | GM Token | Spotlight |
|---------|---------------------|------------|--------------|----------|-----------|
| **Critical Success** | Any | Both match | - | - | Player keeps |
| **Success with Hope** | >= Difficulty | Hope | +1 Hope | - | Player passes |
| **Success with Fear** | >= Difficulty | Fear | - | +1 Fear | GM takes |
| **Failure with Hope** | < Difficulty | Hope | +1 Hope | - | Player passes |
| **Failure with Fear** | < Difficulty | Fear | - | +1 Fear | GM takes |

**Tie (non-critical)**: When dice show different values but result in a tie for high die, player chooses Hope or Fear.

---

## Critical Success

**Condition**: Both Duality Dice show the same value (any double: 1-1, 2-2, ... 12-12)

### Mechanical Effects
- Action automatically succeeds regardless of difficulty
- No Hope or Fear tokens generated
- Player retains spotlight for bonus action or effect

### Narrative Guidance
Critical success represents a moment of perfect execution. The character doesn't just succeed—they exceed expectations in a way that creates additional opportunity.

**Example narrative beats**:
- "Your blade finds the exact gap in its armor—choose: deal maximum damage or disarm it entirely."
- "The lock clicks open with surprising ease, and you notice a hidden compartment the previous owner clearly forgot about."
- "Your words resonate so deeply that not only does the guard let you pass, he offers to escort you safely."

### Bonus Effects (GM Options)
- Deal maximum weapon damage (no roll)
- Gain additional narrative benefit
- Create an opening for an ally
- Learn hidden information
- Intimidate nearby enemies

---

## Success with Hope

**Condition**: Total >= Difficulty AND Hope die shows higher value than Fear die

### Mechanical Effects
- Action succeeds as intended
- Player gains 1 Hope token (if below maximum of 6)
- Spotlight passes to another player (party chooses)

### Narrative Guidance
Success with Hope is clean victory. The character accomplishes their goal and feels confident, energized, or lucky. The world bends toward the protagonist.

**Example narrative beats**:
- "The spell completes perfectly—you feel the magic sing through you. Take a Hope."
- "Your arrow strikes true, and as the bandit falls, you feel that battle-clarity settling in."
- "The merchant's expression shifts from suspicion to respect. You've made an ally today."

### GM Behavior
- Do not introduce complications
- Describe success without caveats
- Let the player's momentum carry forward
- Encourage the party to capitalize on the positive turn

---

## Success with Fear

**Condition**: Total >= Difficulty AND Fear die shows higher value than Hope die

### Mechanical Effects
- Action succeeds as intended
- GM gains 1 Fear token (if below maximum of 12)
- GM takes the spotlight

### Narrative Guidance
Success with Fear is complicated victory. The character achieves their goal, but the cost is measured in opportunity for the opposition. Something shifted in the enemy's favor even as you won.

**Example narrative beats**:
- "You land the blow, but in doing so you've overextended—the wraith's cold fingers rake toward your exposed flank."
- "The door opens, but its creak echoes through the chamber. Something in the darkness stirs."
- "She agrees to your terms, but her smile tells you she's already planning how to turn this to her advantage."

### GM Behavior
- Describe the success, then the complication
- Use spotlight to advance adversary plans
- Spend accumulated Fear if dramatically appropriate
- Connect the Fear gain to the fiction (overextension, noise, bad luck)

---

## Failure with Hope

**Condition**: Total < Difficulty AND Hope die shows higher value than Fear die

### Mechanical Effects
- Action fails to achieve its goal
- Player gains 1 Hope token (if below maximum of 6)
- Spotlight passes to another player (party chooses)

### Narrative Guidance
Failure with Hope is a setback that opens doors. The character doesn't accomplish what they intended, but the attempt reveals something useful, creates an opportunity, or simply leaves them undaunted.

**Example narrative beats**:
- "Your strike goes wide, but in dodging, the creature exposes the glowing rune on its chest—a weakness, perhaps?"
- "The ledge crumbles before you reach it. You catch yourself, but now you've seen the hidden path below."
- "The spell fizzles, but in the magical backlash you sense the source of the curse—it's coming from the painting."

### GM Behavior
- Describe the failure, then the silver lining
- Offer information, positioning, or future advantage
- Do NOT take spotlight—player momentum continues
- Make the Hope token feel earned despite failure

---

## Failure with Fear

**Condition**: Total < Difficulty AND Fear die shows higher value than Hope die

### Mechanical Effects
- Action fails to achieve its goal
- GM gains 1 Fear token (if below maximum of 12)
- GM takes the spotlight

### Narrative Guidance
Failure with Fear is clean defeat. The character not only fails, but the failure empowers opposition. This is when things go wrong in a way that matters.

**Example narrative beats**:
- "Your blade catches in your scabbard as you draw—by the time you're ready, the assassin has closed the distance."
- "The lie doesn't land. Worse, you see recognition in her eyes. She knows exactly who you are now."
- "The healing magic sputters out. As you struggle to channel power, the demon's laughter echoes."

### GM Behavior
- Describe the failure and its immediate consequences
- Take spotlight to escalate threat
- Adversaries act, complications arise, danger increases
- This is when Fear Features become tempting to spend

---

## Dice Tie Resolution

When the Hope and Fear dice show different values but tie for "higher" (mathematically impossible), OR when you roll exactly the same value (a critical), use these rules:

### True Tie (Same Values)
If both dice show the same value:
- This is a **Critical Success**, not a tie
- Apply Critical Success rules above

### Adjudicating Edge Cases
If confusion arises about which die was higher:
- Hope die is the first d12 rolled
- Fear die is the second d12 rolled
- Compare the two values directly
- The player chooses only when values are literally equal (which triggers Critical)

---

## Token Economy Notes

### Maximum Tokens
- **Player Hope**: 6 per character
- **GM Fear**: 12 total

### Overflow
Tokens that would exceed maximum are lost. This is not an error—it's the natural ceiling of momentum.

### Reaction Rolls
Reaction rolls (triggered outside normal spotlight) do NOT generate tokens. Resolve success/failure normally, but skip the Hope/Fear determination.

### Spending Reference

**Hope Tokens** (player spends):
- Reroll one of your Duality Dice
- Add +2 to damage after rolling
- Activate certain class features
- Assist an ally's roll (+1 to their total)

**Fear Tokens** (GM spends):
- Activate adversary Fear Features (cost varies)
- Introduce environmental complication
- Bring in reinforcements
- Escalate a threat beyond its normal action

---

## Outcome Flow Diagram

```
Roll 2d12 (Duality Dice) + Trait + Modifiers
                |
                v
       Do both dice match?
              /     \
           Yes       No
            |         |
            v         v
    CRITICAL      Compare to Difficulty
    SUCCESS             |
                   /         \
            >= Difficulty   < Difficulty
                 |               |
                 v               v
           SUCCESS          FAILURE
                 |               |
            Which die        Which die
            higher?          higher?
           /       \        /       \
        Hope      Fear   Hope      Fear
          |         |      |         |
          v         v      v         v
      SUCCESS   SUCCESS  FAILURE  FAILURE
        with      with     with     with
        HOPE      FEAR     HOPE     FEAR
```

---

*Action outcome rules derived from the Daggerheart SRD by Darrington Press, used under the DPCGL.*
