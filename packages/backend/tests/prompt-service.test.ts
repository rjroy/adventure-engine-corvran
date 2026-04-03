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
    expect(prompt).toContain("Do not modify `adventure.md` or `history.md`");
    expect(prompt).toContain("Files are the persistent record");
  });

  test("onboarding mentions writing to files", () => {
    const prompt = assembleSystemPrompt({
      character: null,
      world: null,
      history: null,
      systemBootstrap: null,
      concept: null,
    });

    expect(prompt).toContain("write them to the appropriate file");
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
});
