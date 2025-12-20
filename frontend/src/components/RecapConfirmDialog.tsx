import { useCallback, useEffect } from "react";
import "./RecapConfirmDialog.css";

export interface RecapConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for the recap action.
 * Explains what will happen and asks for user confirmation.
 */
export function RecapConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: RecapConfirmDialogProps) {
  // Handle Escape key to cancel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="recap-confirm-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recap-confirm-title"
    >
      <div
        className="recap-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="recap-confirm-title" className="recap-confirm-title">
          Create Recap?
        </h2>
        <p className="recap-confirm-message">
          This will summarize your adventure so far and start a fresh
          conversation with the GM. The GM will greet you as a returning
          adventurer and suggest what to do next.
        </p>
        <div className="recap-confirm-actions">
          <button
            type="button"
            className="recap-confirm-button recap-confirm-button--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="recap-confirm-button recap-confirm-button--confirm"
            onClick={onConfirm}
            autoFocus
          >
            Create Recap
          </button>
        </div>
      </div>
    </div>
  );
}
