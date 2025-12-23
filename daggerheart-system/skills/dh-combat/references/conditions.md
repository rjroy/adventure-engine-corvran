# Conditions Reference

Conditions are temporary states that modify a creature's capabilities in Daggerheart. A creature either has a condition or doesn't—conditions don't stack with themselves.

---

## Core Conditions

### Vulnerable

While you have the Vulnerable condition:

- **Attacks Advantaged**: Attack rolls against you have advantage (+1d6).
- **Common Trigger**: Maximum Stress reached.

**Common causes**:
- Filling all Stress slots
- Certain adversary abilities
- Environmental hazards
- Failed saves against debilitating effects

**Clearing**:
- Rest to clear Stress below maximum
- Specific class features
- Healing abilities that clear Stress

**Combat impact**: Significant. Makes the character much easier to hit and damage. Priority to clear or protect.

---

### Hidden

While you have the Hidden condition:

- **Attacks Disadvantaged**: Attack rolls against you have disadvantage (-1d6) until you are revealed.
- **Revealed When**: You attack, cast a spell with visible effects, make noise, or an enemy succeeds at finding you.

**Common causes**:
- Successful Stealth actions
- Certain class abilities (Rogue, Ranger)
- Environmental concealment (heavy fog, complete darkness)
- Invisibility effects

**Clearing**:
- Taking an offensive action
- Being detected
- Moving into plain sight
- Environmental change (light source, fog clearing)

**Combat impact**: Defensive advantage. Hidden characters are harder to target but lose the condition when acting offensively.

---

### Restrained

While you have the Restrained condition:

- **Cannot Move**: Your movement is reduced to 0.
- **Attacks Advantaged**: Attack rolls against you have advantage (+1d6).
- **Your Attacks Affected**: May have disadvantage on attack rolls (GM discretion based on restraint type).

**Common causes**:
- Grappling abilities
- Web or net effects
- Entangling magic
- Crushing environmental hazards
- Certain adversary attacks

**Clearing**:
- Escape action (typically Strength or Agility roll vs difficulty)
- Outside assistance to break restraint
- Destroying the restraining effect
- Certain class abilities

**Combat impact**: Major. Prevents repositioning and makes the character an easy target. High priority to escape.

---

### Frightened

While you have the Frightened condition:

- **Actions Affected**: You have disadvantage (-1d6) on actions directed at the source of fear.
- **Movement Affected**: You cannot willingly move closer to the source of fear.
- **Source Specific**: The condition is tied to a specific creature or effect that caused it.

**Common causes**:
- Adversary Fear Features
- Failed saves against terror effects
- Certain domain abilities
- Overwhelming enemy presence

**Clearing**:
- Line of sight to source broken
- Source is defeated or flees
- Successful save (typically Presence) to overcome fear
- Certain ally abilities that bolster courage
- End of effect duration

**Combat impact**: Moderate to Major. Limits tactical options and reduces effectiveness against the fear source. Can cause positioning problems.

---

## Additional Conditions

### Prone

While you have the Prone condition:

- **Movement Restricted**: Must spend movement to stand up.
- **Melee Vulnerable**: Melee attacks against you have advantage.
- **Ranged Protected**: Ranged attacks against you have disadvantage.
- **Your Attacks Affected**: Your attacks may have disadvantage.

**Common causes**:
- Being knocked down by attacks
- Falling
- Certain spell effects
- Tripping hazards

**Clearing**:
- Use movement to stand up (typically half your movement speed)

**Combat impact**: Context-dependent. Dangerous in melee, somewhat protective against ranged.

---

### Blinded

While you have the Blinded condition:

- **Cannot See**: Automatic failure on sight-based checks.
- **Attacks Disadvantaged**: Your attack rolls have disadvantage.
- **Attackers Advantaged**: Attack rolls against you have advantage.

**Common causes**:
- Darkness without darkvision
- Flash or light effects
- Certain spells
- Eye injuries

**Clearing**:
- Light source in darkness
- End of effect duration
- Healing for injuries
- Removing obstruction

