import { memo, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import type { Panel } from "../types/protocol";
import { usePanels } from "../contexts/PanelContext";
import "./InfoPanel.css";

export interface InfoPanelProps {
  panel: Panel;
  /** Whether this panel is in the overlay zone (enables drag) */
  isOverlay?: boolean;
}

/**
 * Individual info panel display component.
 *
 * Features:
 * - Title bar with minimize button (REQ-F-16, REQ-F-17)
 * - Markdown content rendering with sanitization (REQ-NF-5, TD-3)
 * - Collapsed state shows only title bar when minimized
 * - Inherits theme styling via CSS variables (REQ-NF-4, TD-7)
 * - Draggable header for overlay panels
 *
 * Security: Only permits p, strong, em, ul, ol, li elements via allowedElements.
 * This prevents XSS attacks by disallowing raw HTML and scripts.
 */
function InfoPanelComponent({ panel, isOverlay = false }: InfoPanelProps) {
  const { isMinimized, toggleMinimize, updatePanelPosition } = usePanels();
  const minimized = isMinimized(panel.id);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMinimizeClick = () => {
    toggleMinimize(panel.id);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isOverlay) return;

      // Don't start drag if clicking the minimize button
      if ((e.target as HTMLElement).closest("button")) return;

      isDragging.current = true;

      // Get the overlay container for percentage calculations
      const overlayContainer = document.querySelector(".panel-zone--overlay");
      if (!overlayContainer) return;

      const containerRect = overlayContainer.getBoundingClientRect();
      const panelElement = e.currentTarget.closest(
        ".panel-zone__overlay-item"
      ) as HTMLElement;
      if (!panelElement) return;

      const panelRect = panelElement.getBoundingClientRect();

      // Calculate offset from panel center to mouse position (in percentage)
      const panelCenterX =
        ((panelRect.left + panelRect.width / 2 - containerRect.left) /
          containerRect.width) *
        100;
      const panelCenterY =
        ((panelRect.top + panelRect.height / 2 - containerRect.top) /
          containerRect.height) *
        100;
      const mouseX =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const mouseY =
        ((e.clientY - containerRect.top) / containerRect.height) * 100;

      dragOffset.current = {
        x: panelCenterX - mouseX,
        y: panelCenterY - mouseY,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;

        const newMouseX =
          ((moveEvent.clientX - containerRect.left) / containerRect.width) *
          100;
        const newMouseY =
          ((moveEvent.clientY - containerRect.top) / containerRect.height) *
          100;

        // Clamp to keep panel mostly visible (5-95%)
        const newX = Math.max(5, Math.min(95, newMouseX + dragOffset.current.x));
        const newY = Math.max(5, Math.min(95, newMouseY + dragOffset.current.y));

        updatePanelPosition(panel.id, newX, newY);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isOverlay, panel.id, updatePanelPosition]
  );

  return (
    <div
      className={`info-panel ${minimized ? "info-panel--minimized" : ""}`}
      data-testid={`info-panel-${panel.id}`}
      data-panel-id={panel.id}
    >
      <div
        className={`info-panel__header ${isOverlay ? "info-panel__header--draggable" : ""}`}
        onMouseDown={handleMouseDown}
      >
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
