---
title: "Commission: Research: RPG Systems Optimized for LLM Game Masters"
date: 2026-03-29
status: abandoned
type: one-shot
tags: [commission]
worker: Verity
workerDisplayTitle: "Guild Pathfinder"
prompt: "Two-part research question. Go deep on both.\n\n## Part 1: Which existing RPG systems perform best with an LLM GM?\n\nThere are hundreds of tabletop RPG systems. LLMs have specific strengths (narrative generation, improvisation, tracking complex fiction, natural language understanding) and weaknesses (precise math, consistent state tracking across long sessions, spatial reasoning, remembering exact numbers over time).\n\nResearch which existing RPG systems align best with LLM strengths and minimize exposure to LLM weaknesses. Consider:\n\n- **Narrative-first systems** (Fate, Powered by the Apocalypse, Blades in the Dark, Fiasco, etc.) that use fiction-forward resolution\n- **Rules-light systems** (Lasers & Feelings, Honey Heist, Risus, etc.) that minimize mechanical tracking\n- **Daggerheart** specifically (this is one of our supported systems) and how its Hope/Fear mechanic and narrative focus might suit LLMs\n- **Solo RPG systems** (Ironsworn, Mythic GME, etc.) that were already designed for GM-less or solo play\n- **Story games** that blur the line between RPG and collaborative fiction\n- **Diceless systems** (Amber, Nobilis) that remove randomness entirely\n\nFor each category, assess: How much mechanical state does the GM need to track? How much is narrative vs. arithmetic? How well does the resolution mechanic survive LLM imprecision? How much of the GM's job is \"things LLMs are good at\" vs. \"things LLMs struggle with\"?\n\n## Part 2: Could you design an RPG system specifically for LLM GMs?\n\nThis is the speculative part. If you were designing a tabletop RPG from scratch, knowing that the GM would always be an LLM, what would you do differently?\n\nConsider:\n- **Resolution mechanics**: What replaces dice rolls when the GM can evaluate narrative probability? Is there a role for structured randomness that doesn't require precise math?\n- **State management**: What game state should be explicit (written down, tracked) vs. implicit (held in the fiction)? LLMs lose context over long conversations. What does that mean for session length, state serialization, recap mechanics?\n- **Player agency**: Traditional RPGs use rules to constrain the GM and protect player agency. How does that work when the GM is an AI? What new affordances or constraints are needed?\n- **World consistency**: LLMs hallucinate. Traditional RPGs use sourcebooks and stat blocks to keep the world consistent. What's the equivalent when the GM has perfect recall of a document but imperfect recall of what it said three turns ago?\n- **Narrative structure**: LLMs are good at following genre conventions and story beats. Could the rule system leverage this? Mechanical triggers based on narrative pacing rather than hit points?\n- **The role of the player**: In a 1-on-1 LLM RPG, the player has no party. How does game design change for solo play with an AI GM? Is there a way to handle multiple players?\n\nLook for any existing academic work, blog posts, game design discussions, or indie RPG experiments that have explored this space. The AI-as-GM concept isn't brand new; people have been experimenting. Find out what they've learned.\n\n## Output\n\nWrite the research document to `.lore/research/llm-optimized-rpg-systems.md`. Structure it clearly with both parts, cite sources where you find them, and flag the most promising directions for further exploration. This could eventually inform the design of a custom RPG system for the Adventure Engine."
dependencies: []
linked_artifacts: []

resource_overrides:
  model: claude-sonnet-4-6

activity_timeline:
  - timestamp: 2026-03-29T21:09:00.371Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-03-29T21:09:07.530Z
    event: status_abandoned
    reason: "Invalid model ID in resource overrides. Will re-create with correct model."
    from: "pending"
    to: "abandoned"
current_progress: ""
projectName: corvran
---
