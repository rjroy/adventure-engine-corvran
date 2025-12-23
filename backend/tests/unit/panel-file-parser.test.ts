// Panel File Parser Service Tests
// Unit tests for panel markdown file parsing and validation

import { describe, test, expect } from "bun:test";
import {
  parsePanelFile,
  derivePanelId,
  isPanelPath,
  PanelFrontmatterSchema,
  PanelFileErrors,
  MAX_TITLE_LENGTH,
  DEFAULT_PRIORITY,
} from "../../src/services/panel-file-parser";
import { MAX_ID_LENGTH } from "../../src/services/panel-manager";

describe("PanelFrontmatterSchema", () => {
  describe("title validation (REQ-F-4)", () => {
    test("accepts valid title", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Weather Status",
        position: "sidebar",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Weather Status");
      }
    });

    test("rejects empty title", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "",
        position: "sidebar",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot be empty");
      }
    });

    test("rejects missing title", () => {
      const result = PanelFrontmatterSchema.safeParse({
        position: "sidebar",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("title");
      }
    });

    test("rejects title longer than 64 chars", () => {
      const longTitle = "a".repeat(MAX_TITLE_LENGTH + 1);
      const result = PanelFrontmatterSchema.safeParse({
        title: longTitle,
        position: "sidebar",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("64");
      }
    });

    test("accepts title at exactly 64 chars", () => {
      const maxTitle = "a".repeat(MAX_TITLE_LENGTH);
      const result = PanelFrontmatterSchema.safeParse({
        title: maxTitle,
        position: "sidebar",
      });
      expect(result.success).toBe(true);
    });

    test("maximum title length is 64 chars", () => {
      expect(MAX_TITLE_LENGTH).toBe(64);
    });
  });

  describe("position validation (REQ-F-5)", () => {
    test("accepts sidebar position", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe("sidebar");
      }
    });

    test("accepts header position", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "header",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe("header");
      }
    });

    test("accepts overlay position", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "overlay",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe("overlay");
      }
    });

    test("rejects invalid position", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "footer",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing position", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("position");
      }
    });
  });

  describe("priority validation (REQ-F-6)", () => {
    test("accepts low priority", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
        priority: "low",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("low");
      }
    });

    test("accepts medium priority", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
        priority: "medium",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("medium");
      }
    });

    test("accepts high priority", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
        priority: "high",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("high");
      }
    });

    test("rejects invalid priority", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
        priority: "critical",
      });
      expect(result.success).toBe(false);
    });

    test("defaults to medium when priority omitted", () => {
      const result = PanelFrontmatterSchema.safeParse({
        title: "Test",
        position: "sidebar",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("medium");
      }
    });

    test("default priority constant is medium", () => {
      expect(DEFAULT_PRIORITY).toBe("medium");
    });
  });
});

