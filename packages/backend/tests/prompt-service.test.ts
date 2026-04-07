import { describe, test, expect } from "bun:test";
import { assembleSystemPrompt } from "../src/services/prompt-service";

describe("assembleSystemPrompt", () => {
  test("includes all sections in correct order with full state", () => {
    const prompt = assembleSystemPrompt({
      character: "# Thorin\nA dwarf warrior",
      world: "# Lost Mines\nA dangerous dungeon",
      history: "**Player:** Hello\n\n**GM:** Welcome!",
      systemBootstrap: null,
      concept: null,
    });

    // Verify section order by checking relative positions
    const identityIdx = prompt.indexOf("# Identity");
    const principlesIdx = prompt.indexOf("# Principles");
    const stateIdx = prompt.indexOf("# Adventure State");
    const historyIdx = prompt.indexOf("# Conversation History");
    const instructionsIdx = prompt.indexOf("# Instructions");

    expect(identityIdx).toBeGreaterThanOrEqual(0);
    expect(principlesIdx).toBeGreaterThan(identityIdx);
    expect(stateIdx).toBeGreaterThan(principlesIdx);
    expect(historyIdx).toBeGreaterThan(stateIdx);
    expect(instructionsIdx).toBeGreaterThan(historyIdx);

    // Should NOT include onboarding when both files exist
    expect(prompt).not.toContain("# Onboarding");

    // Should include character and world content
    expect(prompt).toContain("# Thorin");
    expect(prompt).toContain("# Lost Mines");
    expect(prompt).toContain("**Player:** Hello");
  });

  test("includes absence notes and onboarding when character is missing", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: "# Lost Mines\nA dungeon",
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("No character has been created yet.");
    expect(prompt).toContain("# Onboarding");
    expect(prompt).toContain("hasn't set up a character yet");
    expect(prompt).not.toContain("# Conversation History");
  });

  test("includes absence notes and onboarding when world is missing", () => {
    const prompt = assembleSystemPrompt({
      character: "# Thorin\nA dwarf",
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("No world has been created yet.");
    expect(prompt).toContain("# Onboarding");
    expect(prompt).toContain("hasn't set up a world yet");
  });

  test("includes both absence notes and combined onboarding when both missing", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("No character has been created yet.");
    expect(prompt).toContain("No world has been created yet.");
    expect(prompt).toContain("# Onboarding");
    expect(prompt).toContain("character or world");
  });

  test("omits history section when no history exists", () => {
    const prompt = assembleSystemPrompt({
      character: "# Thorin",
      world: "# Mines",
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).not.toContain("# Conversation History");
    // Instructions should still be present
    expect(prompt).toContain("# Instructions");
  });

  test("includes identity text", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("You are the Game Master for a tabletop RPG adventure.");
  });

  test("includes player agency principle", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("Player agency is sacred");
    expect(prompt).toContain("Never narrate player actions or decisions");
  });

  test("instructions reference dice tool and skills separately", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("Use the dice tool for rolls");
    expect(prompt).toContain("available skills for rules lookup");
  });

  test("instructions include file tool guidance", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("## File Tools");
    expect(prompt).toContain("character.md");
    expect(prompt).toContain("world.md");
    expect(prompt).toContain("two-layer structure");
    expect(prompt).toContain("Bootstrap files");
    expect(prompt).toContain("Reference files");
    expect(prompt).toContain("characters/");
    expect(prompt).toContain("locations/");
    expect(prompt).toContain("Do not modify `adventure.md` or `history.md`");
  });

  test("onboarding mentions writing to files", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("bootstrap summary to `character.md`");
    expect(prompt).toContain("full character sheet");
    expect(prompt).toContain("characters/<name>.md");
    expect(prompt).toContain("world.md");
    expect(prompt).toContain("locations/");
  });

  test("includes bootstrap content in Identity section when present", () => {
    const bootstrap = "You are running a Daggerheart game.\n\nUse Hope and Fear dice.";
    const prompt = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: bootstrap,
      concept: null,
    });

    // Bootstrap appears after the identity line, inside the Identity section
    const identitySection = prompt.split("# Principles")[0];
    expect(identitySection).toContain("You are the Game Master");
    expect(identitySection).toContain("You are running a Daggerheart game.");
    expect(identitySection).toContain("Use Hope and Fear dice.");
  });

  test("omits onboarding when bootstrap is present even if character/world missing", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: "You are running a Daggerheart game.",
      concept: null,
    });

    expect(prompt).not.toContain("# Onboarding");
  });

  test("shows onboarding when no bootstrap and character/world missing", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("# Onboarding");
  });

  test("includes Adventure Concept section when concept is present", () => {
    const prompt = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: "A dark fantasy adventure in a cursed kingdom",
    });

    expect(prompt).toContain("## Adventure Concept");
    expect(prompt).toContain("A dark fantasy adventure in a cursed kingdom");
  });

  test("omits Adventure Concept section when concept is null", () => {
    const prompt = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).not.toContain("## Adventure Concept");
  });

  test("concept appears after Principles and before Adventure State", () => {
    const prompt = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: "A pirate adventure on the high seas",
    });

    const principlesIdx = prompt.indexOf("# Principles");
    const conceptIdx = prompt.indexOf("## Adventure Concept");
    const stateIdx = prompt.indexOf("# Adventure State");

    expect(conceptIdx).toBeGreaterThan(principlesIdx);
    expect(stateIdx).toBeGreaterThan(conceptIdx);
  });

  test("concept, character, and world all appear in correct order", () => {
    const prompt = assembleSystemPrompt({
      character: "# Captain Hook",
      world: "# Neverland",
      history: null,
      systemBootstrap: null,
      concept: "A reimagining of Peter Pan as a horror story",
    });

    const conceptIdx = prompt.indexOf("A reimagining of Peter Pan");
    const characterIdx = prompt.indexOf("# Captain Hook");
    const worldIdx = prompt.indexOf("# Neverland");

    expect(conceptIdx).toBeGreaterThan(0);
    expect(characterIdx).toBeGreaterThan(conceptIdx);
    expect(worldIdx).toBeGreaterThan(characterIdx);
  });

  test("includes compact_history guidance when compactionEnabled is true (REQ-COMP-13)", () => {
    const prompt = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: null,
      compactionEnabled: true,
    });

    expect(prompt).toContain("## History Compaction");
    expect(prompt).toContain("compact_history");
    expect(prompt).toContain("natural pause points");
  });

  test("omits compact_history guidance when compactionEnabled is false or absent", () => {
    const withFalse = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: null,
      compactionEnabled: false,
    });
    expect(withFalse).not.toContain("## History Compaction");
    expect(withFalse).not.toContain("compact_history");

    const withOmitted = assembleSystemPrompt({
      character: "# Hero",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: null,
    });
    expect(withOmitted).not.toContain("## History Compaction");
    expect(withOmitted).not.toContain("compact_history");
  });

  test("file tool instructions describe two-layer convention (REQ-AFS-12)", () => {
    const prompt = assembleSystemPrompt({
      character: "# Character",
      world: "# World",
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    const fileToolsStart = prompt.indexOf("## File Tools");
    const nextSection = prompt.indexOf("## History Compaction");
    const fileToolsSection = nextSection > -1
      ? prompt.substring(fileToolsStart, nextSection)
      : prompt.substring(fileToolsStart);

    // Two-layer structure description
    expect(fileToolsSection).toContain("two-layer structure");

    // Bootstrap files section
    expect(fileToolsSection).toContain("Bootstrap files");
    expect(fileToolsSection).toContain("character.md");
    expect(fileToolsSection).toContain("summary of the player character");
    expect(fileToolsSection).toContain("world.md");
    expect(fileToolsSection).toContain("index of the world");

    // Reference files section
    expect(fileToolsSection).toContain("Reference files");
    expect(fileToolsSection).toContain("typed subdirectories");
    expect(fileToolsSection).toContain("<type>/<name>.md");
    expect(fileToolsSection).toContain("characters/sister-marne.md");
    expect(fileToolsSection).toContain("locations/crossroads-inn.md");

    // Read-on-demand guidance
    expect(fileToolsSection).toContain("Read reference files when you need detail");

    // Dual-update rules
    expect(fileToolsSection).toContain("When state changes");
    expect(fileToolsSection).toContain("Update `world.md`");

    // New element rules
    expect(fileToolsSection).toContain("When introducing new elements");
    expect(fileToolsSection).toContain("Add an index entry to `world.md`");

    // System file protection
    expect(fileToolsSection).toContain("Do not modify `adventure.md` or `history.md`");
  });

  test("prompt from mature adventure contains bootstrap content, not full reference data (REQ-AFS-1)", () => {
    // Simulate the-golden-age adventure structure:
    // Bootstrap character.md with pointer to full sheet
    const bootstrapCharacter =
      "# Dwig Ironfoot\n\n" +
      "A dwarf ranger with a sharp eye and sharper tongue.\n\n" +
      "Full character sheet: characters/dwig.md";

    // Bootstrap world.md with index, not full content
    const bootstrapWorld =
      "# The Golden Age\n\n" +
      "The prosperous kingdom of Valdris, where ancient magic flows through the land.\n\n" +
      "## Active Threats\n" +
      "- Shadow creatures emerging from the Deep Woods\n" +
      "- Political tension between the merchant houses\n\n" +
      "## Index\n" +
      "- characters/dwig.md -- The player character\n" +
      "- characters/sister-marne.md -- A mysterious cleric\n" +
      "- locations/crossroads-inn.md -- A neutral meeting ground\n" +
      "- locations/deep-woods.md -- Source of the shadows\n" +
      "- quests/shadow-investigation.md -- The immediate hook\n";

    const prompt = assembleSystemPrompt({
      character: bootstrapCharacter,
      world: bootstrapWorld,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    // Assert bootstrap content is present
    expect(prompt).toContain("Dwig Ironfoot");
    expect(prompt).toContain("Full character sheet: characters/dwig.md");
    expect(prompt).toContain("The Golden Age");
    expect(prompt).toContain("Active Threats");

    // Assert detailed NPC/location content is NOT present
    // (these would only appear in reference files, not the bootstrap)
    expect(prompt).not.toContain("sister-marne's background");
    expect(prompt).not.toContain("The inn keeper's secret");

    // Assert the prompt contains index directory structure
    expect(prompt).toContain("characters/sister-marne.md");
    expect(prompt).toContain("locations/crossroads-inn.md");
    expect(prompt).toContain("quests/shadow-investigation.md");
  });
});
