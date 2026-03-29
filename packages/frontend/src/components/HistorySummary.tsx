import type { HistorySummary as HistorySummaryType } from "../types/protocol";
import "./HistorySummary.css";

interface HistorySummaryProps {
  summary: HistorySummaryType;
}

/**
 * Displays a summary of previously compacted history entries.
 * Shown at the top of the narrative log when history has been archived.
 */
export function HistorySummary({ summary }: HistorySummaryProps) {
  const fromDate = new Date(summary.dateRange.from);
  const toDate = new Date(summary.dateRange.to);

  // Format date range for display
  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const dateRange =
    fromDate.toDateString() === toDate.toDateString()
      ? formatDate(fromDate)
      : `${formatDate(fromDate)} - ${formatDate(toDate)}`;

  return (
    <div className="history-summary" data-testid="history-summary">
      <div className="history-summary__header">
        <span className="history-summary__icon">&#128220;</span>
        <span className="history-summary__title">Previously in your adventure...</span>
      </div>
      <div className="history-summary__content">{summary.text}</div>
      <div className="history-summary__meta">
        <span className="history-summary__entries">
          {summary.entriesArchived} entries archived
        </span>
        <span className="history-summary__date">{dateRange}</span>
      </div>
    </div>
  );
}
