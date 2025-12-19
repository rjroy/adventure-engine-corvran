import { memo } from "react";
import Markdown from "react-markdown";
import type { Panel } from "../types/protocol";
import { usePanels } from "../contexts/PanelContext";
import "./InfoPanel.css";

export interface InfoPanelProps {
  panel: Panel;
}

/**
 * Individual info panel display component.
 *
 * Features:
 * - Title bar with minimize button (REQ-F-16, REQ-F-17)
 * - Markdown content rendering with sanitization (REQ-NF-5, TD-3)
 * - Collapsed state shows only title bar when minimized
 * - Inherits theme styling via CSS variables (REQ-NF-4, TD-7)
 *
 * Security: Only permits p, strong, em, ul, ol, li elements via allowedElements.
 * This prevents XSS attacks by disallowing raw HTML and scripts.
 */
function InfoPanelComponent({ panel }: InfoPanelProps) {
  const { isMinimized, toggleMinimize } = usePanels();
  const minimized = isMinimized(panel.id);

  const handleMinimizeClick = () => {
    toggleMinimize(panel.id);
  };

  return (
    <div
      className={`info-panel ${minimized ? "info-panel--minimized" : ""}`}
      data-testid={`info-panel-${panel.id}`}
      data-panel-id={panel.id}
    >
      <div className="info-panel__header">
        <span className="info-panel__title">{panel.title}</span>
        <button
          type="button"
          className="info-panel__minimize-btn"
          onClick={handleMinimizeClick}
          aria-label={minimized ? `Expand ${panel.title}` : `Minimize ${panel.title}`}
          aria-expanded={!minimized}
          data-testid={`info-panel-minimize-${panel.id}`}
        >
          {minimized ? "+" : "-"}
        </button>
      </div>
      {!minimized && (
        <div className="info-panel__content">
          <Markdown
            allowedElements={["p", "strong", "em", "ul", "ol", "li"]}
            unwrapDisallowed={true}
          >
            {panel.content}
          </Markdown>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized InfoPanel component for performance optimization.
 * Only re-renders when panel data changes.
 */
export const InfoPanel = memo(InfoPanelComponent);
