---
name: ap-combat
description: This skill should be used when the GM needs to handle Apocrypha combat situations, including resolving attacks against adversaries, dealing stress to adversaries, tracking adversary stress and defeat, spending Fear in combat, activating adversary Fear abilities, managing encounter state, or running player-rolls-everything combat encounters.
version: 1.0.0
---

# Apocrypha Combat Management Skill

Use this skill to run Apocrypha combat encounters. Apocrypha uses player-rolls-everything: the player always rolls, there are no adversary turns, and there is no initiative. Adversary actions come through failure consequences and GM Fear spending.

**Authoritative Source**: For complete rules, use the `ap-rules` skill.

## Player-Rolls-Everything

The player always rolls. There are three combat situations:

### Player Acts Against an Adversary

1. Player declares their action and which keyword applies
2. GM sets difficulty (or uses the adversary's tier difficulty)
3. Player rolls 2d12 + keyword modifier vs difficulty
4. On success: adversary takes stress. On failure: adversary responds.

### Player Acts While an Adversary Is Present

When the player isn't targeting the adversary directly (picking a lock while a dragon watches), the adversary acts through failure consequences. "You fail to pick the lock, and the dragon closes the distance." The GM may also spend Fear to inflict stress as part of failure narration.

### Adversary Forces a Reaction

When an adversary surprises the player or forces a reaction, the player still rolls. The GM narrates the threat, the player declares their response, and the roll determines the outcome. No situation bypasses the player's roll.

## Dealing Stress to Adversaries

When a player succeeds on an action against an adversary:

| Outcome | Stress Dealt |
|---------|-------------|
| Success with Hope | 2 stress |
| Success with Fear | 1 stress |

The GM chooses which adversary keyword takes stress based on the fiction. Stressed adversary keywords lose effectiveness: a bandit with "Pack Tactics (+2)" at 1 stress fights at effective +1.

### Adversary Defeat

When an adversary's total accumulated stress meets or exceeds its stress threshold, it is defeated. The fiction determines what defeat looks like: death, surrender, retreat, or incapacitation.

### Stress Tracking by Tier

- **Minor adversaries**: Aggregate stress pool. Single counter toward threshold.
- **Standard and major adversaries**: Per-keyword tracking. Stress allocated to specific keywords, each degrades independently, total across all keywords counts toward threshold.

## Dealing Stress to Players

Player keywords take stress through two channels:

### Fear Spending (Proactive)

The GM spends Fear tokens to stress player keywords at any time, not just during combat:

| Action | Cost |
|--------|------|
| Inflict light stress on a keyword | 1 Fear |
| Inflict deep stress on a keyword | 2 Fear |
| Activate adversary Fear ability | Cost per ability |

### Failure Consequences (Reactive)

When a player fails a roll, the GM may narrate stress on a keyword as part of the failure. This does not cost Fear. The roll itself is the cost.

### Choosing Targets

The GM chooses which keyword to stress based on narrative sense:
- Combat stress targets action-oriented keywords
- Social failure targets identity and relationship keywords
- The choice follows the fiction, not mechanical optimization

## Fear in Combat

Fear is the GM's combat fuel. Spend it actively.

### Fear Spending Options

| Action | Cost | Example |
|--------|------|---------|
| Light stress on keyword | 1 Fear | "The blow rattles your sword arm" |
| Deep stress on keyword | 2 Fear | "The dragon's flames wash over you, and your fire falters" |
| Complication | 1 Fear | "The bridge starts to crumble beneath you" |
| Adversary Fear ability | Varies | "The dragon unleashes its Breath of Ruin" |
| Scene interrupt | 3 Fear | "Reinforcements crash through the door" |

### When to Spend Fear

- After accumulating 6+ Fear, actively look for spending opportunities
- At dramatic turning points in the encounter
- When the fiction supports an adversary's special capability
- When the players seem too comfortable

Fear above 6 that isn't being spent is a missed narrative beat.

## Running an Encounter

### Setup

1. Establish the scene: positions, threats, environment
2. Note current Hope (on character sheet) and Fear (in `adventure.md` frontmatter)
3. Write adversary blocks into `world.md` for significant adversaries (see `ap-adversaries` skill)
4. Set up encounter tracking using `references/encounter-template.md`

### Flow

1. Player declares action and relevant keyword
2. GM declares difficulty and stakes
3. Player rolls (if the trigger is a trap or environment effect, the player rolls their reaction to it)
4. Resolve outcome: tokens, stress, narrative
5. If failure, narrate the adversary's response
6. If Fear available, consider spending on complications or abilities
7. Update stress counters and Fear pool
8. Repeat

### Ending Combat

Combat ends when:
- All adversaries are defeated (stress >= threshold)
- The player achieves their objective
- The player retreats or surrenders
- The situation changes fundamentally (critical result, narrative shift)

### After Combat

- Update adversary stress in `world.md` (for surviving adversaries)
- Update keyword stress on character sheet
- Update Fear in `adventure.md` frontmatter
- Note consequences and story developments

## Dice Tool Examples

**Attack roll** (keyword +2, adversary difficulty 14):
```json
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 2, "threshold": 14 }
```

**Defensive reaction** (keyword +1, difficulty 17):
```json
{ "groups": [{ "n": 1, "d": 12, "label": "hope" }, { "n": 1, "d": 12, "label": "fear" }], "modifier": 1, "threshold": 17 }
```

## Stress Conditions Reference

See `references/conditions.md` for stress conditions and their effects.

## Encounter Tracking

See `references/encounter-template.md` for a template to track encounter state.
