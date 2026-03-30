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
});
