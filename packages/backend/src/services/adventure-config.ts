export interface AdventureConfig {
  system: string | null;
  warning?: string;
}

/**
 * Extracts the `system` field from adventure.md YAML frontmatter.
 * Returns system: null on any parse failure (REQ-SYS-4a).
 * Uses regex-based parsing since the frontmatter has a single mechanical field.
 */
export function parseAdventureConfig(content: string): AdventureConfig {
  if (!content || !content.startsWith("---")) {
    return { system: null };
  }

  // Find closing delimiter: must be on its own line after the opening ---
  const afterOpening = content.indexOf("\n");
  if (afterOpening === -1) {
    return { system: null };
  }

  const rest = content.slice(afterOpening + 1);
  const closingIndex = rest.indexOf("\n---");
  if (closingIndex === -1) {
    return {
      system: null,
      warning: "Malformed frontmatter: missing closing delimiter",
    };
  }

  const frontmatter = rest.slice(0, closingIndex);

  // Extract system field via regex. Handles `system: value` and `system: "value"`
  const match = frontmatter.match(/^system:\s*"?([^"\n]*)"?\s*$/m);
  if (!match || !match[1] || match[1].trim() === "") {
    return { system: null };
  }

  return { system: match[1].trim() };
}
