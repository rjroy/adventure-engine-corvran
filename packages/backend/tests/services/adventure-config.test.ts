import { describe, expect, it } from "bun:test";
import { parseAdventureConfig } from "../../src/services/adventure-config.js";

describe("parseAdventureConfig", () => {
  it("extracts system: daggerheart from valid frontmatter", () => {
    const content = `---
system: daggerheart
---

# My Adventure
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBe("daggerheart");
    expect(result.warning).toBeUndefined();
  });

  it("extracts system: d20 from valid frontmatter", () => {
    const content = `---
system: d20
---
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBe("d20");
  });

  it("returns system: null when content has no frontmatter", () => {
    const content = `# Just a markdown file

No frontmatter here.
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
    expect(result.warning).toBeUndefined();
  });

  it("returns system: null when frontmatter has no system field", () => {
    const content = `---
title: My Adventure
---

Some body text.
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
  });

  it("returns system: null for empty string input", () => {
    const result = parseAdventureConfig("");
    expect(result.system).toBeNull();
    expect(result.name).toBeNull();
    expect(result.concept).toBeNull();
  });

  it("returns system: null with warning for malformed frontmatter (missing closing delimiter)", () => {
    const content = `---
system: daggerheart
this never closes
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain("closing delimiter");
  });

  it("handles frontmatter with extra fields, extracting only system", () => {
    const content = `---
title: The Siege of Thornwall
system: daggerheart
description: A grand adventure
---
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBe("daggerheart");
  });

  it("handles system value with quotes", () => {
    const content = `---
system: "d20"
---
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBe("d20");
  });

  it("returns system: null when system field is empty", () => {
    const content = `---
system:
---
`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
  });

  it("handles frontmatter with only opening delimiter on first line", () => {
    const content = "---";
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
  });

  // Phase 2: name and concept extraction

  it("extracts name from frontmatter", () => {
    const content = `---
name: The Lost Mines
system: d20
---
`;
    const result = parseAdventureConfig(content);
    expect(result.name).toBe("The Lost Mines");
    expect(result.system).toBe("d20");
  });

  it("extracts name with quotes", () => {
    const content = `---
name: "Dragon's Lair"
---
`;
    const result = parseAdventureConfig(content);
    expect(result.name).toBe("Dragon's Lair");
  });

  it("returns null name when name field is missing", () => {
    const content = `---
system: d20
---
`;
    const result = parseAdventureConfig(content);
    expect(result.name).toBeNull();
  });

  it("extracts concept from body text after closing delimiter", () => {
    const content = `---
system: daggerheart
---

A tale of courage and betrayal in the frozen north.
`;
    const result = parseAdventureConfig(content);
    expect(result.concept).toBe("A tale of courage and betrayal in the frozen north.");
  });

  it("returns null concept when body is empty", () => {
    const content = `---
system: d20
---
`;
    const result = parseAdventureConfig(content);
    expect(result.concept).toBeNull();
  });

  it("returns null concept when body is only whitespace", () => {
    const content = `---
system: d20
---


`;
    const result = parseAdventureConfig(content);
    expect(result.concept).toBeNull();
  });

  it("extracts both name and concept together", () => {
    const content = `---
name: Siege of Thornwall
system: daggerheart
---

The ancient fortress of Thornwall stands besieged by shadow forces.
`;
    const result = parseAdventureConfig(content);
    expect(result.name).toBe("Siege of Thornwall");
    expect(result.system).toBe("daggerheart");
    expect(result.concept).toBe("The ancient fortress of Thornwall stands besieged by shadow forces.");
  });

  it("treats entire content as concept when no frontmatter exists", () => {
    const content = `A freeform adventure about pirates and treasure.`;
    const result = parseAdventureConfig(content);
    expect(result.system).toBeNull();
    expect(result.name).toBeNull();
    expect(result.concept).toBe("A freeform adventure about pirates and treasure.");
  });

  it("handles multiline concept text", () => {
    const content = `---
system: d20
---

A brave warrior sets out on a quest.

The road ahead is long and dangerous.
Many challenges await.
`;
    const result = parseAdventureConfig(content);
    expect(result.concept).toBe(
      "A brave warrior sets out on a quest.\n\nThe road ahead is long and dangerous.\nMany challenges await.",
    );
  });

  it("handles frontmatter with no body text (only delimiters)", () => {
    const content = `---
name: Empty Adventure
---`;
    const result = parseAdventureConfig(content);
    expect(result.name).toBe("Empty Adventure");
    expect(result.concept).toBeNull();
  });
});
