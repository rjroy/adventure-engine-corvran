export interface AdventureState {
  character: string | null;
  world: string | null;
  history: string | null;
}

/**
 * Assembles the system prompt per REQ-MVP-12.
 * Pure function, no I/O. Takes pre-read file contents.
 *
 * Section order:
 * 1. Identity
 * 2. Principles (player agency)
 * 3. Adventure state (character + world, with absence notes)
 * 4. Onboarding (conditional, only when character or world is missing)
 * 5. Conversation history (if exists)
 * 6. Instructions
 */
export function assembleSystemPrompt(state: AdventureState): string {
  const sections: string[] = [];

  // 1. Identity
  sections.push("# Identity\n\nYou are the Game Master for a tabletop RPG adventure.");

  // 2. Principles
  sections.push(
    "# Principles\n\n" +
    "Player agency is sacred. Never narrate player actions or decisions. " +
    "Describe the world; the player describes their character."
  );

  // 3. Adventure state
  const characterSection = state.character !== null
    ? `## Character\n\n${state.character}`
    : "## Character\n\nNo character has been created yet.";

  const worldSection = state.world !== null
    ? `## World\n\n${state.world}`
    : "## World\n\nNo world has been created yet.";

  sections.push(`# Adventure State\n\n${characterSection}\n\n${worldSection}`);

  // 4. Onboarding (conditional)
  const missingCharacter = state.character === null;
  const missingWorld = state.world === null;

  if (missingCharacter || missingWorld) {
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
      "Ask what kind of adventure they want to play, then use your skills " +
      "to guide character creation and world building. Let the player drive the choices."
    );
  }

  // 5. Conversation history
  if (state.history !== null) {
    sections.push(`# Conversation History\n\n${state.history}`);
  }

  // 6. Instructions
  sections.push(
    "# Instructions\n\n" +
    "Respond to the player's latest message. Use available skills for dice rolls, " +
    "rules lookup, and GM techniques. When you roll dice or look up rules, include the " +
    "meaningful result in your narrative (e.g., \"You rolled 14 + 3 = 17, a success!\") " +
    "but not the raw tool invocation."
  );

  return sections.join("\n\n");
}
