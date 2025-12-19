import type { ErrorCode } from "../../../shared/protocol";
import "./ErrorPanel.css";

interface ErrorPanelProps {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export function ErrorPanel({
  code,
  message,
  retryable,
  onRetry,
  onDismiss,
  isRetrying = false,
}: ErrorPanelProps) {
  return (
    <div className="error-panel" role="alert" aria-live="assertive" data-testid="error-panel">
      <div className="error-panel__header">
        <h3 className="error-panel__title">
          {retryable ? "⚠️ Error" : "❌ Fatal Error"}
        </h3>
        <button
          onClick={onDismiss}
          className="error-panel__close"
          aria-label="Dismiss error"
          type="button"
        >
          ×
        </button>
      </div>

      <p className="error-panel__message">{message}</p>

      <details className="error-panel__details">
        <summary>Technical details</summary>
        <code className="error-panel__code">Error code: {code}</code>
      </details>

      <div className="error-panel__actions">
        {retryable && (
          <button
            onClick={onRetry}
            className="btn btn--primary"
            disabled={isRetrying}
            type="button"
          >
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
        )}
        <button onClick={onDismiss} className="btn btn--secondary" type="button">
          {retryable ? "Cancel" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
