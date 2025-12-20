import "./RecapButton.css";

export interface RecapButtonProps {
  onRecap: () => void;
  disabled: boolean;
  isRecapping: boolean;
}

/**
 * Button to trigger a recap of the adventure.
 * Creates a summary and starts a fresh GM session.
 */
export function RecapButton({
  onRecap,
  disabled,
  isRecapping,
}: RecapButtonProps) {
  return (
    <button
      type="button"
      onClick={onRecap}
      disabled={disabled || isRecapping}
      className="recap-button"
      title="Create a recap and get suggestions for what to do next"
    >
      {isRecapping ? "Recapping..." : "Recap"}
    </button>
  );
}
