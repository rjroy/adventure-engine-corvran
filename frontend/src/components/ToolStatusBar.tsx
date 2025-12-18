import "./ToolStatusBar.css";

export interface ToolStatusBarProps {
  state: "active" | "idle";
  description: string;
}

/**
 * Status bar displaying vague descriptions of tool activity.
 * Shows animated dots when active, static text when idle.
 */
export function ToolStatusBar({ state, description }: ToolStatusBarProps) {
  return (
    <div
      className={`tool-status-bar tool-status-bar--${state}`}
      role="status"
      aria-live="polite"
      data-testid="tool-status-bar"
    >
      {state === "active" && (
        <span className="tool-status-bar__indicator" aria-hidden="true">
          <span className="tool-status-bar__dot"></span>
          <span className="tool-status-bar__dot"></span>
          <span className="tool-status-bar__dot"></span>
        </span>
      )}
      <span className="tool-status-bar__text">{description}</span>
    </div>
  );
}