**Combat impact**: Severe. Major penalties to both offense and defense.

---

### Incapacitated

While you have the Incapacitated condition:

- **Cannot Act**: You cannot take actions or reactions.
- **Spotlight Skipped**: You cannot hold the spotlight.
- **Helpless**: Typically combined with other conditions.

**Common causes**:
- Unconsciousness
- Paralysis effects
- Overwhelming magical compulsion
- Sleep

**Clearing**:
- Effect ends or is dispelled
- Damage (if caused by sleep)
- Healing (if caused by injury)

**Combat impact**: Critical. Character is effectively out of combat until cleared.

---

### Slowed

While you have the Slowed condition:

- **Movement Reduced**: Your movement is halved.
- **Actions Limited**: May only take one action per spotlight (no bonus actions).

**Common causes**:
- Certain adversary abilities
- Environmental effects (deep water, heavy snow)
- Magical slowing effects
- Exhaustion

**Clearing**:
- End of effect duration
- Leaving the slowing environment
- Dispelling magic

**Combat impact**: Moderate. Reduces tactical flexibility and positioning options.

---

### Marked

While you have the Marked condition:

- **Targeted**: The creature that marked you has advantage on attacks against you.
- **Escape Penalty**: If you move away from the marker, they may have a reaction opportunity.

**Common causes**:
- Guardian class features
- Certain adversary abilities
- Tactical maneuvers

**Clearing**:
- Marker is incapacitated
- Marker uses ability on another target
- End of effect duration

**Combat impact**: Moderate. Creates tactical pressure to engage with specific enemies.

---

## Condition Interactions

### Stacking Rules
- Conditions do not stack with themselves
- Multiple sources of the same condition do not increase severity
- When a condition would be applied and is already present, duration may extend

### Advantage/Disadvantage from Conditions

| Condition | You Have Disadvantage | Attacks Against You |
|-----------|----------------------|---------------------|
| Vulnerable | - | Advantage |
| Hidden | - | Disadvantage |
| Restrained | May have | Advantage |
| Frightened | Against fear source | - |
| Prone | On attacks | Melee: Advantage / Ranged: Disadvantage |
| Blinded | On attacks | Advantage |

### Condition Severity Ranking

From least to most severe impact on combat effectiveness:

1. **Marked** - Tactical pressure only
2. **Slowed** - Reduces options
3. **Frightened** - Limits targeting, prevents approach
4. **Prone** - Mixed defensive/vulnerable
5. **Vulnerable** - Direct combat penalty
6. **Hidden** - Beneficial condition (for holder)
7. **Restrained** - Cannot move, vulnerable to attacks
8. **Blinded** - Severe attack/defense penalties
9. **Incapacitated** - Cannot participate

---

## GM Guidance for Conditions

### Applying Conditions Narratively

Conditions should emerge from the fiction:
- "The wraith's icy grip tightens around your arm—you're **Restrained** until you break free."
- "The demon's presence fills you with primal terror. You're **Frightened** of it."
- "As your Stress slots fill, exhaustion and fear overwhelm you—you're now **Vulnerable**."

### Condition as Consequence

Conditions work well as Fear roll consequences:
- Failure with Fear while navigating danger: Prone or Restrained
- Failure with Fear against terrifying foe: Frightened
- Failure with Fear in chaotic environment: Blinded or Slowed

### Tracking Conditions

In encounter templates, list conditions in the Conditions column:
```
| PC    | HP       | Stress   | Hope     | Conditions          |
|-------|----------|----------|----------|---------------------|
| Kira  | ●●○○○○   | ●○○○○○   | ●●●○○○   | -                   |
| Thorn | ○○○○○○   | ●●●●●● | ●●○○○○   | Vulnerable          |
| Sage  | ●○○○○○   | ●●○○○○   | ●●●●○○   | Frightened (Wraith) |
```

---

*Conditions derived from the Daggerheart SRD by Darrington Press, used under the DPCGL.*
