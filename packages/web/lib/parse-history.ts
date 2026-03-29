export interface HistoryMessage {
  role: "player" | "gm";
  body: string;
}

/**
 * Parse history.md content into Player/GM message blocks.
 * History format: paragraphs separated by blank lines,
 * each starting with **Player:** or **GM:** prefix.
 */
export function parseHistory(history: string): HistoryMessage[] {
  if (!history.trim()) return [];

  const blocks = history.split(/\n\n+/);
  const messages: HistoryMessage[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("**Player:**")) {
      messages.push({
        role: "player",
        body: trimmed.replace(/^\*\*Player:\*\*\s*/, ""),
      });
    } else if (trimmed.startsWith("**GM:**")) {
      messages.push({
        role: "gm",
        body: trimmed.replace(/^\*\*GM:\*\*\s*/, ""),
      });
    } else {
      // Continuation of previous message (no label prefix)
      if (messages.length > 0) {
        messages[messages.length - 1].body += "\n\n" + trimmed;
      }
    }
  }

  return messages;
}
