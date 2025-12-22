# LLM Integration Summary — Daggerheart

## Purpose
This document summarizes design insights from the discussion on integrating a Large Language Model (LLM) as a GM for **Daggerheart**, with emphasis on why and how keyword-based systems can outperform rules-heavy systems *when properly constrained*.

---

## Core Insight
The effectiveness of an RPG system with an LLM GM is not determined by whether it is rules-heavy or rules-light, but by **where interpretive authority lives**.

- **d20 systems** externalize authority into explicit procedures and tables.
- **Daggerheart / FATE-style systems** internalize authority into negotiated interpretation.

LLMs excel at interpretation and language, but are weak at maintaining long-term consistency unless explicitly guided. Therefore, rules-light systems can feel *better* with an LLM **only if ambiguity is front-loaded and then constrained**.

---

## Why d20 Works with LLMs
Despite being mechanically complex, d20 systems integrate well with LLMs because:
- Most situations resolve into structured steps (roll → compare → outcome).
- The LLM acts primarily as a lookup and narrator.
- Procedural rigidity compensates for model inconsistency.

However, this comes with high overhead and brittle rule recall.

---

## Why Keyword Systems Align with LLMs
Keyword-based systems (Experiences, Aspects, Traits):
- Use natural language semantics.
- Rely on judgment calls and conversation.
- Match the LLM’s strengths in analogy, explanation, and narrative flow.

This produces smoother, more human-feeling play *moment to moment*.

---

## Primary Failure Mode: Authority Drift
Without constraints, LLMs will gradually expand the scope of keywords to remain helpful.

Example:
> "Battle-hardened" → fear resistance → leadership → emotional detachment → trauma insight

Each step is plausible, but the aggregate result is **trait inflation**.

Rules-light systems assume a human GM’s restraint. An LLM requires explicit substitutes for that restraint.

---

## Design Principle
### **Consistency > Plausibility**

This must be operationalized, not merely stated.

The LLM must be instructed to:
- Prefer prior rulings over new interpretations.
- Default to *not* applying an Experience when scope is unclear.
- Ask for clarification rather than stretching meaning.

LLMs need explicit permission to say **no**.

---

## Load-Bearing Requirement: Experience Constraints at Character Creation

Experiences must be bounded at creation time. Without this, semantic creep is inevitable.

Each Experience should include at least the following fields:

### 1. Narrative Origin
Specific fictional source of the Experience.

> *Example:* Veteran of three border wars; survived prolonged trench fighting.

Anchors interpretation in lived events, not vibes.

---

### 2. Positive Scope (Applies When)
Concrete fictional triggers.

> *Example:* Imminent violence, battlefield pressure, reading enemy intent in combat.

These establish the center of gravity for interpretation.

---

### 3. Explicit Exclusions (Does Not Apply When)
This is critical.

> *Example:* Social intimidation outside combat, non-violent emotional stress, long-term strategy.

Exclusions prevent scope expansion more effectively than inclusions alone.

---

## System Prompt Requirements (Conceptual)
The LLM GM should be instructed to:

- Treat Experiences as **bounded permissions**, not general traits.
- Never infer new applications beyond stated scope.
- Track precedent and reuse prior rulings.
- Favor denial over semantic stretching.
- Pause and ask when applicability is ambiguous.

This creates a conservative interpretive posture that stabilizes play.

---

## Why Daggerheart Is a Strong Fit
Daggerheart sits between d20 and FATE:

- Keywords with narrative weight
- Structured moves and fictional triggers
- Emotional and narrative economies

With constrained Experiences, it avoids FATE’s free-floating drift while shedding d20’s mechanical brittleness.

---

## High-Level Reframe
This is not "Daggerheart with an LLM GM".

It is:
> **A rules-light system where ambiguity is resolved early and then frozen.**

That inversion is what makes LLM-led play stable and satisfying.

---

## Next Possible Extensions
- Standardized template for LLM-safe Experiences
- Minimal, enforceable system prompt language
- Stress-testing edge cases (social pressure, fear, moral conflict)