describe("parsePanelFile()", () => {
  describe("valid files", () => {
    test("parses file with all frontmatter fields", () => {
      const content = `---
title: Weather Status
position: sidebar
priority: high
---
Current conditions: Clear skies
Temperature: 72F`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frontmatter.title).toBe("Weather Status");
        expect(result.data.frontmatter.position).toBe("sidebar");
        expect(result.data.frontmatter.priority).toBe("high");
        expect(result.data.body).toContain("Clear skies");
        expect(result.data.body).toContain("Temperature: 72F");
      }
    });

    test("parses file with only required fields", () => {
      const content = `---
title: Status Panel
position: header
---
Status: OK`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frontmatter.title).toBe("Status Panel");
        expect(result.data.frontmatter.position).toBe("header");
        expect(result.data.frontmatter.priority).toBe("medium"); // default
        expect(result.data.body).toBe("Status: OK");
      }
    });

    test("parses file with empty body", () => {
      const content = `---
title: Empty Panel
position: overlay
---
`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe("");
      }
    });

    test("parses file with markdown body", () => {
      const content = `---
title: Quest Log
position: sidebar
---
# Active Quests

- **Find the Lost Artifact**
- Explore the Dungeon

## Completed
1. Talk to the village elder`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toContain("# Active Quests");
        expect(result.data.body).toContain("**Find the Lost Artifact**");
        expect(result.data.body).toContain("## Completed");
      }
    });

    test("trims body whitespace", () => {
      const content = `---
title: Test
position: sidebar
---

  Content with extra whitespace

`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toBe("Content with extra whitespace");
      }
    });
  });

  describe("frontmatter errors", () => {
    test("rejects file without frontmatter delimiters", () => {
      const content = `title: No Frontmatter
position: sidebar

Just plain content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelFileErrors.NO_FRONTMATTER);
      }
    });

    test("rejects file with empty frontmatter", () => {
      const content = `---
---
Content only`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelFileErrors.NO_FRONTMATTER);
      }
    });

    test("rejects file with missing title", () => {
      const content = `---
position: sidebar
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("title");
      }
    });

    test("rejects file with missing position", () => {
      const content = `---
title: Test Panel
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("position");
      }
    });

    test("rejects file with title too long", () => {
      const longTitle = "a".repeat(MAX_TITLE_LENGTH + 1);
      const content = `---
title: ${longTitle}
position: sidebar
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("title");
        expect(result.error).toContain("64");
      }
    });

    test("rejects file with invalid position", () => {
      const content = `---
title: Test
position: bottom
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("position");
      }
    });

    test("rejects file with invalid priority", () => {
      const content = `---
title: Test
position: sidebar
priority: urgent
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("priority");
      }
    });

    test("error includes specific field name", () => {
      const content = `---
title: Test
position: invalid-pos
---
Content`;

      const result = parsePanelFile(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Error should mention the field path
        expect(result.error).toMatch(/position/i);
      }
    });
  });

  describe("edge cases", () => {
    test("handles file with only opening delimiter", () => {
      // gray-matter is lenient and parses files without closing delimiter
      // as valid frontmatter (treats EOF as implicit closing)
      const content = `---
title: Test
position: sidebar`;

      const result = parsePanelFile(content);

      // gray-matter parses this successfully, so validation should pass
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frontmatter.title).toBe("Test");
        expect(result.data.frontmatter.position).toBe("sidebar");
        expect(result.data.body).toBe("");
      }
    });

    test("handles completely empty file", () => {
      const result = parsePanelFile("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelFileErrors.NO_FRONTMATTER);
      }
    });

    test("handles file with only whitespace", () => {
      const result = parsePanelFile("   \n\n   ");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(PanelFileErrors.NO_FRONTMATTER);
      }
    });

    test("handles numeric values for string fields", () => {
      const content = `---
title: 12345
position: sidebar
---
Content`;

      const result = parsePanelFile(content);

      // YAML may parse "12345" as a number, Zod should reject it
      expect(result.success).toBe(false);
    });
  });
});

describe("derivePanelId()", () => {
  describe("valid filenames (REQ-F-2, REQ-F-3)", () => {
    test("extracts ID from simple filename", () => {
      const result = derivePanelId("weather.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("weather");
      }
    });

    test("extracts ID from filename with hyphens", () => {
      const result = derivePanelId("weather-status.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("weather-status");
      }
    });

    test("extracts ID from full path", () => {
      const result = derivePanelId("/players/kael/panels/weather-status.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("weather-status");
      }
    });

    test("extracts ID from relative path", () => {
      const result = derivePanelId("players/kael/panels/quest-log.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("quest-log");
      }
    });

    test("handles uppercase letters", () => {
      const result = derivePanelId("WeatherStatus.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("WeatherStatus");
      }
    });

    test("handles numbers", () => {
      const result = derivePanelId("panel-123.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("panel-123");
      }
    });

    test("handles mixed case and numbers", () => {
      const result = derivePanelId("Quest-Log-2024.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("Quest-Log-2024");
      }
    });

    test("accepts ID at exactly 32 characters", () => {
      const maxId = "a".repeat(MAX_ID_LENGTH);
      const result = derivePanelId(`${maxId}.md`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe(maxId);
        expect(result.id.length).toBe(32);
      }
    });
  });

  describe("invalid filenames", () => {
    test("rejects filename with underscores", () => {
      const result = derivePanelId("weather_status.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("weather_status");
        expect(result.error).toContain("alphanumeric");
      }
    });

    test("rejects filename with spaces", () => {
      const result = derivePanelId("weather status.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("alphanumeric");
      }
    });

    test("rejects filename with dots", () => {
      const result = derivePanelId("weather.status.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("alphanumeric");
      }
    });

    test("rejects filename with special characters", () => {
      const invalidFilenames = [
        "panel@1.md",
        "panel#1.md",
        "panel$1.md",
        "panel!1.md",
        "panel&1.md",
      ];

      for (const filename of invalidFilenames) {
        const result = derivePanelId(filename);
        expect(result.success).toBe(false);
      }
    });

    test("rejects ID longer than 32 characters", () => {
      const longId = "a".repeat(MAX_ID_LENGTH + 1);
      const result = derivePanelId(`${longId}.md`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("33");
        expect(result.error).toContain("max 32");
      }
    });

    test("rejects empty filename", () => {
      const result = derivePanelId(".md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("empty");
      }
    });

    test("rejects path with no filename", () => {
      const result = derivePanelId("/players/kael/panels/");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("empty");
      }
    });
  });

  describe("edge cases", () => {
    test("handles filename without .md extension", () => {
      const result = derivePanelId("weather-status");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("weather-status");
      }
    });

    test("handles Windows-style paths", () => {
      const result = derivePanelId("players\\kael\\panels\\weather.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe("weather");
      }
    });
  });
});

