import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NarrativeEntry as NarrativeEntryType } from "../types/protocol";
import "./NarrativeEntry.css";

interface NarrativeEntryProps {
  entry: NarrativeEntryType;
  isStreaming?: boolean;
  streamingText?: string;
}

export function NarrativeEntry({
  entry,
  isStreaming = false,
  streamingText,
}: NarrativeEntryProps) {
  const isPlayerInput = entry.type === "player_input";
  const displayContent = isStreaming ? streamingText : entry.content;

  return (
    <div
      className={`narrative-entry ${isPlayerInput ? "narrative-entry--player" : "narrative-entry--gm"}`}
    >
      <div className="narrative-entry__header">
        {isPlayerInput ? "You" : "GM"}
        <span className="narrative-entry__timestamp">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="narrative-entry__content">
        {isPlayerInput ? (
          <span className="narrative-entry__content--player">{displayContent}</span>
        ) : (
          <Markdown remarkPlugins={[remarkGfm]}>{displayContent ?? ""}</Markdown>
        )}
        {isStreaming && <span className="streaming-cursor" />}
      </div>
    </div>
  );
}
