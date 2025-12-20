import "./ToolStatusBar.css";
import { RecapButton } from "./RecapButton";

export interface ToolStatusBarProps {
  state: "active" | "idle";
  description: string;
  /** Handler for recap button click */
  onRecap?: () => void;
  /** Whether recap button should be disabled */
  recapDisabled?: boolean;
  /** Whether recap is currently in progress */
  isRecapping?: boolean;
}

/**
 * Status bar displaying vague descriptions of tool activity.
 * Shows animated dots when active, static text when idle.
 * Optionally displays a Recap button on the left.
 */
export function ToolStatusBar({
  state,
  description,
  onRecap,
  recapDisabled = false,
  isRecapping = false,
}: ToolStatusBarProps) {
  return (
    <div
      className={`tool-status-bar tool-status-bar--${state}`}
      role="status"
      aria-live="polite"
      data-testid="tool-status-bar"
    >
      {onRecap && (
        <RecapButton
          onRecap={onRecap}
          disabled={recapDisabled}
          isRecapping={isRecapping}
        />
      )}
      <div className="tool-status-bar__status">
        {state === "active" && (
          <span className="tool-status-bar__indicator" aria-hidden="true">
            <span className="tool-status-bar__dot"></span>
            <span className="tool-status-bar__dot"></span>
            <span className="tool-status-bar__dot"></span>
          </span>
        )}
        <span className="tool-status-bar__text">{description}</span>
      </div>
    </div>
  );
}
