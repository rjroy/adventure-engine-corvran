export interface AdventureConfig {
  system: string | null;
  name: string | null;
  concept: string | null;
  warning?: string;
}

/**
 * Extracts system, name, and concept from adventure.md.
 * Frontmatter fields (system, name) come from YAML between --- delimiters.
 * Concept is the body text after the closing --- delimiter.
 * If no frontmatter exists, the entire content is treated as concept.
 */
export function parseAdventureConfig(content: string): AdventureConfig {
  if (!content || !content.startsWith("---")) {
    const trimmed = content?.trim() || null;
    return { system: null, name: null, concept: trimmed || null };
  }

  // Find closing delimiter: must be on its own line after the opening ---
  const afterOpening = content.indexOf("\n");
  if (afterOpening === -1) {
    return { system: null, name: null, concept: null };
  }

  const rest = content.slice(afterOpening + 1);
  const closingIndex = rest.indexOf("\n---");
  if (closingIndex === -1) {
    return {
      system: null,
      name: null,
      concept: null,
      warning: "Malformed frontmatter: missing closing delimiter",
    };
  }

  const frontmatter = rest.slice(0, closingIndex);

  // Extract system field (strip optional double or single quotes)
  const systemMatch = frontmatter.match(/^system:\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\n]*))\s*$/m);
  const system = (systemMatch?.[1] ?? systemMatch?.[2] ?? systemMatch?.[3])?.trim() || null;

  // Extract name field (strip optional double or single quotes)
  const nameMatch = frontmatter.match(/^name:\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\n]*))\s*$/m);
  const name = (nameMatch?.[1] ?? nameMatch?.[2] ?? nameMatch?.[3])?.trim() || null;

  // Extract concept: everything after the closing --- delimiter
  const afterClosing = rest.slice(closingIndex + 4); // skip \n---
  const concept = afterClosing.trim() || null;

  return { system, name, concept };
}
