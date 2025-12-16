import { useEffect, useRef } from "react";
import type {
  NarrativeEntry as NarrativeEntryType,
  HistorySummary as HistorySummaryType,
} from "../types/protocol";
import { NarrativeEntry } from "./NarrativeEntry";
import { HistorySummary } from "./HistorySummary";
import "./NarrativeLog.css";

interface NarrativeLogProps {
  entries: NarrativeEntryType[];
  streamingContent?: {
    messageId: string;
    text: string;
  };
  isStreaming?: boolean;
  /** Summary of previously archived history entries */
  summary?: HistorySummaryType | null;
}

export function NarrativeLog({ entries, streamingContent, summary }: NarrativeLogProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousEntriesLengthRef = useRef(entries.length);
  const previousStreamingTextRef = useRef(streamingContent?.text);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    const hasNewEntry = entries.length > previousEntriesLengthRef.current;
    const hasNewStreamingText =
      streamingContent?.text !== previousStreamingTextRef.current;

    if (hasNewEntry || hasNewStreamingText) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }

    previousEntriesLengthRef.current = entries.length;
    previousStreamingTextRef.current = streamingContent?.text;
  }, [entries.length, streamingContent?.text]);

  return (
    <div
      ref={scrollContainerRef}
      data-testid="narrative-log"
      className="narrative-log"
    >
      {entries.length === 0 && !streamingContent && !summary ? (
        <div className="narrative-log__placeholder">
          No narrative entries yet. Start your adventure!
        </div>
      ) : (
        <>
          {summary && <HistorySummary summary={summary} />}
          {entries.map((entry, index) => {
            // Check if this entry is currently streaming
            const isStreamingEntry =
              streamingContent?.messageId === entry.id &&
              index === entries.length - 1;

            return (
              <NarrativeEntry
                key={entry.id}
                entry={entry}
                isStreaming={isStreamingEntry}
                streamingText={isStreamingEntry ? streamingContent.text : undefined}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
