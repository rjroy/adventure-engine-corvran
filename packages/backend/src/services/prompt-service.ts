export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
  systemBootstrap: string | null;
  concept: string | null;
  compactionEnabled?: boolean;
}

/**
 * Assembles the system prompt per REQ-MVP-12 and REQ-SYS-22.
 * Pure function, no I/O. Takes pre-read file contents.
 *
 * Section order:
 * 1. Identity
 * 2. Principles (player agency)
 * 3. Adventure concept (conditional, broad context)
 * 4. Adventure state (character + world, with absence notes)
 * 5. Onboarding (conditional, only when character or world is missing)
 * 6. Conversation history (if exists)
 * 7. Instructions
 */
export function assembleSystemPrompt(state: AdventureState): string {
  const sections: string[] = [];

  // 1. Identity
  let identity = "# Identity\n\nYou are the Game Master for a tabletop RPG adventure.";
  if (state.systemBootstrap) {
    identity += "\n\n" + state.systemBootstrap;
  }
  sections.push(identity);

  // 2. Principles
  sections.push(
    "# Principles\n\n" +
    "Player agency is sacred. Never narrate player actions or decisions. " +
    "Describe the world; the player describes their character."
  );

  // 3. Adventure concept (broad context, before specific state)
  if (state.concept) {
    sections.push(`## Adventure Concept\n\n${state.concept}`);
  }

  // 4. Adventure state
  const characterSection = state.character !== null
    ? `## Character\n\n${state.character}`
    : "## Character\n\nNo character has been created yet.";

  const worldSection = state.world !== null
    ? `## World\n\n${state.world}`
    : "## World\n\nNo world has been created yet.";

  sections.push(`# Adventure State\n\n${characterSection}\n\n${worldSection}`);

  // 5. Onboarding (conditional)
  const missingCharacter = state.character === null;
  const missingWorld = state.world === null;

  if (!state.systemBootstrap && (missingCharacter || missingWorld)) {
    let missing: string;
    if (missingCharacter && missingWorld) {
      missing = "character or world";
    } else if (missingCharacter) {
      missing = "character";
    } else {
      missing = "world";
    }

    sections.push(
      "# Onboarding\n\n" +
      `The player hasn't set up a ${missing} yet. ` +
      "You can help them create one through conversation. " +
      "Ask what kind of adventure they want to play, then guide character creation and world building. " +
      "Let the player drive the choices.\n\n" +
      "When creating a character, write both a bootstrap summary to `character.md` " +
      "(identity, short description, pointer to full sheet) and a full character sheet " +
      "to `characters/<name>.md`.\n\n" +
      "When creating the world, write an index to `world.md` " +
      "(orientation, major powers, active threats, directory of reference files) " +
      "and at least one reference file for the starting location in `locations/`."
    );
  }

  // 6. Conversation history
  if (state.history !== null) {
    sections.push(`# Conversation History\n\n${state.history}`);
  }

  // 7. Instructions
  sections.push(
    "# Instructions\n\n" +
    "Respond to the player's latest message. Use the dice tool for rolls and " +
    "available skills for rules lookup and GM techniques. When you roll dice or look up rules, " +
    "include the meaningful result in your narrative (e.g., \"You rolled 14 + 3 = 17, a success!\") " +
    "but not the raw tool invocation.\n\n" +
    "## File Tools\n\n" +
    "You have file tools (Read, Write, Edit, Glob, Grep) with access to the adventure directory.\n\n" +
    "The adventure directory uses a two-layer structure:\n\n" +
    "**Bootstrap files** (loaded into this prompt):\n" +
    "- `character.md` -- A summary of the player character. Not the full sheet.\n" +
    "- `world.md` -- An index of the world: orientation, active threats, and a directory of reference files.\n\n" +
    "**Reference files** (read on demand):\n" +
    "- Detailed content lives in typed subdirectories: `characters/`, `locations/`, `quests/`, and any other types the adventure needs.\n" +
    "- Each entry is a single file: `<type>/<name>.md` (e.g., `characters/sister-marne.md`, `locations/crossroads-inn.md`).\n" +
    "- Read reference files when you need detail. The index tells you what exists and where.\n\n" +
    "**When state changes:**\n" +
    "- Write or update the reference file in the appropriate directory.\n" +
    "- Update `world.md` to add or revise the index entry.\n" +
    "- If the player character changed, update `characters/<name>.md` (full sheet) and `character.md` (summary) if the change affects the summary.\n\n" +
    "**When introducing new elements:**\n" +
    "- Write a reference file: `<type>/<name>.md`\n" +
    "- Add an index entry to `world.md` with the path and a one-line description.\n" +
    "- Create a new type directory if nothing existing fits.\n\n" +
    "Do not modify `adventure.md` or `history.md` -- those are managed by the system."
  );

  if (state.compactionEnabled) {
    sections.push(
      "## History Compaction\n\n" +
      "You have a `compact_history` tool. Use it at natural pause points in the narrative: " +
      "after a major confrontation resolves, when the party travels to a new location, " +
      "when a significant conversation or negotiation concludes, or when the player takes a rest. " +
      "You don't need to use it at every pause. Use your judgment about when the story has " +
      "accumulated enough that a consolidation would help. When you use it, the current history " +
      "is archived and replaced with a narrative recap. Your next response should pick up " +
      "naturally from where the story left off."
    );
  }

  return sections.join("\n\n");
}