describe("isPanelPath()", () => {
  describe("matching paths", () => {
    test("matches simple panel path", () => {
      const result = isPanelPath("players/kael/panels/weather.md", "players/kael");
      expect(result).toBe(true);
    });

    test("matches absolute panel path", () => {
      const result = isPanelPath(
        "/home/user/project/players/kael/panels/weather.md",
        "players/kael"
      );
      expect(result).toBe(true);
    });

    test("matches with trailing slash in playerRef", () => {
      const result = isPanelPath("players/kael/panels/weather.md", "players/kael/");
      expect(result).toBe(true);
    });

    test("matches different player refs", () => {
      expect(isPanelPath("players/alice/panels/quest.md", "players/alice")).toBe(true);
      expect(isPanelPath("players/bob-smith/panels/inventory.md", "players/bob-smith")).toBe(true);
    });

    test("matches with hyphenated panel filename", () => {
      const result = isPanelPath(
        "players/kael/panels/weather-status.md",
        "players/kael"
      );
      expect(result).toBe(true);
    });
  });

  describe("non-matching paths", () => {
    test("rejects path in different player directory", () => {
      const result = isPanelPath("players/alice/panels/weather.md", "players/bob");
      expect(result).toBe(false);
    });

    test("rejects path not in panels directory", () => {
      const result = isPanelPath("players/kael/sheet.md", "players/kael");
      expect(result).toBe(false);
    });

    test("rejects path in nested panels subdirectory", () => {
      const result = isPanelPath(
        "players/kael/panels/nested/weather.md",
        "players/kael"
      );
      expect(result).toBe(false);
    });

    test("rejects path without .md extension", () => {
      const result = isPanelPath("players/kael/panels/weather.txt", "players/kael");
      expect(result).toBe(false);
    });

    test("rejects path with partial player ref match", () => {
      const result = isPanelPath("players/kael-thouls/panels/weather.md", "players/kael");
      expect(result).toBe(false);
    });

    test("rejects panel path in different root", () => {
      const result = isPanelPath("worlds/eldoria/panels/weather.md", "players/kael");
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles Windows-style path separators", () => {
      const result = isPanelPath(
        "players\\kael\\panels\\weather.md",
        "players/kael"
      );
      expect(result).toBe(true);
    });

    test("handles mixed path separators", () => {
      const result = isPanelPath(
        "players/kael\\panels/weather.md",
        "players/kael"
      );
      expect(result).toBe(true);
    });

    test("handles playerRef without trailing slash", () => {
      const result = isPanelPath("players/kael/panels/weather.md", "players/kael");
      expect(result).toBe(true);
    });
  });
});

describe("error message formatting", () => {
  test("NO_FRONTMATTER is descriptive", () => {
    expect(PanelFileErrors.NO_FRONTMATTER).toContain("YAML frontmatter");
    expect(PanelFileErrors.NO_FRONTMATTER).toContain("---");
  });

  test("INVALID_ID_FORMAT includes the invalid ID", () => {
    const error = PanelFileErrors.INVALID_ID_FORMAT("bad_id");
    expect(error).toContain("bad_id");
    expect(error).toContain("alphanumeric");
  });

  test("ID_TOO_LONG includes actual and max length", () => {
    const error = PanelFileErrors.ID_TOO_LONG("a".repeat(35), 35);
    expect(error).toContain("35");
    expect(error).toContain("max 32");
  });

  test("NOT_PANEL_PATH includes the path", () => {
    const error = PanelFileErrors.NOT_PANEL_PATH("/some/path.md");
    expect(error).toContain("/some/path.md");
    expect(error).toContain("panels directory");
  });

  test("FRONTMATTER_PARSE_ERROR includes the error message", () => {
    const error = PanelFileErrors.FRONTMATTER_PARSE_ERROR("Invalid YAML syntax");
    expect(error).toContain("Invalid YAML syntax");
    expect(error).toContain("frontmatter");
  });
});
